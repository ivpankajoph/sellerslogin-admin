import { useEffect, useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useSelector } from 'react-redux'
import axios from 'axios'
import api from '@/lib/axios'
import type { RootState } from '@/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'


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

type TemplateOrder = {
  _id: string
  order_number?: string
  status?: string
  total?: number
  subtotal?: number
  shipping_fee?: number
  discount?: number
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
  template_id?: string
  template_key?: string
  template_name?: string
  vendor_id?: { _id?: string; name?: string; email?: string; phone?: string; businessName?: string; storeName?: string }
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

export const Route = createFileRoute('/_authenticated/template-orders/')({
  component: TemplateOrdersReport,
})

function TemplateOrdersReport() {
  const BORZO_QUOTE_DEBOUNCE_MS = 600
  const [orders, setOrders] = useState<TemplateOrder[]>([])
  const [summary, setSummary] = useState<OrderSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [vendorFilter, setVendorFilter] = useState('all')
  const [templateFilter, setTemplateFilter] = useState('all')
  const [vendors, setVendors] = useState<Array<{ _id?: string; name?: string; business_name?: string; businessName?: string; storeName?: string; email?: string }>>([])
  const [templates, setTemplates] = useState<Array<{ _id?: string; template_key?: string; template_name?: string; name?: string }>>([])
  const [templatesLoading, setTemplatesLoading] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [borzoActionLoading, setBorzoActionLoading] = useState(false)
  const [borzoQuoteLoading, setBorzoQuoteLoading] = useState(false)
  const [borzoError, setBorzoError] = useState('')
  const [borzoQuote, setBorzoQuote] = useState<{ amount?: number; warnings?: string[] } | null>(null)
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
  const token = useSelector((state: RootState) => state.auth?.token)
  const isVendor = role === 'vendor'

  const fetchOrders = async () => {
    try {
      setLoading(true)
      setError('')
      const res = await api.get('/template-orders', {
        params: {
          page,
          limit: 20,
          search: search || undefined,
          status: status === 'all' ? undefined : status,
          vendor_id: vendorFilter === 'all' ? undefined : vendorFilter,
          template_id: templateFilter === 'all' ? undefined : templateFilter,
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
      setError(err?.response?.data?.message || 'Failed to load template orders')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, status, vendorFilter, templateFilter])

  useEffect(() => {
    if (isVendor) return
    const fetchVendors = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_PUBLIC_API_URL}/v1/vendors/getall`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        })
        setVendors(res.data?.vendors || res.data?.data || [])
      } catch {
        setVendors([])
      }
    }
    fetchVendors()
  }, [isVendor, token])

  useEffect(() => {
    if (isVendor) return
    if (vendorFilter === 'all') {
      setTemplates([])
      setTemplateFilter('all')
      return
    }
    const fetchTemplates = async () => {
      try {
        setTemplatesLoading(true)
        const res = await axios.get(`${import.meta.env.VITE_PUBLIC_API_URL}/v1/templates/by-vendor`, {
          params: { vendor_id: vendorFilter },
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        })
        setTemplates(res.data?.data || [])
      } catch {
        setTemplates([])
      } finally {
        setTemplatesLoading(false)
      }
    }
    fetchTemplates()
  }, [isVendor, vendorFilter, token])

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

  const emptyOverride = { name: '', phone: '', address: '', latitude: '', longitude: '' }

  const buildAddressString = (address?: TemplateOrder['shipping_address']) => {
    if (!address) return ''
    return [address.line1, address.line2, address.city, address.state, address.pincode, address.country]
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
    setDropoffOverride(dropoffFromPayload || dropoffFromShipping || emptyOverride)
  }, [selectedOrder?._id])

  const formatMoney = (value?: number) =>
    `â‚¹${Number(value || 0).toLocaleString()}`

  const formatAttrs = (attrs?: Record<string, string>) => {
    if (!attrs) return ''
    return Object.values(attrs)
      .filter((value) => value)
      .join(' / ')
  }

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
  const totalRevenue = summary?.totalRevenue || orders.reduce((acc, o) => acc + (o.total || 0), 0)
  const statusFallback = orders.reduce<Record<string, number>>((acc, order) => {
    const key = (order.status || 'unknown').toLowerCase()
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})
  const paidCount = summary?.paymentStatusCounts?.paid || 0
  const failedCount = summary?.paymentStatusCounts?.failed || 0
  const paidRevenue = summary?.paidRevenue || 0
  const pendingCount = summary?.statusCounts?.pending ?? statusFallback.pending ?? 0
  const deliveredCount = summary?.statusCounts?.delivered ?? statusFallback.delivered ?? 0
  const pageCount = Math.max(Math.ceil(total / 20), 1)

  const hasActiveBorzo =
    Boolean(selectedOrder?.borzo?.order_id) &&
    !['canceled', 'cancelled', 'failed'].includes(
      String(selectedOrder?.borzo?.status || '').toLowerCase(),
    )
  const borzoBusy = borzoActionLoading || borzoQuoteLoading

  const buildBorzoPayload = () => {
    const hasPickupOverride = Object.values(pickupOverride).some((value) =>
      String(value || '').trim().length,
    )
    const hasDropoffOverride = Object.values(dropoffOverride).some((value) =>
      String(value || '').trim().length,
    )
    return {
      ...(hasPickupOverride ? { pickup: pickupOverride } : {}),
      ...(hasDropoffOverride ? { dropoff: dropoffOverride } : {}),
    }
  }

  const handleCreateBorzo = async () => {
    if (!selectedOrder?._id) return
    if (hasActiveBorzo) {
      toast.error('Borzo delivery already exists for this order.')
      return
    }
    try {
      setBorzoActionLoading(true)
      setBorzoError('')
      const payload = buildBorzoPayload()
      await api.post(`/template-orders/${selectedOrder._id}/borzo/create`, payload)
      await fetchOrders()
      toast.success('Borzo delivery created.')
    } catch (err: any) {
      const details = err?.response?.data?.details
      const detailText = details ? ` â€¢ ${JSON.stringify(details)}` : ''
      const message = `${err?.response?.data?.message || 'Failed to create Borzo delivery'}${detailText}`
      setBorzoError(message)
      toast.error(message)
    } finally {
      setBorzoActionLoading(false)
    }
  }

  const handleCalculateBorzo = async () => {
    if (!selectedOrder?._id) return
    try {
      setBorzoQuoteLoading(true)
      setBorzoError('')
      const payload = buildBorzoPayload()
      const res = await api.post(`/template-orders/${selectedOrder._id}/borzo/calculate`, payload)
      const amount = Number(res?.data?.response?.order?.payment_amount || 0)
      const warnings = res?.data?.response?.warnings || []
      setBorzoQuote({ amount: Number.isFinite(amount) ? amount : 0, warnings })
    } catch (err: any) {
      const details = err?.response?.data?.details
      const detailText = details ? ` â€¢ ${JSON.stringify(details)}` : ''
      const message = `${err?.response?.data?.message || 'Failed to calculate Borzo delivery'}${detailText}`
      setBorzoError(message)
    } finally {
      setBorzoQuoteLoading(false)
    }
  }

  const handleCancelBorzo = async () => {
    if (!selectedOrder?._id) return
    try {
      setBorzoActionLoading(true)
      setBorzoError('')
      await api.post(`/template-orders/${selectedOrder._id}/borzo/cancel`)
      await fetchOrders()
      toast.success('Borzo delivery cancelled.')
    } catch (err: any) {
      const details = err?.response?.data?.details
      const detailText = details ? ` â€¢ ${JSON.stringify(details)}` : ''
      const message = `${err?.response?.data?.message || 'Failed to cancel Borzo delivery'}${detailText}`
      setBorzoError(message)
      toast.error(message)
    } finally {
      setBorzoActionLoading(false)
    }
  }

  useEffect(() => {
    if (!selectedOrder?._id) return
    if (hasActiveBorzo) return
    if (borzoActionLoading) return
    if (borzoQuoteLoading) return
    const timer = setTimeout(() => {
      handleCalculateBorzo()
    }, BORZO_QUOTE_DEBOUNCE_MS)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOrder?._id, pickupOverride, dropoffOverride])

  return (
    <div className='space-y-6'>
      <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <div className='relative overflow-hidden rounded-2xl border border-slate-200/60 bg-gradient-to-r from-slate-50 via-white to-slate-50 px-5 py-4 shadow-sm'>
          <div className='pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-gradient-to-br from-indigo-200/60 to-sky-200/60 blur-2xl' />
          <div className='pointer-events-none absolute -bottom-12 -left-8 h-28 w-28 rounded-full bg-gradient-to-br from-amber-200/50 to-rose-200/50 blur-2xl' />
          <h1 className='text-2xl font-semibold text-slate-900'>Order - Template Data</h1>
          <p className='text-sm text-slate-600'>
            {isVendor ? 'Your storefront order history' : 'All storefront orders across vendors'}
          </p>
        </div>
        <div className='flex flex-wrap items-center gap-2'>
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
            className='w-64 border-transparent bg-gradient-to-r from-indigo-50 via-sky-50 to-emerald-50 text-slate-700 shadow-sm ring-1 ring-indigo-200/70 focus-visible:ring-2 focus-visible:ring-indigo-400'
          />
          {!isVendor && (
            <select
              value={vendorFilter}
              onChange={(e) => {
                setVendorFilter(e.target.value)
                setPage(1)
              }}
              className='h-10 min-w-[180px] rounded-md border border-transparent bg-gradient-to-r from-amber-50 via-rose-50 to-orange-50 px-3 text-sm text-slate-700 shadow-sm ring-1 ring-amber-200/70 focus:ring-2 focus:ring-amber-400'
            >
              <option value='all'>All vendors</option>
              {vendors.map((vendor) => (
                <option key={vendor._id} value={vendor._id || ''}>
                  {vendor.name || vendor.business_name || vendor.businessName || vendor.storeName || vendor.email || vendor._id}
                </option>
              ))}
            </select>
          )}
          {!isVendor && (
            <select
              value={templateFilter}
              onChange={(e) => {
                setTemplateFilter(e.target.value)
                setPage(1)
              }}
              className='h-10 min-w-[190px] rounded-md border border-transparent bg-gradient-to-r from-fuchsia-50 via-pink-50 to-rose-50 px-3 text-sm text-slate-700 shadow-sm ring-1 ring-fuchsia-200/70 focus:ring-2 focus:ring-fuchsia-400'
              disabled={vendorFilter === 'all' || templatesLoading}
            >
              <option value='all'>
                {vendorFilter === 'all' ? 'Select vendor first' : templatesLoading ? 'Loading templates...' : 'All templates'}
              </option>
              {templates.map((template) => (
                <option key={template._id} value={template._id || ''}>
                  {template.template_name || template.template_key || template.name || template._id}
                </option>
              ))}
            </select>
          )}
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value)
              setPage(1)
            }}
            className='h-10 rounded-md border border-transparent bg-gradient-to-r from-sky-50 via-cyan-50 to-teal-50 px-3 text-sm text-slate-700 shadow-sm ring-1 ring-sky-200/70 focus:ring-2 focus:ring-sky-400'
          >
            <option value='all'>All status</option>
            <option value='pending'>Pending</option>
            <option value='confirmed'>Confirmed</option>
            <option value='shipped'>Shipped</option>
            <option value='delivered'>Delivered</option>
            <option value='failed'>Failed</option>
            <option value='cancelled'>Cancelled</option>
          </select>
          <Button onClick={() => fetchOrders()} disabled={loading} className='bg-slate-900 text-white shadow-sm hover:bg-slate-800'>
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
        <Card className='border-0 bg-gradient-to-br from-indigo-500 to-sky-500 text-white shadow-lg shadow-indigo-100'>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm text-white/80'>Total Orders</CardTitle>
          </CardHeader>
          <CardContent className='text-3xl font-semibold'>{totalOrders}</CardContent>
        </Card>
        <Card className='border-0 bg-gradient-to-br from-emerald-500 to-lime-500 text-white shadow-lg shadow-emerald-100'>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm text-white/80'>Total Revenue</CardTitle>
          </CardHeader>
          <CardContent className='text-3xl font-semibold'>{formatMoney(totalRevenue)}</CardContent>
        </Card>
        <Card className='border-0 bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg shadow-amber-100'>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm text-white/80'>Pending</CardTitle>
          </CardHeader>
          <CardContent className='text-3xl font-semibold'>
            {pendingCount}
          </CardContent>
        </Card>
        <Card className='border-0 bg-gradient-to-br from-fuchsia-500 to-rose-500 text-white shadow-lg shadow-fuchsia-100'>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm text-white/80'>Delivered</CardTitle>
          </CardHeader>
          <CardContent className='text-3xl font-semibold'>
            {deliveredCount}
          </CardContent>
        </Card>
      </div>

      <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
        <Card className='border-0 bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-100'>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm text-white/80'>Payments Paid</CardTitle>
          </CardHeader>
          <CardContent className='text-3xl font-semibold'>{paidCount}</CardContent>
        </Card>
        <Card className='border-0 bg-gradient-to-br from-rose-500 to-red-500 text-white shadow-lg shadow-rose-100'>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm text-white/80'>Payments Failed</CardTitle>
          </CardHeader>
          <CardContent className='text-3xl font-semibold'>{failedCount}</CardContent>
        </Card>
        <Card className='border-0 bg-gradient-to-br from-slate-700 to-slate-900 text-white shadow-lg shadow-slate-200'>
          <CardHeader className='pb-2'>
            <CardTitle className='text-sm text-white/80'>Paid Revenue</CardTitle>
          </CardHeader>
          <CardContent className='text-3xl font-semibold'>{formatMoney(paidRevenue)}</CardContent>
        </Card>
      </div>

      <div className='grid gap-6 xl:grid-cols-[360px_1fr]'>
        <Card className='h-fit border-slate-200/70 shadow-sm'>
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
                  className={`w-full rounded-xl border p-3 text-left transition ${
                    selectedId === order._id
                      ? 'border-indigo-500/70 bg-gradient-to-r from-indigo-50 to-white'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className='flex items-center justify-between'>
                    <span className='text-sm font-semibold'>#{order.order_number}</span>
                    {statusBadge(order.status)}
                  </div>
                  <div className='mt-2 text-xs text-muted-foreground'>
                    {(order.user_id?.name || order.shipping_address?.full_name || 'Customer')}
                    {order.user_id?.email ? ` â€¢ ${order.user_id.email}` : ''}
                  </div>
                  {!isVendor && order.vendor_id && (
                    <div className='mt-2 text-xs text-slate-500'>
                      Vendor: {order.vendor_id?.name || order.vendor_id?.businessName || order.vendor_id?.storeName || order.vendor_id?._id}
                    </div>
                  )}
                  {!isVendor && (order.template_name || order.template_key || order.template_id) && (
                    <div className='mt-1 text-xs text-slate-500'>
                      Template: {order.template_name || order.template_key || order.template_id}
                    </div>
                  )}
                  <div className='mt-2 flex items-center justify-between text-sm font-semibold'>
                    <span>{order.items?.length || 0} items</span>
                    <span>{formatMoney(order.total)}</span>
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

        <Card className='border-slate-200/70 shadow-sm'>
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
                          await api.put(`/template-orders/${selectedOrder._id}/status`, {
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
                          await api.put(`/template-orders/${selectedOrder._id}/status`, {
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
                  {!isVendor && selectedOrder.vendor_id && (
                    <div>
                      <p className='text-xs text-muted-foreground'>Vendor</p>
                      <p className='font-semibold'>
                        {selectedOrder.vendor_id?.name ||
                          selectedOrder.vendor_id?.businessName ||
                          selectedOrder.vendor_id?.storeName ||
                          selectedOrder.vendor_id?._id}
                      </p>
                    </div>
                  )}
                  {!isVendor && (selectedOrder.template_name || selectedOrder.template_key || selectedOrder.template_id) && (
                    <div>
                      <p className='text-xs text-muted-foreground'>Template</p>
                      <p className='font-semibold'>
                        {selectedOrder.template_name || selectedOrder.template_key || selectedOrder.template_id}
                      </p>
                    </div>
                  )}
                </div>

                <Separator />

                <div className='space-y-3'>
                  <p className='text-sm font-semibold'>Items</p>
                  <div className='max-h-[360px] space-y-3 overflow-y-auto pr-2'>
                    {selectedOrder.items.map((item) => {
                      const vendorId = selectedOrder.vendor_id?._id || ''
                      const productHref = item.product_id && vendorId
                        ? `/template/${vendorId}/product/${item.product_id}`
                        : '#'
                      return (
                        <a
                          key={item.product_id || item._id}
                          href={productHref}
                          className='flex gap-3 rounded-lg border p-3 transition hover:border-slate-300'
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
                              <p className='text-sm font-semibold text-slate-900 line-clamp-2'>
                                {item.product_name}
                              </p>
                              <p className='text-xs text-muted-foreground'>
                                {formatAttrs(item.variant_attributes) || 'Default variant'}
                              </p>
                              <p className='text-xs text-muted-foreground'>Qty: {item.quantity}</p>
                            </div>
                            <div className='text-sm font-semibold whitespace-nowrap'>
                              {formatMoney(item.total_price)}
                            </div>
                          </div>
                        </a>
                      )
                    })}
                  </div>
                </div>

                <Separator />

                <div className='grid gap-4 md:grid-cols-2'>
                  <div className='space-y-2 rounded-lg border p-3'>
                    <p className='text-sm font-semibold'>Customer</p>
                    <p className='text-sm'>
                      {selectedOrder.user_id?.name || selectedOrder.shipping_address?.full_name}
                    </p>
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
                    <span className='text-muted-foreground'>Payment</span>
                    <span className='font-semibold'>
                      {selectedOrder.payment_method || 'cod'} ({selectedOrder.payment_status || 'pending'})
                    </span>
                  </div>
                  <div className='flex justify-between'>
                    <span className='text-muted-foreground'>Subtotal</span>
                    <span className='font-semibold'>{formatMoney(selectedOrder.subtotal)}</span>
                  </div>
                  <div className='flex justify-between'>
                    <span className='text-muted-foreground'>Shipping</span>
                    <span className='font-semibold'>{formatMoney(selectedOrder.shipping_fee)}</span>
                  </div>
                  <div className='flex justify-between'>
                    <span className='text-muted-foreground'>Discount</span>
                    <span className='font-semibold'>-{formatMoney(selectedOrder.discount)}</span>
                  </div>
                  <div className='flex justify-between text-base font-semibold'>
                    <span>Total</span>
                    <span>{formatMoney(selectedOrder.total)}</span>
                  </div>
                </div>

                <Separator />

                <div className='space-y-4 rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-sky-50 p-4 shadow-sm'>
                  <div className='flex flex-wrap items-center justify-between gap-3'>
                    <div>
                      <p className='text-sm font-semibold text-slate-900'>Borzo delivery</p>
                      <p className='text-xs text-slate-600'>
                        {selectedOrder.borzo?.order_id
                          ? `Order ID ${selectedOrder.borzo.order_id} â€¢ ${selectedOrder.borzo.status || 'created'}`
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
                    <p className='text-xs font-semibold text-slate-700'>Pickup address override (optional)</p>
                    <Input
                      placeholder='Pickup name'
                      value={pickupOverride.name}
                      onChange={(e) => setPickupOverride((prev) => ({ ...prev, name: e.target.value }))}
                    />
                    <Input
                      placeholder='Pickup phone'
                      value={pickupOverride.phone}
                      onChange={(e) => setPickupOverride((prev) => ({ ...prev, phone: e.target.value }))}
                    />
                    <Input
                      placeholder='Pickup address'
                      value={pickupOverride.address}
                      onChange={(e) => setPickupOverride((prev) => ({ ...prev, address: e.target.value }))}
                    />
                    <div className='grid gap-2 sm:grid-cols-2'>
                      <Input
                        placeholder='Pickup latitude'
                        value={pickupOverride.latitude}
                        onChange={(e) => setPickupOverride((prev) => ({ ...prev, latitude: e.target.value }))}
                      />
                      <Input
                        placeholder='Pickup longitude'
                        value={pickupOverride.longitude}
                        onChange={(e) => setPickupOverride((prev) => ({ ...prev, longitude: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className='grid gap-2 rounded-xl border border-white/80 bg-white/80 p-3 shadow-sm'>
                    <p className='text-xs font-semibold text-slate-700'>Drop-off override (optional)</p>
                    <Input
                      placeholder='Drop-off name'
                      value={dropoffOverride.name}
                      onChange={(e) => setDropoffOverride((prev) => ({ ...prev, name: e.target.value }))}
                    />
                    <Input
                      placeholder='Drop-off phone'
                      value={dropoffOverride.phone}
                      onChange={(e) => setDropoffOverride((prev) => ({ ...prev, phone: e.target.value }))}
                    />
                    <Input
                      placeholder='Drop-off address'
                      value={dropoffOverride.address}
                      onChange={(e) => setDropoffOverride((prev) => ({ ...prev, address: e.target.value }))}
                    />
                    <div className='grid gap-2 sm:grid-cols-2'>
                      <Input
                        placeholder='Drop-off latitude'
                        value={dropoffOverride.latitude}
                        onChange={(e) => setDropoffOverride((prev) => ({ ...prev, latitude: e.target.value }))}
                      />
                      <Input
                        placeholder='Drop-off longitude'
                        value={dropoffOverride.longitude}
                        onChange={(e) => setDropoffOverride((prev) => ({ ...prev, longitude: e.target.value }))}
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
                      {borzoActionLoading ? 'Creating...' : hasActiveBorzo ? 'Already created' : 'Create Borzo delivery'}
                    </Button>
                    <Button
                      size='sm'
                      variant='outline'
                      onClick={handleCancelBorzo}
                      disabled={borzoBusy || !selectedOrder.borzo?.order_id}
                      className='border-indigo-200 text-indigo-700 hover:bg-indigo-50'
                    >
                      {borzoActionLoading ? 'Canceling...' : 'Cancel Borzo delivery'}
                    </Button>
                  </div>
                  <div className='flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600'>
                    <span>{borzoQuoteLoading ? 'Updating quote...' : 'Auto-quote updates as you type.'}</span>
                    {borzoQuote && (
                      <span className='font-semibold text-slate-900'>
                        Quote: â‚¹{borzoQuote.amount?.toFixed?.(2) || borzoQuote.amount || 0}
                        {borzoQuote.warnings?.length ? ` â€¢ ${borzoQuote.warnings.join(', ')}` : ''}
                      </span>
                    )}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
