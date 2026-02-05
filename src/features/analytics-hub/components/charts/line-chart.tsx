import { LineChart as RechartsLine, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface LineChartProps {
  title: string;
  data: any[];
  lines: { dataKey: string; color: string; name?: string }[];
  xAxisKey?: string;
  isLoading?: boolean;
  className?: string;
  height?: number;
  valuePrefix?: string;
  valueSuffix?: string;
}

export function LineChart({ 
  title, 
  data, 
  lines,
  xAxisKey = 'name',
  isLoading, 
  className,
  height = 300,
  valuePrefix = '',
  valueSuffix = '',
}: LineChartProps) {
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
              <RechartsLine
                data={data}
                margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
              >
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke="var(--border)"
                />
                <XAxis 
                  dataKey={xAxisKey} 
                  tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
                  axisLine={{ stroke: 'var(--border)' }}
                />
                <YAxis 
                  tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
                  axisLine={{ stroke: 'var(--border)' }}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-popover border border-border rounded-lg shadow-lg p-3 text-sm">
                          <p className="font-medium mb-2">{label}</p>
                          {payload.map((item, index) => (
                            <p key={index} style={{ color: item.color }} className="flex items-center gap-2">
                              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                              <span>{item.name}: {valuePrefix}{Number(item.value).toLocaleString()}{valueSuffix}</span>
                            </p>
                          ))}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                {lines.length > 1 && (
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    iconSize={8}
                    formatter={(value) => (
                      <span className="text-xs text-muted-foreground">{value}</span>
                    )}
                  />
                )}
                {lines.map((line, index) => (
                  <Line
                    key={index}
                    type="monotone"
                    dataKey={line.dataKey}
                    stroke={line.color}
                    name={line.name || line.dataKey}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                ))}
              </RechartsLine>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

