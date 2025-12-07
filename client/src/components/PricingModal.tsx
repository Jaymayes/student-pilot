import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Sparkles, Zap, Crown, Loader2 } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { useState } from 'react';

interface PricingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
}

const PRICING_TIERS = [
  {
    id: 'starter',
    name: 'Starter',
    price: 9.99,
    credits: 100,
    icon: Zap,
    popular: false,
    features: [
      '100 AI Credits',
      'Basic scholarship matching',
      'Document storage (5 files)',
      'Email support'
    ]
  },
  {
    id: 'professional',
    name: 'Professional',
    price: 29.99,
    credits: 500,
    bonusCredits: 50,
    icon: Sparkles,
    popular: true,
    features: [
      '500 + 50 bonus AI Credits',
      'Advanced scholarship matching',
      'Priority AI essay assistance',
      'Unlimited document storage',
      'Priority support'
    ]
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 99.99,
    credits: 2000,
    bonusCredits: 500,
    icon: Crown,
    popular: false,
    features: [
      '2000 + 500 bonus AI Credits',
      'Premium scholarship insights',
      'Dedicated essay coaching',
      'Application review service',
      'Dedicated account manager'
    ]
  }
] as const;

export function PricingModal({ 
  open, 
  onOpenChange, 
  title = "Unlock Premium Features",
  description = "Choose a plan to access AI-powered essay assistance, advanced scholarship matching, and more."
}: PricingModalProps) {
  const { startCheckout, isCheckingOut } = useSubscription();
  const [selectedTier, setSelectedTier] = useState<string | null>(null);

  const handleSelectPlan = async (tierId: string) => {
    setSelectedTier(tierId);
    try {
      await startCheckout({
        packageCode: tierId as 'starter' | 'professional' | 'enterprise',
        mode: 'payment'
      });
    } catch (error) {
      console.error('Checkout error:', error);
      setSelectedTier(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden" data-testid="pricing-modal">
        <DialogHeader className="p-6 pb-2 bg-gradient-to-r from-[#13293D] to-[#1A3A5C] text-white">
          <DialogTitle className="text-2xl font-semibold">{title}</DialogTitle>
          <DialogDescription className="text-gray-300">
            {description}
          </DialogDescription>
        </DialogHeader>
        
        <div className="p-6 bg-gray-50 dark:bg-gray-900">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PRICING_TIERS.map((tier) => {
              const Icon = tier.icon;
              const isSelected = selectedTier === tier.id;
              const isLoading = isCheckingOut && isSelected;
              
              return (
                <Card 
                  key={tier.id}
                  className={`relative transition-all duration-200 ${
                    tier.popular 
                      ? 'border-2 border-[#F5A742] shadow-lg scale-105 z-10' 
                      : 'border border-gray-200 dark:border-gray-700 hover:border-[#13293D] dark:hover:border-[#F5A742]'
                  }`}
                  data-testid={`pricing-tier-${tier.id}`}
                >
                  {tier.popular && (
                    <Badge 
                      className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#F5A742] text-[#13293D] font-semibold"
                    >
                      Most Popular
                    </Badge>
                  )}
                  
                  <CardHeader className="text-center pb-2">
                    <div className="mx-auto mb-2 p-3 rounded-full bg-[#13293D]/10 dark:bg-[#F5A742]/10 w-fit">
                      <Icon className={`h-6 w-6 ${tier.popular ? 'text-[#F5A742]' : 'text-[#13293D] dark:text-[#F5A742]'}`} />
                    </div>
                    <CardTitle className="text-lg">{tier.name}</CardTitle>
                    <CardDescription>
                      <span className="text-3xl font-bold text-[#13293D] dark:text-white">
                        ${tier.price}
                      </span>
                      <span className="text-gray-500 ml-1">one-time</span>
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    <div className="text-center mb-4 py-2 bg-[#F5A742]/10 rounded-lg">
                      <span className="font-semibold text-[#13293D] dark:text-[#F5A742]">
                        {tier.credits.toLocaleString()} Credits
                      </span>
                      {'bonusCredits' in tier && tier.bonusCredits && (
                        <span className="text-green-600 dark:text-green-400 ml-1">
                          +{tier.bonusCredits} bonus
                        </span>
                      )}
                    </div>
                    
                    <ul className="space-y-2">
                      {tier.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm">
                          <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span className="text-gray-600 dark:text-gray-300">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  
                  <CardFooter>
                    <Button 
                      className={`w-full ${
                        tier.popular 
                          ? 'bg-[#F5A742] hover:bg-[#E09830] text-[#13293D]' 
                          : 'bg-[#13293D] hover:bg-[#1A3A5C] text-white'
                      }`}
                      onClick={() => handleSelectPlan(tier.id)}
                      disabled={isCheckingOut}
                      data-testid={`btn-select-${tier.id}`}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        `Get ${tier.name}`
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
          
          <p className="text-center text-sm text-gray-500 mt-6">
            Secure payment powered by Stripe. Credits never expire.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
