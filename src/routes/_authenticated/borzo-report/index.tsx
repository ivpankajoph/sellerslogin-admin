import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { Download, RefreshCcw, Search } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { RootState } from '@/store'
import {
  STATUS_TABS,
  fetchBorzoReportData,
  formatDate,
  formatMoney,
  formatTime,
  getStatusBucket,
  statusPillClass,
  type BorzoOrder,
  type BorzoReport,
  type StatusTab,
} from '@/features/borzo-report/shared'

export const Route = createFileRoute('/_authenticated/borzo-report/')({
  component: BorzoReportPage,
})

const csvEscape = (value: unknown) => {
  const text = String(value ?? '')
  if (text.includes(',') || text.includes('"') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`
  }
  return text
}

function BorzoReportPage() {
  const navigate = useNavigate()
  const role = useSelector((state: RootState) => state.auth?.user?.role)
  const isVendor = role === 'vendor'

  const [report, setReport] = useState<BorzoReport | null>(null)
  const [orders, setOrders] = useState<BorzoOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const [activeTab, setActiveTab] = useState<StatusTab>('all')
  const [searchOrderId, setSearchOrderId] = useState('')
  const [actionError, setActionError] = useState('')
  const [searching, setSearching] = useState(false)

  const fetchReport = async (showLoader = true) => {
    try {
      if (showLoader) {
        setLoading(true)
      } else {
        setRefreshing(true)
      }
      setError('')

      const response = await fetchBorzoReportData(isVendor)
      setReport(response.report)
      setOrders(response.orders)
      setLastUpdated(new Date())
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load delivery report')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchReport(true)
  }, [isVendor])

  const sortedOrders = useMemo(() => {
    return [...orders].sort((a, b) => {
      const first = new Date(a.created_datetime || 0).getTime()
      const second = new Date(b.created_datetime || 0).getTime()
      return second - first
    })
  }, [orders])

  const filteredOrders = useMemo(() => {
    if (activeTab === 'all') return sortedOrders
    return sortedOrders.filter((order) => getStatusBucket(order.status) === activeTab)
  }, [activeTab, sortedOrders])

  const totalOrders =
    (report?.ophmate?.totalOrders || 0) + (report?.template?.totalOrders || 0)

  const tabCounts = useMemo(() => {
    return STATUS_TABS.reduce(
      (acc, tab) => {
        acc[tab.key] =
          tab.key === 'all'
            ? sortedOrders.length
            : sortedOrders.filter((order) => getStatusBucket(order.status) === tab.key).length
        return acc
      },
      { all: 0, active: 0, completed: 0, drafts: 0 } as Record<StatusTab, number>,
    )
  }, [sortedOrders])

  const goToOrderDetails = (orderId: number) => {
    navigate({
      to: '/borzo-report/$orderId',
      params: { orderId: String(orderId) },
    })
  }

  const handleSearchSubmit = async () => {
    const orderId = Number(searchOrderId)
    if (!Number.isFinite(orderId) || orderId <= 0) {
      setActionError('Please enter a valid order ID')
      return
    }

    setSearching(true)
    setActionError('')

    try {
      if (isVendor) {
        const exists = sortedOrders.some((order) => Number(order.order_id) === orderId)
        if (!exists) {
          setActionError('Order not found in your order list')
          return
        }
      }

      goToOrderDetails(orderId)
    } finally {
      setSearching(false)
    }
  }

  const exportOrders = () => {
    const headers = [
      'Order ID',
      'Reference',
      'Created Date',
      'Created Time',
      'Status',
      'Price',
      'Pickup Address',
      'Drop Address',
      'Tracking URL',
    ]

    const rows = filteredOrders.map((order) => [
      order.order_id || '',
      order.order_name || '',
      formatDate(order.created_datetime),
      formatTime(order.created_datetime),
      order.status || 'unknown',
      Number(order.payment_amount || 0).toFixed(2),
      order.points?.[0]?.address || '',
      order.points?.[1]?.address || '',
      order.points?.[1]?.tracking_url || '',
    ])

    const csv = [headers, ...rows]
      .map((line) => line.map((item) => csvEscape(item)).join(','))
      .join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    const dateStamp = new Date().toISOString().slice(0, 10)

    link.href = url
    link.setAttribute('download', `delivery-report-${activeTab}-${dateStamp}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className='space-y-5 pb-4'>
      <Card className='border-slate-200 shadow-sm'>
        <CardHeader className='pb-3'>
          <CardTitle className='text-3xl text-slate-900'>Delivery Report</CardTitle>
          <p className='text-sm text-slate-600'>
            Select any order to open its details page with live map and tracking data.
          </p>
          <p className='text-xs text-slate-500'>
            Total orders: {totalOrders} | Last updated: {lastUpdated ? lastUpdated.toLocaleString() : 'N/A'}
          </p>
        </CardHeader>
      </Card>

      {error && (
        <div className='rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700'>
          {error}
        </div>
      )}

      <Card className='border-slate-200 shadow-sm'>
        <CardContent className='space-y-4 p-5'>
          <div className='flex flex-wrap items-center justify-between gap-3'>
            <div className='flex flex-wrap gap-2'>
              {STATUS_TABS.map((tab) => {
                const isActive = tab.key === activeTab
                return (
                  <button
                    key={tab.key}
                    type='button'
                    onClick={() => setActiveTab(tab.key)}
                    className={`rounded-xl border px-4 py-2 text-sm transition ${
                      isActive
                        ? 'border-blue-500 bg-blue-50 font-semibold text-blue-600'
                        : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400'
                    }`}
                  >
                    {tab.label}
                    <span className='ml-1 text-xs text-slate-500'>({tabCounts[tab.key]})</span>
                  </button>
                )
              })}
            </div>

            <button
              type='button'
              onClick={exportOrders}
              className='inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:underline'
            >
              Export orders
              <Download className='h-4 w-4' />
            </button>
          </div>

          <div className='flex flex-wrap items-center gap-2'>
            <Input
              value={searchOrderId}
              onChange={(event) => setSearchOrderId(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  void handleSearchSubmit()
                }
              }}
              placeholder='Enter order ID and open details page'
              className='h-10 w-full max-w-sm'
            />
            <Button onClick={() => void handleSearchSubmit()} disabled={searching} className='h-10'>
              <Search className='mr-2 h-4 w-4' />
              {searching ? 'Opening...' : 'Open'}
            </Button>
            <Button
              variant='outline'
              onClick={() => void fetchReport(false)}
              disabled={refreshing || loading}
              className='h-10'
            >
              <RefreshCcw className='mr-2 h-4 w-4' />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>

          {actionError && (
            <p className='rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700'>
              {actionError}
            </p>
          )}

          {loading && <p className='text-sm text-slate-500'>Loading orders...</p>}
          {!loading && filteredOrders.length === 0 && (
            <p className='text-sm text-slate-500'>No orders found in this filter.</p>
          )}

          {!loading && filteredOrders.length > 0 && (
            <div className='overflow-hidden rounded-xl border border-slate-200'>
              <div className='max-h-[620px] overflow-auto'>
                <table className='w-full min-w-[980px] border-collapse'>
                  <thead className='sticky top-0 z-10 bg-slate-50'>
                    <tr className='text-left text-sm text-slate-600'>
                      <th className='px-4 py-3 font-semibold'>Order</th>
                      <th className='px-4 py-3 font-semibold'>Created</th>
                      <th className='px-4 py-3 font-semibold'>Status</th>
                      <th className='px-4 py-3 font-semibold'>Price</th>
                      <th className='px-4 py-3 font-semibold'>Addresses</th>
                      <th className='px-4 py-3 font-semibold'>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map((order) => (
                      <tr key={order.order_id} className='border-t border-slate-100 align-top bg-white'>
                        <td className='px-4 py-4'>
                          <p className='text-2xl font-semibold text-blue-600'>#{order.order_id}</p>
                          <p className='text-sm text-slate-700'>{order.order_name || 'N/A'}</p>
                        </td>

                        <td className='px-4 py-4'>
                          <p className='text-lg font-medium text-slate-800'>
                            {formatDate(order.created_datetime)}
                          </p>
                          <p className='text-sm text-slate-500'>{formatTime(order.created_datetime)}</p>
                        </td>

                        <td className='px-4 py-4'>
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusPillClass(
                              order.status,
                            )}`}
                          >
                            {order.status || 'unknown'}
                          </span>
                          {order.status_description && (
                            <p className='mt-1 text-xs text-slate-500'>{order.status_description}</p>
                          )}
                        </td>

                        <td className='px-4 py-4'>
                          <p className='text-xl font-semibold text-slate-900'>
                            {formatMoney(order.payment_amount)}
                          </p>
                        </td>

                        <td className='px-4 py-4 text-sm text-slate-700'>
                          <p>1. {order.points?.[0]?.address || 'N/A'}</p>
                          <p className='mt-1'>2. {order.points?.[1]?.address || 'N/A'}</p>
                        </td>

                        <td className='px-4 py-4'>
                          <Button
                            size='sm'
                            onClick={() => goToOrderDetails(Number(order.order_id || 0))}
                            className='h-8 bg-blue-600 text-white hover:bg-blue-700'
                          >
                            View details
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
