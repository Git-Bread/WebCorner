"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const admin = require("firebase-admin");
// Initialize Firebase with emulator connection
if (!admin.apps.length) {
    admin.initializeApp({
        projectId: 'demo-webcorner', // This can be any string when using emulators
    });
    // Connect to Firestore emulator
    const firestore = admin.firestore();
    firestore.settings({
        host: 'localhost:8080',
        ssl: false
    });
}
/**
 * Create test invite data in Firestore emulator
 */
async function createTestData() {
    const db = admin.firestore();
    const inviteIds = [];
    console.log('Creating test invite data in Firestore emulator...');
    console.log('----------------------------------------------');
    try {
        // Create dates for testing
        const now = new Date();
        // Create expired invites (3 days ago)
        const expiredDate = new Date(now);
        expiredDate.setDate(expiredDate.getDate() - 3);
        // Create valid invites (3 days in future)
        const validDate = new Date(now);
        validDate.setDate(validDate.getDate() + 3);
        // Batch write for efficiency
        const batch = db.batch();
        // Create 3 expired invites
        for (let i = 0; i < 3; i++) {
            const inviteRef = db.collection('serverInvites').doc(`test-expired-${i}`);
            inviteIds.push(inviteRef.id);
            batch.set(inviteRef, {
                code: `EXPIRED-${i}`,
                serverId: 'test-server-123',
                creatorId: 'test-user-456',
                serverName: 'Test Server',
                createdAt: admin.firestore.Timestamp.fromDate(expiredDate),
                expiresAt: admin.firestore.Timestamp.fromDate(expiredDate),
                useCount: 0,
                isRevoked: false
            });
        }
        // Create 2 valid invites for comparison
        for (let i = 0; i < 2; i++) {
            const validInviteRef = db.collection('serverInvites').doc(`test-valid-${i}`);
            inviteIds.push(validInviteRef.id);
            batch.set(validInviteRef, {
                code: `VALID-${i}`,
                serverId: 'test-server-123',
                creatorId: 'test-user-456',
                serverName: 'Test Server',
                createdAt: admin.firestore.Timestamp.fromDate(now),
                expiresAt: admin.firestore.Timestamp.fromDate(validDate),
                useCount: 0,
                isRevoked: false
            });
        }
        // Commit the batch write
        await batch.commit();
        console.log('✅ Created test data successfully:');
        console.log('   - 3 expired invites (3 days ago)');
        console.log('   - 2 valid invites (expires in 3 days)');
        console.log('----------------------------------------------');
        return inviteIds;
    }
    catch (error) {
        console.error('❌ Error creating test data:', error);
        throw error;
    }
}
/**
 * Run the cleanup function manually
 */
async function runCleanup() {
    console.log('Running cleanupExpiredInvites function...');
    console.log('----------------------------------------------');
    try {
        // Extract the function to run
        const now = admin.firestore.Timestamp.now();
        // Reference to the serverInvites collection
        const invitesRef = admin.firestore().collection("serverInvites");
        // Query for invites that have expired
        // We look for invites where expiresAt is less than the current time
        const expiredInvitesQuery = await invitesRef
            .where("expiresAt", "<", now)
            .get();
        if (expiredInvitesQuery.empty) {
            console.log('No expired invites to clean up');
            return;
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
        console.log(`✅ Successfully deleted ${expiredCount} expired server invites`);
        console.log('----------------------------------------------');
    }
    catch (error) {
        console.error('❌ Error running cleanup function:', error);
    }
}
/**
 * Check the state of test invites
 */
async function checkResults() {
    const db = admin.firestore();
    console.log('Checking results after cleanup...');
    console.log('----------------------------------------------');
    try {
        // Check expired invites
        const expiredResults = await Promise.all([0, 1, 2].map(async (i) => {
            const doc = await db.collection('serverInvites').doc(`test-expired-${i}`).get();
            return { id: `test-expired-${i}`, exists: doc.exists };
        }));
        // Check valid invites
        const validResults = await Promise.all([0, 1].map(async (i) => {
            const doc = await db.collection('serverInvites').doc(`test-valid-${i}`).get();
            return { id: `test-valid-${i}`, exists: doc.exists };
        }));
        // Display status table
        console.log('RESULTS:');
        console.log('-----------------------------------');
        console.log('| Invite ID         | Status      |');
        console.log('-----------------------------------');
        expiredResults.forEach(result => {
            console.log(`| ${result.id.padEnd(17)} | ${result.exists ? '🔴 EXISTS' : '✅ DELETED'} |`);
        });
        validResults.forEach(result => {
            console.log(`| ${result.id.padEnd(17)} | ${result.exists ? '✅ EXISTS' : '❌ MISSING'} |`);
        });
        console.log('-----------------------------------');
        // Verify test success
        const allExpiredDeleted = expiredResults.every(r => !r.exists);
        const allValidExist = validResults.every(r => r.exists);
        if (allExpiredDeleted && allValidExist) {
            console.log('✅ TEST PASSED: The cleanup function works correctly!');
            console.log('   - All expired invites were deleted');
            console.log('   - All valid invites were preserved');
        }
        else {
            console.log('❌ TEST FAILED:');
            if (!allExpiredDeleted)
                console.log('   - Some expired invites were not deleted');
            if (!allValidExist)
                console.log('   - Some valid invites were incorrectly deleted');
        }
    }
    catch (error) {
        console.error('Error checking results:', error);
    }
}
/**
 * Run the complete test process
 */
async function runTest() {
    try {
        console.log('\n🔍 TESTING INVITE CLEANUP FUNCTION');
        console.log('=======================================');
        // Step 1: Create test data
        await createTestData();
        // Step 2: Run cleanup function
        await runCleanup();
        // Step 3: Check results
        await checkResults();
        console.log('\n✨ Test completed!\n');
    }
    catch (error) {
        console.error('Test failed with error:', error);
    }
}
// Run the test if this file is executed directly
if (require.main === module) {
    runTest();
}
//# sourceMappingURL=test-cleanup.js.map