import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, RefreshCw, WifiOff, ServerCrash, ShieldAlert, XCircle } from "lucide-react";

interface ErrorStateProps {
  type?: "network" | "server" | "auth" | "generic";
  title?: string;
  message?: string;
  onRetry?: () => void;
  onGoBack?: () => void;
  showRetry?: boolean;
  showGoBack?: boolean;
  variant?: "inline" | "card" | "alert";
}

export function ErrorState({
  type = "generic",
  title,
  message,
  onRetry,
  onGoBack,
  showRetry = true,
  showGoBack = false,
  variant = "card"
}: ErrorStateProps) {
  const errorConfig = {
    network: {
      icon: WifiOff,
      defaultTitle: "Connection Lost",
      defaultMessage: "We couldn't connect to our servers. Please check your internet connection and try again.",
      testId: "error-network"
    },
    server: {
      icon: ServerCrash,
      defaultTitle: "Service Temporarily Unavailable",
      defaultMessage: "Our servers are experiencing issues. We're working to fix this. Please try again in a moment.",
      testId: "error-server"
    },
    auth: {
      icon: ShieldAlert,
      defaultTitle: "Authentication Required",
      defaultMessage: "Your session has expired. Please log in again to continue.",
      testId: "error-auth"
    },
    generic: {
      icon: XCircle,
      defaultTitle: "Something Went Wrong",
      defaultMessage: "We encountered an unexpected error. Please try again.",
      testId: "error-generic"
    }
  };

  const config = errorConfig[type];
  const Icon = config.icon;
  const displayTitle = title || config.defaultTitle;
  const displayMessage = message || config.defaultMessage;

  if (variant === "alert") {
    return (
      <Alert variant="destructive" data-testid={config.testId}>
        <Icon className="h-4 w-4" />
        <AlertTitle>{displayTitle}</AlertTitle>
        <AlertDescription className="mt-2">
          <p className="mb-4">{displayMessage}</p>
          <div className="flex gap-2">
            {showRetry && onRetry && (
              <Button
                onClick={onRetry}
                size="sm"
                variant="outline"
                data-testid="button-retry"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            )}
            {showGoBack && onGoBack && (
              <Button
                onClick={onGoBack}
                size="sm"
                variant="outline"
                data-testid="button-go-back"
              >
                Go Back
              </Button>
            )}
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  if (variant === "inline") {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4" data-testid={config.testId}>
        <div className="text-center max-w-md">
          <Icon className="w-16 h-16 mx-auto mb-4 text-destructive" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">{displayTitle}</h3>
          <p className="text-gray-600 mb-6">{displayMessage}</p>
          <div className="flex gap-3 justify-center">
            {showRetry && onRetry && (
              <Button
                onClick={onRetry}
                data-testid="button-retry"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            )}
            {showGoBack && onGoBack && (
              <Button
                onClick={onGoBack}
                variant="outline"
                data-testid="button-go-back"
              >
                Go Back
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Default: card variant
  return (
    <Card className="max-w-md mx-auto mt-8" data-testid={config.testId}>
      <CardHeader>
        <div className="flex items-center gap-3">
          <Icon className="w-8 h-8 text-destructive" />
          <CardTitle className="text-xl">{displayTitle}</CardTitle>
        </div>
        <CardDescription className="mt-2">
          {displayMessage}
        </CardDescription>
      </CardHeader>
      <CardFooter className="flex gap-3">
        {showRetry && onRetry && (
          <Button
            onClick={onRetry}
            className="flex-1"
            data-testid="button-retry"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        )}
        {showGoBack && onGoBack && (
          <Button
            onClick={onGoBack}
            variant="outline"
            className="flex-1"
            data-testid="button-go-back"
          >
            Go Back
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
