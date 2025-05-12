import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { ScheduledEvent } from "firebase-functions/v2/scheduler";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { CallableRequest } from "firebase-functions/v2/https";
import { moveServerImageToPermanent, cleanupTempServerImages } from "./imageUtils";

// Initialize the Firebase Admin SDK if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

/**
 * Scheduled function that runs weekly to clean up expired server invites
 * This prevents database bloat from old invites that are no longer valid
 */
export const cleanupExpiredInvites = onSchedule({
  schedule: "every sunday 03:00",
  timeZone: "GMT"
}, async (event: ScheduledEvent) => {
  const now = new Date();
  
  try {
    const invitesRef = admin.firestore().collection("serverInvites");
    const expiredInvitesQuery = await invitesRef
      .where("expiresAt", "<", now)
      .get();
    
    if (expiredInvitesQuery.empty) {
      return;
    }
    
    const batch = admin.firestore().batch();
    expiredInvitesQuery.forEach((doc) => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    return;
  } catch (error) {
    functions.logger.error("Error cleaning up expired invites:", error);
    return;
  }
});

/**
 * Scheduled function to update user count
 * Runs once per day to update the counter document
 */
export const updateUserCount = onSchedule({
  schedule: 'every day 00:00',
  timeZone: 'GMT'
}, async (event: ScheduledEvent) => {
  try {
    const usersRef = admin.firestore().collection('users');
    const totalUsers = (await usersRef.count().get()).data().count;
    
    await admin.firestore().doc('counters/users_count').set({
      count: totalUsers,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp()
    });
    return;
  } catch (error) {
    functions.logger.error('Error updating user count:', error);
    throw error;
  }
});

/**
 * Callable function to increment a server invite use count
 * This keeps invite usage tracking secure on the server side rather than client side
 * @deprecated This function is being phased out in favor of consolidated processing in joinServerMember
 * which now accepts an optional inviteCode parameter to handle invite tracking
 */
export const incrementInviteUsage = functions.https.onCall(async (request: CallableRequest) => {
  if (!request.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'You must be logged in to use this function'
    );
  }
  
  try {
    const data = request.data as { inviteCode: string };
    const { inviteCode } = data;
    
    if (!inviteCode) {
      functions.logger.error('No invite code provided');
      throw new functions.https.HttpsError(
        'invalid-argument',
        'The function must be called with an invite code'
      );
    }

    const inviteRef = admin.firestore().collection('serverInvites').doc(inviteCode);
    let inviteDoc;
    
    try {
      inviteDoc = await inviteRef.get();
      
      if (!inviteDoc.exists) {
        const invitesRef = admin.firestore().collection('serverInvites');
        const matchingInvitesQuery = await invitesRef
          .where('code', '==', inviteCode)
          .limit(1)
          .get();
        
        if (matchingInvitesQuery.empty) {
          functions.logger.error(`Invite not found by either document ID or code field: ${inviteCode}`);
          throw new functions.https.HttpsError(
            'not-found',
            'The specified invite does not exist'
          );
        }
        
        inviteDoc = matchingInvitesQuery.docs[0];
      }

      const inviteData = inviteDoc.data();
      if (!inviteData) {
        functions.logger.error(`Invite document exists but has no data`);
        throw new functions.https.HttpsError(
          'failed-precondition',
          'Invalid invite data'
        );
      }
      
      await inviteDoc.ref.update({
        useCount: FieldValue.increment(1)
      });
      
      return { 
        success: true,
        message: `Successfully incremented use count for invite ${inviteCode}`
      };
      
    } catch (docError) {
      functions.logger.error('Error retrieving invite document:', docError);
      throw new functions.https.HttpsError(
        'internal',
        'Error processing invite document'
      );
    }
  } catch (error) {
    functions.logger.error('Error in incrementInviteUsage:', error);
    
    if (error instanceof functions.https.HttpsError) {
      throw error;
    } else {
      throw new functions.https.HttpsError(
        'internal',
        'An unexpected error occurred while incrementing the invite use count'
      );
    }
  }
});

