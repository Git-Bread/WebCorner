"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanupExpiredInvites = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
// Initialize the Firebase Admin SDK
admin.initializeApp();
/**
 * Scheduled function that runs weekly to clean up expired server invites
 * This prevents database bloat from old invites that are no longer valid
 */
exports.cleanupExpiredInvites = functions.pubsub
    .schedule("every sunday 03:00")
    .timeZone("GMT")
    .onRun(async (context) => {
    const now = admin.firestore.Timestamp.now();
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
    }
    catch (error) {
        // Log any errors that occur during the cleanup process
        functions.logger.error("Error cleaning up expired invites:", error);
        return null;
    }
});
//# sourceMappingURL=index.js.map