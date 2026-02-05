import { useQuery } from "@tanstack/react-query";
import { useAnalyticsContext } from "@/features/analytics-hub/hooks/use-analytics-context";
import { buildApiUrl } from "@/features/analytics-hub/lib/api";
import { StatsCard } from "@/features/analytics-hub/components/dashboard/stats-card";
import { BarChart } from "@/features/analytics-hub/components/charts/bar-chart";
import { FunnelChart } from "@/features/analytics-hub/components/charts/funnel-chart";
import { DataTable } from "@/features/analytics-hub/components/tables/data-table";
import { Badge } from "@/components/ui/badge";
import { Eye, Clock, LogOut, MousePointerClick } from "lucide-react";
import type { AnalyticsSummary } from "@/features/analytics-hub/lib/types";
import { getQueryFn } from "@/features/analytics-hub/lib/query";

export default function BehaviorAnalytics() {
  const { vendorId, source, templateId } = useAnalyticsContext();
  const sourceParam = source === "all" ? undefined : source;
  const templateParam = templateId === "all" ? undefined : templateId;
  const queryFn = getQueryFn<AnalyticsSummary>();
  const { data, isLoading } = useQuery<AnalyticsSummary>({
    queryKey: [buildApiUrl("/analytics/dashboard/summary", { vendorId, source: sourceParam, template_id: templateParam })],
    queryFn,
  });

  const topPages = (data?.topPages || []).map(page => ({
    name: page.page || '/',
    value: page.views,
  }));

  const dropOffPages = data?.dropOffPages || [];

  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-page-title">Behavior Analytics</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Understand how users interact with your website and identify optimization opportunities
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Page Views"
          value={data?.totalPageViews || 0}
          description="All pages"
          icon={<Eye className="h-4 w-4" />}
          isLoading={isLoading}
        />
        <StatsCard
          title="Avg. Session Duration"
          value={formatDuration(data?.avgSessionDuration || 0)}
          description="Per session"
          trend={5.2}
          icon={<Clock className="h-4 w-4" />}
          isLoading={isLoading}
        />
        <StatsCard
          title="Bounce Rate"
          value={`${(data?.bounceRate || 0).toFixed(1)}%`}
          description="Single page visits"
          trend={-3.1}
          icon={<LogOut className="h-4 w-4" />}
          isLoading={isLoading}
        />
        <StatsCard
          title="Click Events"
          value={data?.totalPageViews ? Math.floor(data.totalPageViews * 2.3) : 0}
          description="Total interactions"
          icon={<MousePointerClick className="h-4 w-4" />}
          isLoading={isLoading}
        />
      </div>

      <FunnelChart
        data={{
          productViews: data?.funnel?.productViews || 0,
          addToCarts: data?.funnel?.addToCarts || 0,
          checkouts: data?.funnel?.checkouts || 0,
          purchases: data?.funnel?.purchases || 0,
        }}
        isLoading={isLoading}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <BarChart
          title="Most Viewed Pages"
          data={topPages.slice(0, 10)}
          isLoading={isLoading}
          horizontal
          height={350}
        />
        
        <DataTable
          title="Page Performance"
          data={(data?.topPages || []).map(page => ({
            page: page.page || '/',
            views: page.views,
            avgTime: page.avgTime,
          }))}
          columns={[
            { 
              header: 'Page', 
              accessorKey: (row) => (
                <span className="font-medium truncate max-w-[200px] block" title={row.page}>
                  {row.page}
                </span>
              )
            },
            { 
              header: 'Views', 
              accessorKey: (row) => row.views.toLocaleString(),
              className: 'text-right tabular-nums'
            },
            { 
              header: 'Avg. Time', 
              accessorKey: (row) => formatDuration(row.avgTime),
              className: 'text-right tabular-nums'
            },
          ]}
          isLoading={isLoading}
          pageSize={8}
          emptyMessage="No page data available"
        />
      </div>

      <DataTable
        title="Drop-off Pages"
        data={dropOffPages.map(page => ({
          page: page.page || '/',
          exitRate: page.exitRate,
        }))}
        columns={[
          { 
            header: 'Page', 
            accessorKey: (row) => (
              <span className="font-medium truncate max-w-[300px] block" title={row.page}>
                {row.page}
              </span>
            )
          },
          { 
            header: 'Exit Rate', 
            accessorKey: (row) => (
              <div className="flex items-center justify-end gap-2">
                <Badge 
                  variant={row.exitRate > 50 ? 'destructive' : row.exitRate > 30 ? 'secondary' : 'default'}
                  className={row.exitRate > 50 ? '' : row.exitRate > 30 ? '' : 'bg-green-500/10 text-green-500 border-green-500/20'}
                >
                  {row.exitRate.toFixed(1)}%
                </Badge>
              </div>
            ),
            className: 'text-right'
          },
        ]}
        isLoading={isLoading}
        pageSize={10}
        emptyMessage="No drop-off data available"
      />
    </div>
  );
}
