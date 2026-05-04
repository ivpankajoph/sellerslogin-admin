import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { endOfDay, format, isWithinInterval, startOfDay } from 'date-fns'
import {
  CalendarDays,
  Download,
  FileDown,
  Flame,
  Grid2X2,
  TrendingUp,
  Users,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  FoodModuleShell,
  formatLabel,
  money,
  useFoodHotItems,
  useFoodOperationsData,
} from '@/features/food-ops/shared'

type ReportTab = 'sales' | 'hot-products' | 'repeat-customers'

const tabOptions: Array<{ key: ReportTab; label: string; icon: ReactNode }> = [
  {
    key: 'sales',
    label: 'Sales Report',
    icon: <Grid2X2 className='h-4 w-4' />,
  },
  {
    key: 'hot-products',
    label: 'Hot Products',
    icon: <Flame className='h-4 w-4' />,
  },
  {
    key: 'repeat-customers',
    label: 'Repeat Customers',
    icon: <Users className='h-4 w-4' />,
  },
]

const normalizeReportTab = (value: string | null): ReportTab => {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
  if (normalized === 'hotproducts' || normalized === 'hot-products') {
    return 'hot-products'
  }
  if (
    normalized === 'repeatedcustomers' ||
    normalized === 'repeated-customers' ||
    normalized === 'repeat-customers' ||
    normalized === 'crm'
  ) {
    return 'repeat-customers'
  }
  return 'sales'
}

const statusIsPaid = (value?: string) =>
  String(value || '').toLowerCase() === 'paid'

