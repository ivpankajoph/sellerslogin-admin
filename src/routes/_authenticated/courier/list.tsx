import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowUpRight, ExternalLink, Package2, RefreshCcw, Truck } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { Main } from '@/components/layout/main'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
  partnerPath: string
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
  partnerPath: string
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

function CourierListPage() {
  const role = String(useSelector((state: RootState) => state.auth?.user?.role || '')).toLowerCase()
  const isVendor = role === 'vendor'
  const [orders, setOrders] = useState<CourierOrderSummary[]>([])
  const [externalShipments, setExternalShipments] = useState<ExternalDelhiveryShipment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const [selectedShipment, setSelectedShipment] = useState<ShipmentRow | null>(null)

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
  }, [isVendor, refreshKey])

  const shipmentRows = useMemo(() => {
    const orderRows = orders
      .filter((order) => hasAnyActiveCourierAssignment(order))
      .map<ShipmentRow>((order) => {
        const assignment = getAssignedCourierForOrder(order)
        const partnerId: CourierPartnerId = assignment
          ? assignment.partnerId
          : order.delhivery?.waybill || order.delhivery?.waybills?.length
            ? 'delhivery'
            : order.nimbuspost?.shipment_id || order.nimbuspost?.awb_number
              ? 'nimbuspost'
              : 'borzo'
        const partner = COURIER_PARTNER_MAP[partnerId]

        const partnerPath = `/courier/${partner.id}`

        const trackingCode =
          assignment?.trackingCode ||
          order.delhivery?.waybill ||
          order.delhivery?.waybills?.[0] ||
          order.nimbuspost?.awb_number ||
          (order.nimbuspost?.shipment_id ? String(order.nimbuspost.shipment_id) : '') ||
          (order.borzo?.order_id ? String(order.borzo.order_id) : '')

        const trackingStatus =
          assignment?.trackingStatus ||
          order.delhivery?.status ||
          order.nimbuspost?.status ||
          order.borzo?.status ||
          'Active'

        const updatedAt =
          order.delhivery?.updated_at ||
          order.nimbuspost?.updated_at ||
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
          partnerPath,
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
      partnerPath: '/courier/delhivery',
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

  return (
    <Main>
      <div className='space-y-6 p-4 md:p-6'>
        <div className='overflow-hidden rounded-3xl border border-border bg-card shadow-sm'>
          <div className='bg-[linear-gradient(135deg,color-mix(in_srgb,var(--card)_94%,#cbd5e1_6%)_0%,color-mix(in_srgb,var(--background)_92%,#67e8f9_8%)_50%,color-mix(in_srgb,var(--card)_92%,#fdba74_8%)_100%)] p-6 md:p-8'>
            <div className='flex flex-wrap items-start justify-between gap-4'>
              <div className='space-y-2'>
                <h1 className='text-3xl font-semibold tracking-tight text-foreground'>
                  Courier List
                </h1>
                <p className='max-w-3xl text-sm leading-6 text-muted-foreground'>
                  All live courier shipments are tracked here. Routed orders stay out of Courier Desk
                  and can be managed from their app page.
                </p>
              </div>
              <div className='flex flex-wrap gap-2'>
                <Button
                  variant='outline'
                  className='border-border bg-background text-foreground hover:bg-accent hover:text-foreground'
                  onClick={() => setRefreshKey((current) => current + 1)}
                >
                  <RefreshCcw className='h-4 w-4' />
                  Refresh
                </Button>
                {isVendor ? (
                  <Button
                    variant='outline'
                    className='border-border bg-background text-foreground hover:bg-accent hover:text-foreground'
                    asChild
                  >
                    <Link to='/courier/delhivery'>
                      Delhivery Sync
                      <ArrowUpRight className='h-4 w-4' />
                    </Link>
                  </Button>
                ) : null}
                <Button
                  variant='outline'
                  className='border-border bg-background text-foreground hover:bg-accent hover:text-foreground'
                  onClick={() => window.location.assign('/courier')}
                >
                  Courier Desk
                  <ArrowUpRight className='h-4 w-4' />
                </Button>
              </div>
            </div>
          </div>
        </div>

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
          <Card className='overflow-hidden rounded-3xl border-border bg-card shadow-sm'>
            <CardContent className='p-0'>
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
                          <Button
                            variant='outline'
                            className='border-border bg-background text-foreground hover:bg-accent hover:text-foreground'
                            onClick={() => setSelectedShipment(shipment)}
                          >
                            View details
                          </Button>
                          <Button
                            variant='outline'
                            className='border-border bg-background text-foreground hover:bg-accent hover:text-foreground'
                            onClick={() => window.location.assign(shipment.partnerPath)}
                          >
                            Open {shipment.partner.title}
                            <ArrowUpRight className='h-4 w-4' />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        <Dialog
          open={Boolean(selectedShipment)}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedShipment(null)
            }
          }}
        >
          <DialogContent className='max-h-[85vh] max-w-4xl overflow-y-auto border-border bg-card p-0 sm:max-w-4xl'>
            {selectedShipment?.kind === 'order' ? (
              <div className='space-y-6 p-6'>
                <DialogHeader className='space-y-3'>
                  <div className='flex flex-wrap items-start justify-between gap-3'>
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
                  <div className='rounded-2xl border border-border bg-muted/40 p-4'>
                    <p className='text-sm font-medium text-foreground'>Shipment</p>
                    <div className='mt-3 space-y-2 text-sm text-muted-foreground'>
                      <p>Status: {selectedShipment.trackingStatus}</p>
                      <p>Tracking: {selectedShipment.trackingCode || 'Not available'}</p>
                      <p>Source: {selectedShipment.sourceLabel}</p>
                      <p>
                        Updated:{' '}
                        {selectedShipment.updatedAt
                          ? new Date(selectedShipment.updatedAt).toLocaleString('en-IN')
                          : 'Not available'}
                      </p>
                      {selectedShipment.order.delhivery?.pickup_request_date ? (
                        <p>
                          Pickup request: {selectedShipment.order.delhivery.pickup_request_date}{' '}
                          {selectedShipment.order.delhivery.pickup_request_time || ''}
                        </p>
                      ) : null}
                      {selectedShipment.order.nimbuspost?.courier_name ? (
                        <p>Courier: {selectedShipment.order.nimbuspost.courier_name}</p>
                      ) : null}
                    </div>
                  </div>

                  <div className='rounded-2xl border border-border bg-muted/40 p-4'>
                    <p className='text-sm font-medium text-foreground'>Delivery</p>
                    <div className='mt-3 space-y-2 text-sm text-muted-foreground'>
                      <p>Address: {selectedShipment.destinationLabel}</p>
                      <p>City: {selectedShipment.order.city || 'Not available'}</p>
                      <p>State: {selectedShipment.order.state || 'Not available'}</p>
                      <p>Pincode: {selectedShipment.order.pincode || 'Not available'}</p>
                      <p>Phone: {selectedShipment.order.customerPhone || 'Not available'}</p>
                    </div>
                  </div>
                </div>

                <div className='rounded-2xl border border-border bg-card p-4'>
                  <p className='text-sm font-medium text-foreground'>Products</p>
                  <div className='mt-3 space-y-3'>
                    {selectedShipment.order.items.map((item, index) => (
                      <div
                        key={`${selectedShipment.order.id}-${item.productName}-${index}`}
                        className='flex items-start gap-3 rounded-2xl border border-border bg-muted/40 p-3 text-sm text-muted-foreground'
                      >
                        <Package2 className='mt-0.5 h-4 w-4 text-muted-foreground' />
                        <div>
                          <p className='font-medium text-foreground'>{item.productName}</p>
                          <p>
                            Qty {item.quantity} |{' '}
                            {formatINR(item.totalPrice || item.unitPrice * item.quantity)}
                          </p>
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
                    onClick={() => window.location.assign(selectedShipment.partnerPath)}
                  >
                    Open {selectedShipment.partner.title}
                    <ArrowUpRight className='h-4 w-4' />
                  </Button>
                </div>
              </div>
            ) : selectedShipment?.kind === 'external-delhivery' ? (
              <div className='space-y-6 p-6'>
                <DialogHeader className='space-y-3'>
                  <div className='flex flex-wrap items-start justify-between gap-3'>
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
                  <div className='rounded-2xl border border-border bg-muted/40 p-4'>
                    <p className='text-sm font-medium text-foreground'>Shipment</p>
                    <div className='mt-3 space-y-2 text-sm text-muted-foreground'>
                      <p>Status: {selectedShipment.trackingStatus}</p>
                      <p>Tracking: {selectedShipment.trackingCode || 'Not available'}</p>
                      <p>Source: {selectedShipment.sourceLabel}</p>
                      <p>
                        Last synced:{' '}
                        {selectedShipment.updatedAt
                          ? new Date(selectedShipment.updatedAt).toLocaleString('en-IN')
                          : 'Not available'}
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

                  <div className='rounded-2xl border border-border bg-muted/40 p-4'>
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

                <div className='rounded-2xl border border-border bg-card p-4'>
                  <p className='text-sm font-medium text-foreground'>Tracking History</p>
                  <div className='mt-3 space-y-3'>
                    {selectedShipment.externalShipment.scans?.length ? (
                      selectedShipment.externalShipment.scans.map((scan, index) => (
                        <div
                          key={`${selectedShipment.externalShipment.id}-scan-${index}-${readText(scan.time)}`}
                          className='rounded-2xl border border-border bg-muted/40 p-3 text-sm text-muted-foreground'
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
                      <div className='rounded-2xl border border-dashed border-border bg-muted/40 p-6 text-sm text-muted-foreground'>
                        No scan history stored yet. Open Delhivery Sync and run `Track now` to fetch it.
                      </div>
                    )}
                  </div>
                </div>

                <div className='flex flex-wrap justify-end gap-2'>
                  <Button
                    variant='outline'
                    className='border-border bg-background text-foreground hover:bg-accent hover:text-foreground'
                    onClick={() => window.location.assign(selectedShipment.partnerPath)}
                  >
                    Open Delhivery Sync
                    <ArrowUpRight className='h-4 w-4' />
                  </Button>
                </div>
              </div>
            ) : null}
          </DialogContent>
        </Dialog>
      </div>
    </Main>
  )
}
