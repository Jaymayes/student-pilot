/**
 * Pricing and Packaging Framework for Days 31-60
 * Primary focus: Recruitment Dashboard Access as dominant pricing motion
 * Secondary: Listing fees as add-on and seasonal lever
 */

export interface PricingTier {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  annualPrice: number;
  annualDiscount: number;
  features: PricingFeature[];
  limits: PricingLimits;
  targetCustomer: string;
  valueProps: string[];
}

export interface PricingFeature {
  name: string;
  description: string;
  included: boolean;
  limit?: number;
  addOnPrice?: number;
}

export interface PricingLimits {
  maxPromotions: number;
  maxActiveListings: number;
  qualifiedViewsPerMonth: number;
  reportingFrequency: 'weekly' | 'daily' | 'real-time';
  apiCallsPerMonth?: number;
  customBranding: boolean;
  dedicatedSupport: boolean;
}

/**
 * Primary Pricing Motion: Recruitment Dashboard Access
 * Aligned with Year 2/Year 5 B2B ARPU targets for hybrid model
 */
export const DASHBOARD_ACCESS_TIERS: PricingTier[] = [
  {
    id: 'starter',
    name: 'Starter Dashboard',
    description: 'Essential recruitment tools for growing organizations',
    monthlyPrice: 399,
    annualPrice: 3990, // 17% discount
    annualDiscount: 0.17,
    features: [
      {
        name: 'Candidate Discovery',
        description: 'Access to student profiles and search filters',
        included: true
      },
      {
        name: 'Promotion Management',
        description: 'Create and manage scholarship promotions',
        included: true,
        limit: 5
      },
      {
        name: 'Basic Analytics',
        description: 'Weekly performance reports and metrics',
        included: true
      },
      {
        name: 'Deep Link Integration',
        description: 'Direct application routing to partner systems',
        included: true
      },
      {
        name: 'Email Support',
        description: 'Standard customer support via email',
        included: true
      },
      {
        name: 'Custom Branding',
        description: 'Partner logo and branding in promotions',
        included: false,
        addOnPrice: 99
      }
    ],
    limits: {
      maxPromotions: 5,
      maxActiveListings: 3,
      qualifiedViewsPerMonth: 1000,
      reportingFrequency: 'weekly',
      apiCallsPerMonth: 2500,
      customBranding: false,
      dedicatedSupport: false
    },
    targetCustomer: 'Small to medium organizations, regional foundations',
    valueProps: [
      'Cost-effective student recruitment',
      'Pre-qualified candidate pipeline',
      'Easy promotion management',
      'Clear ROI tracking'
    ]
  },
  {
    id: 'professional',
    name: 'Professional Dashboard',
    description: 'Advanced recruitment suite for established programs',
    monthlyPrice: 899,
    annualPrice: 8990, // 17% discount
    annualDiscount: 0.17,
    features: [
      {
        name: 'Advanced Candidate Discovery',
        description: 'Enhanced search, filtering, and AI-powered matching',
        included: true
      },
      {
        name: 'Unlimited Promotions',
        description: 'Create and manage unlimited scholarship promotions',
        included: true
      },
      {
        name: 'Premium Analytics',
        description: 'Daily reports, cohort analysis, and ROI tracking',
        included: true
      },
      {
        name: 'Priority Deep Linking',
        description: 'Guaranteed fast routing and attribution tracking',
        included: true
      },
      {
        name: 'Custom Branding',
        description: 'Full partner branding integration',
        included: true
      },
      {
        name: 'Phone & Email Support',
        description: 'Priority customer support',
        included: true
      },
      {
        name: 'API Access',
        description: 'REST API for system integration',
        included: true
      },
      {
        name: 'Listing Fee Credits',
        description: 'Monthly credits for seasonal listing promotions',
        included: true,
        limit: 500 // $500 monthly credit
      }
    ],
    limits: {
      maxPromotions: -1, // Unlimited
      maxActiveListings: 15,
      qualifiedViewsPerMonth: 5000,
      reportingFrequency: 'daily',
      apiCallsPerMonth: 10000,
      customBranding: true,
      dedicatedSupport: false
    },
    targetCustomer: 'Large corporations, major foundations, universities',
    valueProps: [
      'Scalable recruitment infrastructure',
      'Advanced targeting and analytics',
      'Brand integration and customization',
      'API-driven workflow integration'
    ]
  },
  {
    id: 'enterprise',
    name: 'Enterprise Dashboard',
    description: 'Complete recruitment platform for large-scale programs',
    monthlyPrice: 1999,
    annualPrice: 19990, // 17% discount
    annualDiscount: 0.17,
    features: [
      {
        name: 'White-Label Platform',
        description: 'Fully branded recruitment portal',
        included: true
      },
      {
        name: 'Unlimited Everything',
        description: 'No limits on promotions, listings, or views',
        included: true
      },
      {
        name: 'Real-Time Analytics',
        description: 'Live dashboards, custom reports, and data exports',
        included: true
      },
      {
        name: 'Dedicated Success Manager',
        description: 'Personal account management and optimization',
        included: true
      },
      {
        name: 'Custom Integrations',
        description: 'Bespoke API development and system integration',
        included: true
      },
      {
        name: 'SLA Guarantees',
        description: '99.9% uptime and <200ms response time SLA',
        included: true
      },
      {
        name: 'Listing Fee Credits',
        description: 'Substantial monthly credits for seasonal campaigns',
        included: true,
        limit: 2000 // $2000 monthly credit
      }
    ],
    limits: {
      maxPromotions: -1,
      maxActiveListings: -1,
      qualifiedViewsPerMonth: -1,
      reportingFrequency: 'real-time',
      apiCallsPerMonth: -1,
      customBranding: true,
      dedicatedSupport: true
    },
    targetCustomer: 'Fortune 500, government agencies, major university systems',
    valueProps: [
      'Enterprise-grade recruitment platform',
      'Complete customization and control',
      'Dedicated support and SLA guarantees',
      'Strategic partnership and co-marketing'
    ]
  }
];

