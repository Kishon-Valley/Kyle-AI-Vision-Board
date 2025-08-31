/**
 * Centralized subscription status mapping utilities
 * Ensures consistent mapping between Stripe statuses and our database statuses
 */

export type StripeSubscriptionStatus = 
  | 'active'
  | 'trialing'
  | 'canceled'
  | 'unpaid'
  | 'past_due'
  | 'incomplete'
  | 'incomplete_expired';

export type LocalSubscriptionStatus = 'active' | 'inactive' | 'cancelled';

/**
 * Maps Stripe subscription status to our local database status
 * @param stripeStatus - The status from Stripe API
 * @returns The corresponding local status
 */
export const mapStripeStatusToLocal = (stripeStatus: StripeSubscriptionStatus): LocalSubscriptionStatus => {
  switch (stripeStatus) {
    case 'active':
    case 'trialing':
      return 'active';
    case 'canceled':
    case 'unpaid':
    case 'past_due':
    case 'incomplete_expired':
      return 'cancelled';
    case 'incomplete':
      return 'inactive';
    default:
      return 'inactive';
  }
};

/**
 * Validates if a local subscription status is valid
 * @param status - The status to validate
 * @returns True if the status is valid
 */
export const isValidLocalStatus = (status: string): status is LocalSubscriptionStatus => {
  return ['active', 'inactive', 'cancelled'].includes(status);
};

/**
 * Checks if a subscription status indicates an active subscription
 * @param status - The subscription status to check
 * @returns True if the subscription is active
 */
export const isActiveSubscription = (status: LocalSubscriptionStatus): boolean => {
  return status === 'active';
};

/**
 * Gets a human-readable description of a subscription status
 * @param status - The subscription status
 * @returns A human-readable description
 */
export const getStatusDescription = (status: LocalSubscriptionStatus): string => {
  switch (status) {
    case 'active':
      return 'Active subscription';
    case 'inactive':
      return 'No active subscription';
    case 'cancelled':
      return 'Subscription cancelled';
    default:
      return 'Unknown status';
  }
};
