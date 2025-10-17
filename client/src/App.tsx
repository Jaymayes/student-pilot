import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import Profile from "@/pages/profile";
import Onboarding from "@/pages/onboarding";
import Scholarships from "@/pages/scholarships";
import Applications from "@/pages/applications";
import Documents from "@/pages/documents";
import EssayAssistant from "@/pages/essay-assistant";
import Billing from "@/pages/Billing";
import RecommendationAnalytics from "@/pages/RecommendationAnalytics";
import AutofillEssayTest from "@/pages/AutofillEssayTest";
import PaymentDashboard from "@/pages/PaymentDashboard";
import { AccessibilityTestPanel } from "@/components/AccessibilityTestPanel";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      {isLoading || !isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <>
          <Route path="/" component={Dashboard} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/onboarding" component={Onboarding} />
          <Route path="/profile" component={Profile} />
          <Route path="/scholarships" component={Scholarships} />
          <Route path="/applications" component={Applications} />
          <Route path="/documents" component={Documents} />
          <Route path="/essay-assistant" component={EssayAssistant} />
          <Route path="/billing" component={Billing} />
          <Route path="/recommendation-analytics" component={RecommendationAnalytics} />
          <Route path="/autofill-essay-test" component={AutofillEssayTest} />
          <Route path="/payment-dashboard" component={PaymentDashboard} />
          <Route path="/accessibility-test" component={AccessibilityTestPanel} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
