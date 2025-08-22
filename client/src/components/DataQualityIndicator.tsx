import React from 'react';
import { AlertTriangle, CheckCircle, Clock, RefreshCw, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { useDataFreshness, type DataFreshnessStatus } from '@/hooks/useDataFreshness';

interface DataQualityIndicatorProps {
  scholarshipId: string;
  size?: 'sm' | 'md' | 'lg';
  showDetails?: boolean;
  onRevalidate?: () => void;
  className?: string;
}

/**
 * Data quality indicator component
 * Shows freshness status, quality score, and validation errors
 */
export function DataQualityIndicator({
  scholarshipId,
  size = 'md',
  showDetails = false,
  onRevalidate,
  className = ''
}: DataQualityIndicatorProps) {
  const { 
    getFreshnessStatus, 
    getFreshnessDescription, 
    getFreshnessColor, 
    triggerRevalidation,
    isDataAcceptable 
  } = useDataFreshness([scholarshipId]);

  const status = getFreshnessStatus(scholarshipId);
  const isAcceptable = isDataAcceptable(scholarshipId);

  const handleRevalidate = async () => {
    const success = await triggerRevalidation(scholarshipId);
    if (success && onRevalidate) {
      onRevalidate();
    }
  };

  const getStatusIcon = () => {
    const iconSize = size === 'sm' ? 'h-3 w-3' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4';
    
    switch (status.status) {
      case 'fresh':
        return <CheckCircle className={`${iconSize} text-green-600 dark:text-green-400`} />;
      case 'stale':
        return <Clock className={`${iconSize} text-yellow-600 dark:text-yellow-400`} />;
      case 'expired':
        return <AlertTriangle className={`${iconSize} text-red-600 dark:text-red-400`} />;
      default:
        return <Info className={`${iconSize} text-gray-500 dark:text-gray-400`} />;
    }
  };

  const getStatusBadge = () => {
    const variant = status.status === 'fresh' ? 'default' : 
                   status.status === 'stale' ? 'secondary' : 'destructive';
    
    return (
      <Badge variant={variant} className={size === 'sm' ? 'text-xs px-1' : ''}>
        {status.status === 'fresh' ? 'Fresh' :
         status.status === 'stale' ? 'Updating' : 
         status.status === 'expired' ? 'Needs Update' : 'Unknown'}
      </Badge>
    );
  };

  if (!showDetails) {
    // Compact indicator
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`inline-flex items-center gap-1 ${className}`}>
            {getStatusIcon()}
            {size !== 'sm' && getStatusBadge()}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-sm">
            <p className="font-medium">{getFreshnessDescription(scholarshipId)}</p>
            {status.qualityScore && (
              <p>Quality Score: {status.qualityScore}%</p>
            )}
            {status.lastUpdated && (
              <p>Updated: {new Date(status.lastUpdated).toLocaleDateString()}</p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  // Detailed indicator with quality breakdown
  return (
    <div className={`border rounded-lg p-3 space-y-3 ${className} ${
      !isAcceptable ? 'border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950/20' : ''
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <span className={`font-medium ${getFreshnessColor(scholarshipId)}`}>
            {getFreshnessDescription(scholarshipId)}
          </span>
        </div>
        {getStatusBadge()}
      </div>

      {/* Quality Score */}
      {status.qualityScore !== undefined && (
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span>Data Quality</span>
            <span className="font-medium">{status.qualityScore}%</span>
          </div>
          <Progress 
            value={status.qualityScore} 
            className="h-2"
            data-testid={`quality-progress-${scholarshipId}`}
          />
        </div>
      )}

      {/* Last Updated */}
      {status.lastUpdated && (
        <div className="text-xs text-gray-600 dark:text-gray-400">
          Last updated: {new Date(status.lastUpdated).toLocaleString()}
        </div>
      )}

      {/* Validation Errors */}
      {status.validationErrors && status.validationErrors.length > 0 && (
        <div className="space-y-1">
          <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
            Data Issues:
          </p>
          <ul className="text-xs text-amber-600 dark:text-amber-300 space-y-1">
            {status.validationErrors.slice(0, 3).map((error, index) => (
              <li key={index} className="flex items-start gap-1">
                <span className="text-amber-500 mt-0.5">•</span>
                <span>{error}</span>
              </li>
            ))}
            {status.validationErrors.length > 3 && (
              <li className="text-amber-500 italic">
                +{status.validationErrors.length - 3} more issues
              </li>
            )}
          </ul>
        </div>
      )}

      {/* Next Update ETA */}
      {status.nextUpdateEta && (
        <div className="text-xs text-blue-600 dark:text-blue-400">
          Next update: {new Date(status.nextUpdateEta).toLocaleString()}
        </div>
      )}

      {/* Revalidation Button */}
      {status.status !== 'fresh' && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleRevalidate}
          className="w-full"
          data-testid={`revalidate-button-${scholarshipId}`}
        >
          <RefreshCw className="h-3 w-3 mr-2" />
          Refresh Data
        </Button>
      )}

      {/* Data Acceptability Warning */}
      {!isAcceptable && (
        <div className="bg-amber-100 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md p-2">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-amber-800 dark:text-amber-200">
              <p className="font-medium">Data Quality Notice</p>
              <p>This information may be outdated. Please verify details before applying.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Global data quality summary component
 * Shows system-wide data health metrics
 */
export function GlobalDataQualitySummary() {
  const { getFreshnessStatus } = useDataFreshness();
  
  // This would typically connect to a global data quality hook
  const stats = {
    totalScholarships: 1247,
    freshPercentage: 87,
    averageQualityScore: 84,
    lastPipelineRun: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    pendingValidations: 23
  };

  const isMeetingSLA = stats.freshPercentage >= 85;

  return (
    <div className="bg-white dark:bg-gray-800 border rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Data Quality Overview</h3>
        <Badge variant={isMeetingSLA ? 'default' : 'destructive'}>
          {isMeetingSLA ? 'Meeting SLA' : 'Below SLA'}
        </Badge>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {stats.freshPercentage}%
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Fresh Data</div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold">
            {stats.averageQualityScore}%
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Avg Quality</div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold">
            {stats.totalScholarships.toLocaleString()}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Total Records</div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {stats.pendingValidations}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Pending Updates</div>
        </div>
      </div>

      <div className="text-xs text-gray-500 dark:text-gray-400">
        Last pipeline run: {new Date(stats.lastPipelineRun).toLocaleString()}
      </div>
    </div>
  );
}