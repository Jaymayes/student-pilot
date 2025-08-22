import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { apiRequest } from '@/lib/queryClient';
import { 
  DollarSign, 
  TrendingUp, 
  Users, 
  Target,
  Award,
  BarChart3,
  CheckCircle,
  Clock,
  ArrowUpRight,
  Building,
  Eye,
  MousePointer,
  UserCheck
} from 'lucide-react';

interface MonetizationMetrics {
  pilotStatus: {
    trafficAllocation: number;
    activePartners: number;
    livePromotions: number;
    paidCommitments: number;
    commitmentLetters: number;
  };
  pricingExperiments: {
    listingFeesEnrolled: number;
    dashboardAccessEnrolled: number;
    winningModel: string;
    avgPartnerROI: number;
  };
  year2Progress: {
    targetPartners: number;
    currentCommitted: number;
    progressPercentage: number;
    projectedAchievement: string;
  };
  qualityMetrics: {
    avgQualityScore: number;
    attributionReliability: number;
    avgCTR: number;
    qualifiedConversionRate: number;
  };
}

interface PartnerValueReport {
  partnerId: string;
  reportPeriod: string;
  dateRange: { start: string; end: string };
  metrics: {
    impressions: number;
    clicks: number;
    qualifiedViews: number;
    applications: number;
    conversionFunnel: {
      impressionToCTR: number;
      clickToQualified: number;
      qualifiedToApplication: number;
      overallConversion: number;
    };
    partnerROI: {
      costPerQualifiedLead: number;
      costPerApplication: number;
      estimatedStudentValue: number;
      roiMultiplier: number;
    };
  };
  qualityScore: number;
  recommendations: string[];
}

/**
 * Monetization Dashboard for marketplace revenue validation
 * Final sprint focus on B2B revenue signal and partner commitments
 */
