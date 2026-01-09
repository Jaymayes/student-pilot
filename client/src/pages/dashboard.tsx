import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Navigation } from "@/components/Navigation";
import { ScholarshipCard } from "@/components/ScholarshipCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ErrorState";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { 
  FileText, 
  Search, 
  Clock, 
  Trophy, 
  User as UserIcon, 
  PenTool, 
  Folder,
  TriangleAlert,
  Info,
  Check,
  X,
  Sparkles
} from "lucide-react";
import { Link } from "wouter";
import { useTtvTracking } from "@/hooks/useTtvTracking";
import { LegalFooter } from "@/pages/legal";
import { getAbandonedCheckout, dismissAbandonedCheckout, markCheckoutCompleted } from "@/pages/Billing";
import { TrialNudge } from "@/components/TrialNudge";
import { ActivationWizard, useActivationWizard } from "@/components/ActivationWizard";

interface DashboardStats {
  activeApplications: number;
  newMatches: number;
  upcomingDeadlines: number;
  totalApplied: number;
}

interface DashboardScholarshipMatch {
  id: string;
  studentId: string;
  scholarshipId: string;
  matchScore: number | null;
  matchReason: string[] | null;
  chanceLevel: string | null;
  isBookmarked: boolean | null;
  isDismissed: boolean | null;
  createdAt: string;
  scholarship: {
    id: string;
    title: string;
    organization: string;
    amount: number;
    description: string;
    deadline: string;
    estimatedApplicants: number;
  };
}

interface Application {
  id: string;
  studentId: string;
  scholarshipId: string;
  status: string;
  progressPercentage: number;
  createdAt: string;
  updatedAt: string;
}

interface StudentProfile {
  id: string;
  userId: string;
  gpa: string;
  major: string;
  academicLevel: string;
  graduationYear: number;
  school: string;
  location: string;
  demographics: any;
  interests: string[];
  extracurriculars: string[];
  achievements: string[];
  financialNeed: boolean;
  completionPercentage: number;
}