/**
 * Helper function to get all subcollections of a document
 * @param docRef - Firestore document reference
 * @returns Promise with array of subcollection names
 */
async function getAllSubcollections(docRef: FirebaseFirestore.DocumentReference): Promise<string[]> {
  try {
    // NOTE: listCollections() is only available in Node.js admin SDK
    const collections = await docRef.listCollections();
    return collections.map(col => col.id);
  } catch (error) {
    functions.logger.error(`Error getting subcollections for ${docRef.path}:`, error);
    return [];
  }
}

/**
 * Callable function to delete a user account and clean up all associated data
 */
export const deleteUserAccount = functions.https.onCall(async (request: CallableRequest) => {
  try {
    if (!request.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'You must be logged in to delete your account'
      );
    }

    const userId = request.auth.uid;
    functions.logger.info(`User ${userId} has requested account deletion`);

    // Get all the user's data
    const userRef = admin.firestore().collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        'User data not found'
      );
    }

    const userData = userDoc.data();
    const batch = admin.firestore().batch();

    // Track all promises for parallel execution
    const cleanupPromises: Promise<any>[] = [];

    // 1. Handle servers the user owns
    try {
      const serversQuery = await admin.firestore().collection('servers')
        .where('ownerId', '==', userId)
        .get();

      if (!serversQuery.empty) {
        for (const serverDoc of serversQuery.docs) {
          const serverId = serverDoc.id;
          functions.logger.info(`Cleaning up server ${serverId} owned by user ${userId}`);

          // Get all subcollections dynamically
          const subcollections = await getAllSubcollections(serverDoc.ref);
          functions.logger.info(`Found ${subcollections.length} subcollections for server ${serverId}: ${subcollections.join(', ')}`);

          // Create an array of deletion promises
          const subcollectionDeletePromises = subcollections.map(subcollectionName => 
            admin.firestore().recursiveDelete(serverDoc.ref.collection(subcollectionName))
              .then(() => {
                functions.logger.info(`Deleted subcollection ${subcollectionName} for server ${serverId}`);
              })
              .catch(error => {
                functions.logger.error(`Error deleting subcollection ${subcollectionName} for server ${serverId}:`, error);
              })
          );

          // Add all deletion promises to our tracking array
          cleanupPromises.push(Promise.all(subcollectionDeletePromises));
          
          // Delete the server document itself
          batch.delete(serverDoc.ref);
        }
      }
    } catch (serverError) {
      functions.logger.error(`Error cleaning up servers owned by user ${userId}:`, serverError);
    }

    // 2. Remove user from servers they're a member of
    if (userData && Array.isArray(userData.servers)) {
      // Create a separate batch for updates
      const updateBatch = admin.firestore().batch();
      
      for (const serverMembership of userData.servers) {
        const serverId = serverMembership.serverId;
        if (!serverId) continue;
        
        try {
          const serverRef = admin.firestore().collection('servers').doc(serverId);
          const memberRef = serverRef.collection('members').doc(userId);
          
          // Delete user from server's member list
          batch.delete(memberRef);
          
          // Decrement server's member count in a separate batch
          updateBatch.update(serverRef, {
            memberCount: FieldValue.increment(-1)
          });
          
          functions.logger.info(`Removed user ${userId} from server ${serverId}`);
        } catch (membershipError) {
          functions.logger.error(`Error removing user ${userId} from server ${serverId}:`, membershipError);
        }
      }
      
      // Commit the updates first
      try {
        await updateBatch.commit();
        functions.logger.info(`Successfully updated server member counts for user ${userId}`);
      } catch (updateError) {
        functions.logger.error(`Error updating server member counts: ${updateError}`);
        // Continue with deletion even if updates fail
      }
    }

    // 3. Delete user's storage files (profile images, etc.)
    try {
      const profileImagesBucket = admin.storage().bucket();
      const [profileImages] = await profileImagesBucket.getFiles({
        prefix: `profile_pictures/${userId}`
      });

      if (profileImages.length > 0) {
        functions.logger.info(`Deleting ${profileImages.length} profile images for user ${userId}`);
        const deletePromises = profileImages.map(file => file.delete());
        cleanupPromises.push(Promise.all(deletePromises));
      }
    } catch (storageError) {
      functions.logger.error(`Error cleaning up storage for user ${userId}:`, storageError);
    }

    // 4. Execute all cleanup tasks in parallel
    await Promise.all(cleanupPromises);

    // 5. Delete the user document
    batch.delete(userRef);

    // 6. Commit all database changes
    await batch.commit();
    
    functions.logger.info(`Successfully completed cleanup for user ${userId}`);
    
    return {
      success: true,
      message: 'Account successfully deleted'
    };
    
  } catch (error) {
    functions.logger.error('Error in deleteUserAccount:', error);
    
    if (error instanceof functions.https.HttpsError) {
      throw error;
    } else {
      throw new functions.https.HttpsError(
        'internal',
        'An unexpected error occurred while deleting your account'
      );
    }
  }
});

