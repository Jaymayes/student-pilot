import { ExternalLink, CreditCard } from "lucide-react";
import { getBillingPortalUrl, isBillingEnabled } from "@/lib/config";
import { useAuth } from "@/hooks/useAuth";

interface BillingLinkProps {
  variant?: "nav" | "button" | "footer" | "menu";
  source?: string;
  campaign?: string;
  className?: string;
  children?: React.ReactNode;
}

export function BillingLink({ 
  variant = "nav", 
  source = "nav", 
  campaign = "billing-link", 
  className = "",
  children 
}: BillingLinkProps) {
  const { user } = useAuth();
  
  // Don't render if billing is disabled
  if (!isBillingEnabled()) {
    return null;
  }
  
  const billingUrl = getBillingPortalUrl(source, campaign, user?.id);
  const ariaLabel = "Open Billing and Credits portal (opens in new tab)";
  
  const content = children || (
    <>
      <CreditCard className="h-4 w-4" />
      <span>Billing & Credits</span>
      <ExternalLink className="h-3 w-3 opacity-70" />
    </>
  );
  
  const baseClassName = "inline-flex items-center gap-2 transition-colors hover:text-primary";
  
  const variantStyles = {
    nav: "text-sm font-medium text-muted-foreground hover:text-foreground",
    button: "px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90",
    footer: "text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline",
    menu: "w-full text-sm cursor-pointer rounded-sm px-2 py-1.5 hover:bg-accent hover:text-accent-foreground"
  };
  
  return (
    <a
      href={billingUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={ariaLabel}
      className={`${baseClassName} ${variantStyles[variant]} ${className}`}
      data-testid={`billing-link-${variant}`}
    >
      {content}
    </a>
  );
}

// Specialized component for low balance warnings
export function BuyCreditsButton({ 
  className = "",
  requiredCredits,
}: { 
  className?: string; 
  requiredCredits?: number;
}) {
  const { user } = useAuth();
  
  if (!isBillingEnabled()) {
    return null;
  }
  
  const billingUrl = getBillingPortalUrl("low-balance", "insufficient-credits", user?.id);
  
  return (
    <a
      href={billingUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Buy credits to continue (opens in new tab)"
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-md bg-orange-600 text-white hover:bg-orange-700 transition-colors ${className}`}
      data-testid="buy-credits-button"
    >
      <CreditCard className="h-4 w-4" />
      <span>
        Buy Credits
        {requiredCredits && ` (${requiredCredits} needed)`}
      </span>
      <ExternalLink className="h-3 w-3 opacity-80" />
    </a>
  );
}