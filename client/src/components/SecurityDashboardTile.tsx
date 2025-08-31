import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { 
  Shield, 
  Users, 
  Database,
  FileText,
  Zap,
  Eye,
  Lock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock
} from "lucide-react";

interface SecurityDashboardData {
  evidenceRegistry: {
    soc2Controls: {
      accessControl: {
        status: string;
        controls: number;
        lastAssessment: string;
      };
      systemOperations: {
        status: string;
        controls: number;
        lastAssessment: string;
      };
      dataProtection: {
        status: string;
        controls: number;
        lastAssessment: string;
      };
    };
    totalControlsAssessed: number;
    effectiveControls: number;
    controlsNeedingAttention: number;
  };
  rbacMatrix: {
    roles: string[];
    permissions: string[];
    activeUsers: number;
    activeSessions: number;
    lastReview: string;
  };
  rateLimits: {
    apiLimits: {
      general: string;
      ai: string;
      billing: string;
    };
    activeThrottling: boolean;
    last24hViolations: number;
    blockedIPs: number;
  };
  auditLogs: {
    totalEvents: number;
    last24h: number;
    criticalEvents: number;
    userActions: number;
    systemEvents: number;
    retention: string;
  };
  drEvidence: {
    proceduresDocumented: boolean;
    lastDrTest: string;
    nextDrTest: string;
    testFrequency: string;
    lastTestResult: string;
    rtoCompliance: boolean;
    rpoCompliance: boolean;
  };
  vulnerabilityScans: {
    lastScan: string;
    nextScan: string;
    frequency: string;
    findings: {
      critical: number;
      high: number;
      medium: number;
      low: number;
      informational: number;
    };
    status: string;
  };
  piiLineage: {
    totalPIIFields: number;
    criticalFields: number;
    dataFlows: number;
    processingActivities: number;
    encryptedFields: number;
    retentionPolicies: number;
  };
  complianceStatus: {
    soc2Ready: boolean;
    gdprCompliant: boolean;
    piiInventoryComplete: boolean;
    backupProceduresVerified: boolean;
    incidentResponseTested: boolean;
    lastAudit: string;
  };
}

