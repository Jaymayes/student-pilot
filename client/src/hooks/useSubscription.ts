import { useAuth } from './useAuth';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import type { SubscriptionStatus } from '@/types/user';
import { useCallback } from 'react';
import { getUtmForCheckout } from './useUtm';

export interface CheckoutOptions {
  priceId?: string;
  mode?: 'payment' | 'subscription';
  packageCode?: 'starter' | 'professional' | 'enterprise';
  successUrl?: string;
  cancelUrl?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}

export interface CheckoutResponse {
  url: string;
  sessionId: string;
  mode: string;
  request_id: string;
}

export function useSubscription() {
  const { user, isLoading: isAuthLoading } = useAuth();
  
  const subscriptionStatus: SubscriptionStatus = user?.subscriptionStatus || 'inactive';
  const isActive = subscriptionStatus === 'active' || subscriptionStatus === 'trialing';
  const isPastDue = subscriptionStatus === 'past_due';
  const isCanceled = subscriptionStatus === 'canceled';

  // Build proper success/cancel URLs
  const getCheckoutUrls = useCallback(() => {
    const baseUrl = window.location.origin;
    return {
      successUrl: `${baseUrl}/dashboard?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${baseUrl}/pricing?checkout=canceled`
    };
  }, []);
  
  const checkoutMutation = useMutation({
    mutationFn: async (options: CheckoutOptions = {}): Promise<CheckoutResponse> => {
      const urls = getCheckoutUrls();
      const utmParams = getUtmForCheckout();
      const requestBody = {
        ...options,
        successUrl: options.successUrl || urls.successUrl,
        cancelUrl: options.cancelUrl || urls.cancelUrl,
        utmSource: options.utmSource || utmParams.utmSource,
        utmMedium: options.utmMedium || utmParams.utmMedium,
        utmCampaign: options.utmCampaign || utmParams.utmCampaign
      };
      const response = await apiRequest('POST', '/api/checkout', requestBody);
      return response.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    }
  });

  const startCheckout = async (options: CheckoutOptions = {}) => {
    return checkoutMutation.mutateAsync(options);
  };

  const refreshSubscription = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
  }, []);

  return {
    subscriptionStatus,
    isActive,
    isPastDue,
    isCanceled,
    isLoading: isAuthLoading || checkoutMutation.isPending,
    isCheckingOut: checkoutMutation.isPending,
    startCheckout,
    refreshSubscription,
    error: checkoutMutation.error
  };
}
