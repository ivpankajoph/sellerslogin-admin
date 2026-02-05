import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Eye, ShoppingCart, CreditCard, CheckCircle, ArrowDown } from "lucide-react";

interface FunnelStep {
  name: string;
  value: number;
  icon: React.ReactNode;
  color: string;
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
    { name: 'Product Views', value: data.productViews, icon: <Eye className="h-4 w-4" />, color: 'bg-blue-500' },
    { name: 'Add to Cart', value: data.addToCarts, icon: <ShoppingCart className="h-4 w-4" />, color: 'bg-orange-500' },
    { name: 'Checkout', value: data.checkouts, icon: <CreditCard className="h-4 w-4" />, color: 'bg-yellow-500' },
    { name: 'Purchase', value: data.purchases, icon: <CheckCircle className="h-4 w-4" />, color: 'bg-green-500' },
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
      <CardContent className="space-y-2">
        {steps.map((step, index) => {
          const widthPercent = (step.value / maxValue) * 100;
          const prevStep = index > 0 ? steps[index - 1] : null;
          const conversionRate = prevStep ? getConversionRate(step.value, prevStep.value) : null;
          const dropOff = prevStep ? prevStep.value - step.value : 0;
          
          return (
            <div key={step.name}>
              {index > 0 && (
                <div className="flex items-center justify-center py-1">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
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
                className={cn(
                  "relative h-14 rounded-lg flex items-center px-4 gap-3 transition-all",
                  step.color
                )}
                style={{ 
                  width: `${Math.max(widthPercent, 30)}%`,
                  marginLeft: `${(100 - Math.max(widthPercent, 30)) / 2}%`
                }}
                data-testid={`funnel-step-${index}`}
              >
                <div className="text-white">
                  {step.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{step.name}</p>
                </div>
                <div className="text-white font-bold tabular-nums">
                  {step.value.toLocaleString()}
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
