import * as admin from "firebase-admin";

// Initialize Firebase with emulator connection
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'demo-webcorner',  // This can be any string when using emulators
  });

  // Connect to Firestore emulator
  const firestore = admin.firestore();
  firestore.settings({
    host: 'localhost:8080',
    ssl: false
  });
}

/**
 * Creates test expired server invites in Firestore
 * Use this function to test the cleanupExpiredInvites function
 */
export async function createExpiredInvites(count: number = 3): Promise<string[]> {
  const inviteIds: string[] = [];
  const db = admin.firestore();
  
  try {
    console.log(`Creating ${count} expired test invites...`);
    
    // Create dates for testing
    const now = new Date();
    const expiredDate = new Date(now);
    expiredDate.setDate(expiredDate.getDate() - 10); // 10 days ago
    
    // Batch write for efficiency
    const batch = db.batch();
    
    // Create multiple test invites
    for (let i = 0; i < count; i++) {
      const inviteRef = db.collection('serverInvites').doc(`test-expired-${i}-${Date.now()}`);
      inviteIds.push(inviteRef.id);
      
      batch.set(inviteRef, {
        code: `TEST-EXPIRED-${i}`,
        serverId: 'test-server-123',
        creatorId: 'test-user-456',
        serverName: 'Test Server',
        createdAt: admin.firestore.Timestamp.fromDate(expiredDate),
        expiresAt: admin.firestore.Timestamp.fromDate(expiredDate),
        useCount: 0,
        isRevoked: false
      });
    }
    
    // Create one valid invite for comparison
    const validDate = new Date(now);
    validDate.setDate(validDate.getDate() + 10); // 10 days in the future
    
    const validInviteRef = db.collection('serverInvites').doc(`test-valid-${Date.now()}`);
    inviteIds.push(validInviteRef.id);
    
    batch.set(validInviteRef, {
      code: 'TEST-VALID',
      serverId: 'test-server-123',
      creatorId: 'test-user-456',
      serverName: 'Test Server',
      createdAt: admin.firestore.Timestamp.fromDate(now),
      expiresAt: admin.firestore.Timestamp.fromDate(validDate),
      useCount: 0,
      isRevoked: false
    });
    
    // Commit the batch write
    await batch.commit();
    console.log('Test invites created successfully');
    
    return inviteIds;
  } catch (error) {
    console.error('Error creating test invites:', error);
    throw error;
  }
}

/**
 * Verifies which invites still exist after cleanup
 * @param inviteIds Array of document IDs to check
 */
export async function checkInvitesExistence(inviteIds: string[]): Promise<void> {
  const db = admin.firestore();
  
  try {
    console.log('Checking which invites still exist...');
    
    for (const id of inviteIds) {
      const doc = await db.collection('serverInvites').doc(id).get();
      console.log(`Invite ${id}: ${doc.exists ? 'Still exists' : 'Was deleted'}`);
    }
  } catch (error) {
    console.error('Error checking invites:', error);
    throw error;
  }
}

/**
 * Manually trigger the cleanup function
 * Note: This only works when executing in the functions shell environment
 */
export async function triggerCleanup(): Promise<void> {
  try {
    console.log('Manually triggering cleanup function...');
    
    // Import local functions (works in functions:shell)
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const functions = require('../lib/index');
    
    // Call the function directly
    await functions.cleanupExpiredInvites();
    
    console.log('Cleanup function executed');
  } catch (error) {
    console.error('Error triggering cleanup function:', error);
    console.log('Note: triggerCleanup() only works within a Firebase Functions shell');
    throw error;
  }
}

// If this file is executed directly
if (require.main === module) {
  console.log('Connecting to Firebase emulators and creating test invites...');
  // Create test data and then immediately exit
  createExpiredInvites(3)
    .then((ids) => {
      console.log('Created test invites with IDs:', ids);
      console.log('Run "firebase functions:shell" and use the following commands to test:');
      console.log('1. const testUtils = require("./lib/test-utils")');
      console.log('2. testUtils.triggerCleanup().then(() => testUtils.checkInvitesExistence([...your ids...]))');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Failed to create test data:', error);
      process.exit(1);
    });
}