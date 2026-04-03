import { createFileRoute } from '@tanstack/react-router'
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  LoaderCircle,
  RefreshCcw,
  Search,
  XCircle,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { toast } from 'sonner'
import { Main } from '@/components/layout/main'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  fetchDelhiveryB2cServiceability,
  fetchNimbuspostRateServiceability,
  loadCourierOrders,
} from '@/features/courier/api'
import {
  COURIER_PARTNER_MAP,
  hasAnyActiveCourierAssignment,
  type CourierOrderSummary,
  type CourierPartnerId,
} from '@/features/courier/data'
import type { RootState } from '@/store'

export const Route = createFileRoute('/_authenticated/courier/')({
  component: CourierDeskPage,
})

type CheckResult = {
  id: CourierPartnerId
  title: string
  state: 'ok' | 'bad' | 'warn' | 'error'
  summary: string
  rows: string[]
}

const readText = (value: unknown) => String(value ?? '').trim()

const badgeTone = (state: CheckResult['state']) =>
  state === 'ok'
    ? { label: 'Available', className: 'border-emerald-200 bg-emerald-50 text-emerald-700', Icon: CheckCircle2 }
    : state === 'bad'
      ? { label: 'Unavailable', className: 'border-rose-200 bg-rose-50 text-rose-700', Icon: XCircle }
      : state === 'warn'
        ? { label: 'Needs input', className: 'border-amber-200 bg-amber-50 text-amber-700', Icon: AlertTriangle }
        : { label: 'API error', className: 'border-rose-200 bg-rose-50 text-rose-700', Icon: AlertTriangle }

