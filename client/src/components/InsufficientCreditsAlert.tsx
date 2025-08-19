import { Alert, AlertDescription } from "@/components/ui/alert";
import { BuyCreditsButton } from "@/components/BillingLink";
import { TriangleAlert } from "lucide-react";

interface InsufficientCreditsAlertProps {
  requiredCredits: number;
  currentCredits?: number;
  featureName?: string;
  className?: string;
}

export function InsufficientCreditsAlert({ 
  requiredCredits, 
  currentCredits = 0, 
  featureName = "AI-powered features",
  className = ""
}: InsufficientCreditsAlertProps) {
  return (
    <Alert className={`border-red-200 bg-red-50 ${className}`}>
      <TriangleAlert className="h-4 w-4 text-red-600" />
      <AlertDescription className="flex items-center justify-between">
        <div>
          <strong className="text-red-800">Insufficient Credits</strong>
          <p className="text-red-700">
            You need {requiredCredits} credits to use {featureName}
            {currentCredits > 0 && ` (you have ${currentCredits} credits)`}.
          </p>
        </div>
        <BuyCreditsButton 
          requiredCredits={requiredCredits - currentCredits} 
          className="ml-4 flex-shrink-0 bg-red-600 hover:bg-red-700" 
        />
      </AlertDescription>
    </Alert>
  );
}

export function LowBalanceWarning({ 
  currentCredits = 0, 
  threshold = 100,
  className = ""
}: { 
  currentCredits?: number; 
  threshold?: number;
  className?: string;
}) {
  if (currentCredits > threshold) return null;

  return (
    <Alert className={`border-orange-200 bg-orange-50 ${className}`}>
      <TriangleAlert className="h-4 w-4 text-orange-600" />
      <AlertDescription className="flex items-center justify-between">
        <div>
          <strong className="text-orange-800">Low Credits Balance</strong>
          <p className="text-orange-700">
            You have {currentCredits} credits remaining. Consider purchasing more to avoid interruptions with AI features.
          </p>
        </div>
        <BuyCreditsButton className="ml-4 flex-shrink-0" />
      </AlertDescription>
    </Alert>
  );
}