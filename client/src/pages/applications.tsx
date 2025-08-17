import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { 
  FileText, 
  Clock, 
  Check, 
  AlertTriangle, 
  Plus,
  Calendar,
  DollarSign,
  ExternalLink
} from "lucide-react";

interface Application {
  id: string;
  studentId: string;
  scholarshipId: string;
  status: string;
  progressPercentage: number;
  submittedAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Scholarship {
  id: string;
  title: string;
  organization: string;
  amount: number;
  description: string;
  deadline: string;
  applicationUrl: string;
}

interface ApplicationWithScholarship extends Application {
  scholarship: Scholarship;
}

export default function Applications() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [statusFilter, setStatusFilter] = useState("all");

  // Redirect if not authenticated
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

  // Fetch applications
  const { data: applications, isLoading } = useQuery<Application[]>({
    queryKey: ["/api/applications"],
    retry: false,
  });

  // Fetch scholarships to enrich application data
  const { data: scholarships } = useQuery<Scholarship[]>({
    queryKey: ["/api/scholarships"],
    retry: false,
  });

  // Create application mutation
  const createApplicationMutation = useMutation({
    mutationFn: async (scholarshipId: string) => {
      return await apiRequest("POST", "/api/applications", { scholarshipId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/applications"] });
      toast({
        title: "Success",
        description: "Application started successfully!",
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
        description: "Failed to start application",
        variant: "destructive",
      });
    },
  });

  // Update application mutation
  const updateApplicationMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Application> }) => {
      return await apiRequest("PUT", `/api/applications/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/applications"] });
      toast({
        title: "Success",
        description: "Application updated successfully!",
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
        description: "Failed to update application",
        variant: "destructive",
      });
    },
  });

  // Enrich applications with scholarship data
  const enrichedApplications: ApplicationWithScholarship[] = applications?.map(app => {
    const scholarship = scholarships?.find(s => s.id === app.scholarshipId);
    return {
      ...app,
      scholarship: scholarship || {
        id: app.scholarshipId,
        title: "Unknown Scholarship",
        organization: "Unknown Organization",
        amount: 0,
        description: "",
        deadline: new Date().toISOString(),
        applicationUrl: "",
      }
    };
  }) || [];

  // Filter applications
  const filteredApplications = enrichedApplications.filter(app => {
    if (statusFilter === "all") return true;
    return app.status === statusFilter;
  });

  // Sort applications by updated date (most recent first)
  const sortedApplications = filteredApplications.sort((a, b) => 
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="secondary">Draft</Badge>;
      case 'in_progress':
        return <Badge className="bg-blue-100 text-blue-800">In Progress</Badge>;
      case 'submitted':
        return <Badge className="bg-green-100 text-green-800">Submitted</Badge>;
      case 'under_review':
        return <Badge className="bg-yellow-100 text-yellow-800">Under Review</Badge>;
      case 'accepted':
        return <Badge className="bg-green-500 text-white">Accepted</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft':
        return <FileText className="w-5 h-5 text-gray-500" />;
      case 'in_progress':
        return <Clock className="w-5 h-5 text-blue-500" />;
      case 'submitted':
        return <Check className="w-5 h-5 text-green-500" />;
      case 'under_review':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'accepted':
        return <Check className="w-5 h-5 text-green-500" />;
      case 'rejected':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      default:
        return <FileText className="w-5 h-5 text-gray-500" />;
    }
  };

  const getDaysUntilDeadline = (deadline: string) => {
    const deadlineDate = new Date(deadline);
    const now = new Date();
    const diffTime = deadlineDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const handleUpdateProgress = (applicationId: string, progressPercentage: number) => {
    updateApplicationMutation.mutate({ 
      id: applicationId, 
      data: { progressPercentage }
    });
  };

  const handleStatusChange = (applicationId: string, status: string) => {
    const data: Partial<Application> = { status };
    if (status === 'submitted') {
      data.submittedAt = new Date().toISOString();
      data.progressPercentage = 100;
    }
    updateApplicationMutation.mutate({ id: applicationId, data });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background-gray">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const statusCounts = {
    all: enrichedApplications.length,
    draft: enrichedApplications.filter(app => app.status === 'draft').length,
    in_progress: enrichedApplications.filter(app => app.status === 'in_progress').length,
    submitted: enrichedApplications.filter(app => app.status === 'submitted').length,
    accepted: enrichedApplications.filter(app => app.status === 'accepted').length,
  };

  return (
    <div className="min-h-screen bg-background-gray">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-20 md:pb-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2" data-testid="text-applications-title">
            My Applications
          </h1>
          <p className="text-gray-600">
            Track and manage your scholarship applications.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <Card className="border border-gray-200">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-gray-900" data-testid="stat-total-applications">
                {statusCounts.all}
              </div>
              <div className="text-sm text-gray-600">Total</div>
            </CardContent>
          </Card>
          <Card className="border border-gray-200">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600" data-testid="stat-in-progress">
                {statusCounts.in_progress}
              </div>
              <div className="text-sm text-gray-600">In Progress</div>
            </CardContent>
          </Card>
          <Card className="border border-gray-200">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600" data-testid="stat-submitted">
                {statusCounts.submitted}
              </div>
              <div className="text-sm text-gray-600">Submitted</div>
            </CardContent>
          </Card>
          <Card className="border border-gray-200">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-700" data-testid="stat-accepted">
                {statusCounts.accepted}
              </div>
              <div className="text-sm text-gray-600">Accepted</div>
            </CardContent>
          </Card>
          <Card className="border border-gray-200">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-gray-500" data-testid="stat-draft">
                {statusCounts.draft}
              </div>
              <div className="text-sm text-gray-600">Draft</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Filter Sidebar */}
          <div className="lg:col-span-1">
            <Card className="border border-gray-200 sticky top-20">
              <CardHeader>
                <CardTitle>Filter Applications</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger data-testid="select-status-filter">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="submitted">Submitted</SelectItem>
                      <SelectItem value="under_review">Under Review</SelectItem>
                      <SelectItem value="accepted">Accepted</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Applications List */}
          <div className="lg:col-span-3">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900" data-testid="text-applications-count">
                {sortedApplications.length} Applications
              </h2>
            </div>

            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <Card key={i} className="p-6">
                    <div className="animate-pulse">
                      <div className="flex justify-between items-start">
                        <div className="space-y-2 flex-1">
                          <Skeleton className="h-6 w-3/4" />
                          <Skeleton className="h-4 w-1/2" />
                          <Skeleton className="h-3 w-full" />
                          <Skeleton className="h-2 w-full mt-4" />
                        </div>
                        <Skeleton className="h-6 w-20" />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : sortedApplications.length > 0 ? (
              <div className="space-y-4">
                {sortedApplications.map((application) => {
                  const daysUntilDeadline = getDaysUntilDeadline(application.scholarship.deadline);
                  const isUrgent = daysUntilDeadline <= 7 && daysUntilDeadline > 0;
                  const isOverdue = daysUntilDeadline < 0;

                  return (
                    <Card key={application.id} className="border border-gray-200 hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-start space-x-4 flex-1">
                            <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                              {getStatusIcon(application.status)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2 mb-2">
                                <h3 className="font-semibold text-gray-900 truncate" data-testid="text-scholarship-title">
                                  {application.scholarship.title}
                                </h3>
                                {application.scholarship.applicationUrl && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => window.open(application.scholarship.applicationUrl, '_blank')}
                                    data-testid="button-external-link"
                                  >
                                    <ExternalLink className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                              <p className="text-sm text-gray-600 mb-2" data-testid="text-organization">
                                {application.scholarship.organization} • ${application.scholarship.amount.toLocaleString()}
                              </p>
                              <div className="flex items-center space-x-4 text-xs text-gray-500 mb-3">
                                <span className="flex items-center" data-testid="text-deadline">
                                  <Calendar className="w-3 h-3 mr-1" />
                                  Due: {new Date(application.scholarship.deadline).toLocaleDateString()}
                                  {isOverdue && (
                                    <span className="ml-1 text-red-600 font-medium">(Overdue)</span>
                                  )}
                                  {isUrgent && (
                                    <span className="ml-1 text-red-600 font-medium">({daysUntilDeadline} days left)</span>
                                  )}
                                </span>
                                <span>
                                  Updated: {new Date(application.updatedAt).toLocaleDateString()}
                                </span>
                              </div>
                              
                              {/* Progress Bar */}
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium text-gray-700">Progress</span>
                                  <span className="text-sm text-gray-600">{application.progressPercentage}%</span>
                                </div>
                                <Progress 
                                  value={application.progressPercentage} 
                                  className="w-full h-2"
                                  data-testid="progress-application"
                                />
                              </div>

                              {application.notes && (
                                <div className="mt-3 p-2 bg-gray-50 rounded text-sm text-gray-700">
                                  <strong>Notes:</strong> {application.notes}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col items-end space-y-2 ml-4">
                            {getStatusBadge(application.status)}
                            {application.submittedAt && (
                              <span className="text-xs text-gray-500">
                                Submitted: {new Date(application.submittedAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center space-x-2 pt-4 border-t border-gray-200">
                          {application.status !== 'submitted' && application.status !== 'accepted' && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleUpdateProgress(application.id, Math.min(100, (application.progressPercentage || 0) + 25))}
                                disabled={updateApplicationMutation.isPending}
                                data-testid="button-update-progress"
                              >
                                Update Progress
                              </Button>
                              <Select
                                value={application.status}
                                onValueChange={(status) => handleStatusChange(application.id, status)}
                                disabled={updateApplicationMutation.isPending}
                              >
                                <SelectTrigger className="w-40" data-testid="select-change-status">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="draft">Draft</SelectItem>
                                  <SelectItem value="in_progress">In Progress</SelectItem>
                                  <SelectItem value="submitted">Submit</SelectItem>
                                </SelectContent>
                              </Select>
                            </>
                          )}
                          {application.status === 'submitted' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled
                              data-testid="text-application-submitted"
                            >
                              Application Submitted
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card className="p-12">
                <div className="text-center">
                  <FileText className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No applications yet
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Start applying to scholarships to track your progress here.
                  </p>
                  <Button
                    onClick={() => window.location.href = '/scholarships'}
                    className="bg-primary hover:bg-blue-700"
                    data-testid="button-find-scholarships"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Find Scholarships
                  </Button>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
