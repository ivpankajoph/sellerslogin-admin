import { useAnalyticsContext } from "@/features/analytics-hub/hooks/use-analytics-context";
import { buildAnalyticsDateParams, buildApiUrl } from "@/features/analytics-hub/lib/api";
import { useQuery } from "@tanstack/react-query";
import { StatsCard } from "@/features/analytics-hub/components/dashboard/stats-card";
import { ConnectionStatus } from "@/features/analytics-hub/components/dashboard/connection-status";
import { LiveActivityFeed } from "@/features/analytics-hub/components/dashboard/live-activity-feed";
import { ActivePagesChart } from "@/features/analytics-hub/components/dashboard/active-pages-chart";
import { Users, ShoppingCart, DollarSign, Eye, TrendingUp, Clock3 } from "lucide-react";
import type { RealtimeAnalytics, AnalyticsSummary } from "@/features/analytics-hub/lib/types";
import { getQueryFn } from "@/features/analytics-hub/lib/query";
import { formatINR } from "@/lib/currency";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

export default function RealtimeDashboard() {
  const { role, vendorId, source, websiteId, range, fromDate, toDate } = useAnalyticsContext();
  const summaryQueryFn = getQueryFn<AnalyticsSummary>();
  const realtimeQueryFn = getQueryFn<RealtimeAnalytics>();
  const sourceParam = source === "all" ? undefined : source;
  const websiteParam =
    role === "vendor" || source === "template"
      ? websiteId === "all"
        ? undefined
        : websiteId
      : undefined;
  const dateParams = buildAnalyticsDateParams({ range, fromDate, toDate });

  const { data: summaryData, isLoading: summaryLoading } = useQuery<AnalyticsSummary>({
    queryKey: [buildApiUrl("/analytics/dashboard/summary", { vendorId, source: sourceParam, website_id: websiteParam, ...dateParams })],
    queryFn: summaryQueryFn,
    refetchInterval: 15000,
  });

  const {
    data: realtimeData,
    isLoading: realtimeLoading,
    isError: realtimeError,
    refetch,
  } = useQuery<RealtimeAnalytics>({
    queryKey: [buildApiUrl("/analytics/dashboard/realtime", { vendorId, source: sourceParam, website_id: websiteParam, ...dateParams })],
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
          title="Product Views"
          value={summaryData?.totalProductViews || 0}
          description="Selected period"
          icon={<Eye className="h-4 w-4" />}
          isLoading={summaryLoading}
        />
        <StatsCard
          title="Add to Cart"
          value={liveData?.liveAddToCart || 0}
          description="Selected period"
          icon={<ShoppingCart className="h-4 w-4" />}
          isLive
          isLoading={isLoading}
        />
        <StatsCard
          title="Live Revenue"
          value={formatINR(liveData?.liveRevenue, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          description="Selected period"
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

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Live Journey Stages</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(liveData?.stageCounts || []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No live stage data right now.</p>
            ) : (
              (liveData?.stageCounts || []).map((stage) => (
                <div key={stage.stage} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                  <span className="text-sm font-medium">{stage.stage}</span>
                  <Badge variant="outline">{stage.count.toLocaleString()}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Active Sessions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(liveData?.activeSessions || []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No active visitors in the current live window.</p>
            ) : (
              (liveData?.activeSessions || []).slice(0, 8).map((session) => (
                <div key={session.sessionId} className="rounded-xl border border-border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{session.currentStage || "Browsing"}</p>
                      <p className="text-xs text-muted-foreground">
                        {session.city ? `${session.city}, ` : ""}{session.country || "Unknown location"}
                      </p>
                    </div>
                    <Badge variant="outline">{session.device || "desktop"}</Badge>
                  </div>
                  <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                    {session.ip ? <p>IP: {session.ip}</p> : null}
                    <p className="truncate">Page: {session.currentPage || "/"}</p>
                    {session.productNames && session.productNames.length > 0 ? (
                      <p className="truncate">Products: {session.productNames.join(", ")}</p>
                    ) : null}
                    {session.searchTerms && session.searchTerms.length > 0 ? (
                      <p className="truncate">Search: {session.searchTerms.join(", ")}</p>
                    ) : null}
                    {session.cartItems && session.cartItems.length > 0 ? (
                      <p className="truncate">
                        Cart: {session.cartItems.map((item) => `${item.productName || "Item"} x${item.quantity || 1}`).join(", ")}
                      </p>
                    ) : null}
                    <p className="flex items-center gap-1">
                      <Clock3 className="h-3 w-3" />
                      {session.lastSeenAt
                        ? formatDistanceToNow(new Date(session.lastSeenAt), { addSuffix: true })
                        : "just now"}
                    </p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Users"
          value={summaryData?.totalUsers || 0}
          description="Selected period"
          icon={<Users className="h-4 w-4" />}
          isLoading={summaryLoading}
        />
        <StatsCard
          title="Total Sessions"
          value={summaryData?.totalSessions || 0}
          description="Selected period"
          isLoading={summaryLoading}
        />
        <StatsCard
          title="Conversion Rate"
          value={`${(summaryData?.conversionRate || 0).toFixed(2)}%`}
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
