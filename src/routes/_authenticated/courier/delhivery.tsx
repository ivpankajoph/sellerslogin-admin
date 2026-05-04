import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { BarChart3, CircleHelp, LoaderCircle, RefreshCcw, Search, Warehouse } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { toast } from 'sonner'
import { StatisticsDialog } from '@/components/data-table/statistics-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  createDelhiveryWarehouse,
  createDelhiveryShipment,
  fetchDelhiveryB2cServiceability,
  fetchDelhiveryWarehouses,
  fetchDelhiveryShippingEstimate,
  loadCourierOrders,
  type DelhiveryWarehouse,
} from '@/features/courier/api'
import { type CourierOrderSummary } from '@/features/courier/data'
import {
  resolveVendorProfile,
  resolveVendorProfilePincode,
} from '@/features/courier/vendor-profile'
import { useVendorIntegrations } from '@/context/vendor-integrations-provider'
import { formatINR } from '@/lib/currency'
import type { AppDispatch, RootState } from '@/store'
import { fetchVendorProfile } from '@/store/slices/vendor/profileSlice'

export const Route = createFileRoute('/_authenticated/courier/delhivery')({
  component: DelhiveryCourierPage,
})

const readText = (value: unknown) => String(value ?? '').trim()
const FALLBACK_IMAGE =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
      <rect width="96" height="96" fill="#f1f5f9"/>
      <rect x="14" y="14" width="68" height="68" fill="#e2e8f0" stroke="#cbd5e1" stroke-width="2"/>
      <path d="M26 62l14-17 10 11 8-10 12 12" fill="none" stroke="#94a3b8" stroke-width="3"/>
      <circle cx="35" cy="35" r="5" fill="#94a3b8"/>
    </svg>`
  )

const isOpenOrderStatus = (value: unknown) => {
  const status = readText(value).toLowerCase()
  return !['delivered', 'failed', 'cancelled', 'canceled'].includes(status)
}

type LaneEstimate = {
  serviceable: boolean
  matchedRecords: number
  serviceableRecords: number
  estimatedCharge: number | null
  gstAmount: number | null
  totalWithTax: number | null
  chargeableWeight: string
}

type DelhiveryWarehouseForm = {
  name: string
  registered_name: string
  phone: string
  email: string
  address: string
  city: string
  pin: string
  country: string
  return_address: string
  return_city: string
  return_pin: string
  return_state: string
  return_country: string
}

const toFiniteNumber = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  const text = readText(value)
  if (!text) return null
  const normalized = text.replace(/[^0-9.-]/g, '')
  if (!normalized) return null
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

const isAbsoluteUrl = (value: string) => /^https?:\/\//i.test(value)

const resolveItemImage = (value?: string) => {
  const text = readText(value)
  if (!text) return FALLBACK_IMAGE
  if (text.startsWith('data:') || text.startsWith('blob:')) return text
  if (text.startsWith('//')) return `https:${text}`
  if (isAbsoluteUrl(text)) return text
  if (text.startsWith('/')) return text
  return `/${text}`
}


const pickEstimateAmount = (...sources: unknown[]) => {
  const directKeyCandidates = [
    'estimated_charge',
    'estimated_charges',
    'total_amount',
    'total',
    'grand_total',
    'charges',
    'charge',
    'freight_charge',
    'freight_charges',
    'amount',
    'price',
  ]

  for (const source of sources) {
    const direct = toFiniteNumber(source)
    if (direct != null) return direct
    if (!source || typeof source !== 'object') continue

    const obj = source as Record<string, unknown>
    for (const key of directKeyCandidates) {
      const value = toFiniteNumber(obj?.[key])
      if (value != null) return value
    }

    for (const nested of Object.values(obj)) {
      if (!nested || typeof nested !== 'object') continue
      const nestedObj = nested as Record<string, unknown>
      for (const key of directKeyCandidates) {
        const value = toFiniteNumber(nestedObj?.[key])
        if (value != null) return value
      }
    }
  }

  return null
}

const FieldLabel = ({ label, hint }: { label: string; hint: string }) => (
  <div className='flex items-center gap-2'>
    <label className='text-sm font-medium'>{label}</label>
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type='button'
          className='inline-flex h-5 w-5 items-center justify-center rounded-full border border-border text-muted-foreground hover:bg-muted'
          aria-label={`${label} info`}
        >
          <CircleHelp className='h-3.5 w-3.5' />
        </button>
      </TooltipTrigger>
      <TooltipContent side='top' sideOffset={6}>
        {hint}
      </TooltipContent>
    </Tooltip>
  </div>
)

const uniqueTextList = (values: Array<unknown>) =>
  Array.from(
    new Set(
      values
        .map((value) => readText(value))
        .filter(Boolean)
    )
  )

function DelhiveryCourierPage() {
  const navigate = useNavigate()
  const dispatch = useDispatch<AppDispatch>()
  const user = useSelector((state: RootState) => state.auth?.user)
  const vendorProfileState = useSelector((state: RootState) => state.vendorprofile)
  const vendorProfile = useMemo(
    () => resolveVendorProfile(vendorProfileState),
    [vendorProfileState]
  )
  const role = String(user?.role || '').toLowerCase()
  const isVendor = role === 'vendor'
  const { data: integrationsData } = useVendorIntegrations()

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

  useEffect(() => {
    if (!isVendor || vendorProfile || vendorProfileState?.loading) return
    void dispatch(fetchVendorProfile())
  }, [dispatch, isVendor, vendorProfile, vendorProfileState?.loading])

  const [orders, setOrders] = useState<CourierOrderSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const [statsOpen, setStatsOpen] = useState(false)

  const [selectedOrderId, setSelectedOrderId] = useState(initialQuery.orderId)
  const [origin, setOrigin] = useState(initialQuery.origin)
  const [destination, setDestination] = useState(initialQuery.destination)
  const [pickupLocation, setPickupLocation] = useState('')
  const [paymentMode, setPaymentMode] = useState<'Pre-paid' | 'COD'>('Pre-paid')
  const [shippingMode, setShippingMode] = useState<'S' | 'E'>('S')
  const [weight, setWeight] = useState('500')
  const [length, setLength] = useState('10')
  const [breadth, setBreadth] = useState('10')
  const [height, setHeight] = useState('10')

  const [estimate, setEstimate] = useState<LaneEstimate | null>(null)
  const [priceDialogOpen, setPriceDialogOpen] = useState(false)
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  const [checkingEstimate, setCheckingEstimate] = useState(false)
  const [creatingShipment, setCreatingShipment] = useState(false)
  const [warehouseDialogOpen, setWarehouseDialogOpen] = useState(false)
  const [warehouseWarningOpen, setWarehouseWarningOpen] = useState(false)
  const [creatingWarehouse, setCreatingWarehouse] = useState(false)
  const [warehousesLoading, setWarehousesLoading] = useState(false)
  const [warehouses, setWarehouses] = useState<DelhiveryWarehouse[]>([])
  const [warehouseForm, setWarehouseForm] = useState<DelhiveryWarehouseForm>({
    name: '',
    registered_name: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    pin: '',
    country: 'India',
    return_address: '',
    return_city: '',
    return_pin: '',
    return_state: '',
    return_country: 'India',
  })

  useEffect(() => {
    setPickupLocation((current) =>
      current ||
      readText(integrationsData?.providers?.delhivery?.config?.pickup_location)
    )
  }, [integrationsData?.providers?.delhivery?.config?.pickup_location])

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        setLoading(true)
        setError('')
        const rows = await loadCourierOrders(isVendor)
        if (cancelled) return
        setOrders(rows)
      } catch (err: any) {
        if (cancelled) return
        setError(err?.response?.data?.message || 'Failed to load Delhivery orders')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [isVendor, refreshKey])

  const openOrders = useMemo(
    () => orders.filter((order) => isOpenOrderStatus(order.status)),
    [orders]
  )

  useEffect(() => {
    let cancelled = false
    const loadWarehouses = async () => {
      try {
        setWarehousesLoading(true)
        const response = await fetchDelhiveryWarehouses()
        if (cancelled) return
        const rows = Array.isArray(response?.warehouses) ? response.warehouses : []
        setWarehouses(rows)
        if (!rows.length) {
          setWarehouseWarningOpen(true)
          return
        }
        setPickupLocation((current) => current || readText(rows[0]?.name))
      } catch (err: any) {
        if (cancelled) return
        setWarehouses([])
        setWarehouseWarningOpen(true)
        toast.error(err?.response?.data?.message || 'Failed to load warehouses')
      } finally {
        if (!cancelled) setWarehousesLoading(false)
      }
    }

    void loadWarehouses()
    return () => {
      cancelled = true
    }
  }, [refreshKey])

  const pickupLocationOptions = useMemo(
    () => uniqueTextList(warehouses.map((warehouse) => warehouse?.name)),
    [warehouses]
  )

  const hasWarehouse = pickupLocationOptions.length > 0

  useEffect(() => {
    if (!hasWarehouse) return
    setPickupLocation((current) =>
      current && pickupLocationOptions.includes(current)
        ? current
        : pickupLocationOptions[0] || ''
    )
  }, [hasWarehouse, pickupLocationOptions])

  const selectedOrder = useMemo(
    () => openOrders.find((order) => order.id === selectedOrderId) || null,
    [openOrders, selectedOrderId]
  )

  const selectedWarehouse = useMemo(
    () =>
      warehouses.find(
        (warehouse) => readText(warehouse?.name) === readText(pickupLocation)
      ) || null,
    [pickupLocation, warehouses]
  )

  useEffect(() => {
    setSelectedOrderId((current) => {
      if (current && openOrders.some((order) => order.id === current)) return current
      if (
        initialQuery.orderId &&
        openOrders.some((order) => order.id === initialQuery.orderId)
      ) {
        return initialQuery.orderId
      }
      return ''
    })
  }, [initialQuery.orderId, openOrders])

  useEffect(() => {
    if (!selectedOrder) return
    const method = readText((selectedOrder as any)?.payment_method).toLowerCase()
    setPaymentMode(method === 'cod' ? 'COD' : 'Pre-paid')
  }, [selectedOrder])

  useEffect(() => {
    if (!selectedOrder) return

    const fallbackOrigin =
      readText(selectedWarehouse?.pin) ||
      readText(initialQuery.origin) ||
      resolveVendorProfilePincode(user, vendorProfile)
    const fallbackDestination =
      readText(initialQuery.destination) || readText(selectedOrder?.pincode)

    if (fallbackOrigin) setOrigin(fallbackOrigin)
    if (fallbackDestination) setDestination(fallbackDestination)
  }, [
    initialQuery.destination,
    initialQuery.origin,
    selectedOrder,
    selectedWarehouse?.pin,
    user,
    vendorProfile,
  ])

  const buildCreatePayload = useCallback((order: CourierOrderSummary) => {
    const orderAmount = String(Math.round(Number(order.total || 0)))
    const details = order.items
      .map((item) => readText(item.productName))
      .filter(Boolean)
      .join(', ')

    return {
      pickup_location: readText(pickupLocation) || undefined,
      shipment_width: readText(breadth) || undefined,
      shipment_height: readText(height) || undefined,
      shipment_length: readText(length) || undefined,
      weight: readText(weight) || undefined,
      products_desc: details || undefined,
      total_amount: orderAmount,
      cod_amount: paymentMode === 'COD' ? orderAmount : 0,
      payment_mode: paymentMode === 'COD' ? 'COD' : 'Prepaid',
      shipping_mode: shippingMode === 'E' ? 'Express' : 'Surface',
    }
  }, [breadth, height, length, paymentMode, pickupLocation, shippingMode, weight])

  const checkLaneAndEstimate = useCallback(async () => {
    if (!selectedOrder) return
    if (!hasWarehouse) {
      setWarehouseWarningOpen(true)
      return
    }
    if (!readText(pickupLocation)) {
      toast.error('Select pickup location')
      return
    }

    const resolvedOrigin = readText(origin)
    const resolvedDestination = readText(destination || selectedOrder.pincode)

    if (!resolvedOrigin) {
      toast.error('Origin pincode is required')
      return
    }
    if (!resolvedDestination) {
      toast.error('Destination pincode is required')
      return
    }

    setCheckingEstimate(true)
    try {
      const [serviceabilityRes, estimateRes] = await Promise.all([
        fetchDelhiveryB2cServiceability(resolvedDestination),
        fetchDelhiveryShippingEstimate({
          md: shippingMode,
          cgm: readText(weight) || '0',
          o_pin: resolvedOrigin,
          d_pin: resolvedDestination,
          ss: 'Delivered',
          pt: paymentMode,
          l: readText(length) || undefined,
          b: readText(breadth) || undefined,
          h: readText(height) || undefined,
          ipkg_type: 'box',
        }),
      ])

      const serviceability = serviceabilityRes?.serviceability || {}
      const estimatePayload = estimateRes?.estimate || {}
      const estimateBreakdown = estimatePayload?.breakdown || {}
      const rawResponse = estimateRes?.response || estimateRes
      const estimatedCharge = toFiniteNumber(
        pickEstimateAmount(
          estimatePayload,
          estimateBreakdown,
          rawResponse,
          estimateRes?.data,
          estimateRes
        )
      )
      const gstAmount = toFiniteNumber(
        pickEstimateAmount(
          estimateBreakdown?.gst,
          estimateBreakdown?.tax,
          estimateBreakdown?.igst,
          estimateBreakdown?.cgst,
          estimateBreakdown?.sgst,
          estimateBreakdown
        )
      )
      const totalWithTax = toFiniteNumber(
        pickEstimateAmount(
          estimateBreakdown?.total_with_tax,
          estimateBreakdown?.total,
          estimateBreakdown?.grand_total,
          rawResponse
        )
      )

      setEstimate({
        serviceable: Boolean(serviceability?.serviceable),
        matchedRecords: Number(serviceability?.code_count || 0),
        serviceableRecords: Number(serviceability?.serviceable_count || 0),
        estimatedCharge,
        gstAmount,
        totalWithTax,
        chargeableWeight: readText(estimatePayload?.chargeable_weight || weight),
      })
      setPriceDialogOpen(true)
    } catch (err: any) {
      setEstimate(null)
      toast.error(err?.response?.data?.message || 'Failed to calculate Delhivery estimate')
    } finally {
      setCheckingEstimate(false)
    }
  }, [breadth, destination, hasWarehouse, height, length, origin, paymentMode, pickupLocation, selectedOrder, shippingMode, weight])

  const handleCreateShipment = useCallback(async () => {
    if (!selectedOrder) {
      toast.error('Select an order first')
      return
    }
    if (!estimate?.serviceable) {
      toast.error('Lane is not serviceable yet. Check lane first.')
      return
    }

    try {
      setCreatingShipment(true)
      const payload = buildCreatePayload(selectedOrder)

      const result = await createDelhiveryShipment(selectedOrder, payload)
      const waybill =
        readText(result?.shipment?.waybill) ||
        (Array.isArray(result?.shipment?.waybills)
          ? readText(result.shipment.waybills[0])
          : '')

      if (!waybill) {
        throw new Error(
          readText(result?.shipment?.status_description) ||
            readText(result?.shipment?.status) ||
            'Delhivery did not return a valid waybill'
        )
      }

      toast.success(`Shipment created for ${selectedOrder.orderNumber} (${waybill})`)
      setRefreshKey((current) => current + 1)
      setConfirmDialogOpen(false)
      setPriceDialogOpen(false)
      window.location.assign('/courier/list')
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to create shipment')
    } finally {
      setCreatingShipment(false)
    }
  }, [buildCreatePayload, estimate?.serviceable, selectedOrder])

  const handleCreateWarehouse = useCallback(async () => {
    if (!readText(warehouseForm.name)) return toast.error('Warehouse name is required')
    if (!readText(warehouseForm.phone)) return toast.error('Warehouse phone is required')
    if (!readText(warehouseForm.pin)) return toast.error('Warehouse pin is required')
    if (!readText(warehouseForm.return_address)) return toast.error('Return address is required')

    try {
      setCreatingWarehouse(true)
      const response = await createDelhiveryWarehouse({
        ...warehouseForm,
        name: readText(warehouseForm.name),
        registered_name: readText(warehouseForm.registered_name),
        phone: readText(warehouseForm.phone),
        email: readText(warehouseForm.email),
        address: readText(warehouseForm.address),
        city: readText(warehouseForm.city),
        pin: readText(warehouseForm.pin),
        country: readText(warehouseForm.country) || 'India',
        return_address: readText(warehouseForm.return_address),
        return_city: readText(warehouseForm.return_city),
        return_pin: readText(warehouseForm.return_pin),
        return_state: readText(warehouseForm.return_state),
        return_country: readText(warehouseForm.return_country) || 'India',
      })

      const nextPickupLocation = readText(
        response?.pickup_location || response?.warehouse?.name || warehouseForm.name
      )
      if (nextPickupLocation) {
        setPickupLocation(nextPickupLocation)
        setWarehouseWarningOpen(false)
      }
      setRefreshKey((current) => current + 1)

      toast.success(nextPickupLocation ? `Warehouse created: ${nextPickupLocation}` : 'Warehouse created')
      setWarehouseDialogOpen(false)
      setWarehouseForm((current) => ({
        ...current,
        name: '',
        registered_name: '',
        address: '',
        city: '',
        pin: '',
        return_address: '',
        return_city: '',
        return_pin: '',
        return_state: '',
      }))
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to create Delhivery warehouse')
    } finally {
      setCreatingWarehouse(false)
    }
  }, [warehouseForm])

  const statsItems = useMemo(
    () => [
      {
        label: 'Open Orders',
        value: openOrders.length,
        helper: 'All non-delivered and non-failed orders.',
      },
      {
        label: 'Confirmed',
        value: openOrders.filter((order) => readText(order.status).toLowerCase() === 'confirmed').length,
        helper: 'Orders received and ready for shipment.',
      },
      {
        label: 'Pending',
        value: openOrders.filter((order) => readText(order.status).toLowerCase() === 'pending').length,
        helper: 'Orders still pending processing.',
      },
    ],
    [openOrders]
  )

  return (
    <>
      <div className='space-y-5'>
        {error ? (
          <div className='rounded-none border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700'>
            {error}
          </div>
        ) : null}
        {loading ? (
          <div className='rounded-none border border-border bg-muted/40 p-3 text-sm text-muted-foreground'>
            Loading orders...
          </div>
        ) : null}
        <div className='overflow-hidden rounded-none border border-border bg-card p-4 md:p-5'>
          <div className='flex flex-wrap items-center justify-between gap-3'>
            <h1 className='text-xl font-semibold tracking-tight text-foreground md:text-2xl'>
              Create Shipment
            </h1>
            <div className='flex flex-wrap items-center gap-3'>
              <Button variant='outline' onClick={() => setWarehouseDialogOpen(true)}>
                <Warehouse className='h-4 w-4' />
                Create Warehouse
              </Button>
              <Button variant='outline' onClick={() => window.location.assign('/courier/warehouses')}>
                Manage Warehouses
              </Button>
              <Button variant='outline' onClick={() => setStatsOpen(true)}>
                <BarChart3 className='h-4 w-4' />
                Statistics
              </Button>
              <Button variant='outline' onClick={() => setRefreshKey((current) => current + 1)}>
                <RefreshCcw className='h-4 w-4' />
                Refresh
              </Button>
            </div>
            <Button variant='outline' onClick={() => window.location.assign('/courier/list')}>
              Courier List
            </Button>
          </div>
        </div>

        {!selectedOrder ? (
          <div className='rounded-none border border-dashed bg-card p-6'>
            <h2 className='text-lg font-semibold text-foreground'>No order selected</h2>
            <p className='mt-2 text-sm text-muted-foreground'>
              Select an order first from Order List, then come back to create shipment on Delhivery.
            </p>
            <div className='mt-4'>
              <Button
                variant='outline'
                onClick={() => window.location.assign('/template-orders')}
              >
                Go to Website Orders
              </Button>
            </div>
          </div>
        ) : (
        <div className='rounded-none border bg-card p-4 md:p-5'>
          <div className='grid gap-3 lg:grid-cols-4'>
            <div className='space-y-2'>
              <FieldLabel label='Origin pincode' hint='Pickup warehouse pincode registered in Delhivery.' />
              <Input value={origin} onChange={(e) => setOrigin(e.target.value)} placeholder='110001' />
            </div>
            <div className='space-y-2'>
              <FieldLabel label='Destination pincode' hint='Customer delivery pincode for lane check.' />
              <Input
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder='201306'
              />
            </div>
            <div className='space-y-2'>
              <FieldLabel label='Pickup location' hint='Exact Delhivery pickup location code/name.' />
              <select
                value={pickupLocation}
                onChange={(e) => {
                  const value = e.target.value
                  if (value === '__create__') {
                    setWarehouseDialogOpen(true)
                    return
                  }
                  setPickupLocation(value)
                }}
                className='vendor-field flex h-11 w-full rounded-none border bg-transparent px-4 py-2 text-sm shadow-sm outline-none'
              >
                <option value=''>
                  {hasWarehouse ? 'Select pickup location' : 'No warehouse found'}
                </option>
                {pickupLocationOptions.map((location) => (
                  <option key={location} value={location}>
                    {location}
                  </option>
                ))}
                <option value='__create__'>+ Create warehouse</option>
              </select>
              {!hasWarehouse ? (
                <p className='text-xs text-amber-700'>
                  No warehouse found. Create warehouse first to enable price check.
                </p>
              ) : warehousesLoading ? (
                <p className='text-xs text-muted-foreground'>Loading warehouses...</p>
              ) : null}
            </div>
            <div className='space-y-2'>
              <FieldLabel label='Payment mode' hint='Use COD only when order is Cash on Delivery.' />
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value as 'Pre-paid' | 'COD')}
                className='vendor-field flex h-11 w-full rounded-none border bg-transparent px-4 py-2 text-sm shadow-sm outline-none'
              >
                <option value='Pre-paid'>Pre-paid</option>
                <option value='COD'>COD</option>
              </select>
            </div>
          </div>

          <div className='mt-3 grid gap-3 md:grid-cols-4'>
            <div className='space-y-2'>
              <FieldLabel label='Weight (gm)' hint='Actual shipment dead weight in grams.' />
              <Input value={weight} onChange={(e) => setWeight(e.target.value)} placeholder='500' />
            </div>
            <div className='space-y-2'>
              <FieldLabel label='Length (cm)' hint='Package length in centimeters.' />
              <Input value={length} onChange={(e) => setLength(e.target.value)} placeholder='10' />
            </div>
            <div className='space-y-2'>
              <FieldLabel label='Breadth (cm)' hint='Package width in centimeters.' />
              <Input value={breadth} onChange={(e) => setBreadth(e.target.value)} placeholder='10' />
            </div>
            <div className='space-y-2'>
              <FieldLabel label='Height (cm)' hint='Package height in centimeters.' />
              <Input value={height} onChange={(e) => setHeight(e.target.value)} placeholder='10' />
            </div>
          </div>

          <div className='mt-3 grid gap-3 md:grid-cols-2'>
            <div className='space-y-2'>
              <FieldLabel label='Shipping mode' hint='Surface for regular, Express for faster shipping.' />
              <select
                value={shippingMode}
                onChange={(e) => setShippingMode(e.target.value as 'S' | 'E')}
                className='vendor-field flex h-11 w-full rounded-none border bg-transparent px-4 py-2 text-sm shadow-sm outline-none'
              >
                <option value='S'>Surface</option>
                <option value='E'>Express</option>
              </select>
            </div>
            <div className='flex flex-wrap items-end gap-2'>
              <Button
                className='rounded-none'
                variant='outline'
                disabled={!selectedOrder || checkingEstimate || warehousesLoading || !hasWarehouse || !readText(pickupLocation)}
                onClick={() => {
                  void checkLaneAndEstimate()
                }}
              >
                {checkingEstimate ? <LoaderCircle className='h-4 w-4 animate-spin' /> : <Search className='h-4 w-4' />}
                {checkingEstimate ? 'Checking' : 'Check lane & price'}
              </Button>
            </div>
          </div>

          <div className='mt-4 flex flex-wrap items-center gap-3 text-sm'>
            <span className='text-muted-foreground'>Selected order:</span>
            <span className='font-medium'>
              {selectedOrder
                ? `${selectedOrder.orderNumber} | ${selectedOrder.customerName}`
                : 'No order selected'}
            </span>
            {estimate ? (
              <>
                <Badge
                  variant='outline'
                  className={estimate.serviceable ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}
                >
                  {estimate.serviceable ? 'Serviceable' : 'Not serviceable'}
                </Badge>
                <Badge variant='outline' className='bg-indigo-100 text-indigo-700'>
                  Price:{' '}
                  {estimate.estimatedCharge != null
                    ? formatINR(estimate.estimatedCharge)
                    : 'N/A'}
                </Badge>
                <span className='text-muted-foreground'>
                  Chargeable wt: {estimate.chargeableWeight} gm | Matches: {estimate.matchedRecords} |
                  Serviceable rows: {estimate.serviceableRecords}
                </span>
              </>
            ) : null}
          </div>
        </div>
        )}

        {selectedOrder ? (
          <div className='rounded-none border border-dashed bg-card p-5'>
            <p className='text-sm text-muted-foreground'>
              Order list is moved to Courier List for cleaner shipment workflow.
            </p>
            <div className='mt-3'>
              <Button variant='outline' onClick={() => window.location.assign('/courier/list')}>
                Go to Courier List
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      <StatisticsDialog
        open={statsOpen}
        onOpenChange={setStatsOpen}
        title='Delhivery statistics'
        description='Open-order summary for shipment creation.'
        items={statsItems}
      />

      <Dialog open={warehouseWarningOpen} onOpenChange={setWarehouseWarningOpen}>
        <DialogContent className='max-w-lg rounded-none'>
          <DialogHeader>
            <DialogTitle>No Warehouse Found</DialogTitle>
            <DialogDescription>
              Create at least one warehouse before checking lane and price.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className='gap-2 sm:justify-end'>
            <Button variant='outline' onClick={() => setWarehouseWarningOpen(false)}>
              Close
            </Button>
            <Button
              onClick={() => {
                setWarehouseWarningOpen(false)
                setWarehouseDialogOpen(true)
              }}
            >
              Create Warehouse
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={warehouseDialogOpen} onOpenChange={setWarehouseDialogOpen}>
        <DialogContent className='w-[min(96vw,860px)] max-h-[90vh] overflow-y-auto rounded-none'>
          <DialogHeader className='text-left'>
            <DialogTitle>Create Delhivery Warehouse</DialogTitle>
            <DialogDescription>
              Create pickup warehouse for vendor. After success, pickup location auto-fills in shipment form.
            </DialogDescription>
          </DialogHeader>

          <div className='grid gap-4 sm:grid-cols-2'>
            <div className='space-y-2'>
              <FieldLabel label='Warehouse name' hint='Unique warehouse/pickup location name in Delhivery.' />
              <Input
                value={warehouseForm.name}
                onChange={(e) => setWarehouseForm((current) => ({ ...current, name: e.target.value }))}
                placeholder='warehouse_name'
              />
            </div>
            <div className='space-y-2'>
              <FieldLabel label='Registered name' hint='Legal business/entity name for warehouse.' />
              <Input
                value={warehouseForm.registered_name}
                onChange={(e) =>
                  setWarehouseForm((current) => ({ ...current, registered_name: e.target.value }))
                }
                placeholder='Business legal name'
              />
            </div>
            <div className='space-y-2'>
              <FieldLabel label='Phone' hint='Contact number for pickup coordination.' />
              <Input
                value={warehouseForm.phone}
                onChange={(e) => setWarehouseForm((current) => ({ ...current, phone: e.target.value }))}
                placeholder='9999999999'
              />
            </div>
            <div className='space-y-2'>
              <FieldLabel label='Email' hint='Warehouse contact email (optional but recommended).' />
              <Input
                value={warehouseForm.email}
                onChange={(e) => setWarehouseForm((current) => ({ ...current, email: e.target.value }))}
                placeholder='name@example.com'
              />
            </div>
            <div className='space-y-2 sm:col-span-2'>
              <FieldLabel label='Address' hint='Primary pickup warehouse address.' />
              <Textarea
                value={warehouseForm.address}
                onChange={(e) => setWarehouseForm((current) => ({ ...current, address: e.target.value }))}
                className='min-h-[84px] rounded-none'
                placeholder='Warehouse address'
              />
            </div>
            <div className='space-y-2'>
              <FieldLabel label='City' hint='Warehouse city.' />
              <Input
                value={warehouseForm.city}
                onChange={(e) => setWarehouseForm((current) => ({ ...current, city: e.target.value }))}
                placeholder='Greater Noida'
              />
            </div>
            <div className='space-y-2'>
              <FieldLabel label='Pin code' hint='Warehouse pincode (required).' />
              <Input
                value={warehouseForm.pin}
                onChange={(e) => setWarehouseForm((current) => ({ ...current, pin: e.target.value }))}
                placeholder='201306'
              />
            </div>
            <div className='space-y-2'>
              <FieldLabel label='Country' hint='Default is India.' />
              <Input
                value={warehouseForm.country}
                onChange={(e) => setWarehouseForm((current) => ({ ...current, country: e.target.value }))}
                placeholder='India'
              />
            </div>
            <div className='space-y-2 sm:col-span-2'>
              <FieldLabel label='Return address' hint='Mandatory return address for RTO shipments.' />
              <Textarea
                value={warehouseForm.return_address}
                onChange={(e) =>
                  setWarehouseForm((current) => ({ ...current, return_address: e.target.value }))
                }
                className='min-h-[84px] rounded-none'
                placeholder='Return address'
              />
            </div>
            <div className='space-y-2'>
              <FieldLabel label='Return city' hint='RTO return city.' />
              <Input
                value={warehouseForm.return_city}
                onChange={(e) =>
                  setWarehouseForm((current) => ({ ...current, return_city: e.target.value }))
                }
                placeholder='Greater Noida'
              />
            </div>
            <div className='space-y-2'>
              <FieldLabel label='Return pin' hint='RTO return pincode.' />
              <Input
                value={warehouseForm.return_pin}
                onChange={(e) =>
                  setWarehouseForm((current) => ({ ...current, return_pin: e.target.value }))
                }
                placeholder='201306'
              />
            </div>
            <div className='space-y-2'>
              <FieldLabel label='Return state' hint='RTO return state.' />
              <Input
                value={warehouseForm.return_state}
                onChange={(e) =>
                  setWarehouseForm((current) => ({ ...current, return_state: e.target.value }))
                }
                placeholder='Uttar Pradesh'
              />
            </div>
            <div className='space-y-2'>
              <FieldLabel label='Return country' hint='Default is India.' />
              <Input
                value={warehouseForm.return_country}
                onChange={(e) =>
                  setWarehouseForm((current) => ({ ...current, return_country: e.target.value }))
                }
                placeholder='India'
              />
            </div>
          </div>

          <DialogFooter className='gap-2 sm:justify-end'>
            <Button variant='outline' onClick={() => setWarehouseDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              className='rounded-none bg-primary text-primary-foreground hover:bg-primary/90'
              disabled={creatingWarehouse}
              onClick={() => {
                void handleCreateWarehouse()
              }}
            >
              {creatingWarehouse ? <LoaderCircle className='h-4 w-4 animate-spin' /> : null}
              {creatingWarehouse ? 'Creating warehouse' : 'Create warehouse'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={priceDialogOpen} onOpenChange={setPriceDialogOpen}>
        <DialogContent className='w-[min(96vw,760px)] max-h-[90vh] overflow-y-auto rounded-none'>
          <DialogHeader className='text-left'>
            <DialogTitle>Delhivery Price Details</DialogTitle>
            <DialogDescription>
              Review order and shipping charges before creating shipment.
            </DialogDescription>
          </DialogHeader>

          <div className='grid gap-4 md:grid-cols-2'>
            <div className='space-y-3 rounded-none border p-3 text-sm'>
              <p className='text-base font-semibold'>Order Snapshot</p>
              <div className='grid gap-1 text-sm'>
                <p><span className='text-muted-foreground'>Order:</span> {selectedOrder?.orderNumber || 'N/A'}</p>
                <p><span className='text-muted-foreground'>Customer:</span> {selectedOrder?.customerName || 'N/A'}</p>
                <p><span className='text-muted-foreground'>Phone:</span> {selectedOrder?.customerPhone || 'N/A'}</p>
                <p><span className='text-muted-foreground'>Origin:</span> {origin || 'N/A'}</p>
                <p><span className='text-muted-foreground'>Destination:</span> {destination || selectedOrder?.pincode || 'N/A'}</p>
              </div>
              <div className='max-h-44 space-y-2 overflow-auto border-t pt-2'>
                {(selectedOrder?.items || []).slice(0, 4).map((item, index) => (
                  <div key={`${item.productName}-${index}`} className='flex items-center gap-3 rounded-none border p-2'>
                    <img
                      src={resolveItemImage(item.imageUrl)}
                      alt={item.productName || 'Product'}
                      className='h-11 w-11 rounded-none border object-cover'
                      onError={(event) => {
                        const target = event.currentTarget
                        if (target.dataset.fallbackApplied) return
                        target.dataset.fallbackApplied = 'true'
                        target.src = FALLBACK_IMAGE
                      }}
                    />
                    <div className='min-w-0 flex-1'>
                      <p className='truncate font-medium'>{item.productName || 'Product'}</p>
                      <p className='text-muted-foreground text-xs'>Qty: {item.quantity || 1}</p>
                    </div>
                    <p className='text-xs font-semibold'>{formatINR(item.totalPrice || 0)}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className='space-y-3 rounded-none border bg-gradient-to-br from-indigo-50 via-white to-cyan-50 p-3 text-sm'>
              <p className='text-base font-semibold'>Price Highlight</p>
              <div className='grid gap-2'>
                <div className='rounded-none border bg-white p-2'>
                  <p className='text-muted-foreground text-xs'>Estimated Charge</p>
                  <p className='text-lg font-semibold text-indigo-700'>
                    {estimate?.estimatedCharge != null ? formatINR(estimate.estimatedCharge) : 'N/A'}
                  </p>
                </div>
                <div className='rounded-none border bg-white p-2'>
                  <p className='text-muted-foreground text-xs'>GST / Tax</p>
                  <p className='text-lg font-semibold text-amber-700'>
                    {estimate?.gstAmount != null ? formatINR(estimate.gstAmount) : 'N/A'}
                  </p>
                </div>
                <div className='rounded-none border bg-white p-2'>
                  <p className='text-muted-foreground text-xs'>Total With Tax</p>
                  <p className='text-2xl font-bold text-emerald-700'>
                    {estimate?.totalWithTax != null ? formatINR(estimate.totalWithTax) : 'N/A'}
                  </p>
                </div>
              </div>
              <p className='text-xs text-muted-foreground'>
                Chargeable wt: {estimate?.chargeableWeight || 'N/A'} gm | Matches: {estimate?.matchedRecords ?? 0}
                {' '}| Serviceable rows: {estimate?.serviceableRecords ?? 0}
              </p>
              <Badge
                variant='outline'
                className={estimate?.serviceable ? 'w-fit bg-emerald-100 text-emerald-700' : 'w-fit bg-rose-100 text-rose-700'}
              >
                {estimate?.serviceable ? 'Serviceable lane' : 'Not serviceable lane'}
              </Badge>
            </div>
          </div>

          <DialogFooter className='gap-2 sm:justify-end'>
            <Button variant='outline' onClick={() => setPriceDialogOpen(false)}>
              Close
            </Button>
            <Button
              className='rounded-none bg-primary text-primary-foreground hover:bg-primary/90'
              disabled={!selectedOrder || !estimate?.serviceable}
              onClick={() => {
                setPriceDialogOpen(false)
                setConfirmDialogOpen(true)
              }}
            >
              Create Shipment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className='w-[min(96vw,680px)] max-h-[90vh] overflow-y-auto overflow-x-hidden rounded-none'>
          <DialogHeader className='text-left'>
            <DialogTitle>Confirm Shipment Creation</DialogTitle>
            <DialogDescription>
              Please confirm order, delivery details, and price before creating shipment.
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-4 text-sm'>
            <div className='space-y-2 rounded-none border p-3'>
              <p className='font-semibold'>Order Details</p>
              <div className='grid gap-1'>
                <p className='break-words'><span className='text-muted-foreground'>Order:</span> {selectedOrder?.orderNumber || 'N/A'}</p>
                <p className='break-words'><span className='text-muted-foreground'>Customer:</span> {selectedOrder?.customerName || 'N/A'}</p>
                <p className='break-words'><span className='text-muted-foreground'>Phone:</span> {selectedOrder?.customerPhone || 'N/A'}</p>
                <p className='break-words'><span className='text-muted-foreground'>Order Total:</span> {selectedOrder ? formatINR(selectedOrder.total) : 'N/A'}</p>
              </div>
              <div className='mt-2 max-h-44 space-y-2 overflow-y-auto border-t pt-2'>
                {(selectedOrder?.items || []).slice(0, 4).map((item, index) => (
                  <div
                    key={`${item.productName}-confirm-${index}`}
                    className='flex min-w-0 items-center gap-2 rounded-none border p-2'
                  >
                    <img
                      src={resolveItemImage(item.imageUrl)}
                      alt={item.productName || 'Product'}
                      className='h-10 w-10 rounded-none border object-cover'
                      onError={(event) => {
                        const target = event.currentTarget
                        if (target.dataset.fallbackApplied) return
                        target.dataset.fallbackApplied = 'true'
                        target.src = FALLBACK_IMAGE
                      }}
                    />
                    <div className='min-w-0 flex-1'>
                      <p className='truncate text-xs font-medium'>{item.productName || 'Product'}</p>
                      <p className='text-muted-foreground text-xs'>Qty: {item.quantity || 1}</p>
                    </div>
                    <p className='shrink-0 text-xs font-semibold'>{formatINR(item.totalPrice || 0)}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className='space-y-2 rounded-none border p-3'>
              <p className='font-semibold'>Delivery Details</p>
              <div className='grid gap-1'>
                <p className='break-words'><span className='text-muted-foreground'>Origin pincode:</span> {origin || 'N/A'}</p>
                <p className='break-words'><span className='text-muted-foreground'>Destination pincode:</span> {destination || selectedOrder?.pincode || 'N/A'}</p>
                <p className='break-words'><span className='text-muted-foreground'>Pickup location:</span> {pickupLocation || 'N/A'}</p>
                <p className='break-words'><span className='text-muted-foreground'>Shipping mode:</span> {shippingMode === 'E' ? 'Express' : 'Surface'}</p>
                <p className='break-words'><span className='text-muted-foreground'>Payment mode:</span> {paymentMode}</p>
              </div>
            </div>
          </div>

          <div className='space-y-2 rounded-none border bg-gradient-to-r from-indigo-50 via-cyan-50 to-emerald-50 p-3 text-sm'>
            <p className='font-semibold'>Price Confirmation</p>
            <p className='text-base'>Base/Estimated: <span className='font-semibold text-indigo-700'>{estimate?.estimatedCharge != null ? formatINR(estimate.estimatedCharge) : 'N/A'}</span></p>
            <p className='text-base'>GST/Tax: <span className='font-semibold text-amber-700'>{estimate?.gstAmount != null ? formatINR(estimate.gstAmount) : 'N/A'}</span></p>
            <p className='text-lg'>Total with Tax: <span className='font-bold text-emerald-700'>{estimate?.totalWithTax != null ? formatINR(estimate.totalWithTax) : 'N/A'}</span></p>
          </div>

          <DialogFooter className='gap-2 sm:justify-end'>
            <Button variant='outline' onClick={() => setConfirmDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              className='rounded-none bg-primary text-primary-foreground hover:bg-primary/90'
              disabled={creatingShipment || !selectedOrder || !estimate?.serviceable}
              onClick={() => {
                void handleCreateShipment()
              }}
            >
              {creatingShipment ? <LoaderCircle className='h-4 w-4 animate-spin' /> : null}
              {creatingShipment ? 'Creating shipment' : 'Yes, Create Shipment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
