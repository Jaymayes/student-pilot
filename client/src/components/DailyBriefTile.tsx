import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  DollarSign, 
  TrendingUp, 
  Target,
  Calendar,
  ArrowUpRight,
  BarChart3
} from 'lucide-react';

interface ArrMetricsResponse {
  dailyBrief: {
    date: string;
    realizedRevenue: {
      allTimeCents: number;
      allTimeUsd: number;
      ytdCents: number;
      ytdUsd: number;
      last30DaysCents: number;
      last30DaysUsd: number;
      last7DaysCents: number;
      last7DaysUsd: number;
    };
    modeledArr: {
      annualizedCents: number;
      annualizedUsd: number;
      monthlyRunRateCents: number;
      monthlyRunRateUsd: number;
      weeklyVelocityCents: number;
      weeklyVelocityUsd: number;
    };
    targets: {
      yearOneTargetCents: number;
      yearOneTargetUsd: number;
      fiveYearArrTargetCents: number;
      fiveYearArrTargetUsd: number;
      progressToYearOneTarget: number;
    };
    transactionMetrics: {
      totalTransactions: number;
      avgTransactionCents: number;
      avgTransactionUsd: number;
    };
  };
  metadata: {
    generatedAt: string;
    correlationId: string;
  };
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatCurrencyPrecise(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function DailyBriefTile() {
  const { data, isLoading, error } = useQuery<ArrMetricsResponse>({
    queryKey: ['/api/billing/arr-metrics'],
  });

  if (isLoading) {
    return (
      <Card className="col-span-full" data-testid="tile-daily-brief-loading">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Daily Brief
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className="col-span-full" data-testid="tile-daily-brief-error">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Daily Brief
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Unable to load revenue metrics</p>
        </CardContent>
      </Card>
    );
  }

  const { dailyBrief } = data;
  const progressPercent = Math.min(dailyBrief.targets.progressToYearOneTarget, 100);

  return (
    <Card className="col-span-full" data-testid="tile-daily-brief">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Daily Brief
          </CardTitle>
          <span className="text-sm text-muted-foreground flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            {dailyBrief.date}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2 text-green-700 dark:text-green-400 mb-1">
              <DollarSign className="h-4 w-4" />
              <span className="text-sm font-medium">Realized Revenue</span>
            </div>
            <div className="text-2xl font-bold text-green-800 dark:text-green-300" data-testid="text-realized-revenue">
              {formatCurrency(dailyBrief.realizedRevenue.allTimeUsd)}
            </div>
            <div className="text-xs text-green-600 dark:text-green-500 mt-1">
              YTD: {formatCurrency(dailyBrief.realizedRevenue.ytdUsd)} · 
              Last 30d: {formatCurrency(dailyBrief.realizedRevenue.last30DaysUsd)}
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 mb-1">
              <TrendingUp className="h-4 w-4" />
              <span className="text-sm font-medium">Modeled ARR</span>
            </div>
            <div className="text-2xl font-bold text-blue-800 dark:text-blue-300" data-testid="text-modeled-arr">
              {formatCurrency(dailyBrief.modeledArr.annualizedUsd)}
            </div>
            <div className="text-xs text-blue-600 dark:text-blue-500 mt-1">
              Monthly run rate: {formatCurrency(dailyBrief.modeledArr.monthlyRunRateUsd)} · 
              Weekly: {formatCurrencyPrecise(dailyBrief.modeledArr.weeklyVelocityUsd)}
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
            <div className="flex items-center gap-2 text-purple-700 dark:text-purple-400 mb-1">
              <Target className="h-4 w-4" />
              <span className="text-sm font-medium">Year 1 Target</span>
            </div>
            <div className="text-2xl font-bold text-purple-800 dark:text-purple-300" data-testid="text-year-target">
              {formatCurrency(dailyBrief.targets.yearOneTargetUsd)}
            </div>
            <div className="text-xs text-purple-600 dark:text-purple-500 mt-1">
              5-Year Goal: {formatCurrency(dailyBrief.targets.fiveYearArrTargetUsd)} ARR
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress to Year 1 Target</span>
            <span className="font-medium flex items-center gap-1">
              {progressPercent.toFixed(1)}%
              <ArrowUpRight className="h-3 w-3 text-green-500" />
            </span>
          </div>
          <Progress value={progressPercent} className="h-2" data-testid="progress-year-target" />
        </div>

        <div className="grid grid-cols-2 gap-4 pt-2 border-t">
          <div className="text-center">
            <div className="text-lg font-semibold" data-testid="text-total-transactions">
              {dailyBrief.transactionMetrics.totalTransactions}
            </div>
            <div className="text-xs text-muted-foreground">Total Transactions</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold" data-testid="text-avg-transaction">
              {formatCurrencyPrecise(dailyBrief.transactionMetrics.avgTransactionUsd)}
            </div>
            <div className="text-xs text-muted-foreground">Avg Transaction</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
