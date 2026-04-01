import { useEffect, useMemo, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { AlertTriangle, ArrowUpRight, CheckCircle2, LoaderCircle, RefreshCcw, Search, XCircle } from 'lucide-react'
import { useSelector } from 'react-redux'
import { toast } from 'sonner'
import { Main } from '@/components/layout/main'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useVendorIntegrations } from '@/context/vendor-integrations-provider'
import { createDelhiveryShipment, createNimbuspostShipment, fetchDelhiveryB2cServiceability, fetchDelhiveryHeavyServiceability, fetchDelhiveryShippingEstimate, fetchNimbuspostRateServiceability, getAssignedCourierForOrder, loadCourierOrders } from '@/features/courier/api'
import { COURIER_PARTNER_MAP, COURIER_PARTNERS, type CourierOrderSummary, type CourierPartnerId } from '@/features/courier/data'
import { formatINR } from '@/lib/currency'
import type { RootState } from '@/store'

export const Route = createFileRoute('/_authenticated/courier/')({ component: CourierWorkspacePage })

type FormState = {
  origin: string
  destination: string
  pickupLocation: string
  paymentType: 'prepaid' | 'cod'
  productType: 'standard' | 'heavy'
  shippingMode: 'surface' | 'express'
  billingStatus: 'Delivered' | 'RTO' | 'DTO'
  packageType: 'box' | 'flyer'
  orderAmount: string
  weight: string
  length: string
  breadth: string
  height: string
  details: string
}

type ResultAction = { kind: 'create-delhivery' | 'create-nimbuspost'; label: string; note: string; payload?: Record<string, unknown> }
type ResultItem = { id: string; title: string; subtitle: string; state: 'ok' | 'bad' | 'warn' | 'off' | 'error'; summary: string; rows: string[]; amount?: string; action?: ResultAction }

const defaultForm: FormState = { origin: '', destination: '', pickupLocation: '', paymentType: 'prepaid', productType: 'standard', shippingMode: 'surface', billingStatus: 'Delivered', packageType: 'box', orderAmount: '1000', weight: '500', length: '10', breadth: '10', height: '10', details: '' }
const errMsg = (error: any, fallback: string) => String(error?.response?.data?.message || error?.message || fallback).trim()
const lines = (items: Array<string | null | undefined>) => items.map((item) => String(item || '').trim()).filter(Boolean)
const isCancelled = (value: unknown) => ['cancelled', 'canceled', 'shipment cancelled'].includes(String(value || '').toLowerCase())
const fillFormFromOrder = (order: CourierOrderSummary, current: FormState): FormState => ({ ...current, destination: order.pincode || current.destination, orderAmount: order.total ? String(Math.round(order.total)) : current.orderAmount, details: order.items.map((item) => item.productName).filter(Boolean).join(', ') || current.details })
const badgeTone = (state: ResultItem['state']) => state === 'ok' ? { label: 'Serviceable', className: 'border-emerald-200 bg-emerald-50 text-emerald-700', Icon: CheckCircle2 } : state === 'bad' ? { label: 'Not Serviceable', className: 'border-rose-200 bg-rose-50 text-rose-700', Icon: XCircle } : state === 'error' ? { label: 'API Error', className: 'border-rose-200 bg-rose-50 text-rose-700', Icon: AlertTriangle } : state === 'warn' ? { label: 'Needs Input', className: 'border-amber-200 bg-amber-50 text-amber-700', Icon: AlertTriangle } : { label: 'Unavailable', className: 'border-slate-200 bg-slate-100 text-slate-700', Icon: AlertTriangle }
const resultPartnerId = (itemId: string): CourierPartnerId => itemId.startsWith('delhivery') ? 'delhivery' : itemId.startsWith('nimbuspost') ? 'nimbuspost' : itemId.startsWith('borzo') ? 'borzo' : 'porter'

