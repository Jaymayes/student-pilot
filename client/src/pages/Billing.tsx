import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Navigation } from "@/components/Navigation";
import { 
  CreditCard, 
  TrendingUp, 
  History, 
  Zap,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Sparkles
} from "lucide-react";
import { format } from "date-fns";
import { useState, useEffect } from "react";

// Checkout abandonment tracking utility
const CHECKOUT_ABANDONED_KEY = 'scholarlink_checkout_abandoned';

export function markCheckoutStarted(packageCode: string) {
  localStorage.setItem(CHECKOUT_ABANDONED_KEY, JSON.stringify({
    packageCode,
    startedAt: new Date().toISOString(),
    completed: false
  }));
}

export function markCheckoutCompleted() {
  localStorage.removeItem(CHECKOUT_ABANDONED_KEY);
}

export function getAbandonedCheckout(): { packageCode: string; startedAt: string } | null {
  try {
    const data = localStorage.getItem(CHECKOUT_ABANDONED_KEY);
    if (!data) return null;
    const parsed = JSON.parse(data);
    if (parsed.completed) return null;
    // Only return if abandoned within last 7 days
    const startedAt = new Date(parsed.startedAt);
    const now = new Date();
    const daysSinceStart = (now.getTime() - startedAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceStart > 7) {
      localStorage.removeItem(CHECKOUT_ABANDONED_KEY);
      return null;
    }
    return { packageCode: parsed.packageCode, startedAt: parsed.startedAt };
  } catch {
    return null;
  }
}

export function dismissAbandonedCheckout() {
  localStorage.removeItem(CHECKOUT_ABANDONED_KEY);
}

interface BillingSummary {
  currentBalance: number;
  balanceCredits: number;
  balanceUsd: number;
  lifetimeSpent?: number;
  totalPurchased?: number;
  packages: Array<{
    code: string;
    baseCredits: number;
    bonusCredits: number;
    totalCredits: number;
    priceUsd: number;
    recommended?: boolean;
  }>;
  rateCard: Array<{
    id: string;
    model: string;
    inputCreditsPer1k: string;
    outputCreditsPer1k: string;
    active: boolean;
  }>;
  recentActivity: Array<{
    id: string;
    type: 'purchase' | 'deduction' | 'bonus';
    amount: number;
    description: string;
    createdAt: string;
    balanceAfter: number;
  }>;
}

interface LedgerEntry {
  id: string;
  type: 'purchase' | 'deduction' | 'bonus';
  amount: number;
  description: string;
  createdAt: string;
  balanceAfter: number;
  referenceType?: string;
  referenceId?: string;
}

interface UsageEntry {
  id: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  creditsCharged: number;
  description: string;
  createdAt: string;
}

// Credit packages (must match backend) - 1,000 credits = $1.00
const CREDIT_PACKAGES = {
  starter: {
    baseCredits: 9990,
    bonusCredits: 0,
    totalCredits: 9990,
    priceUsdCents: 999, // $9.99
    recommended: false,
    label: "Good for occasional use"
  },
  professional: {
    baseCredits: 49990,
    bonusCredits: 2500, // ~5% bonus
    totalCredits: 52490,
    priceUsdCents: 4999, // $49.99
    recommended: true,
    label: "Best for frequent use • Save vs Starter"
  },
  enterprise: {
    baseCredits: 99990,
    bonusCredits: 10000, // ~10% bonus
    totalCredits: 109990,
    priceUsdCents: 9999, // $99.99
    recommended: false,
    label: "Best value • Highest bonus"
  }
};

