import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { format } from 'date-fns'
import { Search } from 'lucide-react'
import { createFileRoute } from '@tanstack/react-router'
import type { RootState } from '@/store'
import { useSelector } from 'react-redux'
import { toast } from 'sonner'
import api from '@/lib/axios'
import { formatINR } from '@/lib/currency'
import { Badge } from '@/components/ui/badge'
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

export const Route = createFileRoute('/_authenticated/template-orders/')({
  component: TemplateOrdersPage,
})

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
  payment_method?: string
  payment_status?: string
  createdAt?: string
  template_id?: string
  template_key?: string
  template_name?: string
  website_id?: string
  website_name?: string
  website_slug?: string
  vendor_id?: {
    name?: string
    email?: string
    phone?: string
    businessName?: string
    storeName?: string
  }
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

type WebsiteOption = {
  id: string
  label: string
}

const DEFAULT_PAGE_SIZE = 10

function TemplateOrdersPage() {
  const BORZO_QUOTE_DEBOUNCE_MS = 600
  const user = useSelector((state: RootState) => state.auth?.user)
  const token = useSelector((state: RootState) => state.auth?.token)
  const role = String(user?.role || '').toLowerCase()
  const isVendor = role === 'vendor'
  const vendorId = String(user?.vendor_id || user?._id || user?.id || '')
  const canUseBorzo = false

  const [orders, setOrders] = useState<Order[]>([])
  const [summary, setSummary] = useState<OrderSummary | null>(null)
  const [websites, setWebsites] = useState<WebsiteOption[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(DEFAULT_PAGE_SIZE)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [websiteFilter, setWebsiteFilter] = useState('all')
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [statsOpen, setStatsOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const filtersRef = useRef({
    status: 'all',
    website: 'all',
    search: '',
    limit: DEFAULT_PAGE_SIZE,
  })
  const searchContainerRef = useRef<HTMLDivElement | null>(null)

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

  const totalPages = Math.max(Math.ceil(total / limit), 1)

  const formatMoney = (value?: number) => formatINR(value)
  const getWebsiteLabel = (order?: Order | null) =>
    String(
      order?.website_name ||
        order?.website_slug ||
        order?.template_name ||
        order?.template_key ||
        ''
    ).trim() || 'Unknown website'

  const FALLBACK_IMAGE =
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
        <rect width="120" height="120" fill="#f1f5f9"/>
        <rect x="18" y="18" width="84" height="84" fill="#e2e8f0" stroke="#cbd5f5" stroke-width="2"/>
        <path d="M34 78l18-22 14 16 10-12 20 18" fill="none" stroke="#94a3b8" stroke-width="4"/>
        <circle cx="46" cy="46" r="6" fill="#94a3b8"/>
      </svg>`
    )

  const isAbsoluteUrl = (value: string) => /^https?:\/\//i.test(value)

  const resolveBaseUrl = () => {
    const explicit = String(
      import.meta.env.VITE_PUBLIC_API_URL_BANNERS || ''
    ).trim()
    if (explicit) return explicit.replace(/\/$/, '')
    const api = String(import.meta.env.VITE_PUBLIC_API_URL || '').trim()
    if (!api) return ''
    return api
      .replace(/\/v1$/, '')
      .replace(/\/api$/, '')
      .replace(/\/$/, '')
  }

  const resolveImageUrl = (value?: string) => {
    if (!value) return FALLBACK_IMAGE
    const trimmed = String(value).trim()
    if (!trimmed) return FALLBACK_IMAGE
    if (trimmed.startsWith('data:') || trimmed.startsWith('blob:'))
      return trimmed
    if (trimmed.startsWith('//')) return `https:${trimmed}`
    if (isAbsoluteUrl(trimmed)) return trimmed
    if (/^(localhost:|127\.0\.0\.1|\\d+\\.\\d+\\.\\d+\\.\\d+)/.test(trimmed)) {
      return `http://${trimmed}`
    }
    if (
      trimmed.startsWith('ik.imagekit.io') ||
      trimmed.startsWith('imagekit.io')
    ) {
      return `https://${trimmed}`
    }
    const base = resolveBaseUrl()
    if (!base) return trimmed
    const normalized = trimmed.startsWith('/') ? trimmed : `/${trimmed}`
    return `${base}${normalized}`
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
      <Badge
        variant='outline'
        className={map[key] || 'bg-slate-100 text-slate-700'}
      >
        {key}
      </Badge>
    )
  }

  const courierStatusBadge = (order?: Order | null) => {
    const orderStatus = String(order?.status || '').toLowerCase()
    const hasRequestedCourier = Boolean(order?.borzo?.order_id || order?.delivery_provider)
    const courierStatus =
      orderStatus === 'delivered'
        ? 'delivered'
        : hasRequestedCourier
          ? 'requested'
          : 'pending'

    const toneMap: Record<string, string> = {
      pending: 'bg-amber-100 text-amber-700',
      requested: 'bg-blue-100 text-blue-700',
      delivered: 'bg-emerald-100 text-emerald-700',
    }

    return (
      <Badge
        variant='outline'
        className={toneMap[courierStatus] || 'bg-slate-100 text-slate-700'}
      >
        {courierStatus}
      </Badge>
    )
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

  const loadOrders = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get('/template-orders', {
        params: {
          page,
          limit,
          search: debouncedSearch || undefined,
          status: status === 'all' ? undefined : status,
          website_id: websiteFilter === 'all' ? undefined : websiteFilter,
        },
      })
      const data = res.data || {}
      setOrders(data.orders || [])
      setSummary(data.summary || null)
      setTotal(Number(data.total || 0))
      if (
        page > Math.max(Math.ceil((Number(data.total || 0) || 0) / limit), 1)
      ) {
        setPage(1)
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load orders')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim())
    }, 350)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    if (search.trim()) {
      setSearchOpen(true)
    }
  }, [search])

  useEffect(() => {
    if (!searchOpen) return

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null
      if (searchContainerRef.current?.contains(target)) return
      setSearchOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [searchOpen])

  useEffect(() => {
    const nextFilters = {
      status,
      website: websiteFilter,
      search: debouncedSearch,
      limit,
    }
    const filtersChanged =
      nextFilters.status !== filtersRef.current.status ||
      nextFilters.website !== filtersRef.current.website ||
      nextFilters.search !== filtersRef.current.search ||
      nextFilters.limit !== filtersRef.current.limit

    if (filtersChanged) {
      filtersRef.current = nextFilters
      if (page !== 1) {
        setPage(1)
        return
      }
    }

    loadOrders()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, status, websiteFilter, debouncedSearch, limit])

  useEffect(() => {
    const fetchWebsites = async () => {
      if (!token) {
        setWebsites([])
        setWebsiteFilter('all')
        return
      }

      if (isVendor && !vendorId) {
        setWebsites([])
        return
      }

      try {
        const res = await axios.get(
          `${import.meta.env.VITE_PUBLIC_API_URL}/v1/templates/by-vendor`,
          {
            params: {
              ...(isVendor ? { vendor_id: vendorId } : {}),
            },
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        )
        const data = res.data?.data || []
        const options: WebsiteOption[] = data
          .map((website: any) => {
            const websiteName = String(
              website?.name ||
                website?.business_name ||
                website?.website_slug ||
                website?.template_name ||
                website?.template_key ||
                'Website'
            ).trim()
            const vendorName = String(
              website?.vendor_name ||
                website?.vendor_business_name ||
                website?.vendor_email ||
                ''
            ).trim()

            return {
              id: String(website?._id || website?.id || ''),
              label:
                !isVendor && vendorName
                  ? `${websiteName} - ${vendorName}`
                  : websiteName,
            }
          })
          .filter((item: WebsiteOption) => item.id)

        setWebsites(options)
        setWebsiteFilter((current) =>
          current !== 'all' && !options.some((item) => item.id === current)
            ? 'all'
            : current
        )
      } catch {
        setWebsites([])
        setWebsiteFilter('all')
      }
    }

    fetchWebsites()
  }, [isVendor, vendorId, token])

  useEffect(() => {
    setBorzoError('')
    setBorzoQuote(null)

    if (!selectedOrder) {
      setPickupOverride({
        name: '',
        phone: '',
        address: '',
        latitude: '',
        longitude: '',
      })
      setDropoffOverride({
        name: '',
        phone: '',
        address: '',
        latitude: '',
        longitude: '',
      })
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

    setPickupOverride(
      pickupFromPayload || {
        name: '',
        phone: '',
        address: '',
        latitude: '',
        longitude: '',
      }
    )
    setDropoffOverride(
      dropoffFromPayload ||
        dropoffFromShipping || {
          name: '',
          phone: '',
          address: '',
          latitude: '',
          longitude: '',
        }
    )
  }, [selectedOrder?._id])

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
      await api.post(
        `/template-orders/${selectedOrder._id}/borzo/create`,
        payload
      )
      await loadOrders()
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
    if (!selectedOrder?._id || !canUseBorzo) return
    try {
      setBorzoQuoteLoading(true)
      setBorzoError('')
      const payload = buildBorzoPayload()
      const res = await api.post(
        `/template-orders/${selectedOrder._id}/borzo/calculate`,
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
      await api.post(`/template-orders/${selectedOrder._id}/borzo/cancel`)
      await loadOrders()
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
    if (borzoActionLoading || borzoQuoteLoading) return
    const timer = setTimeout(() => {
      handleCalculateBorzo()
    }, BORZO_QUOTE_DEBOUNCE_MS)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOrder?._id, pickupOverride, dropoffOverride, canUseBorzo])

  const openDetails = (order: Order) => {
    setSelectedOrder(order)
    setDetailsOpen(true)
  }

  const totalOrders = summary?.totalOrders || total || orders.length
  const totalRevenue =
    summary?.totalRevenue ||
    orders.reduce((acc, order) => acc + (order.total || 0), 0)
  const paidCount = summary?.paymentStatusCounts?.paid || 0
  const failedCount = summary?.paymentStatusCounts?.failed || 0
  const paidRevenue = summary?.paidRevenue || 0
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

  return (
    <>
      <TablePageHeader title='Order - Website Data'>
        <div className='flex w-full flex-wrap items-center justify-between gap-3'>
          <div className='flex flex-wrap items-center gap-3'>
            <Select value={websiteFilter} onValueChange={setWebsiteFilter}>
              <SelectTrigger className='w-44 shrink-0'>
                <SelectValue placeholder='All websites' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>All websites</SelectItem>
                {websites.map((website) => (
                  <SelectItem key={website.id} value={website.id}>
                    {website.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
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
          </div>
          <div className='ml-auto flex flex-wrap items-center justify-end gap-3'>
            <div ref={searchContainerRef} className='flex items-center gap-2'>
              {searchOpen ? (
                <div className='relative'>
                  <Search className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder='Search order number or customer'
                    className='h-10 w-64 shrink-0 pl-9'
                    autoFocus
                  />
                </div>
              ) : (
                <Button
                  type='button'
                  variant='ghost'
                  size='icon'
                  className='h-10 w-10 shrink-0 rounded-full text-[#183b63] hover:bg-transparent hover:text-[#183b63]'
                  onClick={() => setSearchOpen(true)}
                  aria-label='Open search'
                >
                  <Search className='h-6 w-6 stroke-[2.5]' />
                </Button>
              )}
            </div>
            <Button
              variant='outline'
              className='shrink-0'
              onClick={() => setStatsOpen(true)}
            >
              Statistics
            </Button>
            <Button className='shrink-0' onClick={loadOrders} disabled={loading}>
              {loading ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
        </div>
      </TablePageHeader>

      <Main className='flex flex-1 flex-col gap-6'>
        <TableShell
          className='flex-1'
          title='Order list'
          footer={
            <ServerPagination
              page={page}
              totalPages={totalPages}
              totalItems={total}
              pageSize={limit}
              pageSizeOptions={[10, 20, 50]}
              onPageChange={setPage}
              onPageSizeChange={(value) => setLimit(value)}
              disabled={loading}
            />
          }
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className='min-w-[170px]'>Order</TableHead>
                <TableHead className='min-w-[200px]'>Customer</TableHead>
                {!isVendor && (
                  <TableHead className='min-w-[180px]'>Vendor</TableHead>
                )}
                <TableHead>Status</TableHead>
                <TableHead className='min-w-[160px]'>Website</TableHead>
                <TableHead className='min-w-[120px]'>Items</TableHead>
                <TableHead className='min-w-[140px]'>Total</TableHead>
                <TableHead className='min-w-[160px]'>Created</TableHead>
                <TableHead className='text-right'>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && orders.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={isVendor ? 8 : 9}
                    className='h-24 text-center'
                  >
                    Loading orders...
                  </TableCell>
                </TableRow>
              ) : orders.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={isVendor ? 8 : 9}
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
                        {order.payment_method || 'cod'} (
                        {order.payment_status || 'pending'})
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
                    {!isVendor && (
                      <TableCell>
                        <div className='text-sm font-medium'>
                          {order.vendor_id?.businessName ||
                            order.vendor_id?.storeName ||
                            order.vendor_id?.name ||
                            'Vendor'}
                        </div>
                        <div className='text-muted-foreground text-xs'>
                          {order.vendor_id?.email ||
                            order.vendor_id?.phone ||
                            'N/A'}
                        </div>
                      </TableCell>
                    )}
                    <TableCell>{statusBadge(order.status)}</TableCell>
                    <TableCell className='text-muted-foreground text-sm'>
                      {getWebsiteLabel(order)}
                    </TableCell>
                    <TableCell className='text-muted-foreground text-sm'>
                      {order.items?.length || 0} items
                    </TableCell>
                    <TableCell className='text-sm font-semibold'>
                      {formatMoney(order.total)}
                    </TableCell>
                    <TableCell className='text-muted-foreground text-sm'>
                      {order.createdAt
                        ? format(new Date(order.createdAt), 'MMM dd, yyyy')
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
          {!selectedOrder ? (
            <p className='text-muted-foreground text-sm'>No order selected.</p>
          ) : (
            <div className='space-y-6'>
              <div className='flex flex-wrap items-center justify-between gap-3 text-sm'>
                <div>
                  <p className='text-muted-foreground text-xs'>Order number</p>
                  <p className='font-semibold'>#{selectedOrder.order_number}</p>
                </div>
                <div>
                  <p className='text-muted-foreground text-xs'>Status</p>
                  <div>{statusBadge(selectedOrder.status)}</div>
                </div>
                <div>
                  <p className='text-muted-foreground text-xs'>Courier Status</p>
                  <div>{courierStatusBadge(selectedOrder)}</div>
                </div>
                <div>
                  <p className='text-muted-foreground text-xs'>Created</p>
                  <p className='font-semibold'>
                    {selectedOrder.createdAt
                      ? new Date(selectedOrder.createdAt).toLocaleString()
                      : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className='text-muted-foreground text-xs'>Website</p>
                  <p className='font-semibold'>
                    {getWebsiteLabel(selectedOrder)}
                  </p>
                </div>
                <div className='flex flex-wrap items-center gap-2'>
                  <Button
                    size='sm'
                    onClick={() => {
                      const params = new URLSearchParams()
                      if (selectedOrder?._id) params.set('orderId', selectedOrder._id)
                      if (selectedOrder?.shipping_address?.pincode) {
                        params.set('destination', String(selectedOrder.shipping_address.pincode))
                      }
                      window.location.assign(
                        `/courier${params.toString() ? `?${params.toString()}` : ''}`
                      )
                    }}
                  >
                    Go to Courier section
                  </Button>
                </div>
              </div>

              <Separator />

              <div className='space-y-3'>
                <p className='text-sm font-semibold'>Items</p>
                <div className='max-h-[320px] space-y-3 overflow-y-auto pr-2'>
                  {selectedOrder.items.map((item) => (
                    <div
                      key={item.product_id || item._id}
                      className='flex gap-3 rounded-none border p-3'
                    >
                      <div className='h-14 w-14 overflow-hidden rounded-none bg-slate-100'>
                        <img
                          src={resolveImageUrl(item.image_url)}
                          alt={item.product_name || 'Product'}
                          className='h-full w-full object-cover'
                          onError={(event) => {
                            const target = event.currentTarget
                            if (target.dataset.fallbackApplied) return
                            target.dataset.fallbackApplied = 'true'
                            target.src = FALLBACK_IMAGE
                          }}
                        />
                      </div>
                      <div className='flex flex-1 items-start justify-between gap-3'>
                        <div className='min-w-0'>
                          <p className='line-clamp-2 text-sm font-semibold text-slate-900'>
                            {item.product_name}
                          </p>
                          <p className='text-muted-foreground text-xs'>
                            {Object.values(item.variant_attributes || {}).join(
                              ' / '
                            )}
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
                <div className='space-y-2 rounded-none border p-3'>
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
                <div className='space-y-2 rounded-none border p-3'>
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
                {!isVendor && selectedOrder.vendor_id && (
                  <div className='space-y-2 rounded-none border p-3'>
                    <p className='text-sm font-semibold'>Vendor</p>
                    <p className='text-sm'>
                      {selectedOrder.vendor_id?.businessName ||
                        selectedOrder.vendor_id?.storeName ||
                        selectedOrder.vendor_id?.name}
                    </p>
                    <p className='text-muted-foreground text-xs'>
                      {selectedOrder.vendor_id?.email}
                    </p>
                    <p className='text-muted-foreground text-xs'>
                      {selectedOrder.vendor_id?.phone}
                    </p>
                  </div>
                )}
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
                    {formatMoney(selectedOrder.subtotal)}
                  </span>
                </div>
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
                <div className='flex justify-between text-base font-semibold'>
                  <span>Total</span>
                  <span>{formatMoney(selectedOrder.total)}</span>
                </div>
              </div>

              {canUseBorzo && (
                <>
                  <Separator />

                  <div className='space-y-4 rounded-none border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-sky-50 p-4 shadow-sm'>
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
                      <div className='grid gap-2 rounded-none border border-white/80 bg-white/80 p-3 shadow-sm'>
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

                      <div className='grid gap-2 rounded-none border border-white/80 bg-white/80 p-3 shadow-sm'>
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
            </div>
          )}
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
