import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { 
  Shield, 
  FileText, 
  Users, 
  Lock, 
  MessageCircle, 
  BarChart3, 
  Brain, 
  AlertCircle,
  CheckCircle2,
  Info
} from "lucide-react";

interface ConsentCategory {
  id: string;
  category: string;
  title: string;
  description: string;
  isRequired: boolean;
  isFerpaRegulated: boolean;
  retentionMonths: number | null;
}

interface DataUseDisclosure {
  id: string;
  category: string;
  purpose: string;
  dataTypes: string[];
  thirdParties: string[] | null;
  retentionPeriod: string | null;
  userRights: string[];
  legalBasis: string | null;
}

interface OnboardingProgress {
  consentCompleted: boolean;
  profileCompleted: boolean;
  currentStep: string;
}

interface ConsentDecision {
  categoryId: string;
  status: 'granted' | 'denied';
}

const getConsentIcon = (category: string) => {
  switch (category) {
    case 'ferpa_directory_info':
    case 'ferpa_educational_records':
      return <Shield className="w-5 h-5 text-blue-600" />;
    case 'data_processing':
      return <FileText className="w-5 h-5 text-green-600" />;
    case 'ai_processing':
      return <Brain className="w-5 h-5 text-purple-600" />;
    case 'third_party_sharing':
      return <Users className="w-5 h-5 text-orange-600" />;
    case 'marketing_communications':
      return <MessageCircle className="w-5 h-5 text-pink-600" />;
    case 'analytics_tracking':
      return <BarChart3 className="w-5 h-5 text-indigo-600" />;
    default:
      return <Lock className="w-5 h-5 text-gray-600" />;
  }
};

