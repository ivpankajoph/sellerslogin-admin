import { useAnalyticsContext } from "@/features/analytics-hub/hooks/use-analytics-context";
import { buildApiUrl } from "@/features/analytics-hub/lib/api";
import { useQuery } from "@tanstack/react-query";
import { StatsCard } from "@/features/analytics-hub/components/dashboard/stats-card";
import { ConnectionStatus } from "@/features/analytics-hub/components/dashboard/connection-status";
import { LiveActivityFeed } from "@/features/analytics-hub/components/dashboard/live-activity-feed";
import { ActivePagesChart } from "@/features/analytics-hub/components/dashboard/active-pages-chart";
import { Users, ShoppingCart, DollarSign, Eye, TrendingUp } from "lucide-react";
import type { RealtimeAnalytics, AnalyticsSummary } from "@/features/analytics-hub/lib/types";
import { getQueryFn } from "@/features/analytics-hub/lib/query";
import { formatINR } from "@/lib/currency";

export default function RealtimeDashboard() {
  const { vendorId, source, templateId } = useAnalyticsContext();
  const summaryQueryFn = getQueryFn<AnalyticsSummary>();
  const realtimeQueryFn = getQueryFn<RealtimeAnalytics>();
  const sourceParam = source === "all" ? undefined : source;
  const templateParam = templateId === "all" ? undefined : templateId;
  
  const { data: summaryData, isLoading: summaryLoading } = useQuery<AnalyticsSummary>({
    queryKey: [buildApiUrl("/analytics/dashboard/summary", { vendorId, source: sourceParam, template_id: templateParam })],
    queryFn: summaryQueryFn,
    refetchInterval: 30000,
  });

  const {
    data: realtimeData,
    isLoading: realtimeLoading,
    isError: realtimeError,
    refetch,
  } = useQuery<RealtimeAnalytics>({
    queryKey: [buildApiUrl("/analytics/dashboard/realtime", { vendorId, source: sourceParam, template_id: templateParam })],
    queryFn: realtimeQueryFn,
    refetchInterval: 5000,
  });

  const liveData = realtimeData;
  const isLoading = realtimeLoading;
  const status = realtimeLoading
    ? "connecting"
    : realtimeError
      ? "error"
      : liveData
        ? "connected"
        : "disconnected";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Real-Time Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Monitor your e-commerce analytics in real-time
          </p>
        </div>
        <ConnectionStatus status={status} onReconnect={refetch} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Live Users"
          value={liveData?.liveUsers || 0}
          description="Active right now"
          icon={<Users className="h-4 w-4" />}
          isLive
          isLoading={isLoading}
          className="border-l-4 border-l-green-500"
        />
        <StatsCard
          title="Page Views"
          value={summaryData?.totalPageViews || 0}
          description="Today"
          trend={12.5}
          trendLabel="vs yesterday"
          icon={<Eye className="h-4 w-4" />}
          isLoading={summaryLoading}
        />
        <StatsCard
          title="Add to Cart"
          value={liveData?.liveAddToCart || 0}
          description="Today"
          trend={8.2}
          trendLabel="vs yesterday"
          icon={<ShoppingCart className="h-4 w-4" />}
          isLive
          isLoading={isLoading}
        />
        <StatsCard
          title="Live Revenue"
          value={formatINR(liveData?.liveRevenue, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          description="Today"
          trend={15.3}
          trendLabel="vs yesterday"
          icon={<DollarSign className="h-4 w-4" />}
          isLive
          isLoading={isLoading}
          valueClassName="text-green-500"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ActivePagesChart 
          pages={liveData?.activePages || []} 
          isLoading={isLoading}
        />
        <LiveActivityFeed 
          events={liveData?.recentEvents || []} 
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Users"
          value={summaryData?.totalUsers || 0}
          description="All time"
          icon={<Users className="h-4 w-4" />}
          isLoading={summaryLoading}
        />
        <StatsCard
          title="Total Sessions"
          value={summaryData?.totalSessions || 0}
          description="All time"
          isLoading={summaryLoading}
        />
        <StatsCard
          title="Conversion Rate"
          value={`${(summaryData?.conversionRate || 0).toFixed(2)}%`}
          trend={summaryData?.conversionRate ? 3.2 : undefined}
          icon={<TrendingUp className="h-4 w-4" />}
          isLoading={summaryLoading}
        />
        <StatsCard
          title="Total Revenue"
          value={formatINR(summaryData?.totalRevenue, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          icon={<DollarSign className="h-4 w-4" />}
          isLoading={summaryLoading}
        />
      </div>
    </div>
  );
}