/**
 * Secondary Pricing Motion: Listing Fees (Add-on and seasonal lever)
 * Integrated with dashboard access tiers for maximum flexibility
 */
export const LISTING_FEE_STRUCTURE = {
  payPerListing: {
    name: 'Pay-Per-Listing',
    description: 'Flexible pricing for occasional or seasonal promotions',
    baseFee: 65, // Increased from $45 for better unit economics
    tiers: {
      standard: {
        name: 'Standard Listing',
        multiplier: 1.0,
        features: ['Basic promotion placement', 'Standard visibility']
      },
      featured: {
        name: 'Featured Listing',
        multiplier: 2.2, // Reduced from 2.5 for better conversion
        features: ['Priority placement', 'Enhanced visibility', 'Highlighted design']
      },
      premium: {
        name: 'Premium Listing',
        multiplier: 3.5, // Reduced from 4.0 for better value perception
        features: ['Top placement', 'Maximum visibility', 'Custom styling', 'Priority support']
      }
    },
    volumeDiscounts: [
      { threshold: 10, discount: 0.05 }, // 5% off for 10+ listings
      { threshold: 25, discount: 0.10 }, // 10% off for 25+ listings
      { threshold: 50, discount: 0.15 }  // 15% off for 50+ listings
    ]
  },
  seasonalPackages: {
    name: 'Seasonal Packages',
    description: 'Time-limited promotional packages for peak recruitment periods',
    packages: [
      {
        name: 'Back-to-School Blast',
        period: 'August-September',
        duration: 60, // days
        price: 1299,
        includes: ['15 featured listings', '5 premium listings', 'Priority placement', 'Weekly performance reports']
      },
      {
        name: 'Spring Semester Push',
        period: 'January-February',
        duration: 45,
        price: 899,
        includes: ['10 featured listings', '3 premium listings', 'Enhanced targeting', 'Bi-weekly reports']
      },
      {
        name: 'Graduation Season',
        period: 'April-May',
        duration: 60,
        price: 1599,
        includes: ['20 featured listings', '8 premium listings', 'Graduate-focused targeting', 'Real-time analytics']
      }
    ]
  }
};

/**
 * Value Metrics and Reporting Framework
 * Explicit metrics reported weekly to partners for onboarding flywheel
 */
export interface PartnerValueMetrics {
  impressions: number;
  clicks: number;
  qualifiedViews: number;
  eligibleApplies: number;
  conversionFunnel: {
    impressionToCTR: number;
    clickToQualified: number;
    qualifiedToEligible: number;
    eligibleToApply: number;
    overallConversion: number;
  };
  qualityScore: number;
  costMetrics: {
    costPerClick: number;
    costPerQualifiedView: number;
    costPerEligibleApply: number;
  };
  roiMetrics: {
    estimatedStudentValue: number;
    partnerROI: number;
    paybackPeriod: number; // months
  };
}

/**
 * Partner Terms & Conditions Framework
 * Addendum for pilot cohort with clear value metrics and expectations
 */
