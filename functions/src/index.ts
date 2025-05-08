import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { FieldValue } from 'firebase-admin/firestore';

// Initialize the Firebase Admin SDK
// Make sure it's initialized only once
if (!admin.apps.length) {
  admin.initializeApp();
}

// Set region to europe-west1 for improved latency for European users
const europeRegion = functions.region('europe-west1');

/**
 * Scheduled function that runs weekly to clean up expired server invites
 * This prevents database bloat from old invites that are no longer valid
 */
export const cleanupExpiredInvites = europeRegion.pubsub
  .schedule("every sunday 03:00")
  .timeZone("GMT")
  .onRun(async (context) => {
    // Use a JavaScript Date object instead of Firestore Timestamp to avoid issues
    const now = new Date();
    
    try {
      // Reference to the serverInvites collection
      const invitesRef = admin.firestore().collection("serverInvites");
      
      // Query for invites that have expired
      // We look for invites where expiresAt is less than the current time
      const expiredInvitesQuery = await invitesRef
        .where("expiresAt", "<", now)
        .get();
      
      if (expiredInvitesQuery.empty) {
        functions.logger.info("No expired invites to clean up");
        return null;
      }
      
      // Count the number of expired invites
      const expiredCount = expiredInvitesQuery.size;
      
      // Create a batch to perform all deletions in a single atomic operation
      const batch = admin.firestore().batch();
      
      // Add each expired invite to the batch for deletion
      expiredInvitesQuery.forEach((doc) => {
        batch.delete(doc.ref);
      });
      
      // Commit the batch to delete all expired invites
      await batch.commit();
      
      // Log the success
      functions.logger.info(`Successfully deleted ${expiredCount} expired server invites`);
      return null;
    } catch (error) {
      // Log any errors that occur during the cleanup process
      functions.logger.error("Error cleaning up expired invites:", error);
      return null;
    }
  });

/**
 * Callable function to increment a server invite use count
 * This keeps invite usage tracking secure on the server side rather than client side
 * 
 */
export const incrementInviteUsage = europeRegion.https.onCall(async (data, context) => {
  // Check if the user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'You must be logged in to use this function'
    );
  }

  try {
    const { inviteCode } = data;
    
    if (!inviteCode) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'The function must be called with an invite code'
      );
    }

    // Get a reference to the invite document
    const inviteRef = admin.firestore().collection('serverInvites').doc(inviteCode);
    const inviteDoc = await inviteRef.get();

    // Check if the invite exists
    if (!inviteDoc.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        'The specified invite does not exist'
      );
    }

    // Atomically increment the useCount
    await inviteRef.update({
      useCount: FieldValue.increment(1)
    });

    functions.logger.info(`Successfully incremented use count for invite ${inviteCode}`);
    return { success: true };
  } catch (error) {
    functions.logger.error('Error incrementing invite use count:', error);
    throw new functions.https.HttpsError(
      'internal',
      'An error occurred while incrementing the invite use count'
    );
  }
});

/**
 * Callable function to update server member count and add user to server
 * This handles all server joining operations in one secure server-side function
 * 
 */
export const joinServerMember = europeRegion.https.onCall(async (data, context) => {
  functions.logger.info('joinServerMember called with data:', data);

  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'You must be logged in to use this function'
    );
  }

  try {
    const { serverId } = data;
    const userId = context.auth.uid;

    if (!serverId) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'The function must be called with a serverId'
      );
    }

    // Check if server exists
    const serverRef = admin.firestore().collection('servers').doc(serverId);
    const serverDoc = await serverRef.get();

    if (!serverDoc.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        'The specified server does not exist'
      );
    }

    // Check if user is already a member
    const memberRef = serverRef.collection('members').doc(userId);
    const memberDoc = await memberRef.get();

    if (memberDoc.exists) {
      throw new functions.https.HttpsError(
        'already-exists',
        'You are already a member of this server'
      );
    }

    // Create batch operation for atomic updates
    const batch = admin.firestore().batch();
    const now = new Date();
    
    // Add user to server members
    batch.set(memberRef, {
      userId: userId,
      role: 'member',
      joinedAt: now,
      groupIds: []
    });

    // Add server to user's servers array
    const userRef = admin.firestore().collection('users').doc(userId);
    const serverData = {
      serverId: serverId,
      joinedAt: now
    };
    batch.update(userRef, {
      servers: FieldValue.arrayUnion(serverData)
    });

    // Increment server member count
    batch.update(serverRef, {
      memberCount: FieldValue.increment(1)
    });

    // Commit all changes
    await batch.commit();
    functions.logger.info(`User ${userId} successfully joined server ${serverId}`);
    
    return { 
      success: true, 
      serverId: serverId,
      serverName: serverDoc.data()?.name || 'Unknown server',
      serverIcon: serverDoc.data()?.iconUrl || null
    };
  } catch (error) {
    functions.logger.error('Error in joinServerMember:', error);
    throw new functions.https.HttpsError(
      'internal',
      'An error occurred while joining the server: ' + (error instanceof Error ? error.message : String(error))
    );
  }
});