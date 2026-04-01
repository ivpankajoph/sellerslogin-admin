import { createFileRoute, Link } from '@tanstack/react-router'
import {
  ArrowUpRight,
  Clock3,
  ExternalLink,
  Package2,
  RefreshCcw,
  Truck,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
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
import { Main } from '@/components/layout/main'
import {
  createDelhiveryPickupRequest,
  cancelDelhiveryShipment,
  cancelNimbuspostShipment,
  createNimbuspostManifest,
  editDelhiveryShipment,
  fetchNimbuspostNdrList,
  generateDelhiveryLabel,
  getAssignedCourierForOrder,
  loadCourierOrders,
  trackDelhiveryShipment,
  trackNimbuspostShipment,
} from '@/features/courier/api'
import { formatINR } from '@/lib/currency'
import {
  COURIER_PARTNER_MAP,
  COURIER_PARTNERS,
  readCourierAssignments,
  type CourierAssignment,
  type CourierOrderSummary,
  type CourierPartnerId,
} from '@/features/courier/data'
import type { RootState } from '@/store'

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
  const role = String(useSelector((state: RootState) => state.auth?.user?.role || '')).toLowerCase()
  const isVendor = role === 'vendor'
  const partnerId = (supportedPartners.includes(partner as CourierPartnerId)
    ? partner
    : 'borzo') as CourierPartnerId
  const partnerMeta = COURIER_PARTNER_MAP[partnerId]
  const [refreshKey, setRefreshKey] = useState(0)
  const [liveOrders, setLiveOrders] = useState<CourierOrderSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
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
  const [ndrItems, setNdrItems] = useState<
    { awb_number?: string; event_date?: string; courier_remarks?: string; total_attempts?: string }[]
  >([])

  useEffect(() => {
    let cancelled = false

    const loadData = async () => {
      const needsLiveData =
        partnerId === 'borzo' || partnerId === 'delhivery' || partnerId === 'nimbuspost'
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
        const [orders, ndrResponse] = await Promise.all([
          loadCourierOrders(isVendor),
          partnerId === 'nimbuspost'
            ? fetchNimbuspostNdrList().catch(() => null)
            : Promise.resolve(null),
        ])

        if (cancelled) return

        setLiveOrders(orders)
        setNdrItems(
          Array.isArray(ndrResponse?.response?.data) ? ndrResponse.response.data : []
        )
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
  }, [isVendor, partnerId, refreshKey])

  const assignments = useMemo(() => {
    if (partnerId === 'borzo' || partnerId === 'delhivery' || partnerId === 'nimbuspost') {
      return liveOrders
        .map((order) => ({ assignment: getAssignedCourierForOrder(order), order }))
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
  }, [liveOrders, partnerId])

  const totalGMV = assignments.reduce(
    (sum, entry) => sum + Number(entry.assignment.total || 0),
    0
  )
  const totalCharges = assignments.reduce(
    (sum, entry) => sum + Number(entry.assignment.amount || 0),
    0
  )
  const delhiveryRecentScans = useMemo(() => {
    if (partnerId !== 'delhivery') return []

    return assignments
      .flatMap(({ assignment, order }) =>
        (order?.delhivery?.scans || []).map((scan) => ({
          ...scan,
          orderNumber: assignment.orderNumber,
          customerName: assignment.customerName,
          trackingCode: assignment.trackingCode,
        }))
      )
      .sort((left, right) => {
        const leftTime = new Date(left.time || 0).getTime()
        const rightTime = new Date(right.time || 0).getTime()
        return rightTime - leftTime
      })
      .slice(0, 6)
  }, [assignments, partnerId])

  const handleRefreshTracking = async (order: CourierOrderSummary | null) => {
    if (!order || partnerId !== 'nimbuspost') return
    try {
      setBusyOrderId(order.id)
      setBusyAction('track')
      await trackNimbuspostShipment(order)
      toast.success(`Tracking updated for ${order.orderNumber}`)
      setRefreshKey((current) => current + 1)
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to refresh tracking')
    } finally {
      setBusyOrderId('')
      setBusyAction('')
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

  const handleCreateManifest = async (order: CourierOrderSummary | null) => {
    if (!order || partnerId !== 'nimbuspost') return
    try {
      setBusyOrderId(order.id)
      setBusyAction('manifest')
      await createNimbuspostManifest(order)
      toast.success(`Manifest generated for ${order.orderNumber}`)
      setRefreshKey((current) => current + 1)
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to create manifest')
    } finally {
      setBusyOrderId('')
      setBusyAction('')
    }
  }

  const handleCancelShipment = async (order: CourierOrderSummary | null) => {
    if (!order || partnerId !== 'nimbuspost') return
    try {
      setBusyOrderId(order.id)
      setBusyAction('cancel')
      await cancelNimbuspostShipment(order)
      toast.success(`Shipment cancelled for ${order.orderNumber}`)
      setRefreshKey((current) => current + 1)
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to cancel shipment')
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

  return (
    <Main>
      <div className='space-y-6 p-4 md:p-6'>
        <div className='overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm'>
          <div className='bg-[linear-gradient(135deg,rgba(248,250,252,0.95)_0%,rgba(239,246,255,0.95)_45%,rgba(255,247,237,0.92)_100%)] p-6 md:p-8'>
            <div className='flex flex-wrap items-start justify-between gap-4'>
              <div className='flex items-start gap-4'>
                <div
                  className={`flex h-20 w-20 items-center justify-center rounded-3xl border bg-white shadow-sm ${partnerMeta.themeClass}`}
                >
                  <img
                    src={partnerMeta.imageSrc}
                    alt={partnerMeta.title}
                    className='max-h-12 max-w-14 object-contain'
                  />
                </div>
                <div className='space-y-3'>
                  <Badge className='rounded-full border-slate-200 bg-white px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-slate-700'>
                    Courier Page
                  </Badge>
                  <div>
                    <h1 className='text-3xl font-semibold tracking-tight text-slate-950'>
                      {partnerMeta.title}
                    </h1>
                    <p className='mt-2 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base'>
                      Dedicated request board for {partnerMeta.title}. Live courier records are
                      shown for integrated apps, while static partners still read from the local
                      courier desk assignment store.
                    </p>
                  </div>
                </div>
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
                  asChild
                >
                  <Link to='/courier'>
                    Courier desk
                    <ArrowUpRight className='h-4 w-4' />
                  </Link>
                </Button>
                {partnerId === 'borzo' && (
                  <Button className='bg-slate-950 text-white hover:bg-slate-800' asChild>
                    <Link to='/borzo-report'>
                      Open live Borzo report
                      <ExternalLink className='h-4 w-4' />
                    </Link>
                  </Button>
                )}
              </div>
            </div>

            <div className='mt-6 grid gap-3 md:grid-cols-3'>
              <div className='rounded-2xl border border-white/80 bg-white/85 p-4 shadow-sm'>
                <p className='text-[11px] uppercase tracking-[0.18em] text-slate-500'>
                  Assigned requests
                </p>
                <p className='mt-1 text-3xl font-semibold text-slate-950'>
                  {assignments.length}
                </p>
              </div>
              <div className='rounded-2xl border border-white/80 bg-white/85 p-4 shadow-sm'>
                <p className='text-[11px] uppercase tracking-[0.18em] text-slate-500'>
                  Estimated charges
                </p>
                <p className='mt-1 text-3xl font-semibold text-slate-950'>
                  {formatINR(totalCharges)}
                </p>
              </div>
              <div className='rounded-2xl border border-white/80 bg-white/85 p-4 shadow-sm'>
                <p className='text-[11px] uppercase tracking-[0.18em] text-slate-500'>
                  Order value routed
                </p>
                <p className='mt-1 text-3xl font-semibold text-slate-950'>
                  {formatINR(totalGMV)}
                </p>
              </div>
            </div>
          </div>
        </div>

        <Card className='border-slate-200 shadow-sm'>
          <CardHeader>
            <CardTitle className='text-lg'>Assigned delivery requests</CardTitle>
              <CardDescription>
              {partnerId === 'nimbuspost' || partnerId === 'delhivery'
                ? `${partnerMeta.title} rows are sourced from live order shipment data.`
                : 'This page is powered by the courier desk assignment store for now.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className='rounded-2xl border border-slate-200 bg-slate-50 p-8 text-sm text-slate-600'>
                Loading {partnerMeta.title} records...
              </div>
            ) : error ? (
              <div className='rounded-2xl border border-rose-200 bg-rose-50 p-8 text-sm text-rose-700'>
                {error}
              </div>
            ) : assignments.length === 0 ? (
              <div className='rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-sm text-slate-600'>
                No requests assigned to {partnerMeta.title} yet.
              </div>
            ) : (
              <div className='overflow-hidden rounded-2xl border border-slate-200'>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Tracking</TableHead>
                      <TableHead>Charge</TableHead>
                      <TableHead>ETA</TableHead>
                      {(partnerId === 'nimbuspost' || partnerId === 'delhivery') && <TableHead className='text-right'>Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assignments.map(({ assignment, order }) => (
                      <TableRow key={`${assignment.partnerId}-${assignment.orderId}`}>
                        <TableCell>
                          <div className='space-y-1'>
                            <p className='font-medium text-slate-950'>{assignment.orderNumber}</p>
                            <p className='text-xs text-slate-500'>
                              {assignment.customerName} | {assignment.websiteLabel}
                            </p>
                            {order?.nimbuspost?.courier_name && (
                              <p className='text-xs text-slate-500'>
                                Courier: {order.nimbuspost.courier_name}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className='border-amber-200 bg-amber-50 text-amber-700'>
                            {assignment.trackingStatus}
                          </Badge>
                        </TableCell>
                        <TableCell>
                            <div className='space-y-1'>
                              <p className='text-sm font-medium text-slate-900'>
                                {assignment.trackingCode}
                              </p>
                              {partnerId === 'delhivery' &&
                              order?.delhivery?.pickup_request_date ? (
                                <p className='text-xs text-slate-500'>
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
                              {order?.nimbuspost?.label_url ? (
                                <a
                                  href={order.nimbuspost.label_url}
                                  target='_blank'
                                  rel='noreferrer'
                                  className='inline-flex items-center gap-1 font-medium text-indigo-600 hover:underline'
                                >
                                  Shipping label
                                  <ExternalLink className='h-3 w-3' />
                                </a>
                              ) : null}
                              {order?.nimbuspost?.manifest_url ? (
                                <a
                                  href={order.nimbuspost.manifest_url}
                                  target='_blank'
                                  rel='noreferrer'
                                  className='inline-flex items-center gap-1 font-medium text-indigo-600 hover:underline'
                                >
                                  Manifest
                                  <ExternalLink className='h-3 w-3' />
                                </a>
                              ) : null}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className='font-medium text-slate-900'>
                          {assignment.amount ? formatINR(assignment.amount) : 'Live'}
                        </TableCell>
                        <TableCell>
                          <div className='inline-flex items-center gap-2 text-sm text-slate-700'>
                            <Clock3 className='h-4 w-4 text-slate-400' />
                            {assignment.etaLabel}
                          </div>
                        </TableCell>
                        {(partnerId === 'nimbuspost' || partnerId === 'delhivery') && (
                          <TableCell className='text-right'>
                            <div className='flex flex-wrap justify-end gap-2'>
                              {partnerId === 'nimbuspost' ? (
                                <>
                                  <Button
                                    size='sm'
                                    variant='outline'
                                    className='border-slate-200 bg-white hover:bg-slate-50'
                                    disabled={busyOrderId === order?.id || !order}
                                    onClick={() => {
                                      void handleRefreshTracking(order)
                                    }}
                                  >
                                    {busyOrderId === order?.id && busyAction === 'track'
                                      ? 'Refreshing'
                                      : 'Track'}
                                  </Button>
                                  <Button
                                    size='sm'
                                    variant='outline'
                                    className='border-slate-200 bg-white hover:bg-slate-50'
                                    disabled={busyOrderId === order?.id || !order}
                                    onClick={() => {
                                      void handleCreateManifest(order)
                                    }}
                                  >
                                    {busyOrderId === order?.id && busyAction === 'manifest'
                                      ? 'Working'
                                      : 'Manifest'}
                                  </Button>
                                  {String(assignment.trackingStatus || '').toLowerCase() !==
                                  'cancelled' ? (
                                    <Button
                                      size='sm'
                                      variant='outline'
                                      className='border-rose-200 bg-white text-rose-700 hover:bg-rose-50'
                                      disabled={busyOrderId === order?.id || !order}
                                      onClick={() => {
                                        void handleCancelShipment(order)
                                      }}
                                    >
                                      {busyOrderId === order?.id && busyAction === 'cancel'
                                        ? 'Cancelling'
                                        : 'Cancel'}
                                    </Button>
                                  ) : null}
                                </>
                              ) : null}
                              {partnerId === 'delhivery' ? (
                                <>
                                  <Button
                                    size='sm'
                                    variant='outline'
                                    className='border-slate-200 bg-white hover:bg-slate-50'
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
                                      className='border-rose-200 bg-white text-rose-700 hover:bg-rose-50'
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
                                    className='border-slate-200 bg-white hover:bg-slate-50'
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
                                    className='border-slate-200 bg-white hover:bg-slate-50'
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
                                    className='border-slate-200 bg-white hover:bg-slate-50'
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

        <div className='grid gap-4 lg:grid-cols-2'>
          <Card className='border-slate-200 shadow-sm'>
            <CardHeader>
              <CardTitle className='text-base'>Tracking snapshot</CardTitle>
              <CardDescription>
                {partnerId === 'nimbuspost' || partnerId === 'delhivery'
                  ? `Recent ${partnerMeta.title} shipment states pulled from stored order shipment data.`
                  : 'Recent assignments and tracking references.'}
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-3'>
              {assignments.slice(0, 4).map(({ assignment, order }) => (
                <div
                  key={assignment.orderId}
                  className='rounded-2xl border border-slate-200 bg-slate-50 p-4'
                >
                  <div className='flex items-start justify-between gap-3'>
                    <div>
                      <p className='font-medium text-slate-950'>{assignment.orderNumber}</p>
                      <p className='text-xs text-slate-500'>{assignment.customerName}</p>
                    </div>
                    <Badge className='border-indigo-200 bg-indigo-50 text-indigo-700'>
                      {assignment.trackingStatus}
                    </Badge>
                  </div>
                  <div className='mt-3 flex flex-wrap gap-4 text-sm text-slate-600'>
                    <span className='inline-flex items-center gap-2'>
                      <Truck className='h-4 w-4 text-slate-400' />
                      {assignment.trackingCode}
                    </span>
                    {order?.delhivery?.scans?.[0]?.location ? (
                      <span className='inline-flex items-center gap-2'>
                        <ArrowUpRight className='h-4 w-4 text-slate-400' />
                        {order.delhivery.scans[0].location}
                      </span>
                    ) : null}
                    <span className='inline-flex items-center gap-2'>
                      <Package2 className='h-4 w-4 text-slate-400' />
                      {formatINR(assignment.total)}
                    </span>
                    {order?.nimbuspost?.courier_name ? (
                      <span className='inline-flex items-center gap-2'>
                        <ArrowUpRight className='h-4 w-4 text-slate-400' />
                        {order.nimbuspost.courier_name}
                      </span>
                    ) : null}
                  </div>
                </div>
              ))}
              {!assignments.length && (
                <div className='rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-600'>
                  No tracking snapshot yet.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className='border-slate-200 shadow-sm'>
            <CardHeader>
              <CardTitle className='text-base'>
                {partnerId === 'nimbuspost' ? 'NDR snapshot' : 'Partner routing notes'}
              </CardTitle>
              <CardDescription>
                {partnerId === 'nimbuspost'
                  ? 'Delivery exceptions returned by NimbusPost for your current account.'
                  : 'Notes for this partner view.'}
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-3 text-sm leading-6 text-slate-600'>
              {partnerId === 'nimbuspost' ? (
                ndrItems.length ? (
                  ndrItems.slice(0, 5).map((item) => (
                    <div
                      key={item.awb_number}
                      className='rounded-2xl border border-slate-200 bg-slate-50 p-4'
                    >
                      <p className='font-medium text-slate-950'>{item.awb_number}</p>
                      <p className='text-xs text-slate-500'>
                        {item.event_date || 'Date unavailable'} | Attempts:{' '}
                        {item.total_attempts || '0'}
                      </p>
                      <p className='mt-2 text-sm text-slate-700'>
                        {item.courier_remarks || 'No remarks'}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className='rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-600'>
                    No active NimbusPost NDR records were returned.
                  </div>
                )
              ) : partnerId === 'delhivery' ? (
                delhiveryRecentScans.length ? (
                  delhiveryRecentScans.map((scan, index) => (
                    <div
                      key={`${scan.trackingCode || 'wb'}-${scan.time || index}`}
                      className='rounded-2xl border border-slate-200 bg-slate-50 p-4'
                    >
                      <p className='font-medium text-slate-950'>
                        {scan.status || 'Scan update'} {scan.status_type ? `(${scan.status_type})` : ''}
                      </p>
                      <p className='text-xs text-slate-500'>
                        {scan.orderNumber} | {scan.trackingCode}
                      </p>
                      <p className='text-xs text-slate-500'>
                        {scan.time || 'Time unavailable'}{scan.location ? ` | ${scan.location}` : ''}
                      </p>
                      <p className='mt-2 text-sm text-slate-700'>
                        {scan.description || 'No scan remarks'}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className='rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-600'>
                    No Delhivery scans stored yet. Use the Track action on a shipment row.
                  </div>
                )
              ) : (
                <>
                  <p>
                    Use the courier desk to assign new orders to {partnerMeta.title}. Each
                    assignment is shown here with a quote and tracking reference.
                  </p>
                  <p className='font-medium text-slate-900'>
                    Current ETA benchmark: {partnerMeta.etaLabel}
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>
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
    </Main>
  )
}
