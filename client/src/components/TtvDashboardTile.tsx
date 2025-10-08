import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { 
  Clock, 
  Target, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  CheckCircle,
  AlertTriangle,
  XCircle
} from "lucide-react";

interface TtvDashboardData {
  medianTTV: number | null;
  p95TTV: number | null;
  medianTargetMet: boolean;
  p95TargetMet: boolean;
  targetMet: boolean;
  cohortDetails: Array<{
    id: string;
    name: string;
    userCount: number;
    avgTimeToFirstValue: number | null;
    conversionRates: {
      profileComplete: number;
      firstMatch: number;
      firstApplication: number;
      firstPurchase: number;
    };
  }>;
  totalUsers: number;
  performanceStatus: 'excellent' | 'warning' | 'needs-attention' | 'no-data' | 'insufficient-data';
  targets: {
    median: number;
    p95: number;
  };
}

export function TtvDashboardTile() {
  const { data: ttvData, isLoading, error } = useQuery<TtvDashboardData>({
    queryKey: ["/api/analytics/ttv-dashboard"],
    retry: false,
    refetchInterval: 60000, // Refresh every minute
  });

  if (isLoading) {
    return (
      <Card className="border border-gray-200">
        <CardHeader className="border-b border-gray-200">
          <CardTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5" />
            <span>Time-to-Value Performance</span>
          </CardTitle>
          <p className="text-gray-600 text-sm">TTV Analytics & Cohort Tracking</p>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            <Skeleton className="h-16 w-full" />
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !ttvData || !ttvData.targets) {
    return (
      <Card className="border border-red-200">
        <CardHeader className="border-b border-gray-200">
          <CardTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5" />
            <span>Time-to-Value Performance</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            <XCircle className="mx-auto h-8 w-8 mb-2" />
            <p>Failed to load TTV analytics</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getPerformanceIcon = () => {
    switch (ttvData.performanceStatus) {
      case 'excellent':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'needs-attention':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getPerformanceBadgeColor = () => {
    switch (ttvData.performanceStatus) {
      case 'excellent':
        return 'bg-green-100 text-green-800 hover:bg-green-100';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100';
      case 'needs-attention':
        return 'bg-red-100 text-red-800 hover:bg-red-100';
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-100';
    }
  };

  const formatTime = (minutes: number | null) => {
    if (minutes === null) return 'N/A';
    if (minutes < 1) return `${Math.round(minutes * 60)}s`;
    return `${minutes}min`;
  };

  const getStatusText = () => {
    switch (ttvData.performanceStatus) {
      case 'excellent':
        return 'Meeting all targets';
      case 'warning':
        return 'Close to targets';
      case 'needs-attention':
        return 'Targets not met';
      case 'no-data':
        return 'No active cohorts';
      case 'insufficient-data':
        return 'Insufficient data';
      default:
        return 'Unknown status';
    }
  };

  return (
    <Card className="border border-gray-200" data-testid="card-ttv-dashboard">
      <CardHeader className="border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="h-5 w-5" />
              <span>Time-to-Value Performance</span>
            </CardTitle>
            <p className="text-gray-600 text-sm">Student TTV Analytics & Cohort Tracking</p>
          </div>
          <div className="flex items-center space-x-2">
            {getPerformanceIcon()}
            <Badge className={getPerformanceBadgeColor()} data-testid="badge-ttv-status">
              {getStatusText()}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-6">
        <div className="space-y-6">
          {/* Main TTV Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Median TTV */}
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <Target className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">Median TTV</span>
                </div>
                {ttvData.medianTargetMet ? (
                  <TrendingUp className="h-4 w-4 text-green-600" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-600" />
                )}
              </div>
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl font-bold text-blue-900" data-testid="text-median-ttv">
                  {formatTime(ttvData.medianTTV)}
                </span>
                <span className="text-sm text-blue-600">
                  Target: ≤{ttvData.targets?.median || 0}min
                </span>
              </div>
              {ttvData.medianTTV !== null && ttvData.targets?.median && (
                <Progress 
                  value={Math.min((ttvData.medianTTV / (ttvData.targets?.median || 1)) * 100, 100)} 
                  className="mt-2 h-2"
                  style={{
                    '--progress-background': ttvData.medianTargetMet ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)'
                  } as React.CSSProperties}
                />
              )}
            </div>

            {/* P95 TTV */}
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <Target className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-medium text-purple-900">P95 TTV</span>
                </div>
                {ttvData.p95TargetMet ? (
                  <TrendingUp className="h-4 w-4 text-green-600" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-600" />
                )}
              </div>
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl font-bold text-purple-900" data-testid="text-p95-ttv">
                  {formatTime(ttvData.p95TTV)}
                </span>
                <span className="text-sm text-purple-600">
                  Target: ≤{ttvData.targets?.p95 || 0}min
                </span>
              </div>
              {ttvData.p95TTV !== null && ttvData.targets?.p95 && (
                <Progress 
                  value={Math.min((ttvData.p95TTV / (ttvData.targets?.p95 || 1)) * 100, 100)} 
                  className="mt-2 h-2"
                  style={{
                    '--progress-background': ttvData.p95TargetMet ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)'
                  } as React.CSSProperties}
                />
              )}
            </div>
          </div>

          {/* Cohort Details */}
          <div className="border-t border-gray-200 pt-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-gray-900">Active Cohorts</h4>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Users className="h-4 w-4" />
                <span data-testid="text-total-users">{ttvData.totalUsers} total users</span>
              </div>
            </div>
            
            {ttvData.cohortDetails.length > 0 ? (
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {ttvData.cohortDetails.map((cohort) => (
                  <div key={cohort.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div>
                      <span className="text-sm font-medium text-gray-900" data-testid={`text-cohort-${cohort.id}`}>
                        {cohort.name}
                      </span>
                      <span className="text-xs text-gray-500 ml-2">
                        {cohort.userCount} users
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-600">
                        Avg TTV: {formatTime(cohort.avgTimeToFirstValue ? cohort.avgTimeToFirstValue / 60 : null)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {Math.round(cohort.conversionRates.profileComplete * 100)}% profile complete
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-4">
                <Users className="mx-auto h-8 w-8 text-gray-300 mb-2" />
                <p className="text-sm">No active cohorts for analysis</p>
              </div>
            )}
          </div>

          {/* Performance Targets Info */}
          <div className="bg-gray-50 rounded-lg p-3">
            <h5 className="text-xs font-medium text-gray-700 mb-2">Performance Targets</h5>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Median TTV:</span>
                <span className="font-medium">≤3 minutes</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">P95 TTV:</span>
                <span className="font-medium">≤7 minutes</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}