/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react'
import axios from 'axios'
import { useSelector } from 'react-redux'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import {
  Truck,
  Package,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  MapPin,
  Calculator,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import type { RootState } from '@/store'

const BASE_URL = import.meta.env.VITE_PUBLIC_API_URL

type BorzoStatus = {
  order_id?: string
  status?: string
  status_description?: string
  tracking_url?: string
  courier?: string
}

type OrderItem = {
  product_name?: string
  quantity?: number
  vendor_id?: string
}

type Order = {
  _id: string
  status?: string
  createdAt?: string
  customer_name?: string
  customer_phone?: string
  customer_address?: string
  delivery_address?: {
    street?: string
    city?: string
    state?: string
    pincode?: string
  }
  items?: OrderItem[]
  total?: number
  borzo?: BorzoStatus
  delivery_provider?: string
}

type BorzoCalculateResponse = {
  payload?: unknown
  response?: {
    order?: {
      payment_amount?: number
      vehicle_type?: number
      status?: string
      courier?: string
      points?: Array<{ name?: string; address?: string }>
    }
  }
}

const StatusBadge = ({ status }: { status?: string }) => {
  const s = (status || '').toLowerCase()
  if (!status) return <span className='text-xs text-slate-400'>—</span>

  const map: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
    active: { color: 'bg-green-100 text-green-700', icon: <CheckCircle className='h-3 w-3' />, label: 'Active' },
    completed: { color: 'bg-blue-100 text-blue-700', icon: <CheckCircle className='h-3 w-3' />, label: 'Completed' },
    canceled: { color: 'bg-red-100 text-red-700', icon: <XCircle className='h-3 w-3' />, label: 'Cancelled' },
    cancelled: { color: 'bg-red-100 text-red-700', icon: <XCircle className='h-3 w-3' />, label: 'Cancelled' },
    pending: { color: 'bg-amber-100 text-amber-700', icon: <Clock className='h-3 w-3' />, label: 'Pending' },
    failed: { color: 'bg-red-100 text-red-600', icon: <AlertTriangle className='h-3 w-3' />, label: 'Failed' },
  }
  const config = map[s] || { color: 'bg-slate-100 text-slate-600', icon: <Clock className='h-3 w-3' />, label: status }

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${config.color}`}>
      {config.icon}
      {config.label}
    </span>
  )
}

function OrderCourierCard({ order, token }: { order: Order; token: string | undefined }) {
  const [expanded, setExpanded] = useState(false)
  const [calcResult, setCalcResult] = useState<BorzoCalculateResponse | null>(null)
  const [isCalculating, setIsCalculating] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)
  const [localBorzo, setLocalBorzo] = useState<BorzoStatus | undefined>(order.borzo)

  const hasActiveBorzo =
    localBorzo?.order_id &&
    !['canceled', 'cancelled', 'failed'].includes((localBorzo?.status || '').toLowerCase())

  const headers = { Authorization: `Bearer ${token}` }

  const handleCalculate = async () => {
    setIsCalculating(true)
    try {
      const res = await axios.post(
        `${BASE_URL}/v1/vendor/orders/${order._id}/borzo/calculate`,
        {},
        { headers }
      )
      setCalcResult(res.data)
      toast.success('Courier price calculated!')
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to calculate courier price.')
    } finally {
      setIsCalculating(false)
    }
  }

  const handleCreate = async () => {
    setIsCreating(true)
    try {
      const res = await axios.post(
        `${BASE_URL}/v1/vendor/orders/${order._id}/borzo/create`,
        {},
        { headers }
      )
      setLocalBorzo(res.data?.order?.borzo)
      setCalcResult(null)
      toast.success('Delivery request sent to Borzo!')
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to create delivery request.')
    } finally {
      setIsCreating(false)
    }
  }

  const handleCancel = async () => {
    if (!window.confirm('Cancel this Borzo delivery request?')) return
    setIsCancelling(true)
    try {
      await axios.post(
        `${BASE_URL}/v1/vendor/orders/${order._id}/borzo/cancel`,
        {},
        { headers }
      )
      setLocalBorzo((prev) => ({ ...prev, status: 'canceled' }))
      toast.success('Borzo delivery cancelled.')
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to cancel delivery.')
    } finally {
      setIsCancelling(false)
    }
  }

  const address = order.delivery_address
    ? [
        order.delivery_address?.street,
        order.delivery_address?.city,
        order.delivery_address?.state,
        order.delivery_address?.pincode,
      ]
        .filter(Boolean)
        .join(', ')
    : order.customer_address || '—'

  const estimatedCost = calcResult?.response?.order?.payment_amount

  return (
    <div className='overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md'>
      {/* Card Header */}
      <div className='flex items-start justify-between gap-3 p-4'>
        <div className='flex items-start gap-3'>
          <div className='mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100'>
            <Package className='h-4 w-4 text-slate-600' />
          </div>
          <div>
            <p className='text-sm font-semibold text-slate-900'>
              Order #{order._id.slice(-8).toUpperCase()}
            </p>
            <p className='mt-0.5 text-xs text-slate-500'>
              {order.customer_name || 'Customer'} •{' '}
              {order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-IN') : '—'}
            </p>
            <div className='mt-1 flex flex-wrap gap-1.5'>
              <StatusBadge status={order.status} />
              {localBorzo?.status && (
                <>
                  <span className='text-xs text-slate-400'>·</span>
                  <span className='inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-semibold text-violet-700'>
                    <Truck className='h-3 w-3' />
                    Borzo: <StatusBadge status={localBorzo.status} />
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className='flex items-center gap-2'>
          {order.total != null && (
            <span className='rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-700'>
              ₹{order.total.toLocaleString('en-IN')}
            </span>
          )}
          <button
            type='button'
            onClick={() => setExpanded((v) => !v)}
            className='flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 hover:border-slate-400 hover:text-slate-900'
            aria-label={expanded ? 'Collapse' : 'Expand'}
          >
            {expanded ? <ChevronUp className='h-4 w-4' /> : <ChevronDown className='h-4 w-4' />}
          </button>
        </div>
      </div>

      {/* Expandable Body */}
      {expanded && (
        <div className='border-t border-slate-100 p-4'>
          {/* Delivery Address */}
          <div className='mb-4 flex items-start gap-2 rounded-xl bg-slate-50 p-3'>
            <MapPin className='mt-0.5 h-4 w-4 shrink-0 text-slate-500' />
            <div>
              <p className='text-[11px] font-semibold uppercase tracking-wider text-slate-400'>
                Delivery Address
              </p>
              <p className='mt-0.5 text-sm text-slate-700'>{address}</p>
            </div>
          </div>

          {/* Items */}
          {order.items && order.items.length > 0 && (
            <div className='mb-4'>
              <p className='mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400'>
                Items ({order.items.length})
              </p>
              <ul className='space-y-1'>
                {order.items.map((item, idx) => (
                  <li key={idx} className='flex items-center gap-2 text-sm text-slate-700'>
                    <span className='h-1.5 w-1.5 rounded-full bg-slate-400' />
                    {item.product_name || 'Product'} × {item.quantity || 1}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Existing Borzo Info */}
          {localBorzo?.order_id && (
            <div className='mb-4 rounded-xl bg-violet-50 p-3 text-sm'>
              <p className='font-semibold text-violet-800'>Borzo Delivery Active</p>
              <p className='text-xs text-violet-600'>Borzo Order ID: {localBorzo.order_id}</p>
              {localBorzo.status_description && (
                <p className='text-xs text-violet-600'>{localBorzo.status_description}</p>
              )}
              {localBorzo.tracking_url && (
                <a
                  href={localBorzo.tracking_url}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='mt-1 inline-block text-xs font-semibold text-violet-700 underline'
                >
                  Track Shipment →
                </a>
              )}
            </div>
          )}

          {/* Calculated Price Result */}
          {calcResult?.response?.order && (
            <div className='mb-4 rounded-xl border border-green-200 bg-green-50 p-3'>
              <p className='font-semibold text-green-800'>Estimated Courier Price</p>
              {estimatedCost != null && (
                <p className='mt-1 text-2xl font-bold text-green-700'>
                  ₹{estimatedCost}
                </p>
              )}
              {calcResult.response.order.status && (
                <p className='text-xs text-green-600'>
                  Status: {calcResult.response.order.status}
                </p>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className='flex flex-wrap gap-2'>
            {!hasActiveBorzo && (
              <Button
                variant='outline'
                size='sm'
                onClick={handleCalculate}
                disabled={isCalculating}
                className='rounded-full border-slate-300 text-xs'
              >
                <Calculator className='mr-1.5 h-3.5 w-3.5' />
                {isCalculating ? 'Calculating...' : 'Check Courier Prices'}
              </Button>
            )}

            {calcResult && !hasActiveBorzo && (
              <Button
                size='sm'
                onClick={handleCreate}
                disabled={isCreating}
                className='rounded-full bg-violet-600 text-white hover:bg-violet-700 text-xs'
              >
                <Truck className='mr-1.5 h-3.5 w-3.5' />
                {isCreating ? 'Requesting...' : 'Request Pickup'}
              </Button>
            )}

            {hasActiveBorzo && !['canceled', 'cancelled'].includes((localBorzo?.status || '').toLowerCase()) && (
              <Button
                variant='outline'
                size='sm'
                onClick={handleCancel}
                disabled={isCancelling}
                className='rounded-full border-red-200 text-red-600 hover:bg-red-50 text-xs'
              >
                <XCircle className='mr-1.5 h-3.5 w-3.5' />
                {isCancelling ? 'Cancelling...' : 'Cancel Delivery'}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export function CourierDispatch() {
  const token = useSelector((state: RootState) => state.auth?.token)
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    const fetchOrders = async () => {
      setIsLoading(true)
      try {
        const params: Record<string, string> = { limit: '50' }
        if (statusFilter !== 'all') params.status = statusFilter

        const res = await axios.get(`${BASE_URL}/v1/vendor/orders`, {
          params,
          headers: { Authorization: `Bearer ${token}` },
        })
        const data =
          res.data?.orders ||
          res.data?.data ||
          (Array.isArray(res.data) ? res.data : [])
        setOrders(data)
      } catch {
        toast.error('Failed to load orders.')
        setOrders([])
      } finally {
        setIsLoading(false)
      }
    }
    fetchOrders()
  }, [token, statusFilter])

  const statusOptions = [
    { value: 'all', label: 'All Orders' },
    { value: 'pending', label: 'Pending' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'processing', label: 'Processing' },
    { value: 'shipped', label: 'Shipped' },
    { value: 'delivered', label: 'Delivered' },
  ]

  return (
    <div>
      <Header fixed>
        <Search />
        <div className='ms-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>

      <Main className='relative flex flex-1 flex-col gap-5 overflow-x-clip pb-10 font-manrope sm:gap-6'>
        {/* Gradient Background */}
        <div className='pointer-events-none absolute inset-0 -z-10 overflow-hidden'>
          <div className='absolute -left-24 -top-24 h-72 w-72 rounded-full bg-violet-300/20 blur-3xl' />
          <div className='absolute -right-20 top-10 h-96 w-96 rounded-full bg-indigo-300/15 blur-3xl' />
          <div className='absolute bottom-[-7rem] left-1/3 h-80 w-80 rounded-full bg-amber-200/20 blur-3xl' />
        </div>

        {/* Header Section */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className='rounded-3xl border border-violet-200/70 bg-gradient-to-br from-violet-50/75 via-white to-indigo-50/65 p-6 shadow-[0_18px_45px_-30px_rgba(88,28,220,0.3)]'
        >
          <div className='flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between'>
            <div>
              <div className='mb-3 inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white/85 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-700'>
                <Truck className='h-3.5 w-3.5' />
                Courier Hub
              </div>
              <h2 className='text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl'>
                Courier Dispatch
              </h2>
              <p className='mt-1 text-sm text-slate-600 sm:text-base'>
                View your orders, check courier prices, and dispatch deliveries via Borzo.
              </p>
            </div>

            <div className='flex flex-wrap items-center gap-2'>
              <div className='rounded-xl border border-white/80 bg-white/80 px-3 py-2'>
                <div className='text-[11px] uppercase tracking-[0.12em] text-slate-500'>Total Orders</div>
                <div className='text-lg font-bold text-slate-900'>{orders.length}</div>
              </div>
              <div className='rounded-xl border border-white/80 bg-white/80 px-3 py-2'>
                <div className='text-[11px] uppercase tracking-[0.12em] text-slate-500'>Borzo Active</div>
                <div className='text-lg font-bold text-violet-700'>
                  {orders.filter((o) => o.borzo?.order_id && !['canceled', 'cancelled', 'failed'].includes((o.borzo?.status || '').toLowerCase())).length}
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Filter Bar */}
        <section className='rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm backdrop-blur-sm'>
          <div className='flex flex-wrap items-center gap-3'>
            <span className='text-xs font-semibold uppercase tracking-wider text-slate-500'>
              Filter by Status
            </span>
            <div className='flex flex-wrap gap-2'>
              {statusOptions.map((opt) => (
                <button
                  key={opt.value}
                  type='button'
                  onClick={() => setStatusFilter(opt.value)}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition-all ${
                    statusFilter === opt.value
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Orders Grid */}
        {isLoading ? (
          <div className='rounded-2xl border border-slate-200 bg-white/90 px-4 py-16 text-center text-slate-500 shadow-sm'>
            <Truck className='mx-auto mb-3 h-8 w-8 animate-bounce text-slate-300' />
            Loading orders...
          </div>
        ) : orders.length === 0 ? (
          <div className='rounded-2xl border border-slate-200 bg-white/90 px-4 py-16 text-center text-slate-500 shadow-sm'>
            <Package className='mx-auto mb-3 h-8 w-8 text-slate-300' />
            <p className='font-semibold'>No orders found</p>
            <p className='mt-1 text-sm'>Orders will appear here once customers place them.</p>
          </div>
        ) : (
          <section className='space-y-3'>
            <p className='px-1 text-xs font-semibold uppercase tracking-wider text-slate-400'>
              {orders.length} order{orders.length !== 1 ? 's' : ''} shown
            </p>
            <div className='grid gap-3 md:grid-cols-2 xl:grid-cols-3'>
              {orders.map((order) => (
                <OrderCourierCard key={order._id} order={order} token={token} />
              ))}
            </div>
          </section>
        )}
      </Main>
    </div>
  )
}

export default CourierDispatch
