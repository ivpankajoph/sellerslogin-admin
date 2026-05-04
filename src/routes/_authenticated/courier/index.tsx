import { createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  LoaderCircle,
  PackageOpen,
  Search,
  XCircle,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  fetchDelhiveryB2cServiceability,
  fetchDelhiveryWarehouses,
  fetchDelhiveryShippingEstimate,
  fetchShadowfaxServiceability,
  loadCourierOrders,
  type DelhiveryWarehouse,
} from '@/features/courier/api'
import {
  COURIER_PARTNER_MAP,
  estimateCourierQuote,
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
  const [warehouses, setWarehouses] = useState<DelhiveryWarehouse[]>([])
  const [warehousesLoading, setWarehousesLoading] = useState(true)
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(false)
  const [selectedOrderId, setSelectedOrderId] = useState(initialQuery.orderId)
  const [destination, setDestination] = useState(initialQuery.destination)
  const [results, setResults] = useState<CheckResult[]>([])
  const [autoCheckDone, setAutoCheckDone] = useState(false)

  const orderedWarehouses = useMemo(
    () =>
      [...warehouses].sort((a, b) => {
        const aTime = new Date(a.updatedAt || a.createdAt || 0).getTime()
        const bTime = new Date(b.updatedAt || b.createdAt || 0).getTime()
        return bTime - aTime
      }),
    [warehouses]
  )

  const selectedWarehouse = useMemo(
    () =>
      orderedWarehouses.find((warehouse) => warehouse.id === selectedWarehouseId) ||
      orderedWarehouses.find((warehouse) => readText(warehouse.pin)) ||
      null,
    [orderedWarehouses, selectedWarehouseId]
  )

  const warehousePincode = useMemo(
    () => readText(selectedWarehouse?.pin),
    [selectedWarehouse?.pin]
  )

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
  }, [isVendor])

  useEffect(() => {
    let cancelled = false

    const loadWarehouses = async () => {
      try {
        setWarehousesLoading(true)
        const response = await fetchDelhiveryWarehouses()
        if (cancelled) return
        const rows = Array.isArray(response?.warehouses) ? response.warehouses : []
        setWarehouses(rows)
      } catch (err: any) {
        if (cancelled) return
        toast.error(err?.response?.data?.message || 'Failed to load warehouses')
        setWarehouses([])
      } finally {
        if (!cancelled) setWarehousesLoading(false)
      }
    }

    void loadWarehouses()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    setSelectedWarehouseId((current) => {
      if (current && orderedWarehouses.some((warehouse) => warehouse.id === current)) {
        return current
      }
      return orderedWarehouses.find((warehouse) => readText(warehouse.pin))?.id || ''
    })
  }, [orderedWarehouses])

  const selectableOrders = useMemo(
    () => orders.filter((order) => isOpenOrderStatus(order.status)),
    [orders]
  )
  const selectedOrder = useMemo(
    () => selectableOrders.find((order) => order.id === selectedOrderId) || null,
    [selectableOrders, selectedOrderId]
  )
  useEffect(() => {
    setSelectedOrderId((current) =>
      current && selectableOrders.some((order) => order.id === current)
        ? current
        : selectableOrders[0]?.id || ''
    )
  }, [selectableOrders])

  useEffect(() => {
    if (!selectedOrder) return
    setDestination(selectedOrder.pincode || '')
    setResults([])
  }, [selectedOrder])

  const runCheck = async () => {
    const resolvedOrigin = warehousePincode
    const resolvedDestination = readText(selectedOrder?.pincode || destination)

    if (!selectedOrder) return toast.error('Select an order first')
    if (!resolvedDestination) return toast.error('Customer pincode is required')
    if (!selectedWarehouse) return toast.error('Create a warehouse first')
    if (!resolvedOrigin) return toast.error('Warehouse pin is required')

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
        const estimateError =
          delhiveryEstimate.status === 'rejected'
            ? delhiveryEstimate.reason?.response?.data?.message ||
              delhiveryEstimate.reason?.message ||
              'Delhivery price check failed.'
            : ''
        const delhiveryPrice = Number(estimate?.estimated_charge || 0)
        next.push({
          id: 'delhivery',
          title: 'Delhivery',
          state: serviceability?.serviceable
            ? estimateError
              ? 'error'
              : 'ok'
            : 'bad',
          priceLabel: delhiveryPrice
            ? formatINR(delhiveryPrice)
            : estimateError
              ? 'Price unavailable'
              : 'Price not returned',
          summary: estimateError
            ? estimateError
            : serviceability?.serviceable
              ? 'Customer pincode is serviceable on Delhivery.'
              : 'Delhivery did not return a serviceable record for this pincode.',
          rows: [
            `Warehouse: ${selectedWarehouse?.name || 'Selected warehouse'}`,
            `Origin pincode: ${resolvedOrigin}`,
            `Customer pincode: ${serviceability?.requested_pincode || resolvedDestination}`,
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
            ? 'Customer pincode is serviceable on Shadowfax.'
            : 'Shadowfax did not return a serviceable record for this pincode.',
          rows: [
            `Warehouse: ${selectedWarehouse?.name || 'Selected warehouse'}`,
            `Origin pincode: ${resolvedOrigin}`,
            `Customer pincode: ${serviceability?.requested_pincode || resolvedDestination}`,
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
    if (warehousePincode) params.set('origin', warehousePincode)
    const customerPincode = readText(selectedOrder?.pincode || destination)
    if (customerPincode) params.set('destination', customerPincode)
    void navigate({ to: `/courier/${partnerId}${params.toString() ? `?${params.toString()}` : ''}` })
  }

  useEffect(() => {
    if (!initialQuery.orderId && !initialQuery.destination) return
    if (!selectedOrder) return
    if (loading || checking || autoCheckDone) return
    if (!warehousePincode || !readText(selectedOrder.pincode || destination)) return
    setAutoCheckDone(true)
    void runCheck()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOrder, loading, checking, autoCheckDone, warehousePincode, destination])

  return (
    <>
      <div className='space-y-5'>
        <div className='overflow-hidden rounded-none border border-border bg-card p-4 md:p-5'>
          <div className='flex flex-wrap items-start justify-between gap-4'>
            <div className='space-y-2'>
              <h1 className='text-3xl font-semibold tracking-tight text-foreground'>Check Price</h1>
              <p className='max-w-3xl text-sm leading-6 text-muted-foreground'>
                Select an order to check courier app availability by customer pincode.
                Shipment creation happens on the selected courier app page.
              </p>
            </div>
            <Button
              className='rounded-none bg-primary text-primary-foreground hover:bg-primary/90'
              onClick={() => void navigate({ to: '/courier/manual' })}
            >
              <PackageOpen className='h-4 w-4' />
              Create Manual Order
              <ArrowUpRight className='h-4 w-4' />
            </Button>
          </div>
        </div>

        <Card className='border-border bg-card shadow-sm'>
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
                    {order.manualCourier ? 'Manual | ' : ''}{order.orderNumber} | {order.customerName} | {order.pincode || 'No pincode'} | {order.status}
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
            <div className='space-y-2'>
              <label className='text-sm font-medium text-foreground'>Pricing warehouse</label>
              <select
                value={selectedWarehouse?.id || ''}
                onChange={(e) => {
                  setSelectedWarehouseId(e.target.value)
                  setResults([])
                }}
                className='vendor-field flex h-11 w-full rounded-none border bg-transparent px-4 py-2 text-sm shadow-sm outline-none'
                disabled={warehousesLoading || !orderedWarehouses.length}
              >
                <option value=''>
                  {warehousesLoading
                    ? 'Loading warehouses'
                    : orderedWarehouses.length
                      ? 'Select warehouse'
                      : 'No warehouse created'}
                </option>
                {orderedWarehouses.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.name || 'Warehouse'} | {warehouse.pin || 'No pin'}
                  </option>
                ))}
              </select>
              {selectedWarehouse ? (
                <p className='text-sm text-muted-foreground'>
                  Calculating from {selectedWarehouse.name || 'selected warehouse'}
                  {selectedWarehouse.pin ? `, ${selectedWarehouse.pin}` : ''}
                  {selectedWarehouse.address ? ` | ${selectedWarehouse.address}` : ''}
                </p>
              ) : (
                <p className='text-sm text-muted-foreground'>
                  Create a warehouse before checking price.
                </p>
              )}
            </div>
            {selectedOrder ? (
              <div className='grid gap-4 md:grid-cols-4'>
                <div className='rounded-none border border-border bg-muted/30 p-4'>
                  <p className='text-xs font-semibold uppercase text-muted-foreground'>Origin warehouse</p>
                  <p className='mt-2 text-lg font-semibold text-foreground'>
                    {selectedWarehouse?.name || 'Not selected'}
                  </p>
                  <p className='mt-1 text-sm text-muted-foreground'>
                    {selectedWarehouse?.pin || 'No pin'}
                  </p>
                </div>
                <div className='rounded-none border border-border bg-muted/30 p-4'>
                  <p className='text-xs font-semibold uppercase text-muted-foreground'>Customer pincode</p>
                  <p className='mt-2 text-lg font-semibold text-foreground'>
                    {selectedOrder.pincode || 'Not available'}
                  </p>
                </div>
                <div className='rounded-none border border-border bg-muted/30 p-4'>
                  <p className='text-xs font-semibold uppercase text-muted-foreground'>Customer</p>
                  <p className='mt-2 text-lg font-semibold text-foreground'>
                    {selectedOrder.customerName}
                  </p>
                </div>
                <div className='rounded-none border border-border bg-muted/30 p-4'>
                  <p className='text-xs font-semibold uppercase text-muted-foreground'>Order value</p>
                  <p className='mt-2 text-lg font-semibold text-foreground'>
                    {formatINR(selectedOrder.total)}
                  </p>
                </div>
              </div>
            ) : null}

            <div className='flex flex-wrap items-center gap-3'>
              <Button
                className='rounded-none bg-primary text-primary-foreground hover:bg-primary/90'
                disabled={checking || warehousesLoading || !selectedOrder || !selectedWarehouse}
                onClick={() => void runCheck()}
              >
                {checking ? <LoaderCircle className='h-4 w-4 animate-spin' /> : <Search className='h-4 w-4' />}
                {checking ? 'Checking price' : 'Check price'}
              </Button>
              <p className='text-sm text-muted-foreground'>
                Pricing uses the selected warehouse pin as origin.
              </p>
              {!selectedWarehouse && !warehousesLoading ? (
                <Button
                  variant='outline'
                  className='rounded-none'
                  onClick={() => void navigate({ to: '/courier/warehouses' })}
                >
                  Create Warehouse
                  <ArrowUpRight className='h-4 w-4' />
                </Button>
              ) : null}
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
          <CardContent>
            {!results.length ? (
              <div className='rounded-2xl border border-dashed border-border bg-muted/40 p-8 text-sm text-muted-foreground'>
                Select an order to check courier app availability and price.
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
    </>
  )
}