export const PILOT_TERMS_FRAMEWORK = {
  commitmentPeriods: {
    pilot: {
      duration: 90, // days
      minimumSpend: 0,
      cancellationNotice: 30, // days
      features: ['Full platform access', 'Weekly reports', 'Standard support']
    },
    annual: {
      duration: 365,
      minimumSpend: 5000,
      cancellationNotice: 60,
      features: ['All pilot features', 'Volume discounts', 'Priority support', 'Quarterly reviews']
    },
    enterprise: {
      duration: 365,
      minimumSpend: 15000,
      cancellationNotice: 90,
      features: ['All annual features', 'Custom terms', 'Dedicated CSM', 'Co-marketing opportunities']
    }
  },
  serviceLevel: {
    uptimeGuarantee: 0.999, // 99.9%
    responseTime: 200, // ms
    supportResponse: {
      email: 24, // hours
      phone: 4, // hours for professional+
      dedicated: 1 // hours for enterprise
    }
  },
  dataAndPrivacy: {
    dataRetention: 730, // days
    anonymization: true,
    euCompliance: true,
    ccpaCompliance: true,
    auditRights: true
  },
  performanceStandards: {
    minimumQualityScore: 75,
    attributionAccuracy: 0.98,
    reportingFrequency: 'weekly',
    performanceReview: 'quarterly'
  }
};

/**
 * Year 2/5 ARPU Targets and Revenue Mix Alignment
 * B2B as dominant share by Year 5 in hybrid model
 */
export const REVENUE_TARGETS = {
  year2: {
    targetPartners: 12, // 10-15 range
    avgARPU: 750, // Monthly ARPU per partner
    totalB2BRevenue: 108000, // Annual ($9k per partner)
    b2cRevenue: 180000, // From credit system
    b2bMixTarget: 0.375 // 37.5% B2B mix
  },
  year5: {
    targetPartners: 85,
    avgARPU: 1200,
    totalB2BRevenue: 1224000, // Annual
    b2cRevenue: 600000,
    b2bMixTarget: 0.67 // 67% B2B mix (dominant)
  },
  pricing: {
    blendedARPU: 950, // Target blended ARPU
    uptickRate: 0.25, // 25% annual upsell rate
    churnRate: 0.08, // Target <8% annual churn
    expansionRevenue: 0.35 // 35% revenue from expansion
  }
};

/**
 * Traffic Allocation Scale-up Gates
 * Conditions for increasing from 18% to 30-35%
 */
export const SCALE_UP_GATES = {
  attributionReliability: 0.98, // ≥98% for 72h
  partnerQualityScore: 80, // Above threshold
  ctrStability: 0.06, // Stable ≥6% CTR
  deepLinkIntegrity: 0.97, // ≥97% success rate
  costPerQualifiedApply: 45, // ≤$45 target
  partnerROI: 2.5, // ≥2.5x ROI for dashboard access
  monitoringPeriod: 72 // hours of stability required
};

/**
 * Calculate optimal pricing for partner based on usage and value
 */
export function calculateOptimalPricing(
  partnerMetrics: PartnerValueMetrics,
  currentTier: string,
  usageHistory: any[]
): {
  recommendedTier: string;
  potentialSavings: number;
  upgradeBenefits: string[];
  reasoning: string;
} {
  const currentTierData = DASHBOARD_ACCESS_TIERS.find(t => t.id === currentTier);
  if (!currentTierData) throw new Error('Invalid tier');

  // Analyze usage patterns
  const avgQualifiedViews = partnerMetrics.qualifiedViews;
  const avgROI = partnerMetrics.roiMetrics.partnerROI;
  const qualityScore = partnerMetrics.qualityScore;

  // Determine optimal tier based on usage and value
  let recommendedTier = currentTier;
  let reasoning = '';

  if (avgQualifiedViews > 4000 && avgROI > 3.0 && qualityScore > 85) {
    recommendedTier = 'enterprise';
    reasoning = 'High volume, excellent ROI, and quality score indicate enterprise value';
  } else if (avgQualifiedViews > 2000 && avgROI > 2.5) {
    recommendedTier = 'professional';
    reasoning = 'Strong volume and ROI support professional tier upgrade';
  } else if (avgQualifiedViews < 800 && avgROI < 2.0) {
    recommendedTier = 'starter';
    reasoning = 'Lower volume and ROI suggest starter tier is optimal';
  }

  const recommendedTierData = DASHBOARD_ACCESS_TIERS.find(t => t.id === recommendedTier);
  const potentialSavings = recommendedTier !== currentTier ? 
    currentTierData.monthlyPrice - (recommendedTierData?.monthlyPrice || 0) : 0;

  const upgradeBenefits = recommendedTierData?.valueProps || [];

  return {
    recommendedTier,
    potentialSavings,
    upgradeBenefits,
    reasoning
  };
}