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
    // Get all servers
    const serversRef = admin.firestore().collection("servers");
    const serversSnapshot = await serversRef.get();
    
    // Process each server's invites subcollection
    for (const serverDoc of serversSnapshot.docs) {
      try {
        const invitesRef = serverDoc.ref.collection("invites");
        const expiredInvitesQuery = await invitesRef
          .where("expiresAt", "<", now)
          .get();
        
        if (!expiredInvitesQuery.empty) {
          const batch = admin.firestore().batch();
          expiredInvitesQuery.forEach((doc) => {
            batch.delete(doc.ref);
          });
          
          await batch.commit();
        }
      } catch (serverError) {
        functions.logger.error(`Error cleaning up expired invites for server ${serverDoc.id}:`, serverError);
      }
    }
    
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
        // Track server IDs for image cleanup
        const serverIds: string[] = [];
        
        for (const serverDoc of serversQuery.docs) {
          const serverId = serverDoc.id;
          serverIds.push(serverId);
          
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
        
        // Clean up server images for each server
        const bucket = admin.storage().bucket();
        for (const serverId of serverIds) {
          try {
            const serverImagesPrefix = `server_images/${serverId}/`;
            const [serverImageFiles] = await bucket.getFiles({ prefix: serverImagesPrefix });
            
            if (serverImageFiles.length > 0) {
              functions.logger.info(`Deleting ${serverImageFiles.length} images for server ${serverId}`);
              const deleteServerImagesPromises = serverImageFiles.map(file => file.delete());
              cleanupPromises.push(Promise.all(deleteServerImagesPromises));
            }
          } catch (serverImageError) {
            functions.logger.error(`Error deleting images for server ${serverId}:`, serverImageError);
          }
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
      const data = request.data as { serverId?: string, inviteCode?: string };
      const { serverId: providedServerId, inviteCode } = data;
      const userId = request.auth.uid;
      
      // If we received an invite code but no server ID, find the server
      let serverId = providedServerId;
      
      if (!serverId && inviteCode) {
        functions.logger.info(`Looking up server for invite code: ${inviteCode}`);
        
        // Find which server this invite belongs to
        const serversRef = admin.firestore().collection('servers');
        const serversSnapshot = await serversRef.get();
        
        let foundServer = false;
        
        for (const serverDoc of serversSnapshot.docs) {
          const inviteRef = serverDoc.ref.collection('invites').doc(inviteCode);
          const inviteDoc = await inviteRef.get();
          
          if (inviteDoc.exists) {
            serverId = serverDoc.id;
            foundServer = true;
            functions.logger.info(`Found invite ${inviteCode} in server ${serverId}`);
            break;
          }
        }
        
        if (!foundServer) {
          throw new functions.https.HttpsError(
            'not-found',
            'Invalid or expired invitation code'
          );
        }
      }
      
      if (!serverId) {
        throw new functions.https.HttpsError(
          'invalid-argument',
          'The function must be called with either a serverId or a valid inviteCode'
        );
      }

      // Check if server exists
      const serverRef = admin.firestore().collection('servers').doc(serverId);
      let serverDoc;
      
      try {
        serverDoc = await serverRef.get();
      } catch (error) {
        functions.logger.error('Error checking server:', error);
        throw new functions.https.HttpsError(
          'internal',
          'Error checking server existence'
        );
      }

      if (!serverDoc.exists) {
        throw new functions.https.HttpsError(
          'not-found',
          'The specified server does not exist'
        );
      }

      // Check if user is already a member
      const memberRef = serverRef.collection('members').doc(userId);
      let memberDoc;
      
      try {
        memberDoc = await memberRef.get();
      } catch (error) {
        functions.logger.error('Error checking membership:', error);
        throw new functions.https.HttpsError(
          'internal',
          'Error checking server membership'
        );
      }

      if (memberDoc.exists) {
        throw new functions.https.HttpsError(
          'already-exists',
          'You are already a member of this server'
        );
      }

      // Create batch operation for atomic updates
      const batch = admin.firestore().batch();
      const timestamp = Timestamp.now();
      
      // Add user to server members
      batch.set(memberRef, {
        userId: userId,
        role: 'member',
        joinedAt: timestamp,
        groupIds: []
      });

      // Add server to user's servers array
      const userRef = admin.firestore().collection('users').doc(userId);
      const serverData = {
        serverId: serverId,
        joinedAt: timestamp.toMillis()
      };
      
      try {
        const userSnapshot = await userRef.get();
        const userData = userSnapshot.data() || {};
        
        if (!Array.isArray(userData.servers)) {
          batch.set(userRef, { servers: [serverData] }, { merge: true });
        } else {
          batch.update(userRef, {
            servers: FieldValue.arrayUnion(serverData)
          });
        }
      } catch (error) {
        functions.logger.error('Error preparing user update:', error);
        throw new functions.https.HttpsError(
          'internal',
          'Error updating user data'
        );
      }

      // Increment server member count
      batch.update(serverRef, {
        memberCount: FieldValue.increment(1)
      });
      
      // If an invite code was provided, increment its usage count
      if (inviteCode) {
        try {
          const inviteRef = serverRef.collection('invites').doc(inviteCode);
          const inviteDoc = await inviteRef.get();
          
          if (inviteDoc.exists) {
            batch.update(inviteRef, {
              useCount: FieldValue.increment(1)
            });
          }
        } catch (error) {
          // Non-critical error, just log it
          functions.logger.warn(`Error updating invite usage for ${inviteCode}:`, error);
        }
      }

      // Commit all changes
      try {
        await batch.commit();
      } catch (error) {
        functions.logger.error('Error committing batch updates:', error);
        throw new functions.https.HttpsError(
          'internal', 
          'Failed to update database with join information'
        );
      }
      
      functions.logger.info(`User ${userId} successfully joined server ${serverId}`);
      
      return { 
        success: true, 
        serverId: serverId,
        serverName: serverDoc.data()?.name || 'Unknown server',
        server_img_url: serverDoc.data()?.server_img_url || null,
        serverIcon: serverDoc.data()?.server_img_url || null,
        joinedAt: timestamp.toMillis(),
        invite: inviteCode ? {
          processed: true,
          inviteCode: inviteCode
        } : undefined
      };
    } catch (error) {
      // Handle different types of errors
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      
      functions.logger.error('Error in joinServerMember:', error);
      throw new functions.https.HttpsError(
        'internal',
        'An error occurred while joining the server'
      );
    }
  } catch (globalError) {
    console.error("Critical error in joinServerMember:", globalError);
    functions.logger.error("Critical error in joinServerMember:", globalError);
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
      const timestamp = Timestamp.now();
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
        servers: FieldValue.arrayUnion({
          serverId: serverId,
          joinedAt: timestamp.toMillis ? timestamp.toMillis() : Date.now()
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