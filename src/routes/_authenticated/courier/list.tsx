import { createFileRoute } from '@tanstack/react-router'
import { ExternalLink, Truck } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import {
  fetchExternalDelhiveryShipments,
  getAssignedCourierForOrder,
  loadCourierOrders,
  type ExternalDelhiveryShipment,
} from '@/features/courier/api'
import {
  COURIER_PARTNER_MAP,
  hasAnyActiveCourierAssignment,
  type CourierPartner,
  type CourierPartnerId,
  type CourierOrderSummary,
} from '@/features/courier/data'
import { formatINR } from '@/lib/currency'
import type { RootState } from '@/store'

export const Route = createFileRoute('/_authenticated/courier/list')({
  component: CourierListPage,
})

type OrderShipmentRow = {
  id: string
  kind: 'order'
  title: string
  priceLabel: string
  customerPrimary: string
  customerSecondary: string
  partner: CourierPartner
  trackingCode: string
  trackingStatus: string
  updatedAt: string
  sourceLabel: string
  destinationLabel: string
  itemsLabel: string
  order: CourierOrderSummary
}

type ExternalShipmentRow = {
  id: string
  kind: 'external-delhivery'
  title: string
  priceLabel: string
  customerPrimary: string
  customerSecondary: string
  partner: CourierPartner
  trackingCode: string
  trackingStatus: string
  updatedAt: string
  sourceLabel: string
  destinationLabel: string
  itemsLabel: string
  externalShipment: ExternalDelhiveryShipment
}

type ShipmentRow = OrderShipmentRow | ExternalShipmentRow

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

const isAbsoluteUrl = (value: string) => /^https?:\/\//i.test(value)
const API_ORIGIN = (() => {
  const raw = readText(import.meta.env.VITE_PUBLIC_API_URL)
  if (!raw) return ''
  try {
    return new URL(raw).origin
  } catch {
    return ''
  }
})()
const resolveItemImage = (value?: string) => {
  const text = readText(value)
  if (!text) return FALLBACK_IMAGE
  if (text.startsWith('data:') || text.startsWith('blob:')) return text
  if (text.startsWith('//')) return `https:${text}`
  if (isAbsoluteUrl(text)) return text
  if (text.startsWith('/')) return API_ORIGIN ? `${API_ORIGIN}${text}` : text
  if (text.startsWith('uploads/')) {
    return API_ORIGIN ? `${API_ORIGIN}/${text}` : `/${text}`
  }
  return API_ORIGIN ? `${API_ORIGIN}/${text}` : `/${text}`
}

const formatDateTime = (value?: string) =>
  value ? new Date(value).toLocaleString('en-IN') : 'Not available'

const DetailKV = ({ label, value }: { label: string; value: string }) => (
  <div className='flex items-start justify-between gap-3 rounded-xl border border-border/70 bg-white/80 px-3 py-2'>
    <span className='text-xs font-medium uppercase tracking-wide text-indigo-600'>{label}</span>
    <span className='text-sm font-semibold text-foreground text-right'>{value || 'Not available'}</span>
  </div>
)

const getErrorMessage = (error: unknown, fallback: string) => {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof (error as { response?: unknown }).response === 'object' &&
    (error as { response?: { data?: { message?: unknown } } }).response?.data?.message
  ) {
    return (
      readText(
        (error as { response?: { data?: { message?: unknown } } }).response?.data?.message
      ) || fallback
    )
  }

  if (error instanceof Error) return error.message || fallback
  return fallback
}

const buildTrackingPath = (shipment: ShipmentRow) => {
  const params = new URLSearchParams()
  if (shipment.kind === 'order') {
    params.set('kind', 'order')
    params.set('orderId', shipment.order.id)
    params.set('source', shipment.order.source)
    if (shipment.trackingCode) params.set('tracking', shipment.trackingCode)
    return `/courier/tracking?${params.toString()}`
  }

  params.set('kind', 'external')
  params.set('shipmentId', shipment.externalShipment.id)
  if (shipment.trackingCode) params.set('tracking', shipment.trackingCode)
  return `/courier/tracking?${params.toString()}`
}

