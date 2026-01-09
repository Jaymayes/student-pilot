import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Sparkles, 
  PenTool, 
  Target, 
  ArrowRight, 
  CheckCircle2, 
  Coins,
  Lightbulb,
  FileText,
  X
} from "lucide-react";

interface ActivationStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  action: string;
  route?: string;
  completed: boolean;
}

interface ActivationStatus {
  hasUsedAI: boolean;
  hasCredits: boolean;
  creditsBalance: number;
  firstAiUseAt: string | null;
  ttfvMinutes: number | null;
}

interface ActivationWizardProps {
  onClose: () => void;
  forceShow?: boolean;
}

export function ActivationWizard({ onClose, forceShow = false }: ActivationWizardProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const [startTime] = useState(Date.now());

  const { data: status, isLoading } = useQuery<ActivationStatus>({
    queryKey: ["/api/activation/status"],
    retry: false,
  });

  const trackMutation = useMutation({
    mutationFn: async (event: { action: string; step: number; metadata?: any }) => {
      return await apiRequest("POST", "/api/activation/track", event);
    },
  });

  const dismissMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/activation/dismiss");
    },
    onSuccess: () => {
      setDismissed(true);
      onClose();
    },
  });

  useEffect(() => {
    if (status && !status.hasUsedAI && !dismissed) {
      trackMutation.mutate({ action: "wizard_opened", step: 0 });
    }
  }, [status, dismissed]);

  const shouldShow = forceShow || (status && !status.hasUsedAI && !dismissed);

  const steps: ActivationStep[] = [
    {
      id: "welcome",
      title: "Welcome to ScholarLink AI",
      description: "Let's get you started with AI-powered scholarship assistance in under 5 minutes!",
      icon: <Sparkles className="w-8 h-8 text-purple-500" />,
      action: "Continue",
      completed: false,
    },
    {
      id: "credits",
      title: "Your AI Credits",
      description: `You have ${status?.creditsBalance || 0} credits available. Each AI action uses credits to power personalized assistance.`,
      icon: <Coins className="w-8 h-8 text-yellow-500" />,
      action: status?.hasCredits ? "Got it!" : "Get Credits",
      route: status?.hasCredits ? undefined : "/billing",
      completed: status?.hasCredits || false,
    },
    {
      id: "essay",
      title: "Try Essay Assistant",
      description: "Get AI feedback on your scholarship essays. Our AI helps strengthen your writing while keeping your authentic voice.",
      icon: <PenTool className="w-8 h-8 text-blue-500" />,
      action: "Open Essay Assistant",
      route: "/essay-assistant",
      completed: false,
    },
    {
      id: "matching",
      title: "AI Scholarship Matching",
      description: "Let AI analyze your profile and find scholarships you're most likely to win.",
      icon: <Target className="w-8 h-8 text-green-500" />,
      action: "Find My Matches",
      route: "/scholarships",
      completed: false,
    },
  ];

  const handleNext = () => {
    const step = steps[currentStep];
    trackMutation.mutate({ 
      action: "step_completed", 
      step: currentStep,
      metadata: { stepId: step.id }
    });

    if (step.route) {
      const elapsedMinutes = Math.round((Date.now() - startTime) / 60000);
      trackMutation.mutate({
        action: "wizard_action",
        step: currentStep,
        metadata: { 
          route: step.route,
          elapsedMinutes,
          stepId: step.id
        }
      });
      onClose();
      setLocation(step.route);
    } else if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
    }
  };

  const handleDismiss = () => {
    trackMutation.mutate({ 
      action: "wizard_dismissed", 
      step: currentStep,
      metadata: { 
        elapsedMinutes: Math.round((Date.now() - startTime) / 60000)
      }
    });
    dismissMutation.mutate();
  };

  const handleSkip = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleDismiss();
    }
  };

  if (isLoading || !shouldShow) {
    return null;
  }

  const progressPercent = ((currentStep + 1) / steps.length) * 100;
  const currentStepData = steps[currentStep];

  return (
    <Dialog open={shouldShow} onOpenChange={() => handleDismiss()}>
      <DialogContent 
        className="sm:max-w-lg"
        data-testid="dialog-activation-wizard"
      >
        <DialogHeader>
          <div className="flex items-center justify-between">
            <Badge variant="secondary" className="mb-2">
              Step {currentStep + 1} of {steps.length}
            </Badge>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleDismiss}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <Progress value={progressPercent} className="h-2 mb-4" />
          <DialogTitle className="flex items-center gap-3 text-xl">
            {currentStepData.icon}
            {currentStepData.title}
          </DialogTitle>
          <DialogDescription className="text-base pt-2">
            {currentStepData.description}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {currentStep === 0 && (
            <Card className="border-purple-200 bg-purple-50">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Lightbulb className="w-5 h-5 text-purple-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-purple-900">
                      Our Goal: Your Success
                    </p>
                    <p className="text-sm text-purple-700 mt-1">
                      Students who use AI assistance complete 3x more applications 
                      and win 40% more scholarships.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {currentStep === 1 && (
            <Card className="border-yellow-200 bg-yellow-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-yellow-200 flex items-center justify-center">
                      <Coins className="w-6 h-6 text-yellow-700" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-yellow-900">
                        {status?.creditsBalance || 0}
                      </p>
                      <p className="text-sm text-yellow-700">Credits Available</p>
                    </div>
                  </div>
                  {status?.hasCredits && (
                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {currentStep === 2 && (
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 mt-0.5" />
                    <p className="text-sm text-blue-800">Grammar and clarity suggestions</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 mt-0.5" />
                    <p className="text-sm text-blue-800">Strengthen your personal story</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 mt-0.5" />
                    <p className="text-sm text-blue-800">Tailored for scholarship prompts</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <FileText className="w-4 h-4 text-blue-600 mt-0.5" />
                    <p className="text-sm text-blue-800 font-medium">Uses ~1 credit per essay review</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {currentStep === 3 && (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <Target className="w-4 h-4 text-green-600 mt-0.5" />
                    <p className="text-sm text-green-800">Analyzes 1000s of scholarships</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" />
                    <p className="text-sm text-green-800">Matches based on your profile</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" />
                    <p className="text-sm text-green-800">Shows your chance of winning</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="flex items-center justify-between pt-4">
          <Button 
            variant="ghost" 
            onClick={handleSkip}
            className="text-gray-500"
          >
            {currentStep < steps.length - 1 ? "Skip" : "Maybe Later"}
          </Button>
          
          <Button 
            onClick={handleNext}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            data-testid="button-activation-next"
          >
            {currentStepData.action}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function useActivationWizard() {
  const [showWizard, setShowWizard] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);

  const { data: status } = useQuery<ActivationStatus>({
    queryKey: ["/api/activation/status"],
    retry: false,
    enabled: !hasChecked,
  });

  useEffect(() => {
    if (status && !hasChecked) {
      setHasChecked(true);
      const wizardDismissed = localStorage.getItem("activation_wizard_dismissed");
      if (!status.hasUsedAI && !wizardDismissed) {
        setShowWizard(true);
      }
    }
  }, [status, hasChecked]);

  const closeWizard = () => {
    setShowWizard(false);
    localStorage.setItem("activation_wizard_dismissed", Date.now().toString());
  };

  return {
    showWizard,
    closeWizard,
    status,
  };
}
