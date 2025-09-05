import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { 
  LineChart, 
  Line, 
  AreaChart,
  Area,
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  TrendingUp, 
  Users, 
  MousePointer, 
  Heart, 
  Send, 
  Target,
  CheckCircle,
  AlertCircle,
  XCircle,
  BarChart3,
  Activity
} from 'lucide-react';

interface KpiMetrics {
  dateKey: string;
  totalRecommendations: number;
  totalClicks: number;
  totalSaves: number;
  totalApplies: number;
  clickThroughRate: number;
  saveRate: number;
  applyRate: number;
  averageRecommendationRank: number;
}

interface ValidationResult {
  fixtureId: string;
  fixtureName: string;
  status: 'pass' | 'fail' | 'warning';
  metrics: {
    precisionAtN: number;
    recallAtN: number;
    meanAverageScore: number;
    expectedFound: number;
    expectedInTopN: number;
    executionTimeMs: number;
  };
  details: string[];
}

const STATUS_COLORS = {
  pass: '#10b981',
  warning: '#f59e0b', 
  fail: '#ef4444'
};

export default function RecommendationAnalytics() {
  const [selectedPeriod, setSelectedPeriod] = useState('7');
  const [validationRunning, setValidationRunning] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch KPI metrics
  const { data: kpiData, isLoading: kpiLoading } = useQuery({
    queryKey: ['/api/recommendations/kpis', selectedPeriod],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/recommendations/kpis?days=${selectedPeriod}`);
      return response.json();
    },
  });

  // Fetch analytics data
  const { data: analyticsData, isLoading: analyticsLoading } = useQuery({
    queryKey: ['/api/recommendations/analytics', selectedPeriod],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/recommendations/analytics?days=${selectedPeriod}`);
      return response.json();
    },
  });

  // Initialize fixtures mutation
  const initFixturesMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/recommendations/fixtures/init', {});
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Fixtures Initialized",
        description: "Ground-truth fixtures have been set up successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/recommendations/validate'] });
    },
    onError: (error: any) => {
      toast({
        title: "Initialization Failed",
        description: error.message || "Failed to initialize fixtures",
        variant: "destructive",
      });
    }
  });

  // Run validation mutation
  const runValidationMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/recommendations/validate', { topN: 5 });
      return response.json();
    },
    onSuccess: (data) => {
      setValidationRunning(false);
      toast({
        title: "Validation Complete",
        description: `Validated ${data.validationResults?.length || 0} fixtures`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/recommendations/validate'] });
    },
    onError: (error: any) => {
      setValidationRunning(false);
      toast({
        title: "Validation Failed",
        description: error.message || "Failed to run validation",
        variant: "destructive",
      });
    }
  });

  // Fetch latest validation results
  const { data: validationData, isLoading: validationLoading } = useQuery({
    queryKey: ['/api/recommendations/validate'],
    queryFn: async () => {
      const response = await apiRequest('POST', '/api/recommendations/validate', { topN: 5 });
      return response.json();
    },
    retry: false,
    enabled: false // Manual trigger only
  });

  const handleRunValidation = async () => {
    setValidationRunning(true);
    runValidationMutation.mutate();
  };

  const formatPercentage = (value: number) => `${(value * 100).toFixed(1)}%`;
  const formatNumber = (value: number) => value.toLocaleString();

  if (kpiLoading || analyticsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]" data-testid="loading-spinner">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold" data-testid="page-title">Recommendation Analytics</h1>
          <p className="text-muted-foreground">Monitor recommendation performance and validation metrics</p>
        </div>
        
        <div className="flex items-center gap-4">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-32" data-testid="period-selector">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 days</SelectItem>
              <SelectItem value="14">14 days</SelectItem>
              <SelectItem value="30">30 days</SelectItem>
              <SelectItem value="90">90 days</SelectItem>
            </SelectContent>
          </Select>
          
          <Button
            onClick={() => initFixturesMutation.mutate()}
            variant="outline"
            disabled={initFixturesMutation.isPending}
            data-testid="button-init-fixtures"
          >
            Initialize Fixtures
          </Button>
          
          <Button
            onClick={handleRunValidation}
            disabled={validationRunning}
            data-testid="button-run-validation"
          >
            {validationRunning ? 'Running...' : 'Run Validation'}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="kpis" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="kpis">KPI Dashboard</TabsTrigger>
          <TabsTrigger value="validation">Validation Results</TabsTrigger>
          <TabsTrigger value="analytics">Deep Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="kpis" className="space-y-6">
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card data-testid="card-total-recommendations">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Recommendations</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="metric-total-recommendations">
                  {formatNumber(kpiData?.summary?.totalRecommendations || 0)}
                </div>
                <p className="text-xs text-muted-foreground">Last {selectedPeriod} days</p>
              </CardContent>
            </Card>

            <Card data-testid="card-click-through-rate">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Click-Through Rate</CardTitle>
                <MousePointer className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="metric-ctr">
                  {formatPercentage(kpiData?.summary?.overallCtr || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatNumber(kpiData?.summary?.totalClicks || 0)} clicks
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-save-rate">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Save Rate</CardTitle>
                <Heart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="metric-save-rate">
                  {formatPercentage(kpiData?.summary?.overallSaveRate || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatNumber(kpiData?.summary?.totalSaves || 0)} saves
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-apply-rate">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Apply Rate</CardTitle>
                <Send className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="metric-apply-rate">
                  {formatPercentage(kpiData?.summary?.overallApplyRate || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatNumber(kpiData?.summary?.totalApplies || 0)} applies
                </p>
              </CardContent>
            </Card>
          </div>

          {/* KPI Trends Chart */}
          <Card data-testid="card-kpi-trends">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                KPI Trends
              </CardTitle>
              <CardDescription>Daily recommendation performance metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={kpiData?.metrics || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="dateKey" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value: number, name: string) => [
                        name.includes('Rate') ? formatPercentage(value) : formatNumber(value), 
                        name
                      ]}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="clickThroughRate" 
                      stroke="#8884d8" 
                      name="CTR"
                      strokeWidth={2}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="saveRate" 
                      stroke="#82ca9d" 
                      name="Save Rate"
                      strokeWidth={2}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="applyRate" 
                      stroke="#ffc658" 
                      name="Apply Rate"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Top Performing Scholarships */}
          <Card data-testid="card-top-scholarships">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Top Performing Scholarships
              </CardTitle>
              <CardDescription>Most engaged scholarships in the last {selectedPeriod} days</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {kpiData?.topScholarships?.slice(0, 5).map((scholarship: any, index: number) => (
                  <div key={scholarship.scholarshipId} className="flex items-center justify-between p-4 border rounded-lg" data-testid={`scholarship-${index}`}>
                    <div>
                      <p className="font-medium" data-testid={`scholarship-id-${index}`}>{scholarship.scholarshipId}</p>
                      <p className="text-sm text-muted-foreground">
                        Avg. Rank: {scholarship.averageRank.toFixed(1)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium" data-testid={`scholarship-interactions-${index}`}>
                        {formatNumber(scholarship.totalInteractions)} interactions
                      </p>
                      <div className="flex gap-4 text-sm text-muted-foreground">
                        <span>{scholarship.totalClicks} clicks</span>
                        <span>{scholarship.totalSaves} saves</span>
                        <span>{scholarship.totalApplies} applies</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="validation" className="space-y-6">
          <Card data-testid="card-validation-overview">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Validation Overview
              </CardTitle>
              <CardDescription>
                Recommendation quality validation against ground-truth fixtures
              </CardDescription>
            </CardHeader>
            <CardContent>
              {validationData?.summary && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="text-center" data-testid="validation-total">
                    <div className="text-2xl font-bold">{validationData.summary.totalFixtures}</div>
                    <div className="text-sm text-muted-foreground">Total Fixtures</div>
                  </div>
                  <div className="text-center" data-testid="validation-passed">
                    <div className="text-2xl font-bold text-green-600">{validationData.summary.passedFixtures}</div>
                    <div className="text-sm text-muted-foreground">Passed</div>
                  </div>
                  <div className="text-center" data-testid="validation-warnings">
                    <div className="text-2xl font-bold text-yellow-600">{validationData.summary.warningFixtures}</div>
                    <div className="text-sm text-muted-foreground">Warnings</div>
                  </div>
                  <div className="text-center" data-testid="validation-failed">
                    <div className="text-2xl font-bold text-red-600">{validationData.summary.failedFixtures}</div>
                    <div className="text-sm text-muted-foreground">Failed</div>
                  </div>
                </div>
              )}

              {validationData?.validationResults && (
                <div className="space-y-4">
                  <h4 className="font-medium">Fixture Results</h4>
                  {validationData.validationResults.map((result: ValidationResult, index: number) => (
                    <div key={result.fixtureId} className="border rounded-lg p-4" data-testid={`fixture-result-${index}`}>
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h5 className="font-medium" data-testid={`fixture-name-${index}`}>{result.fixtureName}</h5>
                          <Badge 
                            variant={result.status === 'pass' ? 'default' : result.status === 'warning' ? 'secondary' : 'destructive'}
                            data-testid={`fixture-status-${index}`}
                          >
                            {result.status}
                          </Badge>
                        </div>
                        <div className="text-right text-sm">
                          <div data-testid={`fixture-precision-${index}`}>Precision: {formatPercentage(result.metrics.precisionAtN)}</div>
                          <div data-testid={`fixture-recall-${index}`}>Recall: {formatPercentage(result.metrics.recallAtN)}</div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                        <div>
                          <div className="text-sm text-muted-foreground">Mean Score</div>
                          <div className="font-medium" data-testid={`fixture-score-${index}`}>{result.metrics.meanAverageScore.toFixed(1)}</div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">Expected Found</div>
                          <div className="font-medium" data-testid={`fixture-found-${index}`}>{result.metrics.expectedFound}/{result.metrics.expectedInTopN}</div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">Execution Time</div>
                          <div className="font-medium" data-testid={`fixture-time-${index}`}>{result.metrics.executionTimeMs}ms</div>
                        </div>
                        <div>
                          <Progress 
                            value={result.metrics.precisionAtN * 100} 
                            className="mt-1"
                            data-testid={`fixture-progress-${index}`}
                          />
                        </div>
                      </div>

                      <div className="text-sm">
                        <details>
                          <summary className="cursor-pointer font-medium mb-2">View Details</summary>
                          <ul className="space-y-1 text-muted-foreground">
                            {result.details.map((detail, idx) => (
                              <li key={idx} data-testid={`fixture-detail-${index}-${idx}`}>• {detail}</li>
                            ))}
                          </ul>
                        </details>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Interaction Funnel */}
            <Card data-testid="card-interaction-funnel">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Conversion Funnel
                </CardTitle>
                <CardDescription>User interaction flow through recommendations</CardDescription>
              </CardHeader>
              <CardContent>
                {analyticsData?.interactionSummary?.conversionFunnel && (
                  <div className="space-y-4">
                    {[
                      { label: 'Views', value: analyticsData.interactionSummary.conversionFunnel.views, color: '#8884d8' },
                      { label: 'Clicks', value: analyticsData.interactionSummary.conversionFunnel.clicks, color: '#82ca9d' },
                      { label: 'Saves', value: analyticsData.interactionSummary.conversionFunnel.saves, color: '#ffc658' },
                      { label: 'Applies', value: analyticsData.interactionSummary.conversionFunnel.applies, color: '#ff7300' },
                    ].map((step, index) => (
                      <div key={step.label} className="flex items-center gap-4" data-testid={`funnel-step-${index}`}>
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: step.color }}
                        />
                        <div className="flex-1">
                          <div className="flex justify-between items-center">
                            <span className="font-medium">{step.label}</span>
                            <span className="text-sm text-muted-foreground" data-testid={`funnel-value-${index}`}>
                              {formatNumber(step.value)}
                            </span>
                          </div>
                          <Progress 
                            value={index === 0 ? 100 : (step.value / analyticsData.interactionSummary.conversionFunnel.views) * 100}
                            className="mt-1"
                            data-testid={`funnel-progress-${index}`}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Rank Distribution */}
            <Card data-testid="card-rank-distribution">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Click by Rank Position
                </CardTitle>
                <CardDescription>Which recommendation positions get the most clicks</CardDescription>
              </CardHeader>
              <CardContent>
                {analyticsData?.interactionSummary?.byRank && (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={Object.entries(analyticsData.interactionSummary.byRank).map(([rank, count]) => ({
                        rank: `#${rank}`,
                        clicks: count
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="rank" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="clicks" fill="#8884d8" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent Metrics Trend */}
          <Card data-testid="card-recent-trends">
            <CardHeader>
              <CardTitle>Recent Performance Trends</CardTitle>
              <CardDescription>Daily breakdown of recommendation metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analyticsData?.recentMetrics || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="dateKey" />
                    <YAxis />
                    <Tooltip formatter={(value: number, name: string) => [formatNumber(value), name]} />
                    <Area 
                      type="monotone" 
                      dataKey="totalRecommendations" 
                      stackId="1"
                      stroke="#8884d8" 
                      fill="#8884d8" 
                      name="Recommendations"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="totalClicks" 
                      stackId="2"
                      stroke="#82ca9d" 
                      fill="#82ca9d" 
                      name="Clicks"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="totalSaves" 
                      stackId="3"
                      stroke="#ffc658" 
                      fill="#ffc658" 
                      name="Saves"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}