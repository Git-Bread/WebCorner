// Zod schema for user data validation, helps ensure that user data conforms to expected structure and types
// This schema is used for validating user data before saving it to Firestore
import { z } from 'zod';

// Define the member schema
// This schema is for creating sub-objects within the user schema, such as 'owns' and 'member'
export const serverRefSchema = z.object({
    serverId: z.string(),
    joinedAt: z.date().optional()
});

export type ServerRef = z.infer<typeof serverRefSchema>;

// Define the User schema using zod
// This schema includes fields for user information such as username, email, profile image URL, and bio
// Aswell as maps for settings and user configurations
export const userSchema = z.object({
  id: z.string().optional(), // Firestore document ID
  username: z.string().min(3).max(30),
  email: z.string().email(),
  profile_image_url: z.string().url().nullable().optional(),
  bio: z.string().max(500).optional(),

  // a sub-document is better at scale but this is way more efficient for small data
  // and easier to work with in the client, also reduces api calls and data transfer
  servers: z.array(serverRefSchema).default([]),
  createdAt: z.date(),
  updatedAt: z.date(),

  settings: z.record(z.string(), z.unknown()).default({}),
  components: z.record(z.string(), z.unknown()).default({}),
});

// Create TypeScript type from the schema
export type User = z.infer<typeof userSchema>;

// Function to validate user data
export const validateUser = (data: unknown): User | null => {
  try {
    return userSchema.parse(data);
  } catch (error) {
    console.error('User validation error:', error);
    return null;
  }
};

// Function to safely validate user data and return validation result
export const safeValidateUser = (data: unknown) => {
  return userSchema.safeParse(data);
};