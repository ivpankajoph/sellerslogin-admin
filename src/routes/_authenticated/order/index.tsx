import { useEffect, useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import type { RootState } from '@/store'
import { useSelector } from 'react-redux'
import { toast } from 'sonner'
import api from '@/lib/axios'
import { formatINR } from '@/lib/currency'
import { useVendorIntegrations } from '@/context/vendor-integrations-provider'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ServerPagination } from '@/components/data-table/server-pagination'
import { StatisticsDialog } from '@/components/data-table/statistics-dialog'
import { TablePageHeader } from '@/components/data-table/table-page-header'
import { TableShell } from '@/components/data-table/table-shell'
import { Main } from '@/components/layout/main'

type OrderSummary = {
  totalOrders: number
  totalRevenue: number
  statusCounts: Record<string, number>
  paymentStatusCounts?: Record<string, number>
  paidRevenue?: number
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
  delivery_provider?: string
  borzo?: {
    order_id?: number
    status?: string
    status_description?: string
    tracking_url?: string
    courier?: { name?: string; phone?: string }
    updated_at?: string
  }
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
  const BORZO_QUOTE_DEBOUNCE_MS = 600
  const [orders, setOrders] = useState<Order[]>([])
  const [summary, setSummary] = useState<OrderSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [statsOpen, setStatsOpen] = useState(false)
  const [borzoActionLoading, setBorzoActionLoading] = useState(false)
  const [borzoQuoteLoading, setBorzoQuoteLoading] = useState(false)
  const [borzoError, setBorzoError] = useState('')
  const [borzoQuote, setBorzoQuote] = useState<{
    amount?: number
    warnings?: string[]
  } | null>(null)
  const [pickupOverride, setPickupOverride] = useState({
    name: '',
    phone: '',
    address: '',
    latitude: '',
    longitude: '',
  })
  const [dropoffOverride, setDropoffOverride] = useState({
    name: '',
    phone: '',
    address: '',
    latitude: '',
    longitude: '',
  })
  const role = useSelector((state: RootState) => state.auth?.user?.role)
  const isVendor = role === 'vendor'
  const { isProviderVisible } = useVendorIntegrations()
  const canUseBorzo = !isVendor || isProviderVisible('borzo')

  const fetchOrders = async () => {
    try {
      setLoading(true)
      setError('')
      const res = await api.get('/orders', {
        params: {
          page,
          limit,
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
  }, [page, status, limit])

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
    [orders, selectedId]
  )

  const emptyOverride = {
    name: '',
    phone: '',
    address: '',
    latitude: '',
    longitude: '',
  }

  const buildAddressString = (address?: Order['shipping_address']) => {
    if (!address) return ''
    return [
      address.line1,
      address.line2,
      address.city,
      address.state,
      address.pincode,
      address.country,
    ]
      .filter((value) => value && String(value).trim().length)
      .join(', ')
  }

  const mapPointToOverride = (point?: any) => {
    if (!point) return null
    return {
      name: point?.contact_person?.name || '',
      phone: point?.contact_person?.phone || '',
      address: point?.address || '',
      latitude: point?.latitude != null ? String(point?.latitude) : '',
      longitude: point?.longitude != null ? String(point?.longitude) : '',
    }
  }

  useEffect(() => {
    setBorzoError('')
    setBorzoQuote(null)

    if (!selectedOrder) {
      setPickupOverride(emptyOverride)
      setDropoffOverride(emptyOverride)
      return
    }

    const payload = (selectedOrder as any)?.borzo?.last_payload
    const pickupFromPayload = mapPointToOverride(payload?.points?.[0])
    const dropoffFromPayload = mapPointToOverride(payload?.points?.[1])
    const shippingAddress = selectedOrder.shipping_address
    const dropoffFromShipping = shippingAddress
      ? {
          name: shippingAddress.full_name || selectedOrder.user_id?.name || '',
          phone: shippingAddress.phone || selectedOrder.user_id?.phone || '',
          address: buildAddressString(shippingAddress),
          latitude: '',
          longitude: '',
        }
      : null

    setPickupOverride(pickupFromPayload || emptyOverride)
    setDropoffOverride(
      dropoffFromPayload || dropoffFromShipping || emptyOverride
    )
  }, [selectedOrder?._id])

  const formatMoney = (value?: number) => formatINR(value)

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
      <span
        className={`rounded-full px-2 py-1 text-xs font-semibold ${map[key] || 'bg-slate-100 text-slate-700'}`}
      >
        {key}
      </span>
    )
  }

  const totalOrders = summary?.totalOrders || total || orders.length
  const totalRevenue =
    summary?.totalRevenue ||
    orders.reduce(
      (acc, o) => acc + (isVendor ? o.vendor_subtotal || 0 : o.total || 0),
      0
    )
  const paidCount = summary?.paymentStatusCounts?.paid || 0
  const failedCount = summary?.paymentStatusCounts?.failed || 0
  const paidRevenue = summary?.paidRevenue || 0
  const pageCount = Math.max(Math.ceil(total / limit), 1)
  const statsItems = [
    {
      label: 'Total Orders',
      value: totalOrders,
      helper: 'Orders returned for the current filters.',
    },
    {
      label: 'Total Revenue',
      value: formatMoney(totalRevenue),
      helper: 'Gross value across the visible result set.',
    },
    {
      label: 'Pending',
      value: summary?.statusCounts?.pending || 0,
      helper: 'Orders waiting for action.',
    },
    {
      label: 'Delivered',
      value: summary?.statusCounts?.delivered || 0,
      helper: 'Orders marked delivered.',
    },
    {
      label: 'Payments Paid',
      value: paidCount,
      helper: 'Orders with successful payment.',
    },
    {
      label: 'Payments Failed',
      value: failedCount,
      helper: 'Orders with failed payment attempts.',
    },
    {
      label: 'Paid Revenue',
      value: formatMoney(paidRevenue),
      helper: 'Revenue collected from paid orders.',
    },
  ]

  const hasActiveBorzo =
    Boolean(selectedOrder?.borzo?.order_id) &&
    !['canceled', 'cancelled', 'failed'].includes(
      String(selectedOrder?.borzo?.status || '').toLowerCase()
    )
  const borzoBusy = borzoActionLoading || borzoQuoteLoading

  const buildBorzoPayload = () => {
    const hasPickupOverride = Object.values(pickupOverride).some(
      (value) => String(value || '').trim().length
    )
    const hasDropoffOverride = Object.values(dropoffOverride).some(
      (value) => String(value || '').trim().length
    )
    return {
      ...(hasPickupOverride ? { pickup: pickupOverride } : {}),
      ...(hasDropoffOverride ? { dropoff: dropoffOverride } : {}),
    }
  }

  const handleCreateBorzo = async () => {
    if (!selectedOrder?._id) return
    if (!canUseBorzo) {
      toast.error('Connect Borzo first to create delivery requests.')
      return
    }
    if (hasActiveBorzo) {
      toast.error('Borzo delivery already exists for this order.')
      return
    }
    try {
      setBorzoActionLoading(true)
      setBorzoError('')
      const payload = buildBorzoPayload()
      await api.post(`/orders/${selectedOrder._id}/borzo/create`, payload)
      await fetchOrders()
      toast.success('Borzo delivery created.')
    } catch (err: any) {
      const details = err?.response?.data?.details
      const detailText = details ? ` | ${JSON.stringify(details)}` : ''
      const message = `${err?.response?.data?.message || 'Failed to create Borzo delivery'}${detailText}`
      setBorzoError(message)
      toast.error(message)
    } finally {
      setBorzoActionLoading(false)
    }
  }

  const handleCalculateBorzo = async () => {
    if (!selectedOrder?._id) return
    if (!canUseBorzo) return
    try {
      setBorzoQuoteLoading(true)
      setBorzoError('')
      const payload = buildBorzoPayload()
      const res = await api.post(
        `/orders/${selectedOrder._id}/borzo/calculate`,
        payload
      )
      const amount = Number(res?.data?.response?.order?.payment_amount || 0)
      const warnings = res?.data?.response?.warnings || []
      setBorzoQuote({ amount: Number.isFinite(amount) ? amount : 0, warnings })
    } catch (err: any) {
      const details = err?.response?.data?.details
      const detailText = details ? ` | ${JSON.stringify(details)}` : ''
      const message = `${err?.response?.data?.message || 'Failed to calculate Borzo delivery'}${detailText}`
      setBorzoError(message)
    } finally {
      setBorzoQuoteLoading(false)
    }
  }

  const handleCancelBorzo = async () => {
    if (!selectedOrder?._id) return
    if (!canUseBorzo) {
      toast.error('Connect Borzo first to manage delivery requests.')
      return
    }
    try {
      setBorzoActionLoading(true)
      setBorzoError('')
      await api.post(`/orders/${selectedOrder._id}/borzo/cancel`)
      await fetchOrders()
      toast.success('Borzo delivery cancelled.')
    } catch (err: any) {
      const details = err?.response?.data?.details
      const detailText = details ? ` | ${JSON.stringify(details)}` : ''
      const message = `${err?.response?.data?.message || 'Failed to cancel Borzo delivery'}${detailText}`
      setBorzoError(message)
      toast.error(message)
    } finally {
      setBorzoActionLoading(false)
    }
  }

  useEffect(() => {
    if (!selectedOrder?._id) return
    if (!canUseBorzo) return
    if (hasActiveBorzo) return
    if (borzoActionLoading) return
    if (borzoQuoteLoading) return
    const timer = setTimeout(() => {
      handleCalculateBorzo()
    }, BORZO_QUOTE_DEBOUNCE_MS)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOrder?._id, pickupOverride, dropoffOverride, canUseBorzo])

  const openDetails = (order: Order) => {
    setSelectedId(order._id)
    setDetailsOpen(true)
  }

  return (
    <>
      <TablePageHeader title='Orders'>
        <div className='relative shrink-0'>
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
            className='h-10 w-64 shrink-0'
          />
        </div>
        <Select
          value={status}
          onValueChange={(value) => {
            setStatus(value)
            setPage(1)
          }}
        >
          <SelectTrigger className='w-36 shrink-0'>
            <SelectValue placeholder='All status' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>All status</SelectItem>
            <SelectItem value='pending'>Pending</SelectItem>
            <SelectItem value='confirmed'>Confirmed</SelectItem>
            <SelectItem value='shipped'>Shipped</SelectItem>
            <SelectItem value='delivered'>Delivered</SelectItem>
            <SelectItem value='failed'>Failed</SelectItem>
            <SelectItem value='cancelled'>Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant='outline'
          className='shrink-0'
          onClick={() => setStatsOpen(true)}
        >
          Statistics
        </Button>
        <Button
          className='shrink-0'
          onClick={() => fetchOrders()}
          disabled={loading}
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </Button>
      </TablePageHeader>

      <Main className='flex flex-1 flex-col gap-6'>
        <TableShell
          className='flex-1'
          title='Order list'
          footer={
            <ServerPagination
              page={page}
              totalPages={pageCount}
              totalItems={total}
              pageSize={limit}
              pageSizeOptions={[10, 20, 50]}
              onPageChange={setPage}
              onPageSizeChange={(value) => {
                setLimit(value)
                setPage(1)
              }}
              disabled={loading}
            />
          }
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className='min-w-[160px]'>Order</TableHead>
                <TableHead className='min-w-[200px]'>Customer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className='min-w-[160px]'>Payment</TableHead>
                <TableHead className='min-w-[110px]'>Items</TableHead>
                <TableHead className='min-w-[140px]'>Total</TableHead>
                <TableHead className='min-w-[160px]'>Created</TableHead>
                <TableHead className='text-right'>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className='h-24 text-center'>
                    Loading orders...
                  </TableCell>
                </TableRow>
              ) : orders.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className='text-muted-foreground h-24 text-center'
                  >
                    {error || 'No orders found.'}
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((order) => (
                  <TableRow key={order._id}>
                    <TableCell>
                      <div className='text-sm font-medium'>
                        #{order.order_number}
                      </div>
                      <div className='text-muted-foreground text-xs'>
                        {order.delivery_provider || 'Store delivery'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className='text-sm font-medium'>
                        {order.user_id?.name ||
                          order.shipping_address?.full_name ||
                          'Customer'}
                      </div>
                      <div className='text-muted-foreground text-xs'>
                        {order.user_id?.email ||
                          order.shipping_address?.phone ||
                          'N/A'}
                      </div>
                    </TableCell>
                    <TableCell>{statusBadge(order.status)}</TableCell>
                    <TableCell className='text-muted-foreground text-sm'>
                      {order.payment_method || 'cod'} (
                      {order.payment_status || 'pending'})
                    </TableCell>
                    <TableCell className='text-muted-foreground text-sm'>
                      {order.items?.length || 0} items
                    </TableCell>
                    <TableCell className='text-sm font-semibold'>
                      {formatMoney(
                        isVendor ? order.vendor_subtotal : order.total
                      )}
                    </TableCell>
                    <TableCell className='text-muted-foreground text-sm'>
                      {order.createdAt
                        ? new Date(order.createdAt).toLocaleDateString()
                        : 'N/A'}
                    </TableCell>
                    <TableCell className='text-right'>
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() => openDetails(order)}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableShell>
      </Main>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className='max-h-[92vh] w-[min(96vw,1000px)] overflow-y-auto overscroll-contain rounded-none'>
          <DialogHeader className='text-left'>
            <DialogTitle>Order details</DialogTitle>
            <DialogDescription>
              Review items, customer details, and delivery actions.
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-4'>
            {!selectedOrder ? (
              <p className='text-muted-foreground text-sm'>
                No order selected.
              </p>
            ) : (
              <>
                <div className='flex flex-wrap items-center justify-between gap-3 text-sm'>
                  <div>
                    <p className='text-muted-foreground text-xs'>
                      Order number
                    </p>
                    <p className='font-semibold'>
                      #{selectedOrder.order_number}
                    </p>
                  </div>
                  <div>
                    <p className='text-muted-foreground text-xs'>Status</p>
                    <div>{statusBadge(selectedOrder.status)}</div>
                  </div>
                  <div>
                    <p className='text-muted-foreground text-xs'>Created</p>
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
                      <div
                        key={item.product_id || item._id}
                        className='flex gap-3 rounded-lg border p-3'
                      >
                        <div className='h-14 w-14 overflow-hidden rounded-md bg-slate-100'>
                          <img
                            src={item.image_url || '/placeholder.png'}
                            alt={item.product_name || 'Product'}
                            className='h-full w-full object-cover'
                          />
                        </div>
                        <div className='flex flex-1 items-start justify-between gap-3'>
                          <div className='min-w-0'>
                            <p className='line-clamp-2 text-sm font-semibold text-slate-900'>
                              {item.product_name}
                            </p>
                            <p className='text-muted-foreground text-xs'>
                              {Object.values(
                                item.variant_attributes || {}
                              ).join(' / ')}
                            </p>
                            <p className='text-muted-foreground text-xs'>
                              Qty: {item.quantity}
                            </p>
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
                    <p className='text-sm'>
                      {selectedOrder.user_id?.name ||
                        selectedOrder.shipping_address?.full_name}
                    </p>
                    <p className='text-muted-foreground text-xs'>
                      {selectedOrder.user_id?.email}
                    </p>
                    <p className='text-muted-foreground text-xs'>
                      {selectedOrder.shipping_address?.phone}
                    </p>
                  </div>
                  <div className='space-y-2 rounded-lg border p-3'>
                    <p className='text-sm font-semibold'>Shipping address</p>
                    <p className='text-sm'>
                      {selectedOrder.shipping_address?.line1}
                      {selectedOrder.shipping_address?.line2
                        ? `, ${selectedOrder.shipping_address?.line2}`
                        : ''}
                    </p>
                    <p className='text-muted-foreground text-xs'>
                      {selectedOrder.shipping_address?.city},{' '}
                      {selectedOrder.shipping_address?.state}{' '}
                      {selectedOrder.shipping_address?.pincode}
                    </p>
                    <p className='text-muted-foreground text-xs'>
                      {selectedOrder.shipping_address?.country || 'India'}
                    </p>
                  </div>
                </div>

                <Separator />

                <div className='grid gap-2 text-sm'>
                  <div className='flex justify-between'>
                    <span className='text-muted-foreground'>Payment</span>
                    <span className='font-semibold'>
                      {selectedOrder.payment_method || 'cod'} (
                      {selectedOrder.payment_status || 'pending'})
                    </span>
                  </div>
                  <div className='flex justify-between'>
                    <span className='text-muted-foreground'>Items total</span>
                    <span className='font-semibold'>
                      {formatMoney(
                        isVendor
                          ? selectedOrder.vendor_subtotal
                          : selectedOrder.subtotal
                      )}
                    </span>
                  </div>
                  {!isVendor && (
                    <>
                      <div className='flex justify-between'>
                        <span className='text-muted-foreground'>Shipping</span>
                        <span className='font-semibold'>
                          {formatMoney(selectedOrder.shipping_fee)}
                        </span>
                      </div>
                      <div className='flex justify-between'>
                        <span className='text-muted-foreground'>Discount</span>
                        <span className='font-semibold'>
                          -{formatMoney(selectedOrder.discount)}
                        </span>
                      </div>
                    </>
                  )}
                  <div className='flex justify-between text-base font-semibold'>
                    <span>{isVendor ? 'Your total' : 'Total'}</span>
                    <span>
                      {formatMoney(
                        isVendor
                          ? selectedOrder.vendor_subtotal
                          : selectedOrder.total
                      )}
                    </span>
                  </div>
                  {isVendor && (
                    <div className='text-muted-foreground flex justify-between text-xs'>
                      <span>Customer paid</span>
                      <span>{formatMoney(selectedOrder.total)}</span>
                    </div>
                  )}
                </div>

                {canUseBorzo && (
                  <>
                    <Separator />

                    <div className='space-y-4 rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-sky-50 p-4 shadow-sm'>
                      <div className='flex flex-wrap items-center justify-between gap-3'>
                        <div>
                          <p className='text-sm font-semibold text-slate-900'>
                            Borzo delivery
                          </p>
                          <p className='text-xs text-slate-600'>
                            {selectedOrder.borzo?.order_id
                              ? `Order ID ${selectedOrder.borzo.order_id} | ${selectedOrder.borzo.status || 'created'}`
                              : 'No Borzo delivery created yet.'}
                          </p>
                          {hasActiveBorzo && (
                            <p className='text-xs font-semibold text-amber-600'>
                              A Borzo delivery is already active for this order.
                            </p>
                          )}
                        </div>
                        {selectedOrder.borzo?.tracking_url && (
                          <a
                            href={selectedOrder.borzo.tracking_url}
                            target='_blank'
                            rel='noreferrer'
                            className='text-xs font-semibold text-indigo-700 underline'
                          >
                            Tracking
                          </a>
                        )}
                      </div>

                      {borzoError && (
                        <p className='text-xs text-rose-600'>{borzoError}</p>
                      )}

                      <div className='grid gap-3 lg:grid-cols-2'>
                        <div className='grid gap-2 rounded-xl border border-white/80 bg-white/80 p-3 shadow-sm'>
                          <p className='text-xs font-semibold text-slate-700'>
                            Pickup address override (optional)
                          </p>
                          <Input
                            placeholder='Pickup name'
                            value={pickupOverride.name}
                            onChange={(e) =>
                              setPickupOverride((prev) => ({
                                ...prev,
                                name: e.target.value,
                              }))
                            }
                          />
                          <Input
                            placeholder='Pickup phone'
                            value={pickupOverride.phone}
                            onChange={(e) =>
                              setPickupOverride((prev) => ({
                                ...prev,
                                phone: e.target.value,
                              }))
                            }
                          />
                          <Input
                            placeholder='Pickup address'
                            value={pickupOverride.address}
                            onChange={(e) =>
                              setPickupOverride((prev) => ({
                                ...prev,
                                address: e.target.value,
                              }))
                            }
                          />
                          <div className='grid gap-2 sm:grid-cols-2'>
                            <Input
                              placeholder='Pickup latitude'
                              value={pickupOverride.latitude}
                              onChange={(e) =>
                                setPickupOverride((prev) => ({
                                  ...prev,
                                  latitude: e.target.value,
                                }))
                              }
                            />
                            <Input
                              placeholder='Pickup longitude'
                              value={pickupOverride.longitude}
                              onChange={(e) =>
                                setPickupOverride((prev) => ({
                                  ...prev,
                                  longitude: e.target.value,
                                }))
                              }
                            />
                          </div>
                        </div>

                        <div className='grid gap-2 rounded-xl border border-white/80 bg-white/80 p-3 shadow-sm'>
                          <p className='text-xs font-semibold text-slate-700'>
                            Drop-off override (optional)
                          </p>
                          <Input
                            placeholder='Drop-off name'
                            value={dropoffOverride.name}
                            onChange={(e) =>
                              setDropoffOverride((prev) => ({
                                ...prev,
                                name: e.target.value,
                              }))
                            }
                          />
                          <Input
                            placeholder='Drop-off phone'
                            value={dropoffOverride.phone}
                            onChange={(e) =>
                              setDropoffOverride((prev) => ({
                                ...prev,
                                phone: e.target.value,
                              }))
                            }
                          />
                          <Input
                            placeholder='Drop-off address'
                            value={dropoffOverride.address}
                            onChange={(e) =>
                              setDropoffOverride((prev) => ({
                                ...prev,
                                address: e.target.value,
                              }))
                            }
                          />
                          <div className='grid gap-2 sm:grid-cols-2'>
                            <Input
                              placeholder='Drop-off latitude'
                              value={dropoffOverride.latitude}
                              onChange={(e) =>
                                setDropoffOverride((prev) => ({
                                  ...prev,
                                  latitude: e.target.value,
                                }))
                              }
                            />
                            <Input
                              placeholder='Drop-off longitude'
                              value={dropoffOverride.longitude}
                              onChange={(e) =>
                                setDropoffOverride((prev) => ({
                                  ...prev,
                                  longitude: e.target.value,
                                }))
                              }
                            />
                          </div>
                        </div>
                      </div>

                      <div className='flex flex-wrap items-center gap-2'>
                        <Button
                          size='sm'
                          onClick={handleCreateBorzo}
                          disabled={borzoBusy || hasActiveBorzo}
                          className='bg-gradient-to-r from-indigo-600 to-sky-600 text-white shadow-sm hover:from-indigo-500 hover:to-sky-500'
                        >
                          {borzoActionLoading
                            ? 'Creating...'
                            : hasActiveBorzo
                              ? 'Already created'
                              : 'Create Borzo delivery'}
                        </Button>
                        <Button
                          size='sm'
                          variant='outline'
                          onClick={handleCancelBorzo}
                          disabled={borzoBusy || !selectedOrder.borzo?.order_id}
                          className='border-indigo-200 text-indigo-700 hover:bg-indigo-50'
                        >
                          {borzoActionLoading
                            ? 'Canceling...'
                            : 'Cancel Borzo delivery'}
                        </Button>
                      </div>
                      <div className='flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600'>
                        <span>
                          {borzoQuoteLoading
                            ? 'Updating quote...'
                            : 'Auto-quote updates as you type.'}
                        </span>
                        {borzoQuote && (
                          <span className='font-semibold text-slate-900'>
                            Quote:{' '}
                            {formatINR(borzoQuote.amount, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                            {borzoQuote.warnings?.length
                              ? ` | ${borzoQuote.warnings.join(', ')}`
                              : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <StatisticsDialog
        open={statsOpen}
        onOpenChange={setStatsOpen}
        title='Order statistics'
        description='Summary for the current filters.'
        items={statsItems}
      />
    </>
  )
}
