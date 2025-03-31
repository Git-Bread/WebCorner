import { z } from 'zod';

// Schema for server member
export const serverMemberSchema = z.object({
    id: z.string().optional(),
    userId: z.string(),
    role: z.enum(['owner', 'admin', 'member']).default('member'),
    joinedAt: z.date(),
    groupIds: z.array(z.string()).default([]),
});

export type ServerMember = z.infer<typeof serverMemberSchema>;

// Schema for member groups
export const serverGroupSchema = z.object({
    id: z.string().optional(),
    name: z.string().min(1).max(50),
    description: z.string().max(500).optional(),
    color: z.string().optional(), // identifier for group

    // Permissions for this group
    permissions: z.object({
        canManageChannels: z.boolean().default(false),
        canManageMembers: z.boolean().default(false),
        groupLeader: z.string().optional(), // userId of the group admin
    }).default({}),

    createdAt: z.date(),
    updatedAt: z.date(),
});

export type ServerGroup = z.infer<typeof serverGroupSchema>;

// Define the server schema
export const serverSchema = z.object({
    id: z.string().optional(), // Firestore document ID
    name: z.string().min(3).max(50),
    description: z.string().max(500).optional(),
    server_img_url: z.string().url().nullable().optional(),

    ownerId: z.string(),
  
    createdAt: z.date(),
    updatedAt: z.date(),

    maxMembers: z.number().int().positive().default(100),
    memberCount: z.number().int().nonnegative().default(1),
  
    settings: z.record(z.string(), z.unknown()).default({}),
    components: z.record(z.string(), z.boolean()).default({}),
});

// Create TypeScript type from the schema
export type Server = z.infer<typeof serverSchema>;

// Function to validate server data
export const validateServer = (data: unknown): Server | null => {
  try {
    return serverSchema.parse(data);
  } catch (error) {
    console.error('Server validation error:', error);
    return null;
  }
};

// Function to safely validate server data
export const safeValidateServer = (data: unknown) => {
  return serverSchema.safeParse(data);
};