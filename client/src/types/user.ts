// Shared user types for client-side components
export interface User {
  id: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  profileImageUrl?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthUser extends User {
  // Additional auth-specific properties can be added here
}