export function SecurityDashboardTile() {
  const { data: securityData, isLoading, error } = useQuery<SecurityDashboardData>({
    queryKey: ["/api/dashboard/security"],
    retry: false,
    refetchInterval: 300000, // Refresh every 5 minutes
  });

  if (isLoading) {
    return (
      <Card className="border border-gray-200">
        <CardHeader className="border-b border-gray-200">
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>Security & Compliance</span>
          </CardTitle>
          <p className="text-gray-600 text-sm">Evidence Registry & Compliance Monitoring</p>
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

  if (error || !securityData) {
    return (
      <Card className="border border-red-200">
        <CardHeader className="border-b border-gray-200">
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>Security & Compliance</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            <XCircle className="mx-auto h-8 w-8 mb-2" />
            <p>Failed to load security compliance data</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusIcon = (status: boolean | string) => {
    if (status === true || status === 'effective' || status === 'clean') {
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    }
    if (status === 'needs_improvement') {
      return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
    }
    return <XCircle className="h-4 w-4 text-red-600" />;
  };

  const getStatusBadgeColor = (status: boolean | string) => {
    if (status === true || status === 'effective' || status === 'clean') {
      return 'bg-green-100 text-green-800 hover:bg-green-100';
    }
    if (status === 'needs_improvement') {
      return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100';
    }
    return 'bg-red-100 text-red-800 hover:bg-red-100';
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString();
  };

  const getTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now.getTime() - time.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return '1 day ago';
    return `${diffDays} days ago`;
  };

  const controlsEffectiveness = (securityData.evidenceRegistry.effectiveControls / securityData.evidenceRegistry.totalControlsAssessed) * 100;
  const complianceScore = Object.values(securityData.complianceStatus).filter((val, idx) => 
    idx < Object.keys(securityData.complianceStatus).length - 1 && val === true
  ).length / (Object.keys(securityData.complianceStatus).length - 1) * 100;

  const totalVulnerabilities = Object.values(securityData.vulnerabilityScans.findings).reduce((sum, count) => sum + count, 0);
  const criticalVulnerabilities = securityData.vulnerabilityScans.findings.critical + securityData.vulnerabilityScans.findings.high;

  return (
    <Card className="border border-gray-200" data-testid="card-security-dashboard">
      <CardHeader className="border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <span>Security & Compliance</span>
            </CardTitle>
            <p className="text-gray-600 text-sm">Evidence Registry & Compliance Monitoring</p>
          </div>
          <div className="flex items-center space-x-2">
            {getStatusIcon(complianceScore === 100)}
            <Badge 
              className={getStatusBadgeColor(complianceScore === 100)} 
              data-testid="badge-compliance-status"
            >
              {complianceScore === 100 ? 'Fully Compliant' : 'Needs Attention'}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-6">
        <div className="space-y-6">
          {/* SOC2 Controls Summary */}
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <FileText className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">SOC2 Evidence Registry</span>
              </div>
              <div className="text-right text-xs">
                <div className="font-medium text-blue-900" data-testid="text-controls-effective">
                  {securityData.evidenceRegistry.effectiveControls}/{securityData.evidenceRegistry.totalControlsAssessed} Controls
                </div>
                <div className="text-blue-600">Effective</div>
              </div>
            </div>
            <Progress value={controlsEffectiveness} className="mb-2 h-2" />
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="text-center">
                <div className="font-medium text-blue-900">{securityData.evidenceRegistry.soc2Controls.accessControl.controls}</div>
                <div className="text-blue-600">Access</div>
              </div>
              <div className="text-center">
                <div className="font-medium text-blue-900">{securityData.evidenceRegistry.soc2Controls.systemOperations.controls}</div>
                <div className="text-blue-600">Operations</div>
              </div>
              <div className="text-center">
                <div className="font-medium text-blue-900">{securityData.evidenceRegistry.soc2Controls.dataProtection.controls}</div>
                <div className="text-blue-600">Data Protection</div>
              </div>
            </div>
          </div>

          {/* RBAC & Rate Limits */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* RBAC Matrix */}
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-900">RBAC Matrix</span>
                </div>
                {getStatusIcon(true)}
              </div>
              <div className="text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-green-600">Active Users:</span>
                  <span className="font-medium text-green-900" data-testid="text-active-users">
                    {securityData.rbacMatrix.activeUsers}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-600">Sessions:</span>
                  <span className="font-medium text-green-900">{securityData.rbacMatrix.activeSessions}</span>
                </div>
                <div className="text-green-700">
                  {securityData.rbacMatrix.roles.length} roles, {securityData.rbacMatrix.permissions.length} permissions
                </div>
              </div>
            </div>

            {/* Rate Limits */}
            <div className="bg-yellow-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Zap className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm font-medium text-yellow-900">Rate Limits</span>
                </div>
                {getStatusIcon(!securityData.rateLimits.activeThrottling)}
              </div>
              <div className="text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-yellow-600">Violations (24h):</span>
                  <span className="font-medium text-yellow-900" data-testid="text-rate-violations">
                    {securityData.rateLimits.last24hViolations}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-yellow-600">Blocked IPs:</span>
                  <span className="font-medium text-yellow-900">{securityData.rateLimits.blockedIPs}</span>
                </div>
                <div className="text-yellow-700">
                  {securityData.rateLimits.activeThrottling ? 'Throttling Active' : 'Normal Operation'}
                </div>
              </div>
            </div>
          </div>

          {/* Audit Logs & Vulnerability Scans */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Audit Logs */}
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Eye className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-medium text-purple-900">Audit Logs</span>
                </div>
                {getStatusIcon(securityData.auditLogs.criticalEvents === 0)}
              </div>
              <div className="text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-purple-600">Events (24h):</span>
                  <span className="font-medium text-purple-900" data-testid="text-audit-events">
                    {securityData.auditLogs.last24h}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-purple-600">Critical:</span>
                  <span className="font-medium text-purple-900">{securityData.auditLogs.criticalEvents}</span>
                </div>
                <div className="text-purple-700">
                  Retention: {securityData.auditLogs.retention}
                </div>
              </div>
            </div>

            {/* Vulnerability Scans */}
            <div className="bg-red-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Shield className="h-4 w-4 text-red-600" />
                  <span className="text-sm font-medium text-red-900">Vulnerability Scans</span>
                </div>
                {getStatusIcon(criticalVulnerabilities === 0)}
              </div>
              <div className="text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-red-600">Critical/High:</span>
                  <span className="font-medium text-red-900" data-testid="text-critical-vulnerabilities">
                    {criticalVulnerabilities}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-red-600">Total:</span>
                  <span className="font-medium text-red-900">{totalVulnerabilities}</span>
                </div>
                <div className="text-red-700">
                  Last scan: {getTimeAgo(securityData.vulnerabilityScans.lastScan)}
                </div>
              </div>
            </div>
          </div>

          {/* PII Lineage & DR Evidence */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* PII Lineage */}
            <div className="bg-indigo-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Database className="h-4 w-4 text-indigo-600" />
                  <span className="text-sm font-medium text-indigo-900">PII Lineage</span>
                </div>
                {getStatusIcon(securityData.complianceStatus.piiInventoryComplete)}
              </div>
              <div className="text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-indigo-600">PII Fields:</span>
                  <span className="font-medium text-indigo-900" data-testid="text-pii-fields">
                    {securityData.piiLineage.totalPIIFields}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-indigo-600">Encrypted:</span>
                  <span className="font-medium text-indigo-900">{securityData.piiLineage.encryptedFields}</span>
                </div>
                <div className="text-indigo-700">
                  {securityData.piiLineage.dataFlows} data flows tracked
                </div>
              </div>
            </div>

            {/* DR Evidence */}
            <div className="bg-orange-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Lock className="h-4 w-4 text-orange-600" />
                  <span className="text-sm font-medium text-orange-900">DR Evidence</span>
                </div>
                {getStatusIcon(securityData.drEvidence.rtoCompliance && securityData.drEvidence.rpoCompliance)}
              </div>
              <div className="text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-orange-600">RTO/RPO:</span>
                  <span className="font-medium text-orange-900">
                    {securityData.drEvidence.rtoCompliance && securityData.drEvidence.rpoCompliance ? 'Compliant' : 'Non-compliant'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-orange-600">Last Test:</span>
                  <span className="font-medium text-orange-900">{getTimeAgo(securityData.drEvidence.lastDrTest)}</span>
                </div>
                <div className="text-orange-700">
                  {securityData.drEvidence.testFrequency} testing
                </div>
              </div>
            </div>
          </div>

          {/* Overall Compliance Score */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-900">Overall Compliance Score</span>
              <span className="text-lg font-bold text-gray-900" data-testid="text-compliance-score">
                {Math.round(complianceScore)}%
              </span>
            </div>
            <Progress value={complianceScore} className="h-2" />
            <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
              <div className="text-center">
                <div className="text-gray-600">SOC2 Ready</div>
                <div className="font-medium">{securityData.complianceStatus.soc2Ready ? '✓' : '✗'}</div>
              </div>
              <div className="text-center">
                <div className="text-gray-600">GDPR</div>
                <div className="font-medium">{securityData.complianceStatus.gdprCompliant ? '✓' : '✗'}</div>
              </div>
              <div className="text-center">
                <div className="text-gray-600">Incident Response</div>
                <div className="font-medium">{securityData.complianceStatus.incidentResponseTested ? '✓' : '✗'}</div>
              </div>
            </div>
          </div>

          {/* Last Updated */}
          <div className="text-center text-xs text-gray-500 border-t border-gray-200 pt-3">
            <Clock className="h-3 w-3 inline mr-1" />
            Last audit: {formatTimestamp(securityData.complianceStatus.lastAudit)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}