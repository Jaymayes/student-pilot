import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  CreditCard, 
  TrendingUp, 
  History, 
  Zap,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Sparkles
} from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";

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

// Credit packages (must match backend)
const CREDIT_PACKAGES = {
  starter: {
    baseCredits: 1000,
    bonusCredits: 0,
    totalCredits: 1000,
    priceUsdCents: 999, // $9.99
    recommended: false
  },
  professional: {
    baseCredits: 5000,
    bonusCredits: 500,
    totalCredits: 5500,
    priceUsdCents: 4999, // $49.99
    recommended: true
  },
  enterprise: {
    baseCredits: 12000,
    bonusCredits: 2000,
    totalCredits: 14000,
    priceUsdCents: 9999, // $99.99
    recommended: false
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
    hasMore: boolean;
    nextCursor?: string;
  }>({
    queryKey: ['/api/billing/ledger'],
    queryFn: () => apiRequest('GET', '/api/billing/ledger?limit=10').then(res => res.json())
  });

  // Fetch usage history  
  const { data: usageData, isLoading: usageLoading } = useQuery<{
    entries: UsageEntry[];
    hasMore: boolean;
    nextCursor?: string;
  }>({
    queryKey: ['/api/billing/usage'],
    queryFn: () => apiRequest('GET', '/api/billing/usage?limit=10').then(res => res.json())
  });

  // Purchase credits mutation
  const purchaseCredits = useMutation({
    mutationFn: (packageCode: string) => 
      apiRequest('POST', '/api/billing/create-checkout', { packageCode }),
    onSuccess: (data: { url: string }) => {
      // Redirect to Stripe checkout
      window.location.href = data.url;
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

  if (summaryLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="space-y-2">
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
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Billing & Credits</h1>
        <p className="text-muted-foreground">
          Manage your ScholarLink credits and view your usage history
        </p>
      </div>

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
              Available for AI assistance
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
                    ~{Math.floor(pkg.totalCredits / 30)} essay analyses
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
                <div className="font-medium">Secure Payment</div>
                <div className="text-muted-foreground">
                  All payments are processed securely through Stripe. 
                  Credits are added to your account instantly after payment confirmation.
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
  );
}