import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Eye, ShoppingCart, CreditCard, CheckCircle, ArrowDown } from "lucide-react";

interface FunnelStep {
  name: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  accent: string;
}

interface FunnelChartProps {
  data: {
    productViews: number;
    addToCarts: number;
    checkouts: number;
    purchases: number;
  };
  isLoading?: boolean;
  className?: string;
}

export function FunnelChart({ data, isLoading, className }: FunnelChartProps) {
  const cardClassName = cn(
    "border border-sky-100/80 bg-white/85 shadow-sm backdrop-blur-sm dark:border-border dark:bg-card",
    className
  );
  const steps: FunnelStep[] = [
    { name: 'Product Views', value: data.productViews, icon: <Eye className="h-4 w-4" />, color: 'from-blue-500 to-blue-600', accent: 'bg-blue-500/10 text-blue-700' },
    { name: 'Add to Cart', value: data.addToCarts, icon: <ShoppingCart className="h-4 w-4" />, color: 'from-orange-500 to-orange-600', accent: 'bg-orange-500/10 text-orange-700' },
    { name: 'Checkout', value: data.checkouts, icon: <CreditCard className="h-4 w-4" />, color: 'from-amber-500 to-yellow-600', accent: 'bg-amber-500/10 text-amber-700' },
    { name: 'Purchase', value: data.purchases, icon: <CheckCircle className="h-4 w-4" />, color: 'from-emerald-500 to-green-600', accent: 'bg-emerald-500/10 text-emerald-700' },
  ];

  const maxValue = Math.max(...steps.map(s => s.value), 1);

  const getConversionRate = (current: number, previous: number): string => {
    if (previous === 0) return '0%';
    return ((current / previous) * 100).toFixed(1) + '%';
  };

  if (isLoading) {
    return (
      <Card className={cardClassName}>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-12 w-full rounded-lg" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cardClassName}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Conversion Funnel</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {steps.map((step, index) => {
          const widthPercent = (step.value / maxValue) * 100;
          const prevStep = index > 0 ? steps[index - 1] : null;
          const conversionRate = prevStep ? getConversionRate(step.value, prevStep.value) : null;
          const dropOff = prevStep ? prevStep.value - step.value : 0;
          const normalizedWidth = Math.max(widthPercent, 32);
          
          return (
            <div key={step.name}>
              {index > 0 && (
                <div className="flex items-center justify-center py-1">
                  <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
                    <ArrowDown className="h-3 w-3" />
                    <span className="font-medium text-foreground">{conversionRate}</span>
                    <span>conversion</span>
                    {dropOff > 0 && (
                      <span className="text-red-500">(-{dropOff.toLocaleString()} drop-off)</span>
                    )}
                  </div>
                </div>
              )}
              <div
                className="relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white p-3 shadow-sm"
                data-testid={`funnel-step-${index}`}
              >
                <div
                  className={cn(
                    "flex min-h-[72px] items-center justify-between gap-3 rounded-xl bg-gradient-to-r px-4 py-3 text-white",
                    step.color
                  )}
                  style={{
                    width: `${normalizedWidth}%`,
                    minWidth: "min(100%, 260px)",
                    marginInline: "auto",
                  }}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="rounded-full bg-white/15 p-2">
                      {step.icon}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold tracking-wide text-white/95">{step.name}</p>
                      <p className="text-xs text-white/75">
                        {index === 0 ? "Top of funnel traffic" : "Users carried to this step"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold tabular-nums">{step.value.toLocaleString()}</div>
                    <div className="text-[11px] uppercase tracking-[0.18em] text-white/75">visitors</div>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 px-1 text-xs sm:text-sm">
                  <div className={cn("rounded-full px-2.5 py-1 font-medium", step.accent)}>
                    {((step.value / maxValue) * 100).toFixed(1)}% of peak traffic
                  </div>
                  <div className="text-muted-foreground">
                    {prevStep ? `${conversionRate} from previous step` : "Baseline stage"}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Overall Conversion Rate</span>
            <span className="font-bold text-green-500">
              {data.productViews > 0 
                ? ((data.purchases / data.productViews) * 100).toFixed(2)
                : 0}%
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
