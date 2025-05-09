import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

// Initialize the Firebase Admin SDK if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const europeRegion = functions;

/**
 * Scheduled function that runs weekly to clean up expired server invites
 * This prevents database bloat from old invites that are no longer valid
 */
export const cleanupExpiredInvites = europeRegion.pubsub
  .schedule("every sunday 03:00")
  .timeZone("GMT")
  .onRun(async (context) => {
    const now = new Date();
    
    try {
      const invitesRef = admin.firestore().collection("serverInvites");
      const expiredInvitesQuery = await invitesRef
        .where("expiresAt", "<", now)
        .get();
      
      if (expiredInvitesQuery.empty) {
        return null;
      }
      
      const batch = admin.firestore().batch();
      expiredInvitesQuery.forEach((doc) => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      return null;
    } catch (error) {
      functions.logger.error("Error cleaning up expired invites:", error);
      return null;
    }
  });

/**
 * Scheduled function to update user count
 * Runs once per day to update the counter document
 */
export const updateUserCount = europeRegion.pubsub
  .schedule('every day 00:00')
  .timeZone('GMT')
  .onRun(async (context) => {
    try {
      const usersRef = admin.firestore().collection('users');
      const totalUsers = (await usersRef.count().get()).data().count;
      
      await admin.firestore().doc('counters/users_count').set({
        count: totalUsers,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp()
      });
      return null;
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
export const incrementInviteUsage = europeRegion.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'You must be logged in to use this function'
    );
  }
  
  try {
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
 * Callable function to update server member count and add user to server
 * This handles all server joining operations in one secure server-side function
 * Can optionally handle invite usage tracking as well
 */
export const joinServerMember = europeRegion.https.onCall(async (data, context) => {
  try {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'You must be logged in to use this function'
      );
    }

    try {
      const { serverId, inviteCode } = data;
      const userId = context.auth.uid;

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