/**
 * Callable function to update server member count and add user to server
 * This handles all server joining operations in one secure server-side function
 * Can optionally handle invite usage tracking as well
 */
export const joinServerMember = functions.https.onCall(async (request: CallableRequest) => {
  try {
    if (!request.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'You must be logged in to use this function'
      );
    }

    try {
      const data = request.data as { serverId: string, inviteCode?: string };
      const { serverId, inviteCode } = data;
      const userId = request.auth.uid;

      if (!serverId) {
        functions.logger.error('joinServerMember: No serverId provided');
        throw new functions.https.HttpsError(
          'invalid-argument',
          'The function must be called with a serverId'
        );
      }

      const serverRef = admin.firestore().collection('servers').doc(serverId);
      let serverDoc;
      
      try {
        serverDoc = await serverRef.get();
      } catch (serverCheckError) {
        functions.logger.error(`Error checking server:`, serverCheckError);
        throw new functions.https.HttpsError(
          'internal',
          'Error checking server existence'
        );
      }

      if (!serverDoc.exists) {
        functions.logger.error(`joinServerMember: Server ${serverId} not found`);
        throw new functions.https.HttpsError(
          'not-found',
          'The specified server does not exist'
        );
      }

      const memberRef = serverRef.collection('members').doc(userId);
      let memberDoc;
      try {
        memberDoc = await memberRef.get();
      } catch (memberCheckError) {
        functions.logger.error(`Error checking membership:`, memberCheckError);
        throw new functions.https.HttpsError(
          'internal',
          'Error checking server membership'
        );
      }

      if (memberDoc.exists) {
        functions.logger.error(`joinServerMember: User ${userId} is already a member of server ${serverId}`);
        throw new functions.https.HttpsError(
          'already-exists',
          'You are already a member of this server'
        );
      }
      
      let userDoc;
      try {
        const userCheckRef = admin.firestore().collection('users').doc(userId);
        userDoc = await userCheckRef.get();
        
        if (!userDoc.exists) {
          functions.logger.error(`joinServerMember: User document does not exist for ${userId}`);
          throw new functions.https.HttpsError(
            'failed-precondition',
            'User account not found. Please refresh your session and try again.'
          );
        }
      } catch (userCheckError) {
        functions.logger.error(`joinServerMember: Error checking user document:`, userCheckError);
        throw new functions.https.HttpsError(
          'internal',
          'Error checking user account'
        );
      }

      const batch = admin.firestore().batch();
      const timestamp = Timestamp.now();
      
      try {
        batch.set(memberRef, {
          userId: userId,
          role: 'member',
          joinedAt: timestamp,
          groupIds: []
        });

        const userRef = admin.firestore().collection('users').doc(userId);
        const serverDataToAdd = {
          serverId: serverId,
          joinedAt: timestamp.toMillis()
        };
        
        const userSnapshot = await userRef.get();
        const userData = userSnapshot.data() || {};
        
        if (!Array.isArray(userData.servers)) {
          batch.set(userRef, { servers: [serverDataToAdd] }, { merge: true });
        } else {
          batch.update(userRef, {
            servers: FieldValue.arrayUnion(serverDataToAdd)
          });
        }

        batch.update(serverRef, {
          memberCount: FieldValue.increment(1)
        });
          // Handle invite usage increment if an invite code was provided
        if (inviteCode) {
          try {
            const inviteRef = admin.firestore().collection('serverInvites').doc(inviteCode);
            const inviteDoc = await inviteRef.get();
            
            // If invite exists by ID, update it
            if (inviteDoc.exists) {
              batch.update(inviteRef, {
                useCount: FieldValue.increment(1)
              });
            } else {
              // Try to find by code field instead
              const invitesRef = admin.firestore().collection('serverInvites');
              const matchingInvitesQuery = await invitesRef
                .where('code', '==', inviteCode)
                .limit(1)
                .get();
              
              if (!matchingInvitesQuery.empty) {
                const foundInviteDoc = matchingInvitesQuery.docs[0];
                batch.update(foundInviteDoc.ref, {
                  useCount: FieldValue.increment(1)
                });
              }
            }
          } catch (inviteError) {
            // Log but don't fail the whole operation since invite tracking is non-critical
            functions.logger.warn(`Failed to increment invite usage for ${inviteCode}:`, inviteError);
          }
        }
        
        await batch.commit();
          const response = {
          success: true, 
          serverId: serverId,
          serverName: serverDoc.data()?.name || 'Unknown server',
          serverIcon: serverDoc.data()?.iconUrl || null,
          joinedAt: timestamp.toMillis(),
          invite: inviteCode ? {
            processed: true,
            inviteCode: inviteCode
          } : undefined
        };
        
        return response;

      } catch (batchError) {
        functions.logger.error(`Batch commit failed for user ${userId} joining server ${serverId}:`, batchError);
        
        if (batchError instanceof Error) {
          functions.logger.error('Batch error message:', batchError.message);
          functions.logger.error('Batch error stack:', batchError.stack);
          
          if (batchError.message.includes('no document to update')) {
            functions.logger.error('Missing document error. Check if the user document exists:', userId);
          }
        }
        
        throw batchError;
      }

    } catch (error: unknown) {
      functions.logger.error('Error in joinServerMember:', error);
      
      let errorMessage = 'An internal error occurred while joining the server';
      let errorType = 'internal';
      
      if (error instanceof Error) {
        functions.logger.error('Error message:', error.message);
        functions.logger.error('Error stack:', error.stack);
        
        errorMessage = `Server error: ${error.message}`;
        
        const err = error as any;
        if (err.code) functions.logger.error('Error code:', err.code);
        if (err.details) functions.logger.error('Error details:', err.details);
        if (err.customData) functions.logger.error('Error custom data:', err.customData);
        
        if (error.message.includes('permission') || error.message.includes('access')) {
          errorType = 'permission-denied';
          errorMessage = 'You don\'t have permission to join this server';
        } else if (error.message.includes('not found')) {
          errorType = 'not-found';
          errorMessage = 'Server resource not found';
        } else if (error.message.includes('already exists')) {
          errorType = 'already-exists';
          errorMessage = 'You are already a member of this server';
        }
      }

      throw new functions.https.HttpsError(
        errorType as any,
        errorMessage
      );
    }
  } catch (globalError) {
    console.error("CRITICAL ERROR in joinServerMember:", globalError);
    functions.logger.error("CRITICAL ERROR in joinServerMember:", globalError);
    throw new functions.https.HttpsError(
      'internal',
      'A critical error occurred in the server function'
    );
  }
});

