import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { apiRequest } from '@/lib/queryClient';
import { 
  TrendingUp, 
  Search, 
  Globe, 
  Clock, 
  AlertTriangle, 
  CheckCircle,
  Target,
  BarChart3,
  Zap,
  Eye,
  MousePointer
} from 'lucide-react';

interface SEOMetrics {
  overview: {
    totalPages: number;
    indexedPages: number;
    indexationRate: number;
    totalImpressions: number;
    totalClicks: number;
    averageCTR: number;
    organicSignups: number;
    organicSignupRate: number;
  };
  clusterPerformance: Array<{
    clusterName: string;
    pages: string[];
    totalImpressions: number;
    totalClicks: number;
    averageCTR: number;
    organicSignupRate: number;
  }>;
  topPerformingPages: Array<{
    page: string;
    impressions: number;
    clicks: number;
    ctr: number;
    averagePosition: number;
    organicSignups?: number;
  }>;
  recommendations: string[];
}

interface CoreWebVitalsData {
  scholarshipDetail: { averageLCP: number; averageINP: number; averageCLS: number; passRate: number };
  categoryPages: { averageLCP: number; averageINP: number; averageCLS: number; passRate: number };
  statePages: { averageLCP: number; averageINP: number; averageCLS: number; passRate: number };
  mainPages: { averageLCP: number; averageINP: number; averageCLS: number; passRate: number };
}

/**
 * SEO Dashboard for Days 15-30 monitoring
 * Tracks 1,000+ page indexation, organic attribution, Core Web Vitals
 */
