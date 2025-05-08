import { nanoid } from 'nanoid';
import { collection, doc, setDoc, getDoc, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { showToast } from './toast';
import { validateServerInvite, type ServerInvite } from '~/schemas/serverInviteSchemas';
import { handleDatabaseError } from './errorHandler';

// Default expiry time in milliseconds (2 days)
const DEFAULT_INVITE_EXPIRY_MS = 2 * 24 * 60 * 60 * 1000;

// Generate a unique invite code (12 characters by default)
export const generateInviteCode = (length = 12): string => {
  return nanoid(length);
};

/**
 * Create a server invitation
 * @param firestore - Firestore instance
 * @param serverId - ID of the server to create invitation for
 * @param userId - ID of the user creating the invitation
 * @param options - Additional options for the invitation
 * @returns The created invitation code or null if creation failed
 */
export const createServerInvite = async (
  firestore: any,
  serverId: string,
  userId: string,
  options: {
    expiresInMs?: number; // Time until expiration in milliseconds
    maxUses?: number; // Maximum number of uses for this invite
    serverName?: string; // Include server name for easier reference
  } = {}
): Promise<string | null> => {
  try {
    // Generate a unique invite code
    const inviteCode = generateInviteCode();
    
    // Calculate expiry date
    const now = new Date();
    const expiryTime = options.expiresInMs || DEFAULT_INVITE_EXPIRY_MS;
    const expiresAt = new Date(now.getTime() + expiryTime);
    
    // Prepare invitation data
    const inviteData = {
      code: inviteCode,
      serverId,
      creatorId: userId,
      serverName: options.serverName,
      createdAt: now,
      expiresAt,
      useCount: 0,
      isRevoked: false,
      ...(options.maxUses && { maxUses: options.maxUses }),
    };
    
    // Validate the invitation data
    const validationResult = validateServerInvite(inviteData);
    if (!validationResult) {
      console.error('Failed to validate invitation data');
      return null;
    }
    
    // Create a reference in the invitations collection
    // using the invite code as the document ID for easy retrieval
    await setDoc(doc(firestore, 'serverInvites', inviteCode), inviteData);
    
    return inviteCode;
  } catch (error) {
    const userMessage = handleDatabaseError(error);
    console.error('Error creating server invitation:', error);
    showToast(`Failed to create invitation: ${userMessage}`, 'error');
    return null;
  }
};

/**
 * Get invitation details by code
 * @param firestore - Firestore instance
 * @param inviteCode - The invitation code to look up
 * @returns The invitation details or null if not found or invalid
 */
export const getInviteByCode = async (firestore: any, inviteCode: string): Promise<ServerInvite | null> => {
  try {
    const inviteRef = doc(firestore, 'serverInvites', inviteCode);
    const inviteDoc = await getDoc(inviteRef);
    
    if (!inviteDoc.exists()) {
      return null;
    }
    
    const inviteData = {
      ...inviteDoc.data(),
      id: inviteDoc.id,
      // Convert Firestore timestamps to JS Dates
      createdAt: inviteDoc.data().createdAt.toDate(),
      expiresAt: inviteDoc.data().expiresAt.toDate()
    } as ServerInvite;
    
    return inviteData;
  } catch (error) {
    console.error('Error fetching invitation:', error);
    return null;
  }
};

/**
 * Get all valid invites for a server
 * @param firestore - Firestore instance 
 * @param serverId - ID of the server to get invites for
 * @returns Array of valid invitations
 */
export const getServerInvites = async (firestore: any, serverId: string): Promise<ServerInvite[]> => {
  try {
    const invitesQuery = query(
      collection(firestore, 'serverInvites'),
      where('serverId', '==', serverId),
      where('isRevoked', '==', false)
    );
    
    const querySnapshot = await getDocs(invitesQuery);
    const invites: ServerInvite[] = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        code: data.code,
        serverId: data.serverId,
        creatorId: data.creatorId,
        useCount: data.useCount || 0,
        // Convert Firestore timestamps to JS Dates
        createdAt: data.createdAt.toDate(),
        expiresAt: data.expiresAt.toDate(),
        // Optional fields
        serverName: data.serverName,
        maxUses: data.maxUses
      } as ServerInvite;
    });
    
    // Filter out expired invites on the client side
    const now = new Date();
    return invites.filter(invite => invite.expiresAt > now);
  } catch (error) {
    console.error('Error fetching server invitations:', error);
    return [];
  }
};

/**
 * Revoke an invitation, not currently used but may be useful in the future
 * @param firestore - Firestore instance
 * @param inviteCode - The invitation code to revoke
 * @returns true if successful, false otherwise
 */
export const revokeInvite = async (firestore: any, inviteCode: string): Promise<boolean> => {
  try {
    const inviteRef = doc(firestore, 'serverInvites', inviteCode);
    await updateDoc(inviteRef, {
      isRevoked: true
    });
    return true;
  } catch (error) {
    console.error('Error revoking invitation:', error);
    return false;
  }
};