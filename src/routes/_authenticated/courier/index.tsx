import { useEffect, useMemo, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import type { RootState } from '@/store'
import {
  ArrowUpRight,
  Calculator,
  Clock3,
  MapPin,
  Package2,
  RefreshCcw,
  Truck,
} from 'lucide-react'
import { useSelector } from 'react-redux'
import { toast } from 'sonner'
import api from '@/lib/axios'
import { formatINR } from '@/lib/currency'
import { useVendorIntegrations } from '@/context/vendor-integrations-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Main } from '@/components/layout/main'
import {
  COURIER_PARTNERS,
  estimateCourierQuote,
  getCourierAssignmentForOrder,
  normalizeCourierOrder,
  saveCourierAssignment,
  type CourierOrderSummary,
  type CourierPartnerId,
} from '@/features/courier/data'

export const Route = createFileRoute('/_authenticated/courier/')({
  component: CourierWorkspacePage,
})

function CourierWorkspacePage() {
  const user = useSelector((state: RootState) => state.auth?.user)
  const role = String(user?.role || '').toLowerCase()
  const isVendor = role === 'vendor'
  const { data: integrationsData, refresh: refreshIntegrations } =
    useVendorIntegrations()
  const [orders, setOrders] = useState<CourierOrderSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedOrderId, setSelectedOrderId] = useState('')
  const [savingPartnerId, setSavingPartnerId] =
    useState<CourierPartnerId | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [isOptionsDialogOpen, setIsOptionsDialogOpen] = useState(false)

  const loadOrders = async () => {
    try {
      setLoading(true)
      setError('')
      const params = {
        page: 1,
        limit: 50,
      }

      const orderSources = isVendor
        ? [
            { endpoint: '/vendor/orders', source: 'orders' as const },
            {
              endpoint: '/template-orders',
              source: 'template-orders' as const,
            },
          ]
        : [{ endpoint: '/orders', source: 'orders' as const }]

      const responses = await Promise.allSettled(
        orderSources.map(({ endpoint }) => api.get(endpoint, { params }))
      )

      const nextOrders = responses.flatMap((result, index) => {
        if (result.status !== 'fulfilled') return []

        const source = orderSources[index]?.source || 'orders'
        const rows = Array.isArray(result.value?.data?.orders)
          ? result.value.data.orders
          : []

        return rows
          .map((order: unknown) => normalizeCourierOrder(order, source))
          .filter(Boolean) as CourierOrderSummary[]
      })

      const dedupedOrders = Array.from(
        new Map(nextOrders.map((order) => [order.id, order])).values()
      ).sort((left, right) => {
        const leftTime = new Date(left.createdAt || 0).getTime()
        const rightTime = new Date(right.createdAt || 0).getTime()
        return rightTime - leftTime
      })

      if (
        !dedupedOrders.length &&
        responses.every((result) => result.status === 'rejected')
      ) {
        const firstError = responses.find(
          (result) => result.status === 'rejected'
        )
        throw firstError?.reason
      }

      setOrders(dedupedOrders)
      setSelectedOrderId((current) => {
        if (current && dedupedOrders.some((order) => order.id === current)) {
          return current
        }
        return dedupedOrders[0]?.id || ''
      })
    } catch (err: any) {
      setError(
        err?.response?.data?.message || 'Failed to load courier order workspace'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refreshIntegrations()
    void loadOrders()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVendor, refreshKey])

  const selectedOrder = useMemo(
    () => orders.find((order) => order.id === selectedOrderId) || null,
    [orders, selectedOrderId]
  )

  const assignedCourier = selectedOrder
    ? getCourierAssignmentForOrder(selectedOrder.id)
    : null

  const courierCards = useMemo(
    () =>
      COURIER_PARTNERS.map((partner) => {
        const quote = selectedOrder
          ? estimateCourierQuote(selectedOrder, partner.id)
          : null
        const integrationState =
          partner.id === 'nimbuspost' || partner.id === 'porter'
            ? null
            : integrationsData?.providers?.[partner.id]

        return {
          partner,
          quote,
          connected: Boolean(integrationState?.connected),
          enabled: Boolean(integrationState?.enabled),
        }
      }),
    [integrationsData?.providers, selectedOrder]
  )

  const sortedCourierCards = useMemo(
    () =>
      [...courierCards].sort((left, right) => {
        if (!left.quote && !right.quote) return 0
        if (!left.quote) return 1
        if (!right.quote) return -1
        return left.quote.amount - right.quote.amount
      }),
    [courierCards]
  )

  const cheapestPartnerId = sortedCourierCards[0]?.quote
    ? sortedCourierCards[0].partner.id
    : null

  const totalAssigned = useMemo(
    () =>
      orders.filter((order) => getCourierAssignmentForOrder(order.id)).length,
    [orders]
  )

  const openOptionsDialog = (orderId: string) => {
    setSelectedOrderId(orderId)
    setIsOptionsDialogOpen(true)
  }

  return (
    <Main>
      <div className='space-y-6 p-4 md:p-6'>
        <div className='overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm'>
          <div className='bg-[linear-gradient(135deg,rgba(239,246,255,0.95)_0%,rgba(255,247,237,0.92)_55%,rgba(240,253,250,0.95)_100%)] p-6 md:p-8'>
            <div className='flex flex-wrap items-start justify-between gap-4'>
              <div className='space-y-3'>
                <Badge className='rounded-full border-orange-200 bg-orange-50 px-3 py-1 text-[11px] tracking-[0.2em] text-orange-700 uppercase'>
                  Courier Control
                </Badge>
                <div className='space-y-2'>
                  <h1 className='text-3xl font-semibold tracking-tight text-slate-950'>
                    Courier workspace
                  </h1>
                  <p className='max-w-3xl text-sm leading-6 text-slate-600 sm:text-base'>
                    Compare courier apps, calculate delivery prices, assign the
                    right partner per order, and open each courier&apos;s
                    dedicated request page from one place.
                  </p>
                </div>
              </div>
              <Button
                variant='outline'
                className='border-slate-200 bg-white hover:bg-slate-50'
                onClick={() => setRefreshKey((current) => current + 1)}
              >
                <RefreshCcw className='h-4 w-4' />
                Refresh workspace
              </Button>
            </div>

            <div className='mt-6 grid gap-3 md:grid-cols-3'>
              <div className='rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm'>
                <p className='text-[11px] tracking-[0.18em] text-slate-500 uppercase'>
                  Live orders
                </p>
                <p className='mt-1 text-3xl font-semibold text-slate-950'>
                  {orders.length}
                </p>
              </div>
              <div className='rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm'>
                <p className='text-[11px] tracking-[0.18em] text-slate-500 uppercase'>
                  Assigned requests
                </p>
                <p className='mt-1 text-3xl font-semibold text-slate-950'>
                  {totalAssigned}
                </p>
              </div>
              <div className='rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm'>
                <p className='text-[11px] tracking-[0.18em] text-slate-500 uppercase'>
                  Active apps
                </p>
                <p className='mt-1 text-3xl font-semibold text-slate-950'>
                  {COURIER_PARTNERS.length}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className='space-y-4'>
          <div className='space-y-4'>
            <Card className='border-slate-200 shadow-sm'>
              <CardHeader>
                <CardTitle className='text-lg'>Courier apps</CardTitle>
              </CardHeader>
              <CardContent className='grid gap-4 sm:grid-cols-2 2xl:grid-cols-4'>
                {courierCards.map(({ partner, connected }) => (
                  <Link
                    key={partner.id}
                    to='/courier/$partner'
                    params={{ partner: partner.id }}
                    className={`group min-w-0 rounded-3xl border p-4 transition hover:-translate-y-0.5 hover:shadow-md ${partner.themeClass}`}
                  >
                    <div className='flex min-h-[190px] flex-col justify-between gap-5'>
                      <div className='space-y-4'>
                        <div className='flex h-14 w-14 items-center justify-center rounded-2xl border border-white bg-white shadow-sm'>
                          <img
                            src={partner.imageSrc}
                            alt={partner.title}
                            className='max-h-9 max-w-10 object-contain'
                          />
                        </div>
                        <div className='min-w-0 space-y-3'>
                          <h3 className='text-lg leading-tight font-semibold break-words text-slate-950'>
                            {partner.title}
                          </h3>
                          <Button
                            type='button'
                            size='sm'
                            variant={connected ? 'default' : 'outline'}
                            className={
                              connected
                                ? 'pointer-events-none h-9 w-full rounded-xl bg-emerald-600 px-3 text-xs font-semibold tracking-[0.14em] text-white uppercase hover:bg-emerald-600'
                                : 'pointer-events-none h-9 w-full rounded-xl border-slate-300 bg-white px-3 text-xs font-semibold tracking-[0.14em] text-slate-700 uppercase hover:bg-white'
                            }
                          >
                            {connected ? 'Connected' : 'Not Connected'}
                          </Button>
                        </div>
                      </div>
                      <div className='inline-flex items-center gap-1 text-sm font-medium text-slate-900'>
                        Open page
                        <ArrowUpRight className='h-4 w-4 transition group-hover:translate-x-0.5' />
                      </div>
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>

            <Card className='border-slate-200 shadow-sm'>
              <CardHeader>
                <CardTitle className='text-lg'>Order inbox</CardTitle>
                <CardDescription>
                  Latest purchased orders show here so the vendor can compare
                  courier rates and route the request.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className='py-10 text-sm text-slate-500'>
                    Loading courier orders...
                  </div>
                ) : error ? (
                  <div className='rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700'>
                    {error}
                  </div>
                ) : orders.length === 0 ? (
                  <div className='rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-600'>
                    No recent orders found for courier routing.
                  </div>
                ) : (
                  <div className='overflow-hidden rounded-2xl border border-slate-200'>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Order</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Assigned</TableHead>
                          <TableHead className='text-right'>Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {orders.map((order) => {
                          const assignment = getCourierAssignmentForOrder(
                            order.id
                          )
                          return (
                            <TableRow
                              key={order.id}
                              className={`cursor-pointer ${selectedOrderId === order.id ? 'bg-slate-50' : ''}`}
                              onClick={() => openOptionsDialog(order.id)}
                            >
                              <TableCell>
                                <div className='space-y-1'>
                                  <p className='font-medium text-slate-950'>
                                    {order.orderNumber}
                                  </p>
                                  <p className='text-xs text-slate-500'>
                                    {order.websiteLabel}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className='space-y-1'>
                                  <p className='text-sm font-medium text-slate-900'>
                                    {order.customerName}
                                  </p>
                                  <p className='text-xs text-slate-500'>
                                    {order.city || 'City pending'}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell className='font-medium text-slate-900'>
                                {formatINR(order.total)}
                              </TableCell>
                              <TableCell>
                                {assignment ? (
                                  <Badge className='border-emerald-200 bg-emerald-50 text-emerald-700'>
                                    {assignment.partnerName}
                                  </Badge>
                                ) : (
                                  <Badge className='border-slate-200 bg-slate-100 text-slate-700'>
                                    Unassigned
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className='text-right'>
                                <Button
                                  size='sm'
                                  variant='outline'
                                  className='rounded-xl border-slate-200 bg-white hover:bg-slate-50'
                                  onClick={(event) => {
                                    event.stopPropagation()
                                    openOptionsDialog(order.id)
                                  }}
                                >
                                  <Calculator className='h-4 w-4' />
                                  Open popup
                                </Button>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className='hidden space-y-4 xl:sticky xl:top-6 xl:self-start'>
            <Card className='border-slate-200 shadow-sm'>
              <CardHeader>
                <CardTitle className='flex items-center gap-2 text-lg'>
                  <Calculator className='h-5 w-5 text-indigo-600' />
                  Delivery options
                </CardTitle>
                <CardDescription>
                  Compare partner rates quickly and assign the shipment from one
                  clean panel.
                </CardDescription>
              </CardHeader>
              <CardContent className='space-y-4'>
                {!selectedOrder ? (
                  <div className='rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-600'>
                    Select an order from the inbox to calculate courier prices.
                  </div>
                ) : (
                  <>
                    <div className='rounded-3xl border border-slate-200 bg-[linear-gradient(145deg,rgba(248,250,252,1)_0%,rgba(255,247,237,0.92)_100%)] p-4'>
                      <div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
                        <div>
                          <p className='text-[11px] tracking-[0.18em] text-slate-500 uppercase'>
                            Selected order
                          </p>
                          <p className='mt-1 text-base font-semibold text-slate-950'>
                            {selectedOrder.orderNumber}
                          </p>
                          <p className='mt-1 text-sm text-slate-600'>
                            {selectedOrder.customerName}
                          </p>
                        </div>
                        <div className='space-y-2 text-right'>
                          <Badge className='border-indigo-200 bg-indigo-50 text-indigo-700'>
                            {selectedOrder.itemsCount} items
                          </Badge>
                          <p className='text-sm font-semibold text-slate-950'>
                            {formatINR(selectedOrder.total)}
                          </p>
                        </div>
                      </div>
                      <div className='mt-4 grid gap-2 sm:grid-cols-2'>
                        <div className='rounded-2xl border border-white/80 bg-white/80 p-3 text-sm text-slate-600 shadow-sm'>
                          <div className='flex items-center gap-2 text-xs tracking-[0.14em] text-slate-500 uppercase'>
                            <MapPin className='h-4 w-4 text-slate-400' />
                            Destination
                          </div>
                          <p className='mt-2 leading-6 text-slate-700'>
                            {selectedOrder.address || 'Address not available'}
                          </p>
                        </div>
                        <div className='rounded-2xl border border-white/80 bg-white/80 p-3 text-sm text-slate-600 shadow-sm'>
                          <div className='flex items-center gap-2 text-xs tracking-[0.14em] text-slate-500 uppercase'>
                            <Package2 className='h-4 w-4 text-slate-400' />
                            Dispatch note
                          </div>
                          <p className='mt-2 leading-6 text-slate-700'>
                            {selectedOrder.websiteLabel} /{' '}
                            {selectedOrder.city || 'City pending'}
                          </p>
                        </div>
                        {assignedCourier && (
                          <div className='rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 sm:col-span-2'>
                            Currently routed to {assignedCourier.partnerName} at{' '}
                            {formatINR(assignedCourier.amount)}.
                          </div>
                        )}
                      </div>
                    </div>

                    <div className='space-y-3'>
                      <div className='rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs tracking-[0.16em] text-slate-500 uppercase'>
                        Showing courier options sorted by lowest estimated cost
                      </div>
                      {sortedCourierCards.map(
                        ({ partner, quote, connected }) => {
                          const isAssigned =
                            assignedCourier?.partnerId === partner.id
                          const isCheapest = cheapestPartnerId === partner.id

                          return (
                            <div
                              key={partner.id}
                              className={`overflow-hidden rounded-3xl border bg-white p-4 shadow-sm transition ${isAssigned ? 'border-emerald-300 ring-1 ring-emerald-200' : isCheapest ? 'border-indigo-200 ring-1 ring-indigo-100' : 'border-slate-200'}`}
                            >
                              <div className='flex flex-col gap-4 sm:flex-row sm:items-start'>
                                <div
                                  className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border bg-white shadow-sm ${partner.themeClass}`}
                                >
                                  <img
                                    src={partner.imageSrc}
                                    alt={partner.title}
                                    className='max-h-8 max-w-10 object-contain'
                                  />
                                </div>
                                <div className='min-w-0 flex-1 space-y-3'>
                                  <div className='flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between'>
                                    <div className='min-w-0'>
                                      <p className='text-base font-semibold text-slate-950'>
                                        {partner.title}
                                      </p>
                                      <p className='mt-1 text-sm text-slate-500'>
                                        {connected
                                          ? 'Connected and ready for dispatch'
                                          : partner.live
                                            ? 'Available for manual workflow'
                                            : 'Static listing for future integration'}
                                      </p>
                                    </div>
                                    <div className='flex flex-wrap gap-2'>
                                      {isCheapest && (
                                        <Badge className='border-indigo-200 bg-indigo-50 text-indigo-700'>
                                          Best price
                                        </Badge>
                                      )}
                                      {isAssigned && (
                                        <Badge className='border-emerald-200 bg-emerald-50 text-emerald-700'>
                                          Assigned
                                        </Badge>
                                      )}
                                      <Badge className='border-slate-200 bg-slate-100 text-slate-700'>
                                        {connected
                                          ? 'Integrated'
                                          : partner.live
                                            ? 'Manual ready'
                                            : 'Static app'}
                                      </Badge>
                                    </div>
                                  </div>

                                  {quote && (
                                    <div className='grid gap-3 md:grid-cols-2'>
                                      <div className='min-w-0 rounded-2xl border border-slate-200 bg-slate-50 p-3'>
                                        <p className='text-[11px] tracking-[0.14em] text-slate-500 uppercase'>
                                          Estimated cost
                                        </p>
                                        <p className='mt-2 text-xl font-semibold text-slate-950'>
                                          {formatINR(quote.amount)}
                                        </p>
                                      </div>
                                      <div className='min-w-0 rounded-2xl border border-slate-200 bg-slate-50 p-3'>
                                        <p className='text-[11px] tracking-[0.14em] text-slate-500 uppercase'>
                                          ETA
                                        </p>
                                        <p className='mt-2 flex items-center gap-2 text-xl font-semibold text-slate-950'>
                                          <Clock3 className='h-4 w-4 text-slate-400' />
                                          {quote.etaLabel}
                                        </p>
                                      </div>
                                      <div className='min-w-0 rounded-2xl border border-slate-200 bg-slate-50 p-3 md:col-span-2'>
                                        <p className='text-[11px] tracking-[0.14em] text-slate-500 uppercase'>
                                          Pricing logic
                                        </p>
                                        <p className='mt-2 text-sm leading-6 text-slate-700'>
                                          {quote.calculationLabel}
                                        </p>
                                      </div>
                                    </div>
                                  )}

                                  <div className='flex flex-col gap-2 pt-1 sm:flex-row sm:flex-wrap'>
                                    <Button
                                      size='sm'
                                      className='w-full rounded-xl bg-slate-950 text-white hover:bg-slate-800 sm:w-auto'
                                      disabled={savingPartnerId === partner.id}
                                      onClick={() => {
                                        if (!selectedOrder) return
                                        setSavingPartnerId(partner.id)
                                        saveCourierAssignment(
                                          selectedOrder,
                                          partner.id
                                        )
                                        setSavingPartnerId(null)
                                        toast.success(
                                          `${partner.title} assigned for ${selectedOrder.orderNumber}`
                                        )
                                        setRefreshKey((current) => current + 1)
                                      }}
                                    >
                                      <Truck className='h-4 w-4' />
                                      {savingPartnerId === partner.id
                                        ? 'Assigning'
                                        : 'Assign request'}
                                    </Button>
                                    <Button
                                      size='sm'
                                      variant='outline'
                                      className='w-full rounded-xl border-slate-200 bg-white hover:bg-slate-50 sm:w-auto'
                                      asChild
                                    >
                                      <Link
                                        to='/courier/$partner'
                                        params={{ partner: partner.id }}
                                      >
                                        Open page
                                      </Link>
                                    </Button>
                                    {partner.id === 'borzo' && (
                                      <Button
                                        size='sm'
                                        variant='ghost'
                                        className='w-full rounded-xl text-indigo-700 hover:bg-indigo-50 sm:w-auto'
                                        asChild
                                      >
                                        <Link to='/borzo-report'>
                                          Open Borzo report
                                        </Link>
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        }
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Dialog open={isOptionsDialogOpen} onOpenChange={setIsOptionsDialogOpen}>
        <DialogContent className='max-h-[92vh] w-[min(96vw,1120px)] max-w-[min(96vw,1120px)] overflow-y-auto rounded-none border border-slate-200 p-0 shadow-2xl sm:max-w-[min(96vw,1120px)]'>
          <div className='border-b border-slate-200 bg-[linear-gradient(135deg,rgba(239,246,255,0.95)_0%,rgba(255,247,237,0.92)_55%,rgba(240,253,250,0.95)_100%)] px-6 py-5 sm:px-8'>
            <DialogHeader className='text-left'>
              <DialogTitle className='flex items-center gap-2 text-2xl font-semibold text-slate-950'>
                <Calculator className='h-5 w-5 text-indigo-600' />
                Courier options
              </DialogTitle>
            </DialogHeader>
          </div>

          <div className='space-y-6 px-6 py-6 sm:px-8'>
            {!selectedOrder ? (
              <div className='rounded-none border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-600'>
                Select an order from the inbox to calculate courier prices.
              </div>
            ) : (
              <>
                <div className='rounded-none border border-slate-200 bg-white p-5 shadow-sm'>
                  <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
                    <div className='space-y-2'>
                      <p className='text-[11px] tracking-[0.18em] text-slate-500 uppercase'>
                        Selected order
                      </p>
                      <p className='text-2xl font-semibold text-slate-950'>
                        {selectedOrder.orderNumber}
                      </p>
                      <p className='text-base text-slate-600'>
                        {selectedOrder.customerName}
                      </p>
                    </div>
                    <div className='flex flex-wrap items-center gap-3'>
                      <Badge className='rounded-none border-indigo-200 bg-indigo-50 text-indigo-700'>
                        {selectedOrder.itemsCount} items
                      </Badge>
                      <div className='rounded-none border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-950'>
                        {formatINR(selectedOrder.total)}
                      </div>
                    </div>
                  </div>

                  <div className='mt-5 grid gap-3 md:grid-cols-2'>
                    <div className='rounded-none border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600'>
                      <div className='flex items-center gap-2 text-xs tracking-[0.14em] text-slate-500 uppercase'>
                        <MapPin className='h-4 w-4 text-slate-400' />
                        Destination
                      </div>
                      <p className='mt-3 leading-7 text-slate-700'>
                        {selectedOrder.address || 'Address not available'}
                      </p>
                    </div>
                    <div className='rounded-none border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600'>
                      <div className='flex items-center gap-2 text-xs tracking-[0.14em] text-slate-500 uppercase'>
                        <Package2 className='h-4 w-4 text-slate-400' />
                        Dispatch note
                      </div>
                      <p className='mt-3 leading-7 text-slate-700'>
                        {selectedOrder.websiteLabel} /{' '}
                        {selectedOrder.city || 'City pending'}
                      </p>
                    </div>
                    {assignedCourier && (
                      <div className='rounded-none border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700 md:col-span-2'>
                        Currently routed to {assignedCourier.partnerName} at{' '}
                        {formatINR(assignedCourier.amount)}.
                      </div>
                    )}
                  </div>
                </div>

                <div className='rounded-none border border-slate-200 bg-slate-50 px-4 py-3 text-xs tracking-[0.16em] text-slate-500 uppercase'>
                  Showing courier options sorted by lowest estimated cost
                </div>

                <div className='grid gap-4 xl:grid-cols-2'>
                  {sortedCourierCards.map(({ partner, quote, connected }) => {
                    const isAssigned = assignedCourier?.partnerId === partner.id
                    const isCheapest = cheapestPartnerId === partner.id

                    return (
                      <div
                        key={partner.id}
                        className={`overflow-hidden rounded-none border bg-white p-5 shadow-sm transition ${isAssigned ? 'border-emerald-300 ring-1 ring-emerald-200' : isCheapest ? 'border-indigo-200 ring-1 ring-indigo-100' : 'border-slate-200'}`}
                      >
                        <div className='flex flex-col gap-4'>
                          <div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
                            <div className='flex items-start gap-3'>
                              <div
                                className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-none border bg-white shadow-sm ${partner.themeClass}`}
                              >
                                <img
                                  src={partner.imageSrc}
                                  alt={partner.title}
                                  className='max-h-8 max-w-10 object-contain'
                                />
                              </div>
                              <div className='min-w-0'>
                                <p className='text-xl font-semibold text-slate-950'>
                                  {partner.title}
                                </p>
                                <p className='mt-1 text-sm text-slate-500'>
                                  {connected
                                    ? 'Connected and ready for dispatch'
                                    : partner.live
                                      ? 'Available for manual workflow'
                                      : 'Static listing for future integration'}
                                </p>
                              </div>
                            </div>
                            <div className='flex flex-wrap gap-2'>
                              {isCheapest && (
                                <Badge className='rounded-none border-indigo-200 bg-indigo-50 text-indigo-700'>
                                  Best price
                                </Badge>
                              )}
                              {isAssigned && (
                                <Badge className='rounded-none border-emerald-200 bg-emerald-50 text-emerald-700'>
                                  Assigned
                                </Badge>
                              )}
                              <Badge className='rounded-none border-slate-200 bg-slate-100 text-slate-700'>
                                {connected
                                  ? 'Integrated'
                                  : partner.live
                                    ? 'Manual ready'
                                    : 'Static app'}
                              </Badge>
                            </div>
                          </div>

                          {quote && (
                            <div className='grid gap-3 sm:grid-cols-2'>
                              <div className='rounded-none border border-slate-200 bg-slate-50 p-4'>
                                <p className='text-[11px] tracking-[0.14em] text-slate-500 uppercase'>
                                  Estimated cost
                                </p>
                                <p className='mt-2 text-2xl font-semibold text-slate-950'>
                                  {formatINR(quote.amount)}
                                </p>
                              </div>
                              <div className='rounded-none border border-slate-200 bg-slate-50 p-4'>
                                <p className='text-[11px] tracking-[0.14em] text-slate-500 uppercase'>
                                  ETA
                                </p>
                                <p className='mt-2 flex items-center gap-2 text-2xl font-semibold text-slate-950'>
                                  <Clock3 className='h-4 w-4 text-slate-400' />
                                  {quote.etaLabel}
                                </p>
                              </div>
                              <div className='rounded-none border border-slate-200 bg-slate-50 p-4 sm:col-span-2'>
                                <p className='text-[11px] tracking-[0.14em] text-slate-500 uppercase'>
                                  Pricing logic
                                </p>
                                <p className='mt-2 text-sm leading-6 text-slate-700'>
                                  {quote.calculationLabel}
                                </p>
                              </div>
                            </div>
                          )}

                          <div className='flex flex-col gap-2 pt-1 sm:flex-row sm:flex-wrap'>
                            <Button
                              size='sm'
                              className='w-full rounded-none bg-slate-950 text-white hover:bg-slate-800 sm:w-auto'
                              disabled={savingPartnerId === partner.id}
                              onClick={() => {
                                if (!selectedOrder) return
                                setSavingPartnerId(partner.id)
                                saveCourierAssignment(selectedOrder, partner.id)
                                setSavingPartnerId(null)
                                toast.success(
                                  `${partner.title} assigned for ${selectedOrder.orderNumber}`
                                )
                                setRefreshKey((current) => current + 1)
                                setIsOptionsDialogOpen(false)
                              }}
                            >
                              <Truck className='h-4 w-4' />
                              {savingPartnerId === partner.id
                                ? 'Assigning'
                                : 'Assign request'}
                            </Button>
                            <Button
                              size='sm'
                              variant='outline'
                              className='w-full rounded-none border-slate-200 bg-white hover:bg-slate-50 sm:w-auto'
                              asChild
                            >
                              <Link
                                to='/courier/$partner'
                                params={{ partner: partner.id }}
                              >
                                Open page
                              </Link>
                            </Button>
                            {partner.id === 'borzo' && (
                              <Button
                                size='sm'
                                variant='ghost'
                                className='w-full rounded-none text-indigo-700 hover:bg-indigo-50 sm:w-auto'
                                asChild
                              >
                                <Link to='/borzo-report'>
                                  Open Borzo report
                                </Link>
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Main>
  )
}
