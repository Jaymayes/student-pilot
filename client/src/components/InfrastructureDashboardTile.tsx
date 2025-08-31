import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { 
  Server, 
  Database, 
  Shield, 
  Clock,
  CheckCircle,
  AlertTriangle,
  XCircle,
  FileText,
  HardDrive,
  Activity,
  ExternalLink
} from "lucide-react";

interface InfrastructureDashboardData {
  backup: {
    status: 'healthy' | 'error';
    lastBackupTime: string;
    lastBackupSize: string;
    backupRetention: string;
    automatedBackups: boolean;
    details: any;
  };
  restoreTesting: {
    lastTestDate: string;
    lastTestResult: boolean;
    testDuration: string;
    testFrequency: string;
    nextScheduledTest: string;
  };
  alerting: {
    configured: boolean;
    activeAlerts: number;
    lastCheck: string;
    channels: string[];
  };
  disasterRecovery: {
    available: boolean;
    url: string;
    lastUpdated: string;
    procedures: string[];
  };
  systemHealth: {
    database: boolean;
    storage: boolean;
    monitoring: boolean;
    backupSystem: boolean;
  };
}

export function InfrastructureDashboardTile() {
  const { data: infraData, isLoading, error } = useQuery<InfrastructureDashboardData>({
    queryKey: ["/api/dashboard/infrastructure"],
    retry: false,
    refetchInterval: 300000, // Refresh every 5 minutes
  });

  if (isLoading) {
    return (
      <Card className="border border-gray-200">
        <CardHeader className="border-b border-gray-200">
          <CardTitle className="flex items-center space-x-2">
            <Server className="h-5 w-5" />
            <span>Infrastructure & SRE</span>
          </CardTitle>
          <p className="text-gray-600 text-sm">System Health & Disaster Recovery</p>
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

  if (error || !infraData) {
    return (
      <Card className="border border-red-200">
        <CardHeader className="border-b border-gray-200">
          <CardTitle className="flex items-center space-x-2">
            <Server className="h-5 w-5" />
            <span>Infrastructure & SRE</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            <XCircle className="mx-auto h-8 w-8 mb-2" />
            <p>Failed to load infrastructure status</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusIcon = (status: boolean | string) => {
    if (status === true || status === 'healthy') {
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    }
    return <XCircle className="h-4 w-4 text-red-600" />;
  };

  const getStatusBadgeColor = (status: boolean | string) => {
    if (status === true || status === 'healthy') {
      return 'bg-green-100 text-green-800 hover:bg-green-100';
    }
    return 'bg-red-100 text-red-800 hover:bg-red-100';
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now.getTime() - time.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 1) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return `${diffMinutes}m ago`;
    }
    if (diffHours < 24) {
      return `${diffHours}h ago`;
    }
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const systemHealthScore = Object.values(infraData.systemHealth).filter(Boolean).length;
  const totalHealthChecks = Object.keys(infraData.systemHealth).length;
  const healthPercentage = (systemHealthScore / totalHealthChecks) * 100;

  return (
    <Card className="border border-gray-200" data-testid="card-infrastructure-dashboard">
      <CardHeader className="border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <Server className="h-5 w-5" />
              <span>Infrastructure & SRE</span>
            </CardTitle>
            <p className="text-gray-600 text-sm">System Health & Disaster Recovery</p>
          </div>
          <div className="flex items-center space-x-2">
            {getStatusIcon(healthPercentage === 100)}
            <Badge 
              className={getStatusBadgeColor(healthPercentage === 100)} 
              data-testid="badge-infrastructure-status"
            >
              {healthPercentage === 100 ? 'All Systems Operational' : 'Issues Detected'}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-6">
        <div className="space-y-6">
          {/* System Health Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(infraData.systemHealth).map(([system, healthy]) => (
              <div key={system} className="text-center">
                <div className="flex items-center justify-center mb-1">
                  {getStatusIcon(healthy)}
                </div>
                <div className="text-xs font-medium text-gray-700 capitalize">
                  {system.replace(/([A-Z])/g, ' $1').trim()}
                </div>
              </div>
            ))}
          </div>

          {/* Backup Status */}
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <HardDrive className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">Backup System</span>
              </div>
              {getStatusIcon(infraData.backup.status)}
            </div>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-blue-600">Last Backup:</span>
                <div className="font-medium text-blue-900" data-testid="text-last-backup">
                  {getTimeAgo(infraData.backup.lastBackupTime)}
                </div>
                <div className="text-blue-700">({infraData.backup.lastBackupSize})</div>
              </div>
              <div>
                <span className="text-blue-600">Retention:</span>
                <div className="font-medium text-blue-900">{infraData.backup.backupRetention}</div>
                <div className="text-blue-700">
                  {infraData.backup.automatedBackups ? 'Automated' : 'Manual'}
                </div>
              </div>
            </div>
          </div>

          {/* Restore Testing */}
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Activity className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium text-purple-900">Restore Testing</span>
              </div>
              {getStatusIcon(infraData.restoreTesting.lastTestResult)}
            </div>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-purple-600">Last Test:</span>
                <div className="font-medium text-purple-900" data-testid="text-last-restore-test">
                  {getTimeAgo(infraData.restoreTesting.lastTestDate)}
                </div>
                <div className="text-purple-700">
                  Duration: {infraData.restoreTesting.testDuration}
                </div>
              </div>
              <div>
                <span className="text-purple-600">Next Test:</span>
                <div className="font-medium text-purple-900">
                  {new Date(infraData.restoreTesting.nextScheduledTest).toLocaleDateString()}
                </div>
                <div className="text-purple-700">
                  {infraData.restoreTesting.testFrequency}
                </div>
              </div>
            </div>
          </div>

          {/* Alerting & DR */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Alerting Status */}
            <div className="bg-green-50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <Shield className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-900">Alerting</span>
                </div>
                {getStatusIcon(infraData.alerting.configured)}
              </div>
              <div className="text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-green-600">Active Alerts:</span>
                  <span className="font-medium text-green-900" data-testid="text-active-alerts">
                    {infraData.alerting.activeAlerts}
                  </span>
                </div>
                <div className="text-green-700">
                  Channels: {infraData.alerting.channels.join(', ')}
                </div>
              </div>
            </div>

            {/* DR Runbook */}
            <div className="bg-orange-50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <FileText className="h-4 w-4 text-orange-600" />
                  <span className="text-sm font-medium text-orange-900">DR Runbook</span>
                </div>
                {getStatusIcon(infraData.disasterRecovery.available)}
              </div>
              <div className="text-xs space-y-1">
                <div className="text-orange-700">
                  {infraData.disasterRecovery.procedures.length} procedures
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 text-xs mt-2"
                  data-testid="button-view-runbook"
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  View Runbook
                </Button>
              </div>
            </div>
          </div>

          {/* Last Updated */}
          <div className="text-center text-xs text-gray-500 border-t border-gray-200 pt-3">
            <Clock className="h-3 w-3 inline mr-1" />
            Last updated: {formatTimestamp(infraData.alerting.lastCheck)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}