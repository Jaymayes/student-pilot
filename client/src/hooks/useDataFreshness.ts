import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

export interface DataFreshnessStatus {
  status: 'fresh' | 'stale' | 'expired' | 'unknown';
  lastUpdated?: string;
  qualityScore?: number;
  validationErrors?: string[];
  nextUpdateEta?: string;
}

export interface ScholarshipDataQuality {
  id: string;
  freshness: DataFreshnessStatus;
  completeness: {
    requirements: number; // 0-100 percentage
    deadlines: number;
    amounts: number;
    overall: number;
  };
  sourceReliability: number; // 0-100 score
  lastValidated?: string;
}

/**
 * Hook for monitoring data freshness and quality
 * Provides real-time status updates for scholarship data
 */
export function useDataFreshness(scholarshipIds?: string[]) {
  const [freshnessMap, setFreshnessMap] = useState<Map<string, DataFreshnessStatus>>(new Map());
  const queryClient = useQueryClient();

  // Fetch freshness data for specific scholarships
  const { data: freshnessData, isLoading, error } = useQuery({
    queryKey: ['data-freshness', scholarshipIds],
    queryFn: async () => {
      if (!scholarshipIds?.length) return null;
      
      const response = await apiRequest('POST', '/api/data-validation/freshness', {
        scholarshipIds
      });
      return response.json();
    },
    enabled: Boolean(scholarshipIds?.length),
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000 // Refresh every minute
  });

  // Update freshness map when data changes
  useEffect(() => {
    if (freshnessData?.scholarships) {
      const newMap = new Map<string, DataFreshnessStatus>();
      
      freshnessData.scholarships.forEach((item: any) => {
        newMap.set(item.id, {
          status: item.freshnessStatus,
          lastUpdated: item.lastUpdated,
          qualityScore: item.dataQualityScore,
          validationErrors: item.validationErrors || [],
          nextUpdateEta: item.nextUpdateEta
        });
      });
      
      setFreshnessMap(newMap);
    }
  }, [freshnessData]);

  // Get freshness status for a specific scholarship
  const getFreshnessStatus = useCallback((scholarshipId: string): DataFreshnessStatus => {
    return freshnessMap.get(scholarshipId) || { status: 'unknown' };
  }, [freshnessMap]);

  // Trigger revalidation for specific scholarship
  const triggerRevalidation = useCallback(async (scholarshipId: string) => {
    try {
      await apiRequest('POST', `/api/data-validation/revalidate/${scholarshipId}`);
      
      // Invalidate queries to fetch fresh data
      queryClient.invalidateQueries({ queryKey: ['data-freshness'] });
      queryClient.invalidateQueries({ queryKey: ['/api/scholarships', scholarshipId] });
      
      return true;
    } catch (error) {
      console.error('Failed to trigger revalidation:', error);
      return false;
    }
  }, [queryClient]);

  // Check if data is acceptable for display
  const isDataAcceptable = useCallback((scholarshipId: string): boolean => {
    const status = getFreshnessStatus(scholarshipId);
    return status.status !== 'expired' && (status.qualityScore || 0) >= 70;
  }, [getFreshnessStatus]);

  // Get human-readable freshness description
  const getFreshnessDescription = useCallback((scholarshipId: string): string => {
    const status = getFreshnessStatus(scholarshipId);
    
    switch (status.status) {
      case 'fresh':
        return 'Data is current and verified';
      case 'stale':
        const hours = status.lastUpdated 
          ? Math.floor((Date.now() - new Date(status.lastUpdated).getTime()) / (1000 * 60 * 60))
          : 0;
        return `Data is ${hours}h old, updating soon`;
      case 'expired':
        return 'Data needs verification - use with caution';
      default:
        return 'Data status unknown';
    }
  }, [getFreshnessStatus]);

  // Get appropriate UI styling for freshness status
  const getFreshnessColor = useCallback((scholarshipId: string): string => {
    const status = getFreshnessStatus(scholarshipId);
    
    switch (status.status) {
      case 'fresh':
        return 'text-green-600 dark:text-green-400';
      case 'stale':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'expired':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-500 dark:text-gray-400';
    }
  }, [getFreshnessStatus]);

  return {
    freshnessMap,
    isLoading,
    error,
    getFreshnessStatus,
    triggerRevalidation,
    isDataAcceptable,
    getFreshnessDescription,
    getFreshnessColor,
    
    // Computed properties for summary stats
    totalScholarships: freshnessMap.size,
    freshCount: Array.from(freshnessMap.values()).filter(s => s.status === 'fresh').length,
    staleCount: Array.from(freshnessMap.values()).filter(s => s.status === 'stale').length,
    expiredCount: Array.from(freshnessMap.values()).filter(s => s.status === 'expired').length,
    averageQualityScore: freshnessMap.size > 0 
      ? Array.from(freshnessMap.values())
          .filter(s => s.qualityScore !== undefined)
          .reduce((sum, s) => sum + (s.qualityScore || 0), 0) / freshnessMap.size
      : 0
  };
}

/**
 * Hook for global data quality monitoring
 * Provides system-wide freshness and quality metrics
 */
export function useGlobalDataQuality() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['global-data-quality'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/data-validation/global-status');
      return response.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 10000 // 10 seconds
  });

  return {
    globalStats: data?.stats || {
      totalScholarships: 0,
      freshPercentage: 0,
      averageQualityScore: 0,
      lastPipelineRun: null,
      pendingValidations: 0
    },
    isLoading,
    error,
    
    // Helper functions
    isMeetingSLA: (data?.stats?.freshPercentage || 0) >= 85, // 85% fresh data SLA
    needsAttention: (data?.stats?.averageQualityScore || 0) < 70 // Quality threshold
  };
}