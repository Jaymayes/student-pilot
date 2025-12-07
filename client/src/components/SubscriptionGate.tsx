import { useState, useEffect } from 'react';
import { useSubscription } from '@/hooks/useSubscription';
import { PricingModal } from './PricingModal';
import { Skeleton } from '@/components/ui/skeleton';

interface SubscriptionGateProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  featureName?: string;
}

export function SubscriptionGate({ 
  children, 
  fallback,
  featureName = "this feature"
}: SubscriptionGateProps) {
  const { isActive, isLoading, refreshSubscription } = useSubscription();
  const [showPricingModal, setShowPricingModal] = useState(false);

  // Check for checkout success param and refresh subscription data
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('checkout') === 'success') {
      // User just returned from successful checkout, refresh subscription data
      refreshSubscription();
    }
  }, [refreshSubscription]);

  if (isLoading) {
    return (
      <div className="p-6 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50" data-testid="subscription-gate-loading">
        <div className="max-w-sm mx-auto space-y-4">
          <Skeleton className="h-6 w-32 mx-auto" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-10 w-36 mx-auto" />
        </div>
      </div>
    );
  }

  if (!isActive) {
    return (
      <>
        {fallback || (
          <div 
            className="p-6 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 text-center"
            data-testid="subscription-gate"
          >
            <div className="max-w-sm mx-auto">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2" data-testid="text-premium-title">
                Premium Feature
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4" data-testid="text-premium-description">
                Purchase credits to unlock {featureName} and other premium features.
              </p>
              <button
                onClick={() => setShowPricingModal(true)}
                className="px-4 py-2 bg-[#F5A742] hover:bg-[#E09830] text-[#13293D] font-semibold rounded-lg transition-colors"
                data-testid="btn-unlock-premium"
              >
                Unlock Premium
              </button>
            </div>
          </div>
        )}
        <PricingModal 
          open={showPricingModal} 
          onOpenChange={setShowPricingModal}
          title={`Unlock ${featureName}`}
          description={`Purchase credits to access ${featureName} and all premium features.`}
        />
      </>
    );
  }

  return <>{children}</>;
}

export function usePremiumGate() {
  const { isActive, isLoading } = useSubscription();
  const [showPricingModal, setShowPricingModal] = useState(false);

  const requirePremium = (callback: () => void) => {
    if (isActive) {
      callback();
    } else {
      setShowPricingModal(true);
    }
  };

  return {
    isActive,
    isLoading,
    showPricingModal,
    setShowPricingModal,
    requirePremium,
    PricingModalComponent: (
      <PricingModal 
        open={showPricingModal} 
        onOpenChange={setShowPricingModal}
      />
    )
  };
}
