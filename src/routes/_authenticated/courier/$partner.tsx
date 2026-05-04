import { createFileRoute, Link } from '@tanstack/react-router'
import {
  ArrowUpRight,
  Clock3,
  ExternalLink,
  LoaderCircle,
  Package2,
  RefreshCcw,
  Search,
  Truck,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { toast } from 'sonner'
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import {
  cancelShadowfaxOrder,
  createShadowfaxEscalation,
  createShadowfaxWarehouseShipment,
  createDelhiveryWarehouse,
  createDelhiveryShipment,
  createDelhiveryPickupRequest,
  cancelDelhiveryShipment,
  editDelhiveryShipment,
  fetchDelhiveryB2cServiceability,
  fetchDelhiveryBulkWaybills,
  fetchDelhiveryHeavyServiceability,
  fetchShadowfaxOrderDetails,
  fetchShadowfaxPodDetails,
  fetchDelhiveryShippingEstimate,
  generateShadowfaxAwbs,
  fetchShadowfaxServiceability,
  fetchDelhiverySingleWaybill,
  generateDelhiveryLabel,
  loadCourierOrders,
  trackDelhiveryShipment,
  updateShadowfaxOrderData,
  updateDelhiveryWarehouse,
} from '@/features/courier/api'
import { formatINR } from '@/lib/currency'
import {
  COURIER_PARTNER_MAP,
  COURIER_PARTNERS,
  getRemoteCourierAssignment,
  hasAnyActiveCourierAssignment,
  readCourierAssignments,
  type CourierAssignment,
  type CourierOrderSummary,
  type CourierPartnerId,
} from '@/features/courier/data'
import { useVendorIntegrations } from '@/context/vendor-integrations-provider'
import {
  resolveVendorProfile,
  resolveVendorProfilePincode,
} from '@/features/courier/vendor-profile'
import type { RootState } from '@/store'
import type { AppDispatch } from '@/store'
import { fetchVendorProfile } from '@/store/slices/vendor/profileSlice'

const supportedPartners = COURIER_PARTNERS.map((partner) => partner.id)

export const Route = createFileRoute('/_authenticated/courier/$partner')({
  component: CourierPartnerPage,
})

type DelhiveryEditForm = {
  name: string
  phone: string
  pt: string
  cod: string
  add: string
  products_desc: string
  gm: string
  shipment_height: string
  shipment_width: string
  shipment_length: string
}

type BookingFormState = {
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

type BookingCheck = {
  ok: boolean
  summary: string
  rows: string[]
  payload?: Record<string, unknown>
}

type DelhiveryLaneResult = {
  title: string
  summary: string
  rows: string[]
  raw?: unknown
}

type DelhiveryWaybillResult = {
  title: string
  summary: string
  rows: string[]
  raw?: unknown
}

type DelhiveryWarehouseResult = {
  title: string
  summary: string
  rows: string[]
  raw?: unknown
}

type ShadowfaxServiceabilityResult = {
  title: string
  summary: string
  rows: string[]
  raw?: unknown
}

type ShadowfaxAwbResult = {
  title: string
  summary: string
  rows: string[]
  raw?: unknown
}

type ShadowfaxOrderResult = {
  title: string
  summary: string
  rows: string[]
  raw?: unknown
}

type ShadowfaxTrackingResult = {
  title: string
  summary: string
  rows: string[]
  raw?: unknown
}

type ShadowfaxUpdateResult = {
  title: string
  summary: string
  rows: string[]
  raw?: unknown
}

type ShadowfaxCancelResult = {
  title: string
  summary: string
  rows: string[]
  raw?: unknown
}

type ShadowfaxEscalationResult = {
  title: string
  summary: string
  rows: string[]
  raw?: unknown
}

type ShadowfaxPodResult = {
  title: string
  summary: string
  rows: string[]
  raw?: unknown
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

type DelhiveryWarehouseUpdateForm = {
  name: string
  address: string
  pin: string
  phone: string
}

type ShadowfaxUpdateForm = {
  awbNumber: string
  deliveryContact: string
  deliveryAddress: string
  deliveryPincode: string
  pickupContact: string
  pickupAddress: string
  pickupPincode: string
  actualWeight: string
  volumetricWeight: string
  status: string
}

type ShadowfaxCancelForm = {
  requestId: string
  cancelRemarks: string
}

type ShadowfaxEscalationForm = {
  awbNumber: string
  issueCategory: string
}

type ShadowfaxPodForm = {
  awbNumbers: string
}

const defaultBookingForm: BookingFormState = {
  origin: '',
  destination: '',
  pickupLocation: '',
  paymentType: 'prepaid',
  productType: 'standard',
  shippingMode: 'surface',
  billingStatus: 'Delivered',
  packageType: 'box',
  orderAmount: '1000',
  weight: '500',
  length: '10',
  breadth: '10',
  height: '10',
  details: '',
}

const defaultDelhiveryWarehouseForm: DelhiveryWarehouseForm = {
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
}

const defaultDelhiveryWarehouseUpdateForm: DelhiveryWarehouseUpdateForm = {
  name: '',
  address: '',
  pin: '',
  phone: '',
}

const defaultShadowfaxUpdateForm: ShadowfaxUpdateForm = {
  awbNumber: '',
  deliveryContact: '',
  deliveryAddress: '',
  deliveryPincode: '',
  pickupContact: '',
  pickupAddress: '',
  pickupPincode: '',
  actualWeight: '',
  volumetricWeight: '',
  status: '',
}

const defaultShadowfaxCancelForm: ShadowfaxCancelForm = {
  requestId: '',
  cancelRemarks: 'Request cancelled by customer',
}

const defaultShadowfaxEscalationForm: ShadowfaxEscalationForm = {
  awbNumber: '',
  issueCategory: '1',
}

const defaultShadowfaxPodForm: ShadowfaxPodForm = {
  awbNumbers: '',
}

const readText = (value: unknown) => String(value ?? '').trim()

const bookingRows = (items: Array<string | null | undefined>) =>
  items.map((item) => readText(item)).filter(Boolean)

const buildShadowfaxUpdateSection = (entries: Record<string, unknown>) => {
  const nextEntries = Object.entries(entries).reduce<Record<string, unknown>>(
    (accumulator, [key, value]) => {
      const normalized = typeof value === 'string' ? readText(value) : value
      if (normalized === '' || normalized === null || normalized === undefined) {
        return accumulator
      }
      accumulator[key] = normalized
      return accumulator
    },
    {}
  )

  return Object.keys(nextEntries).length ? nextEntries : null
}

const parseShadowfaxAwbText = (value: string) =>
  Array.from(
    new Set(
      readText(value)
        .split(/[\s,]+/)
        .map((entry) => entry.trim())
        .filter(Boolean)
    )
  )

const fillBookingFormFromOrder = (
  order: CourierOrderSummary,
  current: BookingFormState
): BookingFormState => ({
  ...current,
  destination: order.pincode || current.destination,
  orderAmount: order.total ? String(Math.round(order.total)) : current.orderAmount,
  details:
    order.items.map((item) => item.productName).filter(Boolean).join(', ') || current.details,
})

const getLocalDateValue = (value = new Date()) => {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const getLocalTimeValue = (value = new Date()) => {
  const hours = String(value.getHours()).padStart(2, '0')
  const minutes = String(value.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}:00`
}

function CourierPartnerPage() {
  const { partner } = Route.useParams()
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
  const partnerId = (supportedPartners.includes(partner as CourierPartnerId)
    ? partner
    : 'delhivery') as CourierPartnerId
  const partnerMeta = COURIER_PARTNER_MAP[partnerId]
  const isDelhivery = partnerId === 'delhivery'
  const isShadowfax = partnerId === 'shadowfax'
  const usesLiveOrders = partnerId === 'delhivery' || partnerId === 'shadowfax'
  const initialLane = useMemo(() => {
    if (typeof window === 'undefined') return { origin: '', destination: '' }
    const params = new URLSearchParams(window.location.search)
    return {
      orderId: readText(params.get('orderId')),
      origin: readText(params.get('origin')),
      destination: readText(params.get('destination')),
    }
  }, [])
  const [refreshKey, setRefreshKey] = useState(0)
  const [liveOrders, setLiveOrders] = useState<CourierOrderSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedBookingOrderId, setSelectedBookingOrderId] = useState('')
  const [bookingForm, setBookingForm] = useState<BookingFormState>({
    ...defaultBookingForm,
    origin: initialLane.origin,
    destination: initialLane.destination,
  })
  const [checkingBooking, setCheckingBooking] = useState(false)
  const [bookingBusy, setBookingBusy] = useState(false)
  const [bookingCheck, setBookingCheck] = useState<BookingCheck | null>(null)
  const [busyOrderId, setBusyOrderId] = useState('')
  const [busyAction, setBusyAction] = useState<
    'track' | 'manifest' | 'cancel' | 'edit' | 'label' | 'pickup' | ''
  >('')
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingOrder, setEditingOrder] = useState<CourierOrderSummary | null>(null)
  const [editForm, setEditForm] = useState<DelhiveryEditForm>({
    name: '',
    phone: '',
    pt: '',
    cod: '',
    add: '',
    products_desc: '',
    gm: '',
    shipment_height: '',
    shipment_width: '',
    shipment_length: '',
  })
  const [, setNdrItems] = useState<
    { awb_number?: string; event_date?: string; courier_remarks?: string; total_attempts?: string }[]
  >([])
  const [delhiveryLaneBusy, setDelhiveryLaneBusy] = useState<'b2c' | 'heavy' | 'estimate' | ''>('')
  const [delhiveryLaneResult, setDelhiveryLaneResult] = useState<DelhiveryLaneResult | null>(null)
  const [delhiveryWaybillBusy, setDelhiveryWaybillBusy] = useState<'bulk' | 'single' | ''>('')
  const [delhiveryWaybillCount, setDelhiveryWaybillCount] = useState('10')
  const [delhiveryWaybillStore, setDelhiveryWaybillStore] = useState(true)
  const [delhiveryWaybillResult, setDelhiveryWaybillResult] =
    useState<DelhiveryWaybillResult | null>(null)
  const [delhiveryWarehouseBusy, setDelhiveryWarehouseBusy] = useState<
    'create' | 'update' | ''
  >('')
  const [delhiveryWarehouseForm, setDelhiveryWarehouseForm] = useState<DelhiveryWarehouseForm>(
    defaultDelhiveryWarehouseForm
  )
  const [delhiveryWarehouseUpdateForm, setDelhiveryWarehouseUpdateForm] =
    useState<DelhiveryWarehouseUpdateForm>(defaultDelhiveryWarehouseUpdateForm)
  const [delhiveryWarehouseResult, setDelhiveryWarehouseResult] =
    useState<DelhiveryWarehouseResult | null>(null)
  const [shadowfaxServiceabilityBusy, setShadowfaxServiceabilityBusy] = useState(false)
  const [shadowfaxServiceabilityForm, setShadowfaxServiceabilityForm] = useState({
    service: 'customer_delivery',
    pincodes: '',
    page: '1',
    count: '10',
  })
  const [shadowfaxServiceabilityResult, setShadowfaxServiceabilityResult] =
    useState<ShadowfaxServiceabilityResult | null>(null)
  const [shadowfaxAwbBusy, setShadowfaxAwbBusy] = useState(false)
  const [shadowfaxAwbForm, setShadowfaxAwbForm] = useState({
    count: '10',
    requestType: 'FWD',
  })
  const [shadowfaxAwbResult, setShadowfaxAwbResult] = useState<ShadowfaxAwbResult | null>(null)
  const [shadowfaxOrderBusy, setShadowfaxOrderBusy] = useState(false)
  const [shadowfaxOrderResult, setShadowfaxOrderResult] = useState<ShadowfaxOrderResult | null>(
    null
  )
  const [shadowfaxTrackingBusy, setShadowfaxTrackingBusy] = useState(false)
  const [shadowfaxTrackingForm, setShadowfaxTrackingForm] = useState({
    awbNumber: '',
  })
  const [shadowfaxTrackingResult, setShadowfaxTrackingResult] =
    useState<ShadowfaxTrackingResult | null>(null)
  const [shadowfaxUpdateBusy, setShadowfaxUpdateBusy] = useState(false)
  const [shadowfaxUpdateForm, setShadowfaxUpdateForm] =
    useState<ShadowfaxUpdateForm>(defaultShadowfaxUpdateForm)
  const [shadowfaxUpdateResult, setShadowfaxUpdateResult] =
    useState<ShadowfaxUpdateResult | null>(null)
  const [shadowfaxCancelBusy, setShadowfaxCancelBusy] = useState(false)
  const [shadowfaxCancelForm, setShadowfaxCancelForm] =
    useState<ShadowfaxCancelForm>(defaultShadowfaxCancelForm)
  const [shadowfaxCancelResult, setShadowfaxCancelResult] =
    useState<ShadowfaxCancelResult | null>(null)
  const [shadowfaxEscalationBusy, setShadowfaxEscalationBusy] = useState(false)
  const [shadowfaxEscalationForm, setShadowfaxEscalationForm] =
    useState<ShadowfaxEscalationForm>(defaultShadowfaxEscalationForm)
  const [shadowfaxEscalationResult, setShadowfaxEscalationResult] =
    useState<ShadowfaxEscalationResult | null>(null)
  const [shadowfaxPodBusy, setShadowfaxPodBusy] = useState(false)
  const [shadowfaxPodForm, setShadowfaxPodForm] =
    useState<ShadowfaxPodForm>(defaultShadowfaxPodForm)
  const [shadowfaxPodResult, setShadowfaxPodResult] =
    useState<ShadowfaxPodResult | null>(null)

  const profileOriginPincode = useMemo(
    () => resolveVendorProfilePincode(user, vendorProfile),
    [user, vendorProfile]
  )
  const defaultPickupLocation = useMemo(
    () => readText(integrationsData?.providers?.delhivery?.config?.pickup_location),
    [integrationsData?.providers?.delhivery?.config?.pickup_location]
  )

  useEffect(() => {
    if (!isVendor || vendorProfile || vendorProfileState?.loading) return
    void dispatch(fetchVendorProfile())
  }, [dispatch, isVendor, vendorProfile, vendorProfileState?.loading])

  useEffect(() => {
    if (partnerId !== 'delhivery') return

    setDelhiveryWarehouseForm((current) => ({
      ...current,
      name: current.name || defaultPickupLocation,
      registered_name: current.registered_name || readText(user?.name),
      phone: current.phone || readText(user?.phone),
      email: current.email || readText(user?.email),
      pin: current.pin || profileOriginPincode,
      return_pin: current.return_pin || profileOriginPincode,
    }))

    setDelhiveryWarehouseUpdateForm((current) => ({
      ...current,
      name: current.name || defaultPickupLocation,
      pin: current.pin || profileOriginPincode,
      phone: current.phone || readText(user?.phone),
    }))
  }, [defaultPickupLocation, partnerId, profileOriginPincode, user?.email, user?.name, user?.phone])

  useEffect(() => {
    let cancelled = false

    const loadData = async () => {
      const needsLiveData = usesLiveOrders
      if (!needsLiveData) {
        setLiveOrders([])
        setNdrItems([])
        setLoading(false)
        setError('')
        return
      }

      try {
        setLoading(true)
        setError('')
        const [orders] = await Promise.all([
          loadCourierOrders(isVendor),
        ])

        if (cancelled) return

        setLiveOrders(orders)
      } catch (err: any) {
        if (cancelled) return
        setError(err?.response?.data?.message || 'Failed to load courier partner data')
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadData()

    return () => {
      cancelled = true
    }
  }, [isVendor, refreshKey, usesLiveOrders])

  const assignments = useMemo(() => {
    if (usesLiveOrders) {
      return liveOrders
        .map((order) => ({ assignment: getRemoteCourierAssignment(order), order }))
        .filter(
          (entry): entry is { assignment: CourierAssignment; order: CourierOrderSummary } =>
            Boolean(entry.assignment && entry.assignment.partnerId === partnerId)
        )
        .sort((first, second) => {
          const a = new Date(first.assignment.assignedAt || 0).getTime()
          const b = new Date(second.assignment.assignedAt || 0).getTime()
          return b - a
        })
    }

    return readCourierAssignments()
      .filter((assignment) => assignment.partnerId === partnerId)
      .sort((first, second) => {
        const a = new Date(first.assignedAt || 0).getTime()
        const b = new Date(second.assignedAt || 0).getTime()
        return b - a
      })
      .map((assignment) => ({ assignment, order: null as CourierOrderSummary | null }))
  }, [liveOrders, partnerId, usesLiveOrders])

  const eligibleOrders = useMemo(
    () => liveOrders.filter((order) => !hasAnyActiveCourierAssignment(order)),
    [liveOrders]
  )
  const selectedBookingOrder = useMemo(
    () => eligibleOrders.find((order) => order.id === selectedBookingOrderId) || null,
    [eligibleOrders, selectedBookingOrderId]
  )

  useEffect(() => {
    setSelectedBookingOrderId((current) =>
      current && eligibleOrders.some((order) => order.id === current)
        ? current
        : initialLane.orderId && eligibleOrders.some((order) => order.id === initialLane.orderId)
          ? initialLane.orderId
          : eligibleOrders[0]?.id || ''
    )
  }, [eligibleOrders, initialLane.orderId])

  useEffect(() => {
    setBookingForm((current) => {
      const nextOrigin = current.origin || initialLane.origin || profileOriginPincode
      const nextDestination =
        current.destination || initialLane.destination || selectedBookingOrder?.pincode || ''
      const nextPickupLocation = current.pickupLocation || defaultPickupLocation
      if (
        nextOrigin === current.origin &&
        nextDestination === current.destination &&
        nextPickupLocation === current.pickupLocation
      ) {
        return current
      }
      return {
        ...current,
        origin: nextOrigin,
        destination: nextDestination,
        pickupLocation: nextPickupLocation,
      }
    })
  }, [
    defaultPickupLocation,
    initialLane.destination,
    initialLane.origin,
    profileOriginPincode,
    selectedBookingOrder,
  ])

  useEffect(() => {
    if (!isShadowfax) return

    const nextPincodes = readText(
      shadowfaxServiceabilityForm.pincodes ||
        bookingForm.destination ||
        selectedBookingOrder?.pincode
    )

    if (!nextPincodes || nextPincodes === shadowfaxServiceabilityForm.pincodes) {
      return
    }

    setShadowfaxServiceabilityForm((current) => ({
      ...current,
      pincodes: current.pincodes || nextPincodes,
    }))
  }, [
    bookingForm.destination,
    isShadowfax,
    selectedBookingOrder?.pincode,
    shadowfaxServiceabilityForm.pincodes,
  ])

  useEffect(() => {
    if (!isShadowfax) return

    const candidateAwb = readText(
      shadowfaxTrackingForm.awbNumber ||
        assignments[0]?.assignment?.trackingCode ||
        liveOrders.find((order) => readText(order.shadowfax?.tracking_number || order.shadowfax?.order_id))
          ?.shadowfax?.tracking_number ||
        liveOrders.find((order) => readText(order.shadowfax?.tracking_number || order.shadowfax?.order_id))
          ?.shadowfax?.order_id
    )

    if (!candidateAwb || candidateAwb === shadowfaxTrackingForm.awbNumber) {
      return
    }

    setShadowfaxTrackingForm((current) => ({
      ...current,
      awbNumber: current.awbNumber || candidateAwb,
    }))
  }, [assignments, isShadowfax, liveOrders, shadowfaxTrackingForm.awbNumber])

  useEffect(() => {
    if (!isShadowfax) return

    const candidateAwb = readText(
      shadowfaxUpdateForm.awbNumber ||
        shadowfaxTrackingForm.awbNumber ||
        assignments[0]?.assignment?.trackingCode
    )

    if (!candidateAwb || candidateAwb === shadowfaxUpdateForm.awbNumber) {
      return
    }

    setShadowfaxUpdateForm((current) => ({
      ...current,
      awbNumber: current.awbNumber || candidateAwb,
    }))
  }, [assignments, isShadowfax, shadowfaxTrackingForm.awbNumber, shadowfaxUpdateForm.awbNumber])

  useEffect(() => {
    if (!isShadowfax) return

    const candidateRequestId = readText(
      shadowfaxCancelForm.requestId ||
        shadowfaxUpdateForm.awbNumber ||
        shadowfaxTrackingForm.awbNumber ||
        assignments[0]?.assignment?.trackingCode
    )

    if (!candidateRequestId || candidateRequestId === shadowfaxCancelForm.requestId) {
      return
    }

    setShadowfaxCancelForm((current) => ({
      ...current,
      requestId: current.requestId || candidateRequestId,
    }))
  }, [
    assignments,
    isShadowfax,
    shadowfaxCancelForm.requestId,
    shadowfaxTrackingForm.awbNumber,
    shadowfaxUpdateForm.awbNumber,
  ])

  useEffect(() => {
    if (!isShadowfax) return

    const candidateAwb = readText(
      shadowfaxEscalationForm.awbNumber ||
        shadowfaxTrackingForm.awbNumber ||
        shadowfaxUpdateForm.awbNumber ||
        shadowfaxCancelForm.requestId ||
        assignments[0]?.assignment?.trackingCode
    )

    if (!candidateAwb || candidateAwb === shadowfaxEscalationForm.awbNumber) {
      return
    }

    setShadowfaxEscalationForm((current) => ({
      ...current,
      awbNumber: current.awbNumber || candidateAwb,
    }))
  }, [
    assignments,
    isShadowfax,
    shadowfaxCancelForm.requestId,
    shadowfaxEscalationForm.awbNumber,
    shadowfaxTrackingForm.awbNumber,
    shadowfaxUpdateForm.awbNumber,
  ])

  useEffect(() => {
    if (!isShadowfax) return

    const candidateAwb = readText(
      shadowfaxPodForm.awbNumbers ||
        shadowfaxTrackingForm.awbNumber ||
        shadowfaxEscalationForm.awbNumber ||
        shadowfaxUpdateForm.awbNumber ||
        shadowfaxCancelForm.requestId ||
        assignments[0]?.assignment?.trackingCode
    )

    if (!candidateAwb || readText(shadowfaxPodForm.awbNumbers)) {
      return
    }

    setShadowfaxPodForm((current) => ({
      ...current,
      awbNumbers: current.awbNumbers || candidateAwb,
    }))
  }, [
    assignments,
    isShadowfax,
    shadowfaxCancelForm.requestId,
    shadowfaxEscalationForm.awbNumber,
    shadowfaxPodForm.awbNumbers,
    shadowfaxTrackingForm.awbNumber,
    shadowfaxUpdateForm.awbNumber,
  ])

  const applyOrderToBookingForm = (order: CourierOrderSummary | null) => {
    if (!order) return toast.error('Select an order first')
    setBookingForm((current) => {
      const next = fillBookingFormFromOrder(order, current)
      return {
        ...next,
        origin: next.origin || initialLane.origin || profileOriginPincode,
        pickupLocation: next.pickupLocation || defaultPickupLocation,
      }
    })
    setBookingCheck(null)
  }

  const totalGMV = assignments.reduce(
    (sum, entry) => sum + Number(entry.assignment.total || 0),
    0
  )
  const totalCharges = assignments.reduce(
    (sum, entry) => sum + Number(entry.assignment.amount || 0),
    0
  )
  const handleCheckBooking = async () => {
    if (partnerId !== 'delhivery') return
    if (!selectedBookingOrder) return toast.error('Select an available order first')

    const resolvedOrigin = readText(bookingForm.origin || profileOriginPincode)
    const resolvedDestination = readText(bookingForm.destination || selectedBookingOrder.pincode)
    const resolvedPickupLocation = readText(bookingForm.pickupLocation || defaultPickupLocation)

    if (!resolvedOrigin) return toast.error('Origin pincode is required')
    if (!resolvedDestination) return toast.error('Destination pincode is required')

    setCheckingBooking(true)
    try {
      if (partnerId === 'delhivery') {
        const [b2c, heavy, estimate] = await Promise.allSettled([
          fetchDelhiveryB2cServiceability(resolvedDestination),
          bookingForm.productType === 'heavy'
            ? fetchDelhiveryHeavyServiceability(resolvedDestination, 'Heavy')
            : Promise.resolve(null),
          fetchDelhiveryShippingEstimate({
            md: bookingForm.shippingMode === 'express' ? 'E' : 'S',
            cgm: bookingForm.weight.trim() || '0',
            o_pin: resolvedOrigin,
            d_pin: resolvedDestination,
            ss: bookingForm.billingStatus,
            pt: bookingForm.paymentType === 'cod' ? 'COD' : 'Pre-paid',
            l: bookingForm.length.trim() || undefined,
            b: bookingForm.breadth.trim() || undefined,
            h: bookingForm.height.trim() || undefined,
            ipkg_type: bookingForm.packageType,
          }),
        ])

        if (b2c.status !== 'fulfilled') {
          throw b2c.reason
        }

        const serviceability =
          bookingForm.productType === 'heavy' && heavy.status === 'fulfilled'
            ? heavy.value?.serviceability || {}
            : b2c.value?.serviceability || {}

        const estimateRows =
          estimate.status === 'fulfilled' && estimate.value?.estimate
            ? [
                `Estimated charge: ${formatINR(Number(estimate.value.estimate.estimated_charge || 0))}`,
                `Chargeable weight: ${estimate.value.estimate.chargeable_weight ?? bookingForm.weight}`,
              ]
            : ['Shipping estimate not available for this lane.']

        setBookingCheck({
          ok: Boolean(serviceability?.serviceable),
          summary: serviceability?.serviceable
            ? 'Delhivery serviceability check passed. You can create shipment now.'
            : 'Delhivery did not return a serviceable record for this order lane.',
          rows: bookingRows([
            `Order: ${selectedBookingOrder.orderNumber}`,
            `Origin: ${resolvedOrigin}`,
            `Destination: ${resolvedDestination}`,
            `Pickup location: ${resolvedPickupLocation || '-'}`,
            `Matched records: ${serviceability?.code_count ?? 0}`,
            ...estimateRows,
          ]),
          payload: serviceability?.serviceable
            ? {
                pickup_location: resolvedPickupLocation || undefined,
                shipment_width: bookingForm.breadth.trim() || undefined,
                shipment_height: bookingForm.height.trim() || undefined,
                shipment_length: bookingForm.length.trim() || undefined,
                weight: bookingForm.weight.trim() || undefined,
                products_desc: bookingForm.details.trim() || undefined,
                total_amount: bookingForm.orderAmount.trim() || undefined,
                cod_amount:
                  bookingForm.paymentType === 'cod'
                    ? bookingForm.orderAmount.trim() || undefined
                    : 0,
                payment_mode:
                  bookingForm.paymentType === 'cod' ? 'COD' : 'Prepaid',
                shipping_mode:
                  bookingForm.shippingMode === 'express' ? 'Express' : 'Surface',
              }
            : undefined,
        })
        return
      }

    } catch (err: any) {
      setBookingCheck({
        ok: false,
        summary:
          err?.response?.data?.message ||
          err?.message ||
          `${partnerMeta.title} check failed.`,
        rows: ['Review the order lane and partner settings, then try again.'],
      })
    } finally {
      setCheckingBooking(false)
    }
  }

  const handleCreateBooking = async () => {
    if (partnerId !== 'delhivery') return
    if (!selectedBookingOrder) return toast.error('Select an available order first')
    if (!bookingCheck?.ok || !bookingCheck.payload) {
      return toast.error(`Run ${partnerMeta.title} check first before creating shipment`)
    }

    try {
      setBookingBusy(true)
      if (partnerId === 'delhivery') {
        const result = await createDelhiveryShipment(selectedBookingOrder, bookingCheck.payload)
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
        toast.success(
          `Delhivery shipment created for ${selectedBookingOrder.orderNumber} (${waybill})`
        )
      }
      setBookingCheck(null)
      setRefreshKey((current) => current + 1)
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to create shipment')
    } finally {
      setBookingBusy(false)
    }
  }

  const handleRefreshDelhiveryTracking = async (order: CourierOrderSummary | null) => {
    if (!order || partnerId !== 'delhivery') return
    try {
      setBusyOrderId(order.id)
      setBusyAction('track')
      await trackDelhiveryShipment(order)
      toast.success(`Tracking updated for ${order.orderNumber}`)
      setRefreshKey((current) => current + 1)
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to refresh Delhivery tracking')
    } finally {
      setBusyOrderId('')
      setBusyAction('')
    }
  }

  const handleGenerateDelhiveryLabel = async (order: CourierOrderSummary | null) => {
    if (!order || partnerId !== 'delhivery') return
    try {
      setBusyOrderId(order.id)
      setBusyAction('label')
      const response = await generateDelhiveryLabel(order, { pdf: true, pdf_size: '4R' })
      const labelUrl = String(
        response?.label?.label_url || response?.order?.delhivery?.label_url || ''
      ).trim()
      if (labelUrl && typeof window !== 'undefined') {
        window.open(labelUrl, '_blank', 'noopener,noreferrer')
      }
      toast.success(`Delhivery label generated for ${order.orderNumber}`)
      setRefreshKey((current) => current + 1)
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to generate Delhivery label')
    } finally {
      setBusyOrderId('')
      setBusyAction('')
    }
  }

  const handleCreateDelhiveryPickupRequest = async (order: CourierOrderSummary | null) => {
    if (!order || partnerId !== 'delhivery') return
    if (!order?.delhivery?.waybill && !order?.delhivery?.waybills?.length) {
      toast.error('Manifest Delhivery shipment before creating pickup request')
      return
    }

    const defaultLocation = String(order?.delhivery?.pickup_location || '').trim()
    const pickupLocation = window.prompt(
      'Pickup location',
      defaultLocation
    )
    if (pickupLocation === null) return

    const pickupDate = window.prompt(
      'Pickup date (YYYY-MM-DD)',
      String(order?.delhivery?.pickup_request_date || getLocalDateValue()).trim()
    )
    if (pickupDate === null) return

    const pickupTime = window.prompt(
      'Pickup time (HH:mm:ss)',
      String(order?.delhivery?.pickup_request_time || getLocalTimeValue()).trim()
    )
    if (pickupTime === null) return

    const defaultPackageCount = String(
      order?.delhivery?.pickup_request_packages ||
        order?.delhivery?.package_count ||
        order?.delhivery?.waybills?.length ||
        order?.items?.length ||
        1
    ).trim()
    const packageCountInput = window.prompt(
      'Expected package count',
      defaultPackageCount
    )
    if (packageCountInput === null) return

    const expectedPackageCount = Number(packageCountInput)
    if (!Number.isInteger(expectedPackageCount) || expectedPackageCount <= 0) {
      toast.error('Expected package count must be a positive integer')
      return
    }

    try {
      setBusyOrderId(order.id)
      setBusyAction('pickup')
      const response = await createDelhiveryPickupRequest(order, {
        pickup_location: pickupLocation.trim(),
        pickup_date: pickupDate.trim(),
        pickup_time: pickupTime.trim(),
        expected_package_count: expectedPackageCount,
      })
      const message = String(
        response?.pickup_request?.message ||
          response?.pickup_request?.status ||
          'Delhivery pickup request created'
      ).trim()
      toast.success(`${message} for ${order.orderNumber}`)
      setRefreshKey((current) => current + 1)
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to create Delhivery pickup request')
    } finally {
      setBusyOrderId('')
      setBusyAction('')
    }
  }



  const handleCancelDelhiveryShipment = async (order: CourierOrderSummary | null) => {
    if (!order || partnerId !== 'delhivery') return
    const confirmed = window.confirm(
      `Cancel Delhivery shipment for ${order.orderNumber}? This only works on Delhivery statuses where cancellation is allowed.`
    )
    if (!confirmed) return

    try {
      setBusyOrderId(order.id)
      setBusyAction('cancel')
      await cancelDelhiveryShipment(order)
      toast.success(`Delhivery shipment cancelled for ${order.orderNumber}`)
      setRefreshKey((current) => current + 1)
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to cancel Delhivery shipment')
    } finally {
      setBusyOrderId('')
      setBusyAction('')
    }
  }

  const openDelhiveryEdit = (order: CourierOrderSummary | null) => {
    if (!order?.delhivery?.waybill && !order?.delhivery?.waybills?.length) {
      toast.error('No Delhivery waybill found for this order')
      return
    }

    setEditingOrder(order)
    setEditForm({
      name: order.customerName || '',
      phone: order.customerPhone || '',
      pt: order.delhivery?.payment_mode || '',
      cod: '',
      add: order.address || '',
      products_desc: order.items.map((item) => item.productName).filter(Boolean).join(', '),
      gm: '',
      shipment_height: '',
      shipment_width: '',
      shipment_length: '',
    })
    setEditDialogOpen(true)
  }

  const handleDelhiveryEdit = async () => {
    if (!editingOrder || partnerId !== 'delhivery') return

    const payload: Record<string, unknown> = {}
    if (editForm.name.trim()) payload.name = editForm.name.trim()
    if (editForm.phone.trim()) payload.phone = editForm.phone.trim()
    if (editForm.pt.trim()) payload.pt = editForm.pt.trim()
    if (editForm.cod.trim()) payload.cod = editForm.cod.trim()
    if (editForm.add.trim()) payload.add = editForm.add.trim()
    if (editForm.products_desc.trim()) payload.products_desc = editForm.products_desc.trim()
    if (editForm.gm.trim()) payload.gm = editForm.gm.trim()
    if (editForm.shipment_height.trim()) payload.shipment_height = editForm.shipment_height.trim()
    if (editForm.shipment_width.trim()) payload.shipment_width = editForm.shipment_width.trim()
    if (editForm.shipment_length.trim()) payload.shipment_length = editForm.shipment_length.trim()

    try {
      setBusyOrderId(editingOrder.id)
      setBusyAction('edit')
      await editDelhiveryShipment(editingOrder, payload)
      toast.success(`Delhivery shipment updated for ${editingOrder.orderNumber}`)
      setEditDialogOpen(false)
      setEditingOrder(null)
      setRefreshKey((current) => current + 1)
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to edit Delhivery shipment')
    } finally {
      setBusyOrderId('')
      setBusyAction('')
    }
  }

  const handleRunDelhiveryLaneApi = async (mode: 'b2c' | 'heavy' | 'estimate') => {
    if (partnerId !== 'delhivery') return

    const destination = readText(bookingForm.destination || selectedBookingOrder?.pincode)
    const origin = readText(bookingForm.origin || profileOriginPincode)

    if ((mode === 'b2c' || mode === 'heavy') && !destination) {
      toast.error('Destination pincode is required')
      return
    }

    if (mode === 'estimate' && (!origin || !destination)) {
      toast.error('Origin and destination pincodes are required')
      return
    }

    try {
      setDelhiveryLaneBusy(mode)
      if (mode === 'b2c') {
        const response = await fetchDelhiveryB2cServiceability(destination)
        const summary = response?.serviceability || {}
        setDelhiveryLaneResult({
          title: 'B2C serviceability',
          summary: summary?.serviceable
            ? 'Lane is serviceable for Delhivery B2C.'
            : 'No B2C serviceable record returned.',
          rows: bookingRows([
            `Destination: ${destination}`,
            `Matched records: ${summary?.code_count ?? 0}`,
            `Serviceable records: ${summary?.serviceable_count ?? 0}`,
            `Embargoed records: ${summary?.embargoed_count ?? 0}`,
          ]),
          raw: response,
        })
        return
      }

      if (mode === 'heavy') {
        const response = await fetchDelhiveryHeavyServiceability(destination, 'Heavy')
        const summary = response?.serviceability || {}
        setDelhiveryLaneResult({
          title: 'Heavy serviceability',
          summary: summary?.serviceable
            ? 'Lane is serviceable for Delhivery Heavy.'
            : 'No Heavy serviceable record returned.',
          rows: bookingRows([
            `Destination: ${destination}`,
            `Product type: ${summary?.product_type || 'Heavy'}`,
            `Matched records: ${summary?.code_count ?? 0}`,
            `Serviceable records: ${summary?.serviceable_count ?? 0}`,
            summary?.serviceable_payment_types?.length
              ? `Payment types: ${summary.serviceable_payment_types.join(', ')}`
              : '',
          ]),
          raw: response,
        })
        return
      }

      const response = await fetchDelhiveryShippingEstimate({
        md: bookingForm.shippingMode === 'express' ? 'E' : 'S',
        cgm: bookingForm.weight.trim() || '0',
        o_pin: origin,
        d_pin: destination,
        ss: bookingForm.billingStatus,
        pt: bookingForm.paymentType === 'cod' ? 'COD' : 'Pre-paid',
        l: bookingForm.length.trim() || undefined,
        b: bookingForm.breadth.trim() || undefined,
        h: bookingForm.height.trim() || undefined,
        ipkg_type: bookingForm.packageType,
      })
      const estimate = response?.estimate || {}
      setDelhiveryLaneResult({
        title: 'Shipping estimate',
        summary: estimate?.estimated_charge
          ? `Estimated charge is ${formatINR(Number(estimate.estimated_charge || 0))}.`
          : 'Estimate response returned without a charge.',
        rows: bookingRows([
          `Origin: ${origin}`,
          `Destination: ${destination}`,
          `Mode: ${estimate?.billing_mode || bookingForm.shippingMode}`,
          `Payment type: ${estimate?.payment_type || bookingForm.paymentType}`,
          `Chargeable weight: ${estimate?.chargeable_weight ?? bookingForm.weight}`,
          estimate?.currency ? `Currency: ${estimate.currency}` : '',
        ]),
        raw: response,
      })
    } catch (err: any) {
      toast.error(err?.response?.data?.message || `Failed to run Delhivery ${mode} API`)
      setDelhiveryLaneResult({
        title: 'Delhivery lane API',
        summary: err?.response?.data?.message || err?.message || 'Request failed',
        rows: ['Review the lane fields and Delhivery integration settings.'],
        raw: err?.response?.data || null,
      })
    } finally {
      setDelhiveryLaneBusy('')
    }
  }

  const handleRunShadowfaxServiceability = async () => {
    if (!isShadowfax) return

    const pincodes = readText(
      shadowfaxServiceabilityForm.pincodes ||
        bookingForm.destination ||
        selectedBookingOrder?.pincode
    )

    if (!pincodes) {
      toast.error('Destination pincode is required')
      return
    }

    try {
      setShadowfaxServiceabilityBusy(true)
      const response = await fetchShadowfaxServiceability({
        pincodes,
        service: readText(shadowfaxServiceabilityForm.service || 'customer_delivery'),
        page: readText(shadowfaxServiceabilityForm.page || '1'),
        count: readText(shadowfaxServiceabilityForm.count || '10'),
      })
      const summary = response?.serviceability || {}
      const requestedPincodes = Array.isArray(summary?.pincodes)
        ? summary.pincodes.map((entry: unknown) => readText(entry)).filter(Boolean)
        : pincodes
            .split(',')
            .map((entry) => readText(entry))
            .filter(Boolean)
      const previewRows = Array.isArray(summary?.records)
        ? summary.records.slice(0, 5).map((record: any, index: number) => {
            const location = [readText(record?.pincode), readText(record?.city), readText(record?.state)]
              .filter(Boolean)
              .join(' | ')
            const serviceableLabel =
              record?.serviceable === true
                ? 'serviceable'
                : record?.serviceable === false
                  ? 'not serviceable'
                  : ''
            const embargoedLabel = record?.embargoed === true ? 'embargoed' : ''
            return `Record ${index + 1}: ${[location, serviceableLabel, embargoedLabel]
              .filter(Boolean)
              .join(' | ')}`
          })
        : []

      setShadowfaxServiceabilityResult({
        title: 'Pincode serviceability',
        summary:
          Number(summary?.serviceable_count ?? 0) > 0
            ? 'Shadowfax returned serviceable records for this query.'
            : Number(summary?.matched_count ?? 0) > 0
              ? 'Shadowfax returned records but none were marked serviceable.'
              : 'No Shadowfax serviceability records were returned.',
        rows: bookingRows([
          `Service: ${summary?.service || shadowfaxServiceabilityForm.service}`,
          `Requested pincodes: ${requestedPincodes.join(', ') || pincodes}`,
          `Matched records: ${summary?.matched_count ?? 0}`,
          summary?.serviceable_count === null || summary?.serviceable_count === undefined
            ? ''
            : `Serviceable records: ${summary.serviceable_count}`,
          summary?.embargoed_count === null || summary?.embargoed_count === undefined
            ? ''
            : `Embargoed records: ${summary.embargoed_count}`,
          Array.isArray(summary?.returned_pincodes) && summary.returned_pincodes.length
            ? `Returned pincodes: ${summary.returned_pincodes.join(', ')}`
            : '',
          ...previewRows,
        ]),
        raw: response,
      })
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to check Shadowfax serviceability')
      setShadowfaxServiceabilityResult({
        title: 'Pincode serviceability',
        summary: err?.response?.data?.message || err?.message || 'Request failed',
        rows: ['Check pincodes and backend Shadowfax env settings, then retry.'],
        raw: err?.response?.data || null,
      })
    } finally {
      setShadowfaxServiceabilityBusy(false)
    }
  }

  const handleGenerateShadowfaxAwb = async () => {
    if (!isShadowfax) return

    const count = readText(shadowfaxAwbForm.count || '10')
    if (!count || Number(count) <= 0) {
      toast.error('AWB count must be greater than 0')
      return
    }

    try {
      setShadowfaxAwbBusy(true)
      const response = await generateShadowfaxAwbs({
        count,
        request_type: readText(shadowfaxAwbForm.requestType || 'FWD').toUpperCase(),
      })
      const summary = response?.awb || {}
      const awbs = Array.isArray(summary?.awb_numbers)
        ? summary.awb_numbers.map((entry: unknown) => readText(entry)).filter(Boolean)
        : []

      setShadowfaxAwbResult({
        title: 'AWB generation',
        summary: awbs.length
          ? `Shadowfax returned ${awbs.length} AWB number${awbs.length === 1 ? '' : 's'}.`
          : 'Shadowfax did not return any AWB numbers.',
        rows: bookingRows([
          `Request type: ${summary?.request_type || shadowfaxAwbForm.requestType}`,
          `Requested count: ${summary?.count_requested ?? count}`,
          `Received count: ${summary?.count_received ?? awbs.length}`,
          ...awbs.slice(0, 20).map((awb: string, index: number) => `AWB ${index + 1}: ${awb}`),
        ]),
        raw: response,
      })
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to generate Shadowfax AWB numbers')
      setShadowfaxAwbResult({
        title: 'AWB generation',
        summary: err?.response?.data?.message || err?.message || 'Request failed',
        rows: ['Check count, request type, and backend Shadowfax env settings.'],
        raw: err?.response?.data || null,
      })
    } finally {
      setShadowfaxAwbBusy(false)
    }
  }

  const handleCreateShadowfaxWarehouseOrder = async () => {
    if (!isShadowfax) return
    if (!selectedBookingOrder) {
      toast.error('Select an available order first')
      return
    }

    try {
      setShadowfaxOrderBusy(true)
      const response = await createShadowfaxWarehouseShipment(selectedBookingOrder)
      const shipment = response?.shipment || {}
      const reference =
        readText(shipment?.tracking_number) ||
        readText(shipment?.order_id) ||
        readText(shipment?.client_order_id)

      setShadowfaxOrderResult({
        title: 'Warehouse order creation',
        summary: reference
          ? `Shadowfax warehouse order created for ${selectedBookingOrder.orderNumber}.`
          : `Shadowfax warehouse request completed for ${selectedBookingOrder.orderNumber}.`,
        rows: bookingRows([
          `Order: ${selectedBookingOrder.orderNumber}`,
          `Customer: ${selectedBookingOrder.customerName}`,
          `Pincode: ${selectedBookingOrder.pincode || '-'}`,
          `Reference: ${reference || 'Not returned'}`,
          `Status: ${readText(shipment?.status) || 'Not returned'}`,
          `Payment mode: ${readText(shipment?.payment_mode || response?.payload?.order_details?.payment_mode) || 'Not returned'}`,
        ]),
        raw: response,
      })
      toast.success(
        reference
          ? `Shadowfax warehouse order created (${reference})`
          : 'Shadowfax warehouse order created'
      )
      setRefreshKey((current) => current + 1)
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to create Shadowfax warehouse order')
      setShadowfaxOrderResult({
        title: 'Warehouse order creation',
        summary: err?.response?.data?.message || err?.message || 'Request failed',
        rows: [
          'Run the serviceability check first and confirm the order shipping address and backend Shadowfax env settings.',
        ],
        raw: err?.response?.data || null,
      })
    } finally {
      setShadowfaxOrderBusy(false)
    }
  }

  const handleRunShadowfaxTracking = async () => {
    if (!isShadowfax) return

    const awbNumber = readText(shadowfaxTrackingForm.awbNumber)
    if (!awbNumber) {
      toast.error('AWB number is required')
      return
    }

    try {
      setShadowfaxTrackingBusy(true)
      const response = await fetchShadowfaxOrderDetails(awbNumber)
      const tracking = response?.tracking || {}
      const events = Array.isArray(tracking?.events) ? tracking.events : []

      setShadowfaxTrackingResult({
        title: 'Single Order Details V4',
        summary:
          readText(tracking?.status) ||
          readText(tracking?.status_id) ||
          'Tracking response received.',
        rows: bookingRows([
          `AWB: ${readText(tracking?.awb_number) || awbNumber}`,
          `Status ID: ${readText(tracking?.status_id) || 'Not returned'}`,
          `Status: ${readText(tracking?.status) || 'Not returned'}`,
          `Remark: ${readText(tracking?.remark) || 'Not returned'}`,
          `Event timestamp: ${readText(tracking?.event_timestamp) || 'Not returned'}`,
          ...events.slice(0, 12).map((event: any, index: number) => {
            const parts = [
              readText(event?.status_id),
              readText(event?.status),
              readText(event?.remark),
              readText(event?.event_timestamp),
            ].filter(Boolean)
            return `Event ${index + 1}: ${parts.join(' | ')}`
          }),
        ]),
        raw: response,
      })
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to fetch Shadowfax tracking')
      setShadowfaxTrackingResult({
        title: 'Single Order Details V4',
        summary: err?.response?.data?.message || err?.message || 'Request failed',
        rows: ['Check the AWB number and backend Shadowfax env settings, then retry.'],
        raw: err?.response?.data || null,
      })
    } finally {
      setShadowfaxTrackingBusy(false)
    }
  }

  const handleUpdateShadowfaxOrder = async () => {
    if (!isShadowfax) return

    const awbNumber = readText(shadowfaxUpdateForm.awbNumber)
    if (!awbNumber) {
      toast.error('AWB number is required')
      return
    }

    const deliveryDetails = buildShadowfaxUpdateSection({
      contact: shadowfaxUpdateForm.deliveryContact,
      customer_address: shadowfaxUpdateForm.deliveryAddress,
      pincode: shadowfaxUpdateForm.deliveryPincode,
    })
    const pickupDetails = buildShadowfaxUpdateSection({
      contact: shadowfaxUpdateForm.pickupContact,
      customer_address: shadowfaxUpdateForm.pickupAddress,
      pincode: shadowfaxUpdateForm.pickupPincode,
    })
    const orderDetails = buildShadowfaxUpdateSection({
      actual_weight: shadowfaxUpdateForm.actualWeight,
      volumetric_weight: shadowfaxUpdateForm.volumetricWeight,
    })
    const statusValue = readText(shadowfaxUpdateForm.status)
    const statusUpdate = statusValue ? { status: statusValue } : null

    if (!deliveryDetails && !pickupDetails && !orderDetails && !statusUpdate) {
      toast.error('Add at least one update field')
      return
    }

    try {
      setShadowfaxUpdateBusy(true)
      const response = await updateShadowfaxOrderData({
        awb_number: awbNumber,
        delivery_details: deliveryDetails,
        pickup_details: pickupDetails,
        order_details: orderDetails,
        status_update: statusUpdate,
      })
      const update = response?.update || {}
      const request = response?.request || {}
      const sentSections = Array.isArray(update?.sent_sections)
        ? update.sent_sections.map((entry: unknown) => readText(entry)).filter(Boolean)
        : []

      setShadowfaxUpdateResult({
        title: 'Update Order Data',
        summary:
          readText(update?.message) ||
          readText(update?.status) ||
          'Shadowfax order update response received.',
        rows: bookingRows([
          `AWB: ${readText(update?.awb_number) || awbNumber}`,
          `Status: ${readText(update?.status) || 'Not returned'}`,
          `Message: ${readText(update?.message) || 'Not returned'}`,
          sentSections.length ? `Updated sections: ${sentSections.join(', ')}` : '',
          request?.delivery_details ? 'Delivery details sent' : 'Delivery details: null',
          request?.pickup_details ? 'Pickup details sent' : 'Pickup details: null',
          request?.order_details ? 'Order details sent' : 'Order details: null',
          request?.status_update ? 'Status update sent' : 'Status update: null',
        ]),
        raw: response,
      })
      toast.success(`Shadowfax order update sent for ${awbNumber}`)
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update Shadowfax order')
      setShadowfaxUpdateResult({
        title: 'Update Order Data',
        summary: err?.response?.data?.message || err?.message || 'Request failed',
        rows: [
          'Check the AWB number, update rules for the current shipment state, and backend Shadowfax env settings.',
        ],
        raw: err?.response?.data || null,
      })
    } finally {
      setShadowfaxUpdateBusy(false)
    }
  }

  const handleCancelShadowfaxOrder = async () => {
    if (!isShadowfax) return

    const requestId = readText(shadowfaxCancelForm.requestId)
    const cancelRemarks = readText(shadowfaxCancelForm.cancelRemarks)

    if (!requestId) {
      toast.error('Request ID or AWB number is required')
      return
    }

    if (!cancelRemarks) {
      toast.error('Cancel remarks are required')
      return
    }

    try {
      setShadowfaxCancelBusy(true)
      const response = await cancelShadowfaxOrder({
        request_id: requestId,
        cancel_remarks: cancelRemarks,
      })
      const cancellation = response?.cancellation || {}
      const statusCode = Number(cancellation?.status_code || 0)
      const queueState = readText(cancellation?.cancellation_state)

      setShadowfaxCancelResult({
        title: 'Order Cancellation',
        summary:
          readText(cancellation?.message) ||
          (queueState === 'queued'
            ? 'Shadowfax queued the cancellation request.'
            : 'Shadowfax cancellation response received.'),
        rows: bookingRows([
          `Request ID: ${readText(cancellation?.request_id) || requestId}`,
          `Remote status code: ${statusCode || 'Not returned'}`,
          `Cancellation state: ${queueState || 'Not returned'}`,
          `Remarks: ${readText(cancellation?.cancel_remarks) || cancelRemarks}`,
          statusCode === 304
            ? 'Queued cancellation: the order is already in transit and will be cancelled at the next hub.'
            : '',
        ]),
        raw: response,
      })
      toast.success(
        statusCode === 304
          ? `Shadowfax queued cancellation for ${requestId}`
          : `Shadowfax cancellation sent for ${requestId}`
      )
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to cancel Shadowfax order')
      setShadowfaxCancelResult({
        title: 'Order Cancellation',
        summary: err?.response?.data?.message || err?.message || 'Request failed',
        rows: [
          'Check the AWB/request ID, ensure the shipment state still allows cancellation, and retry.',
        ],
        raw: err?.response?.data || null,
      })
    } finally {
      setShadowfaxCancelBusy(false)
    }
  }

  const handleCreateShadowfaxEscalation = async () => {
    if (!isShadowfax) return

    const awbNumber = readText(shadowfaxEscalationForm.awbNumber)
    const issueCategory = readText(shadowfaxEscalationForm.issueCategory)

    if (!awbNumber) {
      toast.error('AWB number is required')
      return
    }

    if (!issueCategory) {
      toast.error('Issue category is required')
      return
    }

    try {
      setShadowfaxEscalationBusy(true)
      const response = await createShadowfaxEscalation({
        awb_number: awbNumber,
        issue_category: issueCategory,
      })
      const escalation = response?.escalation || {}

      setShadowfaxEscalationResult({
        title: 'Escalation API',
        summary:
          readText(escalation?.message) ||
          readText(escalation?.status) ||
          'Shadowfax escalation response received.',
        rows: bookingRows([
          `AWB: ${readText(escalation?.awb_number) || awbNumber}`,
          `Issue category: ${readText(escalation?.issue_category) || issueCategory}`,
          `Status: ${readText(escalation?.status) || 'Not returned'}`,
          `Message: ${readText(escalation?.message) || 'Not returned'}`,
        ]),
        raw: response,
      })
      toast.success(`Shadowfax escalation submitted for ${awbNumber}`)
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to create Shadowfax escalation')
      setShadowfaxEscalationResult({
        title: 'Escalation API',
        summary: err?.response?.data?.message || err?.message || 'Request failed',
        rows: [
          'Check the AWB number, use a valid issue category, and confirm the shipment matches Shadowfax escalation rules.',
        ],
        raw: err?.response?.data || null,
      })
    } finally {
      setShadowfaxEscalationBusy(false)
    }
  }

  const handleFetchShadowfaxPodDetails = async () => {
    if (!isShadowfax) return

    const awbNumbers = parseShadowfaxAwbText(shadowfaxPodForm.awbNumbers)

    if (!awbNumbers.length) {
      toast.error('At least one AWB number is required')
      return
    }

    if (awbNumbers.length > 100) {
      toast.error('POD details supports up to 100 AWB numbers at once')
      return
    }

    try {
      setShadowfaxPodBusy(true)
      const response = await fetchShadowfaxPodDetails({
        awb_numbers: awbNumbers,
      })
      const pod = response?.pod || {}
      const records = Array.isArray(pod?.records) ? pod.records : []

      setShadowfaxPodResult({
        title: 'POD Details',
        summary:
          records.length > 0
            ? `Shadowfax returned POD data for ${records.length} shipment${records.length === 1 ? '' : 's'}.`
            : readText(pod?.message) || 'No POD records were returned.',
        rows: bookingRows([
          `Requested AWBs: ${Array.isArray(pod?.awb_numbers) ? pod.awb_numbers.length : awbNumbers.length}`,
          `Returned records: ${pod?.returned_count ?? records.length}`,
          readText(pod?.message) ? `Message: ${readText(pod.message)}` : '',
          ...records.slice(0, 20).map((record: any, index: number) => {
            const parts = [
              `AWB ${index + 1}: ${readText(record?.awb_number) || 'Not returned'}`,
              readText(record?.status) ? `Status ${readText(record.status)}` : '',
              readText(record?.recipient_name) ? `Recipient ${readText(record.recipient_name)}` : '',
              readText(record?.recipient_contact) ? `Contact ${readText(record.recipient_contact)}` : '',
              readText(record?.recipient_signature)
                ? `Signature ${readText(record.recipient_signature)}`
                : readText(record?.pod_url)
                  ? `POD ${readText(record.pod_url)}`
                  : '',
            ].filter(Boolean)
            return parts.join(' | ')
          }),
        ]),
        raw: response,
      })
      toast.success(`Shadowfax POD lookup completed for ${awbNumbers.length} AWB${awbNumbers.length === 1 ? '' : 's'}`)
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to fetch Shadowfax POD details')
      setShadowfaxPodResult({
        title: 'POD Details',
        summary: err?.response?.data?.message || err?.message || 'Request failed',
        rows: [
          'Check the AWB numbers, confirm the shipments are delivered or RTS delivered, and retry.',
        ],
        raw: err?.response?.data || null,
      })
    } finally {
      setShadowfaxPodBusy(false)
    }
  }

  const handleFetchDelhiveryBulkWaybill = async () => {
    if (partnerId !== 'delhivery') return
    const count = Number(delhiveryWaybillCount)
    if (!Number.isInteger(count) || count <= 0) {
      toast.error('Waybill count must be a positive integer')
      return
    }

    try {
      setDelhiveryWaybillBusy('bulk')
      const response = await fetchDelhiveryBulkWaybills({
        count,
        store: delhiveryWaybillStore,
      })
      const summary = response?.waybills || {}
      setDelhiveryWaybillResult({
        title: 'Bulk waybill fetch',
        summary: `Fetched ${summary?.fetched_count ?? 0} waybill(s).`,
        rows: bookingRows([
          `Requested count: ${summary?.requested_count ?? count}`,
          `Fetched count: ${summary?.fetched_count ?? 0}`,
          summary?.waybill ? `First waybill: ${summary.waybill}` : '',
          response?.stored ? 'Waybills stored in vendor pool.' : delhiveryWaybillStore ? 'Storage response not returned.' : 'Storage skipped.',
        ]),
        raw: response,
      })
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to fetch bulk waybills')
      setDelhiveryWaybillResult({
        title: 'Bulk waybill fetch',
        summary: err?.response?.data?.message || err?.message || 'Request failed',
        rows: ['Check count and Delhivery credentials, then retry.'],
        raw: err?.response?.data || null,
      })
    } finally {
      setDelhiveryWaybillBusy('')
    }
  }

  const handleFetchDelhiverySingleWaybillAction = async () => {
    if (partnerId !== 'delhivery') return

    try {
      setDelhiveryWaybillBusy('single')
      const response = await fetchDelhiverySingleWaybill({
        store: delhiveryWaybillStore,
      })
      const summary = response?.waybills || {}
      setDelhiveryWaybillResult({
        title: 'Single waybill fetch',
        summary: summary?.waybill
          ? `Fetched waybill ${summary.waybill}.`
          : 'Delhivery did not return a waybill.',
        rows: bookingRows([
          `Fetched count: ${summary?.fetched_count ?? 0}`,
          summary?.waybill ? `Waybill: ${summary.waybill}` : '',
          response?.stored ? 'Waybill stored in vendor pool.' : delhiveryWaybillStore ? 'Storage response not returned.' : 'Storage skipped.',
        ]),
        raw: response,
      })
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to fetch single waybill')
      setDelhiveryWaybillResult({
        title: 'Single waybill fetch',
        summary: err?.response?.data?.message || err?.message || 'Request failed',
        rows: ['Check Delhivery credentials, then retry.'],
        raw: err?.response?.data || null,
      })
    } finally {
      setDelhiveryWaybillBusy('')
    }
  }

  const handleCreateDelhiveryWarehouse = async () => {
    if (partnerId !== 'delhivery') return
    try {
      setDelhiveryWarehouseBusy('create')
      const response = await createDelhiveryWarehouse(delhiveryWarehouseForm)
      const warehouse = response?.warehouse || {}
      const pickupLocation = readText(response?.pickup_location || warehouse?.name)
      setDelhiveryWarehouseResult({
        title: 'Warehouse created',
        summary: pickupLocation
          ? `Warehouse ${pickupLocation} created successfully.`
          : 'Delhivery warehouse create response received.',
        rows: bookingRows([
          warehouse?.name ? `Name: ${warehouse.name}` : '',
          warehouse?.address ? `Address: ${warehouse.address}` : '',
          warehouse?.city ? `City: ${warehouse.city}` : '',
          warehouse?.pin ? `Pin: ${warehouse.pin}` : '',
          warehouse?.status ? `Status: ${warehouse.status}` : '',
          warehouse?.message ? `Message: ${warehouse.message}` : '',
        ]),
        raw: response,
      })
      if (pickupLocation) {
        setBookingForm((current) => ({ ...current, pickupLocation: current.pickupLocation || pickupLocation }))
        setDelhiveryWarehouseUpdateForm((current) => ({ ...current, name: current.name || pickupLocation }))
      }
      toast.success('Delhivery warehouse created')
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to create Delhivery warehouse')
      setDelhiveryWarehouseResult({
        title: 'Warehouse create',
        summary: err?.response?.data?.message || err?.message || 'Request failed',
        rows: ['Check required warehouse fields and retry.'],
        raw: err?.response?.data || null,
      })
    } finally {
      setDelhiveryWarehouseBusy('')
    }
  }

  const handleUpdateDelhiveryWarehouseAction = async () => {
    if (partnerId !== 'delhivery') return
    try {
      setDelhiveryWarehouseBusy('update')
      const response = await updateDelhiveryWarehouse(delhiveryWarehouseUpdateForm)
      const warehouse = response?.warehouse || {}
      setDelhiveryWarehouseResult({
        title: 'Warehouse updated',
        summary: warehouse?.name
          ? `Warehouse ${warehouse.name} updated successfully.`
          : 'Delhivery warehouse update response received.',
        rows: bookingRows([
          warehouse?.name ? `Name: ${warehouse.name}` : '',
          warehouse?.address ? `Address: ${warehouse.address}` : '',
          warehouse?.pin ? `Pin: ${warehouse.pin}` : '',
          warehouse?.phone ? `Phone: ${warehouse.phone}` : '',
          warehouse?.status ? `Status: ${warehouse.status}` : '',
          warehouse?.message ? `Message: ${warehouse.message}` : '',
        ]),
        raw: response,
      })
      toast.success('Delhivery warehouse updated')
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update Delhivery warehouse')
      setDelhiveryWarehouseResult({
        title: 'Warehouse update',
        summary: err?.response?.data?.message || err?.message || 'Request failed',
        rows: ['Provide warehouse name and at least one update field.'],
        raw: err?.response?.data || null,
      })
    } finally {
      setDelhiveryWarehouseBusy('')
    }
  }

  return (
    <>
      <div className='space-y-5'>
        <div className='overflow-hidden rounded-3xl border border-border bg-card shadow-sm'>
          <div className='bg-[linear-gradient(135deg,color-mix(in_srgb,var(--card)_94%,#cbd5e1_6%)_0%,color-mix(in_srgb,var(--background)_92%,#67e8f9_8%)_45%,color-mix(in_srgb,var(--card)_92%,#fdba74_8%)_100%)] p-6 md:p-8'>
            <div className='flex flex-wrap items-start justify-between gap-4'>
              {isDelhivery ? (
                <div className='space-y-2'>
                  <h1 className='text-3xl font-semibold tracking-tight text-foreground'>
                    Delhivery
                  </h1>
                  <p className='max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base'>
                    All available Delhivery APIs are managed here: create, edit, cancel, tracking,
                    label, pickup request, serviceability, shipping estimate, waybill pool, and
                    warehouse actions.
                  </p>
                </div>
              ) : (
                <div className='flex items-start gap-4'>
                  <div
                    className={`flex h-20 w-20 items-center justify-center rounded-3xl border bg-background shadow-sm ${partnerMeta.themeClass}`}
                  >
                    <img
                      src={partnerMeta.imageSrc}
                      alt={partnerMeta.title}
                      className='max-h-12 max-w-14 object-contain'
                    />
                  </div>
                  <div className='space-y-3'>
                    <Badge className='rounded-full border-border bg-background px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-foreground'>
                      Courier Page
                    </Badge>
                    <div>
                      <h1 className='text-3xl font-semibold tracking-tight text-foreground'>
                        {partnerMeta.title}
                      </h1>
                      <p className='mt-2 max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base'>
                        Dedicated request board for {partnerMeta.title}. Live courier records are
                        shown for integrated apps, while static partners still read from the local
                        courier desk assignment store.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              <div className='flex flex-wrap gap-2'>
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
                  asChild
                >
                  <Link to='/courier'>
                    Courier desk
                    <ArrowUpRight className='h-4 w-4' />
                  </Link>
                </Button>
              </div>
            </div>

            {!isDelhivery ? (
              <div className='mt-6 grid gap-3 md:grid-cols-3'>
                <div className='rounded-2xl border border-border/70 bg-card/85 p-4 shadow-sm backdrop-blur-sm'>
                  <p className='text-[11px] uppercase tracking-[0.18em] text-muted-foreground'>
                    Assigned requests
                  </p>
                  <p className='mt-1 text-3xl font-semibold text-foreground'>
                    {assignments.length}
                  </p>
                </div>
                <div className='rounded-2xl border border-border/70 bg-card/85 p-4 shadow-sm backdrop-blur-sm'>
                  <p className='text-[11px] uppercase tracking-[0.18em] text-muted-foreground'>
                    Estimated charges
                  </p>
                  <p className='mt-1 text-3xl font-semibold text-foreground'>
                    {formatINR(totalCharges)}
                  </p>
                </div>
                <div className='rounded-2xl border border-border/70 bg-card/85 p-4 shadow-sm backdrop-blur-sm'>
                  <p className='text-[11px] uppercase tracking-[0.18em] text-muted-foreground'>
                    Order value routed
                  </p>
                  <p className='mt-1 text-3xl font-semibold text-foreground'>
                    {formatINR(totalGMV)}
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <Card className='border-border bg-card shadow-sm'>
          <CardHeader>
            <CardTitle className='text-lg'>
              {partnerId === 'delhivery'
                ? 'Create shipment API'
                : partnerId === 'shadowfax'
                  ? 'Shadowfax desk'
                : `${partnerMeta.title} booking flow`}
            </CardTitle>
            <CardDescription>
              {partnerId === 'delhivery'
                ? 'Use Delhivery manifest create API for an order that is not already assigned.'
                : partnerId === 'shadowfax'
                  ? 'Shadowfax marketplace orders are created from the delivery dashboard, and this page also supports warehouse-model creation, serviceability checks, AWB generation, and routed-order status.'
                : 'Use this app page for partner-specific monitoring. Booking is not enabled here yet.'}
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-6'>
            {partnerId === 'delhivery' ? (
              <>
                {eligibleOrders.length === 0 ? (
                  <div className='rounded-2xl border border-dashed border-border bg-muted/40 p-6 text-sm text-muted-foreground'>
                    No unassigned orders available. Active shipments have moved to Courier List.
                  </div>
                ) : (
                  <>
                    <div className='grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]'>
                      <div className='space-y-2'>
                        <label className='text-sm font-medium text-foreground'>Order</label>
                        <select
                          value={selectedBookingOrderId}
                          onChange={(e) => {
                            const nextOrder =
                              eligibleOrders.find((order) => order.id === e.target.value) || null
                            setSelectedBookingOrderId(e.target.value)
                            if (nextOrder) applyOrderToBookingForm(nextOrder)
                          }}
                          className='vendor-field flex h-11 w-full rounded-none border bg-transparent px-4 py-2 text-sm shadow-sm outline-none'
                        >
                          <option value=''>Select order</option>
                          {eligibleOrders.map((order) => (
                            <option key={order.id} value={order.id}>
                              {order.orderNumber} | {order.customerName} | {order.pincode || 'No pincode'}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className='flex items-end'>
                        <Button
                          variant='outline'
                          className='border-border bg-background text-foreground hover:bg-accent hover:text-foreground'
                          onClick={() => applyOrderToBookingForm(selectedBookingOrder)}
                        >
                          Use selected order
                        </Button>
                      </div>
                    </div>

                    {selectedBookingOrder ? (
                      <div className='rounded-2xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground'>
                        <p className='font-medium text-foreground'>
                          {selectedBookingOrder.orderNumber} | {selectedBookingOrder.customerName}
                        </p>
                        <p className='mt-1'>
                          {selectedBookingOrder.pincode || 'No pincode'} | {formatINR(selectedBookingOrder.total)} |{' '}
                          {selectedBookingOrder.itemsCount} item(s)
                        </p>
                      </div>
                    ) : null}

                    <div className='grid gap-4 lg:grid-cols-2 xl:grid-cols-4'>
                      <div className='space-y-2'>
                        <label className='text-sm font-medium text-foreground'>Origin pincode</label>
                        <Input
                          value={bookingForm.origin}
                          onChange={(e) =>
                            setBookingForm((current) => ({ ...current, origin: e.target.value }))
                          }
                          placeholder='110001'
                        />
                      </div>
                      <div className='space-y-2'>
                        <label className='text-sm font-medium text-foreground'>Destination pincode</label>
                        <Input
                          value={bookingForm.destination}
                          onChange={(e) =>
                            setBookingForm((current) => ({ ...current, destination: e.target.value }))
                          }
                          placeholder='201306'
                        />
                      </div>
                        <div className='space-y-2'>
                          <label className='text-sm font-medium text-foreground'>Delhivery pickup location</label>
                          <Input
                            value={bookingForm.pickupLocation}
                            onChange={(e) =>
                              setBookingForm((current) => ({
                                ...current,
                                pickupLocation: e.target.value,
                              }))
                            }
                            placeholder='warehouse_name'
                          />
                        </div>
                      <div className='space-y-2'>
                        <label className='text-sm font-medium text-foreground'>Payment mode</label>
                        <select
                          value={bookingForm.paymentType}
                          onChange={(e) =>
                            setBookingForm((current) => ({
                              ...current,
                              paymentType: e.target.value as 'prepaid' | 'cod',
                            }))
                          }
                          className='vendor-field flex h-11 w-full rounded-none border bg-transparent px-4 py-2 text-sm shadow-sm outline-none'
                        >
                          <option value='prepaid'>Prepaid</option>
                          <option value='cod'>COD</option>
                        </select>
                      </div>
                      <div className='space-y-2'>
                        <label className='text-sm font-medium text-foreground'>Product type</label>
                        <select
                          value={bookingForm.productType}
                          onChange={(e) =>
                            setBookingForm((current) => ({
                              ...current,
                              productType: e.target.value as 'standard' | 'heavy',
                            }))
                          }
                          className='vendor-field flex h-11 w-full rounded-none border bg-transparent px-4 py-2 text-sm shadow-sm outline-none'
                        >
                          <option value='standard'>Standard</option>
                          <option value='heavy'>Heavy</option>
                        </select>
                      </div>
                      <div className='space-y-2'>
                        <label className='text-sm font-medium text-foreground'>Shipping mode</label>
                        <select
                          value={bookingForm.shippingMode}
                          onChange={(e) =>
                            setBookingForm((current) => ({
                              ...current,
                              shippingMode: e.target.value as 'surface' | 'express',
                            }))
                          }
                          className='vendor-field flex h-11 w-full rounded-none border bg-transparent px-4 py-2 text-sm shadow-sm outline-none'
                        >
                          <option value='surface'>Surface</option>
                          <option value='express'>Express</option>
                        </select>
                      </div>
                      <div className='space-y-2'>
                        <label className='text-sm font-medium text-foreground'>Billing status</label>
                        <select
                          value={bookingForm.billingStatus}
                          onChange={(e) =>
                            setBookingForm((current) => ({
                              ...current,
                              billingStatus: e.target.value as 'Delivered' | 'RTO' | 'DTO',
                            }))
                          }
                          className='vendor-field flex h-11 w-full rounded-none border bg-transparent px-4 py-2 text-sm shadow-sm outline-none'
                        >
                          <option value='Delivered'>Delivered</option>
                          <option value='RTO'>RTO</option>
                          <option value='DTO'>DTO</option>
                        </select>
                      </div>
                      <div className='space-y-2'>
                        <label className='text-sm font-medium text-foreground'>Package type</label>
                        <select
                          value={bookingForm.packageType}
                          onChange={(e) =>
                            setBookingForm((current) => ({
                              ...current,
                              packageType: e.target.value as 'box' | 'flyer',
                            }))
                          }
                          className='vendor-field flex h-11 w-full rounded-none border bg-transparent px-4 py-2 text-sm shadow-sm outline-none'
                        >
                          <option value='box'>Box</option>
                          <option value='flyer'>Flyer</option>
                        </select>
                      </div>
                      <div className='space-y-2'>
                        <label className='text-sm font-medium text-foreground'>Order amount</label>
                        <Input
                          value={bookingForm.orderAmount}
                          onChange={(e) =>
                            setBookingForm((current) => ({
                              ...current,
                              orderAmount: e.target.value,
                            }))
                          }
                          placeholder='1000'
                        />
                      </div>
                      <div className='space-y-2'>
                        <label className='text-sm font-medium text-foreground'>Weight (grams)</label>
                        <Input
                          value={bookingForm.weight}
                          onChange={(e) =>
                            setBookingForm((current) => ({ ...current, weight: e.target.value }))
                          }
                          placeholder='500'
                        />
                      </div>
                      <div className='space-y-2'>
                        <label className='text-sm font-medium text-foreground'>Length (cm)</label>
                        <Input
                          value={bookingForm.length}
                          onChange={(e) =>
                            setBookingForm((current) => ({ ...current, length: e.target.value }))
                          }
                          placeholder='10'
                        />
                      </div>
                      <div className='space-y-2'>
                        <label className='text-sm font-medium text-foreground'>Breadth (cm)</label>
                        <Input
                          value={bookingForm.breadth}
                          onChange={(e) =>
                            setBookingForm((current) => ({ ...current, breadth: e.target.value }))
                          }
                          placeholder='10'
                        />
                      </div>
                      <div className='space-y-2'>
                        <label className='text-sm font-medium text-foreground'>Height (cm)</label>
                        <Input
                          value={bookingForm.height}
                          onChange={(e) =>
                            setBookingForm((current) => ({ ...current, height: e.target.value }))
                          }
                          placeholder='10'
                        />
                      </div>
                      <div className='space-y-2 xl:col-span-3'>
                        <label className='text-sm font-medium text-foreground'>Product details</label>
                        <Textarea
                          value={bookingForm.details}
                          onChange={(e) =>
                            setBookingForm((current) => ({ ...current, details: e.target.value }))
                          }
                          placeholder='Product names or parcel note'
                          className='min-h-[88px] rounded-none border-border bg-background text-foreground'
                        />
                      </div>
                    </div>

                    <div className='flex flex-wrap gap-3'>
                      <Button
                        className='rounded-none bg-primary text-primary-foreground hover:bg-primary/90'
                        disabled={checkingBooking || !selectedBookingOrder}
                        onClick={() => {
                          void handleCheckBooking()
                        }}
                      >
                        {checkingBooking ? (
                          <LoaderCircle className='h-4 w-4 animate-spin' />
                        ) : (
                          <Search className='h-4 w-4' />
                        )}
                        {checkingBooking ? `Checking ${partnerMeta.title}` : `Check ${partnerMeta.title}`}
                      </Button>
                      <Button
                        variant='outline'
                        className='border-border bg-background text-foreground hover:bg-accent hover:text-foreground'
                        disabled={!bookingCheck?.ok || bookingBusy || !selectedBookingOrder}
                        onClick={() => {
                          void handleCreateBooking()
                        }}
                      >
                        {bookingBusy ? (
                          <LoaderCircle className='h-4 w-4 animate-spin' />
                        ) : null}
                        Create shipment
                      </Button>
                    </div>

                    {bookingCheck ? (
                      <div
                        className={`rounded-2xl border p-4 text-sm ${
                          bookingCheck.ok
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                            : 'border-amber-200 bg-amber-50 text-amber-700'
                        }`}
                      >
                        <p className='font-medium'>{bookingCheck.summary}</p>
                        <div className='mt-3 space-y-1'>
                          {bookingCheck.rows.map((row) => (
                            <p key={row}>{row}</p>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </>
                )}
              </>
            ) : (
              <div className='rounded-2xl border border-border bg-muted/40 p-6 text-sm text-muted-foreground'>
                This courier app is no longer available.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className='border-border bg-card shadow-sm'>
          <CardHeader>
            <CardTitle className='text-lg'>
              {partnerId === 'delhivery' ? 'Shipment operation APIs' : 'Assigned delivery requests'}
            </CardTitle>
            <CardDescription>
              {partnerId === 'delhivery'
                ? 'Track, cancel, generate label, request pickup, and edit live Delhivery shipments.'
                : 'This page is powered by the courier desk assignment store for now.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className='rounded-2xl border border-border bg-muted/40 p-8 text-sm text-muted-foreground'>
                Loading {partnerMeta.title} records...
              </div>
            ) : error ? (
              <div className='rounded-2xl border border-rose-200 bg-rose-50 p-8 text-sm text-rose-700'>
                {error}
              </div>
            ) : assignments.length === 0 ? (
              <div className='rounded-2xl border border-dashed border-border bg-muted/40 p-8 text-sm text-muted-foreground'>
                No requests assigned to {partnerMeta.title} yet.
              </div>
            ) : (
              <div className='overflow-hidden rounded-2xl border border-border'>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Tracking</TableHead>
                      <TableHead>Charge</TableHead>
                      <TableHead>ETA</TableHead>
                      {partnerId === 'delhivery' && <TableHead className='text-right'>Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assignments.map(({ assignment, order }) => (
                      <TableRow key={`${assignment.partnerId}-${assignment.orderId}`}>
                        <TableCell>
                          <div className='space-y-1'>
                            <p className='font-medium text-foreground'>{assignment.orderNumber}</p>
                            <p className='text-xs text-muted-foreground'>
                              {assignment.customerName} | {assignment.websiteLabel}
                            </p>

                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className='border-amber-200 bg-amber-50 text-amber-700'>
                            {assignment.trackingStatus}
                          </Badge>
                        </TableCell>
                        <TableCell>
                            <div className='space-y-1'>
                              <p className='text-sm font-medium text-foreground'>
                                {assignment.trackingCode}
                              </p>
                              {partnerId === 'delhivery' &&
                              order?.delhivery?.pickup_request_date ? (
                                <p className='text-xs text-muted-foreground'>
                                  Pickup request: {order.delhivery.pickup_request_date}{' '}
                                  {order.delhivery.pickup_request_time || ''} |{' '}
                                  {order.delhivery.pickup_request_packages || 0} pkg
                                </p>
                              ) : null}
                            <div className='flex flex-wrap gap-3 text-xs'>
                              {partnerId === 'delhivery' && order?.delhivery?.label_url ? (
                                <a
                                  href={order.delhivery.label_url}
                                  target='_blank'
                                  rel='noreferrer'
                                  className='inline-flex items-center gap-1 font-medium text-indigo-600 hover:underline'
                                >
                                  Shipping label
                                  <ExternalLink className='h-3 w-3' />
                                </a>
                              ) : null}

                            </div>
                          </div>
                        </TableCell>
                        <TableCell className='font-medium text-foreground'>
                          {assignment.amount ? formatINR(assignment.amount) : 'Live'}
                        </TableCell>
                        <TableCell>
                          <div className='inline-flex items-center gap-2 text-sm text-muted-foreground'>
                            <Clock3 className='h-4 w-4 text-muted-foreground' />
                            {assignment.etaLabel}
                          </div>
                        </TableCell>
                        {partnerId === 'delhivery' && (
                          <TableCell className='text-right'>
                            <div className='flex flex-wrap justify-end gap-2'>

                              {partnerId === 'delhivery' ? (
                                <>
                                  <Button
                                    size='sm'
                                    variant='outline'
                                    className='border-border bg-background text-foreground hover:bg-accent hover:text-foreground'
                                    disabled={busyOrderId === order?.id || !order}
                                    onClick={() => {
                                      void handleRefreshDelhiveryTracking(order)
                                    }}
                                  >
                                    {busyOrderId === order?.id && busyAction === 'track'
                                      ? 'Refreshing'
                                      : 'Track'}
                                  </Button>
                                  {String(assignment.trackingStatus || '').toLowerCase() !==
                                  'cancelled' ? (
                                    <Button
                                      size='sm'
                                      variant='outline'
                                      className='border-rose-500/30 bg-background text-rose-600 hover:bg-rose-500/10 hover:text-rose-600 dark:text-rose-300'
                                      disabled={busyOrderId === order?.id || !order}
                                      onClick={() => {
                                        void handleCancelDelhiveryShipment(order)
                                      }}
                                    >
                                      {busyOrderId === order?.id && busyAction === 'cancel'
                                        ? 'Cancelling'
                                        : 'Cancel'}
                                    </Button>
                                  ) : null}
                                  <Button
                                    size='sm'
                                    variant='outline'
                                    className='border-border bg-background text-foreground hover:bg-accent hover:text-foreground'
                                    disabled={busyOrderId === order?.id || !order}
                                    onClick={() => {
                                      void handleGenerateDelhiveryLabel(order)
                                    }}
                                  >
                                    {busyOrderId === order?.id && busyAction === 'label'
                                      ? 'Generating'
                                      : 'Label'}
                                  </Button>
                                  <Button
                                    size='sm'
                                    variant='outline'
                                    className='border-border bg-background text-foreground hover:bg-accent hover:text-foreground'
                                    disabled={busyOrderId === order?.id || !order}
                                    onClick={() => {
                                      void handleCreateDelhiveryPickupRequest(order)
                                    }}
                                  >
                                    {busyOrderId === order?.id && busyAction === 'pickup'
                                      ? 'Creating'
                                      : 'Pickup request'}
                                  </Button>
                                  <Button
                                    size='sm'
                                    variant='outline'
                                    className='border-border bg-background text-foreground hover:bg-accent hover:text-foreground'
                                    disabled={busyOrderId === order?.id || !order}
                                    onClick={() => {
                                      openDelhiveryEdit(order)
                                    }}
                                  >
                                    {busyOrderId === order?.id && busyAction === 'edit'
                                      ? 'Saving'
                                      : 'Edit shipment'}
                                  </Button>
                                </>
                              ) : null}
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {isDelhivery ? (
          <div className='grid gap-4 xl:grid-cols-2'>
            <Card className='border-slate-200 shadow-sm'>
              <CardHeader>
                <CardTitle className='text-base'>Lane APIs</CardTitle>
                <CardDescription>
                  B2C serviceability, Heavy serviceability, and shipping estimate.
                </CardDescription>
              </CardHeader>
              <CardContent className='space-y-4'>
                <div className='grid gap-4 sm:grid-cols-2'>
                  <div className='space-y-2'>
                    <label className='text-sm font-medium text-slate-700'>Origin pincode</label>
                    <Input
                      value={bookingForm.origin}
                      onChange={(e) =>
                        setBookingForm((current) => ({ ...current, origin: e.target.value }))
                      }
                      placeholder='110001'
                    />
                  </div>
                  <div className='space-y-2'>
                    <label className='text-sm font-medium text-slate-700'>Destination pincode</label>
                    <Input
                      value={bookingForm.destination}
                      onChange={(e) =>
                        setBookingForm((current) => ({ ...current, destination: e.target.value }))
                      }
                      placeholder='201306'
                    />
                  </div>
                  <div className='space-y-2'>
                    <label className='text-sm font-medium text-slate-700'>Weight (grams)</label>
                    <Input
                      value={bookingForm.weight}
                      onChange={(e) =>
                        setBookingForm((current) => ({ ...current, weight: e.target.value }))
                      }
                      placeholder='500'
                    />
                  </div>
                  <div className='space-y-2'>
                    <label className='text-sm font-medium text-slate-700'>Pickup location</label>
                    <Input
                      value={bookingForm.pickupLocation}
                      onChange={(e) =>
                        setBookingForm((current) => ({ ...current, pickupLocation: e.target.value }))
                      }
                      placeholder='warehouse_name'
                    />
                  </div>
                </div>
                <div className='flex flex-wrap gap-2'>
                  <Button
                    variant='outline'
                    className='border-slate-200 bg-white hover:bg-slate-50'
                    disabled={Boolean(delhiveryLaneBusy)}
                    onClick={() => {
                      void handleRunDelhiveryLaneApi('b2c')
                    }}
                  >
                    {delhiveryLaneBusy === 'b2c' ? (
                      <LoaderCircle className='h-4 w-4 animate-spin' />
                    ) : null}
                    B2C serviceability
                  </Button>
                  <Button
                    variant='outline'
                    className='border-slate-200 bg-white hover:bg-slate-50'
                    disabled={Boolean(delhiveryLaneBusy)}
                    onClick={() => {
                      void handleRunDelhiveryLaneApi('heavy')
                    }}
                  >
                    {delhiveryLaneBusy === 'heavy' ? (
                      <LoaderCircle className='h-4 w-4 animate-spin' />
                    ) : null}
                    Heavy serviceability
                  </Button>
                  <Button
                    variant='outline'
                    className='border-slate-200 bg-white hover:bg-slate-50'
                    disabled={Boolean(delhiveryLaneBusy)}
                    onClick={() => {
                      void handleRunDelhiveryLaneApi('estimate')
                    }}
                  >
                    {delhiveryLaneBusy === 'estimate' ? (
                      <LoaderCircle className='h-4 w-4 animate-spin' />
                    ) : null}
                    Shipping estimate
                  </Button>
                </div>
                {delhiveryLaneResult ? (
                  <div className='rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700'>
                    <p className='font-medium text-slate-950'>{delhiveryLaneResult.title}</p>
                    <p className='mt-2'>{delhiveryLaneResult.summary}</p>
                    <div className='mt-3 space-y-1'>
                      {delhiveryLaneResult.rows.map((row) => (
                        <p key={row}>{row}</p>
                      ))}
                    </div>
                    {delhiveryLaneResult.raw ? (
                      <pre className='mt-4 overflow-x-auto rounded-xl bg-white p-3 text-xs text-slate-600'>
                        {JSON.stringify(delhiveryLaneResult.raw, null, 2)}
                      </pre>
                    ) : null}
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card className='border-slate-200 shadow-sm'>
              <CardHeader>
                <CardTitle className='text-base'>Waybill APIs</CardTitle>
                <CardDescription>
                  Fetch bulk or single waybills and optionally store them for this vendor.
                </CardDescription>
              </CardHeader>
              <CardContent className='space-y-4'>
                <div className='grid gap-4 sm:grid-cols-[160px_1fr]'>
                  <div className='space-y-2'>
                    <label className='text-sm font-medium text-slate-700'>Bulk count</label>
                    <Input
                      value={delhiveryWaybillCount}
                      onChange={(e) => setDelhiveryWaybillCount(e.target.value)}
                      placeholder='10'
                    />
                  </div>
                  <div className='space-y-2'>
                    <label className='text-sm font-medium text-slate-700'>Store fetched waybills</label>
                    <select
                      value={delhiveryWaybillStore ? 'yes' : 'no'}
                      onChange={(e) => setDelhiveryWaybillStore(e.target.value === 'yes')}
                      className='vendor-field flex h-11 w-full rounded-none border bg-transparent px-4 py-2 text-sm shadow-sm outline-none'
                    >
                      <option value='yes'>Yes</option>
                      <option value='no'>No</option>
                    </select>
                  </div>
                </div>
                <div className='flex flex-wrap gap-2'>
                  <Button
                    variant='outline'
                    className='border-slate-200 bg-white hover:bg-slate-50'
                    disabled={Boolean(delhiveryWaybillBusy)}
                    onClick={() => {
                      void handleFetchDelhiveryBulkWaybill()
                    }}
                  >
                    {delhiveryWaybillBusy === 'bulk' ? (
                      <LoaderCircle className='h-4 w-4 animate-spin' />
                    ) : null}
                    Fetch bulk waybills
                  </Button>
                  <Button
                    variant='outline'
                    className='border-slate-200 bg-white hover:bg-slate-50'
                    disabled={Boolean(delhiveryWaybillBusy)}
                    onClick={() => {
                      void handleFetchDelhiverySingleWaybillAction()
                    }}
                  >
                    {delhiveryWaybillBusy === 'single' ? (
                      <LoaderCircle className='h-4 w-4 animate-spin' />
                    ) : null}
                    Fetch single waybill
                  </Button>
                </div>
                {delhiveryWaybillResult ? (
                  <div className='rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700'>
                    <p className='font-medium text-slate-950'>{delhiveryWaybillResult.title}</p>
                    <p className='mt-2'>{delhiveryWaybillResult.summary}</p>
                    <div className='mt-3 space-y-1'>
                      {delhiveryWaybillResult.rows.map((row) => (
                        <p key={row}>{row}</p>
                      ))}
                    </div>
                    {delhiveryWaybillResult.raw ? (
                      <pre className='mt-4 overflow-x-auto rounded-xl bg-white p-3 text-xs text-slate-600'>
                        {JSON.stringify(delhiveryWaybillResult.raw, null, 2)}
                      </pre>
                    ) : null}
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card className='border-slate-200 shadow-sm xl:col-span-2'>
              <CardHeader>
                <CardTitle className='text-base'>Warehouse APIs</CardTitle>
                <CardDescription>
                  Create a new Delhivery warehouse or update an existing pickup location.
                </CardDescription>
              </CardHeader>
              <CardContent className='grid gap-6 xl:grid-cols-2'>
                <div className='space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4'>
                  <div>
                    <p className='font-medium text-slate-950'>Create warehouse</p>
                    <p className='text-sm text-slate-600'>
                      Full client warehouse create API fields.
                    </p>
                  </div>
                  <div className='grid gap-4 sm:grid-cols-2'>
                    <div className='space-y-2'>
                      <label className='text-sm font-medium text-slate-700'>Name</label>
                      <Input value={delhiveryWarehouseForm.name} onChange={(e) => setDelhiveryWarehouseForm((current) => ({ ...current, name: e.target.value }))} placeholder='warehouse_name' />
                    </div>
                    <div className='space-y-2'>
                      <label className='text-sm font-medium text-slate-700'>Registered name</label>
                      <Input value={delhiveryWarehouseForm.registered_name} onChange={(e) => setDelhiveryWarehouseForm((current) => ({ ...current, registered_name: e.target.value }))} placeholder='Business legal name' />
                    </div>
                    <div className='space-y-2'>
                      <label className='text-sm font-medium text-slate-700'>Phone</label>
                      <Input value={delhiveryWarehouseForm.phone} onChange={(e) => setDelhiveryWarehouseForm((current) => ({ ...current, phone: e.target.value }))} placeholder='9999999999' />
                    </div>
                    <div className='space-y-2'>
                      <label className='text-sm font-medium text-slate-700'>Email</label>
                      <Input value={delhiveryWarehouseForm.email} onChange={(e) => setDelhiveryWarehouseForm((current) => ({ ...current, email: e.target.value }))} placeholder='name@example.com' />
                    </div>
                    <div className='space-y-2 sm:col-span-2'>
                      <label className='text-sm font-medium text-slate-700'>Address</label>
                      <Textarea value={delhiveryWarehouseForm.address} onChange={(e) => setDelhiveryWarehouseForm((current) => ({ ...current, address: e.target.value }))} className='min-h-[88px] rounded-none border-slate-200' placeholder='Warehouse address' />
                    </div>
                    <div className='space-y-2'>
                      <label className='text-sm font-medium text-slate-700'>City</label>
                      <Input value={delhiveryWarehouseForm.city} onChange={(e) => setDelhiveryWarehouseForm((current) => ({ ...current, city: e.target.value }))} placeholder='Greater Noida' />
                    </div>
                    <div className='space-y-2'>
                      <label className='text-sm font-medium text-slate-700'>Pin</label>
                      <Input value={delhiveryWarehouseForm.pin} onChange={(e) => setDelhiveryWarehouseForm((current) => ({ ...current, pin: e.target.value }))} placeholder='201306' />
                    </div>
                    <div className='space-y-2'>
                      <label className='text-sm font-medium text-slate-700'>Country</label>
                      <Input value={delhiveryWarehouseForm.country} onChange={(e) => setDelhiveryWarehouseForm((current) => ({ ...current, country: e.target.value }))} placeholder='India' />
                    </div>
                    <div className='space-y-2 sm:col-span-2'>
                      <label className='text-sm font-medium text-slate-700'>Return address</label>
                      <Textarea value={delhiveryWarehouseForm.return_address} onChange={(e) => setDelhiveryWarehouseForm((current) => ({ ...current, return_address: e.target.value }))} className='min-h-[88px] rounded-none border-slate-200' placeholder='Return address' />
                    </div>
                    <div className='space-y-2'>
                      <label className='text-sm font-medium text-slate-700'>Return city</label>
                      <Input value={delhiveryWarehouseForm.return_city} onChange={(e) => setDelhiveryWarehouseForm((current) => ({ ...current, return_city: e.target.value }))} placeholder='Greater Noida' />
                    </div>
                    <div className='space-y-2'>
                      <label className='text-sm font-medium text-slate-700'>Return pin</label>
                      <Input value={delhiveryWarehouseForm.return_pin} onChange={(e) => setDelhiveryWarehouseForm((current) => ({ ...current, return_pin: e.target.value }))} placeholder='201306' />
                    </div>
                    <div className='space-y-2'>
                      <label className='text-sm font-medium text-slate-700'>Return state</label>
                      <Input value={delhiveryWarehouseForm.return_state} onChange={(e) => setDelhiveryWarehouseForm((current) => ({ ...current, return_state: e.target.value }))} placeholder='Uttar Pradesh' />
                    </div>
                    <div className='space-y-2'>
                      <label className='text-sm font-medium text-slate-700'>Return country</label>
                      <Input value={delhiveryWarehouseForm.return_country} onChange={(e) => setDelhiveryWarehouseForm((current) => ({ ...current, return_country: e.target.value }))} placeholder='India' />
                    </div>
                  </div>
                  <Button className='bg-slate-950 text-white hover:bg-slate-800' disabled={Boolean(delhiveryWarehouseBusy)} onClick={() => { void handleCreateDelhiveryWarehouse() }}>
                    {delhiveryWarehouseBusy === 'create' ? <LoaderCircle className='h-4 w-4 animate-spin' /> : null}
                    Create warehouse
                  </Button>
                </div>

                <div className='space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4'>
                  <div>
                    <p className='font-medium text-slate-950'>Update warehouse</p>
                    <p className='text-sm text-slate-600'>
                      Update API for address, pin, or phone changes.
                    </p>
                  </div>
                  <div className='grid gap-4 sm:grid-cols-2'>
                    <div className='space-y-2 sm:col-span-2'>
                      <label className='text-sm font-medium text-slate-700'>Warehouse name</label>
                      <Input value={delhiveryWarehouseUpdateForm.name} onChange={(e) => setDelhiveryWarehouseUpdateForm((current) => ({ ...current, name: e.target.value }))} placeholder='warehouse_name' />
                    </div>
                    <div className='space-y-2 sm:col-span-2'>
                      <label className='text-sm font-medium text-slate-700'>Address</label>
                      <Textarea value={delhiveryWarehouseUpdateForm.address} onChange={(e) => setDelhiveryWarehouseUpdateForm((current) => ({ ...current, address: e.target.value }))} className='min-h-[88px] rounded-none border-slate-200' placeholder='Updated address' />
                    </div>
                    <div className='space-y-2'>
                      <label className='text-sm font-medium text-slate-700'>Pin</label>
                      <Input value={delhiveryWarehouseUpdateForm.pin} onChange={(e) => setDelhiveryWarehouseUpdateForm((current) => ({ ...current, pin: e.target.value }))} placeholder='201306' />
                    </div>
                    <div className='space-y-2'>
                      <label className='text-sm font-medium text-slate-700'>Phone</label>
                      <Input value={delhiveryWarehouseUpdateForm.phone} onChange={(e) => setDelhiveryWarehouseUpdateForm((current) => ({ ...current, phone: e.target.value }))} placeholder='9999999999' />
                    </div>
                  </div>
                  <Button variant='outline' className='border-slate-200 bg-white hover:bg-slate-50' disabled={Boolean(delhiveryWarehouseBusy)} onClick={() => { void handleUpdateDelhiveryWarehouseAction() }}>
                    {delhiveryWarehouseBusy === 'update' ? <LoaderCircle className='h-4 w-4 animate-spin' /> : null}
                    Update warehouse
                  </Button>
                  {delhiveryWarehouseResult ? (
                    <div className='rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700'>
                      <p className='font-medium text-slate-950'>{delhiveryWarehouseResult.title}</p>
                      <p className='mt-2'>{delhiveryWarehouseResult.summary}</p>
                      <div className='mt-3 space-y-1'>
                        {delhiveryWarehouseResult.rows.map((row) => (
                          <p key={row}>{row}</p>
                        ))}
                      </div>
                      {delhiveryWarehouseResult.raw ? (
                        <pre className='mt-4 overflow-x-auto rounded-xl bg-slate-50 p-3 text-xs text-slate-600'>
                          {JSON.stringify(delhiveryWarehouseResult.raw, null, 2)}
                        </pre>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null}

        {!isDelhivery ? (
          <div className='space-y-4'>
            {isShadowfax ? (
              <div className='grid gap-4 xl:grid-cols-2 2xl:grid-cols-8'>
                <Card className='border-border bg-card shadow-sm'>
                  <CardHeader>
                    <CardTitle className='text-base'>Warehouse Order API</CardTitle>
                    <CardDescription>
                      Create a Shadowfax warehouse-model order from an unassigned dashboard order. Run serviceability first for the destination pincode.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className='space-y-4'>
                    {eligibleOrders.length === 0 ? (
                      <div className='rounded-2xl border border-dashed border-border bg-muted/40 p-4 text-sm text-muted-foreground'>
                        No unassigned orders are available for Shadowfax warehouse creation.
                      </div>
                    ) : (
                      <>
                        <div className='space-y-2'>
                          <label className='text-sm font-medium text-foreground'>Order</label>
                          <select
                            value={selectedBookingOrderId}
                            onChange={(e) => {
                              const nextOrder =
                                eligibleOrders.find((order) => order.id === e.target.value) || null
                              setSelectedBookingOrderId(e.target.value)
                              if (nextOrder) applyOrderToBookingForm(nextOrder)
                            }}
                            className='vendor-field flex h-11 w-full rounded-none border bg-transparent px-4 py-2 text-sm shadow-sm outline-none'
                          >
                            <option value=''>Select order</option>
                            {eligibleOrders.map((order) => (
                              <option key={order.id} value={order.id}>
                                {order.orderNumber} | {order.customerName} | {order.pincode || 'No pincode'}
                              </option>
                            ))}
                          </select>
                        </div>
                        {selectedBookingOrder ? (
                          <div className='rounded-2xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground'>
                            <p className='font-medium text-foreground'>
                              {selectedBookingOrder.orderNumber} | {selectedBookingOrder.customerName}
                            </p>
                            <div className='mt-2 space-y-1'>
                              <p>Destination: {selectedBookingOrder.pincode || 'Not available'}</p>
                              <p>Value: {formatINR(selectedBookingOrder.total)}</p>
                              <p>Items: {selectedBookingOrder.itemsCount} item(s)</p>
                              <p>
                                Model: Warehouse order API using order and vendor address data from
                                SellersLogin.
                              </p>
                            </div>
                          </div>
                        ) : null}
                        <div className='flex flex-wrap gap-2'>
                          <Button
                            variant='outline'
                            className='border-border bg-background text-foreground hover:bg-accent hover:text-foreground'
                            disabled={shadowfaxOrderBusy || !selectedBookingOrder}
                            onClick={() => {
                              void handleCreateShadowfaxWarehouseOrder()
                            }}
                          >
                            {shadowfaxOrderBusy ? (
                              <LoaderCircle className='h-4 w-4 animate-spin' />
                            ) : null}
                            Create warehouse order
                          </Button>
                        </div>
                        {shadowfaxOrderResult ? (
                          <div className='rounded-2xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground'>
                            <p className='font-medium text-foreground'>{shadowfaxOrderResult.title}</p>
                            <p className='mt-2'>{shadowfaxOrderResult.summary}</p>
                            <div className='mt-3 space-y-1'>
                              {shadowfaxOrderResult.rows.map((row) => (
                                <p key={row}>{row}</p>
                              ))}
                            </div>
                            {shadowfaxOrderResult.raw ? (
                              <pre className='mt-4 overflow-x-auto rounded-xl bg-background p-3 text-xs text-muted-foreground'>
                                {JSON.stringify(shadowfaxOrderResult.raw, null, 2)}
                              </pre>
                            ) : null}
                          </div>
                        ) : null}
                      </>
                    )}
                  </CardContent>
                </Card>

                <Card className='border-border bg-card shadow-sm'>
                  <CardHeader>
                    <CardTitle className='text-base'>Serviceability API</CardTitle>
                    <CardDescription>
                      Check Shadowfax pincode deliverability through the backend proxy using env-based credentials.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className='space-y-4'>
                    <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
                      <div className='space-y-2 xl:col-span-2'>
                        <label className='text-sm font-medium text-foreground'>Pincodes</label>
                        <Input
                          value={shadowfaxServiceabilityForm.pincodes}
                          onChange={(e) =>
                            setShadowfaxServiceabilityForm((current) => ({
                              ...current,
                              pincodes: e.target.value,
                            }))
                          }
                          placeholder='560017 or 560017,110001'
                        />
                      </div>
                      <div className='space-y-2'>
                        <label className='text-sm font-medium text-foreground'>Service</label>
                        <Input
                          value={shadowfaxServiceabilityForm.service}
                          onChange={(e) =>
                            setShadowfaxServiceabilityForm((current) => ({
                              ...current,
                              service: e.target.value,
                            }))
                          }
                          placeholder='customer_delivery'
                        />
                      </div>
                      <div className='space-y-2'>
                        <label className='text-sm font-medium text-foreground'>Page</label>
                        <Input
                          value={shadowfaxServiceabilityForm.page}
                          onChange={(e) =>
                            setShadowfaxServiceabilityForm((current) => ({
                              ...current,
                              page: e.target.value,
                            }))
                          }
                          placeholder='1'
                        />
                      </div>
                      <div className='space-y-2'>
                        <label className='text-sm font-medium text-foreground'>Count</label>
                        <Input
                          value={shadowfaxServiceabilityForm.count}
                          onChange={(e) =>
                            setShadowfaxServiceabilityForm((current) => ({
                              ...current,
                              count: e.target.value,
                            }))
                          }
                          placeholder='10'
                        />
                      </div>
                    </div>
                    <div className='flex flex-wrap gap-2'>
                      <Button
                        variant='outline'
                        className='border-border bg-background text-foreground hover:bg-accent hover:text-foreground'
                        disabled={shadowfaxServiceabilityBusy}
                        onClick={() => {
                          void handleRunShadowfaxServiceability()
                        }}
                      >
                        {shadowfaxServiceabilityBusy ? (
                          <LoaderCircle className='h-4 w-4 animate-spin' />
                        ) : null}
                        Check pincode
                      </Button>
                    </div>
                    {shadowfaxServiceabilityResult ? (
                      <div className='rounded-2xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground'>
                        <p className='font-medium text-foreground'>
                          {shadowfaxServiceabilityResult.title}
                        </p>
                        <p className='mt-2'>{shadowfaxServiceabilityResult.summary}</p>
                        <div className='mt-3 space-y-1'>
                          {shadowfaxServiceabilityResult.rows.map((row) => (
                            <p key={row}>{row}</p>
                          ))}
                        </div>
                        {shadowfaxServiceabilityResult.raw ? (
                          <pre className='mt-4 overflow-x-auto rounded-xl bg-background p-3 text-xs text-muted-foreground'>
                            {JSON.stringify(shadowfaxServiceabilityResult.raw, null, 2)}
                          </pre>
                        ) : null}
                      </div>
                    ) : null}
                  </CardContent>
                </Card>

                <Card className='border-border bg-card shadow-sm'>
                  <CardHeader>
                    <CardTitle className='text-base'>AWB API</CardTitle>
                    <CardDescription>
                      Generate Shadowfax AWB numbers from the same backend-proxied integration used by the delivery dashboard.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className='space-y-4'>
                    <div className='grid gap-4 md:grid-cols-2'>
                      <div className='space-y-2'>
                        <label className='text-sm font-medium text-foreground'>Count</label>
                        <Input
                          value={shadowfaxAwbForm.count}
                          onChange={(e) =>
                            setShadowfaxAwbForm((current) => ({
                              ...current,
                              count: e.target.value,
                            }))
                          }
                          placeholder='10'
                        />
                      </div>
                      <div className='space-y-2'>
                        <label className='text-sm font-medium text-foreground'>Request type</label>
                        <Input
                          value={shadowfaxAwbForm.requestType}
                          onChange={(e) =>
                            setShadowfaxAwbForm((current) => ({
                              ...current,
                              requestType: e.target.value,
                            }))
                          }
                          placeholder='FWD'
                        />
                      </div>
                    </div>
                    <div className='flex flex-wrap gap-2'>
                      <Button
                        variant='outline'
                        className='border-border bg-background text-foreground hover:bg-accent hover:text-foreground'
                        disabled={shadowfaxAwbBusy}
                        onClick={() => {
                          void handleGenerateShadowfaxAwb()
                        }}
                      >
                        {shadowfaxAwbBusy ? (
                          <LoaderCircle className='h-4 w-4 animate-spin' />
                        ) : null}
                        Generate AWB
                      </Button>
                    </div>
                    {shadowfaxAwbResult ? (
                      <div className='rounded-2xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground'>
                        <p className='font-medium text-foreground'>{shadowfaxAwbResult.title}</p>
                        <p className='mt-2'>{shadowfaxAwbResult.summary}</p>
                        <div className='mt-3 space-y-1'>
                          {shadowfaxAwbResult.rows.map((row) => (
                            <p key={row}>{row}</p>
                          ))}
                        </div>
                        {shadowfaxAwbResult.raw ? (
                          <pre className='mt-4 overflow-x-auto rounded-xl bg-background p-3 text-xs text-muted-foreground'>
                            {JSON.stringify(shadowfaxAwbResult.raw, null, 2)}
                          </pre>
                        ) : null}
                      </div>
                    ) : null}
                  </CardContent>
                </Card>

                <Card className='border-border bg-card shadow-sm'>
                  <CardHeader>
                    <CardTitle className='text-base'>Tracking API V4</CardTitle>
                    <CardDescription>
                      Fetch single-order Shadowfax tracking with intermediate bag and hub events using an AWB number.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className='space-y-4'>
                    <div className='space-y-2'>
                      <label className='text-sm font-medium text-foreground'>AWB number</label>
                      <Input
                        value={shadowfaxTrackingForm.awbNumber}
                        onChange={(e) =>
                          setShadowfaxTrackingForm((current) => ({
                            ...current,
                            awbNumber: e.target.value,
                          }))
                        }
                        placeholder='SF12345678'
                      />
                    </div>
                    <div className='flex flex-wrap gap-2'>
                      <Button
                        variant='outline'
                        className='border-border bg-background text-foreground hover:bg-accent hover:text-foreground'
                        disabled={shadowfaxTrackingBusy}
                        onClick={() => {
                          void handleRunShadowfaxTracking()
                        }}
                      >
                        {shadowfaxTrackingBusy ? (
                          <LoaderCircle className='h-4 w-4 animate-spin' />
                        ) : null}
                        Track AWB
                      </Button>
                    </div>
                    {shadowfaxTrackingResult ? (
                      <div className='rounded-2xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground'>
                        <p className='font-medium text-foreground'>{shadowfaxTrackingResult.title}</p>
                        <p className='mt-2'>{shadowfaxTrackingResult.summary}</p>
                        <div className='mt-3 space-y-1'>
                          {shadowfaxTrackingResult.rows.map((row) => (
                            <p key={row}>{row}</p>
                          ))}
                        </div>
                        {shadowfaxTrackingResult.raw ? (
                          <pre className='mt-4 overflow-x-auto rounded-xl bg-background p-3 text-xs text-muted-foreground'>
                            {JSON.stringify(shadowfaxTrackingResult.raw, null, 2)}
                          </pre>
                        ) : null}
                      </div>
                    ) : null}
                  </CardContent>
                </Card>

                <Card className='border-border bg-card shadow-sm'>
                  <CardHeader>
                    <CardTitle className='text-base'>Update Order Data</CardTitle>
                    <CardDescription>
                      Update delivery, pickup, weight, or status fields for an existing Shadowfax AWB. Blank sections are sent as null.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className='space-y-4'>
                    <div className='space-y-2'>
                      <label className='text-sm font-medium text-foreground'>AWB number</label>
                      <Input
                        value={shadowfaxUpdateForm.awbNumber}
                        onChange={(e) =>
                          setShadowfaxUpdateForm((current) => ({
                            ...current,
                            awbNumber: e.target.value,
                          }))
                        }
                        placeholder='SF12345678'
                      />
                    </div>
                    <div className='grid gap-4 md:grid-cols-2'>
                      <div className='space-y-2'>
                        <label className='text-sm font-medium text-foreground'>
                          Delivery contact
                        </label>
                        <Input
                          value={shadowfaxUpdateForm.deliveryContact}
                          onChange={(e) =>
                            setShadowfaxUpdateForm((current) => ({
                              ...current,
                              deliveryContact: e.target.value,
                            }))
                          }
                          placeholder='9999999999'
                        />
                      </div>
                      <div className='space-y-2'>
                        <label className='text-sm font-medium text-foreground'>
                          Delivery pincode
                        </label>
                        <Input
                          value={shadowfaxUpdateForm.deliveryPincode}
                          onChange={(e) =>
                            setShadowfaxUpdateForm((current) => ({
                              ...current,
                              deliveryPincode: e.target.value,
                            }))
                          }
                          placeholder='560008'
                        />
                      </div>
                      <div className='space-y-2 md:col-span-2'>
                        <label className='text-sm font-medium text-foreground'>
                          Delivery address
                        </label>
                        <Textarea
                          value={shadowfaxUpdateForm.deliveryAddress}
                          onChange={(e) =>
                            setShadowfaxUpdateForm((current) => ({
                              ...current,
                              deliveryAddress: e.target.value,
                            }))
                          }
                          placeholder='Updated delivery address'
                          className='min-h-[88px]'
                        />
                      </div>
                      <div className='space-y-2'>
                        <label className='text-sm font-medium text-foreground'>
                          Pickup contact
                        </label>
                        <Input
                          value={shadowfaxUpdateForm.pickupContact}
                          onChange={(e) =>
                            setShadowfaxUpdateForm((current) => ({
                              ...current,
                              pickupContact: e.target.value,
                            }))
                          }
                          placeholder='9123456781'
                        />
                      </div>
                      <div className='space-y-2'>
                        <label className='text-sm font-medium text-foreground'>
                          Pickup pincode
                        </label>
                        <Input
                          value={shadowfaxUpdateForm.pickupPincode}
                          onChange={(e) =>
                            setShadowfaxUpdateForm((current) => ({
                              ...current,
                              pickupPincode: e.target.value,
                            }))
                          }
                          placeholder='560007'
                        />
                      </div>
                      <div className='space-y-2 md:col-span-2'>
                        <label className='text-sm font-medium text-foreground'>
                          Pickup address
                        </label>
                        <Textarea
                          value={shadowfaxUpdateForm.pickupAddress}
                          onChange={(e) =>
                            setShadowfaxUpdateForm((current) => ({
                              ...current,
                              pickupAddress: e.target.value,
                            }))
                          }
                          placeholder='Updated pickup address'
                          className='min-h-[88px]'
                        />
                      </div>
                      <div className='space-y-2'>
                        <label className='text-sm font-medium text-foreground'>
                          Actual weight
                        </label>
                        <Input
                          value={shadowfaxUpdateForm.actualWeight}
                          onChange={(e) =>
                            setShadowfaxUpdateForm((current) => ({
                              ...current,
                              actualWeight: e.target.value,
                            }))
                          }
                          placeholder='539.127'
                        />
                      </div>
                      <div className='space-y-2'>
                        <label className='text-sm font-medium text-foreground'>
                          Volumetric weight
                        </label>
                        <Input
                          value={shadowfaxUpdateForm.volumetricWeight}
                          onChange={(e) =>
                            setShadowfaxUpdateForm((current) => ({
                              ...current,
                              volumetricWeight: e.target.value,
                            }))
                          }
                          placeholder='1498.314'
                        />
                      </div>
                      <div className='space-y-2 md:col-span-2'>
                        <label className='text-sm font-medium text-foreground'>
                          Status update
                        </label>
                        <Input
                          value={shadowfaxUpdateForm.status}
                          onChange={(e) =>
                            setShadowfaxUpdateForm((current) => ({
                              ...current,
                              status: e.target.value,
                            }))
                          }
                          placeholder='rts, rto, reopen_ndr'
                        />
                      </div>
                    </div>
                    <div className='flex flex-wrap gap-2'>
                      <Button
                        variant='outline'
                        className='border-border bg-background text-foreground hover:bg-accent hover:text-foreground'
                        disabled={shadowfaxUpdateBusy}
                        onClick={() => {
                          void handleUpdateShadowfaxOrder()
                        }}
                      >
                        {shadowfaxUpdateBusy ? (
                          <LoaderCircle className='h-4 w-4 animate-spin' />
                        ) : null}
                        Send update
                      </Button>
                    </div>
                    {shadowfaxUpdateResult ? (
                      <div className='rounded-2xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground'>
                        <p className='font-medium text-foreground'>{shadowfaxUpdateResult.title}</p>
                        <p className='mt-2'>{shadowfaxUpdateResult.summary}</p>
                        <div className='mt-3 space-y-1'>
                          {shadowfaxUpdateResult.rows.map((row) => (
                            <p key={row}>{row}</p>
                          ))}
                        </div>
                        {shadowfaxUpdateResult.raw ? (
                          <pre className='mt-4 overflow-x-auto rounded-xl bg-background p-3 text-xs text-muted-foreground'>
                            {JSON.stringify(shadowfaxUpdateResult.raw, null, 2)}
                          </pre>
                        ) : null}
                      </div>
                    ) : null}
                  </CardContent>
                </Card>

                <Card className='border-border bg-card shadow-sm'>
                  <CardHeader>
                    <CardTitle className='text-base'>Order Cancellation</CardTitle>
                    <CardDescription>
                      Cancel a Shadowfax marketplace or warehouse order using an AWB number or client order ID.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className='space-y-4'>
                    <div className='space-y-2'>
                      <label className='text-sm font-medium text-foreground'>
                        Request ID / AWB
                      </label>
                      <Input
                        value={shadowfaxCancelForm.requestId}
                        onChange={(e) =>
                          setShadowfaxCancelForm((current) => ({
                            ...current,
                            requestId: e.target.value,
                          }))
                        }
                        placeholder='SF10000002NRN'
                      />
                    </div>
                    <div className='space-y-2'>
                      <label className='text-sm font-medium text-foreground'>
                        Cancel remarks
                      </label>
                      <Textarea
                        value={shadowfaxCancelForm.cancelRemarks}
                        onChange={(e) =>
                          setShadowfaxCancelForm((current) => ({
                            ...current,
                            cancelRemarks: e.target.value,
                          }))
                        }
                        placeholder='Request cancelled by customer'
                        className='min-h-[88px]'
                      />
                    </div>
                    <div className='flex flex-wrap gap-2'>
                      <Button
                        variant='outline'
                        className='border-border bg-background text-foreground hover:bg-accent hover:text-foreground'
                        disabled={shadowfaxCancelBusy}
                        onClick={() => {
                          void handleCancelShadowfaxOrder()
                        }}
                      >
                        {shadowfaxCancelBusy ? (
                          <LoaderCircle className='h-4 w-4 animate-spin' />
                        ) : null}
                        Cancel request
                      </Button>
                    </div>
                    {shadowfaxCancelResult ? (
                      <div className='rounded-2xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground'>
                        <p className='font-medium text-foreground'>{shadowfaxCancelResult.title}</p>
                        <p className='mt-2'>{shadowfaxCancelResult.summary}</p>
                        <div className='mt-3 space-y-1'>
                          {shadowfaxCancelResult.rows.map((row) => (
                            <p key={row}>{row}</p>
                          ))}
                        </div>
                        {shadowfaxCancelResult.raw ? (
                          <pre className='mt-4 overflow-x-auto rounded-xl bg-background p-3 text-xs text-muted-foreground'>
                            {JSON.stringify(shadowfaxCancelResult.raw, null, 2)}
                          </pre>
                        ) : null}
                      </div>
                    ) : null}
                  </CardContent>
                </Card>

                <Card className='border-border bg-card shadow-sm'>
                  <CardHeader>
                    <CardTitle className='text-base'>Escalation API</CardTitle>
                    <CardDescription>
                      Raise a Shadowfax support issue for a shipment that needs manual intervention.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className='space-y-4'>
                    <div className='space-y-2'>
                      <label className='text-sm font-medium text-foreground'>AWB number</label>
                      <Input
                        value={shadowfaxEscalationForm.awbNumber}
                        onChange={(e) =>
                          setShadowfaxEscalationForm((current) => ({
                            ...current,
                            awbNumber: e.target.value,
                          }))
                        }
                        placeholder='SF00000000TC'
                      />
                    </div>
                    <div className='space-y-2'>
                      <label className='text-sm font-medium text-foreground'>
                        Issue category
                      </label>
                      <select
                        value={shadowfaxEscalationForm.issueCategory}
                        onChange={(e) =>
                          setShadowfaxEscalationForm((current) => ({
                            ...current,
                            issueCategory: e.target.value,
                          }))
                        }
                        className='vendor-field flex h-11 w-full rounded-none border bg-transparent px-4 py-2 text-sm shadow-sm outline-none'
                      >
                        <option value='1'>1 | Delayed Delivery</option>
                        <option value='2'>2 | Expedite Pickup (Customer)</option>
                        <option value='3'>3 | Expedite Pickup (Seller)</option>
                        <option value='4'>4 | Status Mismatch</option>
                        <option value='5'>5 | Delivery Dispute</option>
                      </select>
                    </div>
                    <div className='rounded-2xl border border-border bg-muted/40 p-4 text-xs text-muted-foreground'>
                      <p>1: Delayed delivery after expected date.</p>
                      <p>2: Expedite reverse pickup for customer.</p>
                      <p>3: Expedite seller pickup for forward shipment.</p>
                      <p>4: Physical shipment state does not match API state.</p>
                      <p>5: Delivery dispute after marked delivered.</p>
                    </div>
                    <div className='flex flex-wrap gap-2'>
                      <Button
                        variant='outline'
                        className='border-border bg-background text-foreground hover:bg-accent hover:text-foreground'
                        disabled={shadowfaxEscalationBusy}
                        onClick={() => {
                          void handleCreateShadowfaxEscalation()
                        }}
                      >
                        {shadowfaxEscalationBusy ? (
                          <LoaderCircle className='h-4 w-4 animate-spin' />
                        ) : null}
                        Raise issue
                      </Button>
                    </div>
                    {shadowfaxEscalationResult ? (
                      <div className='rounded-2xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground'>
                        <p className='font-medium text-foreground'>
                          {shadowfaxEscalationResult.title}
                        </p>
                        <p className='mt-2'>{shadowfaxEscalationResult.summary}</p>
                        <div className='mt-3 space-y-1'>
                          {shadowfaxEscalationResult.rows.map((row) => (
                            <p key={row}>{row}</p>
                          ))}
                        </div>
                        {shadowfaxEscalationResult.raw ? (
                          <pre className='mt-4 overflow-x-auto rounded-xl bg-background p-3 text-xs text-muted-foreground'>
                            {JSON.stringify(shadowfaxEscalationResult.raw, null, 2)}
                          </pre>
                        ) : null}
                      </div>
                    ) : null}
                  </CardContent>
                </Card>

                <Card className='border-border bg-card shadow-sm'>
                  <CardHeader>
                    <CardTitle className='text-base'>Get POD Details</CardTitle>
                    <CardDescription>
                      Fetch proof-of-delivery recipient details and signature references for up to 100 AWBs in one request.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className='space-y-4'>
                    <div className='space-y-2'>
                      <label className='text-sm font-medium text-foreground'>
                        AWB numbers
                      </label>
                      <Textarea
                        value={shadowfaxPodForm.awbNumbers}
                        onChange={(e) =>
                          setShadowfaxPodForm((current) => ({
                            ...current,
                            awbNumbers: e.target.value,
                          }))
                        }
                        placeholder='SF17102220TE, SF17102219TE, SF16330181TE'
                        className='min-h-[112px]'
                      />
                    </div>
                    <div className='rounded-2xl border border-border bg-muted/40 p-4 text-xs text-muted-foreground'>
                      <p>POD is available only after `delivered` or `rts_d` status.</p>
                      <p>Separate AWBs with commas, spaces, or new lines.</p>
                      <p>Maximum batch size: 100 AWBs.</p>
                    </div>
                    <div className='flex flex-wrap gap-2'>
                      <Button
                        variant='outline'
                        className='border-border bg-background text-foreground hover:bg-accent hover:text-foreground'
                        disabled={shadowfaxPodBusy}
                        onClick={() => {
                          void handleFetchShadowfaxPodDetails()
                        }}
                      >
                        {shadowfaxPodBusy ? (
                          <LoaderCircle className='h-4 w-4 animate-spin' />
                        ) : null}
                        Fetch POD
                      </Button>
                    </div>
                    {shadowfaxPodResult ? (
                      <div className='rounded-2xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground'>
                        <p className='font-medium text-foreground'>{shadowfaxPodResult.title}</p>
                        <p className='mt-2'>{shadowfaxPodResult.summary}</p>
                        <div className='mt-3 space-y-1'>
                          {shadowfaxPodResult.rows.map((row) => (
                            <p key={row}>{row}</p>
                          ))}
                        </div>
                        {shadowfaxPodResult.raw ? (
                          <pre className='mt-4 overflow-x-auto rounded-xl bg-background p-3 text-xs text-muted-foreground'>
                            {JSON.stringify(shadowfaxPodResult.raw, null, 2)}
                          </pre>
                        ) : null}
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              </div>
            ) : null}

            <div className='grid gap-4 lg:grid-cols-2'>
              <Card className='border-border bg-card shadow-sm'>
                <CardHeader>
                  <CardTitle className='text-base'>Tracking snapshot</CardTitle>
                  <CardDescription>
                    Recent assignments and tracking references.
                  </CardDescription>
                </CardHeader>
                <CardContent className='space-y-3'>
                  {assignments.slice(0, 4).map(({ assignment, order }) => (
                    <div
                      key={assignment.orderId}
                      className='rounded-2xl border border-border bg-muted/40 p-4'
                    >
                      <div className='flex items-start justify-between gap-3'>
                        <div>
                          <p className='font-medium text-foreground'>{assignment.orderNumber}</p>
                          <p className='text-xs text-muted-foreground'>{assignment.customerName}</p>
                        </div>
                        <Badge className='border-indigo-200 bg-indigo-50 text-indigo-700'>
                          {assignment.trackingStatus}
                        </Badge>
                      </div>
                      <div className='mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground'>
                        <span className='inline-flex items-center gap-2'>
                          <Truck className='h-4 w-4 text-muted-foreground' />
                          {assignment.trackingCode}
                        </span>
                        {order?.delhivery?.scans?.[0]?.location ? (
                          <span className='inline-flex items-center gap-2'>
                            <ArrowUpRight className='h-4 w-4 text-muted-foreground' />
                            {order.delhivery.scans[0].location}
                          </span>
                        ) : null}
                        <span className='inline-flex items-center gap-2'>
                          <Package2 className='h-4 w-4 text-slate-400' />
                          {formatINR(assignment.total)}
                        </span>
                      </div>
                    </div>
                  ))}
                  {!assignments.length && (
                    <div className='rounded-2xl border border-dashed border-border bg-muted/40 p-6 text-sm text-muted-foreground'>
                      No tracking snapshot yet.
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className='border-border bg-card shadow-sm'>
                <CardHeader>
                  <CardTitle className='text-base'>Partner routing notes</CardTitle>
                  <CardDescription>
                    Notes for this partner view.
                  </CardDescription>
                </CardHeader>
                <CardContent className='space-y-3 text-sm leading-6 text-muted-foreground'>
                  <p>
                    Use the courier desk to assign new orders to {partnerMeta.title}. Each
                    assignment is shown here with a quote and tracking reference.
                  </p>
                  {isShadowfax ? (
                    <p>
                      Serviceability checks use the backend Shadowfax env values, so the API token
                      is not exposed in the browser.
                    </p>
                  ) : null}
                  <p className='font-medium text-slate-900'>
                    Current ETA benchmark: {partnerMeta.etaLabel}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : null}
      </div>
      <Dialog
        open={editDialogOpen}
        onOpenChange={(open) => {
          setEditDialogOpen(open)
          if (!open) {
            setEditingOrder(null)
          }
        }}
      >
        <DialogContent className='max-h-[92vh] w-[min(96vw,760px)] overflow-y-auto rounded-none sm:max-w-[760px]'>
          <DialogHeader className='text-left'>
            <DialogTitle>Edit Delhivery shipment</DialogTitle>
            <DialogDescription>
              Update editable Delhivery fields against the stored waybill for this order.
            </DialogDescription>
          </DialogHeader>

          <div className='grid gap-4 sm:grid-cols-2'>
            <div className='space-y-2'>
              <label className='text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase'>Order</label>
              <Input value={editingOrder?.orderNumber || ''} readOnly />
            </div>
            <div className='space-y-2'>
              <label className='text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase'>Waybill</label>
              <Input value={editingOrder?.delhivery?.waybill || editingOrder?.delhivery?.waybills?.[0] || ''} readOnly />
            </div>
            <div className='space-y-2'>
              <label className='text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase'>Consignee name</label>
              <Input value={editForm.name} onChange={(e) => setEditForm((current) => ({ ...current, name: e.target.value }))} placeholder='Customer name' />
            </div>
            <div className='space-y-2'>
              <label className='text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase'>Phone</label>
              <Input value={editForm.phone} onChange={(e) => setEditForm((current) => ({ ...current, phone: e.target.value }))} placeholder='9999999999' />
            </div>
            <div className='space-y-2'>
              <label className='text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase'>Payment mode</label>
              <select value={editForm.pt} onChange={(e) => setEditForm((current) => ({ ...current, pt: e.target.value }))} className='vendor-field flex h-11 w-full rounded-none border bg-transparent px-4 py-2 text-sm shadow-sm outline-none'>
                <option value=''>No change</option>
                <option value='COD'>COD</option>
                <option value='Pre-paid'>Pre-paid</option>
                <option value='Pickup'>Pickup</option>
                <option value='REPL'>REPL</option>
              </select>
            </div>
            <div className='space-y-2'>
              <label className='text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase'>COD amount</label>
              <Input value={editForm.cod} onChange={(e) => setEditForm((current) => ({ ...current, cod: e.target.value }))} placeholder='100' />
            </div>
            <div className='space-y-2'>
              <label className='text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase'>Weight (gm)</label>
              <Input value={editForm.gm} onChange={(e) => setEditForm((current) => ({ ...current, gm: e.target.value }))} placeholder='500' />
            </div>
            <div className='space-y-2'>
              <label className='text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase'>Height (cm)</label>
              <Input value={editForm.shipment_height} onChange={(e) => setEditForm((current) => ({ ...current, shipment_height: e.target.value }))} placeholder='10' />
            </div>
            <div className='space-y-2'>
              <label className='text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase'>Width (cm)</label>
              <Input value={editForm.shipment_width} onChange={(e) => setEditForm((current) => ({ ...current, shipment_width: e.target.value }))} placeholder='10' />
            </div>
            <div className='space-y-2'>
              <label className='text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase'>Length (cm)</label>
              <Input value={editForm.shipment_length} onChange={(e) => setEditForm((current) => ({ ...current, shipment_length: e.target.value }))} placeholder='10' />
            </div>
            <div className='space-y-2 sm:col-span-2'>
              <label className='text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase'>Address</label>
              <Textarea value={editForm.add} onChange={(e) => setEditForm((current) => ({ ...current, add: e.target.value }))} placeholder='Updated delivery address' className='min-h-[88px] rounded-none border-slate-200' />
            </div>
            <div className='space-y-2 sm:col-span-2'>
              <label className='text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase'>Product description</label>
              <Textarea value={editForm.products_desc} onChange={(e) => setEditForm((current) => ({ ...current, products_desc: e.target.value }))} placeholder='Updated product description' className='min-h-[88px] rounded-none border-slate-200' />
            </div>
          </div>

          <DialogFooter className='gap-2 sm:justify-between'>
            <p className='text-sm text-slate-500'>
              Delhivery only allows edits on limited statuses like Manifested, In Transit, Pending, or Scheduled.
            </p>
            <div className='flex flex-wrap gap-2'>
              <Button variant='outline' className='border-slate-200 bg-white hover:bg-slate-50' onClick={() => setEditDialogOpen(false)}>
                Close
              </Button>
              <Button className='bg-slate-950 text-white hover:bg-slate-800' disabled={!editingOrder || (busyOrderId === editingOrder?.id && busyAction === 'edit')} onClick={() => { void handleDelhiveryEdit() }}>
                {busyOrderId === editingOrder?.id && busyAction === 'edit' ? 'Saving' : 'Save update'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
