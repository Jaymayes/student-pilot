import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Clock, CheckCircle, AlertTriangle, XCircle, RefreshCw } from 'lucide-react';

interface FreshnessIndicatorProps {
  lastUpdated: string;
  dataQualityScore?: number;
  freshnessStatus?: 'fresh' | 'stale' | 'expired';
  validationErrors?: string[];
  showQualityScore?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Data freshness and quality indicator for Days 15-30 data trust requirements
 * Displays ≤72h SLA compliance and schema completeness
 */
export function FreshnessIndicator({
  lastUpdated,
  dataQualityScore = 100,
  freshnessStatus,
  validationErrors = [],
  showQualityScore = true,
  size = 'md',
  className = ''
}: FreshnessIndicatorProps) {
  // Calculate freshness if not provided
  const updatedAt = new Date(lastUpdated);
  const now = new Date();
  const hoursOld = (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60);
  
  const calculatedStatus = freshnessStatus || (
    hoursOld <= 24 ? 'fresh' :
    hoursOld <= 72 ? 'stale' : 
    'expired'
  );

  const freshnessConfig = {
    fresh: {
      icon: CheckCircle,
      color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      label: 'Fresh',
      description: 'Data updated within 24 hours'
    },
    stale: {
      icon: AlertTriangle,
      color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      label: 'Stale',
      description: 'Data is 24-72 hours old'
    },
    expired: {
      icon: XCircle,
      color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      label: 'Expired',
      description: 'Data is over 72 hours old'
    }
  };

  const config = freshnessConfig[calculatedStatus];
  const IconComponent = config.icon;

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-2'
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };

  const formatTimeAgo = (hours: number): string => {
    if (hours < 1) return 'Just updated';
    if (hours < 24) return `${Math.floor(hours)}h ago`;
    if (hours < 168) return `${Math.floor(hours / 24)}d ago`;
    return `${Math.floor(hours / 168)}w ago`;
  };

