import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

// Basic console logging at the very start
console.log("Firebase Cloud Functions starting initialization");

// Initialize the Firebase Admin SDK
// Make sure it's initialized only once
if (!admin.apps.length) {
  console.log("Initializing Firebase Admin SDK");
  admin.initializeApp();
  console.log("Firebase Admin SDK initialized");
}

// Logging the region configuration
console.log("Configuring Firebase functions region");

// Set region to europe-west1 for improved latency for European users
// Let's try to use the default region first to see if the region is causing problems
// const europeRegion = functions.region('europe-west1');
const europeRegion = functions;

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
    const userId = context.auth.uid;
    
    if (!inviteCode) {
      functions.logger.error('No invite code provided');
      throw new functions.https.HttpsError(
        'invalid-argument',
        'The function must be called with an invite code'
      );
    }

    functions.logger.info(`User ${userId} is incrementing use count for invite: ${inviteCode}`);
    
    // Primary approach: Try to find the invite by document ID (this is how invites are created)
    // The document ID should match the invite code
    const inviteRef = admin.firestore().collection('serverInvites').doc(inviteCode);
    let inviteDoc;
    
    try {
      inviteDoc = await inviteRef.get();
      
      if (!inviteDoc.exists) {
        functions.logger.info(`No invite found with document ID: ${inviteCode}, trying secondary approach`);
        // Secondary approach: try to find by code field
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
        
        // Found by code field
        inviteDoc = matchingInvitesQuery.docs[0];
        functions.logger.info(`Found invite by code field search: ${inviteDoc.id}`);
      } else {
        functions.logger.info(`Found invite by document ID: ${inviteCode}`);
      }
        // Log the invite data for debugging
      const inviteData = inviteDoc.data();
      if (inviteData) {
        functions.logger.info(`Invite details: serverId=${inviteData.serverId}, code=${inviteData.code}, useCount=${inviteData.useCount || 0}`);
      } else {
        functions.logger.error(`Invite document exists but has no data`);
      }
      
      // Update the invite
      await inviteDoc.ref.update({
        useCount: FieldValue.increment(1)
      });
      
      functions.logger.info(`Successfully incremented use count for invite ${inviteCode}`);
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
    }  } catch (error) {
    functions.logger.error('Error in incrementInviteUsage:', error);
    
    // Detailed error handling with proper error propagation
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
 * 
 */
export const joinServerMember = europeRegion.https.onCall(async (data, context) => {
  try {
    console.log("joinServerMember function triggered");
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
      // Minimal logging in production for performance
    if (!serverId) {
      functions.logger.error('joinServerMember: No serverId provided');
      throw new functions.https.HttpsError(
        'invalid-argument',
        'The function must be called with a serverId'
      );
    }    // Check if server exists
    const serverRef = admin.firestore().collection('servers').doc(serverId);
    let serverDoc;    try {
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
    }    // Check if user is already a member
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
    
    // Check if user document exists and has valid structure before proceeding
    functions.logger.info(`joinServerMember: Checking user document for ${userId}`);
    let userDoc;
    try {
      const userCheckRef = admin.firestore().collection('users').doc(userId);
      userDoc = await userCheckRef.get();
      functions.logger.info(`joinServerMember: User document exists: ${userDoc.exists}`);
      if (userDoc.exists) {
        const userData = userDoc.data();
        functions.logger.info(`joinServerMember: User data:`, {
          hasServersArray: Array.isArray(userData?.servers),
          serversCount: Array.isArray(userData?.servers) ? userData.servers.length : 'N/A',
          userFields: Object.keys(userData || {})
        });
      } else {
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
    }    // Create batch operation for atomic updates
    functions.logger.info(`joinServerMember: Creating batch operations for user ${userId} to join server ${serverId}`);
    const batch = admin.firestore().batch();

    // Use serverTimestamp() for database operations - fix the reference
    const serverTimestamp = FieldValue.serverTimestamp();  // Use the imported FieldValue
    // Also create a real timestamp for the response
    const now = Timestamp.now();  // This is correct as is
    
    try {
      // Add user to server members
      functions.logger.info(`joinServerMember: Adding member document for user ${userId} in server ${serverId}`);
      batch.set(memberRef, {
        userId: userId,
        role: 'member',
        joinedAt: serverTimestamp, // Use server timestamp for the database
        groupIds: []
      });

      // Add server to user's servers array
      functions.logger.info(`joinServerMember: Updating user document to add server ${serverId}`);
      const userRef = admin.firestore().collection('users').doc(userId);
      
      // Create a safer server data object - ensure we use valid Firestore types
      // Use a regular Date object or number for timestamps in arrays
      const now = new Date();

      const serverDataToAdd = {
        serverId: serverId,
        joinedAt: now.getTime()  // Use milliseconds timestamp instead of serverTimestamp()
      };
      
      // First check if the servers array exists
      // If it doesn't exist, we need to create it first
      const userSnapshot = await userRef.get();
      const userData = userSnapshot.data() || {};
      
      if (!Array.isArray(userData.servers)) {
        functions.logger.info(`joinServerMember: User ${userId} does not have a servers array, creating it`);
        // Initialize the servers array with the new server
        batch.set(userRef, { servers: [serverDataToAdd] }, { merge: true });
      } else {
        // Array exists, use arrayUnion to add the server to it
        functions.logger.info(`joinServerMember: User ${userId} has existing servers array with ${userData.servers.length} servers`);
        batch.update(userRef, {
          servers: FieldValue.arrayUnion(serverDataToAdd)
        });
      }

      // Increment server member count
      functions.logger.info(`joinServerMember: Updating server ${serverId} to increment member count`);
      batch.update(serverRef, {
        memberCount: FieldValue.increment(1)
      });
      
      functions.logger.info(`joinServerMember: Batch operations created successfully`);
    } catch (batchSetupError) {
      functions.logger.error(`joinServerMember: Error setting up batch operations:`, batchSetupError);
      throw new functions.https.HttpsError(
        'internal',
        'Error preparing server join operation'
      );
    }
    
    // Log what we're about to do
    functions.logger.info(`Attempting to commit batch operation for user ${userId} to join server ${serverId}`);
    
    // Debug information about what's in the batch
    functions.logger.info(`Batch operations: 
      1. Adding user ${userId} to members collection of server ${serverId}
      2. Adding server ${serverId} to user ${userId}'s servers array
      3. Incrementing member count for server ${serverId}
    `);
    
    try {
      // Commit all changes
      await batch.commit();
      functions.logger.info(`User ${userId} successfully joined server ${serverId}`);
    } catch (batchError) {
      functions.logger.error(`Batch commit failed for user ${userId} joining server ${serverId}:`, batchError);
      
      // Detailed batch error analysis
      if (batchError instanceof Error) {
        functions.logger.error('Batch error message:', batchError.message);
        functions.logger.error('Batch error stack:', batchError.stack);
        
        // Check for specific error conditions
        if (batchError.message.includes('no document to update')) {
          functions.logger.error('Missing document error. Check if the user document exists:', userId);
          
          // Try to verify if the user document exists
          try {
            const userDocSnapshot = await admin.firestore().collection('users').doc(userId).get();
            functions.logger.info(`User document exists: ${userDocSnapshot.exists}`);
            if (userDocSnapshot.exists) {
              functions.logger.info(`User document data:`, userDocSnapshot.data());
            }
          } catch (verifyError) {
            functions.logger.error('Error verifying user document:', verifyError);
          }
        }
      }
      
      throw batchError; // Re-throw to be handled by the outer catch block
    }      // Prepare response with serializable values
    const response = {
      success: true, 
      serverId: serverId,
      serverName: serverDoc.data()?.name || 'Unknown server',
      serverIcon: serverDoc.data()?.iconUrl || null,
      joinedAt: now.toMillis() // Use the real timestamp for the response
    };
    
    functions.logger.info(`joinServerMember: Successfully completed. Returning response:`, response);
    return response;} catch (error: unknown) {
    // Full detailed error logging to help diagnose issues
    functions.logger.error('Error in joinServerMember:', error);
    
    // Provide a specific error message when possible
    let errorMessage = 'An internal error occurred while joining the server';
    let errorType = 'internal';
    
    if (error instanceof Error) {
      functions.logger.error('Error message:', error.message);
      functions.logger.error('Error stack:', error.stack);
      
      // Include error message in the response for better debugging
      errorMessage = `Server error: ${error.message}`;
      
      // Additional Firebase-specific error details if available
      const err = error as any;
      if (err.code) functions.logger.error('Error code:', err.code);
      if (err.details) functions.logger.error('Error details:', err.details);
      if (err.customData) functions.logger.error('Error custom data:', err.customData);
      
      // Try to determine a more specific error type
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
    
    // Always return a proper HttpsError to the client
    throw new functions.https.HttpsError(
      'internal',
      'A critical error occurred in the server function'
    );
  }
});