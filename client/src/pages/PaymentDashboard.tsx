import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { apiRequest } from '@/lib/queryClient';
import { isUnauthorizedError } from '@/lib/authUtils';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  Users, 
  RefreshCw,
  AlertCircle,
  CheckCircle,
  XCircle,
  BarChart3,
  PieChart,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Target,
  Zap
} from 'lucide-react';

interface PaymentKpis {
  conversion: {
    totalUsers: number;
    paidUsers: number;
    conversionRate: number;
    firstTimePayerThisMonth: number;
    returningPayerThisMonth: number;
    conversionFunnel: {
      signups: number;
      profileCompleted: number;
      firstCredit: number;
      firstPurchase: number;
      secondPurchase: number;
    };
  };
  arpu: {
    overallArpu: number;
    arpuThisMonth: number;
    arpuBySegment: {
      newUsers: number;
      returning: number;
      enterprise: number;
    };
    lifetimeValue: {
      average: number;
      median: number;
      top10Percent: number;
    };
    revenueGrowth: {
      monthOverMonth: number;
      quarterOverQuarter: number;
    };
  };
  refunds: {
    refundRate: number;
    refundAmount: {
      totalThisMonth: number;
      totalAllTime: number;
      averageRefundAmount: number;
    };
    refundReasons: Record<string, number>;
    refundTiming: Record<string, number>;
    edgeCases: Record<string, number>;
  };
  summary: {
    totalRevenue: number;
    totalRevenueThisMonth: number;
    activePayingUsers: number;
    churnRate: number;
    healthScore: number;
  };
  trends: {
    daily: Array<{
      date: string;
      revenue: number;
      purchases: number;
      refunds: number;
      newPayers: number;
    }>;
    monthly: Array<{
      month: string;
      revenue: number;
      arpu: number;
      conversionRate: number;
      refundRate: number;
    }>;
  };
}

interface RefundRequest {
  purchaseId: string;
  refundType: 'full' | 'partial';
  amount?: number;
  reason: string;
  adminNotes?: string;
}