export default function Billing() {
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch billing summary
  const { data: summary, isLoading: summaryLoading } = useQuery<BillingSummary>({
    queryKey: ['/api/billing/summary']
  });

  // Fetch transaction history
  const { data: ledgerData, isLoading: ledgerLoading } = useQuery<{
    entries: LedgerEntry[];
    nextCursor?: string;
  }>({
    queryKey: ['/api/billing/ledger'],
    queryFn: () => apiRequest('GET', '/api/billing/ledger?limit=10').then(res => res.json())
  });

  // Fetch usage history  
  const { data: usageData, isLoading: usageLoading } = useQuery<{
    entries: UsageEntry[];
    nextCursor?: string;
  }>({
    queryKey: ['/api/billing/usage'],
    queryFn: () => apiRequest('GET', '/api/billing/usage?limit=10').then(res => res.json())
  });

  // Purchase credits mutation
  const purchaseCredits = useMutation({
    mutationFn: async (packageCode: string) => {
      // Track checkout initiation BEFORE calling API
      markCheckoutStarted(packageCode);
      
      // Emit checkout_initiated event to backend for A8 telemetry
      try {
        await apiRequest('POST', '/api/telemetry/checkout-initiated', { 
          packageCode,
          timestamp: new Date().toISOString()
        });
      } catch {
        // Non-blocking - continue even if telemetry fails
      }
      
      const response = await apiRequest('POST', '/api/billing/create-checkout', { packageCode });
      return response.json() as Promise<{ url: string; sessionId: string; purchaseId: string }>;
    },
    onSuccess: (data) => {
      // Redirect to Stripe checkout
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error) => {
      toast({
        title: "Purchase Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handlePurchase = (packageCode: string) => {
    setSelectedPackage(packageCode);
    purchaseCredits.mutate(packageCode);
  };
  
  // Clear abandoned checkout if user completed purchase (check URL params)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('checkout') === 'success') {
      markCheckoutCompleted();
    }
  }, []);

  if (summaryLoading) {
    return (
      <div className="min-h-screen bg-background-gray">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-20 md:pb-6">
          <div className="space-y-2 mb-8">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-96" />
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {[1, 2, 3].map(i => (
              <Card key={i}>
                <CardHeader className="space-y-0 pb-3">
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-8 w-16" />
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-gray">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-20 md:pb-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2" data-testid="text-billing-title">
            Billing & Credits
          </h1>
          <p className="text-gray-600">
            Manage your ScholarLink credits and view your usage history
          </p>
        </div>

      {/* Low Balance Warning */}
      {summary && summary.currentBalance < 500 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            <div>
              <p className="font-medium text-yellow-800 dark:text-yellow-200">Low Credit Balance</p>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                You have {summary.currentBalance} credits remaining. Consider adding more credits to continue using AI features.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Current Balance Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Balance</CardTitle>
            <Zap className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary?.currentBalance?.toLocaleString() || 0} credits
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              ~${((summary?.currentBalance || 0) / 1000).toFixed(2)} USD equivalent
            </p>
            <p className="text-xs text-muted-foreground">
              1,000 Credits = $1.00. You only pay for actual token usage.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lifetime Spent</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary?.lifetimeSpent?.toLocaleString() || 0} credits
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Total credits used
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Purchased</CardTitle>
            <CreditCard className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary?.totalPurchased?.toLocaleString() || 0} credits
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              All-time purchases
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Credit Packages */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-yellow-500" />
            Purchase Credits
          </CardTitle>
          <CardDescription>
            Choose a credit package that fits your needs. Credits never expire.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {Object.entries(CREDIT_PACKAGES).map(([code, pkg]) => (
              <Card 
                key={code}
                className={`relative cursor-pointer transition-all hover:shadow-md ${
                  pkg.recommended ? 'ring-2 ring-blue-500 ring-offset-2' : ''
                }`}
                onClick={() => handlePurchase(code)}
                data-testid={`credit-package-${code}`}
              >
                {pkg.recommended && (
                  <Badge 
                    className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-blue-500"
                  >
                    Recommended
                  </Badge>
                )}
                <CardHeader className="text-center">
                  <CardTitle className="capitalize">{code}</CardTitle>
                  <div className="text-3xl font-bold text-blue-600">
                    ${(pkg.priceUsdCents / 100).toFixed(2)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-center">
                    <div className="text-lg font-semibold">
                      {pkg.baseCredits.toLocaleString()} credits
                    </div>
                    {pkg.bonusCredits > 0 && (
                      <div className="text-sm text-green-600 font-medium">
                        + {pkg.bonusCredits.toLocaleString()} bonus credits
                      </div>
                    )}
                  </div>
                  
                  <div className="text-center text-sm text-muted-foreground">
                    Total: {pkg.totalCredits.toLocaleString()} credits
                  </div>
                  
                  <div className="text-center text-xs text-muted-foreground">
                    {pkg.label}
                  </div>
                  
                  <Button 
                    className="w-full"
                    disabled={purchaseCredits.isPending && selectedPackage === code}
                    data-testid={`button-purchase-${code}`}
                  >
                    {purchaseCredits.isPending && selectedPackage === code ? (
                      "Processing..."
                    ) : (
                      "Purchase"
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
              <div className="space-y-2 text-sm">
                <div className="font-medium">Secure & Transparent</div>
                <div className="text-muted-foreground">
                  All payments processed securely through Stripe. Credits are prepaid: 1,000 Credits = $1.00. 
                  You only pay for actual token usage. Credits added instantly after payment confirmation.
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity & Usage History */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Transaction History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Recent Transactions
            </CardTitle>
            <CardDescription>Your recent credit activity</CardDescription>
          </CardHeader>
          <CardContent>
            {ledgerLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {ledgerData?.entries?.slice(0, 5).map((entry: LedgerEntry) => (
                  <div key={entry.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-1 rounded-full ${
                        entry.type === 'purchase' ? 'bg-green-100 text-green-600' :
                        entry.type === 'bonus' ? 'bg-blue-100 text-blue-600' :
                        'bg-red-100 text-red-600'
                      }`}>
                        {entry.type === 'purchase' ? 
                          <ArrowDownRight className="h-3 w-3" /> :
                        entry.type === 'bonus' ?
                          <Sparkles className="h-3 w-3" /> :
                          <ArrowUpRight className="h-3 w-3" />
                        }
                      </div>
                      <div>
                        <div className="font-medium text-sm">
                          {entry.description}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(entry.createdAt), 'MMM d, h:mm a')}
                        </div>
                      </div>
                    </div>
                    <div className={`font-medium text-sm ${
                      entry.type === 'deduction' ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {entry.type === 'deduction' ? '-' : '+'}{entry.amount.toLocaleString()}
                    </div>
                  </div>
                ))}
                
                {(!ledgerData?.entries || ledgerData.entries.length === 0) && (
                  <div className="text-center text-muted-foreground py-8">
                    <Clock className="h-12 w-12 mx-auto mb-2 opacity-20" />
                    <div>No transactions yet</div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Usage History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              AI Usage History
            </CardTitle>
            <CardDescription>Your recent AI assistant usage</CardDescription>
          </CardHeader>
          <CardContent>
            {usageLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                    <Skeleton className="h-4 w-12" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {usageData?.entries?.slice(0, 5).map((usage: UsageEntry) => (
                  <div key={usage.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {usage.model}
                        </Badge>
                        <span className="text-sm font-medium">
                          {usage.creditsCharged} credits
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(usage.createdAt), 'MMM d, h:mm a')}
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {usage.description}
                    </div>
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <span>Input: {usage.inputTokens.toLocaleString()} tokens</span>
                      <span>Output: {usage.outputTokens.toLocaleString()} tokens</span>
                    </div>
                  </div>
                ))}
                
                {(!usageData?.entries || usageData.entries.length === 0) && (
                  <div className="text-center text-muted-foreground py-8">
                    <Zap className="h-12 w-12 mx-auto mb-2 opacity-20" />
                    <div>No AI usage yet</div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Cost Estimator */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Cost Estimator
          </CardTitle>
          <CardDescription>
            Estimate credits and USD cost before making AI requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="text-sm font-medium">Model</label>
              <select className="w-full p-2 border rounded-md mt-1">
                <option value="gpt-4o-mini">gpt-4o-mini (Eco)</option>
                <option value="gpt-4o">gpt-4o (Advanced)</option>
                <option value="gpt-4-turbo">gpt-4-turbo</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Input Tokens</label>
              <input 
                type="number" 
                placeholder="1000"
                className="w-full p-2 border rounded-md mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Output Tokens</label>
              <input 
                type="number" 
                placeholder="500"
                className="w-full p-2 border rounded-md mt-1"
              />
            </div>
          </div>
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
            <div className="text-sm">
              <div className="font-medium mb-1">Estimated Cost</div>
              <div className="text-muted-foreground">
                ~12 credits (~$0.012 USD) • Select model and tokens above for estimate
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rate Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            AI Model Pricing
          </CardTitle>
          <CardDescription>
            Current credit rates per 1,000 tokens. Example: gpt-4o input ≈ 20 credits per 1k tokens ($0.02); output ≈ 80 credits per 1k tokens ($0.08).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 font-medium">Model</th>
                  <th className="text-center py-2 font-medium">Input (1k tokens)</th>
                  <th className="text-center py-2 font-medium">Output (1k tokens)</th>
                  <th className="text-center py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                <tr>
                  <td className="py-3">
                    <div>
                      <div className="font-medium">gpt-4o-mini</div>
                      <div className="text-xs text-muted-foreground">Eco (Fast & Affordable)</div>
                    </div>
                  </td>
                  <td className="text-center py-3">2.4 credits</td>
                  <td className="text-center py-3">9.6 credits</td>
                  <td className="text-center py-3">
                    <Badge variant="secondary" className="bg-green-100 text-green-800">Active</Badge>
                  </td>
                </tr>
                <tr>
                  <td className="py-3">
                    <div>
                      <div className="font-medium">gpt-4o</div>
                      <div className="text-xs text-muted-foreground">Advanced (Latest & Most Capable)</div>
                    </div>
                  </td>
                  <td className="text-center py-3">20 credits</td>
                  <td className="text-center py-3">80 credits</td>
                  <td className="text-center py-3">
                    <Badge variant="secondary" className="bg-green-100 text-green-800">Active</Badge>
                  </td>
                </tr>
                <tr>
                  <td className="py-3">
                    <div>
                      <div className="font-medium">gpt-4-turbo</div>
                      <div className="text-xs text-muted-foreground">Previous Generation</div>
                    </div>
                  </td>
                  <td className="text-center py-3">40 credits</td>
                  <td className="text-center py-3">120 credits</td>
                  <td className="text-center py-3">
                    <Badge variant="secondary" className="bg-green-100 text-green-800">Active</Badge>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg text-sm">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5 text-blue-500 flex-shrink-0" />
              <div>
                <div className="font-medium mb-1">Transparent Pricing</div>
                <div className="text-muted-foreground">
                  Credits are prepaid. 1,000 Credits = $1.00. You only pay for actual token usage. 
                  Rates are 4x OpenAI's pricing to cover infrastructure and development costs. USD equivalent is approximate.
                  Last updated: {format(new Date(), 'MMM d, yyyy')}.
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Success/Error Messages */}
      {typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('success') && (
        <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <div>
                <div className="font-medium text-green-900 dark:text-green-100">
                  Payment Successful!
                </div>
                <div className="text-sm text-green-700 dark:text-green-200">
                  Your credits have been added to your account.
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('canceled') && (
        <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              <div>
                <div className="font-medium text-yellow-900 dark:text-yellow-100">
                  Payment Canceled
                </div>
                <div className="text-sm text-yellow-700 dark:text-yellow-200">
                  Your payment was canceled. You can try again anytime.
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      </div>
    </div>
  );
}