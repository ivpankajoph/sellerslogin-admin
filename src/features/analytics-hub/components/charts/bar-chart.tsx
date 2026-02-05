import { BarChart as RechartsBar, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface BarChartProps {
  title: string;
  data: { name: string; value: number; color?: string }[];
  isLoading?: boolean;
  className?: string;
  horizontal?: boolean;
  showGrid?: boolean;
  height?: number;
  valuePrefix?: string;
  valueSuffix?: string;
}

const COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
];

export function BarChart({ 
  title, 
  data, 
  isLoading, 
  className,
  horizontal = false,
  showGrid = true,
  height = 300,
  valuePrefix = '',
  valueSuffix = '',
}: BarChartProps) {
  const cardClassName = cn(
    "border border-sky-100/80 bg-white/85 shadow-sm backdrop-blur-sm dark:border-border dark:bg-card",
    className
  );

  if (isLoading) {
    return (
      <Card className={cardClassName}>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cardClassName}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">
            No data available
          </div>
        ) : (
          <div style={{ height }}>
            <ResponsiveContainer width="100%" height="100%">
              <RechartsBar
                data={data}
                layout={horizontal ? 'vertical' : 'horizontal'}
                margin={{ top: 10, right: 10, left: horizontal ? 80 : 10, bottom: 5 }}
              >
                {showGrid && (
                  <CartesianGrid 
                    strokeDasharray="3 3" 
                    stroke="var(--border)"
                    vertical={!horizontal}
                    horizontal={horizontal}
                  />
                )}
                {horizontal ? (
                  <>
                    <XAxis type="number" tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} />
                    <YAxis 
                      type="category" 
                      dataKey="name" 
                      tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
                      width={70}
                    />
                  </>
                ) : (
                  <>
                    <XAxis 
                      dataKey="name" 
                      tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
                      axisLine={{ stroke: 'var(--border)' }}
                    />
                    <YAxis 
                      tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
                      axisLine={{ stroke: 'var(--border)' }}
                    />
                  </>
                )}
                <Tooltip
                  cursor={{ fill: 'var(--muted)' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0].payload;
                      return (
                        <div className="bg-popover border border-border rounded-lg shadow-lg p-2 text-sm">
                          <p className="font-medium">{item.name}</p>
                          <p className="text-muted-foreground">
                            {valuePrefix}{item.value.toLocaleString()}{valueSuffix}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {data.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.color || COLORS[index % COLORS.length]}
                    />
                  ))}
                </Bar>
              </RechartsBar>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

