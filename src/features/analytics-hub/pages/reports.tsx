import { useQuery } from "@tanstack/react-query";
import { useAnalyticsContext } from "@/features/analytics-hub/hooks/use-analytics-context";
import { buildApiUrl } from "@/features/analytics-hub/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatsCard } from "@/features/analytics-hub/components/dashboard/stats-card";
import { LineChart } from "@/features/analytics-hub/components/charts/line-chart";
import { DonutChart } from "@/features/analytics-hub/components/charts/donut-chart";
import { DataTable } from "@/features/analytics-hub/components/tables/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  FileText, 
  Download, 
  Users, 
  DollarSign, 
  Eye,
  ShoppingCart,
  TrendingUp,
  TrendingDown
} from "lucide-react";
import type { AnalyticsSummary } from "@/features/analytics-hub/lib/types";
import { getQueryFn } from "@/features/analytics-hub/lib/query";
import { formatINR } from "@/lib/currency";

export default function Reports() {
  const { vendorId, source, templateId } = useAnalyticsContext();
  const sourceParam = source === "all" ? undefined : source;
  const templateParam = templateId === "all" ? undefined : templateId;
  const queryFn = getQueryFn<AnalyticsSummary>();
  const { data, isLoading } = useQuery<AnalyticsSummary>({
    queryKey: [buildApiUrl("/analytics/dashboard/summary", { vendorId, source: sourceParam, template_id: templateParam })],
    queryFn,
  });
  const cardClassName =
    "border border-sky-100/80 bg-white/85 shadow-sm backdrop-blur-sm dark:border-border dark:bg-card";

  // Mock weekly data
  const weeklyData = [
    { name: 'Week 1', users: 1200, revenue: 8500, orders: 145 },
    { name: 'Week 2', users: 1450, revenue: 9200, orders: 168 },
    { name: 'Week 3', users: 1380, revenue: 8900, orders: 152 },
    { name: 'Week 4', users: 1650, revenue: 11200, orders: 195 },
  ];

  const trafficSources = (data?.trafficBySource || []).map(s => ({
    name: s.source.charAt(0).toUpperCase() + s.source.slice(1),
    value: s.count,
  }));

  const summaryMetrics = [
    {
      title: 'Total Users',
      value: data?.totalUsers || 0,
      change: 12.5,
      icon: <Users className="h-4 w-4" />,
    },
    {
      title: 'Page Views',
      value: data?.totalPageViews || 0,
      change: 8.3,
      icon: <Eye className="h-4 w-4" />,
    },
    {
      title: 'Total Orders',
      value: data?.totalOrders || 0,
      change: 15.2,
      icon: <ShoppingCart className="h-4 w-4" />,
    },
    {
      title: 'Revenue',
      value: formatINR(data?.totalRevenue, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      change: 22.8,
      icon: <DollarSign className="h-4 w-4" />,
    },
  ];

  const reportItems = [
    {
      name: 'Traffic Summary Report',
      description: 'User acquisition, sources, and demographics',
      lastGenerated: 'Today, 10:30 AM',
      status: 'ready',
    },
    {
      name: 'E-commerce Performance',
      description: 'Sales, revenue, and conversion metrics',
      lastGenerated: 'Today, 10:30 AM',
      status: 'ready',
    },
    {
      name: 'Behavior Analysis',
      description: 'User journeys, engagement, and drop-offs',
      lastGenerated: 'Today, 10:30 AM',
      status: 'ready',
    },
    {
      name: 'Product Performance',
      description: 'Top products, views, and conversions',
      lastGenerated: 'Today, 10:30 AM',
      status: 'ready',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Summary Report</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Comprehensive overview of your analytics data
          </p>
        </div>
        <Button variant="outline" className="gap-2" data-testid="button-export-report">
          <Download className="h-4 w-4" />
          Export Report
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {summaryMetrics.map((metric, index) => (
          <StatsCard
            key={index}
            title={metric.title}
            value={metric.value}
            trend={metric.change}
            trendLabel="vs last month"
            icon={metric.icon}
            isLoading={isLoading}
          />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <LineChart
          title="Weekly Performance"
          data={weeklyData}
          lines={[
            { dataKey: 'users', color: 'var(--chart-1)', name: 'Users' },
            { dataKey: 'orders', color: 'var(--chart-2)', name: 'Orders' },
          ]}
          isLoading={isLoading}
          height={280}
        />
        <DonutChart
          title="Traffic Distribution"
          data={trafficSources}
          isLoading={isLoading}
        />
      </div>

      <Card className={cardClassName}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">Key Insights</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
            <TrendingUp className="h-5 w-5 text-green-500 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-green-500">Revenue Growth</p>
              <p className="text-sm text-muted-foreground">
                Revenue increased by 22.8% compared to last month, with an average order value of {formatINR(data?.avgOrderValue, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <Users className="h-5 w-5 text-blue-500 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-500">User Acquisition</p>
              <p className="text-sm text-muted-foreground">
                {data?.newUsers?.toLocaleString() || 0} new users acquired this period, representing{' '}
                {data?.totalUsers ? ((data.newUsers || 0) / data.totalUsers * 100).toFixed(1) : 0}% of total traffic.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
            <TrendingDown className="h-5 w-5 text-orange-500 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-orange-500">Cart Abandonment</p>
              <p className="text-sm text-muted-foreground">
                {data?.abandonedCarts?.toLocaleString() || 0} carts were abandoned, representing potential lost revenue of{' '}
                {formatINR((data?.abandonedCarts || 0) * (data?.avgOrderValue || 0), {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <DataTable
        title="Available Reports"
        data={reportItems}
        columns={[
          { 
            header: 'Report', 
            accessorKey: (row) => (
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center">
                  <FileText className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <div className="font-medium">{row.name}</div>
                  <div className="text-xs text-muted-foreground">{row.description}</div>
                </div>
              </div>
            )
          },
          { 
            header: 'Last Generated', 
            accessorKey: 'lastGenerated',
            className: 'text-muted-foreground'
          },
          { 
            header: 'Status', 
            accessorKey: () => (
              <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                Ready
              </Badge>
            )
          },
          { 
            header: '', 
            accessorKey: (row) => (
              <Button variant="ghost" size="icon" data-testid={`button-download-${row.name.toLowerCase().replace(/\s+/g, '-')}`}>
                <Download className="h-4 w-4" />
              </Button>
            ),
            className: 'text-right'
          },
        ]}
        isLoading={isLoading}
        emptyMessage="No reports available"
      />
    </div>
  );
}

