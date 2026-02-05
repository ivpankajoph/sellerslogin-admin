import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { AnalyticsChart } from './analytics-chart'
import { 
  Globe, 
  Users, 
  TrendingUp, 
  Clock, 

  Map,
  Smartphone,
  Monitor,
  Tablet,
  Calendar,
  Filter,
  Download,
  RefreshCw
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

// Updated SimpleBarList component with more features
function SimpleBarList({
  items,
  valueFormatter,
  barClass,
  showPercentage = false,
}: {
  items: { name: string; value: number; percentage?: number }[]
  valueFormatter: (n: number) => string
  barClass: string
  showPercentage?: boolean
}) {
  const max = Math.max(...items.map((i) => i.value), 1)
  return (
    <ul className='space-y-3'>
      {items.map((i) => {
        const width = `${Math.round((i.value / max) * 100)}%`
        return (
          <li key={i.name} className='flex items-center justify-between gap-3'>
            <div className='min-w-0 flex-1'>
              <div className='flex justify-between mb-1'>
                <div className='text-muted-foreground truncate text-xs'>
                  {i.name}
                </div>
                {showPercentage && i.percentage !== undefined && (
                  <span className='text-xs text-muted-foreground'>
                    {i.percentage}%
                  </span>
                )}
              </div>
              <div className='bg-muted h-2.5 w-full rounded-full'>
                <div
                  className={`h-2.5 rounded-full ${barClass}`}
                  style={{ width }}
                />
              </div>
            </div>
            <div className='ps-2 text-xs font-medium tabular-nums'>
              {valueFormatter(i.value)}
            </div>
          </li>
        )
      })}
    </ul>
  )
}

// Enhanced metric card component
function MetricCard({
  title,
  value,
  change,
  icon: Icon,
  isPositive = true,
}: {
  title: string
  value: string
  change: string
  icon: React.ElementType
  isPositive?: boolean
}) {
  return (
    <Card>
      <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
        <CardTitle className='text-sm font-medium'>{title}</CardTitle>
        <Icon className='text-muted-foreground h-4 w-4' />
      </CardHeader>
      <CardContent>
        <div className='text-2xl font-bold'>{value}</div>
        <p className={`text-xs ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
          {change}
        </p>
      </CardContent>
    </Card>
  )
}

// Audience overview component
function AudienceOverview() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Audience Overview</CardTitle>
        <CardDescription>Key metrics about your users</CardDescription>
      </CardHeader>
      <CardContent>
        <div className='grid grid-cols-2 gap-4'>
          <div>
            <p className='text-sm text-muted-foreground'>Active Users</p>
            <p className='text-2xl font-bold'>1,248</p>
            <p className='text-xs text-emerald-500'>+12.4% from yesterday</p>
          </div>
          <div>
            <p className='text-sm text-muted-foreground'>Users Today</p>
            <p className='text-2xl font-bold'>832</p>
            <p className='text-xs text-red-500'>-3.2% from yesterday</p>
          </div>
        </div>
        <div className='mt-4 h-64'>
          {/* Placeholder for active users chart */}
          <div className='bg-muted rounded-lg h-full flex items-center justify-center'>
            <span className='text-muted-foreground'>Active Users Chart</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Geographic distribution component
function GeographicDistribution() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Geographic Distribution</CardTitle>
        <CardDescription>Where your users are located</CardDescription>
      </CardHeader>
      <CardContent>
        <div className='grid grid-cols-2 gap-4'>
          <div>
            <SimpleBarList
              items={[
                { name: 'United States', value: 420, percentage: 50 },
                { name: 'India', value: 180, percentage: 22 },
                { name: 'Germany', value: 120, percentage: 14 },
                { name: 'United Kingdom', value: 80, percentage: 10 },
                { name: 'Canada', value: 40, percentage: 4 },
              ]}
              barClass='bg-blue-500'
              valueFormatter={(n) => `${n}`}
              showPercentage
            />
          </div>
          <div className='flex items-center justify-center'>
            <Map className='text-muted-foreground h-40 w-40' />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Traffic sources component
function TrafficSources() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Traffic Sources</CardTitle>
        <CardDescription>How visitors find your site</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="organic">Organic</TabsTrigger>
            <TabsTrigger value="social">Social</TabsTrigger>
            <TabsTrigger value="referral">Referral</TabsTrigger>
          </TabsList>
          <TabsContent value="all" className="mt-4">
            <SimpleBarList
              items={[
                { name: 'Direct', value: 512, percentage: 41 },
                { name: 'Organic Search', value: 320, percentage: 26 },
                { name: 'Social Media', value: 238, percentage: 19 },
                { name: 'Referral', value: 104, percentage: 8 },
                { name: 'Email', value: 76, percentage: 6 },
              ]}
              barClass='bg-primary'
              valueFormatter={(n) => `${n}`}
              showPercentage
            />
          </TabsContent>
          <TabsContent value="organic" className="mt-4">
            <SimpleBarList
              items={[
                { name: 'Google', value: 280, percentage: 87.5 },
                { name: 'Bing', value: 25, percentage: 7.8 },
                { name: 'Yahoo', value: 15, percentage: 4.7 },
              ]}
              barClass='bg-green-500'
              valueFormatter={(n) => `${n}`}
              showPercentage
            />
          </TabsContent>
          <TabsContent value="social" className="mt-4">
            <SimpleBarList
              items={[
                { name: 'Facebook', value: 120, percentage: 50.4 },
                { name: 'Twitter', value: 74, percentage: 31.1 },
                { name: 'LinkedIn', value: 30, percentage: 12.6 },
                { name: 'Instagram', value: 14, percentage: 5.9 },
              ]}
              barClass='bg-purple-500'
              valueFormatter={(n) => `${n}`}
              showPercentage
            />
          </TabsContent>
          <TabsContent value="referral" className="mt-4">
            <SimpleBarList
              items={[
                { name: 'Blog', value: 60, percentage: 57.7 },
                { name: 'News Sites', value: 25, percentage: 24.0 },
                { name: 'Forums', value: 19, percentage: 18.3 },
              ]}
              barClass='bg-amber-500'
              valueFormatter={(n) => `${n}`}
              showPercentage
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

// Device and browser component
function DeviceBrowser() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Devices & Browsers</CardTitle>
        <CardDescription>How users access your app</CardDescription>
      </CardHeader>
      <CardContent>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
          <div>
            <h3 className='text-sm font-medium mb-3'>Devices</h3>
            <SimpleBarList
              items={[
                { name: 'Desktop', value: 74, percentage: 74 },
                { name: 'Mobile', value: 22, percentage: 22 },
                { name: 'Tablet', value: 4, percentage: 4 },
              ]}
              barClass='bg-muted-foreground'
              valueFormatter={(n) => `${n}%`}
              showPercentage
            />
          </div>
          <div>
            <h3 className='text-sm font-medium mb-3'>Browsers</h3>
            <SimpleBarList
              items={[
                { name: 'Chrome', value: 68, percentage: 68 },
                { name: 'Safari', value: 18, percentage: 18 },
                { name: 'Firefox', value: 8, percentage: 8 },
                { name: 'Edge', value: 4, percentage: 4 },
                { name: 'Other', value: 2, percentage: 2 },
              ]}
              barClass='bg-muted-foreground'
              valueFormatter={(n) => `${n}%`}
              showPercentage
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Top pages component
function TopPages() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Pages</CardTitle>
        <CardDescription>Most visited pages on your site</CardDescription>
      </CardHeader>
      <CardContent>
        <SimpleBarList
          items={[
            { name: '/dashboard', value: 1248, percentage: 32 },
            { name: '/settings', value: 980, percentage: 25 },
            { name: '/docs', value: 754, percentage: 19 },
            { name: '/pricing', value: 521, percentage: 13 },
            { name: '/contact', value: 432, percentage: 11 },
          ]}
          barClass='bg-indigo-500'
          valueFormatter={(n) => `${n}`}
          showPercentage
        />
      </CardContent>
    </Card>
  )
}

// Conversion metrics component
function ConversionMetrics() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Conversion Metrics</CardTitle>
        <CardDescription>Track your key performance indicators</CardDescription>
      </CardHeader>
      <CardContent>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          <div>
            <h3 className='text-sm font-medium mb-2'>Goals</h3>
            <div className='space-y-2'>
              <div className='flex justify-between'>
                <span className='text-muted-foreground'>Newsletter Signup</span>
                <span className='font-medium'>24.5%</span>
              </div>
              <div className='flex justify-between'>
                <span className='text-muted-foreground'>Purchase</span>
                <span className='font-medium'>8.2%</span>
              </div>
              <div className='flex justify-between'>
                <span className='text-muted-foreground'>Contact Form</span>
                <span className='font-medium'>12.7%</span>
              </div>
            </div>
          </div>
          <div>
            <h3 className='text-sm font-medium mb-2'>E-commerce</h3>
            <div className='space-y-2'>
              <div className='flex justify-between'>
                <span className='text-muted-foreground'>Conversion Rate</span>
                <span className='font-medium'>3.2%</span>
              </div>
              <div className='flex justify-between'>
                <span className='text-muted-foreground'>Avg. Order Value</span>
                <span className='font-medium'>$87.42</span>
              </div>
              <div className='flex justify-between'>
                <span className='text-muted-foreground'>Revenue</span>
                <span className='font-medium'>$12,480</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function Analytics() {
  return (
    <div className='space-y-4'>
      {/* Controls and filters */}
      <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4'>
        <div className='flex items-center gap-2'>
          <Button variant="outline" size="sm">
            <Calendar className="mr-2 h-4 w-4" />
            Last 7 days
          </Button>
          <Button variant="outline" size="sm">
            <Filter className="mr-2 h-4 w-4" />
            Filter
          </Button>
        </div>
        <div className='flex items-center gap-2'>
          <Select defaultValue="all">
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select property" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Properties</SelectItem>
              <SelectItem value="main">Main Website</SelectItem>
              <SelectItem value="blog">Blog</SelectItem>
              <SelectItem value="shop">Online Shop</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main chart */}
      <Card>
        <CardHeader>
          <div className='flex justify-between items-center'>
            <div>
              <CardTitle>Traffic Overview</CardTitle>
              <CardDescription>Weekly clicks and unique visitors</CardDescription>
            </div>
            <Badge variant="secondary">Real-time</Badge>
          </div>
        </CardHeader>
        <CardContent className='px-6'>
          <AnalyticsChart />
        </CardContent>
      </Card>

      {/* Key metrics grid */}
      <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
        <MetricCard 
          title="Total Users" 
          value="1,248" 
          change="+12.4% vs last week" 
          icon={Users}
          isPositive={true}
        />
        <MetricCard 
          title="Page Views" 
          value="12,480" 
          change="+8.2% vs last week" 
          icon={Globe}
          isPositive={true}
        />
        <MetricCard 
          title="Bounce Rate" 
          value="42%" 
          change="-3.2% vs last week" 
          icon={TrendingUp}
          isPositive={false}
        />
        <MetricCard 
          title="Avg. Session" 
          value="3m 24s" 
          change="+18s vs last week" 
          icon={Clock}
          isPositive={true}
        />
      </div>

      {/* Detailed analytics grid */}
      <div className='grid grid-cols-1 gap-4 lg:grid-cols-7'>
        <div className='lg:col-span-4 space-y-4'>
          <AudienceOverview />
          <GeographicDistribution />
        </div>
        <div className='lg:col-span-3 space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle>Device Breakdown</CardTitle>
              <CardDescription>Desktop vs Mobile</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <Monitor className="h-4 w-4 text-blue-500" />
                    <span>Desktop</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4 text-green-500" />
                    <span>Mobile</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Tablet className="h-4 w-4 text-purple-500" />
                    <span>Tablet</span>
                  </div>
                </div>
                <div className="w-48 h-48 rounded-full border-8 border-blue-500 relative">
                  <div className="absolute inset-0 rounded-full border-8 border-green-500 border-t-transparent border-r-transparent" style={{ transform: 'rotate(120deg)' }}></div>
                  <div className="absolute inset-0 rounded-full border-8 border-purple-500 border-t-transparent border-r-transparent border-b-transparent" style={{ transform: 'rotate(160deg)' }}></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-bold">100%</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <TopPages />
        </div>
      </div>

      {/* Additional analytics sections */}
      <div className='grid grid-cols-1 gap-4'>
        <TrafficSources />
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          <DeviceBrowser />
          <ConversionMetrics />
        </div>
      </div>
    </div>
  )
}