export default function Dashboard() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { trackFirstMatchViewed } = useTtvTracking();
  
  // Activation wizard for first AI usage (Phase 5 TTFV)
  const { showWizard, closeWizard } = useActivationWizard();
  
  // Checkout abandonment recovery state
  const [abandonedCheckout, setAbandonedCheckout] = useState<{ packageCode: string; startedAt: string } | null>(null);
  const [showUpgradeNudge, setShowUpgradeNudge] = useState(false);
  
  // Check for abandoned checkout on mount
  useEffect(() => {
    const abandoned = getAbandonedCheckout();
    if (abandoned) {
      setAbandonedCheckout(abandoned);
      setShowUpgradeNudge(true);
    }
    
    // Clear abandoned checkout if returning from successful purchase
    const params = new URLSearchParams(window.location.search);
    if (params.get('checkout') === 'success') {
      markCheckoutCompleted();
      setShowUpgradeNudge(false);
      setAbandonedCheckout(null);
    }
  }, []);
  
  const handleDismissNudge = () => {
    dismissAbandonedCheckout();
    setShowUpgradeNudge(false);
    setAbandonedCheckout(null);
  };

  // AI-powered scholarship matching
  const generateMatchesMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/matches/generate");
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "AI Analysis Complete",
        description: data.message,
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to generate AI-powered matches",
        variant: "destructive",
      });
    },
  });

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, authLoading, toast]);

  // Fetch dashboard data
  const { data: stats, isLoading: statsLoading, error: statsError, refetch: refetchStats } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
    retry: false,
  });

  const { data: matches, isLoading: matchesLoading, error: matchesError, refetch: refetchMatches } = useQuery<DashboardScholarshipMatch[]>({
    queryKey: ["/api/matches"],
    retry: false,
  });

  const { data: applications, isLoading: applicationsLoading, error: applicationsError, refetch: refetchApplications } = useQuery<any[]>({
    queryKey: ["/api/applications"],
    retry: false,
  });

  const { data: profile, isLoading: profileLoading } = useQuery<StudentProfile>({
    queryKey: ["/api/profile"],
    retry: false,
  });

  const { data: documents } = useQuery<any[]>({
    queryKey: ["/api/documents"],
    retry: false,
  });

  // Bookmark mutation
  const bookmarkMutation = useMutation({
    mutationFn: async ({ id, bookmarked }: { id: string; bookmarked: boolean }) => {
      await apiRequest("POST", `/api/matches/${id}/bookmark`, { bookmarked });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to update bookmark",
        variant: "destructive",
      });
    },
  });

  // Dismiss mutation
  const dismissMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("POST", `/api/matches/${id}/dismiss`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to dismiss scholarship",
        variant: "destructive",
      });
    },
  });

  const handleBookmark = (id: string, bookmarked: boolean) => {
    bookmarkMutation.mutate({ id, bookmarked });
  };

  const handleDismiss = (id: string) => {
    dismissMutation.mutate(id);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background-gray">
        <div className="flex items-center justify-center h-screen">
          <div className="space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
      </div>
    );
  }

  const upcomingDeadlines = (Array.isArray(matches) ? matches : []).filter(match => {
    const deadline = new Date(match.scholarship.deadline);
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    return deadline <= thirtyDaysFromNow && deadline >= new Date();
  }).slice(0, 3);

  const activeApplications = applications?.filter(app => 
    ['draft', 'in_progress'].includes(app.status)
  ).slice(0, 2) || [];

  const profileCompletion = profile?.completionPercentage || 0;
  
  const hasAcademicInfo = !!(profile?.gpa && profile?.major && profile?.academicLevel && profile?.school);
  const hasDemographics = !!(profile?.location && profile?.graduationYear);
  const hasInterests = (profile?.interests?.length || 0) > 0;
  const hasDocuments = (documents?.length || 0) > 0;

  return (
    <div className="min-h-screen bg-background-gray">
      <Navigation />
      
      {/* Activation Wizard for first AI usage (Phase 5 TTFV) */}
      {showWizard && <ActivationWizard onClose={closeWizard} />}
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-20 md:pb-6">
        {/* Checkout Abandonment Nudge Banner */}
        {showUpgradeNudge && abandonedCheckout && (
          <div 
            className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg p-4 mb-6 shadow-lg"
            data-testid="banner-upgrade-nudge"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Sparkles className="h-6 w-6 text-yellow-300" />
                <div>
                  <p className="font-semibold">Complete your upgrade to unlock unlimited AI</p>
                  <p className="text-sm text-purple-100">You started a checkout but didn't finish. Get credits to power your scholarship search!</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link href="/billing">
                  <Button 
                    variant="secondary" 
                    size="sm"
                    className="bg-white text-purple-700 hover:bg-purple-50"
                    data-testid="button-complete-upgrade"
                  >
                    Complete Upgrade
                  </Button>
                </Link>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleDismissNudge}
                  className="text-white hover:bg-purple-500"
                  data-testid="button-dismiss-nudge"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
        
        {/* Trial-to-Paid Nudge (low/zero credits) */}
        <TrialNudge />
        
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2" data-testid="text-welcome">
            Welcome back, {user?.firstName || 'Student'}!
          </h1>
          <p className="text-gray-600">Here's your scholarship journey overview for today.</p>
        </div>


        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Applications</p>
                  {statsLoading ? (
                    <Skeleton className="h-8 w-8" />
                  ) : (
                    <p className="text-3xl font-bold text-primary" data-testid="stat-active-applications">
                      {stats?.activeApplications || 0}
                    </p>
                  )}
                </div>
                <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                  <FileText className="text-primary text-xl" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">New Matches</p>
                  {statsLoading ? (
                    <Skeleton className="h-8 w-8" />
                  ) : (
                    <p className="text-3xl font-bold text-secondary" data-testid="stat-new-matches">
                      {stats?.newMatches || 0}
                    </p>
                  )}
                </div>
                <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
                  <Search className="text-secondary text-xl" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Upcoming Deadlines</p>
                  {statsLoading ? (
                    <Skeleton className="h-8 w-8" />
                  ) : (
                    <p className="text-3xl font-bold text-accent" data-testid="stat-upcoming-deadlines">
                      {stats?.upcomingDeadlines || 0}
                    </p>
                  )}
                </div>
                <div className="w-12 h-12 bg-orange-50 rounded-lg flex items-center justify-center">
                  <Clock className="text-accent text-xl" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Applied</p>
                  {statsLoading ? (
                    <Skeleton className="h-8 w-8" />
                  ) : (
                    <p className="text-3xl font-bold text-gray-700" data-testid="stat-total-applied">
                      {stats?.totalApplied || 0}
                    </p>
                  )}
                </div>
                <div className="w-12 h-12 bg-gray-50 rounded-lg flex items-center justify-center">
                  <Trophy className="text-gray-600 text-xl" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Scholarship Matches */}
            <Card className="border border-gray-200">
              <CardHeader className="border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>AI-Powered Scholarship Matches</CardTitle>
                    <p className="text-gray-600 text-sm">Intelligent matches based on your profile</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button 
                      onClick={() => generateMatchesMutation.mutate()}
                      disabled={generateMatchesMutation.isPending}
                      size="sm"
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                      data-testid="button-generate-matches"
                    >
                      {generateMatchesMutation.isPending ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Search className="h-4 w-4 mr-2" />
                          AI Match
                        </>
                      )}
                    </Button>
                    <Link href="/scholarships">
                      <Button variant="ghost" size="sm" data-testid="button-view-all-matches">
                        View All
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {matchesError ? (
                  <ErrorState
                    type="server"
                    title="Unable to Load Matches"
                    message="We couldn't load your scholarship matches. This might be a temporary issue."
                    onRetry={() => refetchMatches()}
                    variant="inline"
                  />
                ) : matchesLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="p-4 border border-gray-200 rounded-lg">
                        <Skeleton className="h-6 w-3/4 mb-2" />
                        <Skeleton className="h-4 w-1/2 mb-3" />
                        <Skeleton className="h-3 w-full" />
                      </div>
                    ))}
                  </div>
                ) : Array.isArray(matches) && matches.length > 0 ? (
                  <div className="space-y-4">
                    {matches.slice(0, 3).map((match) => (
                      <ScholarshipCard 
                        key={match.id}
                        match={match}
                        onBookmark={handleBookmark}
                        onDismiss={handleDismiss}
                        onView={(matchId, scholarshipId, matchScore) => 
                          trackFirstMatchViewed(matchId, matchScore)
                        }
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Search className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                    <p>No scholarship matches yet. Complete your profile to get started!</p>
                    <Link href="/profile">
                      <Button className="mt-4" data-testid="button-complete-profile">
                        Complete Profile
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Application Progress */}
            <Card className="border border-gray-200">
              <CardHeader className="border-b border-gray-200">
                <CardTitle>Application Progress</CardTitle>
                <p className="text-gray-600 text-sm">Track your ongoing applications</p>
              </CardHeader>
              <CardContent className="p-6">
                {applicationsLoading ? (
                  <div className="space-y-4">
                    {[1, 2].map(i => (
                      <div key={i} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                        <div className="flex items-center space-x-4">
                          <Skeleton className="w-10 h-10 rounded-lg" />
                          <div>
                            <Skeleton className="h-4 w-32 mb-1" />
                            <Skeleton className="h-3 w-24" />
                          </div>
                        </div>
                        <Skeleton className="h-4 w-20" />
                      </div>
                    ))}
                  </div>
                ) : activeApplications.length > 0 ? (
                  <div className="space-y-4">
                    {activeApplications.map((app) => (
                      <div key={app.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                            <FileText className="text-primary" />
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900" data-testid="text-application-title">
                              Application #{app.id.slice(0, 8)}
                            </h4>
                            <p className="text-sm text-gray-500">
                              Status: {app.status?.replace('_', ' ')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-2">
                            <div className="w-32 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-primary h-2 rounded-full transition-all"
                                style={{ width: `${app.progressPercentage || 0}%` }}
                              />
                            </div>
                            <span className="text-sm text-gray-600">
                              {app.progressPercentage || 0}%
                            </span>
                          </div>
                          <Link href="/applications">
                            <Button variant="ghost" size="sm" data-testid="button-continue-application">
                              Continue
                            </Button>
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                    <p>No active applications yet. Start applying to scholarships!</p>
                    <Link href="/scholarships">
                      <Button className="mt-4" data-testid="button-find-scholarships">
                        Find Scholarships
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* Quick Actions */}
            <Card className="border border-gray-200">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link href="/profile">
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start p-3 h-auto"
                    data-testid="button-update-profile"
                  >
                    <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center mr-3">
                      <UserIcon className="text-primary" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-gray-900">Update Profile</p>
                      <p className="text-sm text-gray-500">Keep your info current</p>
                    </div>
                  </Button>
                </Link>

                <Link href="/essay-assistant">
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start p-3 h-auto"
                    data-testid="button-essay-assistant"
                  >
                    <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center mr-3">
                      <PenTool className="text-purple-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-gray-900">Essay Assistant</p>
                      <p className="text-sm text-gray-500">Get writing help</p>
                    </div>
                  </Button>
                </Link>

                <Link href="/documents">
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start p-3 h-auto"
                    data-testid="button-document-vault"
                  >
                    <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center mr-3">
                      <Folder className="text-secondary" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-gray-900">Document Vault</p>
                      <p className="text-sm text-gray-500">Manage your files</p>
                    </div>
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Upcoming Deadlines */}
            <Card className="border border-gray-200">
              <CardHeader>
                <CardTitle>Upcoming Deadlines</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {upcomingDeadlines.length > 0 ? (
                  upcomingDeadlines.map((match) => {
                    const daysUntil = Math.ceil(
                      (new Date(match.scholarship.deadline).getTime() - new Date().getTime()) / 
                      (1000 * 60 * 60 * 24)
                    );
                    const urgency = daysUntil <= 7 ? 'urgent' : daysUntil <= 14 ? 'upcoming' : 'normal';
                    
                    return (
                      <div 
                        key={match.id}
                        className={`flex items-center space-x-3 p-3 rounded-lg border ${
                          urgency === 'urgent' ? 'deadline-urgent' : 
                          urgency === 'upcoming' ? 'deadline-upcoming' : 'deadline-normal'
                        }`}
                      >
                        <div className="flex-shrink-0">
                          {urgency === 'urgent' ? (
                            <TriangleAlert className="text-red-600 w-4 h-4" />
                          ) : urgency === 'upcoming' ? (
                            <Clock className="text-yellow-600 w-4 h-4" />
                          ) : (
                            <Info className="text-blue-600 w-4 h-4" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {match.scholarship.title}
                          </p>
                          <p className={`text-xs ${
                            urgency === 'urgent' ? 'text-red-600' : 
                            urgency === 'upcoming' ? 'text-yellow-600' : 'text-blue-600'
                          }`}>
                            Due in {daysUntil} days
                          </p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No upcoming deadlines
                  </p>
                )}
                <Link href="/scholarships">
                  <Button variant="ghost" size="sm" className="w-full mt-4" data-testid="button-view-deadlines">
                    View All Deadlines
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Profile Completion */}
            <Card className="border border-gray-200">
              <CardHeader>
                <CardTitle>Profile Completion</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900">Overall Progress</span>
                  {profileLoading ? (
                    <Skeleton className="h-4 w-8" />
                  ) : (
                    <span className="text-sm text-primary font-medium" data-testid="text-completion-percentage">
                      {profileCompletion}%
                    </span>
                  )}
                </div>
                <Progress value={profileCompletion} className="w-full" />
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Academic Info</span>
                    {hasAcademicInfo ? (
                      <Check className="text-secondary w-4 h-4" />
                    ) : (
                      <span className="text-red-600">Missing</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Demographics</span>
                    {hasDemographics ? (
                      <Check className="text-secondary w-4 h-4" />
                    ) : (
                      <span className="text-red-600">Missing</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Interests</span>
                    {hasInterests ? (
                      <Check className="text-secondary w-4 h-4" />
                    ) : (
                      <span className="text-yellow-600">Add some</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Documents</span>
                    {hasDocuments ? (
                      <Check className="text-secondary w-4 h-4" />
                    ) : (
                      <span className="text-yellow-600">Upload</span>
                    )}
                  </div>
                </div>
                <Link href="/profile">
                  <Button className="w-full bg-primary hover:bg-blue-700" data-testid="button-complete-profile-card">
                    Complete Profile
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      
      {/* Footer with Legal Links */}
      <LegalFooter />
    </div>
  );
}