function CourierDeskPage() {
  const user = useSelector((state: RootState) => state.auth?.user)
  const role = String(user?.role || '').toLowerCase()
  const isVendor = role === 'vendor'
  const [orders, setOrders] = useState<CourierOrderSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const [checking, setChecking] = useState(false)
  const [selectedOrderId, setSelectedOrderId] = useState('')
  const [origin, setOrigin] = useState(
    readText(user?.pincode || user?.pin || user?.postal_code || user?.zip)
  )
  const [destination, setDestination] = useState('')
  const [results, setResults] = useState<CheckResult[]>([])

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
    () => orders.filter((order) => !hasAnyActiveCourierAssignment(order)),
    [orders]
  )
  const routedOrders = useMemo(
    () => orders.filter((order) => hasAnyActiveCourierAssignment(order)),
    [orders]
  )
  const selectedOrder = useMemo(
    () => availableOrders.find((order) => order.id === selectedOrderId) || null,
    [availableOrders, selectedOrderId]
  )

  useEffect(() => {
    setSelectedOrderId((current) =>
      current && availableOrders.some((order) => order.id === current)
        ? current
        : availableOrders[0]?.id || ''
    )
  }, [availableOrders])

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
      const [delhivery, nimbus] = await Promise.allSettled([
        fetchDelhiveryB2cServiceability(resolvedDestination),
        fetchNimbuspostRateServiceability({
          origin: resolvedOrigin,
          destination: resolvedDestination,
          payment_type: 'prepaid',
          order_amount: '1000',
          weight: '500',
          length: '10',
          breadth: '10',
          height: '10',
        }),
      ])

      const next: CheckResult[] = []

      if (delhivery.status === 'fulfilled') {
        const serviceability = delhivery.value?.serviceability || {}
        next.push({
          id: 'delhivery',
          title: 'Delhivery',
          state: serviceability?.serviceable ? 'ok' : 'bad',
          summary: serviceability?.serviceable
            ? 'Destination pincode is serviceable on Delhivery.'
            : 'Delhivery did not return a serviceable record for this pincode.',
          rows: [
            `Origin: ${resolvedOrigin}`,
            `Destination: ${serviceability?.requested_pincode || resolvedDestination}`,
            `Matched records: ${serviceability?.code_count ?? 0}`,
            `Serviceable records: ${serviceability?.serviceable_count ?? 0}`,
          ],
        })
      } else {
        next.push({
          id: 'delhivery',
          title: 'Delhivery',
          state: 'error',
          summary:
            delhivery.reason?.response?.data?.message ||
            delhivery.reason?.message ||
            'Delhivery serviceability check failed.',
          rows: ['Check Delhivery connection and try again.'],
        })
      }

      if (nimbus.status === 'fulfilled') {
        const serviceability = nimbus.value?.serviceability || {}
        const bestQuote = serviceability?.best_quote || {}
        next.push({
          id: 'nimbuspost',
          title: 'NimbusPost',
          state: serviceability?.serviceable ? 'ok' : 'bad',
          summary: serviceability?.serviceable
            ? 'NimbusPost returned available courier options.'
            : 'NimbusPost did not return any serviceable courier for this lane.',
          rows: [
            `Origin: ${resolvedOrigin}`,
            `Destination: ${resolvedDestination}`,
            `Quotes returned: ${serviceability?.quote_count ?? 0}`,
            bestQuote?.name ? `Best courier: ${bestQuote.name}` : 'Best courier: Not available',
          ],
        })
      } else {
        next.push({
          id: 'nimbuspost',
          title: 'NimbusPost',
          state: 'error',
          summary:
            nimbus.reason?.response?.data?.message ||
            nimbus.reason?.message ||
            'NimbusPost serviceability check failed.',
          rows: ['Basic check uses the app default parcel template. Open NimbusPost page for full booking inputs.'],
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
    window.location.assign(`/courier/${partnerId}${params.toString() ? `?${params.toString()}` : ''}`)
  }

  return (
    <Main>
      <div className='space-y-6 p-4 md:p-6'>
        <div className='overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm'>
          <div className='bg-[linear-gradient(135deg,rgba(239,246,255,0.95)_0%,rgba(255,247,237,0.92)_55%,rgba(240,253,250,0.95)_100%)] p-6 md:p-8'>
            <div className='flex flex-wrap items-start justify-between gap-4'>
              <div className='space-y-2'>
                <h1 className='text-3xl font-semibold tracking-tight text-slate-950'>Courier Desk</h1>
                <p className='max-w-3xl text-sm leading-6 text-slate-600'>
                  Check lane availability by origin and destination pincode only. Shipment creation
                  now happens on the courier app page.
                </p>
              </div>
              <div className='flex flex-wrap gap-2'>
                <Button
                  variant='outline'
                  className='border-slate-200 bg-white hover:bg-slate-50'
                  onClick={() => setRefreshKey((current) => current + 1)}
                >
                  <RefreshCcw className='h-4 w-4' />
                  Refresh
                </Button>
                <Button
                  variant='outline'
                  className='border-slate-200 bg-white hover:bg-slate-50'
                  onClick={() => window.location.assign('/courier/list')}
                >
                  Courier List
                  <ArrowUpRight className='h-4 w-4' />
                </Button>
              </div>
            </div>

            <div className='mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4'>
              <div className='rounded-2xl border border-white/80 bg-white/85 p-4 shadow-sm'>
                <p className='text-[11px] uppercase tracking-[0.18em] text-slate-500'>Open orders</p>
                <p className='mt-1 text-3xl font-semibold text-slate-950'>{availableOrders.length}</p>
              </div>
              <div className='rounded-2xl border border-white/80 bg-white/85 p-4 shadow-sm'>
                <p className='text-[11px] uppercase tracking-[0.18em] text-slate-500'>Routed shipments</p>
                <p className='mt-1 text-3xl font-semibold text-slate-950'>{routedOrders.length}</p>
              </div>
              <div className='rounded-2xl border border-white/80 bg-white/85 p-4 shadow-sm'>
                <p className='text-[11px] uppercase tracking-[0.18em] text-slate-500'>Total orders</p>
                <p className='mt-1 text-3xl font-semibold text-slate-950'>{orders.length}</p>
              </div>
              <div className='rounded-2xl border border-white/80 bg-white/85 p-4 shadow-sm'>
                <p className='text-[11px] uppercase tracking-[0.18em] text-slate-500'>Checked apps</p>
                <p className='mt-1 text-3xl font-semibold text-slate-950'>2</p>
              </div>
            </div>
          </div>
        </div>

        <Card className='border-slate-200 shadow-sm'>
          <CardHeader />
          <CardContent className='space-y-6'>
            <div className='space-y-2'>
              <label className='text-sm font-medium text-slate-700'>Order</label>
              <select
                value={selectedOrderId}
                onChange={(e) => setSelectedOrderId(e.target.value)}
                className='vendor-field flex h-11 w-full rounded-none border bg-transparent px-4 py-2 text-sm shadow-sm outline-none'
              >
                <option value=''>
                  {availableOrders.length ? 'Select order' : 'No open orders available'}
                </option>
                {availableOrders.map((order) => (
                  <option key={order.id} value={order.id}>
                    {order.orderNumber} | {order.customerName} | {order.pincode || 'No pincode'}
                  </option>
                ))}
              </select>
              {selectedOrder ? (
                <p className='text-sm text-slate-500'>
                  {selectedOrder.orderNumber} | {selectedOrder.customerName} | {selectedOrder.pincode || 'No pincode'}
                </p>
              ) : (
                <p className='text-sm text-slate-500'>
                  Select an open order to continue on the courier app page.
                </p>
              )}
            </div>
            <div className='grid gap-4 md:grid-cols-2'>
              <div className='space-y-2'>
                <label className='text-sm font-medium text-slate-700'>Origin pincode</label>
                <Input value={origin} onChange={(e) => setOrigin(e.target.value)} placeholder='110001' />
              </div>
              <div className='space-y-2'>
                <label className='text-sm font-medium text-slate-700'>Destination pincode</label>
                <Input value={destination} onChange={(e) => setDestination(e.target.value)} placeholder='201306' />
              </div>
            </div>

            <div className='flex flex-wrap items-center gap-3'>
              <Button
                className='rounded-none bg-slate-950 text-white hover:bg-slate-800'
                disabled={checking}
                onClick={() => void runCheck()}
              >
                {checking ? <LoaderCircle className='h-4 w-4 animate-spin' /> : <Search className='h-4 w-4' />}
                {checking ? 'Checking availability' : 'Check availability'}
              </Button>
              <p className='text-sm text-slate-500'>
                Routed orders are no longer handled here. Open `Courier List` to manage active shipments.
              </p>
            </div>

            {error ? (
              <div className='rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700'>
                {error}
              </div>
            ) : null}

            {loading ? (
              <div className='rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600'>
                Loading courier desk...
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className='border-slate-200 shadow-sm'>
          <CardHeader />
          <CardContent>
            {!results.length ? (
              <div className='rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-sm text-slate-600'>
                Enter origin and destination pincodes to check courier availability.
              </div>
            ) : (
              <div className='grid gap-4 xl:grid-cols-2'>
                {results.map((item) => {
                  const tone = badgeTone(item.state)
                  const Icon = tone.Icon
                  const partner = COURIER_PARTNER_MAP[item.id]

                  return (
                    <div key={item.id} className='rounded-3xl border border-slate-200 bg-white p-5 shadow-sm'>
                      <div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
                        <div className='flex items-start gap-4'>
                          <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl border bg-white shadow-sm ${partner.themeClass}`}>
                            <img src={partner.imageSrc} alt={partner.title} className='max-h-10 max-w-11 object-contain' />
                          </div>
                          <div>
                            <p className='text-xl font-semibold text-slate-950'>{item.title}</p>
                          </div>
                        </div>
                        <Badge className={tone.className}>
                          <Icon className='mr-1 h-3.5 w-3.5' />
                          {tone.label}
                        </Badge>
                      </div>

                      <div className='mt-4 space-y-3'>
                        <div className='rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700'>
                          {item.summary}
                        </div>
                        <div className='rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700'>
                          <div className='space-y-2'>
                            {item.rows.map((row) => (
                              <p key={row}>{row}</p>
                            ))}
                          </div>
                        </div>
                        <div className='rounded-2xl border border-slate-200 bg-slate-50 p-4'>
                          <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
                            <div>
                              <p className='text-sm text-slate-600'>
                                Open {partner.title} page to select an available order, fill that app&apos;s shipment inputs, and create the shipment there.
                              </p>
                            </div>
                            <Button
                              className='rounded-none bg-slate-950 text-white hover:bg-slate-800'
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
    </Main>
  )
}
