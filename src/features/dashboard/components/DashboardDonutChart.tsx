import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

interface DonutChartProps {
  title: string;
  data: { name: string; value: number; color?: string }[];
}

const DEFAULT_COLORS = [
  '#6366f1', // Indigo
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#8b5cf6', // Violet
  '#06b6d4', // Cyan
];

export function DashboardDonutChart({ title, data }: DonutChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="h-[300px] w-full flex flex-col items-center">
      <h3 className="text-sm font-semibold text-muted-foreground mb-4">{title}</h3>
      {data.length === 0 ? (
        <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
          No data available
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={85}
              paddingAngle={5}
              dataKey="value"
              animationBegin={0}
              animationDuration={1500}
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
                  stroke="transparent"
                />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const item = payload[0].payload;
                  const percentage = total > 0 ? ((item.value / total) * 100).toFixed(1) : 0;
                  return (
                    <div className="bg-background border border-border rounded-lg shadow-lg p-2 text-sm">
                      <p className="font-bold text-foreground">{item.name}</p>
                      <p className="text-muted-foreground">
                        {item.value.toLocaleString()} items ({percentage}%)
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend
              layout="horizontal"
              verticalAlign="bottom"
              align="center"
              iconType="circle"
              iconSize={8}
              formatter={(value) => (
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{value}</span>
              )}
            />
            <text
              x="50%"
              y="50%"
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-foreground text-xl font-bold"
            >
              {total}
            </text>
            <text
              x="50%"
              y="60%"
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-muted-foreground text-[10px] uppercase tracking-tighter"
            >
              Total
            </text>
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
