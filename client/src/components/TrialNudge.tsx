import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Sparkles, X } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";

const LOW_CREDITS_THRESHOLD = 2;

export function TrialNudge() {
  const { user } = useAuth();
  const { startCheckout, isCheckingOut } = useSubscription();
  const [isDismissed, setIsDismissed] = useState(false);
  
  const credits = user?.credits ?? 0;
  const isLowCredits = credits <= LOW_CREDITS_THRESHOLD;
  const isZeroCredits = credits === 0;
  
  if (isDismissed || !isLowCredits) {
    return null;
  }
  
  const handleBuyCredits = async () => {
    try {
      await startCheckout({ packageCode: 'starter' });
    } catch (error) {
      console.error('Checkout failed:', error);
    }
  };
  
  return (
    <Card 
      className={`mb-4 border-2 ${isZeroCredits ? 'border-destructive bg-destructive/5' : 'border-amber-500 bg-amber-50 dark:bg-amber-950/20'}`}
      data-testid="trial-nudge"
    >
      <CardContent className="py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            {isZeroCredits ? (
              <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
            ) : (
              <Sparkles className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
            )}
            <div>
              <h4 className="font-semibold text-sm">
                {isZeroCredits 
                  ? "You're out of credits!" 
                  : `Only ${credits} credit${credits === 1 ? '' : 's'} remaining`
                }
              </h4>
              <p className="text-sm text-muted-foreground mt-1">
                {isZeroCredits 
                  ? "Purchase credits to continue using AI essay assistance and scholarship matching."
                  : "Get more credits to unlock unlimited AI-powered scholarship assistance."
                }
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              size="sm"
              variant={isZeroCredits ? "destructive" : "default"}
              onClick={handleBuyCredits}
              disabled={isCheckingOut}
              data-testid="button-buy-credits"
            >
              {isCheckingOut ? "Loading..." : "Buy Credits"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsDismissed(true)}
              className="h-8 w-8 p-0"
              data-testid="button-dismiss-nudge"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
          <Link href="/pricing" className="hover:underline" data-testid="link-view-pricing">
            View pricing
          </Link>
          <span className="text-muted-foreground/50">•</span>
          <span>Credits: {credits}</span>
        </div>
      </CardContent>
    </Card>
  );
}