export default function PaymentDashboard() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  
  const [refundDialog, setRefundDialog] = useState({
    open: false,
    purchaseId: '',
    refundType: 'full' as 'full' | 'partial',
    amount: 0,
    reason: '',
    adminNotes: ''
  });

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, authLoading, toast]);

  // Fetch payment KPIs
  const { data: kpis, isLoading: kpisLoading, refetch: refetchKpis } = useQuery<{ kpis: PaymentKpis }>({
    queryKey: ['/api/billing/kpis', dateRange],
    queryFn: () => apiRequest('GET', `/api/billing/kpis?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`).then(res => res.json()),
    retry: false,
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });

  // Fetch KPI alerts
  const { data: alerts } = useQuery<{ alerts: any[] }>({
    queryKey: ['/api/billing/kpi-alerts'],
    queryFn: () => apiRequest('GET', '/api/billing/kpi-alerts').then(res => res.json()),
    retry: false,
    refetchInterval: 2 * 60 * 1000, // Check alerts every 2 minutes
  });

  // Fetch user refunds
  const { data: refunds } = useQuery<{ refunds: any[] }>({
    queryKey: ['/api/billing/refunds'],
    queryFn: () => apiRequest('GET', '/api/billing/refunds').then(res => res.json()),
    retry: false,
  });

  // Process refund mutation
  const refundMutation = useMutation({
    mutationFn: async (request: RefundRequest) => {
      const response = await apiRequest('POST', '/api/billing/refund', request);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/billing/refunds'] });
      queryClient.invalidateQueries({ queryKey: ['/api/billing/kpis'] });
      toast({
        title: "Refund Processed",
        description: "The refund has been processed successfully",
      });
      setRefundDialog({ ...refundDialog, open: false });
    },
    onError: (error: any) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Refund Failed",
        description: error.message || "Failed to process refund",
        variant: "destructive",
      });
    },
  });

  if (authLoading || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[400px]" data-testid="loading-spinner">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const kpiData = kpis?.kpis;

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2" data-testid="page-title">
            <BarChart3 className="h-8 w-8 text-primary" />
            Payment Analytics Dashboard
          </h1>
          <p className="text-muted-foreground">
            Comprehensive payment KPIs: Conversion, ARPU, Refund Rate & more
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Label>Date Range:</Label>
            <Input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
              className="w-40"
              data-testid="input-start-date"
            />
            <span>to</span>
            <Input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
              className="w-40"
              data-testid="input-end-date"
            />
          </div>
          <Button 
            onClick={() => refetchKpis()} 
            disabled={kpisLoading}
            data-testid="button-refresh"
          >
            <RefreshCw className={`h-4 w-4 ${kpisLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* KPI Alerts */}
      {alerts && alerts.alerts.length > 0 && (
        <Alert data-testid="kpi-alerts">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <span>
                {alerts.alerts.filter(a => a.type === 'critical').length} critical alerts, {' '}
                {alerts.alerts.filter(a => a.type === 'warning').length} warnings
              </span>
              <div className="flex gap-2">
                {alerts.alerts.map((alert, index) => (
                  <Badge 
                    key={index}
                    variant={alert.type === 'critical' ? 'destructive' : 'secondary'}
                    data-testid={`alert-${index}`}
                  >
                    {alert.message}
                  </Badge>
                ))}
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Summary Cards */}
      {kpiData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card data-testid="card-revenue">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="value-total-revenue">
                ${kpiData.summary.totalRevenue.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                ${kpiData.summary.totalRevenueThisMonth.toLocaleString()} this month
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-conversion">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="value-conversion-rate">
                {kpiData.conversion.conversionRate.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">
                {kpiData.conversion.paidUsers} of {kpiData.conversion.totalUsers} users
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-arpu">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">ARPU</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="value-arpu">
                ${kpiData.arpu.arpuThisMonth.toFixed(2)}
              </div>
              <div className="flex items-center text-xs text-muted-foreground">
                {kpiData.arpu.revenueGrowth.monthOverMonth >= 0 ? (
                  <ArrowUpRight className="h-3 w-3 text-green-600" />
                ) : (
                  <ArrowDownRight className="h-3 w-3 text-red-600" />
                )}
                <span className={kpiData.arpu.revenueGrowth.monthOverMonth >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {Math.abs(kpiData.arpu.revenueGrowth.monthOverMonth).toFixed(1)}% MoM
                </span>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-refund-rate">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Refund Rate</CardTitle>
              <RefreshCw className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="value-refund-rate">
                {kpiData.refunds.refundRate.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">
                ${kpiData.refunds.refundAmount.totalThisMonth.toLocaleString()} this month
              </p>
            </CardContent>
          </Card>

          <Card className="lg:col-span-4" data-testid="card-health-score">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Payment Health Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Progress 
                    value={kpiData.summary.healthScore} 
                    className="h-3"
                    data-testid="health-score-progress"
                  />
                </div>
                <div className="text-2xl font-bold" data-testid="health-score-value">
                  {kpiData.summary.healthScore}/100
                </div>
              </div>
              <div className="flex items-center justify-between text-sm text-muted-foreground mt-2">
                <span>Based on conversion, refund rates, and growth metrics</span>
                <Badge 
                  variant={kpiData.summary.healthScore >= 80 ? "default" : kpiData.summary.healthScore >= 60 ? "secondary" : "destructive"}
                  data-testid="health-score-badge"
                >
                  {kpiData.summary.healthScore >= 80 ? "Excellent" : kpiData.summary.healthScore >= 60 ? "Good" : "Needs Attention"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="conversion">Conversion</TabsTrigger>
          <TabsTrigger value="arpu">ARPU</TabsTrigger>
          <TabsTrigger value="refunds">Refunds</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {kpiData && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card data-testid="card-conversion-funnel">
                <CardHeader>
                  <CardTitle>Conversion Funnel</CardTitle>
                  <CardDescription>User journey from signup to repeat purchase</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span>Signups</span>
                      <span className="font-bold">{kpiData.conversion.conversionFunnel.signups}</span>
                    </div>
                    <Progress value={100} className="h-2" />
                    
                    <div className="flex justify-between items-center">
                      <span>Profile Completed</span>
                      <span className="font-bold">{kpiData.conversion.conversionFunnel.profileCompleted}</span>
                    </div>
                    <Progress 
                      value={(kpiData.conversion.conversionFunnel.profileCompleted / kpiData.conversion.conversionFunnel.signups) * 100} 
                      className="h-2" 
                    />
                    
                    <div className="flex justify-between items-center">
                      <span>First Credit Usage</span>
                      <span className="font-bold">{kpiData.conversion.conversionFunnel.firstCredit}</span>
                    </div>
                    <Progress 
                      value={(kpiData.conversion.conversionFunnel.firstCredit / kpiData.conversion.conversionFunnel.signups) * 100} 
                      className="h-2" 
                    />
                    
                    <div className="flex justify-between items-center">
                      <span>First Purchase</span>
                      <span className="font-bold">{kpiData.conversion.conversionFunnel.firstPurchase}</span>
                    </div>
                    <Progress 
                      value={(kpiData.conversion.conversionFunnel.firstPurchase / kpiData.conversion.conversionFunnel.signups) * 100} 
                      className="h-2" 
                    />
                    
                    <div className="flex justify-between items-center">
                      <span>Repeat Purchase</span>
                      <span className="font-bold">{kpiData.conversion.conversionFunnel.secondPurchase}</span>
                    </div>
                    <Progress 
                      value={(kpiData.conversion.conversionFunnel.secondPurchase / kpiData.conversion.conversionFunnel.signups) * 100} 
                      className="h-2" 
                    />
                  </div>
                </CardContent>
              </Card>

              <Card data-testid="card-arpu-breakdown">
                <CardHeader>
                  <CardTitle>ARPU by Segment</CardTitle>
                  <CardDescription>Average revenue per user by customer type</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        ${kpiData.arpu.arpuBySegment.newUsers.toFixed(2)}
                      </div>
                      <div className="text-sm text-muted-foreground">New Users</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        ${kpiData.arpu.arpuBySegment.returning.toFixed(2)}
                      </div>
                      <div className="text-sm text-muted-foreground">Returning</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        ${kpiData.arpu.arpuBySegment.enterprise.toFixed(2)}
                      </div>
                      <div className="text-sm text-muted-foreground">Enterprise</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">
                        ${kpiData.arpu.lifetimeValue.average.toFixed(2)}
                      </div>
                      <div className="text-sm text-muted-foreground">Avg LTV</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="refunds" className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Refund Management</h3>
            <Dialog open={refundDialog.open} onOpenChange={(open) => setRefundDialog({ ...refundDialog, open })}>
              <DialogTrigger asChild>
                <Button data-testid="button-new-refund">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Process Refund
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md" data-testid="dialog-refund">
                <DialogHeader>
                  <DialogTitle>Process Refund</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Purchase ID</Label>
                    <Input
                      value={refundDialog.purchaseId}
                      onChange={(e) => setRefundDialog({ ...refundDialog, purchaseId: e.target.value })}
                      placeholder="Enter purchase ID"
                      data-testid="input-purchase-id"
                    />
                  </div>
                  
                  <div>
                    <Label>Refund Type</Label>
                    <Select value={refundDialog.refundType} onValueChange={(value) => setRefundDialog({ ...refundDialog, refundType: value as 'full' | 'partial' })}>
                      <SelectTrigger data-testid="select-refund-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="full">Full Refund</SelectItem>
                        <SelectItem value="partial">Partial Refund</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {refundDialog.refundType === 'partial' && (
                    <div>
                      <Label>Refund Amount (USD cents)</Label>
                      <Input
                        type="number"
                        value={refundDialog.amount}
                        onChange={(e) => setRefundDialog({ ...refundDialog, amount: parseInt(e.target.value) })}
                        placeholder="Amount in cents"
                        data-testid="input-refund-amount"
                      />
                    </div>
                  )}

                  <div>
                    <Label>Reason</Label>
                    <Select value={refundDialog.reason} onValueChange={(value) => setRefundDialog({ ...refundDialog, reason: value })}>
                      <SelectTrigger data-testid="select-refund-reason">
                        <SelectValue placeholder="Select reason" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="requested_by_customer">Customer Request</SelectItem>
                        <SelectItem value="fraudulent">Fraudulent</SelectItem>
                        <SelectItem value="duplicate">Duplicate</SelectItem>
                        <SelectItem value="product_unsatisfactory">Product Issue</SelectItem>
                        <SelectItem value="system_error">System Error</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Admin Notes</Label>
                    <Textarea
                      value={refundDialog.adminNotes}
                      onChange={(e) => setRefundDialog({ ...refundDialog, adminNotes: e.target.value })}
                      placeholder="Optional notes"
                      data-testid="input-admin-notes"
                    />
                  </div>

                  <Button 
                    onClick={() => refundMutation.mutate({
                      purchaseId: refundDialog.purchaseId,
                      refundType: refundDialog.refundType,
                      amount: refundDialog.refundType === 'partial' ? refundDialog.amount : undefined,
                      reason: refundDialog.reason,
                      adminNotes: refundDialog.adminNotes
                    })}
                    disabled={refundMutation.isPending || !refundDialog.purchaseId || !refundDialog.reason}
                    className="w-full"
                    data-testid="button-submit-refund"
                  >
                    {refundMutation.isPending ? 'Processing...' : 'Process Refund'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {refunds && (
            <Card data-testid="card-refund-history">
              <CardHeader>
                <CardTitle>Recent Refunds</CardTitle>
                <CardDescription>Your refund transaction history</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {refunds.refunds.map((refund, index) => (
                    <div key={refund.id} className="flex justify-between items-center p-3 bg-muted rounded" data-testid={`refund-${index}`}>
                      <div>
                        <div className="font-medium">{refund.amountCredits} credits</div>
                        <div className="text-sm text-muted-foreground">
                          {refund.reason} • {new Date(refund.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <Badge variant="outline">{refund.referenceType}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Other tabs would be implemented similarly with their respective visualizations */}
        <TabsContent value="conversion">
          <Card>
            <CardHeader>
              <CardTitle>Conversion Metrics</CardTitle>
              <CardDescription>Detailed conversion analysis coming soon</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-muted-foreground">Detailed conversion charts and analysis will be available here.</div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="arpu">
          <Card>
            <CardHeader>
              <CardTitle>ARPU Analysis</CardTitle>
              <CardDescription>Revenue per user trends and segmentation</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-muted-foreground">Detailed ARPU charts and trends will be available here.</div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends">
          <Card>
            <CardHeader>
              <CardTitle>Payment Trends</CardTitle>
              <CardDescription>Historical payment patterns and forecasting</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-muted-foreground">Trend analysis and forecasting charts will be available here.</div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}