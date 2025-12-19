// Shared user types for client-side components
export type SubscriptionStatus = 'inactive' | 'active' | 'trialing' | 'canceled' | 'past_due';

export interface User {
  id: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  profileImageUrl?: string | null;
  subscriptionStatus?: SubscriptionStatus | null;
  stripeCustomerId?: string | null;
  credits?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthUser extends User {
  // Additional auth-specific properties can be added here
}