import { useQuery } from "@tanstack/react-query";
import { useAnalyticsContext } from "@/features/analytics-hub/hooks/use-analytics-context";
import { buildAnalyticsDateParams, buildApiUrl } from "@/features/analytics-hub/lib/api";
import { StatsCard } from "@/features/analytics-hub/components/dashboard/stats-card";
import { BarChart } from "@/features/analytics-hub/components/charts/bar-chart";
import { LineChart } from "@/features/analytics-hub/components/charts/line-chart";
import { DataTable } from "@/features/analytics-hub/components/tables/data-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  DollarSign,
  ShoppingBag,
  TrendingUp,
  ShoppingCart,
  AlertTriangle,
} from "lucide-react";
import type { AnalyticsSummary } from "@/features/analytics-hub/lib/types";
import { getQueryFn } from "@/features/analytics-hub/lib/query";
import { formatINR } from "@/lib/currency";

export default function EcommerceAnalytics() {
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
    queryKey: [
      buildApiUrl("/analytics/dashboard/summary", {
        vendorId,
        source: sourceParam,
        website_id: websiteParam,
        ...dateParams,
      }),
    ],
    queryFn,
    refetchInterval: 15000,
  });
  const cardClassName =
    "border border-sky-100/80 bg-white/85 shadow-sm backdrop-blur-sm dark:border-border dark:bg-card";

  const topProducts = (data?.topProducts || []).map((product) => ({
    name: product.name || "Unknown Product",
    value: product.revenue,
    sales: product.sales,
    productId: product.productId,
  }));

  const revenueByProduct = topProducts.slice(0, 8).map((product) => ({
    name: product.name.length > 15 ? `${product.name.slice(0, 15)}...` : product.name,
    value: product.value,
  }));

  const dailyRevenue = (data?.timeline || []).map((point) => ({
    name: point.label,
    revenue: point.revenue,
    orders: point.purchases,
  }));

  const conversionRate = data?.conversionRate || 0;
  const avgOrderValue = data?.avgOrderValue || 0;
  const abandonedRate =
    data?.abandonedCarts && data?.abandonedCarts + (data?.totalOrders || 0) > 0
      ? (data.abandonedCarts / (data.abandonedCarts + (data?.totalOrders || 0))) * 100
      : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-page-title">
          E-commerce Analytics
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Track sales performance, revenue, orders, and cart drop-off for the selected website
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Revenue"
          value={formatINR(data?.totalRevenue, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
          description="For selected website and date range"
          icon={<DollarSign className="h-4 w-4" />}
          isLoading={isLoading}
          valueClassName="text-green-500"
        />
        <StatsCard
          title="Total Orders"
          value={data?.totalOrders || 0}
          description="Completed purchases"
          icon={<ShoppingBag className="h-4 w-4" />}
          isLoading={isLoading}
        />
        <StatsCard
          title="Conversion Rate"
          value={`${conversionRate.toFixed(2)}%`}
          description="Product view to purchase"
          icon={<TrendingUp className="h-4 w-4" />}
          isLoading={isLoading}
        />
        <StatsCard
          title="Avg. Order Value"
          value={formatINR(avgOrderValue, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
          description="Per order"
          icon={<ShoppingCart className="h-4 w-4" />}
          isLoading={isLoading}
        />
      </div>

      <Card className={cardClassName}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">Abandoned Carts</CardTitle>
            <Badge
              variant="outline"
              className="border-orange-500/20 bg-orange-500/10 text-orange-500"
            >
              <AlertTriangle className="mr-1 h-3 w-3" />
              Attention Needed
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-8">
            <div className="flex-1 space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Cart Abandonment Rate</span>
                  <span className="font-bold text-orange-500">{abandonedRate.toFixed(1)}%</span>
                </div>
                <Progress value={abandonedRate} className="h-2" />
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="rounded-lg bg-muted/50 p-3 text-center">
                  <div className="text-2xl font-bold tabular-nums text-orange-500">
                    {data?.abandonedCarts?.toLocaleString() || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Abandoned Carts</div>
                </div>
                <div className="rounded-lg bg-muted/50 p-3 text-center">
                  <div className="text-2xl font-bold tabular-nums text-green-500">
                    {data?.totalOrders?.toLocaleString() || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Completed Orders</div>
                </div>
              </div>
            </div>
            <div className="border-l border-border pl-8 text-center">
              <div className="mb-2 text-sm text-muted-foreground">Potential Lost Revenue</div>
              <div className="text-3xl font-bold tabular-nums text-orange-500">
                {formatINR((data?.abandonedCarts || 0) * avgOrderValue, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">Based on average order value</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <LineChart
          title="Revenue Trend"
          data={dailyRevenue}
          lines={[{ dataKey: "revenue", color: "var(--chart-1)", name: "Revenue" }]}
          isLoading={isLoading}
          valuePrefix="Rs. "
          height={280}
        />
        <BarChart
          title="Revenue by Product"
          data={revenueByProduct}
          isLoading={isLoading}
          valuePrefix="Rs. "
          height={280}
        />
      </div>

      <DataTable
        title="Top Products by Revenue"
        data={topProducts}
        columns={[
          {
            header: "Product",
            accessorKey: (row) => (
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted">
                  <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <div className="max-w-[200px] truncate font-medium" title={row.name}>
                    {row.name}
                  </div>
                  <div className="text-xs text-muted-foreground">{row.productId}</div>
                </div>
              </div>
            ),
          },
          {
            header: "Sales",
            accessorKey: (row) => row.sales.toLocaleString(),
            className: "text-right tabular-nums",
          },
          {
            header: "Revenue",
            accessorKey: (row) => (
              <span className="font-medium text-green-500">
                {formatINR(row.value, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            ),
            className: "text-right tabular-nums",
          },
        ]}
        isLoading={isLoading}
        pageSize={10}
        emptyMessage="No product data available"
      />
    </div>
  );
}
