import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

type ChartPoint = {
  name: string
  total: number
  fill?: string
}

type DashboardChartsProps = {
  title: string
  description: string
  data: ChartPoint[]
  layout?: 'horizontal' | 'vertical'
}

export function DataBarChart({ title, description, data, layout = 'vertical' }: DashboardChartsProps) {
  const isHorizontal = layout === 'horizontal'

  return (
    <Card className='h-full'>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className='ps-2'>
        <ResponsiveContainer width='100%' height={300}>
          <BarChart
            data={data}
            layout={isHorizontal ? 'vertical' : 'horizontal'}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <XAxis
              type={isHorizontal ? 'number' : 'category'}
              dataKey={isHorizontal ? undefined : 'name'}
              stroke='#888888'
              fontSize={10}
              tickLine={false}
              axisLine={false}
              hide={isHorizontal}
            />
            <YAxis
              type={isHorizontal ? 'category' : 'number'}
              dataKey={isHorizontal ? 'name' : undefined}
              stroke='#888888'
              fontSize={10}
              tickLine={false}
              axisLine={false}
              width={isHorizontal ? 80 : 40}
            />
            <Tooltip
              cursor={{ fill: 'transparent' }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className='rounded-lg border bg-background p-2 shadow-sm'>
                      <div className='grid grid-cols-2 gap-2'>
                        <div className='flex flex-col'>
                          <span className='text-[0.70rem] uppercase text-muted-foreground'>
                            {payload[0].payload.name}
                          </span>
                          <span className='font-bold text-muted-foreground'>
                            {payload[0].value}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                }
                return null
              }}
            />
            <Bar
              dataKey='total'
              radius={isHorizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]}
              barSize={isHorizontal ? 20 : 30}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill || 'hsl(var(--primary))'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