export default function FoodReportsPage() {
  const { loading, orders } = useFoodOperationsData()
  const [activeTab, setActiveTab] = useState<ReportTab>(() =>
    typeof window === 'undefined'
      ? 'sales'
      : normalizeReportTab(
          new URLSearchParams(window.location.search).get('tab')
        )
  )
  const [dateRange, setDateRange] = useState({
    start: format(new Date(), 'yyyy-MM-01'),
    end: format(new Date(), 'yyyy-MM-dd'),
  })

  useEffect(() => {
    const syncTab = () => {
      setActiveTab(
        normalizeReportTab(
          new URLSearchParams(window.location.search).get('tab')
        )
      )
    }
    window.addEventListener('popstate', syncTab)
    return () => window.removeEventListener('popstate', syncTab)
  }, [])

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const dateValue = new Date(order.createdAt || order.updatedAt || '')
      if (Number.isNaN(dateValue.getTime())) return false
      return isWithinInterval(dateValue, {
        start: startOfDay(new Date(dateRange.start)),
        end: endOfDay(new Date(dateRange.end)),
      })
    })
  }, [dateRange.end, dateRange.start, orders])

  const salesSummary = useMemo(() => {
    const chartMap = new Map<string, number>()
    let pendingRevenue = 0
    let paidRevenue = 0
    let totalRevenue = 0

    filteredOrders.forEach((order) => {
      const amount = Number(order.total || 0)
      totalRevenue += amount
      if (statusIsPaid(order.payment_status)) paidRevenue += amount
      else pendingRevenue += amount
      const rawDate = new Date(order.createdAt || order.updatedAt || '')
      const dateKey = Number.isNaN(rawDate.getTime())
        ? 'Unknown'
        : format(rawDate, 'MMM dd')
      chartMap.set(dateKey, Number(chartMap.get(dateKey) || 0) + amount)
    })

    return {
      paidRevenue,
      pendingRevenue,
      totalRevenue,
      totalOrders: filteredOrders.length,
      chartData: Array.from(chartMap.entries()).map(([date, total]) => ({
        date,
        total,
      })),
    }
  }, [filteredOrders])

  const hotProducts = useFoodHotItems(filteredOrders)

  const repeatedCustomers = useMemo(() => {
    const map = new Map<
      string,
      {
        name: string
        phone: string
        visits: number
        totalSpend: number
        lastOrderAt: string
        preferredModes: Set<string>
      }
    >()
    filteredOrders.forEach((order) => {
      const phone = String(order.shipping_address?.phone || '').trim()
      if (!phone) return
      const name = String(order.shipping_address?.full_name || 'Customer')
      const lastOrderAt = String(order.createdAt || order.updatedAt || '')
      const existing = map.get(phone) || {
        name,
        phone,
        visits: 0,
        totalSpend: 0,
        lastOrderAt,
        preferredModes: new Set<string>(),
      }
      existing.visits += 1
      existing.totalSpend += Number(order.total || 0)
      if (order.payment_method)
        existing.preferredModes.add(order.payment_method)
      if (lastOrderAt > existing.lastOrderAt) existing.lastOrderAt = lastOrderAt
      map.set(phone, existing)
    })
    return Array.from(map.values()).sort((a, b) => b.visits - a.visits)
  }, [filteredOrders])

  const activeCustomers = useMemo(
    () =>
      new Set(
        filteredOrders
          .map((order) => String(order.shipping_address?.phone || '').trim())
          .filter(Boolean)
      ).size,
    [filteredOrders]
  )

  const topProduct = hotProducts[0]

  const recentOrderRows = useMemo(
    () =>
      filteredOrders.slice(0, 8).map((order) => ({
        id: order._id,
        mode: formatLabel(order.payment_method || 'cod'),
        customer: order.shipping_address?.full_name || 'Walk-in customer',
        date: order.createdAt
          ? new Date(order.createdAt).toLocaleDateString()
          : 'Recent',
        amount: money(order.total),
      })),
    [filteredOrders]
  )

  return (
    <FoodModuleShell
      title='Reports'
      description='Sales, product performance, and repeat customer insights for your food business.'
      moduleLabel='Reports'
      showModuleCard={false}
    >
      <Card className='rounded-2xl border border-slate-200 bg-white py-0 shadow-sm'>
        <CardContent className='grid gap-3 p-4 xl:grid-cols-[180px_180px_minmax(0,1fr)] xl:items-end'>
          <div className='min-w-0'>
            <p className='mb-2 text-[11px] font-black tracking-[0.14em] text-slate-400 uppercase'>
              From Date
            </p>
            <div className='relative'>
              <CalendarDays className='absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-sky-600' />
              <Input
                type='date'
                value={dateRange.start}
                onChange={(event) =>
                  setDateRange((current) => ({
                    ...current,
                    start: event.target.value,
                  }))
                }
                className='h-11 rounded-xl bg-slate-50 pl-10 text-sm font-black'
              />
            </div>
          </div>
          <div className='min-w-0'>
            <p className='mb-2 text-[11px] font-black tracking-[0.14em] text-slate-400 uppercase'>
              To Date
            </p>
            <div className='relative'>
              <CalendarDays className='absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-sky-600' />
              <Input
                type='date'
                value={dateRange.end}
                onChange={(event) =>
                  setDateRange((current) => ({
                    ...current,
                    end: event.target.value,
                  }))
                }
                className='h-11 rounded-xl bg-slate-50 pl-10 text-sm font-black'
              />
            </div>
          </div>
          <div className='flex min-w-0 flex-wrap gap-2 xl:justify-end'>
            <Button className='h-11 w-full rounded-xl bg-sky-600 px-4 text-xs font-black tracking-[0.1em] text-white uppercase hover:bg-sky-700 sm:w-auto'>
              Generate Report
            </Button>
            <Button
              variant='outline'
              className='h-11 flex-1 rounded-xl px-4 sm:flex-none'
            >
              <Download className='mr-2 h-4 w-4' />
              Excel
            </Button>
            <Button
              variant='outline'
              className='h-11 flex-1 rounded-xl px-4 sm:flex-none'
            >
              <FileDown className='mr-2 h-4 w-4' />
              PDF / Print
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
        {[
          {
            label: 'Total Sales',
            value: money(salesSummary.paidRevenue),
            helper: `${filteredOrders.filter((order) => statusIsPaid(order.payment_status)).length} paid orders`,
            icon: TrendingUp,
            tone: 'bg-emerald-50 text-emerald-600',
          },
          {
            label: 'Pending Value',
            value: money(salesSummary.pendingRevenue),
            helper: 'Unsettled dues',
            icon: CalendarDays,
            tone: 'bg-amber-50 text-amber-600',
          },
          {
            label: 'Top Product',
            value: topProduct?.name || 'N/A',
            helper: `${topProduct?.quantity || 0} units sold`,
            icon: Flame,
            tone: 'bg-orange-50 text-orange-600',
          },
          {
            label: 'Active Customers',
            value: String(activeCustomers),
            helper: 'Captured CRM',
            icon: Users,
            tone: 'bg-sky-50 text-sky-600',
          },
        ].map((metric) => (
          <Card
            key={metric.label}
            className='rounded-2xl border border-slate-200 bg-white py-0 shadow-sm'
          >
            <CardContent className='p-4'>
              <div className='flex items-start justify-between gap-3'>
                <div className='min-w-0'>
                  <p className='text-[11px] font-black tracking-[0.16em] text-slate-400 uppercase'>
                    {metric.label}
                  </p>
                  <p className='mt-3 truncate text-2xl font-black text-slate-950'>
                    {metric.value}
                  </p>
                  <p className='mt-2 truncate text-[11px] font-black text-slate-400 uppercase italic'>
                    {metric.helper}
                  </p>
                </div>
                <span
                  className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${metric.tone}`}
                >
                  <metric.icon className='h-5 w-5' />
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className='mx-auto grid w-full max-w-3xl grid-cols-3 rounded-2xl bg-slate-100 p-1 shadow-inner'>
        {tabOptions.map((tab) => {
          const active = activeTab === tab.key
          return (
            <button
              key={tab.key}
              type='button'
              onClick={() => setActiveTab(tab.key)}
              className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl px-2 text-[11px] font-black tracking-[0.08em] uppercase transition ${
                active
                  ? 'bg-white text-sky-600 shadow-[0_10px_28px_rgba(15,23,42,0.12)]'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {tab.icon}
              <span className='hidden sm:inline'>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {activeTab === 'sales' ? (
        <Card className='rounded-3xl border border-slate-200 bg-white py-0 shadow-sm'>
          <CardHeader className='px-5 py-5 sm:px-6'>
            <CardTitle className='text-xl font-black text-slate-950'>
              Revenue Analysis
            </CardTitle>
            <p className='text-xs font-black tracking-[0.16em] text-slate-400 uppercase'>
              Daily trend & breakdown
            </p>
          </CardHeader>
          <CardContent className='space-y-5 px-4 pb-5 sm:px-6'>
            <div className='h-64 rounded-2xl bg-white lg:h-72'>
              <ResponsiveContainer width='100%' height='100%'>
                <AreaChart data={salesSummary.chartData}>
                  <defs>
                    <linearGradient
                      id='foodReportsArea'
                      x1='0'
                      y1='0'
                      x2='0'
                      y2='1'
                    >
                      <stop
                        offset='5%'
                        stopColor='#0ea5e9'
                        stopOpacity={0.22}
                      />
                      <stop offset='95%' stopColor='#0ea5e9' stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray='3 3'
                    vertical={false}
                    stroke='#e2e8f0'
                  />
                  <XAxis dataKey='date' axisLine={false} tickLine={false} />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value) => `Rs ${value}`}
                  />
                  <Tooltip
                    formatter={(value: number) => [money(value), 'Revenue']}
                  />
                  <Area
                    type='monotone'
                    dataKey='total'
                    stroke='#0ea5e9'
                    fill='url(#foodReportsArea)'
                    strokeWidth={4}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className='overflow-x-auto rounded-2xl border border-slate-100'>
              <div className='min-w-[700px]'>
                <div className='grid grid-cols-[1fr_1.2fr_0.8fr_0.8fr] bg-slate-50 px-5 py-4 text-xs font-black tracking-[0.14em] text-slate-400 uppercase'>
                  <span>Order Mode</span>
                  <span>Customer Name</span>
                  <span>Date</span>
                  <span className='text-right'>Amount</span>
                </div>
                {recentOrderRows.length ? (
                  recentOrderRows.map((row) => (
                    <div
                      key={row.id}
                      className='grid grid-cols-[1fr_1.2fr_0.8fr_0.8fr] border-t border-slate-100 px-5 py-4 text-sm font-semibold text-slate-700'
                    >
                      <span>{row.mode}</span>
                      <span>{row.customer}</span>
                      <span>{row.date}</span>
                      <span className='text-right font-black text-slate-950'>
                        {row.amount}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className='px-5 py-10 text-center text-sm text-slate-500'>
                    No sales orders found for this date range.
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {activeTab === 'hot-products' ? (
        <Card className='rounded-3xl border border-slate-200 bg-white py-0 shadow-sm'>
          <CardHeader className='px-5 py-5 sm:px-6'>
            <CardTitle className='text-xl font-black text-slate-950'>
              Best Sellers
            </CardTitle>
            <p className='text-xs font-black tracking-[0.16em] text-slate-400 uppercase'>
              Product wise performance index
            </p>
          </CardHeader>
          <CardContent className='grid gap-6 px-4 pb-5 sm:px-6 xl:grid-cols-[minmax(0,1fr)_420px]'>
            <div className='space-y-4'>
              {hotProducts.length ? (
                hotProducts.slice(0, 10).map((item, index) => (
                  <div
                    key={`${item.name}-${index}`}
                    className='flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-5 py-4'
                  >
                    <div>
                      <p className='text-base font-black text-slate-950'>
                        {item.name}
                      </p>
                      <p className='mt-1 text-sm text-slate-500'>
                        Revenue {money(item.revenue)}
                      </p>
                    </div>
                    <Badge
                      variant='outline'
                      className='rounded-full px-4 py-2 text-xs font-black'
                    >
                      {item.quantity} sold
                    </Badge>
                  </div>
                ))
              ) : (
                <div className='rounded-2xl border border-dashed border-slate-200 px-4 py-12 text-center text-sm text-slate-500'>
                  No product sales in this date range.
                </div>
              )}
            </div>
            <div className='min-h-64 rounded-2xl bg-white'>
              <ResponsiveContainer width='100%' height={280}>
                <BarChart data={hotProducts.slice(0, 6)}>
                  <CartesianGrid
                    strokeDasharray='3 3'
                    vertical={false}
                    stroke='#e2e8f0'
                  />
                  <XAxis
                    dataKey='name'
                    axisLine={false}
                    tickLine={false}
                    hide
                  />
                  <YAxis axisLine={false} tickLine={false} />
                  <Tooltip formatter={(value: number) => [value, 'Qty']} />
                  <Bar
                    dataKey='quantity'
                    radius={[14, 14, 0, 0]}
                    fill='#0ea5e9'
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {activeTab === 'repeat-customers' ? (
        <Card className='rounded-3xl border border-slate-200 bg-white py-0 shadow-sm'>
          <CardHeader className='px-5 py-5 sm:px-6'>
            <CardTitle className='text-xl font-black text-slate-950'>
              CRM Insights
            </CardTitle>
            <p className='text-xs font-black tracking-[0.16em] text-slate-400 uppercase'>
              Return rate & lifetime value
            </p>
          </CardHeader>
          <CardContent className='px-4 pb-5 sm:px-6'>
            <div className='overflow-hidden rounded-2xl border border-slate-100'>
              <div className='hidden grid-cols-[1.2fr_0.6fr_1fr_0.8fr_0.9fr] bg-slate-50 px-5 py-4 text-xs font-black tracking-[0.14em] text-slate-400 uppercase xl:grid'>
                <span>Customer Details</span>
                <span>Visits</span>
                <span>Preferred Modes</span>
                <span>Last Visit</span>
                <span className='text-right'>LTV</span>
              </div>
              {loading ? (
                <div className='space-y-3 p-5'>
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div
                      key={index}
                      className='h-16 animate-pulse rounded-2xl bg-slate-100'
                    />
                  ))}
                </div>
              ) : repeatedCustomers.length ? (
                repeatedCustomers.map((customer) => (
                  <div
                    key={customer.phone}
                    className='grid gap-3 border-t border-slate-100 px-5 py-4 text-sm xl:grid-cols-[1.2fr_0.6fr_1fr_0.8fr_0.9fr] xl:items-center'
                  >
                    <div>
                      <p className='font-black text-slate-950'>
                        {customer.name}
                      </p>
                      <p className='mt-1 text-xs text-slate-500'>
                        {customer.phone}
                      </p>
                    </div>
                    <p className='font-black text-slate-900'>
                      {customer.visits} visits
                    </p>
                    <p className='text-slate-600'>
                      {Array.from(customer.preferredModes)
                        .map(formatLabel)
                        .join(', ') || 'N/A'}
                    </p>
                    <p className='text-slate-600'>
                      {customer.lastOrderAt
                        ? new Date(customer.lastOrderAt).toLocaleDateString()
                        : 'N/A'}
                    </p>
                    <p className='text-right font-black text-slate-950'>
                      {money(customer.totalSpend)}
                    </p>
                  </div>
                ))
              ) : (
                <div className='px-5 py-12 text-center text-sm text-slate-500'>
                  No repeat customer data available yet.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </FoodModuleShell>
  )
}
