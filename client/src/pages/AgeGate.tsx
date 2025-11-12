import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Shield, Calendar, AlertCircle, Info } from "lucide-react";

interface AgeVerificationStatus {
  ageVerified: boolean;
  hasBirthdate: boolean;
  isBlocked: boolean;
}

export default function AgeGate() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [birthdate, setBirthdate] = useState("");
  const [isBlocked, setIsBlocked] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please log in to continue.",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 1000);
    }
  }, [isAuthenticated, authLoading, toast]);

  // Fetch age verification status
  const { data: status, isLoading } = useQuery<AgeVerificationStatus>({
    queryKey: ["/api/age-verification"],
    retry: false,
    enabled: isAuthenticated,
  });

  // Hydrate blocked state from API
  useEffect(() => {
    if (status?.isBlocked) {
      setIsBlocked(true);
    }
  }, [status]);

  // Redirect if already verified
  useEffect(() => {
    if (status?.ageVerified) {
      setLocation("/onboarding");
    }
  }, [status, setLocation]);

  // Submit birthdate mutation
  const submitMutation = useMutation({
    mutationFn: async (data: { birthdate: string }) => {
      return await apiRequest("POST", "/api/age-verification", data);
    },
    onSuccess: () => {
      toast({
        title: "Age Verified",
        description: "Thank you! Continuing to account setup...",
      });
      // Redirect to onboarding
      setTimeout(() => {
        setLocation("/onboarding");
      }, 1000);
    },
    onError: (error: any) => {
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

      // Handle COPPA block (under 13)
      if (error?.response?.data?.error === "age_restriction") {
        setIsBlocked(true);
        toast({
          title: "Age Requirement",
          description: "You must be 13 or older to use ScholarLink.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to verify age. Please try again.",
          variant: "destructive",
        });
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!birthdate) {
      toast({
        title: "Birthdate Required",
        description: "Please enter your date of birth to continue.",
        variant: "destructive",
      });
      return;
    }

    // Validate birthdate is not in the future
    const selectedDate = new Date(birthdate);
    const today = new Date();
    
    if (selectedDate > today) {
      toast({
        title: "Invalid Date",
        description: "Birthdate cannot be in the future.",
        variant: "destructive",
      });
      return;
    }

    submitMutation.mutate({ birthdate });
  };

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12">
      <div className="container max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Shield className="w-16 h-16 text-blue-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4" data-testid="heading-age-gate">
            Age Verification
          </h1>
          <p className="text-xl text-gray-600">
            We need to verify your age to comply with federal regulations
          </p>
        </div>

        {/* COPPA Information */}
        <Alert className="mb-8 border-blue-200 bg-blue-50">
          <Info className="h-5 w-5 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>Why we ask:</strong> The Children's Online Privacy Protection Act (COPPA) requires
            us to verify that users are 13 years or older before collecting personal information.
            Your privacy and safety are our top priority.
          </AlertDescription>
        </Alert>

        {!isBlocked ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Enter Your Date of Birth
              </CardTitle>
              <CardDescription>
                This information is kept private and secure. We use it only for age verification.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="birthdate">Date of Birth</Label>
                  <Input
                    id="birthdate"
                    type="date"
                    value={birthdate}
                    onChange={(e) => setBirthdate(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    required
                    data-testid="input-birthdate"
                    className="text-lg"
                  />
                  <p className="text-sm text-gray-500">
                    You must be 13 years or older to use ScholarLink
                  </p>
                </div>

                <div className="flex gap-4">
                  <Button
                    type="submit"
                    disabled={submitMutation.isPending || !birthdate}
                    className="flex-1"
                    data-testid="button-submit-age"
                  >
                    {submitMutation.isPending ? "Verifying..." : "Continue"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleLogout}
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-700">
                <AlertCircle className="w-5 h-5" />
                Age Requirement Not Met
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="border-red-200 bg-red-50">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <AlertDescription className="text-red-800">
                  <strong>COPPA Compliance:</strong> You must be 13 years or older to use ScholarLink.
                  This requirement is mandated by the Children's Online Privacy Protection Act (COPPA),
                  a federal law designed to protect children's privacy online.
                </AlertDescription>
              </Alert>

              <div className="text-gray-700 space-y-3">
                <p>
                  We understand this may be disappointing, but we're required by law to enforce this
                  age restriction. 
                </p>
                <p>
                  If you believe this is an error, please contact us at support@scholarlink.com for assistance.
                </p>
              </div>

              <Button
                onClick={handleLogout}
                variant="destructive"
                className="w-full"
                data-testid="button-logout-blocked"
              >
                Log Out
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-600">
          <p>
            Your privacy is protected. We use industry-standard encryption and follow
            strict federal guidelines for data protection.
          </p>
        </div>
      </div>
    </div>
  );
}
