import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import {
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  CircleDot,
  ExternalLink,
  MapPin,
  PackageCheck,
  Phone,
  RefreshCcw,
  Sparkles,
  Truck,
  UserRound,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { RootState } from '@/store'
import {
  fetchBorzoOrderDetailsById,
  fetchBorzoReportData,
  formatDate,
  formatMoney,
  formatTime,
  getMapEmbedUrl,
  statusPillClass,
  type BorzoCourier,
  type BorzoOrder,
} from '@/features/borzo-report/shared'

export const Route = createFileRoute('/_authenticated/borzo-report/$orderId')({
  component: BorzoOrderDetailsPage,
})

function BorzoOrderDetailsPage() {
  const { orderId } = Route.useParams()
  const parsedOrderId = Number(orderId)

  const role = useSelector((state: RootState) => state.auth?.user?.role)
  const isVendor = role === 'vendor'

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const [order, setOrder] = useState<BorzoOrder | null>(null)
  const [courier, setCourier] = useState<BorzoCourier | null>(null)

  const loadOrder = async (showLoader = true) => {
    if (!Number.isFinite(parsedOrderId) || parsedOrderId <= 0) {
      setError('Invalid order ID')
      setOrder(null)
      setCourier(null)
      setLoading(false)
      setRefreshing(false)
      return
    }

    try {
      if (showLoader) {
        setLoading(true)
      } else {
        setRefreshing(true)
      }
      setError('')

      const reportData = await fetchBorzoReportData(isVendor)
      const localMatch =
        reportData.orders.find((item) => Number(item.order_id) === parsedOrderId) || null

      if (localMatch) {
        setOrder(localMatch)
        setCourier(localMatch.courier || null)
        setLastUpdated(new Date())
        return
      }

      const remote = await fetchBorzoOrderDetailsById(parsedOrderId, isVendor, reportData.orders)

      if (remote.order || remote.courier) {
        setOrder(
          remote.order || {
            order_id: parsedOrderId,
            status: 'unknown',
            payment_amount: '0',
          },
        )
        setCourier(remote.courier)
        setLastUpdated(new Date())
        return
      }

      setOrder(null)
      setCourier(null)
      setError(
        isVendor
          ? 'Order not found in your delivery reports.'
          : 'Order not found. Please verify the order ID.',
      )
    } catch (err: any) {
      setOrder(null)
      setCourier(null)
      setError(err?.response?.data?.message || 'Failed to load order details')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadOrder(true)
  }, [parsedOrderId, isVendor])

  const trackingUrl = useMemo(() => {
    if (!order?.points?.length) return ''
    const pointWithTracking = order.points.find((point) => Boolean(point?.tracking_url))
    return pointWithTracking?.tracking_url || ''
  }, [order])

  const pickupAddress = order?.points?.[0]?.address || 'N/A'
  const dropAddress = order?.points?.[1]?.address || 'N/A'
  const mapEmbedUrl = getMapEmbedUrl(courier)
  const courierName = courier
    ? [courier.name, courier.surname].filter(Boolean).join(' ') || 'Assigned courier'
    : 'Courier not assigned'
  const courierInitials = courierName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
  const statusBadgeClass = statusPillClass(order?.status)

  return (
    <div className='space-y-5 pb-4'>
      <Card className='relative overflow-hidden border-0 bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-700 text-white shadow-xl shadow-blue-100'>
        <div className='pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/15 blur-3xl' />
        <div className='pointer-events-none absolute -bottom-12 -left-8 h-44 w-44 rounded-full bg-cyan-300/20 blur-3xl' />
        <CardHeader className='relative pb-4'>
          <div className='flex flex-wrap items-start justify-between gap-3'>
            <div className='space-y-2'>
              <Button
                asChild
                variant='ghost'
                size='sm'
                className='-ml-2 w-fit text-white hover:bg-white/15 hover:text-white'
              >
                <Link to='/borzo-report'>
                  <ArrowLeft className='h-4 w-4' />
                  Back to Order List
                </Link>
              </Button>

              <div className='flex flex-wrap items-center gap-2'>
                <span className='inline-flex items-center gap-1 rounded-full border border-white/40 bg-white/20 px-2.5 py-0.5 text-xs font-semibold'>
                  <Sparkles className='h-3.5 w-3.5' />
                  Live Order View
                </span>
                {order?.status && (
                  <span
                    className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusBadgeClass}`}
                  >
                    {order.status}
                  </span>
                )}
              </div>

              <CardTitle className='text-3xl font-bold tracking-tight text-white'>
                Order #{Number.isFinite(parsedOrderId) ? parsedOrderId : 'N/A'}
              </CardTitle>
              <p className='text-sm text-cyan-100'>
                Reference: {order?.order_name || 'Not available'}
              </p>
              <p className='text-xs text-cyan-100/90'>
                Last updated: {lastUpdated ? lastUpdated.toLocaleString() : 'N/A'}
              </p>
            </div>

            <Button
              variant='secondary'
              className='border-white/40 bg-white/20 text-white hover:bg-white/30'
              onClick={() => void loadOrder(false)}
              disabled={loading || refreshing}
            >
              <RefreshCcw className='mr-2 h-4 w-4' />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
        </CardHeader>
        {!loading && !error && order && (
          <CardContent className='relative grid gap-3 pt-0 sm:grid-cols-3'>
            <div className='rounded-xl border border-white/30 bg-white/15 px-3 py-2 backdrop-blur-sm'>
              <p className='text-xs text-cyan-100'>Charge</p>
              <p className='text-xl font-semibold'>{formatMoney(order.payment_amount)}</p>
            </div>
            <div className='rounded-xl border border-white/30 bg-white/15 px-3 py-2 backdrop-blur-sm'>
              <p className='text-xs text-cyan-100'>Created</p>
              <p className='text-xl font-semibold'>{formatDate(order.created_datetime)}</p>
            </div>
            <div className='rounded-xl border border-white/30 bg-white/15 px-3 py-2 backdrop-blur-sm'>
              <p className='text-xs text-cyan-100'>Courier</p>
              <p className='truncate text-xl font-semibold'>{courierName}</p>
            </div>
          </CardContent>
        )}
      </Card>

      {loading && (
        <Card className='border-slate-200 bg-gradient-to-r from-slate-50 to-sky-50'>
          <CardContent className='flex items-center gap-2 py-8 text-sm text-slate-600'>
            <RefreshCcw className='h-4 w-4 animate-spin' />
            Loading order details...
          </CardContent>
        </Card>
      )}

      {!loading && error && (
        <Card className='border-rose-200 bg-gradient-to-r from-rose-50 to-red-50'>
          <CardContent className='flex items-center gap-2 py-6 text-sm text-rose-700'>
            <AlertTriangle className='h-4 w-4' />
            {error}
          </CardContent>
        </Card>
      )}

      {!loading && !error && order && (
        <div className='grid gap-4 xl:grid-cols-[380px,1fr]'>
          <div className='space-y-3'>
            <Card className='border-slate-200 bg-gradient-to-br from-white to-sky-50 shadow-sm'>
              <CardHeader className='pb-2'>
                <CardTitle className='flex items-center gap-2 text-base text-slate-900'>
                  <PackageCheck className='h-4 w-4 text-blue-600' />
                  Order Summary
                </CardTitle>
              </CardHeader>
              <CardContent className='space-y-2 text-sm text-slate-700'>
                <p className='text-xl font-semibold text-slate-900'>#{order.order_id}</p>
                <p className='text-slate-600'>Reference: {order.order_name || 'N/A'}</p>
                <div>
                  <span
                    className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusPillClass(
                      order.status,
                    )}`}
                  >
                    {order.status || 'unknown'}
                  </span>
                </div>
                <p className='inline-flex items-center gap-1 text-slate-600'>
                  <CalendarClock className='h-3.5 w-3.5' />
                  {formatDate(order.created_datetime)} {formatTime(order.created_datetime)}
                </p>
                <p className='text-lg font-semibold text-slate-900'>
                  Charge: {formatMoney(order.payment_amount)}
                </p>
                {trackingUrl && (
                  <a
                    href={trackingUrl}
                    target='_blank'
                    rel='noreferrer'
                    className='inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-blue-700 hover:bg-blue-100'
                  >
                    Open Tracking URL
                    <ExternalLink className='h-3 w-3' />
                  </a>
                )}
              </CardContent>
            </Card>

            <Card className='border-slate-200 bg-gradient-to-br from-white to-emerald-50 shadow-sm'>
              <CardHeader className='pb-2'>
                <CardTitle className='flex items-center gap-2 text-base text-slate-900'>
                  <Truck className='h-4 w-4' />
                  Route
                </CardTitle>
              </CardHeader>
              <CardContent className='space-y-2 text-sm text-slate-700'>
                <div className='rounded-lg border border-emerald-200 bg-emerald-50/60 p-2.5'>
                  <p className='font-semibold text-slate-900'>Pickup</p>
                  <p className='mt-1 inline-flex items-start gap-2'>
                    <CircleDot className='mt-0.5 h-3.5 w-3.5 text-emerald-600' />
                    <span>{pickupAddress}</span>
                  </p>
                </div>
                <div className='rounded-lg border border-cyan-200 bg-cyan-50/70 p-2.5'>
                  <p className='font-semibold text-slate-900'>Drop</p>
                  <p className='mt-1 inline-flex items-start gap-2'>
                    <MapPin className='mt-0.5 h-3.5 w-3.5 text-cyan-600' />
                    <span>{dropAddress}</span>
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className='border-slate-200 bg-gradient-to-br from-white to-indigo-50 shadow-sm'>
              <CardHeader className='pb-2'>
                <CardTitle className='flex items-center gap-2 text-base text-slate-900'>
                  <UserRound className='h-4 w-4' />
                  Courier
                </CardTitle>
              </CardHeader>
              <CardContent className='space-y-1 text-sm text-slate-700'>
                <div className='mb-2 flex items-center gap-2'>
                  <span className='inline-flex h-9 w-9 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white'>
                    {courierInitials || '--'}
                  </span>
                  <p className='font-semibold text-slate-900'>{courierName}</p>
                </div>
                <p className='flex items-center gap-1'>
                  <Phone className='h-3.5 w-3.5' />
                  {courier?.phone || 'N/A'}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className='overflow-hidden border-slate-200 bg-white shadow-sm'>
            <CardHeader className='border-b border-slate-200 bg-gradient-to-r from-slate-50 to-cyan-50 pb-3'>
              <CardTitle className='flex items-center gap-2 text-base text-slate-900'>
                <MapPin className='h-4 w-4' />
                Delivery Map
              </CardTitle>
              <p className='text-xs text-slate-500'>
                Live location if courier coordinates are available; otherwise city-level map.
              </p>
            </CardHeader>
            <CardContent className='p-0'>
              <div className='h-[620px] w-full'>
                <iframe
                  title='Delivery map'
                  src={mapEmbedUrl}
                  className='h-full w-full border-0'
                  loading='lazy'
                  referrerPolicy='no-referrer-when-downgrade'
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
