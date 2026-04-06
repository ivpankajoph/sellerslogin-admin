import { useQuery } from "@tanstack/react-query";
import { useAnalyticsContext } from "@/features/analytics-hub/hooks/use-analytics-context";
import { buildAnalyticsDateParams, buildApiUrl, resolveStorefrontHref } from "@/features/analytics-hub/lib/api";
import { StatsCard } from "@/features/analytics-hub/components/dashboard/stats-card";
import { BarChart } from "@/features/analytics-hub/components/charts/bar-chart";
import { FunnelChart } from "@/features/analytics-hub/components/charts/funnel-chart";
import { DataTable } from "@/features/analytics-hub/components/tables/data-table";
import { Badge } from "@/components/ui/badge";
import { Eye, Clock, LogOut, MousePointerClick } from "lucide-react";
import type {
  AnalyticsSummary,
  AnalyticsEventsResponse,
  AnalyticsEventRecord,
} from "@/features/analytics-hub/lib/types";
import { getQueryFn } from "@/features/analytics-hub/lib/query";
import { formatDistanceToNow } from "date-fns";
import { formatINR } from "@/lib/currency";

const formatDuration = (seconds: number): string => {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}m ${secs}s`;
};

const formatEventLabel = (eventType: string) => {
  const labels: Record<string, string> = {
    page_view: "Page View",
    product_view: "Product View",
    search: "Search",
    click: "Click",
    add_to_cart: "Add to Cart",
    checkout: "Checkout",
    purchase: "Purchase",
    page_duration: "Page Duration",
  };
  return labels[eventType] || eventType;
};

const formatSourceLabel = (event: AnalyticsEventRecord) => {
  const parts = [event.source, event.medium, event.campaign].filter(Boolean);
  return parts.length ? parts.join(" / ") : "Direct";
};

const renderPageLink = (path?: string | null, label?: string | null) => {
  const href = resolveStorefrontHref(path || "");
  const displayText = label || path || "/";
  if (!href) {
    return (
      <span className="block max-w-[320px] truncate font-medium" title={displayText}>
        {displayText}
      </span>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="block max-w-[320px] truncate font-medium text-blue-600 underline-offset-2 hover:text-blue-700 hover:underline"
      title={href}
    >
      {displayText}
    </a>
  );
};

export default function BehaviorAnalytics() {
  const { role, vendorId, source, websiteId, range, fromDate, toDate } = useAnalyticsContext();
  const sourceParam = source === "all" ? undefined : source;
  const websiteParam =
    role === "vendor" || source === "template"
      ? websiteId === "all"
        ? undefined
        : websiteId
      : undefined;
  const summaryQueryFn = getQueryFn<AnalyticsSummary>();
  const eventsQueryFn = getQueryFn<AnalyticsEventsResponse>();
  const dateParams = buildAnalyticsDateParams({ range, fromDate, toDate });

  const { data, isLoading } = useQuery<AnalyticsSummary>({
    queryKey: [buildApiUrl("/analytics/dashboard/summary", { vendorId, source: sourceParam, website_id: websiteParam, ...dateParams })],
    queryFn: summaryQueryFn,
    refetchInterval: 15000,
  });

  const { data: eventsData, isLoading: eventsLoading } = useQuery<AnalyticsEventsResponse>({
    queryKey: [buildApiUrl("/analytics/events", { vendorId, source: sourceParam, website_id: websiteParam, includeUser: 1, page: 1, pageSize: 50, ...dateParams })],
    queryFn: eventsQueryFn,
    refetchInterval: 5000,
  });

  const topPages = (data?.topPages || []).map((page) => ({
    name: page.page || "/",
    value: page.views,
  }));

  const dropOffPages = data?.dropOffPages || [];
  const activityEvents = (eventsData?.events || []).filter((event) => event.eventType !== "page_duration");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-page-title">Behavior Analytics</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Understand user journey, where visitors came from, what they clicked, and which products they touched.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Page Views"
          value={data?.totalPageViews || 0}
          description="All tracked page views"
          icon={<Eye className="h-4 w-4" />}
          isLoading={isLoading}
        />
        <StatsCard
          title="Avg. Session Duration"
          value={formatDuration(data?.avgSessionDuration || 0)}
          description="Per session"
          icon={<Clock className="h-4 w-4" />}
          isLoading={isLoading}
        />
        <StatsCard
          title="Bounce Rate"
          value={`${(data?.bounceRate || 0).toFixed(1)}%`}
          description="Session exits after a single viewed page"
          icon={<LogOut className="h-4 w-4" />}
          isLoading={isLoading}
        />
        <StatsCard
          title="Tracked Actions"
          value={activityEvents.length}
          description="Latest detailed user events"
          icon={<MousePointerClick className="h-4 w-4" />}
          isLoading={eventsLoading}
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
          data={(data?.topPages || []).map((page) => ({
            page: page.page || "/",
            views: page.views,
            avgTime: page.avgTime,
          }))}
          columns={[
            {
              header: "Page",
              accessorKey: (row) => renderPageLink(row.page, row.page),
            },
            {
              header: "Views",
              accessorKey: (row) => row.views.toLocaleString(),
              className: "text-right tabular-nums",
            },
            {
              header: "Avg. Time",
              accessorKey: (row) => formatDuration(row.avgTime),
              className: "text-right tabular-nums",
            },
          ]}
          isLoading={isLoading}
          pageSize={8}
          emptyMessage="No page data available"
        />
      </div>

      <DataTable
        title="Drop-off Pages"
        data={dropOffPages.map((page) => ({
          page: page.page || "/",
          exitRate: page.exitRate,
        }))}
        columns={[
          {
            header: "Page",
            accessorKey: (row) => renderPageLink(row.page, row.page),
          },
          {
            header: "Exit Rate",
            accessorKey: (row) => (
              <div className="flex items-center justify-end gap-2">
                <Badge
                  variant={row.exitRate > 50 ? "destructive" : row.exitRate > 30 ? "secondary" : "default"}
                  className={row.exitRate > 50 ? "" : row.exitRate > 30 ? "" : "bg-green-500/10 text-green-500 border-green-500/20"}
                >
                  {row.exitRate.toFixed(1)}%
                </Badge>
              </div>
            ),
            className: "text-right",
          },
        ]}
        isLoading={isLoading}
        pageSize={10}
        emptyMessage="No drop-off data available"
      />

      <DataTable
        title="Detailed User Activity"
        data={activityEvents}
        columns={[
          {
            header: "Action",
            accessorKey: (row) => (
              <div className="space-y-1">
                <div className="font-medium">{formatEventLabel(row.eventType)}</div>
                <div className="text-xs text-muted-foreground">
                  {row.createdAt ? formatDistanceToNow(new Date(row.createdAt), { addSuffix: true }) : "just now"}
                </div>
              </div>
            ),
          },
          {
            header: "User / IP",
            accessorKey: (row) => (
              <div className="space-y-1">
                <div className="font-medium">{row.user?.name || row.userId || row.visitorId || "Anonymous"}</div>
                <div className="text-xs text-muted-foreground">{row.ip || "IP unavailable"}</div>
              </div>
            ),
          },
          {
            header: "Source",
            accessorKey: (row) => (
              <div className="space-y-1">
                <div className="text-sm">{formatSourceLabel(row)}</div>
                {row.referrer ? (
                  /^https?:\/\//i.test(row.referrer) ? (
                    <a
                      href={row.referrer}
                      target="_blank"
                      rel="noreferrer"
                      className="block max-w-[220px] truncate text-xs text-blue-600 underline-offset-2 hover:text-blue-700 hover:underline"
                      title={row.referrer}
                    >
                      {row.referrer}
                    </a>
                  ) : (
                    <div className="max-w-[220px] truncate text-xs text-muted-foreground" title={row.referrer}>
                      {row.referrer}
                    </div>
                  )
                ) : (
                  <div className="text-xs text-muted-foreground">Direct / no referrer</div>
                )}
              </div>
            ),
          },
          {
            header: "Page",
            accessorKey: (row) => renderPageLink(row.fullUrl || row.path, row.title || row.path || "/"),
          },
          {
            header: "Product / Value",
            accessorKey: (row) => (
              <div className="space-y-1">
                <div className="max-w-[200px] truncate font-medium" title={row.productName || undefined}>
                  {row.productName || "-"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {row.cartTotal
                    ? formatINR(row.cartTotal, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                    : row.productPrice
                      ? formatINR(row.productPrice, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                      : row.quantity
                        ? `Qty ${row.quantity}`
                        : "-"}
                </div>
              </div>
            ),
          },
          {
            header: "Session",
            accessorKey: (row) => (
              <span className="block max-w-[140px] truncate font-mono text-xs" title={row.sessionId || undefined}>
                {row.sessionId || "-"}
              </span>
            ),
          },
        ]}
        isLoading={eventsLoading}
        pageSize={12}
        emptyMessage="No user activity available"
      />
    </div>
  );
}
