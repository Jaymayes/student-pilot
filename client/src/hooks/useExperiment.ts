import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { apiRequest } from '@/lib/queryClient';

/**
 * Experiment configuration interface
 */
interface ExperimentConfig {
  id: string;
  name: string;
  description: string;
  variants: ExperimentVariant[];
  isActive: boolean;
  trafficAllocation: number; // Percentage of users to include (0-100)
  startDate: string;
  endDate?: string;
}

interface ExperimentVariant {
  id: string;
  name: string;
  weight: number; // Percentage allocation within experiment (0-100)
  config: Record<string, any>;
}

interface ExperimentAssignment {
  experimentId: string;
  variantId: string;
  assignedAt: string;
  isControlGroup: boolean;
}

interface ExperimentExposure {
  experimentId: string;
  variantId: string;
  exposedAt: string;
  context: Record<string, any>;
}

/**
 * Hook for A/B testing and experimentation
 * Handles user assignment, exposure tracking, and variant rendering
 */
export function useExperiment(experimentId: string) {
  const { user } = useAuth();
  const [assignment, setAssignment] = useState<ExperimentAssignment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoggedExposure, setHasLoggedExposure] = useState(false);

  /**
   * Generate consistent user bucket based on user ID
   * Ensures same user always gets same assignment
   */
  const getUserBucket = useCallback((userId: string, experimentId: string): number => {
    // Simple hash function for consistent bucketing
    let hash = 0;
    const input = `${userId}_${experimentId}`;
    
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash) % 100; // Return 0-99
  }, []);

  /**
   * Fetch experiment configuration and assign user to variant
   */
  const assignUserToExperiment = useCallback(async (userId: string) => {
    try {
      // Fetch experiment configuration
      const response = await apiRequest('GET', `/api/experiments/${experimentId}`);
      const experiment: ExperimentConfig = await response.json();

      if (!experiment.isActive) {
        setAssignment(null);
        setIsLoading(false);
        return;
      }

      // Check if user should be included in experiment
      const userBucket = getUserBucket(userId, experimentId);
      if (userBucket >= experiment.trafficAllocation) {
        // User not in experiment
        setAssignment(null);
        setIsLoading(false);
        return;
      }

      // Assign user to variant based on weights
      let cumulativeWeight = 0;
      let assignedVariant: ExperimentVariant | null = null;

      for (const variant of experiment.variants) {
        cumulativeWeight += variant.weight;
        if (userBucket < (cumulativeWeight * experiment.trafficAllocation / 100)) {
          assignedVariant = variant;
          break;
        }
      }

      if (assignedVariant) {
        const newAssignment: ExperimentAssignment = {
          experimentId,
          variantId: assignedVariant.id,
          assignedAt: new Date().toISOString(),
          isControlGroup: assignedVariant.id === 'control' || assignedVariant.name.toLowerCase().includes('control')
        };

        setAssignment(newAssignment);

        // Log assignment to backend
        await apiRequest('POST', '/api/experiments/assignments', {
          experimentId,
          variantId: assignedVariant.id,
          userId,
          assignedAt: newAssignment.assignedAt
        });
      }

      setIsLoading(false);

    } catch (error) {
      console.error('Error assigning user to experiment:', error);
      setAssignment(null);
      setIsLoading(false);
    }
  }, [experimentId, getUserBucket]);

  /**
   * Log experiment exposure (when user actually sees the variant)
   */
  const logExposure = useCallback(async (context: Record<string, any> = {}) => {
    if (!assignment || hasLoggedExposure) return;

    try {
      const exposure: ExperimentExposure = {
        experimentId,
        variantId: assignment.variantId,
        exposedAt: new Date().toISOString(),
        context: {
          ...context,
          userAgent: navigator.userAgent,
          pageUrl: window.location.href,
          referrer: document.referrer
        }
      };

      await apiRequest('POST', '/api/experiments/exposures', exposure);
      setHasLoggedExposure(true);

    } catch (error) {
      console.error('Error logging experiment exposure:', error);
    }
  }, [assignment, experimentId, hasLoggedExposure]);

  /**
   * Get variant configuration
   */
  const getVariantConfig = useCallback((defaultConfig: Record<string, any> = {}) => {
    if (!assignment) return defaultConfig;

    // In a real implementation, this would fetch from experiment config
    // For now, return mock variant configurations
    const variantConfigs: Record<string, Record<string, any>> = {
      control: defaultConfig,
      variant_a: { ...defaultConfig, showNewFeature: true },
      variant_b: { ...defaultConfig, showNewFeature: true, useNewDesign: true },
      enhanced_explanation: { 
        ...defaultConfig, 
        showConfidenceInterval: true,
        showCompetitionAnalysis: true,
        enableDetailedFactors: true
      },
      simplified_explanation: {
        ...defaultConfig,
        showOnlyScore: true,
        hideAdvancedMetrics: true
      }
    };

    return variantConfigs[assignment.variantId] || defaultConfig;
  }, [assignment]);

  /**
   * Check if user is in specific variant
   */
  const isVariant = useCallback((variantId: string): boolean => {
    return assignment?.variantId === variantId;
  }, [assignment]);

  /**
   * Track conversion event for experiment
   */
  const trackConversion = useCallback(async (
    conversionType: string, 
    value?: number,
    metadata?: Record<string, any>
  ) => {
    if (!assignment) return;

    try {
      await apiRequest('POST', '/api/experiments/conversions', {
        experimentId,
        variantId: assignment.variantId,
        conversionType,
        value,
        metadata,
        convertedAt: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error tracking experiment conversion:', error);
    }
  }, [assignment, experimentId]);

  // Initialize experiment assignment
  useEffect(() => {
    if (user?.id) {
      assignUserToExperiment(user.id);
    } else {
      setIsLoading(false);
    }
  }, [user?.id, assignUserToExperiment]);

  // Auto-log exposure when assignment is ready
  useEffect(() => {
    if (assignment && !hasLoggedExposure) {
      // Small delay to ensure component has rendered
      const timer = setTimeout(() => {
        logExposure();
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [assignment, hasLoggedExposure, logExposure]);

  return {
    assignment,
    isLoading,
    isInExperiment: !!assignment,
    variantId: assignment?.variantId || null,
    isControlGroup: assignment?.isControlGroup || false,
    
    // Utility functions
    getVariantConfig,
    isVariant,
    logExposure,
    trackConversion,
    
    // Debug info
    experimentId,
    hasLoggedExposure
  };
}

/**
 * Hook for managing multiple experiments
 */
export function useMultipleExperiments(experimentIds: string[]) {
  const experiments = experimentIds.map(id => useExperiment(id));
  
  const isLoading = experiments.some(exp => exp.isLoading);
  const assignments = experiments.reduce((acc, exp) => {
    if (exp.assignment) {
      acc[exp.experimentId] = exp.assignment;
    }
    return acc;
  }, {} as Record<string, ExperimentAssignment>);

  /**
   * Get combined variant config across all experiments
   */
  const getCombinedConfig = useCallback((defaultConfig: Record<string, any> = {}) => {
    return experiments.reduce((config, exp) => {
      return { ...config, ...exp.getVariantConfig(config) };
    }, defaultConfig);
  }, [experiments]);

  /**
   * Track conversion across all active experiments
   */
  const trackConversionForAll = useCallback(async (
    conversionType: string,
    value?: number,
    metadata?: Record<string, any>
  ) => {
    await Promise.allSettled(
      experiments
        .filter(exp => exp.isInExperiment)
        .map(exp => exp.trackConversion(conversionType, value, metadata))
    );
  }, [experiments]);

  return {
    isLoading,
    assignments,
    experiments: experiments.reduce((acc, exp) => {
      acc[exp.experimentId] = exp;
      return acc;
    }, {} as Record<string, ReturnType<typeof useExperiment>>),
    
    // Combined utilities
    getCombinedConfig,
    trackConversionForAll,
    
    // Summary stats
    activeExperimentCount: Object.keys(assignments).length,
    totalExperimentCount: experimentIds.length
  };
}