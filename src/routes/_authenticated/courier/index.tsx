import { createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  LoaderCircle,
  RefreshCcw,
  Search,
  XCircle,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { toast } from 'sonner'
import { StatisticsDialog } from '@/components/data-table/statistics-dialog'
import { Main } from '@/components/layout/main'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  fetchDelhiveryB2cServiceability,
  fetchDelhiveryShippingEstimate,
  fetchShadowfaxServiceability,
  loadCourierOrders,
} from '@/features/courier/api'
import {
  COURIER_PARTNER_MAP,
  estimateCourierQuote,
  hasAnyActiveCourierAssignment,
  type CourierOrderSummary,
  type CourierPartnerId,
} from '@/features/courier/data'
import { formatINR } from '@/lib/currency'
import type { RootState } from '@/store'

export const Route = createFileRoute('/_authenticated/courier/')({
  component: CourierDeskPage,
})

type CheckResult = {
  id: CourierPartnerId
  title: string
  state: 'ok' | 'bad' | 'warn' | 'error'
  summary: string
  priceLabel: string
  rows: string[]
}

const readText = (value: unknown) => String(value ?? '').trim()
const isOpenOrderStatus = (value: unknown) => {
  const status = readText(value).toLowerCase()
  return !['delivered', 'failed', 'cancelled', 'canceled'].includes(status)
}