export function SEODashboard() {
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  // Fetch SEO report data
  const { data: seoReport, isLoading: reportLoading } = useQuery({
    queryKey: ['/api/seo/report', dateRange.startDate, dateRange.endDate],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/seo/report?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`);
      const data = await response.json();
      return data.report as SEOMetrics;
    }
  });

  // Fetch indexation status
  const { data: indexationStatus, isLoading: indexationLoading } = useQuery({
    queryKey: ['/api/seo/indexation-status'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/seo/indexation-status');
      const data = await response.json();
      return data.status;
    }
  });

  // Fetch Core Web Vitals
  const { data: coreWebVitals, isLoading: vitalsLoading } = useQuery({
    queryKey: ['/api/seo/core-web-vitals/cluster'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/seo/core-web-vitals/cluster');
      const data = await response.json();
      return data.performance as CoreWebVitalsData;
    }
  });

  // Fetch performance alerts
  const { data: performanceAlerts } = useQuery({
    queryKey: ['/api/seo/performance-alerts'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/seo/performance-alerts');
      const data = await response.json();
      return data.alerts;
    }
  });

  if (reportLoading || indexationLoading || vitalsLoading) {
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

  const formatNumber = (num: number): string => {
    if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
    return num.toString();
  };

  const getStatusColor = (rate: number, target: number): string => {
    if (rate >= target) return 'text-green-600 dark:text-green-400';
    if (rate >= target * 0.8) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">SEO Performance Dashboard</h1>
          <p className="text-muted-foreground">
            Days 15-30 Targets: 1,000+ pages indexed • ≥10% organic signup attribution
          </p>
        </div>
        
        <div className="flex gap-2">
          <input
            type="date"
            value={dateRange.startDate}
            onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
            className="px-3 py-2 border rounded"
          />
          <input
            type="date"
            value={dateRange.endDate}
            onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
            className="px-3 py-2 border rounded"
          />
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pages</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{seoReport?.overview.totalPages || 0}</div>
            <p className="text-xs text-muted-foreground">
              Target: 1,000+ pages
            </p>
            <div className="mt-2">
              <Progress 
                value={((seoReport?.overview.totalPages || 0) / 1000) * 100} 
                className="h-2" 
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Indexation Rate</CardTitle>
            <Search className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round((seoReport?.overview.indexationRate || 0) * 100)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {indexationStatus?.indexed || 0} of {indexationStatus?.totalSubmitted || 0} indexed
            </p>
            <Badge 
              variant={((seoReport?.overview.indexationRate || 0) >= 0.85) ? "default" : "destructive"}
              className="mt-2"
            >
              {((seoReport?.overview.indexationRate || 0) >= 0.85) ? "Meeting Target" : "Below Target"}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Organic CTR</CardTitle>
            <MousePointer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {((seoReport?.overview.averageCTR || 0) * 100).toFixed(2)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {formatNumber(seoReport?.overview.totalClicks || 0)} clicks from {formatNumber(seoReport?.overview.totalImpressions || 0)} impressions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Organic Signup Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getStatusColor((seoReport?.overview.organicSignupRate || 0) * 100, 10)}`}>
              {((seoReport?.overview.organicSignupRate || 0) * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {seoReport?.overview.organicSignups || 0} signups • Target: ≥10%
            </p>
            <Badge 
              variant={((seoReport?.overview.organicSignupRate || 0) >= 0.10) ? "default" : "secondary"}
              className="mt-2"
            >
              {((seoReport?.overview.organicSignupRate || 0) >= 0.10) ? "Meeting Target" : "Below Target"}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Performance Alerts */}
      {performanceAlerts && (performanceAlerts.critical.length > 0 || performanceAlerts.warning.length > 0) && (
        <Card className="border-l-4 border-l-yellow-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Performance Alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {performanceAlerts.critical.map((alert: string, index: number) => (
              <div key={index} className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm">{alert}</span>
              </div>
            ))}
            {performanceAlerts.warning.map((alert: string, index: number) => (
              <div key={index} className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm">{alert}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="clusters" className="space-y-4">
        <TabsList>
          <TabsTrigger value="clusters">Page Clusters</TabsTrigger>
          <TabsTrigger value="vitals">Core Web Vitals</TabsTrigger>
          <TabsTrigger value="top-pages">Top Pages</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
        </TabsList>

        <TabsContent value="clusters" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {seoReport?.clusterPerformance.map((cluster) => (
              <Card key={cluster.clusterName}>
                <CardHeader>
                  <CardTitle className="text-lg">{cluster.clusterName}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {cluster.pages.length} pages • {formatNumber(cluster.totalImpressions)} impressions
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">Click-through Rate</span>
                    <span className="font-medium">{(cluster.averageCTR * 100).toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Organic Signup Rate</span>
                    <span className={`font-medium ${getStatusColor(cluster.organicSignupRate * 100, 8)}`}>
                      {(cluster.organicSignupRate * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Total Clicks</span>
                    <span className="font-medium">{formatNumber(cluster.totalClicks)}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="vitals" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {coreWebVitals && Object.entries(coreWebVitals).map(([pageType, metrics]) => (
              <Card key={pageType}>
                <CardHeader>
                  <CardTitle className="text-lg capitalize">
                    {pageType.replace(/([A-Z])/g, ' $1').trim()}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <div className={`h-3 w-3 rounded-full ${
                      metrics.passRate >= 0.95 ? 'bg-green-500' :
                      metrics.passRate >= 0.85 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}></div>
                    <span className="text-sm text-muted-foreground">
                      {Math.round(metrics.passRate * 100)}% pass rate
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">LCP</div>
                      <div className={`font-medium ${metrics.averageLCP <= 2500 ? 'text-green-600' : 'text-red-600'}`}>
                        {(metrics.averageLCP / 1000).toFixed(1)}s
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">INP</div>
                      <div className={`font-medium ${metrics.averageINP <= 200 ? 'text-green-600' : 'text-red-600'}`}>
                        {metrics.averageINP}ms
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">CLS</div>
                      <div className={`font-medium ${metrics.averageCLS <= 0.1 ? 'text-green-600' : 'text-red-600'}`}>
                        {metrics.averageCLS.toFixed(3)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="top-pages" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Pages</CardTitle>
              <p className="text-sm text-muted-foreground">
                Highest organic traffic and signup attribution
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {seoReport?.topPerformingPages.slice(0, 10).map((page, index) => (
                  <div key={page.page} className="flex items-center justify-between p-3 border rounded">
                    <div className="flex-1">
                      <div className="font-medium text-sm truncate" title={page.page}>
                        {page.page.replace(/^https?:\/\/[^\/]+/, '')}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Position #{page.averagePosition.toFixed(1)} • CTR {(page.ctr * 100).toFixed(2)}%
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">{formatNumber(page.clicks)} clicks</div>
                      <div className="text-xs text-muted-foreground">
                        {page.organicSignups || 0} signups
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>SEO Optimization Recommendations</CardTitle>
              <p className="text-sm text-muted-foreground">
                Actionable improvements for Days 15-30 targets
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {seoReport?.recommendations.map((recommendation, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-muted/50 rounded">
                    <CheckCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{recommendation}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}