function CourierWorkspacePage() {
  const user = useSelector((state: RootState) => state.auth?.user)
  const isVendor = String(user?.role || '').toLowerCase() === 'vendor'
  const { data: integrationsData, refresh: refreshIntegrations } = useVendorIntegrations()
  const [orders, setOrders] = useState<CourierOrderSummary[]>([])
  const [selectedOrderId, setSelectedOrderId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const [checking, setChecking] = useState(false)
  const [busyActionId, setBusyActionId] = useState('')
  const [results, setResults] = useState<ResultItem[]>([])
  const [form, setForm] = useState<FormState>(defaultForm)

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        setError('')
        await refreshIntegrations()
        const nextOrders = await loadCourierOrders(isVendor)
        setOrders(nextOrders)
        setSelectedOrderId((current) => current && nextOrders.some((order) => order.id === current) ? current : nextOrders[0]?.id || '')
        setForm((current) => current.destination || !nextOrders[0] ? current : fillFormFromOrder(nextOrders[0], current))
      } catch (err: any) {
        setError(err?.response?.data?.message || 'Failed to load courier workspace')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [isVendor, refreshIntegrations, refreshKey])

  const selectedOrder = useMemo(() => orders.find((order) => order.id === selectedOrderId) || null, [orders, selectedOrderId])
  const selectedAssignment = useMemo(() => getAssignedCourierForOrder(selectedOrder), [selectedOrder])
  const hasActiveDelhiveryShipment = useMemo(() => Boolean(selectedOrder?.delhivery && (selectedOrder.delhivery.waybill || selectedOrder.delhivery.waybills?.length) && !isCancelled(selectedOrder.delhivery.status)), [selectedOrder])
  const hasActiveNimbuspostShipment = useMemo(() => Boolean(selectedOrder?.nimbuspost && (selectedOrder.nimbuspost.shipment_id || selectedOrder.nimbuspost.awb_number) && !isCancelled(selectedOrder.nimbuspost.status)), [selectedOrder])
  const connectedApps = useMemo(() => ['borzo', 'delhivery', 'nimbuspost'].filter((provider) => Boolean(integrationsData?.providers?.[provider as 'borzo' | 'delhivery' | 'nimbuspost']?.connected)).length, [integrationsData?.providers])
  const serviceableCount = useMemo(() => results.filter((item) => item.state === 'ok').length, [results])

  const applyOrderToForm = (order: CourierOrderSummary | null) => {
    if (!order) return toast.error('Select a target order first')
    setForm((current) => fillFormFromOrder(order, current))
  }

  const runCheck = async () => {
    if (!form.destination.trim()) return toast.error('Destination pincode is required')
    setChecking(true)
    try {
      const [b2c, heavy, delhiveryEstimate, nimbus] = await Promise.allSettled([
        fetchDelhiveryB2cServiceability(form.destination.trim()),
        form.productType === 'heavy' ? fetchDelhiveryHeavyServiceability(form.destination.trim(), 'Heavy') : Promise.resolve(null),
        form.origin.trim()
          ? fetchDelhiveryShippingEstimate({
              md: form.shippingMode === 'express' ? 'E' : 'S',
              cgm: form.weight.trim() || '0',
              o_pin: form.origin.trim(),
              d_pin: form.destination.trim(),
              ss: form.billingStatus,
              pt: form.paymentType === 'cod' ? 'COD' : 'Pre-paid',
              l: form.length.trim() || undefined,
              b: form.breadth.trim() || undefined,
              h: form.height.trim() || undefined,
              ipkg_type: form.packageType,
            })
          : Promise.resolve(null),
        form.origin.trim() ? fetchNimbuspostRateServiceability({ origin: form.origin.trim(), destination: form.destination.trim(), payment_type: form.paymentType, order_amount: form.orderAmount.trim() || '0', weight: form.weight.trim() || '500', length: form.length.trim() || '10', breadth: form.breadth.trim() || '10', height: form.height.trim() || '10' }) : Promise.resolve(null),
      ])

      const delhiveryEstimateAmount = delhiveryEstimate.status === 'fulfilled' && delhiveryEstimate.value
        ? Number(delhiveryEstimate.value?.estimate?.estimated_charge)
        : null
      const delhiveryEstimateRows = delhiveryEstimate.status === 'fulfilled' && delhiveryEstimate.value
        ? lines([
            `Origin: ${delhiveryEstimate.value?.estimate?.origin_pincode || form.origin.trim() || '-'}`,
            `Destination: ${delhiveryEstimate.value?.estimate?.destination_pincode || form.destination.trim() || '-'}`,
            `Chargeable weight: ${delhiveryEstimate.value?.estimate?.chargeable_weight ?? (form.weight.trim() || '0')} gm`,
            `Shipping mode: ${delhiveryEstimate.value?.estimate?.billing_mode === 'E' ? 'Express' : 'Surface'}`,
            `Billing status: ${delhiveryEstimate.value?.estimate?.shipment_status || form.billingStatus}`,
            `Payment type: ${delhiveryEstimate.value?.estimate?.payment_type || (form.paymentType === 'cod' ? 'COD' : 'Pre-paid')}`,
          ])
        : form.origin.trim()
          ? ['Delhivery shipping estimate is unavailable for this request.']
          : ['Origin pincode is required to calculate Delhivery shipping cost.']

      const next: ResultItem[] = []
      if (b2c.status === 'fulfilled') {
        const s = b2c.value?.serviceability || {}
        next.push({ id: 'delhivery-b2c', title: 'Delhivery B2C', subtitle: 'Consignee pincode check', state: s?.serviceable ? 'ok' : 'bad', summary: s?.serviceable ? 'Destination pincode is serviceable.' : s?.is_embargoed ? 'Destination is temporarily NSZ because of embargo.' : 'No serviceable Delhivery B2C record returned.', amount: Number.isFinite(delhiveryEstimateAmount) ? formatINR(Number(delhiveryEstimateAmount)) : undefined, rows: lines([`Pincode: ${s?.requested_pincode || '-'}`, `Matched records: ${s?.code_count ?? 0}`, `Serviceable records: ${s?.serviceable_count ?? 0}`, ...delhiveryEstimateRows]), action: s?.serviceable ? { kind: 'create-delhivery', label: 'Create shipment', note: 'Create a Delhivery shipment for the selected order using the checked parcel details.', payload: { pickup_location: form.pickupLocation.trim() || undefined, shipment_width: form.breadth.trim() || undefined, shipment_height: form.height.trim() || undefined, shipment_length: form.length.trim() || undefined, weight: form.weight.trim() || undefined, products_desc: form.details.trim() || undefined, total_amount: form.orderAmount.trim() || undefined, cod_amount: form.paymentType === 'cod' ? form.orderAmount.trim() || undefined : 0, payment_mode: form.paymentType === 'cod' ? 'COD' : 'Prepaid', shipping_mode: form.shippingMode === 'express' ? 'Express' : 'Surface' } } : undefined })
      } else next.push({ id: 'delhivery-b2c', title: 'Delhivery B2C', subtitle: 'Consignee pincode check', state: 'error', summary: errMsg(b2c.reason, 'Delhivery B2C check failed'), rows: ['Verify Delhivery token and base URL.'] })

      if (form.productType === 'heavy' && heavy.status === 'fulfilled') {
          const s = heavy.value?.serviceability || {}
          next.push({ id: 'delhivery-heavy', title: 'Delhivery Heavy', subtitle: 'Heavy shipment check', state: s?.serviceable ? 'ok' : 'bad', summary: s?.serviceable ? 'Heavy-product delivery is available.' : 'Heavy-product delivery is not available.', amount: Number.isFinite(delhiveryEstimateAmount) ? formatINR(Number(delhiveryEstimateAmount)) : undefined, rows: lines([`Pincode: ${s?.requested_pincode || '-'}`, `Matched records: ${s?.code_count ?? 0}`, Array.isArray(s?.serviceable_payment_types) && s.serviceable_payment_types.length ? `Payment modes: ${s.serviceable_payment_types.join(', ')}` : '', ...delhiveryEstimateRows]), action: s?.serviceable ? { kind: 'create-delhivery', label: 'Create shipment', note: 'Create a Delhivery shipment for the selected order using the heavy-check parcel details.', payload: { pickup_location: form.pickupLocation.trim() || undefined, shipment_width: form.breadth.trim() || undefined, shipment_height: form.height.trim() || undefined, shipment_length: form.length.trim() || undefined, weight: form.weight.trim() || undefined, products_desc: form.details.trim() || undefined, total_amount: form.orderAmount.trim() || undefined, cod_amount: form.paymentType === 'cod' ? form.orderAmount.trim() || undefined : 0, payment_mode: form.paymentType === 'cod' ? 'COD' : 'Prepaid', shipping_mode: form.shippingMode === 'express' ? 'Express' : 'Surface' } } : undefined })
      } else if (form.productType === 'heavy' && heavy.status === 'rejected') next.push({ id: 'delhivery-heavy', title: 'Delhivery Heavy', subtitle: 'Heavy shipment check', state: 'error', summary: errMsg(heavy.reason, 'Delhivery Heavy check failed'), rows: ['Heavy serviceability request did not succeed.'] })

      if (!form.origin.trim()) next.push({ id: 'nimbuspost', title: 'NimbusPost', subtitle: 'Rate and serviceability', state: 'warn', summary: 'Origin pincode is required for NimbusPost.', rows: ['Provide pickup/origin pincode to run this API.'] })
      else if (nimbus.status === 'fulfilled' && nimbus.value) {
        const s = nimbus.value?.serviceability || {}
        const best = s?.best_quote || {}
        next.push({ id: 'nimbuspost', title: 'NimbusPost', subtitle: 'Rate and serviceability', state: s?.serviceable ? 'ok' : 'bad', summary: s?.serviceable ? 'NimbusPost returned serviceable courier options.' : 'NimbusPost did not return any serviceable courier.', amount: Number.isFinite(Number(best?.total_charges)) ? formatINR(Number(best.total_charges)) : undefined, rows: lines([`Origin: ${nimbus.value?.payload?.origin || '-'}`, `Destination: ${nimbus.value?.payload?.destination || '-'}`, `Quotes returned: ${s?.quote_count ?? 0}`, best?.name ? `Best courier: ${best.name}` : '', best?.id ? `Courier id: ${best.id}` : '']), action: s?.serviceable ? { kind: 'create-nimbuspost', label: 'Create shipment', note: 'Use the selected order and the best returned courier to create a NimbusPost shipment.', payload: best?.id ? { courier_id: String(best.id) } : undefined } : undefined })
      } else next.push({ id: 'nimbuspost', title: 'NimbusPost', subtitle: 'Rate and serviceability', state: 'error', summary: errMsg(nimbus.status === 'rejected' ? nimbus.reason : null, 'NimbusPost check failed'), rows: ['Check origin, destination, parcel dimensions, and NimbusPost credentials.'] })

      next.push({ id: 'borzo', title: 'Borzo', subtitle: 'Local dispatch flow', state: 'off', summary: 'Borzo pincode-only serviceability is not exposed in the current backend.', rows: ['Use Borzo full order quote flow with pickup and drop addresses.'] })
      next.push({ id: 'porter', title: 'Porter', subtitle: 'Static partner card', state: 'off', summary: 'Porter does not have a connected serviceability API yet.', rows: ['Keep this as a future integration.'] })
      setResults(next)
    } finally {
      setChecking(false)
    }
  }

  const handleResultAction = async (item: ResultItem) => {
    if (!item.action) return
    if (!selectedOrder) return toast.error('Select a target order first')
    try {
      setBusyActionId(item.id)
      if (item.action.kind === 'create-delhivery') {
        if (hasActiveDelhiveryShipment) {
          return toast.error('Selected order already has an active Delhivery shipment')
        }
        await createDelhiveryShipment(selectedOrder, item.action.payload || {})
        toast.success(`Delhivery shipment created for ${selectedOrder.orderNumber}`)
      } else {
        if (hasActiveNimbuspostShipment) {
          return toast.error('Selected order already has an active NimbusPost shipment')
        }
        await createNimbuspostShipment(selectedOrder, item.action.payload || {})
        toast.success(`NimbusPost shipment created for ${selectedOrder.orderNumber}`)
      }
      setRefreshKey((current) => current + 1)
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to create shipment')
    } finally {
      setBusyActionId('')
    }
  }

  return (
    <Main>
      <div className='space-y-6 p-4 md:p-6'>
        <div className='overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm'>
          <div className='bg-[linear-gradient(135deg,rgba(239,246,255,0.95)_0%,rgba(255,247,237,0.92)_55%,rgba(240,253,250,0.95)_100%)] p-6 md:p-8'>
            <div className='flex flex-wrap items-start justify-between gap-4'>
              <div className='space-y-3'>
                <Badge className='rounded-full border-orange-200 bg-orange-50 px-3 py-1 text-[11px] tracking-[0.2em] text-orange-700 uppercase'>Courier Control</Badge>
                <div className='space-y-2'>
                  <h1 className='text-3xl font-semibold tracking-tight text-slate-950'>Courier workspace</h1>
                  <p className='max-w-3xl text-sm leading-6 text-slate-600 sm:text-base'>Check serviceability by pincode and parcel details, then create shipment where the provider already supports booking.</p>
                </div>
              </div>
              <div className='flex flex-wrap gap-2'>
                <Button variant='outline' className='border-slate-200 bg-white hover:bg-slate-50' onClick={() => { const latest = orders[0]; if (!latest) return toast.error('No recent order available'); setSelectedOrderId(latest.id); applyOrderToForm(latest) }}>Use latest order</Button>
                <Button variant='outline' className='border-slate-200 bg-white hover:bg-slate-50' onClick={() => setRefreshKey((current) => current + 1)}><RefreshCcw className='h-4 w-4' />Refresh workspace</Button>
              </div>
            </div>
            <div className='mt-6 grid gap-3 md:grid-cols-3'>
              <div className='rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm'><p className='text-[11px] tracking-[0.18em] text-slate-500 uppercase'>Live orders</p><p className='mt-1 text-3xl font-semibold text-slate-950'>{orders.length}</p></div>
              <div className='rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm'><p className='text-[11px] tracking-[0.18em] text-slate-500 uppercase'>Connected apps</p><p className='mt-1 text-3xl font-semibold text-slate-950'>{connectedApps}</p></div>
              <div className='rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm'><p className='text-[11px] tracking-[0.18em] text-slate-500 uppercase'>Serviceable APIs</p><p className='mt-1 text-3xl font-semibold text-slate-950'>{serviceableCount}</p></div>
            </div>
          </div>
        </div>

        <Card className='border-slate-200 shadow-sm'>
          <CardHeader><CardTitle className='text-lg'>Courier apps</CardTitle></CardHeader>
          <CardContent className='grid gap-4 sm:grid-cols-2 2xl:grid-cols-4'>
            {COURIER_PARTNERS.map((partner) => {
              const connected = partner.id === 'porter' ? false : Boolean(integrationsData?.providers?.[partner.id as 'borzo' | 'delhivery' | 'nimbuspost']?.connected)
              return <Link key={partner.id} to='/courier/$partner' params={{ partner: partner.id }} className={`group min-w-0 rounded-3xl border p-4 transition hover:-translate-y-0.5 hover:shadow-md ${partner.themeClass}`}><div className='flex min-h-[190px] flex-col justify-between gap-5'><div className='space-y-4'><div className='flex h-14 w-14 items-center justify-center rounded-2xl border border-white bg-white shadow-sm'><img src={partner.imageSrc} alt={partner.title} className='max-h-9 max-w-10 object-contain' /></div><div className='space-y-3'><h3 className='text-lg font-semibold text-slate-950'>{partner.title}</h3><Button type='button' size='sm' variant={connected ? 'default' : 'outline'} className={connected ? 'pointer-events-none h-9 w-full rounded-xl bg-emerald-600 px-3 text-xs font-semibold tracking-[0.14em] text-white uppercase hover:bg-emerald-600' : 'pointer-events-none h-9 w-full rounded-xl border-slate-300 bg-white px-3 text-xs font-semibold tracking-[0.14em] text-slate-700 uppercase hover:bg-white'}>{connected ? 'Connected' : partner.id === 'porter' ? 'Planned' : 'Not Connected'}</Button></div></div><div className='inline-flex items-center gap-1 text-sm font-medium text-slate-900'>Open page<ArrowUpRight className='h-4 w-4 transition group-hover:translate-x-0.5' /></div></div></Link>
            })}
          </CardContent>
        </Card>

        <Card className='border-slate-200 shadow-sm'>
          <CardHeader>
            <CardTitle className='text-lg'>Delivery serviceability checker</CardTitle>
            <CardDescription>Check directly by pincode and parcel details, then use the selected order for shipment creation where supported.</CardDescription>
          </CardHeader>
          <CardContent className='space-y-6'>
            <div className='grid gap-4 lg:grid-cols-2'>
              <div className='space-y-2'>
                <label className='text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase'>Target order</label>
                <select value={selectedOrderId} onChange={(e) => { const nextOrder = orders.find((order) => order.id === e.target.value) || null; setSelectedOrderId(e.target.value); if (nextOrder) applyOrderToForm(nextOrder) }} className='vendor-field flex h-11 w-full rounded-none border bg-transparent px-4 py-2 text-sm shadow-sm outline-none'>
                  <option value=''>No order selected</option>
                  {orders.map((order) => <option key={order.id} value={order.id}>{order.orderNumber} | {order.customerName} | {order.pincode || 'No pincode'}</option>)}
                </select>
              </div>
              <div className='flex flex-wrap items-end gap-3'>
                <Button variant='outline' className='border-slate-200 bg-white hover:bg-slate-50' onClick={() => applyOrderToForm(selectedOrder)}>Use selected order</Button>
                <p className='text-sm text-slate-500'>Shipment creation uses the selected order, not just the checked pincode.</p>
              </div>
            </div>

            <div className='rounded-2xl border border-slate-200 bg-slate-50 p-4'>
              <div className='flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between'>
                <div className='space-y-1'>
                  <p className='text-[11px] tracking-[0.16em] text-slate-500 uppercase'>Selected order snapshot</p>
                  {selectedOrder ? <><p className='text-base font-semibold text-slate-950'>{selectedOrder.orderNumber} | {selectedOrder.customerName}</p><p className='text-sm text-slate-600'>{selectedOrder.pincode || 'No pincode'} | {formatINR(selectedOrder.total)} | {selectedOrder.itemsCount} item(s)</p></> : <p className='text-sm text-slate-600'>Choose an order to enable shipment creation actions.</p>}
                </div>
                <Badge className={selectedAssignment ? 'border-indigo-200 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-slate-700'}>{selectedAssignment ? `${selectedAssignment.partnerName} | ${selectedAssignment.trackingStatus}` : 'No courier assigned'}</Badge>
              </div>
            </div>

            <div className='grid gap-4 lg:grid-cols-2 xl:grid-cols-4'>
              <div className='space-y-2'><label className='text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase'>Origin pincode</label><Input value={form.origin} onChange={(e) => setForm({ ...form, origin: e.target.value })} placeholder='110001' /></div>
              <div className='space-y-2'><label className='text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase'>Destination pincode</label><Input value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} placeholder='194103' /></div>
              <div className='space-y-2'><label className='text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase'>Delhivery pickup location</label><Input value={form.pickupLocation} onChange={(e) => setForm({ ...form, pickupLocation: e.target.value })} placeholder='warehouse_name' /></div>
              <div className='space-y-2'><label className='text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase'>Payment mode</label><select value={form.paymentType} onChange={(e) => setForm({ ...form, paymentType: e.target.value as 'prepaid' | 'cod' })} className='vendor-field flex h-11 w-full rounded-none border bg-transparent px-4 py-2 text-sm shadow-sm outline-none'><option value='prepaid'>Prepaid</option><option value='cod'>COD</option></select></div>
              <div className='space-y-2'><label className='text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase'>Product type</label><select value={form.productType} onChange={(e) => setForm({ ...form, productType: e.target.value as 'standard' | 'heavy' })} className='vendor-field flex h-11 w-full rounded-none border bg-transparent px-4 py-2 text-sm shadow-sm outline-none'><option value='standard'>Standard</option><option value='heavy'>Heavy</option></select></div>
              <div className='space-y-2'><label className='text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase'>Shipping mode</label><select value={form.shippingMode} onChange={(e) => setForm({ ...form, shippingMode: e.target.value as 'surface' | 'express' })} className='vendor-field flex h-11 w-full rounded-none border bg-transparent px-4 py-2 text-sm shadow-sm outline-none'><option value='surface'>Surface</option><option value='express'>Express</option></select></div>
              <div className='space-y-2'><label className='text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase'>Billing status</label><select value={form.billingStatus} onChange={(e) => setForm({ ...form, billingStatus: e.target.value as 'Delivered' | 'RTO' | 'DTO' })} className='vendor-field flex h-11 w-full rounded-none border bg-transparent px-4 py-2 text-sm shadow-sm outline-none'><option value='Delivered'>Delivered</option><option value='RTO'>RTO</option><option value='DTO'>DTO</option></select></div>
              <div className='space-y-2'><label className='text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase'>Package type</label><select value={form.packageType} onChange={(e) => setForm({ ...form, packageType: e.target.value as 'box' | 'flyer' })} className='vendor-field flex h-11 w-full rounded-none border bg-transparent px-4 py-2 text-sm shadow-sm outline-none'><option value='box'>Box</option><option value='flyer'>Flyer</option></select></div>
              <div className='space-y-2'><label className='text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase'>Order amount</label><Input value={form.orderAmount} onChange={(e) => setForm({ ...form, orderAmount: e.target.value })} placeholder='1000' /></div>
              <div className='space-y-2'><label className='text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase'>Weight (grams)</label><Input value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} placeholder='500' /></div>
              <div className='space-y-2'><label className='text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase'>Length (cm)</label><Input value={form.length} onChange={(e) => setForm({ ...form, length: e.target.value })} placeholder='10' /></div>
              <div className='space-y-2'><label className='text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase'>Breadth (cm)</label><Input value={form.breadth} onChange={(e) => setForm({ ...form, breadth: e.target.value })} placeholder='10' /></div>
              <div className='space-y-2'><label className='text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase'>Height (cm)</label><Input value={form.height} onChange={(e) => setForm({ ...form, height: e.target.value })} placeholder='10' /></div>
              <div className='space-y-2 xl:col-span-3'><label className='text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase'>Product details</label><Textarea value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} placeholder='Example: 1 wooden side table, fragile top, heavy base' className='min-h-[88px] rounded-none border-slate-200' /></div>
            </div>

            <div className='flex flex-wrap items-center gap-3'>
              <Button className='rounded-none bg-slate-950 text-white hover:bg-slate-800' disabled={checking} onClick={() => void runCheck()}>{checking ? <LoaderCircle className='h-4 w-4 animate-spin' /> : <Search className='h-4 w-4' />}{checking ? 'Checking APIs' : 'Check delivery availability'}</Button>
              <p className='text-sm text-slate-500'>NimbusPost needs origin plus parcel details. Delhivery estimate also uses origin, shipping mode, billing status, and package type.</p>
            </div>
            {error ? <div className='rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700'>{error}</div> : null}
            {loading ? <div className='rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600'>Loading courier workspace data...</div> : null}
          </CardContent>
        </Card>

        <Card className='border-slate-200 shadow-sm'>
          <CardHeader><CardTitle className='text-lg'>Serviceability results</CardTitle></CardHeader>
          <CardContent>
            {!results.length ? <div className='rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-sm text-slate-600'>Run a pincode check to compare courier availability.</div> : <div className='grid gap-4 xl:grid-cols-2'>{results.map((item) => {
              const tone = badgeTone(item.state)
              const Icon = tone.Icon
              const actionState = !item.action ? null : !selectedOrder ? { disabled: true, label: 'Select target order first', note: 'Choose a target order above, then create the shipment.' } : item.action.kind === 'create-delhivery' && hasActiveDelhiveryShipment ? { disabled: true, label: 'Already assigned to Delhivery', note: selectedOrder.delhivery?.waybill || selectedOrder.delhivery?.waybills?.[0] ? `Existing shipment: ${selectedOrder.delhivery.waybill || selectedOrder.delhivery.waybills?.[0]}` : 'Selected order already has an active Delhivery shipment.' } : item.action.kind === 'create-nimbuspost' && hasActiveNimbuspostShipment ? { disabled: true, label: 'Already assigned to NimbusPost', note: selectedOrder.nimbuspost?.awb_number || selectedOrder.nimbuspost?.shipment_id ? `Existing shipment: ${selectedOrder.nimbuspost.awb_number || selectedOrder.nimbuspost.shipment_id}` : 'Selected order already has an active NimbusPost shipment.' } : { disabled: busyActionId !== '' && busyActionId !== item.id, label: busyActionId === item.id ? 'Creating shipment' : item.action.label, note: item.action.note }
              const partner = COURIER_PARTNER_MAP[resultPartnerId(item.id)]
              return <div key={item.id} className='rounded-3xl border border-slate-200 bg-white p-5 shadow-sm'><div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'><div className='flex items-start gap-4'><div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl border bg-white shadow-sm ${partner.themeClass}`}><img src={partner.imageSrc} alt={partner.title} className='max-h-10 max-w-11 object-contain' /></div><div><p className='text-xl font-semibold text-slate-950'>{item.title}</p><p className='text-sm text-slate-500'>{item.subtitle}</p></div></div><Badge className={tone.className}><Icon className='mr-1 h-3.5 w-3.5' />{tone.label}</Badge></div><div className='mt-4 space-y-3'><div className='rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700'>{item.summary}</div>{item.amount ? <div className='rounded-2xl border border-indigo-200 bg-indigo-50 p-4 text-sm font-medium text-indigo-700'>Best quote {item.amount}</div> : null}<div className='rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700'><p className='text-[11px] tracking-[0.16em] text-slate-500 uppercase'>Details</p><div className='mt-3 space-y-2'>{item.rows.map((row) => <p key={row}>{row}</p>)}</div></div>{actionState ? <div className='rounded-2xl border border-slate-200 bg-slate-50 p-4'><div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'><div><p className='text-[11px] tracking-[0.16em] text-slate-500 uppercase'>Action</p><p className='mt-1 text-sm text-slate-600'>{actionState.note}</p></div><Button className='rounded-none bg-slate-950 text-white hover:bg-slate-800' disabled={actionState.disabled || busyActionId === item.id} onClick={() => void handleResultAction(item)}>{busyActionId === item.id ? <LoaderCircle className='h-4 w-4 animate-spin' /> : null}{actionState.label}</Button></div></div> : null}</div></div>
            })}</div>}
          </CardContent>
        </Card>
      </div>
    </Main>
  )
}
