import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  trend?: number;
  trendLabel?: string;
  icon?: React.ReactNode;
  isLive?: boolean;
  isLoading?: boolean;
  className?: string;
  valueClassName?: string;
}

export function StatsCard({
  title,
  value,
  description,
  trend,
  trendLabel,
  icon,
  isLive,
  isLoading,
  className,
  valueClassName,
}: StatsCardProps) {
  const getTrendIcon = () => {
    if (trend === undefined || trend === 0) return <Minus className="h-3 w-3" />;
    return trend > 0 ? (
      <TrendingUp className="h-3 w-3" />
    ) : (
      <TrendingDown className="h-3 w-3" />
    );
  };

  const getTrendColor = () => {
    if (trend === undefined || trend === 0) return "text-muted-foreground";
    return trend > 0 ? "text-green-500" : "text-red-500";
  };

  const cardClassName = cn(
    "border border-sky-100/80 bg-gradient-to-br from-white via-white to-sky-50/80 shadow-sm dark:border-border dark:from-card dark:via-card dark:to-card",
    className
  );

  if (isLoading) {
    return (
      <Card className={cardClassName}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-4" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-3 w-20" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cardClassName}>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="flex items-center gap-2">
          {isLive && (
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] text-green-500 font-medium">LIVE</span>
            </span>
          )}
          {icon && (
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-br from-sky-100 to-emerald-100 text-sky-700">
              {icon}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className={cn("text-2xl font-bold tabular-nums", valueClassName)}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </div>
        {(description || trend !== undefined) && (
          <div className="flex items-center gap-2 mt-1">
            {trend !== undefined && (
              <span className={cn("flex items-center gap-0.5 text-xs font-medium", getTrendColor())}>
                {getTrendIcon()}
                {Math.abs(trend)}%
              </span>
            )}
            {description && (
              <span className="text-xs text-muted-foreground">{description}</span>
            )}
            {trendLabel && (
              <span className="text-xs text-muted-foreground">{trendLabel}</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