function CourierListPage() {
  const role = String(useSelector((state: RootState) => state.auth?.user?.role || '')).toLowerCase()
  const token = String(useSelector((state: RootState) => state.auth?.token || ''))
  const isVendor = role === 'vendor'
  const [orders, setOrders] = useState<CourierOrderSummary[]>([])
  const [externalShipments, setExternalShipments] = useState<ExternalDelhiveryShipment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedShipment, setSelectedShipment] = useState<ShipmentRow | null>(null)
  const [resolvedItemImages, setResolvedItemImages] = useState<Record<string, string>>({})

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        setLoading(true)
        setError('')

        const [ordersResult, externalResult] = await Promise.allSettled([
          loadCourierOrders(isVendor),
          isVendor
            ? fetchExternalDelhiveryShipments()
            : Promise.resolve({ success: true, shipments: [] as ExternalDelhiveryShipment[] }),
        ])

        if (cancelled) return

        if (ordersResult.status === 'fulfilled') {
          setOrders(ordersResult.value)
        } else {
          setOrders([])
        }

        if (externalResult.status === 'fulfilled') {
          setExternalShipments(
            Array.isArray(externalResult.value?.shipments) ? externalResult.value.shipments : []
          )
        } else {
          setExternalShipments([])
        }

        if (ordersResult.status === 'rejected' && externalResult.status === 'rejected') {
          setError(
            getErrorMessage(
              ordersResult.reason,
              getErrorMessage(externalResult.reason, 'Failed to load courier shipments')
            )
          )
          return
        }

        if (ordersResult.status === 'rejected') {
          setError(getErrorMessage(ordersResult.reason, 'Failed to load order-linked courier shipments'))
          return
        }

        if (externalResult.status === 'rejected') {
          setError(
            getErrorMessage(
              externalResult.reason,
              'Order-linked shipments loaded, but Delhivery panel imports could not be loaded'
            )
          )
        }
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

  const shipmentRows = useMemo(() => {
    const orderRows = orders
      .filter((order) => hasAnyActiveCourierAssignment(order))
      .map<ShipmentRow>((order) => {
        const assignment = getAssignedCourierForOrder(order)
        const partnerId: CourierPartnerId = assignment
          ? assignment.partnerId
          : order.delhivery?.waybill || order.delhivery?.waybills?.length
            ? 'delhivery'
            : 'borzo'
        const partner = COURIER_PARTNER_MAP[partnerId]

        const trackingCode =
          assignment?.trackingCode ||
          order.delhivery?.waybill ||
          order.delhivery?.waybills?.[0] ||
          (order.borzo?.order_id ? String(order.borzo.order_id) : '')

        const trackingStatus =
          assignment?.trackingStatus ||
          order.delhivery?.status ||
          order.borzo?.status ||
          'Active'

        const updatedAt =
          order.delhivery?.updated_at ||
          order.borzo?.updated_at ||
          order.createdAt ||
          ''

        const sourceLabel = order.source === 'template-orders' ? 'Website order' : 'Main order'
        const destinationLabel = order.address || `${order.city}, ${order.state}, ${order.pincode}`

        return {
          id: `${partner.id}-${order.id}`,
          kind: 'order',
          title: order.orderNumber,
          priceLabel: formatINR(order.total),
          customerPrimary: order.customerName || 'No customer',
          customerSecondary: order.pincode || 'No pincode',
          partner,
          trackingCode,
          trackingStatus,
          updatedAt,
          sourceLabel,
          destinationLabel,
          itemsLabel: `${order.items.length} item(s)`,
          order,
        }
      })

    const externalRows = externalShipments.map<ShipmentRow>((shipment) => ({
      id: `external-delhivery-${shipment.id}`,
      kind: 'external-delhivery',
      title: shipment.order_id || shipment.waybill || 'Imported Delhivery shipment',
      priceLabel: 'Imported from panel',
      customerPrimary: 'Delhivery panel shipment',
      customerSecondary: shipment.origin || 'Unknown origin',
      partner: COURIER_PARTNER_MAP.delhivery,
      trackingCode: shipment.waybill || shipment.order_id || '',
      trackingStatus: shipment.status || 'Pending',
      updatedAt: shipment.last_synced_at || shipment.updatedAt || shipment.createdAt || '',
      sourceLabel: 'Delhivery panel import',
      destinationLabel: shipment.destination || 'Destination not available',
      itemsLabel: `${Array.isArray(shipment.scans) ? shipment.scans.length : 0} scan(s)`,
      externalShipment: shipment,
    }))

    return [...orderRows, ...externalRows].sort((left, right) => {
      const leftTime = new Date(left.updatedAt || 0).getTime()
      const rightTime = new Date(right.updatedAt || 0).getTime()
      return rightTime - leftTime
    })
  }, [externalShipments, orders])

  const linkedOrderForSelectedExternal = useMemo(() => {
    if (!selectedShipment || selectedShipment.kind !== 'external-delhivery') return null
    const external = selectedShipment.externalShipment
    const refId = readText(external.order_id)
    const waybill = readText(external.waybill)

    return (
      orders.find((order) => {
        const orderNumber = readText(order.orderNumber)
        const delhiveryWaybill = readText(order.delhivery?.waybill)
        const waybills = Array.isArray(order.delhivery?.waybills)
          ? order.delhivery.waybills.map((entry) => readText(entry))
          : []
        return (
          (refId && orderNumber === refId) ||
          (waybill && (delhiveryWaybill === waybill || waybills.includes(waybill)))
        )
      }) || null
    )
  }, [orders, selectedShipment])

  const orderForDetails = useMemo(
    () =>
      selectedShipment?.kind === 'order'
        ? selectedShipment.order
        : linkedOrderForSelectedExternal,
    [linkedOrderForSelectedExternal, selectedShipment]
  )

  useEffect(() => {
    let cancelled = false
    const productApiBase = readText(import.meta.env.VITE_PUBLIC_API_URL)
    if (!orderForDetails?.items?.length || !productApiBase) return

    const run = async () => {
      const next: Record<string, string> = {}
      const uniquePairs = Array.from(
        new Set(
          orderForDetails.items
            .map((item) => `${readText(item.productId)}::${readText(item.variantId)}`)
            .filter((entry) => !entry.startsWith('::'))
        )
      )

      for (const pair of uniquePairs) {
        const [productId, variantId] = pair.split('::')
        if (!productId) continue
        try {
          const res = await fetch(`${productApiBase}/v1/products/${productId}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          })
          const data = await res.json().catch(() => ({}))
          const product = data?.product || {}
          const variants = Array.isArray(product?.variants) ? product.variants : []
          const matchedVariant =
            variants.find((variant: any) => readText(variant?._id) === variantId) || variants[0]
          const variantImage = readText(matchedVariant?.variantsImageUrls?.[0]?.url)
          const defaultImage = readText(product?.defaultImages?.[0]?.url)
          const image = variantImage || defaultImage
          if (image) next[pair] = image
        } catch {
          // ignore per-item resolution failures
        }
      }

      if (!cancelled) {
        setResolvedItemImages(next)
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [orderForDetails, token])

  const getItemImage = (item: { imageUrl?: string; productId?: string; variantId?: string }) => {
    const direct = readText(item?.imageUrl)
    if (direct) return resolveItemImage(direct)
    const fallback = resolvedItemImages[`${readText(item?.productId)}::${readText(item?.variantId)}`]
    return resolveItemImage(fallback)
  }

  return (
    <>
      <div className='space-y-5'>


        {error ? (
          <div className='rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-700 dark:text-rose-200'>
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className='rounded-2xl border border-border bg-muted/40 p-8 text-sm text-muted-foreground'>
            Loading courier shipments...
          </div>
        ) : shipmentRows.length === 0 ? (
          <div className='rounded-2xl border border-dashed border-border bg-muted/40 p-8 text-sm text-muted-foreground'>
            No active courier shipments found.
          </div>
        ) : (
          <div className='overflow-x-auto rounded-none border-border bg-transparent shadow-none'>
              <Table>
                <TableHeader className='bg-muted/40'>
                  <TableRow>
                    <TableHead className='px-4 py-3'>Order</TableHead>
                    <TableHead className='px-4 py-3'>Partner</TableHead>
                    <TableHead className='px-4 py-3'>Customer</TableHead>
                    <TableHead className='px-4 py-3'>Destination</TableHead>
                    <TableHead className='px-4 py-3'>Status</TableHead>
                    <TableHead className='px-4 py-3'>Tracking</TableHead>
                    <TableHead className='px-4 py-3'>Products</TableHead>
                    <TableHead className='px-4 py-3'>Updated</TableHead>
                    <TableHead className='px-4 py-3 text-right'>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shipmentRows.map((shipment) => (
                    <TableRow key={shipment.id} className='align-top'>
                      <TableCell className='px-4 py-4'>
                        <div className='min-w-[220px]'>
                          <p className='font-semibold text-foreground'>{shipment.title}</p>
                          <p className='mt-1 text-sm text-muted-foreground'>{shipment.priceLabel}</p>
                        </div>
                      </TableCell>
                      <TableCell className='px-4 py-4'>
                        <Badge className='border-indigo-500/20 bg-indigo-500/10 text-indigo-700 dark:text-indigo-200'>
                          {shipment.partner.title}
                        </Badge>
                      </TableCell>
                      <TableCell className='px-4 py-4'>
                        <div className='min-w-[180px]'>
                          <p className='font-medium text-foreground'>{shipment.customerPrimary}</p>
                          <p className='mt-1 text-sm text-muted-foreground'>
                            {shipment.customerSecondary}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className='max-w-[260px] px-4 py-4 whitespace-normal'>
                        <p className='line-clamp-2 text-sm text-muted-foreground'>
                          {shipment.destinationLabel}
                        </p>
                      </TableCell>
                      <TableCell className='px-4 py-4'>
                        <span className='inline-flex items-center gap-2 text-sm text-muted-foreground'>
                          <Truck className='h-4 w-4 text-muted-foreground' />
                          {shipment.trackingStatus}
                        </span>
                      </TableCell>
                      <TableCell className='px-4 py-4'>
                        {shipment.trackingCode ? (
                          <span className='inline-flex items-center gap-2 text-sm text-muted-foreground'>
                            <ExternalLink className='h-4 w-4 text-muted-foreground' />
                            {shipment.trackingCode}
                          </span>
                        ) : (
                          <span className='text-sm text-muted-foreground'>Not available</span>
                        )}
                      </TableCell>
                      <TableCell className='px-4 py-4'>
                        <span className='text-sm text-muted-foreground'>{shipment.itemsLabel}</span>
                      </TableCell>
                      <TableCell className='px-4 py-4'>
                        <span className='text-sm text-muted-foreground'>
                          {shipment.updatedAt
                            ? new Date(shipment.updatedAt).toLocaleString('en-IN')
                            : 'Not available'}
                        </span>
                      </TableCell>
                      <TableCell className='px-4 py-4 text-right'>
                        <div className='flex justify-end gap-2'>
                          <button
                            onClick={() => setSelectedShipment(shipment)}
                            className="bg-primary text-primary-foreground px-4 py-2 hover:bg-primary/90 text-sm font-medium"
                          >
                            Detail
                          </button>
                          <button
                            onClick={() => window.location.assign(buildTrackingPath(shipment))}
                            className="border border-border bg-background text-foreground px-4 py-2 hover:bg-accent text-sm font-medium inline-flex items-center gap-2"
                          >
                            Tracking
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
          </div>
        )}

        <Dialog
          open={Boolean(selectedShipment)}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedShipment(null)
            }
          }}
        >
          <DialogContent className='max-h-[88vh] max-w-5xl overflow-y-auto rounded-none border border-indigo-200/60 bg-gradient-to-b from-indigo-50/60 via-background to-background p-0 shadow-2xl sm:max-w-5xl'>
            {selectedShipment?.kind === 'order' ? (
              <div className='space-y-6 p-6'>
                <DialogHeader className='space-y-3'>
                  <div className='flex flex-wrap items-start justify-between gap-3 rounded-none border border-indigo-200/60 bg-white/90 p-4'>
                    <div>
                      <DialogTitle className='text-2xl text-foreground'>
                        {selectedShipment.order.orderNumber}
                      </DialogTitle>
                      <DialogDescription className='mt-1 text-sm text-muted-foreground'>
                        {selectedShipment.order.customerName} | {selectedShipment.order.pincode || 'No pincode'} |{' '}
                        {formatINR(selectedShipment.order.total)}
                      </DialogDescription>
                    </div>
                    <Badge className='border-indigo-500/20 bg-indigo-500/10 text-indigo-700 dark:text-indigo-200'>
                      {selectedShipment.partner.title}
                    </Badge>
                  </div>
                </DialogHeader>

                <div className='grid gap-4 md:grid-cols-2'>
                  <div className='rounded-none border border-indigo-200 bg-indigo-50/70 p-4 shadow-sm'>
                    <p className='text-sm font-medium text-foreground'>Shipment</p>
                    <div className='mt-3 space-y-2'>
                      <DetailKV label='Status' value={selectedShipment.trackingStatus} />
                      <DetailKV label='Tracking' value={selectedShipment.trackingCode || 'Not available'} />
                      <DetailKV label='Source' value={selectedShipment.sourceLabel} />
                      <DetailKV label='Updated' value={formatDateTime(selectedShipment.updatedAt)} />
                      {selectedShipment.order.delhivery?.pickup_request_date ? (
                        <DetailKV
                          label='Pickup request'
                          value={`${selectedShipment.order.delhivery.pickup_request_date} ${selectedShipment.order.delhivery.pickup_request_time || ''}`.trim()}
                        />
                      ) : null}
                    </div>
                  </div>

                  <div className='rounded-none border border-emerald-200 bg-emerald-50/70 p-4 shadow-sm'>
                    <p className='text-sm font-medium text-foreground'>Delivery</p>
                    <div className='mt-3 space-y-2'>
                      <DetailKV label='Address' value={selectedShipment.destinationLabel} />
                      <DetailKV label='City' value={selectedShipment.order.city || 'Not available'} />
                      <DetailKV label='State' value={selectedShipment.order.state || 'Not available'} />
                      <DetailKV label='Pincode' value={selectedShipment.order.pincode || 'Not available'} />
                      <DetailKV label='Phone' value={selectedShipment.order.customerPhone || 'Not available'} />
                    </div>
                  </div>
                </div>

                <div className='rounded-none border border-amber-200 bg-amber-50/70 p-4 shadow-sm'>
                  <p className='text-sm font-medium text-foreground'>Vendor & Customer</p>
                  <div className='mt-3 grid gap-2 md:grid-cols-2'>
                    <DetailKV label='Ordered at' value={formatDateTime(selectedShipment.order.createdAt)} />
                    <DetailKV label='Last courier update' value={formatDateTime(selectedShipment.order.delhivery?.updated_at || selectedShipment.updatedAt)} />
                    <DetailKV label='Vendor website' value={selectedShipment.order.websiteLabel || 'Not available'} />
                    <DetailKV label='Order source' value={selectedShipment.order.source} />
                    <DetailKV label='Customer name' value={selectedShipment.order.customerName || 'Not available'} />
                    <DetailKV label='Customer email' value={selectedShipment.order.customerEmail || 'Not available'} />
                    <DetailKV label='Customer phone' value={selectedShipment.order.customerPhone || 'Not available'} />
                    <DetailKV label='Internal order id' value={selectedShipment.order.id} />
                  </div>
                </div>

                <div className='rounded-none border border-indigo-200/70 bg-white p-4 shadow-sm'>
                  <p className='text-sm font-medium text-foreground'>Products</p>
                  <div className='mt-3 space-y-3'>
                    {selectedShipment.order.items.map((item, index) => (
                      <div
                        key={`${selectedShipment.order.id}-${item.productName}-${index}`}
                        className='flex items-start gap-3 rounded-none border border-indigo-100 bg-gradient-to-r from-white to-indigo-50/50 p-3 text-sm text-muted-foreground'
                      >
                        <img
                          src={getItemImage(item)}
                          alt={item.productName || 'Product'}
                          className='h-16 w-16 rounded-xl border border-indigo-200 bg-background object-cover shadow-sm'
                        />
                        <div>
                          <p className='font-semibold text-foreground'>{item.productName}</p>
                          <p>
                            Qty {item.quantity} |{' '}
                            {formatINR(item.totalPrice || item.unitPrice * item.quantity)}
                          </p>
                          <p>Unit price: {formatINR(item.unitPrice || 0)}</p>
                          {item.variantSummary ? <p>{item.variantSummary}</p> : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className='flex flex-wrap justify-end gap-2'>
                  <Button
                    variant='outline'
                    className='border-border bg-background text-foreground hover:bg-accent hover:text-foreground'
                    onClick={() => window.location.assign(buildTrackingPath(selectedShipment))}
                  >
                    Open Tracking
                  </Button>
                </div>
              </div>
            ) : selectedShipment?.kind === 'external-delhivery' ? (
              <div className='space-y-6 p-6'>
                <DialogHeader className='space-y-3'>
                  <div className='flex flex-wrap items-start justify-between gap-3 rounded-none border border-indigo-200/60 bg-white/90 p-4'>
                    <div>
                      <DialogTitle className='text-2xl text-foreground'>
                        {selectedShipment.externalShipment.waybill ||
                          selectedShipment.externalShipment.order_id ||
                          'Imported Delhivery shipment'}
                      </DialogTitle>
                      <DialogDescription className='mt-1 text-sm text-muted-foreground'>
                        Imported from Delhivery panel | {selectedShipment.externalShipment.order_id || 'No ref_ids'}
                      </DialogDescription>
                    </div>
                    <Badge className='border-indigo-500/20 bg-indigo-500/10 text-indigo-700 dark:text-indigo-200'>
                      {selectedShipment.partner.title}
                    </Badge>
                  </div>
                </DialogHeader>

                <div className='grid gap-4 md:grid-cols-2'>
                  <div className='rounded-none border border-indigo-200 bg-indigo-50/70 p-4 shadow-sm'>
                    <p className='text-sm font-medium text-foreground'>Shipment</p>
                    <div className='mt-3 space-y-2 text-sm text-muted-foreground'>
                      <p>Status: {selectedShipment.trackingStatus}</p>
                      <p>Tracking: {selectedShipment.trackingCode || 'Not available'}</p>
                      <p>Source: {selectedShipment.sourceLabel}</p>
                      <p>AWB: {selectedShipment.externalShipment.waybill || 'Not available'}</p>
                      <p>Order ref id: {selectedShipment.externalShipment.order_id || 'Not available'}</p>
                      <p>Imported at: {formatDateTime(selectedShipment.externalShipment.createdAt || selectedShipment.externalShipment.last_synced_at || selectedShipment.updatedAt)}</p>
                      <p>
                        Last synced:{' '}
                        {formatDateTime(selectedShipment.updatedAt)}
                      </p>
                      {selectedShipment.externalShipment.status_description ? (
                        <p>Description: {selectedShipment.externalShipment.status_description}</p>
                      ) : null}
                      {selectedShipment.externalShipment.label_url ? (
                        <a
                          href={selectedShipment.externalShipment.label_url}
                          target='_blank'
                          rel='noreferrer'
                          className='inline-flex items-center gap-1 font-medium text-indigo-600 hover:underline'
                        >
                          Open shipping label
                          <ExternalLink className='h-3.5 w-3.5' />
                        </a>
                      ) : null}
                    </div>
                  </div>

                  <div className='rounded-none border border-emerald-200 bg-emerald-50/70 p-4 shadow-sm'>
                    <p className='text-sm font-medium text-foreground'>Delivery</p>
                    <div className='mt-3 space-y-2 text-sm text-muted-foreground'>
                      <p>Origin: {selectedShipment.externalShipment.origin || 'Not available'}</p>
                      <p>Destination: {selectedShipment.destinationLabel}</p>
                      <p>
                        Requested waybills:{' '}
                        {selectedShipment.externalShipment.requested_waybills?.join(', ') || 'Not available'}
                      </p>
                      <p>
                        Requested ref_ids:{' '}
                        {selectedShipment.externalShipment.requested_ref_ids?.join(', ') || 'Not available'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className='rounded-none border border-amber-200 bg-amber-50/70 p-4 shadow-sm'>
                  <p className='text-sm font-medium text-foreground'>Buyer & Order Metadata</p>
                  {linkedOrderForSelectedExternal ? (
                    <div className='mt-3 grid gap-2 text-sm text-muted-foreground md:grid-cols-2'>
                      <p>Customer: {linkedOrderForSelectedExternal.customerName || 'Not available'}</p>
                      <p>Phone: {linkedOrderForSelectedExternal.customerPhone || 'Not available'}</p>
                      <p>Email: {linkedOrderForSelectedExternal.customerEmail || 'Not available'}</p>
                      <p>Buy time: {formatDateTime(linkedOrderForSelectedExternal.createdAt)}</p>
                      <p>Order source: {linkedOrderForSelectedExternal.source}</p>
                      <p>Website: {linkedOrderForSelectedExternal.websiteLabel || 'Not available'}</p>
                      <p>Address: {linkedOrderForSelectedExternal.address || 'Not available'}</p>
                      <p>
                        City/State/PIN: {linkedOrderForSelectedExternal.city || '-'}, {linkedOrderForSelectedExternal.state || '-'} {linkedOrderForSelectedExternal.pincode || '-'}
                      </p>
                      <p>Order total: {formatINR(linkedOrderForSelectedExternal.total || 0)}</p>
                      <p>Order status: {linkedOrderForSelectedExternal.status || 'Not available'}</p>
                    </div>
                  ) : (
                    <p className='mt-3 text-sm text-muted-foreground'>
                      Full buyer/order details are not available in this imported Delhivery record.
                    </p>
                  )}
                </div>

                {linkedOrderForSelectedExternal ? (
                  <div className='rounded-none border border-indigo-200/70 bg-white p-4 shadow-sm'>
                    <p className='text-sm font-medium text-foreground'>Products</p>
                    <div className='mt-3 space-y-3'>
                      {linkedOrderForSelectedExternal.items.map((item, index) => (
                        <div
                          key={`${linkedOrderForSelectedExternal.id}-${item.productName}-${index}`}
                          className='flex items-start gap-3 rounded-none border border-indigo-100 bg-gradient-to-r from-white to-indigo-50/50 p-3 text-sm text-muted-foreground'
                        >
                          <img
                            src={getItemImage(item)}
                            alt={item.productName || 'Product'}
                            className='h-16 w-16 rounded-xl border border-indigo-200 bg-background object-cover shadow-sm'
                          />
                          <div>
                            <p className='font-medium text-foreground'>{item.productName}</p>
                            <p>
                              Qty {item.quantity} | {formatINR(item.totalPrice || item.unitPrice * item.quantity)}
                            </p>
                            <p>Unit price: {formatINR(item.unitPrice || 0)}</p>
                            {item.variantSummary ? <p>{item.variantSummary}</p> : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className='rounded-none border border-border bg-card p-4'>
                  <p className='text-sm font-medium text-foreground'>Tracking History</p>
                  <div className='mt-3 space-y-3'>
                    {selectedShipment.externalShipment.scans?.length ? (
                      selectedShipment.externalShipment.scans.map((scan, index) => (
                        <div
                          key={`${selectedShipment.externalShipment.id}-scan-${index}-${readText(scan.time)}`}
                          className='rounded-none border border-border bg-muted/40 p-3 text-sm text-muted-foreground'
                        >
                          <p className='font-medium text-foreground'>
                            {readText(scan.status || scan.status_type || 'Update')}
                          </p>
                          {scan.description ? <p className='mt-1'>{scan.description}</p> : null}
                          <p className='mt-1'>Location: {scan.location || 'Not available'}</p>
                          <p className='mt-1'>
                            Time:{' '}
                            {scan.time ? new Date(scan.time).toLocaleString('en-IN') : 'Not available'}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className='rounded-none border border-dashed border-border bg-muted/40 p-6 text-sm text-muted-foreground'>
                        No scan history stored yet. Open Delhivery Sync and run `Track now` to fetch it.
                      </div>
                    )}
                  </div>
                </div>

                <div className='flex flex-wrap justify-end gap-2'>
                  <Button
                    variant='outline'
                    className='border-border bg-background text-foreground hover:bg-accent hover:text-foreground'
                    onClick={() => window.location.assign(buildTrackingPath(selectedShipment))}
                  >
                    Open Tracking
                  </Button>
                </div>
              </div>
            ) : null}
          </DialogContent>
        </Dialog>
      </div>
    </>
  )
}