/**
 * Callable function to create a new server and set up all associated data
 * This handles server creation operations in one secure server-side function
 */
export const createServer = functions.https.onCall(async (request: CallableRequest) => {
  try {
    if (!request.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'You must be logged in to create a server'
      );
    }

    const userId = request.auth.uid;
    
    try {
      const data = request.data as { 
        name: string, 
        description: string, 
        server_img_url?: string, 
        maxMembers?: number,
        components?: Record<string, boolean>
      };
      
      // Validate inputs
      if (!data.name || data.name.trim().length === 0) {
        throw new functions.https.HttpsError(
          'invalid-argument',
          'Server name is required'
        );
      }
      
      // Check if user has reached server limit
      const userRef = admin.firestore().collection('users').doc(userId);
      const userDoc = await userRef.get();
      
      if (!userDoc.exists) {
        throw new functions.https.HttpsError(
          'failed-precondition',
          'User account not found'
        );
      }
      
      const userData = userDoc.data();
      if (userData && Array.isArray(userData.servers) && userData.servers.length >= 3) {
        throw new functions.https.HttpsError(
          'resource-exhausted',
          'Maximum server limit reached. You can only create up to 3 servers.'
        );
      }
      
      // Create server document with transaction to ensure atomic operations
      const timestamp = admin.firestore.FieldValue.serverTimestamp();
      const serverRef = admin.firestore().collection('servers').doc();
      const serverId = serverRef.id;
      
      // Handle image upload if provided
      let finalImageUrl: string | null = data.server_img_url || null;
      
      // If the image is a temporary image, move it to permanent location
      if (finalImageUrl && finalImageUrl.includes('temp_server_images')) {
        try {
          // Use the server-side utility function
          finalImageUrl = await moveServerImageToPermanent(finalImageUrl, serverId);
          
          // Clean up any other temporary files for this user
          await cleanupTempServerImages(userId);
        } catch (imageError) {
          functions.logger.error('Error processing server image:', imageError);
          // Continue server creation even if image processing fails
          finalImageUrl = null;
        }
      }
      
      // Initialize server data
      const serverData = {
        name: data.name.trim(),
        description: data.description || '',
        server_img_url: finalImageUrl,
        ownerId: userId,
        createdAt: timestamp,
        updatedAt: timestamp,
        memberCount: 1, // Start with owner as the first member
        maxMembers: data.maxMembers || 100,
        settings: {},
        components: data.components || {
          news: true,
          groups: true,
          chat: true
        }
      };
      
      // Create batch for all operations
      const batch = admin.firestore().batch();
      
      // Add server document
      batch.set(serverRef, serverData);
      
      // Add server to user's servers array
      batch.update(userRef, {
        servers: admin.firestore.FieldValue.arrayUnion({
          serverId: serverId,
          joinedAt: timestamp
        })
      });
      
      // Create owner member record
      const memberRef = admin.firestore().collection('servers').doc(serverId).collection('members').doc(userId);
      batch.set(memberRef, {
        userId: userId,
        role: 'owner',
        joinedAt: timestamp,
        groupIds: [] 
      });
      
      // Commit all changes
      await batch.commit();
      
      // Return success with the new server ID
      return {
        success: true,
        serverId: serverId,
        serverData: {
          ...serverData,
          id: serverId
        }
      };
    } catch (error: unknown) {
      functions.logger.error('Error in createServer:', error);
      
      if (error instanceof functions.https.HttpsError) {
        throw error;
      } else {
        throw new functions.https.HttpsError(
          'internal',
          'An unexpected error occurred while creating your server'
        );
      }
    }
  } catch (globalError) {
    console.error("CRITICAL ERROR in createServer:", globalError);
    functions.logger.error("CRITICAL ERROR in createServer:", globalError);
    throw new functions.https.HttpsError(
      'internal',
      'A critical error occurred in the server function'
    );
  }
});