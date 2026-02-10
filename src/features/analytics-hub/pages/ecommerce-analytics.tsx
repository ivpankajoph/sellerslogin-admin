import { useQuery } from "@tanstack/react-query";
import { useAnalyticsContext } from "@/features/analytics-hub/hooks/use-analytics-context";
import { buildApiUrl } from "@/features/analytics-hub/lib/api";
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
  AlertTriangle
} from "lucide-react";
import type { AnalyticsSummary } from "@/features/analytics-hub/lib/types";
import { getQueryFn } from "@/features/analytics-hub/lib/query";
import { formatINR } from "@/lib/currency";

export default function EcommerceAnalytics() {
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

  const topProducts = (data?.topProducts || []).map(product => ({
    name: product.name || 'Unknown Product',
    value: product.revenue,
    sales: product.sales,
    productId: product.productId,
  }));

  const revenueByProduct = topProducts.slice(0, 8).map(p => ({
    name: p.name.length > 15 ? p.name.slice(0, 15) + '...' : p.name,
    value: p.value,
  }));

  // Mock daily revenue data for the line chart
  const dailyRevenue = [
    { name: 'Mon', revenue: 1200, orders: 24 },
    { name: 'Tue', revenue: 1800, orders: 32 },
    { name: 'Wed', revenue: 1500, orders: 28 },
    { name: 'Thu', revenue: 2200, orders: 45 },
    { name: 'Fri', revenue: 2800, orders: 52 },
    { name: 'Sat', revenue: 3200, orders: 61 },
    { name: 'Sun', revenue: 2400, orders: 48 },
  ];

  const conversionRate = data?.conversionRate || 0;
  const avgOrderValue = data?.avgOrderValue || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-page-title">E-commerce Analytics</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Track sales performance, revenue, and conversion metrics
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Revenue"
          value={formatINR(data?.totalRevenue, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          description="All time"
          trend={18.5}
          icon={<DollarSign className="h-4 w-4" />}
          isLoading={isLoading}
          valueClassName="text-green-500"
        />
        <StatsCard
          title="Total Orders"
          value={data?.totalOrders || 0}
          description="Completed orders"
          trend={12.3}
          icon={<ShoppingBag className="h-4 w-4" />}
          isLoading={isLoading}
        />
        <StatsCard
          title="Conversion Rate"
          value={`${conversionRate.toFixed(2)}%`}
          description="Visitors → Buyers"
          trend={2.1}
          icon={<TrendingUp className="h-4 w-4" />}
          isLoading={isLoading}
        />
        <StatsCard
          title="Avg. Order Value"
          value={formatINR(avgOrderValue, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          description="Per order"
          trend={5.8}
          icon={<ShoppingCart className="h-4 w-4" />}
          isLoading={isLoading}
        />
      </div>

      <Card className={cardClassName}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">Abandoned Carts</CardTitle>
            <Badge variant="outline" className="bg-orange-500/10 text-orange-500 border-orange-500/20">
              <AlertTriangle className="h-3 w-3 mr-1" />
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
                  <span className="text-orange-500 font-bold">
                    {data?.abandonedCarts ? ((data.abandonedCarts / (data.abandonedCarts + (data?.totalOrders || 0))) * 100).toFixed(1) : 0}%
                  </span>
                </div>
                <Progress 
                  value={data?.abandonedCarts ? (data.abandonedCarts / (data.abandonedCarts + (data?.totalOrders || 0))) * 100 : 0} 
                  className="h-2"
                />
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <div className="text-2xl font-bold text-orange-500 tabular-nums">
                    {data?.abandonedCarts?.toLocaleString() || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Abandoned Carts</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <div className="text-2xl font-bold text-green-500 tabular-nums">
                    {data?.totalOrders?.toLocaleString() || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Completed Orders</div>
                </div>
              </div>
            </div>
            <div className="text-center border-l border-border pl-8">
              <div className="text-sm text-muted-foreground mb-2">Potential Lost Revenue</div>
              <div className="text-3xl font-bold text-orange-500 tabular-nums">
                {formatINR((data?.abandonedCarts || 0) * avgOrderValue, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
              <div className="text-xs text-muted-foreground mt-1">Based on AOV</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <LineChart
          title="Weekly Revenue Trend"
          data={dailyRevenue}
          lines={[
            { dataKey: 'revenue', color: 'var(--chart-1)', name: 'Revenue' },
          ]}
          isLoading={isLoading}
          valuePrefix="₹"
          height={280}
        />
        <BarChart
          title="Revenue by Product"
          data={revenueByProduct}
          isLoading={isLoading}
          valuePrefix="₹"
          height={280}
        />
      </div>

      <DataTable
        title="Top Products by Revenue"
        data={topProducts}
        columns={[
          { 
            header: 'Product', 
            accessorKey: (row) => (
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center">
                  <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <div className="font-medium truncate max-w-[200px]" title={row.name}>
                    {row.name}
                  </div>
                  <div className="text-xs text-muted-foreground">{row.productId}</div>
                </div>
              </div>
            )
          },
          { 
            header: 'Sales', 
            accessorKey: (row) => row.sales.toLocaleString(),
            className: 'text-right tabular-nums'
          },
          { 
            header: 'Revenue', 
            accessorKey: (row) => (
              <span className="font-medium text-green-500">
                {formatINR(row.value, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            ),
            className: 'text-right tabular-nums'
          },
        ]}
        isLoading={isLoading}
        pageSize={10}
        emptyMessage="No product data available"
      />
    </div>
  );
}