  const getQualityColor = (score: number): string => {
    if (score >= 90) return 'text-green-600 dark:text-green-400';
    if (score >= 80) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const tooltipContent = (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4" />
        <span>Last updated: {updatedAt.toLocaleString()}</span>
      </div>
      <div className="flex items-center gap-2">
        <span>Age: {formatTimeAgo(hoursOld)}</span>
      </div>
      {showQualityScore && (
        <div className="flex items-center gap-2">
          <span>Quality Score: </span>
          <span className={getQualityColor(dataQualityScore)}>{dataQualityScore}%</span>
        </div>
      )}
      {validationErrors.length > 0 && (
        <div className="border-t pt-2">
          <div className="text-red-600 dark:text-red-400 text-sm font-medium">
            Validation Issues:
          </div>
          <ul className="text-xs mt-1 space-y-1">
            {validationErrors.map((error, index) => (
              <li key={index} className="text-red-600 dark:text-red-400">
                • {error}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="text-xs text-muted-foreground border-t pt-2">
        {config.description}
      </div>
    </div>
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`inline-flex items-center gap-2 ${className}`}>
            <Badge 
              variant="outline" 
              className={`${config.color} ${sizeClasses[size]} font-medium`}
              data-testid={`freshness-indicator-${calculatedStatus}`}
            >
              <IconComponent className={`${iconSizes[size]} mr-1`} />
              {config.label}
            </Badge>
            
            {showQualityScore && (
              <span className={`text-sm font-medium ${getQualityColor(dataQualityScore)}`}>
                {dataQualityScore}%
              </span>
            )}
            
            {validationErrors.length > 0 && (
              <Badge variant="destructive" className={sizeClasses[size]}>
                {validationErrors.length} issues
              </Badge>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-sm">
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Compact freshness indicator for list views
 */
export function CompactFreshnessIndicator({
  lastUpdated,
  dataQualityScore = 100,
  className = ''
}: Pick<FreshnessIndicatorProps, 'lastUpdated' | 'dataQualityScore' | 'className'>) {
  const updatedAt = new Date(lastUpdated);
  const hoursOld = (new Date().getTime() - updatedAt.getTime()) / (1000 * 60 * 60);
  
  const status = hoursOld <= 24 ? 'fresh' : hoursOld <= 72 ? 'stale' : 'expired';
  const Icon = status === 'fresh' ? CheckCircle : status === 'stale' ? AlertTriangle : XCircle;
  
  const colorClass = 
    status === 'fresh' ? 'text-green-600 dark:text-green-400' :
    status === 'stale' ? 'text-yellow-600 dark:text-yellow-400' :
    'text-red-600 dark:text-red-400';

  return (
    <div className={`flex items-center gap-1 ${className}`} data-testid={`compact-freshness-${status}`}>
      <Icon className={`h-3 w-3 ${colorClass}`} />
      <span className={`text-xs ${colorClass}`}>
        {Math.floor(hoursOld)}h
      </span>
      {dataQualityScore < 90 && (
        <span className="text-xs text-muted-foreground">
          ({dataQualityScore}%)
        </span>
      )}
    </div>
  );
}

/**
 * Global freshness SLA indicator for dashboard
 */
export function GlobalFreshnessIndicator({
  stats,
  className = ''
}: {
  stats: {
    medianFreshnessHours: number;
    freshnessTarget: number;
    meetingFreshnessSLA: boolean;
    sourceCoverage: number;
    sourceCoverageTarget: number;
  };
  className?: string;
}) {
  const slaStatus = stats.meetingFreshnessSLA ? 'meeting' : 'violating';
  const coverageStatus = stats.sourceCoverage >= (stats.sourceCoverageTarget / 100) ? 'meeting' : 'below';

  return (
    <div className={`space-y-3 ${className}`} data-testid="global-freshness-indicator">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Data Freshness SLA</h3>
        <Badge 
          variant={slaStatus === 'meeting' ? 'default' : 'destructive'}
          className="text-xs"
        >
          {slaStatus === 'meeting' ? 'Meeting SLA' : 'SLA Violation'}
        </Badge>
      </div>
      
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <div className="text-muted-foreground">Median Freshness</div>
          <div className={`font-medium ${
            stats.medianFreshnessHours <= stats.freshnessTarget 
              ? 'text-green-600 dark:text-green-400' 
              : 'text-red-600 dark:text-red-400'
          }`}>
            {stats.medianFreshnessHours}h
          </div>
          <div className="text-xs text-muted-foreground">
            Target: ≤{stats.freshnessTarget}h
          </div>
        </div>
        
        <div>
          <div className="text-muted-foreground">Source Coverage</div>
          <div className={`font-medium ${
            coverageStatus === 'meeting'
              ? 'text-green-600 dark:text-green-400' 
              : 'text-yellow-600 dark:text-yellow-400'
          }`}>
            {Math.round(stats.sourceCoverage * 100)}%
          </div>
          <div className="text-xs text-muted-foreground">
            Target: ≥{stats.sourceCoverageTarget}%
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Schema completeness indicator
 */
export function SchemaCompletenessIndicator({
  completeness,
  className = ''
}: {
  completeness: {
    eligibility: number;
    materials: number;
    deadlines: number;
    essayThemes: number;
  };
  className?: string;
}) {
  const schemas = [
    { name: 'Eligibility', value: completeness.eligibility },
    { name: 'Materials', value: completeness.materials },
    { name: 'Deadlines', value: completeness.deadlines },
    { name: 'Essay Themes', value: completeness.essayThemes }
  ];

  const getCompletenessColor = (value: number): string => {
    if (value >= 0.95) return 'text-green-600 dark:text-green-400';
    if (value >= 0.85) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <div className={`space-y-2 ${className}`} data-testid="schema-completeness">
      <h4 className="text-sm font-medium">Schema Completeness</h4>
      <div className="grid grid-cols-2 gap-2 text-xs">
        {schemas.map((schema) => (
          <div key={schema.name} className="flex justify-between">
            <span className="text-muted-foreground">{schema.name}</span>
            <span className={getCompletenessColor(schema.value)}>
              {Math.round(schema.value * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}