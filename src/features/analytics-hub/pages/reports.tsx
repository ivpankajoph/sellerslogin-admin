import { useQuery } from "@tanstack/react-query";
import { useAnalyticsContext } from "@/features/analytics-hub/hooks/use-analytics-context";
import { buildAnalyticsDateParams, buildApiUrl } from "@/features/analytics-hub/lib/api";
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

const getRangeLabel = (range?: string) => {
  switch (range) {
    case "today":
      return "Today";
    case "yesterday":
      return "Yesterday";
    case "30d":
      return "Last 30 days";
    case "custom":
      return "Custom range";
    case "7d":
    default:
      return "Last 7 days";
  }
};

const downloadTextFile = (filename: string, content: string, type: string) => {
  if (typeof window === "undefined") return;
  const blob = new Blob([content], { type });
  const url = window.URL.createObjectURL(blob);
  const link = window.document.createElement("a");
  link.href = url;
  link.download = filename;
  window.document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

const sanitizeFilenamePart = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

export default function Reports() {
  const { role, vendorId, source, websiteId, range, fromDate, toDate } = useAnalyticsContext();
  const sourceParam = source === "all" ? undefined : source;
  const websiteParam =
    role === "vendor" || source === "template"
      ? websiteId === "all"
        ? undefined
        : websiteId
      : undefined;
  const queryFn = getQueryFn<AnalyticsSummary>();
  const dateParams = buildAnalyticsDateParams({ range, fromDate, toDate });
  const { data, isLoading } = useQuery<AnalyticsSummary>({
    queryKey: [buildApiUrl("/analytics/dashboard/summary", { vendorId, source: sourceParam, website_id: websiteParam, ...dateParams })],
    queryFn,
    refetchInterval: 15000,
  });
  const cardClassName =
    "border border-sky-100/80 bg-white/85 shadow-sm backdrop-blur-sm dark:border-border dark:bg-card";
  const rangeLabel = getRangeLabel(range);

  const timelineData = (data?.timeline || []).map((point) => ({
    name: point.label,
    users: point.users,
    revenue: point.revenue,
    orders: point.purchases,
    searches: point.searches,
  }));

  const trafficSources = (data?.trafficBySource || []).map(s => ({
    name: s.source.charAt(0).toUpperCase() + s.source.slice(1),
    value: s.count,
  }));

  const summaryMetrics = [
    {
      title: 'Total Users',
      value: data?.totalUsers || 0,
      description: rangeLabel,
      icon: <Users className="h-4 w-4" />,
    },
    {
      title: 'Product Views',
      value: data?.totalProductViews || 0,
      description: rangeLabel,
      icon: <Eye className="h-4 w-4" />,
    },
    {
      title: 'Total Orders',
      value: data?.totalOrders || 0,
      description: rangeLabel,
      icon: <ShoppingCart className="h-4 w-4" />,
    },
    {
      title: 'Revenue',
      value: formatINR(data?.totalRevenue, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      description: rangeLabel,
      icon: <DollarSign className="h-4 w-4" />,
    },
  ];

  const reportItems = [
    {
      name: 'Traffic Summary',
      description: `${data?.totalUsers || 0} users, ${data?.totalSessions || 0} sessions, bounce ${(
        data?.bounceRate || 0
      ).toFixed(1)}%`,
      metric: `${data?.totalPageViews || 0} page views`,
    },
    {
      name: 'Revenue Summary',
      description: `${data?.totalOrders || 0} orders with ${formatINR(data?.avgOrderValue, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })} average order value`,
      metric: formatINR(data?.totalRevenue, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    },
    {
      name: 'Funnel Summary',
      description: `${data?.funnel?.productViews || 0} product views -> ${data?.funnel?.purchases || 0} purchases`,
      metric: `${(data?.conversionRate || 0).toFixed(2)}% conversion`,
    },
    {
      name: 'Search Summary',
      description: `${data?.totalSearches || 0} tracked searches in selected period`,
      metric: data?.topSearches?.[0]?.term || 'No search trends yet',
    },
  ];

  const exportReport = (scope: string) => {
    if (!data) return;
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const payload = {
      scope,
      exportedAt: new Date().toISOString(),
      range: rangeLabel,
      filters: {
        vendorId: vendorId || null,
        source: sourceParam || "all",
        websiteId: websiteParam || "all",
      },
      summary: data,
    };
    downloadTextFile(
      `analytics-report-${sanitizeFilenamePart(scope)}-${timestamp}.json`,
      JSON.stringify(payload, null, 2),
      "application/json"
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Summary Report</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Comprehensive overview of your selected website and date range
          </p>
        </div>
        <Button
          variant="outline"
          className="gap-2"
          data-testid="button-export-report"
          onClick={() => exportReport("summary-report")}
          disabled={!data || isLoading}
        >
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
            description={metric.description}
            icon={metric.icon}
            isLoading={isLoading}
          />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <LineChart
          title="Period Performance"
          data={timelineData}
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
                Selected period revenue is {formatINR(data?.totalRevenue, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} with an average order value of {formatINR(data?.avgOrderValue, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <Users className="h-5 w-5 text-blue-500 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-500">User Acquisition</p>
              <p className="text-sm text-muted-foreground">
                {data?.newUsers?.toLocaleString() || 0} new users visited in this range, representing{' '}
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
          <div className="flex items-start gap-3 p-3 rounded-lg bg-violet-500/10 border border-violet-500/20">
            <FileText className="h-5 w-5 text-violet-500 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-violet-500">Search Intent</p>
              <p className="text-sm text-muted-foreground">
                Top tracked search in the selected range is{" "}
                <strong>{data?.topSearches?.[0]?.term || "not available yet"}</strong>.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <DataTable
        title="Vendor Summary Snapshots"
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
            header: 'Key Metric', 
            accessorKey: 'metric',
            className: 'text-muted-foreground'
          },
          { 
            header: 'Status', 
            accessorKey: () => (
              <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                Live
              </Badge>
            )
          },
          { 
            header: '', 
            accessorKey: (row) => (
              <Button
                variant="ghost"
                size="icon"
                data-testid={`button-download-${row.name.toLowerCase().replace(/\s+/g, '-')}`}
                onClick={() => exportReport(row.name)}
                disabled={!data || isLoading}
              >
                <Download className="h-4 w-4" />
              </Button>
            ),
            className: 'text-right'
          },
        ]}
        isLoading={isLoading}
        emptyMessage="No reports available"
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <DataTable
          title="Top Products"
          data={data?.topProducts || []}
          columns={[
            { header: 'Product', accessorKey: (row) => row.name || 'Unknown Product' },
            { header: 'Views', accessorKey: (row) => (row.views || 0).toLocaleString(), className: 'text-right tabular-nums' },
            { header: 'Carts', accessorKey: (row) => (row.addToCarts || 0).toLocaleString(), className: 'text-right tabular-nums' },
            { header: 'Purchases', accessorKey: (row) => (row.purchases || 0).toLocaleString(), className: 'text-right tabular-nums' },
          ]}
          isLoading={isLoading}
          emptyMessage="No product analytics available"
        />
        <DataTable
          title="Top Searches"
          data={data?.topSearches || []}
          columns={[
            { header: 'Search Term', accessorKey: 'term' },
            { header: 'Count', accessorKey: (row) => row.count.toLocaleString(), className: 'text-right tabular-nums' },
            { header: 'Avg Results', accessorKey: (row) => String(row.results || 0), className: 'text-right tabular-nums' },
          ]}
          isLoading={isLoading}
          emptyMessage="No search activity tracked yet"
        />
      </div>
    </div>
  );
}

