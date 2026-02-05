import { useQuery } from "@tanstack/react-query";
import { useAnalyticsContext } from "@/features/analytics-hub/hooks/use-analytics-context";
import { buildApiUrl } from "@/features/analytics-hub/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatsCard } from "@/features/analytics-hub/components/dashboard/stats-card";
import { FunnelChart } from "@/features/analytics-hub/components/charts/funnel-chart";
import { LineChart } from "@/features/analytics-hub/components/charts/line-chart";
import { DataTable } from "@/features/analytics-hub/components/tables/data-table";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  TrendingDown,
  Eye,
  ShoppingCart,
  CreditCard,
  CheckCircle,
  ArrowRight
} from "lucide-react";
import type { AnalyticsSummary } from "@/features/analytics-hub/lib/types";
import { getQueryFn } from "@/features/analytics-hub/lib/query";

export default function FunnelAnalysis() {
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

  const funnel = data?.funnel || {
    productViews: 0,
    addToCarts: 0,
    checkouts: 0,
    purchases: 0,
  };

  const getConversionRate = (current: number, previous: number): number => {
    if (previous === 0) return 0;
    return (current / previous) * 100;
  };

  const funnelSteps = [
    {
      name: 'Product Views',
      icon: <Eye className="h-4 w-4" />,
      value: funnel.productViews,
      conversionToNext: getConversionRate(funnel.addToCarts, funnel.productViews),
    },
    {
      name: 'Add to Cart',
      icon: <ShoppingCart className="h-4 w-4" />,
      value: funnel.addToCarts,
      conversionToNext: getConversionRate(funnel.checkouts, funnel.addToCarts),
    },
    {
      name: 'Checkout',
      icon: <CreditCard className="h-4 w-4" />,
      value: funnel.checkouts,
      conversionToNext: getConversionRate(funnel.purchases, funnel.checkouts),
    },
    {
      name: 'Purchase',
      icon: <CheckCircle className="h-4 w-4" />,
      value: funnel.purchases,
      conversionToNext: null,
    },
  ];

  // Mock daily funnel data
  const dailyFunnelData = [
    { name: 'Mon', views: 450, carts: 85, checkouts: 42, purchases: 28 },
    { name: 'Tue', views: 520, carts: 98, checkouts: 51, purchases: 35 },
    { name: 'Wed', views: 480, carts: 92, checkouts: 46, purchases: 31 },
    { name: 'Thu', views: 620, carts: 118, checkouts: 62, purchases: 45 },
    { name: 'Fri', views: 710, carts: 142, checkouts: 78, purchases: 58 },
    { name: 'Sat', views: 820, carts: 168, checkouts: 92, purchases: 72 },
    { name: 'Sun', views: 650, carts: 132, checkouts: 68, purchases: 52 },
  ];

  const overallConversionRate = funnel.productViews > 0 
    ? (funnel.purchases / funnel.productViews) * 100 
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-page-title">Funnel Analysis</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Track user journey from product discovery to purchase completion
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {funnelSteps.map((step) => (
          <StatsCard
            key={step.name}
            title={step.name}
            value={step.value.toLocaleString()}
            description={
              step.conversionToNext !== null 
                ? `${step.conversionToNext.toFixed(1)}% to next step` 
                : 'Final step'
            }
            icon={step.icon}
            isLoading={isLoading}
          />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <FunnelChart
          data={funnel}
          isLoading={isLoading}
        />
        
        <Card className={cardClassName}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Conversion Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {funnelSteps.slice(0, -1).map((step, index) => {
              const nextStep = funnelSteps[index + 1];
              const dropOff = step.value - nextStep.value;
              const dropOffRate = step.value > 0 ? (dropOff / step.value) * 100 : 0;
              const conversionToNext = step.conversionToNext ?? 0;
              
              return (
                <div key={step.name} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium">{step.name}</span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      <span className="font-medium">{nextStep.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant="outline" 
                        className={conversionToNext > 50 
                          ? "bg-green-500/10 text-green-500 border-green-500/20" 
                          : conversionToNext > 30 
                            ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                            : "bg-red-500/10 text-red-500 border-red-500/20"
                        }
                      >
                        {conversionToNext.toFixed(1)}%
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>Drop-off: {dropOff.toLocaleString()} users ({dropOffRate.toFixed(1)}%)</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${conversionToNext}%` }}
                    />
                  </div>
                </div>
              );
            })}
            
            <div className="pt-4 border-t border-border">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Overall Conversion</span>
                <div className="flex items-center gap-2">
                  {overallConversionRate > 5 ? (
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  )}
                  <span className={`font-bold ${overallConversionRate > 5 ? 'text-green-500' : 'text-red-500'}`}>
                    {overallConversionRate.toFixed(2)}%
                  </span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {funnel.purchases.toLocaleString()} purchases from {funnel.productViews.toLocaleString()} product views
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <LineChart
        title="Daily Funnel Performance"
        data={dailyFunnelData}
        lines={[
          { dataKey: 'views', color: 'var(--chart-1)', name: 'Views' },
          { dataKey: 'carts', color: 'var(--chart-2)', name: 'Add to Cart' },
          { dataKey: 'checkouts', color: 'var(--chart-3)', name: 'Checkout' },
          { dataKey: 'purchases', color: 'var(--chart-4)', name: 'Purchase' },
        ]}
        isLoading={isLoading}
        height={350}
      />

      <DataTable
        title="Funnel Performance by Day"
        data={dailyFunnelData.map(day => ({
          ...day,
          viewToCart: ((day.carts / day.views) * 100).toFixed(1),
          cartToCheckout: ((day.checkouts / day.carts) * 100).toFixed(1),
          checkoutToPurchase: ((day.purchases / day.checkouts) * 100).toFixed(1),
          overall: ((day.purchases / day.views) * 100).toFixed(2),
        }))}
        columns={[
          { header: 'Day', accessorKey: 'name' },
          { header: 'Views', accessorKey: (row) => row.views.toLocaleString(), className: 'text-right tabular-nums' },
          { header: 'Carts', accessorKey: (row) => row.carts.toLocaleString(), className: 'text-right tabular-nums' },
          { header: 'Checkouts', accessorKey: (row) => row.checkouts.toLocaleString(), className: 'text-right tabular-nums' },
          { header: 'Purchases', accessorKey: (row) => row.purchases.toLocaleString(), className: 'text-right tabular-nums' },
          { 
            header: 'Overall %', 
            accessorKey: (row) => (
              <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                {row.overall}%
              </Badge>
            ),
            className: 'text-right' 
          },
        ]}
        isLoading={isLoading}
        emptyMessage="No funnel data available"
      />
    </div>
  );
}

