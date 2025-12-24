import { useMemo } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw, Home, LogIn } from "lucide-react";

type ErrorBucket = {
  title: string;
  message: string;
  ctaLabel: string;
  ctaPath: string;
  ctaIcon: typeof RefreshCw;
  isRetryable: boolean;
};

const ERROR_COPY: Record<string, ErrorBucket> = {
  upstream_temporarily_unavailable: {
    title: "Temporary sign-in issue",
    message: "Our login partner is having a brief outage. Please try again.",
    ctaLabel: "Try again",
    ctaPath: "/api/login",
    ctaIcon: RefreshCw,
    isRetryable: true,
  },
  upstream_server_error: {
    title: "Temporary sign-in issue",
    message: "Our login partner is having a brief outage. Please try again.",
    ctaLabel: "Try again",
    ctaPath: "/api/login",
    ctaIcon: RefreshCw,
    isRetryable: true,
  },
  upstream_unavailable: {
    title: "Temporary sign-in issue",
    message: "Our login partner is having a brief outage. Please try again.",
    ctaLabel: "Try again",
    ctaPath: "/api/login",
    ctaIcon: RefreshCw,
    isRetryable: true,
  },
  access_denied: {
    title: "Access was not granted",
    message: "You canceled the sign-in. No changes were made.",
    ctaLabel: "Try sign-in again",
    ctaPath: "/api/login",
    ctaIcon: LogIn,
    isRetryable: false,
  },
  expired_auth_code: {
    title: "Your sign-in expired",
    message: "Please restart the sign-in process.",
    ctaLabel: "Restart sign-in",
    ctaPath: "/api/login",
    ctaIcon: RefreshCw,
    isRetryable: false,
  },
  client_configuration: {
    title: "Sign-in configuration issue",
    message: "We're fixing a configuration issue. Please try again later.",
    ctaLabel: "Back to Home",
    ctaPath: "/",
    ctaIcon: Home,
    isRetryable: false,
  },
  pkce_mismatch: {
    title: "Security check failed",
    message: "Please restart sign-in.",
    ctaLabel: "Restart sign-in",
    ctaPath: "/api/login",
    ctaIcon: RefreshCw,
    isRetryable: false,
  },
  fallback: {
    title: "We hit a snag",
    message: "Please try again. If it persists, contact support with this code.",
    ctaLabel: "Try again",
    ctaPath: "/api/login",
    ctaIcon: RefreshCw,
    isRetryable: true,
  },
};

function redactCorrelationId(cid: string): string {
  if (cid.length > 8) {
    return `${cid.slice(0, 4)}****${cid.slice(-4)}`;
  }
  return cid;
}

export default function AuthError() {
  const [location] = useLocation();
  
  const { bucket, cidRedacted } = useMemo(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const reason = (searchParams.get("reason") || "").toLowerCase();
    const cid = searchParams.get("cid") || "";
    
    return {
      bucket: ERROR_COPY[reason] ?? ERROR_COPY.fallback,
      cidRedacted: cid ? redactCorrelationId(cid) : null,
    };
  }, [location]);

  const handleCtaClick = () => {
    window.location.href = bucket.ctaPath;
  };

  const handleHomeClick = () => {
    window.location.href = "/";
  };

  const CtaIcon = bucket.ctaIcon;

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <Card className="w-full max-w-md" data-testid="card-auth-error">
        <CardContent className="pt-6 pb-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h1 
                className="text-xl font-semibold text-gray-900 dark:text-gray-100"
                data-testid="text-auth-error-title"
              >
                {bucket.title}
              </h1>
            </div>
          </div>

          <p 
            className="text-sm text-gray-600 dark:text-gray-400 mb-4"
            data-testid="text-auth-error-message"
          >
            {bucket.message}
          </p>

          {cidRedacted && (
            <p 
              className="text-xs text-gray-500 dark:text-gray-500 mb-4 font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded"
              data-testid="text-correlation-id"
            >
              Code: {cidRedacted}
            </p>
          )}

          <div className="flex gap-3">
            <Button
              onClick={handleCtaClick}
              className="flex-1"
              data-testid="button-auth-error-cta"
            >
              <CtaIcon className="h-4 w-4 mr-2" />
              {bucket.ctaLabel}
            </Button>
            {bucket.ctaPath !== "/" && (
              <Button
                variant="outline"
                onClick={handleHomeClick}
                data-testid="button-back-home"
              >
                <Home className="h-4 w-4 mr-2" />
                Home
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