const badgeTone = (state: CheckResult['state']) =>
  state === 'ok'
    ? { label: 'Available', className: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200', Icon: CheckCircle2 }
    : state === 'bad'
      ? { label: 'Unavailable', className: 'border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-200', Icon: XCircle }
      : state === 'warn'
        ? { label: 'Needs input', className: 'border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-200', Icon: AlertTriangle }
        : { label: 'API error', className: 'border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-200', Icon: AlertTriangle }

function CourierDeskPage() {
  const navigate = useNavigate()
  const user = useSelector((state: RootState) => state.auth?.user)
  const role = String(user?.role || '').toLowerCase()
  const isVendor = role === 'vendor'
  const initialQuery = useMemo(() => {
    if (typeof window === 'undefined') {
      return { orderId: '', origin: '', destination: '' }
    }
    const params = new URLSearchParams(window.location.search)
    return {
      orderId: readText(params.get('orderId')),
      origin: readText(params.get('origin')),
      destination: readText(params.get('destination')),
    }
  }, [])

  useEffect(() => {
    if (user && !isVendor) {
      void navigate({ to: '/' })
    }
  }, [isVendor, navigate, user])

  const [orders, setOrders] = useState<CourierOrderSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const [statsOpen, setStatsOpen] = useState(false)
  const [checking, setChecking] = useState(false)
  const [selectedOrderId, setSelectedOrderId] = useState(initialQuery.orderId)
  const [origin, setOrigin] = useState(
    initialQuery.origin ||
      readText(user?.pincode || user?.pin || user?.postal_code || user?.zip)
  )
  const [destination, setDestination] = useState(initialQuery.destination)
  const [results, setResults] = useState<CheckResult[]>([])
  const [autoCheckDone, setAutoCheckDone] = useState(false)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        setLoading(true)
        setError('')
        const nextOrders = await loadCourierOrders(isVendor)
        if (cancelled) return
        setOrders(nextOrders)
      } catch (err: any) {
        if (cancelled) return
        setError(err?.response?.data?.message || 'Failed to load courier desk')
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [isVendor, refreshKey])

  const availableOrders = useMemo(
    () =>
      orders.filter(
        (order) => isOpenOrderStatus(order.status) && !hasAnyActiveCourierAssignment(order)
      ),
    [orders]
  )
  const routedOrders = useMemo(
    () =>
      orders.filter(
        (order) => isOpenOrderStatus(order.status) && hasAnyActiveCourierAssignment(order)
      ),
    [orders]
  )
  const selectableOrders = useMemo(
    () => orders.filter((order) => isOpenOrderStatus(order.status)),
    [orders]
  )
  const selectedOrder = useMemo(
    () => selectableOrders.find((order) => order.id === selectedOrderId) || null,
    [selectableOrders, selectedOrderId]
  )
  const statsItems = useMemo(
    () => [
      {
        label: 'Open orders',
        value: availableOrders.length,
        helper: 'Orders that are still open and not routed.',
      },
      {
        label: 'Routed shipments',
        value: routedOrders.length,
        helper: 'Open orders with an active courier assignment.',
      },
      {
        label: 'Total orders',
        value: orders.length,
        helper: 'All loaded orders from vendor/admin scope.',
      },
      {
        label: 'Checked apps',
        value: 2,
        helper: 'Checks Delhivery price and Shadowfax serviceability.',
      },
    ],
    [availableOrders.length, orders.length, routedOrders.length]
  )

  useEffect(() => {
    setSelectedOrderId((current) =>
      current && selectableOrders.some((order) => order.id === current)
        ? current
        : selectableOrders[0]?.id || ''
    )
  }, [selectableOrders])

  useEffect(() => {
    if (!selectedOrder?.pincode) return
    setDestination((current) => current || selectedOrder.pincode)
  }, [selectedOrder])

  const runCheck = async () => {
    const resolvedOrigin = origin.trim()
    const resolvedDestination = destination.trim()

    if (!resolvedOrigin) return toast.error('Origin pincode is required')
    if (!resolvedDestination) return toast.error('Destination pincode is required')

    setChecking(true)
    try {
      const [delhivery, delhiveryEstimate, shadowfax] = await Promise.allSettled([
        fetchDelhiveryB2cServiceability(resolvedDestination),
        fetchDelhiveryShippingEstimate({
          md: 'S',
          cgm: '500',
          o_pin: resolvedOrigin,
          d_pin: resolvedDestination,
          ss: 'Delivered',
          pt: 'Pre-paid',
          l: '10',
          b: '10',
          h: '10',
          ipkg_type: 'box',
        }),
        fetchShadowfaxServiceability({
          pincodes: resolvedDestination,
          service: 'customer_delivery',
          page: 1,
          count: 10,
        }),
      ])

      const next: CheckResult[] = []

      if (delhivery.status === 'fulfilled') {
        const serviceability = delhivery.value?.serviceability || {}
        const estimate = delhiveryEstimate.status === 'fulfilled'
          ? delhiveryEstimate.value?.estimate || {}
          : {}
        const delhiveryPrice = Number(estimate?.estimated_charge || 0)
        next.push({
          id: 'delhivery',
          title: 'Delhivery',
          state: serviceability?.serviceable ? 'ok' : 'bad',
          priceLabel: delhiveryPrice ? formatINR(delhiveryPrice) : 'Price not returned',
          summary: serviceability?.serviceable
            ? 'Destination pincode is serviceable on Delhivery.'
            : 'Delhivery did not return a serviceable record for this pincode.',
          rows: [
            `Origin: ${resolvedOrigin}`,
            `Destination: ${serviceability?.requested_pincode || resolvedDestination}`,
            `Matched records: ${serviceability?.code_count ?? 0}`,
            `Serviceable records: ${serviceability?.serviceable_count ?? 0}`,
            `Chargeable weight: ${estimate?.chargeable_weight ?? '500'} gm`,
          ],
        })
      } else {
        next.push({
          id: 'delhivery',
          title: 'Delhivery',
          state: 'error',
          priceLabel: 'Price unavailable',
          summary:
            delhivery.reason?.response?.data?.message ||
            delhivery.reason?.message ||
            'Delhivery serviceability check failed.',
          rows: ['Check Delhivery connection and try again.'],
        })
      }

      if (shadowfax.status === 'fulfilled') {
        const serviceability = shadowfax.value?.serviceability || {}
        const shadowfaxQuote = selectedOrder
          ? estimateCourierQuote(selectedOrder, 'shadowfax')
          : null
        next.push({
          id: 'shadowfax',
          title: 'Shadowfax',
          state: serviceability?.serviceable ? 'ok' : 'bad',
          priceLabel: shadowfaxQuote
            ? `${formatINR(shadowfaxQuote.amount)} est.`
            : 'Estimate after order selection',
          summary: serviceability?.serviceable
            ? 'Destination pincode is serviceable on Shadowfax.'
            : 'Shadowfax did not return a serviceable record for this pincode.',
          rows: [
            `Origin: ${resolvedOrigin}`,
            `Destination: ${serviceability?.requested_pincode || resolvedDestination}`,
            `Matched records: ${serviceability?.code_count ?? 0}`,
            `Serviceable records: ${serviceability?.serviceable_count ?? 0}`,
            shadowfaxQuote ? `ETA: ${shadowfaxQuote.etaLabel}` : 'Select an order for local price estimate.',
          ],
        })
      } else {
        next.push({
          id: 'shadowfax',
          title: 'Shadowfax',
          state: 'error',
          priceLabel: 'Price unavailable',
          summary:
            shadowfax.reason?.response?.data?.message ||
            shadowfax.reason?.message ||
            'Shadowfax serviceability check failed.',
          rows: ['Check Shadowfax connection and try again.'],
        })
      }

      setResults(next)
    } finally {
      setChecking(false)
    }
  }

  const openPartnerPage = (partnerId: CourierPartnerId) => {
    const params = new URLSearchParams()
    if (selectedOrderId) params.set('orderId', selectedOrderId)
    if (origin.trim()) params.set('origin', origin.trim())
    if (destination.trim()) params.set('destination', destination.trim())
    void navigate({ to: `/courier/${partnerId}${params.toString() ? `?${params.toString()}` : ''}` })
  }

  useEffect(() => {
    if (!initialQuery.destination) return
    if (loading || checking || autoCheckDone) return
    if (!origin.trim() || !destination.trim()) return
    setAutoCheckDone(true)
    void runCheck()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery.destination, loading, checking, autoCheckDone, origin, destination])

  return (
    <Main>
      <div className='space-y-6 p-4 md:p-6'>
        <div className='overflow-hidden rounded-none border border-border bg-card p-4 md:p-5'>
          <div className='flex flex-wrap items-start justify-between gap-4'>
            <div className='space-y-2'>
              <h1 className='text-3xl font-semibold tracking-tight text-foreground'>Check Price</h1>
              <p className='max-w-3xl text-sm leading-6 text-muted-foreground'>
                Check delivery app availability and price by origin and destination pincode.
                Shipment creation happens on the selected courier app page.
              </p>
            </div>
            <div className='flex flex-wrap gap-2'>
              <Button variant='outline' onClick={() => setStatsOpen(true)}>
                <BarChart3 className='h-4 w-4' />
                Statistics
              </Button>
              <Button
                variant='outline'
                className='border-border bg-background text-foreground hover:bg-accent hover:text-foreground'
                onClick={() => setRefreshKey((current) => current + 1)}
              >
                <RefreshCcw className='h-4 w-4' />
                Refresh
              </Button>
              <Button
                variant='outline'
                className='border-border bg-background text-foreground hover:bg-accent hover:text-foreground'
                onClick={() => void navigate({ to: '/courier/manual' })}
              >
                Create Manual Order
                <ArrowUpRight className='h-4 w-4' />
              </Button>
              <Button
                variant='outline'
                className='border-border bg-background text-foreground hover:bg-accent hover:text-foreground'
                onClick={() => void navigate({ to: '/courier/list' })}
              >
                Courier List
                <ArrowUpRight className='h-4 w-4' />
              </Button>
            </div>
          </div>
        </div>

        <Card className='border-border bg-card shadow-sm'>
          <CardHeader />
          <CardContent className='space-y-6'>
            <div className='space-y-2'>
              <label className='text-sm font-medium text-foreground'>Order</label>
              <select
                value={selectedOrderId}
                onChange={(e) => setSelectedOrderId(e.target.value)}
                className='vendor-field flex h-11 w-full rounded-none border bg-transparent px-4 py-2 text-sm shadow-sm outline-none'
              >
                <option value=''>
                  {selectableOrders.length ? 'Select order' : 'No open orders available'}
                </option>
                {selectableOrders.map((order) => (
                  <option key={order.id} value={order.id}>
                    {order.orderNumber} | {order.customerName} | {order.pincode || 'No pincode'} | {order.status}
                  </option>
                ))}
              </select>
              {selectedOrder ? (
                <p className='text-sm text-muted-foreground'>
                  {selectedOrder.orderNumber} | {selectedOrder.customerName} | {selectedOrder.pincode || 'No pincode'}
                </p>
              ) : (
                <p className='text-sm text-muted-foreground'>
                  Select an open order to continue on the courier app page.
                </p>
              )}
            </div>
            <div className='grid gap-4 md:grid-cols-2'>
              <div className='space-y-2'>
                <label className='text-sm font-medium text-foreground'>Origin pincode</label>
                <Input value={origin} onChange={(e) => setOrigin(e.target.value)} placeholder='110001' />
              </div>
              <div className='space-y-2'>
                <label className='text-sm font-medium text-foreground'>Destination pincode</label>
                <Input value={destination} onChange={(e) => setDestination(e.target.value)} placeholder='201306' />
              </div>
            </div>

            <div className='flex flex-wrap items-center gap-3'>
              <Button
                className='rounded-none bg-primary text-primary-foreground hover:bg-primary/90'
                disabled={checking}
                onClick={() => void runCheck()}
              >
                {checking ? <LoaderCircle className='h-4 w-4 animate-spin' /> : <Search className='h-4 w-4' />}
                {checking ? 'Checking price' : 'Check price'}
              </Button>
              <p className='text-sm text-muted-foreground'>
                Routed orders are no longer handled here. Open `Courier List` to manage active shipments.
              </p>
            </div>

            {error ? (
              <div className='rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-700 dark:text-rose-200'>
                {error}
              </div>
            ) : null}

            {loading ? (
              <div className='rounded-2xl border border-border bg-muted/40 p-6 text-sm text-muted-foreground'>
                Loading courier desk...
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className='border-border bg-card shadow-sm'>
          <CardHeader />
          <CardContent>
            {!results.length ? (
              <div className='rounded-2xl border border-dashed border-border bg-muted/40 p-8 text-sm text-muted-foreground'>
                Enter origin and destination pincodes to check courier app prices.
              </div>
            ) : (
              <div className='grid gap-4 xl:grid-cols-2'>
                {results.map((item) => {
                  const tone = badgeTone(item.state)
                  const Icon = tone.Icon
                  const partner = COURIER_PARTNER_MAP[item.id]

                  return (
                    <div key={item.id} className='rounded-3xl border border-border bg-card p-5 shadow-sm'>
                      <div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
                        <div className='flex items-start gap-4'>
                          <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl border bg-background shadow-sm ${partner.themeClass}`}>
                            <img src={partner.imageSrc} alt={partner.title} className='max-h-10 max-w-11 object-contain' />
                          </div>
                          <div>
                            <p className='text-xl font-semibold text-foreground'>{item.title}</p>
                            <p className='mt-1 text-2xl font-bold text-foreground'>{item.priceLabel}</p>
                          </div>
                        </div>
                        <Badge className={tone.className}>
                          <Icon className='mr-1 h-3.5 w-3.5' />
                          {tone.label}
                        </Badge>
                      </div>

                      <div className='mt-4 space-y-3'>
                        <div className='rounded-2xl border border-border bg-muted/40 p-4 text-sm leading-6 text-foreground'>
                          {item.summary}
                        </div>
                        <div className='rounded-2xl border border-border bg-background p-4 text-sm text-foreground'>
                          <div className='space-y-2'>
                            {item.rows.map((row) => (
                              <p key={row}>{row}</p>
                            ))}
                          </div>
                        </div>
                        <div className='rounded-2xl border border-border bg-muted/30 p-4'>
                          <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
                            <div>
                              <p className='text-sm text-muted-foreground'>
                                Open {partner.title} page to select an available order, fill that app&apos;s shipment inputs, and create the shipment there.
                              </p>
                            </div>
                            <Button
                              className='rounded-none bg-primary text-primary-foreground hover:bg-primary/90'
                              disabled={!selectedOrder}
                              onClick={() => openPartnerPage(item.id)}
                            >
                              Open {partner.title}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <StatisticsDialog
        open={statsOpen}
        onOpenChange={setStatsOpen}
        title='Courier Desk Statistics'
        description='Current desk summary moved to popup view.'
        items={statsItems}
      />
    </Main>
  )
}
