import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import api from '@/lib/axios'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

type ReportSummary = {
  totalOrders: number
  totalRevenue: number
  statusCounts: Record<string, number>
}

type BorzoReport = {
  ophmate: ReportSummary
  template: ReportSummary
}

type BorzoOrder = {
  order_id?: number
  order_name?: string
  status?: string
  status_description?: string
  payment_amount?: string
  created_datetime?: string
  finish_datetime?: string
  points?: Array<{ address?: string; contact_person?: { name?: string; phone?: string } }>
}

export const Route = createFileRoute('/_authenticated/borzo-report/')({
  component: BorzoReportPage,
})

function BorzoReportPage() {
  const [report, setReport] = useState<BorzoReport | null>(null)
  const [borzoOrders, setBorzoOrders] = useState<BorzoOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchReport = async () => {
    try {
      setLoading(true)
      setError('')
      const res = await api.get('/borzo/report', {
        params: { include_borzo: 'true' },
      })
      const data = res.data || {}
      setReport(data.report || null)
      const borzo = data.borzo || {}
      const list = Array.isArray(borzo.orders) ? borzo.orders : []
      setBorzoOrders(list)
      setLastUpdated(new Date())
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load Borzo report')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReport()
  }, [])

  const formatMoney = (value?: number | string) =>
    `₹${Number(value || 0).toLocaleString()}`

  const formatTime = (value?: Date | null) =>
    value ? new Date(value).toLocaleString() : 'N/A'

  const totalOrders =
    (report?.ophmate?.totalOrders || 0) + (report?.template?.totalOrders || 0)
  const totalRevenue =
    (report?.ophmate?.totalRevenue || 0) + (report?.template?.totalRevenue || 0)

  const statusTone = (status?: string) => {
    const key = String(status || '').toLowerCase()
    if (['completed', 'delivered', 'finished'].includes(key)) return 'bg-emerald-100 text-emerald-700'
    if (['searching', 'executing', 'active', 'courier_assigned'].includes(key)) return 'bg-amber-100 text-amber-700'
    if (['cancelled', 'canceled', 'failed'].includes(key)) return 'bg-rose-100 text-rose-700'
    if (['new', 'created'].includes(key)) return 'bg-sky-100 text-sky-700'
    return 'bg-slate-100 text-slate-700'
  }
  const mergedStatusCounts = useMemo(() => {
    const statuses = new Set<string>()
    if (report?.ophmate?.statusCounts) {
      Object.keys(report.ophmate.statusCounts).forEach((key) => statuses.add(key))
    }
    if (report?.template?.statusCounts) {
      Object.keys(report.template.statusCounts).forEach((key) => statuses.add(key))
    }
    return Array.from(statuses)
  }, [report])

  return (
    <div className='space-y-6'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div className='relative overflow-hidden rounded-2xl border border-slate-200/60 bg-gradient-to-r from-indigo-50 via-white to-sky-50 px-5 py-4 shadow-sm'>
          <div className='pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-gradient-to-br from-indigo-200/60 to-sky-200/60 blur-2xl' />
          <div className='pointer-events-none absolute -bottom-12 -left-8 h-28 w-28 rounded-full bg-gradient-to-br from-amber-200/50 to-rose-200/50 blur-2xl' />
          <h1 className='text-2xl font-semibold text-slate-900'>Borzo Delivery Report</h1>
          <p className='text-sm text-slate-600'>Summary from our database and Borzo API.</p>
          <p className='text-xs text-slate-500'>Last updated: {formatTime(lastUpdated)}</p>
        </div>
        <Button onClick={fetchReport} disabled={loading} className='bg-slate-900 text-white shadow-sm hover:bg-slate-800'>
          {loading ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {error && (
        <div className='rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700'>
          {error}
        </div>
      )}

      <div className='grid gap-4 md:grid-cols-3'>
        <Card className='border-0 bg-gradient-to-br from-indigo-500 to-sky-500 text-white shadow-lg shadow-indigo-100'>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm text-white/80'>Total Borzo Orders</CardTitle>
          </CardHeader>
          <CardContent className='space-y-1'>
            <div className='text-3xl font-semibold'>{totalOrders}</div>
            <p className='text-xs text-white/80'>Across all channels</p>
          </CardContent>
        </Card>
        <Card className='border-0 bg-gradient-to-br from-emerald-500 to-lime-500 text-white shadow-lg shadow-emerald-100'>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm text-white/80'>Total Revenue</CardTitle>
          </CardHeader>
          <CardContent className='space-y-1'>
            <div className='text-3xl font-semibold'>{formatMoney(totalRevenue)}</div>
            <p className='text-xs text-white/80'>From Borzo deliveries</p>
          </CardContent>
        </Card>
        <Card className='border-0 bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg shadow-amber-100'>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm text-white/80'>Live Orders</CardTitle>
          </CardHeader>
          <CardContent className='space-y-1'>
            <div className='text-3xl font-semibold'>{borzoOrders.length}</div>
            <p className='text-xs text-white/80'>From Borzo API</p>
          </CardContent>
        </Card>
      </div>

      <div className='grid gap-4 md:grid-cols-2'>
        <Card className='border-slate-200/70 shadow-sm'>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm text-slate-600'>Ophmate Orders</CardTitle>
          </CardHeader>
          <CardContent className='space-y-2'>
            <div className='text-2xl font-semibold text-slate-900'>{report?.ophmate?.totalOrders || 0}</div>
            <p className='text-xs text-slate-500'>Total Borzo deliveries</p>
            <p className='text-sm font-semibold'>Revenue: {formatMoney(report?.ophmate?.totalRevenue)}</p>
          </CardContent>
        </Card>
        <Card className='border-slate-200/70 shadow-sm'>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm text-slate-600'>Template Orders</CardTitle>
          </CardHeader>
          <CardContent className='space-y-2'>
            <div className='text-2xl font-semibold text-slate-900'>{report?.template?.totalOrders || 0}</div>
            <p className='text-xs text-slate-500'>Total Borzo deliveries</p>
            <p className='text-sm font-semibold'>Revenue: {formatMoney(report?.template?.totalRevenue)}</p>
          </CardContent>
        </Card>
      </div>

      {mergedStatusCounts.length > 0 && (
        <Card className='border-slate-200/70 shadow-sm'>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm text-slate-600'>Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent className='grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
            {mergedStatusCounts.map((status) => {
              const ophCount = report?.ophmate?.statusCounts?.[status] || 0
              const templateCount = report?.template?.statusCounts?.[status] || 0
              const combined = ophCount + templateCount
              return (
                <div key={status} className='rounded-xl border border-slate-200 bg-white p-3 shadow-sm'>
                  <div className='flex items-center justify-between'>
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusTone(status)}`}>
                      {status}
                    </span>
                    <span className='text-xs text-slate-500'>Total: {combined}</span>
                  </div>
                  <div className='mt-2 flex items-center justify-between text-xs text-slate-600'>
                    <span>Ophmate</span>
                    <span className='font-semibold text-slate-900'>{ophCount}</span>
                  </div>
                  <div className='mt-1 flex items-center justify-between text-xs text-slate-600'>
                    <span>Template</span>
                    <span className='font-semibold text-slate-900'>{templateCount}</span>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      <Card className='border-slate-200/70 shadow-sm'>
        <CardHeader className='pb-2'>
          <div className='flex flex-wrap items-center justify-between gap-2'>
            <CardTitle className='text-sm text-slate-600'>Borzo Live Orders</CardTitle>
            <span className='text-xs text-slate-500'>Showing {borzoOrders.length}</span>
          </div>
        </CardHeader>
        <CardContent className='space-y-3'>
          {loading && <p className='text-sm text-slate-500'>Loading Borzo orders...</p>}
          {!loading && borzoOrders.length === 0 && (
            <p className='text-sm text-slate-500'>No Borzo orders found.</p>
          )}
          <div className='grid gap-3 max-h-[520px] overflow-y-auto pr-2 lg:grid-cols-2'>
            {borzoOrders.map((order) => (
              <div key={order.order_id} className='rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm'>
                <div className='flex flex-wrap items-center justify-between gap-2'>
                  <span className='font-semibold text-slate-900'>Order #{order.order_id}</span>
                  <span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusTone(order.status)}`}>
                    {order.status || 'unknown'}
                  </span>
                </div>
                {order.status_description && (
                  <p className='mt-1 text-xs text-slate-500'>{order.status_description}</p>
                )}
                <div className='mt-2 grid gap-1 text-xs text-slate-600'>
                  <div className='flex items-center justify-between'>
                    <span>Created</span>
                    <span className='font-semibold text-slate-900'>
                      {order.created_datetime ? new Date(order.created_datetime).toLocaleString() : 'N/A'}
                    </span>
                  </div>
                  <div className='flex items-center justify-between'>
                    <span>Amount</span>
                    <span className='font-semibold text-slate-900'>{formatMoney(order.payment_amount)}</span>
                  </div>
                </div>
                {order.points?.[0]?.address && (
                  <p className='mt-2 text-xs text-slate-500'>Pickup: {order.points[0].address}</p>
                )}
                {order.points?.[1]?.address && (
                  <p className='mt-1 text-xs text-slate-500'>Drop: {order.points[1].address}</p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
