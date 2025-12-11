import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ThemeProvider } from "@/components/ThemeProvider";
import { useAuth } from "@/hooks/useAuth";
import { useFeatureFlags } from "@/lib/featureFlags";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import Profile from "@/pages/profile";
import Onboarding from "@/pages/onboarding";
import AgeGate from "@/pages/AgeGate";
import Scholarships from "@/pages/scholarships";
import Applications from "@/pages/applications";
import Documents from "@/pages/documents";
import EssayAssistant from "@/pages/essay-assistant";
import Billing from "@/pages/Billing";
import RecommendationAnalytics from "@/pages/RecommendationAnalytics";
import AutofillEssayTest from "@/pages/AutofillEssayTest";
import PaymentDashboard from "@/pages/PaymentDashboard";
import { AccessibilityTestPanel } from "@/components/AccessibilityTestPanel";
import { PrivacyPolicy, TermsOfService, AccessibilityStatement } from "@/pages/legal";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();
  const featureFlags = useFeatureFlags();

  return (
    <Switch>
      {/* Legal pages - accessible to everyone */}
      <Route path="/privacy" component={PrivacyPolicy} />
      <Route path="/terms" component={TermsOfService} />
      <Route path="/accessibility" component={AccessibilityStatement} />
      
      {/* Public pages - accessible to everyone for discovery */}
      <Route path="/pricing" component={Billing} />
      <Route path="/scholarships" component={Scholarships} />
      
      {isLoading || !isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <>
          <Route path="/" component={Dashboard} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/age-gate" component={AgeGate} />
          <Route path="/onboarding" component={Onboarding} />
          <Route path="/profile" component={Profile} />
          <Route path="/applications" component={Applications} />
          <Route path="/documents" component={Documents} />
          <Route path="/essay-assistant" component={EssayAssistant} />
          <Route path="/billing" component={Billing} />
          {featureFlags.enableRecommendations && (
            <Route path="/recommendation-analytics" component={RecommendationAnalytics} />
          )}
          <Route path="/autofill-essay-test" component={AutofillEssayTest} />
          {featureFlags.enablePayments && (
            <Route path="/payment-dashboard" component={PaymentDashboard} />
          )}
          {featureFlags.enableAccessibilityTest && (
            <Route path="/accessibility-test" component={AccessibilityTestPanel} />
          )}
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
