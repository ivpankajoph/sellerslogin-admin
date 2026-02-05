import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import api from '@/lib/axios'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { useSelector } from 'react-redux'
import type { RootState } from '@/store'

type OrderSummary = {
  totalOrders: number
  totalRevenue: number
  statusCounts: Record<string, number>
}

type OrderItem = {
  _id?: string
  product_id?: string
  product_name?: string
  image_url?: string
  variant_attributes?: Record<string, string>
  quantity?: number
  total_price?: number
  unit_price?: number
}

type Order = {
  _id: string
  order_number?: string
  status?: string
  total?: number
  subtotal?: number
  shipping_fee?: number
  discount?: number
  vendor_subtotal?: number
  vendor_item_count?: number
  payment_method?: string
  payment_status?: string
  createdAt?: string
  user_id?: { name?: string; email?: string; phone?: string }
  shipping_address?: {
    full_name?: string
    phone?: string
    line1?: string
    line2?: string
    city?: string
    state?: string
    pincode?: string
    country?: string
  }
  items: OrderItem[]
}

export const Route = createFileRoute('/_authenticated/order/')({
  component: OrdersPage,
})

function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [summary, setSummary] = useState<OrderSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const role = useSelector((state: RootState) => state.auth?.user?.role)
  const isVendor = role === 'vendor'

  const fetchOrders = async () => {
    try {
      setLoading(true)
      setError('')
      const res = await api.get('/orders', {
        params: {
          page,
          limit: 20,
          search: search || undefined,
          status: status === 'all' ? undefined : status,
        },
      })
      const data = res.data || {}
      setOrders(data.orders || [])
      setSummary(data.summary || null)
      setTotal(data.total || 0)
      if (!selectedId && data.orders?.length) {
        setSelectedId(data.orders[0]._id)
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load orders')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, status])

  useEffect(() => {
    if (!orders.length) {
      setSelectedId(null)
      return
    }
    if (!orders.some((order) => order._id === selectedId)) {
      setSelectedId(orders[0]._id)
    }
  }, [orders, selectedId])

  const selectedOrder = useMemo(
    () => orders.find((order) => order._id === selectedId) || null,
    [orders, selectedId],
  )

  const formatMoney = (value?: number) =>
    `₹${Number(value || 0).toLocaleString()}`

  const statusBadge = (value?: string) => {
    const key = value || 'pending'
    const map: Record<string, string> = {
      pending: 'bg-amber-100 text-amber-700',
      confirmed: 'bg-blue-100 text-blue-700',
      shipped: 'bg-indigo-100 text-indigo-700',
      delivered: 'bg-emerald-100 text-emerald-700',
      failed: 'bg-rose-100 text-rose-700',
      cancelled: 'bg-rose-100 text-rose-700',
    }
    return (
      <span className={`rounded-full px-2 py-1 text-xs font-semibold ${map[key] || 'bg-slate-100 text-slate-700'}`}>
        {key}
      </span>
    )
  }

  const totalOrders = summary?.totalOrders || total || orders.length
  const totalRevenue =
    summary?.totalRevenue ||
    orders.reduce(
      (acc, o) => acc + (isVendor ? o.vendor_subtotal || 0 : o.total || 0),
      0,
    )
  const pageCount = Math.max(Math.ceil(total / 20), 1)

  return (
    <div className='space-y-6'>
      <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <h1 className='text-2xl font-semibold text-slate-900'>Orders</h1>
          <p className='text-sm text-muted-foreground'>Review order history and track order details</p>
        </div>
        <div className='flex flex-wrap items-center gap-2'>
          <div className='relative'>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setPage(1)
                  fetchOrders()
                }
              }}
              placeholder='Search order number or customer'
              className='w-64'
            />
          </div>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value)
              setPage(1)
            }}
            className='h-10 rounded-md border border-input bg-background px-3 text-sm'
          >
            <option value='all'>All status</option>
            <option value='pending'>Pending</option>
            <option value='confirmed'>Confirmed</option>
            <option value='shipped'>Shipped</option>
            <option value='delivered'>Delivered</option>
            <option value='failed'>Failed</option>
            <option value='cancelled'>Cancelled</option>
          </select>
          <Button onClick={() => fetchOrders()} disabled={loading}>
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm text-muted-foreground'>Total Orders</CardTitle>
          </CardHeader>
          <CardContent className='text-2xl font-semibold'>{totalOrders}</CardContent>
        </Card>
        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm text-muted-foreground'>Total Revenue</CardTitle>
          </CardHeader>
          <CardContent className='text-2xl font-semibold'>{formatMoney(totalRevenue)}</CardContent>
        </Card>
        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm text-muted-foreground'>Pending</CardTitle>
          </CardHeader>
          <CardContent className='text-2xl font-semibold'>
            {summary?.statusCounts?.pending || 0}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm text-muted-foreground'>Delivered</CardTitle>
          </CardHeader>
          <CardContent className='text-2xl font-semibold'>
            {summary?.statusCounts?.delivered || 0}
          </CardContent>
        </Card>
      </div>

      <div className='grid gap-6 xl:grid-cols-[360px_1fr]'>
        <Card className='h-fit'>
          <CardHeader className='pb-3'>
            <CardTitle className='text-base'>Order list</CardTitle>
          </CardHeader>
          <CardContent className='space-y-3'>
            {loading && <p className='text-sm text-muted-foreground'>Loading orders...</p>}
            {!loading && error && <p className='text-sm text-rose-600'>{error}</p>}
            {!loading && !error && orders.length === 0 && (
              <p className='text-sm text-muted-foreground'>No orders found.</p>
            )}
            <div className='space-y-3 max-h-[520px] overflow-y-auto pr-2'>
              {orders.map((order) => (
                <button
                  key={order._id}
                  onClick={() => setSelectedId(order._id)}
                  className={`w-full rounded-lg border p-3 text-left transition ${
                    selectedId === order._id
                      ? 'border-slate-900 bg-slate-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className='flex items-center justify-between'>
                    <span className='text-sm font-semibold'>#{order.order_number}</span>
                    {statusBadge(order.status)}
                  </div>
                  <div className='mt-2 text-xs text-muted-foreground'>
                    {order.user_id?.name || order.shipping_address?.full_name || 'Customer'} •{' '}
                    {order.user_id?.email || order.shipping_address?.phone || 'N/A'}
                  </div>
                  <div className='mt-2 flex items-center justify-between text-sm font-semibold'>
                    <span>{order.items?.length || 0} items</span>
                    <span>{formatMoney(isVendor ? order.vendor_subtotal : order.total)}</span>
                  </div>
                </button>
              ))}
            </div>
            {pageCount > 1 && (
              <div className='flex items-center justify-between pt-2 text-sm'>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                  disabled={page <= 1 || loading}
                >
                  Previous
                </Button>
                <span className='text-xs text-muted-foreground'>
                  Page {page} of {pageCount}
                </span>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => setPage((prev) => Math.min(prev + 1, pageCount))}
                  disabled={page >= pageCount || loading}
                >
                  Next
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className='text-base'>Order details</CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            {!selectedOrder ? (
              <p className='text-sm text-muted-foreground'>Select an order to view details.</p>
            ) : (
              <>
                <div className='flex flex-wrap items-center justify-between gap-3 text-sm'>
                  <div>
                    <p className='text-xs text-muted-foreground'>Order number</p>
                    <p className='font-semibold'>#{selectedOrder.order_number}</p>
                  </div>
                  <div>
                    <p className='text-xs text-muted-foreground'>Status</p>
                    <div>{statusBadge(selectedOrder.status)}</div>
                  </div>
                  <div>
                    <p className='text-xs text-muted-foreground'>Created</p>
                    <p className='font-semibold'>
                      {selectedOrder.createdAt
                        ? new Date(selectedOrder.createdAt).toLocaleString()
                        : 'N/A'}
                    </p>
                  </div>
                  <div className='flex flex-wrap items-center gap-2'>
                    <Button
                      size='sm'
                      disabled={loading || selectedOrder.status === 'delivered'}
                      onClick={async () => {
                        if (!selectedOrder?._id) return
                        try {
                          setLoading(true)
                          await api.put(`/orders/${selectedOrder._id}/status`, {
                            status: 'delivered',
                          })
                          await fetchOrders()
                        } finally {
                          setLoading(false)
                        }
                      }}
                    >
                      Mark delivered
                    </Button>
                    <Button
                      size='sm'
                      variant='outline'
                      disabled={loading || selectedOrder.status === 'failed'}
                      onClick={async () => {
                        if (!selectedOrder?._id) return
                        try {
                          setLoading(true)
                          await api.put(`/orders/${selectedOrder._id}/status`, {
                            status: 'failed',
                          })
                          await fetchOrders()
                        } finally {
                          setLoading(false)
                        }
                      }}
                    >
                      Mark failed
                    </Button>
                  </div>
                </div>

                <Separator />

                <div className='space-y-3'>
                  <p className='text-sm font-semibold'>Items</p>
                  <div className='max-h-[360px] space-y-3 overflow-y-auto pr-2'>
                    {selectedOrder.items.map((item) => (
                      <div key={item.product_id || item._id} className='flex gap-3 rounded-lg border p-3'>
                        <div className='h-14 w-14 overflow-hidden rounded-md bg-slate-100'>
                          <img
                            src={item.image_url || '/placeholder.png'}
                            alt={item.product_name || 'Product'}
                            className='h-full w-full object-cover'
                          />
                        </div>
                        <div className='flex flex-1 items-start justify-between gap-3'>
                          <div className='min-w-0'>
                            <p className='text-sm font-semibold text-slate-900 line-clamp-2'>
                              {item.product_name}
                            </p>
                            <p className='text-xs text-muted-foreground'>
                              {Object.values(item.variant_attributes || {}).join(' / ')}
                            </p>
                            <p className='text-xs text-muted-foreground'>Qty: {item.quantity}</p>
                          </div>
                          <div className='text-sm font-semibold whitespace-nowrap'>
                            {formatMoney(item.total_price)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                <div className='grid gap-4 md:grid-cols-2'>
                  <div className='space-y-2 rounded-lg border p-3'>
                    <p className='text-sm font-semibold'>Customer</p>
                    <p className='text-sm'>{selectedOrder.user_id?.name || selectedOrder.shipping_address?.full_name}</p>
                    <p className='text-xs text-muted-foreground'>{selectedOrder.user_id?.email}</p>
                    <p className='text-xs text-muted-foreground'>{selectedOrder.shipping_address?.phone}</p>
                  </div>
                  <div className='space-y-2 rounded-lg border p-3'>
                    <p className='text-sm font-semibold'>Shipping address</p>
                    <p className='text-sm'>
                      {selectedOrder.shipping_address?.line1}
                      {selectedOrder.shipping_address?.line2
                        ? `, ${selectedOrder.shipping_address?.line2}`
                        : ''}
                    </p>
                    <p className='text-xs text-muted-foreground'>
                      {selectedOrder.shipping_address?.city}, {selectedOrder.shipping_address?.state}{' '}
                      {selectedOrder.shipping_address?.pincode}
                    </p>
                    <p className='text-xs text-muted-foreground'>
                      {selectedOrder.shipping_address?.country || 'India'}
                    </p>
                  </div>
                </div>

                <Separator />

                <div className='grid gap-2 text-sm'>
                  <div className='flex justify-between'>
                    <span className='text-muted-foreground'>Items total</span>
                    <span className='font-semibold'>
                      {formatMoney(isVendor ? selectedOrder.vendor_subtotal : selectedOrder.subtotal)}
                    </span>
                  </div>
                  {!isVendor && (
                    <>
                      <div className='flex justify-between'>
                        <span className='text-muted-foreground'>Shipping</span>
                        <span className='font-semibold'>{formatMoney(selectedOrder.shipping_fee)}</span>
                      </div>
                      <div className='flex justify-between'>
                        <span className='text-muted-foreground'>Discount</span>
                        <span className='font-semibold'>-{formatMoney(selectedOrder.discount)}</span>
                      </div>
                    </>
                  )}
                  <div className='flex justify-between text-base font-semibold'>
                    <span>{isVendor ? 'Your total' : 'Total'}</span>
                    <span>{formatMoney(isVendor ? selectedOrder.vendor_subtotal : selectedOrder.total)}</span>
                  </div>
                  {isVendor && (
                    <div className='flex justify-between text-xs text-muted-foreground'>
                      <span>Customer paid</span>
                      <span>{formatMoney(selectedOrder.total)}</span>
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
