import { useMemo, useState } from 'react'
import { endOfDay, format, isWithinInterval, startOfDay } from 'date-fns'
import { CalendarDays, Download, Flame, Repeat, TrendingUp } from 'lucide-react'
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  FoodModuleShell,
  money,
  useFoodHotItems,
  useFoodOperationsData,
} from '@/features/food-ops/shared'

type ReportTab = 'sales' | 'hot-products' | 'repeat-customers'

const tabOptions: Array<{ key: ReportTab; label: string; icon: React.ReactNode }> = [
  { key: 'sales', label: 'Sales', icon: <TrendingUp className='h-4 w-4' /> },
  { key: 'hot-products', label: 'Hot Products', icon: <Flame className='h-4 w-4' /> },
  { key: 'repeat-customers', label: 'Repeated Customers', icon: <Repeat className='h-4 w-4' /> },
]

export default function FoodReportsPage() {
  const { loading, orders } = useFoodOperationsData()
  const [activeTab, setActiveTab] = useState<ReportTab>('sales')
  const [dateRange, setDateRange] = useState({
    start: format(new Date(), 'yyyy-MM-01'),
    end: format(new Date(), 'yyyy-MM-dd'),
  })

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
    let totalRevenue = 0

    filteredOrders.forEach((order) => {
      const amount = Number(order.total || 0)
      totalRevenue += amount
      if ((order.payment_status || '').toLowerCase() !== 'paid') pendingRevenue += amount
      const rawDate = new Date(order.createdAt || order.updatedAt || '')
      const dateKey = Number.isNaN(rawDate.getTime()) ? 'Unknown' : format(rawDate, 'MMM dd')
      chartMap.set(dateKey, Number(chartMap.get(dateKey) || 0) + amount)
    })

    return {
      totalRevenue,
      totalOrders: filteredOrders.length,
      pendingRevenue,
      chartData: Array.from(chartMap.entries()).map(([date, total]) => ({ date, total })),
    }
  }, [filteredOrders])

  const hotProducts = useFoodHotItems(filteredOrders)

  const repeatedCustomers = useMemo(() => {
    const map = new Map<string, { name: string; phone: string; visits: number; totalSpend: number; lastOrderAt: string }>()
    filteredOrders.forEach((order) => {
      const phone = String(order.shipping_address?.phone || '').trim()
      if (!phone) return
      const name = String(order.shipping_address?.full_name || 'Customer')
      const lastOrderAt = String(order.createdAt || order.updatedAt || '')
      const existing = map.get(phone) || { name, phone, visits: 0, totalSpend: 0, lastOrderAt }
      existing.visits += 1
      existing.totalSpend += Number(order.total || 0)
      if (lastOrderAt > existing.lastOrderAt) existing.lastOrderAt = lastOrderAt
      map.set(phone, existing)
    })
    return Array.from(map.values()).sort((a, b) => b.visits - a.visits)
  }, [filteredOrders])

  return (
    <FoodModuleShell
      title='Reports'
      description='Sales, item performance, and repeat customer insights for your food business.'
      moduleLabel='Reports'
    >
      <div className='flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between'>
        <div className='flex flex-wrap gap-2'>
          {tabOptions.map((tab) => {
            const active = activeTab === tab.key
            return (
              <button
                key={tab.key}
                type='button'
                onClick={() => setActiveTab(tab.key)}
                className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-bold transition ${
                  active
                    ? 'border-sky-600 bg-sky-600 text-white'
                    : 'border-slate-200 bg-white text-slate-600'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            )
          })}
        </div>
        <div className='flex flex-wrap items-center gap-3'>
          <div className='inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600'>
            <CalendarDays className='h-4 w-4 text-slate-400' />
            <input type='date' value={dateRange.start} onChange={(event) => setDateRange((current) => ({ ...current, start: event.target.value }))} />
          </div>
          <div className='inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600'>
            <CalendarDays className='h-4 w-4 text-slate-400' />
            <input type='date' value={dateRange.end} onChange={(event) => setDateRange((current) => ({ ...current, end: event.target.value }))} />
          </div>
          <Badge variant='outline' className='rounded-full px-4 py-2 text-xs font-bold'>
            <Download className='mr-2 h-3.5 w-3.5' />
            Export-ready view
          </Badge>
        </div>
      </div>

      {activeTab === 'sales' ? (
        <div className='grid gap-6'>
          <div className='grid gap-5 md:grid-cols-3'>
            {[
              ['Total Sales', money(salesSummary.totalRevenue)],
              ['Orders', String(salesSummary.totalOrders)],
              ['Pending Revenue', money(salesSummary.pendingRevenue)],
            ].map(([label, value]) => (
              <Card key={label} className='rounded-[24px] border border-slate-200 bg-white py-0 shadow-sm'>
                <CardContent className='p-6'>
                  <p className='text-xs font-black uppercase tracking-[0.18em] text-slate-400'>{label}</p>
                  <p className='mt-3 text-3xl font-black tracking-tight text-slate-900'>{value}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card className='rounded-[28px] border border-slate-200 bg-white py-0 shadow-sm'>
            <CardHeader className='px-6 py-5'>
              <CardTitle className='text-xl font-black text-slate-900'>Revenue Trend</CardTitle>
            </CardHeader>
            <CardContent className='px-2 pb-6 sm:px-6'>
              <div className='h-80'>
                <ResponsiveContainer width='100%' height='100%'>
                  <AreaChart data={salesSummary.chartData}>
                    <defs>
                      <linearGradient id='foodReportsArea' x1='0' y1='0' x2='0' y2='1'>
                        <stop offset='5%' stopColor='#0ea5e9' stopOpacity={0.18} />
                        <stop offset='95%' stopColor='#0ea5e9' stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray='3 3' vertical={false} stroke='#e2e8f0' />
                    <XAxis dataKey='date' axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `Rs ${value}`} />
                    <Tooltip formatter={(value: number) => [money(value), 'Revenue']} />
                    <Area type='monotone' dataKey='total' stroke='#0ea5e9' fill='url(#foodReportsArea)' strokeWidth={3} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {activeTab === 'hot-products' ? (
        <Card className='rounded-[28px] border border-slate-200 bg-white py-0 shadow-sm'>
          <CardHeader className='px-6 py-5'>
            <CardTitle className='text-xl font-black text-slate-900'>Top Selling Food Items</CardTitle>
          </CardHeader>
          <CardContent className='grid gap-8 px-6 pb-6 xl:grid-cols-[minmax(0,1fr)_420px]'>
            <div className='space-y-4'>
              {hotProducts.length ? hotProducts.slice(0, 10).map((item, index) => (
                <div key={`${item.name}-${index}`} className='flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4'>
                  <div>
                    <p className='text-sm font-black text-slate-900'>{item.name}</p>
                    <p className='mt-1 text-xs text-slate-500'>Revenue {money(item.revenue)}</p>
                  </div>
                  <Badge variant='outline' className='rounded-full px-3 py-1 text-xs font-bold'>
                    {item.quantity} sold
                  </Badge>
                </div>
              )) : <div className='rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500'>No product sales in this date range.</div>}
            </div>
            <div className='h-80'>
              <ResponsiveContainer width='100%' height='100%'>
                <BarChart data={hotProducts.slice(0, 6)}>
                  <CartesianGrid strokeDasharray='3 3' vertical={false} stroke='#e2e8f0' />
                  <XAxis dataKey='name' axisLine={false} tickLine={false} hide />
                  <YAxis axisLine={false} tickLine={false} />
                  <Tooltip formatter={(value: number) => [value, 'Qty']} />
                  <Bar dataKey='quantity' radius={[10, 10, 0, 0]} fill='#0ea5e9' />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {activeTab === 'repeat-customers' ? (
        <Card className='rounded-[28px] border border-slate-200 bg-white py-0 shadow-sm'>
          <CardHeader className='px-6 py-5'>
            <CardTitle className='text-xl font-black text-slate-900'>Repeat Customers</CardTitle>
          </CardHeader>
          <CardContent className='space-y-4 px-6 pb-6'>
            {loading ? (
              <div className='space-y-3'>
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className='h-16 animate-pulse rounded-2xl bg-slate-100' />
                ))}
              </div>
            ) : repeatedCustomers.length ? repeatedCustomers.map((customer) => (
              <div key={customer.phone} className='grid gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4 md:grid-cols-[1fr_auto_auto] md:items-center'>
                <div>
                  <p className='text-sm font-black text-slate-900'>{customer.name}</p>
                  <p className='mt-1 text-xs text-slate-500'>{customer.phone}</p>
                </div>
                <div className='text-sm font-bold text-slate-700'>
                  {customer.visits} visits
                </div>
                <div className='text-sm font-black text-slate-900'>
                  {money(customer.totalSpend)}
                </div>
              </div>
            )) : <div className='rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500'>No repeat customer data available yet.</div>}
          </CardContent>
        </Card>
      ) : null}
    </FoodModuleShell>
  )
}