export default function Onboarding() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [consentDecisions, setConsentDecisions] = useState<Record<string, 'granted' | 'denied'>>({});
  const [showDisclosures, setShowDisclosures] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please log in to complete your profile setup.",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 1000);
    }
  }, [isAuthenticated, authLoading, toast]);

  // Fetch onboarding progress
  const { data: progress } = useQuery<OnboardingProgress>({
    queryKey: ["/api/onboarding/progress"],
    retry: false,
    enabled: isAuthenticated,
  });

  // Fetch consent categories
  const { data: categories, isLoading: categoriesLoading } = useQuery<ConsentCategory[]>({
    queryKey: ["/api/consent/categories"],
    retry: false,
    enabled: isAuthenticated,
  });

  // Fetch data use disclosures
  const { data: disclosures } = useQuery<DataUseDisclosure[]>({
    queryKey: ["/api/consent/disclosures"],
    retry: false,
    enabled: isAuthenticated && showDisclosures,
  });

  // Initialize consent system
  const initMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/consent/initialize");
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Session Expired",
          description: "Please log in again to continue.",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      console.error("Initialization error:", error);
    },
  });

  // Submit consent decisions
  const submitMutation = useMutation({
    mutationFn: async (decisions: ConsentDecision[]) => {
      return await apiRequest("POST", "/api/consent/record", { decisions });
    },
    onSuccess: (response: any) => {
      toast({
        title: "Consent Recorded",
        description: "Your privacy preferences have been saved successfully.",
      });

      // Redirect based on response
      if (response.hasRequiredConsents) {
        // Move to profile creation
        setLocation("/profile");
      } else {
        toast({
          title: "Required Consent Missing",
          description: "You must grant consent to required items to continue.",
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Session Expired",
          description: "Please log in again to continue.",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to save your consent preferences. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Initialize consent system on load
  useEffect(() => {
    if (isAuthenticated && !categoriesLoading && (!categories || categories.length === 0)) {
      initMutation.mutate();
    }
  }, [isAuthenticated, categories, categoriesLoading]);

  // Check if user already completed onboarding
  useEffect(() => {
    if (progress?.consentCompleted) {
      if (progress.profileCompleted) {
        // Fully onboarded, redirect to dashboard
        setLocation("/");
      } else {
        // Consent done, move to profile
        setLocation("/profile");
      }
    }
  }, [progress, setLocation]);

  const handleConsentChange = (categoryId: string, granted: boolean) => {
    setConsentDecisions(prev => ({
      ...prev,
      [categoryId]: granted ? 'granted' : 'denied'
    }));
  };

  const handleSubmit = () => {
    if (!categories) return;

    const decisions: ConsentDecision[] = categories.map(category => ({
      categoryId: category.id,
      status: consentDecisions[category.id] || 'denied'
    }));

    // Check if all required consents are granted
    const requiredCategories = categories.filter(cat => cat.isRequired);
    const missingRequired = requiredCategories.some(cat => consentDecisions[cat.id] !== 'granted');

    if (missingRequired) {
      toast({
        title: "Required Consent Missing",
        description: "Please grant consent to all required items to continue with your account setup.",
        variant: "destructive",
      });
      return;
    }

    submitMutation.mutate(decisions);
  };

  const calculateProgress = () => {
    if (!categories || categories.length === 0) return 0;
    const decidedCount = Object.keys(consentDecisions).length;
    return (decidedCount / categories.length) * 100;
  };

  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12">
      <div className="container max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4" data-testid="heading-onboarding">
            Welcome to ScholarLink
          </h1>
          <p className="text-xl text-gray-600 mb-6">
            Let's set up your account with FERPA-compliant privacy preferences
          </p>
          
          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Privacy Setup</span>
              <span>{Math.round(calculateProgress())}% Complete</span>
            </div>
            <Progress value={calculateProgress()} className="h-2" data-testid="progress-consent" />
          </div>
        </div>

        {/* FERPA Information Banner */}
        <Alert className="mb-8 border-blue-200 bg-blue-50">
          <Shield className="h-5 w-5 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>FERPA Compliance:</strong> As an educational service, we follow the Family Educational Rights 
            and Privacy Act (FERPA) to protect your educational records. Your consent helps us provide personalized 
            scholarship matching while keeping your information secure.
          </AlertDescription>
        </Alert>

        {/* Data Use Disclosures Toggle */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="w-5 h-5" />
              Data Use Information
            </CardTitle>
            <CardDescription>
              Learn how we use your data and your privacy rights
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="outline" 
              onClick={() => setShowDisclosures(!showDisclosures)}
              data-testid="button-toggle-disclosures"
            >
              {showDisclosures ? 'Hide' : 'Show'} Data Use Details
            </Button>

            {showDisclosures && disclosures && (
              <div className="mt-4 space-y-4">
                {disclosures.map(disclosure => (
                  <Card key={disclosure.id} className="border-l-4 border-l-blue-500">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">{disclosure.purpose}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <strong>Data Types:</strong> {disclosure.dataTypes.join(', ')}
                      </div>
                      {disclosure.thirdParties && disclosure.thirdParties.length > 0 && (
                        <div>
                          <strong>Third Parties:</strong> {disclosure.thirdParties.join(', ')}
                        </div>
                      )}
                      <div>
                        <strong>Retention:</strong> {disclosure.retentionPeriod || 'Varies by category'}
                      </div>
                      <div>
                        <strong>Your Rights:</strong> {disclosure.userRights.join(', ')}
                      </div>
                      {disclosure.legalBasis && (
                        <div>
                          <strong>Legal Basis:</strong> {disclosure.legalBasis}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Consent Categories */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Privacy Preferences</CardTitle>
            <CardDescription>
              Please review each category and provide your consent preferences
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96">
              <div className="space-y-6">
                {categories?.map((category, index) => (
                  <div key={category.id}>
                    <div className="flex items-start space-x-4 p-4 rounded-lg border bg-gray-50">
                      <div className="mt-1">
                        {getConsentIcon(category.category)}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-lg">{category.title}</h3>
                          {category.isRequired && (
                            <Badge variant="destructive" className="text-xs">
                              Required
                            </Badge>
                          )}
                          {category.isFerpaRegulated && (
                            <Badge variant="secondary" className="text-xs">
                              FERPA
                            </Badge>
                          )}
                        </div>
                        
                        <p className="text-gray-700 mb-3">{category.description}</p>
                        
                        {category.retentionMonths && (
                          <p className="text-sm text-gray-500 mb-3">
                            Data retention: {Math.round(category.retentionMonths / 12)} year(s)
                          </p>
                        )}

                        <div className="flex items-center space-x-6">
                          <label className="flex items-center space-x-2 cursor-pointer">
                            <Checkbox
                              checked={consentDecisions[category.id] === 'granted'}
                              onCheckedChange={(checked) => 
                                handleConsentChange(category.id, !!checked)
                              }
                              data-testid={`checkbox-consent-${category.category}`}
                            />
                            <span className="text-sm font-medium">
                              I consent
                            </span>
                          </label>
                          
                          {consentDecisions[category.id] === 'granted' && (
                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                          )}
                          
                          {category.isRequired && consentDecisions[category.id] === 'denied' && (
                            <AlertCircle className="w-5 h-5 text-red-600" />
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {index < (categories?.length || 0) - 1 && <Separator className="mt-6" />}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-center space-x-4">
          <Button
            onClick={handleSubmit}
            disabled={submitMutation.isPending || calculateProgress() < 100}
            className="px-8 py-3"
            data-testid="button-submit-consent"
          >
            {submitMutation.isPending ? "Saving..." : "Continue to Profile Setup"}
          </Button>
        </div>

        {/* Footer Information */}
        <div className="mt-8 text-center text-sm text-gray-600">
          <p>
            You can update these preferences anytime in your account settings.
            All decisions are logged for compliance and audit purposes.
          </p>
        </div>
      </div>
    </div>
  );
}