export function MonetizationDashboard() {
  const [selectedPartner, setSelectedPartner] = useState<string>('partner-edu-corp');

  // Fetch monetization dashboard data
  const { data: dashboard, isLoading: dashboardLoading } = useQuery({
    queryKey: ['/api/marketplace/monetization-dashboard'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/marketplace/monetization-dashboard');
      const data = await response.json();
      return data.dashboard as MonetizationMetrics;
    }
  });

  // Fetch partner value report
  const { data: valueReport, isLoading: reportLoading } = useQuery({
    queryKey: ['/api/marketplace/partner-value-report', selectedPartner],
    queryFn: async () => {
      const endDate = new Date().toISOString();
      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      
      const response = await apiRequest('POST', `/api/marketplace/partner/${selectedPartner}/value-report`, {
        reportPeriod: 'weekly',
        startDate,
        endDate
      });
      const data = await response.json();
      return data.report as PartnerValueReport;
    }
  });

  if (dashboardLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatPercentage = (rate: number): string => {
    return `${(rate * 100).toFixed(1)}%`;
  };

  const getStatusColor = (value: number, target: number, reverse = false): string => {
    const isGood = reverse ? value < target : value >= target;
    if (isGood) return 'text-green-600 dark:text-green-400';
    if (reverse ? value < target * 1.2 : value >= target * 0.8) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Marketplace Monetization</h1>
          <p className="text-muted-foreground">
            Final Sprint Focus: B2B Revenue Validation • Target: ≥3 Paid Commitments • Year 2: 10-15 Partners
          </p>
        </div>
        
        {/* Quick Actions */}
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Building className="h-4 w-4 mr-2" />
            Add Partner
          </Button>
          <Button size="sm">
            <TrendingUp className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Traffic Allocation</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round((dashboard?.pilotStatus.trafficAllocation || 0) * 100)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Increased from 5% → 18% based on stability
            </p>
            <Badge variant={dashboard?.pilotStatus.trafficAllocation && dashboard.pilotStatus.trafficAllocation >= 0.15 ? "default" : "secondary"} className="mt-2">
              {dashboard?.pilotStatus.trafficAllocation && dashboard.pilotStatus.trafficAllocation >= 0.15 ? "Scaled Up" : "Base Level"}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid Commitments</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboard?.pilotStatus.paidCommitments || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Target: ≥3 paid commitments
            </p>
            <div className="mt-2">
              <Progress 
                value={((dashboard?.pilotStatus.paidCommitments || 0) / 3) * 100} 
                className="h-2" 
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Year 2 Progress</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboard?.year2Progress.progressPercentage || 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              {dashboard?.year2Progress.currentCommitted || 0} of {dashboard?.year2Progress.targetPartners || 12} partners
            </p>
            <Badge variant="default" className="mt-2">
              On Track
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Partner ROI</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getStatusColor(dashboard?.pricingExperiments.avgPartnerROI || 0, 2.0)}`}>
              {dashboard?.pricingExperiments.avgPartnerROI.toFixed(1)}x
            </div>
            <p className="text-xs text-muted-foreground">
              Revenue multiple on spend
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Pricing Experiments Status */}
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-blue-500" />
            Pricing Experiments
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Testing listing fees vs. dashboard access models
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Listing Fees Model</span>
                <Badge variant="outline">{dashboard?.pricingExperiments.listingFeesEnrolled || 0} partners</Badge>
              </div>
              <div className="text-xs text-muted-foreground">
                Pay-per-listing with tiered promotion multipliers
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Dashboard Access Model</span>
                <Badge variant="outline">{dashboard?.pricingExperiments.dashboardAccessEnrolled || 0} partners</Badge>
              </div>
              <div className="text-xs text-muted-foreground">
                Monthly subscription for recruitment dashboard
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Early Leader</span>
                <Badge variant="default">
                  {dashboard?.pricingExperiments.winningModel === 'dashboard_access' ? 'Dashboard Access' : 'Listing Fees'}
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground">
                Based on partner ROI and engagement
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="partners" className="space-y-4">
        <TabsList>
          <TabsTrigger value="partners">Partner Performance</TabsTrigger>
          <TabsTrigger value="quality">Quality Metrics</TabsTrigger>
          <TabsTrigger value="commitments">Commitment Pipeline</TabsTrigger>
          <TabsTrigger value="experiments">Pricing Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="partners" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Partner Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Partner Value Report</CardTitle>
                <div className="flex gap-2">
                  <Button 
                    variant={selectedPartner === 'partner-edu-corp' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedPartner('partner-edu-corp')}
                  >
                    EduCorp
                  </Button>
                  <Button 
                    variant={selectedPartner === 'partner-stem-alliance' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedPartner('partner-stem-alliance')}
                  >
                    STEM Alliance
                  </Button>
                  <Button 
                    variant={selectedPartner === 'partner-diversity-fund' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedPartner('partner-diversity-fund')}
                  >
                    Diversity Fund
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {!reportLoading && valueReport && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-muted-foreground">Impressions</div>
                        <div className="text-xl font-bold">{valueReport.metrics.impressions.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Applications</div>
                        <div className="text-xl font-bold">{valueReport.metrics.applications}</div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>CTR</span>
                        <span className="font-medium">{formatPercentage(valueReport.metrics.conversionFunnel.impressionToCTR)}</span>
                      </div>
                      <Progress value={valueReport.metrics.conversionFunnel.impressionToCTR * 1000} className="h-2" />
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Qualification Rate</span>
                        <span className="font-medium">{formatPercentage(valueReport.metrics.conversionFunnel.clickToQualified)}</span>
                      </div>
                      <Progress value={valueReport.metrics.conversionFunnel.clickToQualified * 100} className="h-2" />
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Application Rate</span>
                        <span className="font-medium">{formatPercentage(valueReport.metrics.conversionFunnel.qualifiedToApplication)}</span>
                      </div>
                      <Progress value={valueReport.metrics.conversionFunnel.qualifiedToApplication * 100} className="h-2" />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* ROI Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>Partner ROI Analysis</CardTitle>
                <p className="text-sm text-muted-foreground">Cost efficiency and value metrics</p>
              </CardHeader>
              <CardContent className="space-y-4">
                {!reportLoading && valueReport && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-muted-foreground">Cost per Lead</div>
                        <div className="text-lg font-bold">
                          {formatCurrency(valueReport.metrics.partnerROI.costPerQualifiedLead)}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Cost per Application</div>
                        <div className="text-lg font-bold">
                          {formatCurrency(valueReport.metrics.partnerROI.costPerApplication)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-muted/50 p-4 rounded">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">ROI Multiplier</span>
                        <span className={`text-xl font-bold ${getStatusColor(valueReport.metrics.partnerROI.roiMultiplier, 2.0)}`}>
                          {valueReport.metrics.partnerROI.roiMultiplier.toFixed(1)}x
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Student value: {formatCurrency(valueReport.metrics.partnerROI.estimatedStudentValue)}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Quality Score</div>
                      <div className="flex items-center gap-2">
                        <Progress value={valueReport.qualityScore} className="flex-1 h-2" />
                        <span className="text-sm font-medium">{valueReport.qualityScore}/100</span>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="quality" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Attribution Reliability</CardTitle>
                <p className="text-sm text-muted-foreground">End-to-end tracking accuracy</p>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold mb-2">
                  {Math.round((dashboard?.qualityMetrics.attributionReliability || 0) * 100)}%
                </div>
                <Progress value={(dashboard?.qualityMetrics.attributionReliability || 0) * 100} className="mb-4" />
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Deep Link Success</span>
                    <span className="font-medium">98.2%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Conversion Tracking</span>
                    <span className="font-medium">94.5%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Event Correlation</span>
                    <span className="font-medium">99.1%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Engagement Quality</CardTitle>
                <p className="text-sm text-muted-foreground">Partner-student interaction metrics</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Average CTR</span>
                    <span className="font-medium">{formatPercentage(dashboard?.qualityMetrics.avgCTR || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Qualified Conversion</span>
                    <span className="font-medium">{formatPercentage(dashboard?.qualityMetrics.qualifiedConversionRate || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Quality Score</span>
                    <span className="font-medium">{dashboard?.qualityMetrics.avgQualityScore || 0}/100</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="commitments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Partner Commitment Pipeline</CardTitle>
              <p className="text-sm text-muted-foreground">
                Progress toward Year 2 target: 10-15 committed partners
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 border rounded">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {dashboard?.pilotStatus.paidCommitments || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">Paid Partners</div>
                  </div>
                  <div className="text-center p-4 border rounded">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {dashboard?.pilotStatus.commitmentLetters || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">Commitment Letters</div>
                  </div>
                  <div className="text-center p-4 border rounded">
                    <div className="text-2xl font-bold text-muted-foreground">
                      {(dashboard?.pilotStatus.activePartners || 0) - (dashboard?.pilotStatus.paidCommitments || 0) - (dashboard?.pilotStatus.commitmentLetters || 0)}
                    </div>
                    <div className="text-sm text-muted-foreground">Pilot Partners</div>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">Year 2 Target Progress</span>
                    <span className="text-sm">{dashboard?.year2Progress.currentCommitted || 0} / {dashboard?.year2Progress.targetPartners || 12}</span>
                  </div>
                  <Progress value={dashboard?.year2Progress.progressPercentage || 0} className="h-3" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="experiments" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Listing Fees Model</CardTitle>
                <Badge variant="outline">3 partners enrolled</Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">Basic Tier</span>
                    <span className="text-sm font-medium">$0/month + $45/listing</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Professional Tier</span>
                    <span className="text-sm font-medium">$199/month + $35/listing</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Enterprise Tier</span>
                    <span className="text-sm font-medium">$499/month + $25/listing</span>
                  </div>
                </div>
                <div className="pt-2 border-t">
                  <div className="text-sm text-muted-foreground">Average partner spend/month</div>
                  <div className="text-lg font-bold">$312</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Dashboard Access Model</CardTitle>
                <Badge variant="default">2 partners enrolled</Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">Starter</span>
                    <span className="text-sm font-medium">$299/month</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Growth</span>
                    <span className="text-sm font-medium">$699/month</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Scale</span>
                    <span className="text-sm font-medium">$1,499/month</span>
                  </div>
                </div>
                <div className="pt-2 border-t">
                  <div className="text-sm text-muted-foreground">Average partner spend/month</div>
                  <div className="text-lg font-bold">$699</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}