import { z } from 'zod';

// Schema for server invitations
export const serverInviteSchema = z.object({
  id: z.string().optional(), // Firestore document ID (will be auto-generated)
  code: z.string().min(8), // Unique invitation code
  serverId: z.string(), // ID of the server this invitation is for
  creatorId: z.string(), // User ID who created the invitation
  serverName: z.string().optional(), // Cache the server name for easy display
  
  // Time-related fields
  createdAt: z.date(),
  expiresAt: z.date(), // When this invitation expires
  
  // Optional limitations
  maxUses: z.number().int().positive().optional(), // Maximum number of times this can be used
  useCount: z.number().int().nonnegative().default(0), // How many times it's been used
});

export type ServerInvite = z.infer<typeof serverInviteSchema>;

// Function to check if an invitation is valid (not expired, not revoked, not maxed out)
export const isInviteValid = (invite: ServerInvite): boolean => {
  const now = new Date();
  if (now > invite.expiresAt) return false;
  if (invite.maxUses && invite.useCount >= invite.maxUses) return false;
  return true;
};

// Function to validate invitation data
export const validateServerInvite = (data: unknown): ServerInvite | null => {
  try {
    return serverInviteSchema.parse(data);
  } catch (error) {
    console.error('Server invitation validation error:', error);
    return null;
  }
};

// Function to "safely" validate invitation data without returning detailed errors
export const safeValidateServerInvite = (data: unknown) => {
  return serverInviteSchema.safeParse(data);
};