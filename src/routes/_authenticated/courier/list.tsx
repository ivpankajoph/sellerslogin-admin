import { createFileRoute } from '@tanstack/react-router'
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
import { getAssignedCourierForOrder, loadCourierOrders } from '@/features/courier/api'
import {
  COURIER_PARTNER_MAP,
  hasAnyActiveCourierAssignment,
  type CourierPartnerId,
  type CourierOrderSummary,
} from '@/features/courier/data'
import { formatINR } from '@/lib/currency'
import type { RootState } from '@/store'

export const Route = createFileRoute('/_authenticated/courier/list')({
  component: CourierListPage,
})

type ShipmentRow = {
  order: CourierOrderSummary
  partner: (typeof COURIER_PARTNER_MAP)[CourierPartnerId]
  partnerPath: string
  trackingCode: string
  trackingStatus: string
  updatedAt: string
  sourceLabel: string
  destinationLabel: string
}

function CourierListPage() {
  const role = String(useSelector((state: RootState) => state.auth?.user?.role || '')).toLowerCase()
  const isVendor = role === 'vendor'
  const [orders, setOrders] = useState<CourierOrderSummary[]>([])
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
        const nextOrders = await loadCourierOrders(isVendor)
        if (cancelled) return
        setOrders(nextOrders)
      } catch (err: any) {
        if (cancelled) return
        setError(err?.response?.data?.message || 'Failed to load courier shipments')
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

  const shipmentRows = useMemo(
    () =>
      orders
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

          const partnerPath =
            partner.id === 'borzo' ? '/borzo-report' : `/courier/${partner.id}`

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
            order,
            partner,
            partnerPath,
            trackingCode,
            trackingStatus,
            updatedAt,
            sourceLabel,
            destinationLabel,
          }
        })
        .sort((left, right) => {
          const leftTime = new Date(left.updatedAt || 0).getTime()
          const rightTime = new Date(right.updatedAt || 0).getTime()
          return rightTime - leftTime
        }),
    [orders]
  )

  return (
    <Main>
      <div className='space-y-6 p-4 md:p-6'>
        <div className='overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm'>
          <div className='bg-[linear-gradient(135deg,rgba(248,250,252,0.95)_0%,rgba(239,246,255,0.95)_50%,rgba(255,247,237,0.92)_100%)] p-6 md:p-8'>
            <div className='flex flex-wrap items-start justify-between gap-4'>
              <div className='space-y-2'>
                <h1 className='text-3xl font-semibold tracking-tight text-slate-950'>
                  Courier List
                </h1>
                <p className='max-w-3xl text-sm leading-6 text-slate-600'>
                  All live courier shipments are tracked here. Routed orders stay out of Courier Desk
                  and can be managed from their app page.
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
          <div className='rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700'>
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className='rounded-2xl border border-slate-200 bg-slate-50 p-8 text-sm text-slate-600'>
            Loading courier shipments...
          </div>
        ) : shipmentRows.length === 0 ? (
          <div className='rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-sm text-slate-600'>
            No active courier shipments found.
          </div>
        ) : (
          <Card className='overflow-hidden rounded-3xl border-slate-200 shadow-sm'>
            <CardContent className='p-0'>
              <Table>
                <TableHeader className='bg-slate-50'>
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
                  {shipmentRows.map((shipment) => {
                    const { order, partner, trackingCode, trackingStatus, destinationLabel, updatedAt } =
                      shipment

                    return (
                      <TableRow key={`${partner.id}-${order.id}`} className='align-top'>
                        <TableCell className='px-4 py-4'>
                          <div className='min-w-[220px]'>
                            <p className='font-semibold text-slate-950'>{order.orderNumber}</p>
                            <p className='mt-1 text-sm text-slate-500'>{formatINR(order.total)}</p>
                          </div>
                        </TableCell>
                        <TableCell className='px-4 py-4'>
                          <Badge className='border-indigo-200 bg-indigo-50 text-indigo-700'>
                            {partner.title}
                          </Badge>
                        </TableCell>
                        <TableCell className='px-4 py-4'>
                          <div className='min-w-[180px]'>
                            <p className='font-medium text-slate-900'>{order.customerName || 'No customer'}</p>
                            <p className='mt-1 text-sm text-slate-500'>{order.pincode || 'No pincode'}</p>
                          </div>
                        </TableCell>
                        <TableCell className='max-w-[260px] px-4 py-4 whitespace-normal'>
                          <p className='line-clamp-2 text-sm text-slate-600'>{destinationLabel}</p>
                        </TableCell>
                        <TableCell className='px-4 py-4'>
                          <span className='inline-flex items-center gap-2 text-sm text-slate-600'>
                            <Truck className='h-4 w-4 text-slate-400' />
                            {trackingStatus}
                          </span>
                        </TableCell>
                        <TableCell className='px-4 py-4'>
                          {trackingCode ? (
                            <span className='inline-flex items-center gap-2 text-sm text-slate-600'>
                              <ExternalLink className='h-4 w-4 text-slate-400' />
                              {trackingCode}
                            </span>
                          ) : (
                            <span className='text-sm text-slate-400'>Not available</span>
                          )}
                        </TableCell>
                        <TableCell className='px-4 py-4'>
                          <span className='text-sm text-slate-600'>{order.items.length} item(s)</span>
                        </TableCell>
                        <TableCell className='px-4 py-4'>
                          <span className='text-sm text-slate-600'>
                            {updatedAt ? new Date(updatedAt).toLocaleString('en-IN') : 'Not available'}
                          </span>
                        </TableCell>
                        <TableCell className='px-4 py-4 text-right'>
                          <div className='flex justify-end gap-2'>
                            <Button
                              variant='outline'
                              className='border-slate-200 bg-white hover:bg-slate-50'
                              onClick={() => setSelectedShipment(shipment)}
                            >
                              View details
                            </Button>
                            <Button
                              variant='outline'
                              className='border-slate-200 bg-white hover:bg-slate-50'
                              onClick={() => window.location.assign(shipment.partnerPath)}
                            >
                              Open {partner.title}
                              <ArrowUpRight className='h-4 w-4' />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
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
          <DialogContent className='max-h-[85vh] max-w-4xl overflow-y-auto border-slate-200 p-0 sm:max-w-4xl'>
            {selectedShipment ? (
              <div className='space-y-6 p-6'>
                <DialogHeader className='space-y-3'>
                  <div className='flex flex-wrap items-start justify-between gap-3'>
                    <div>
                      <DialogTitle className='text-2xl text-slate-950'>
                        {selectedShipment.order.orderNumber}
                      </DialogTitle>
                      <DialogDescription className='mt-1 text-sm text-slate-500'>
                        {selectedShipment.order.customerName} | {selectedShipment.order.pincode || 'No pincode'} |{' '}
                        {formatINR(selectedShipment.order.total)}
                      </DialogDescription>
                    </div>
                    <Badge className='border-indigo-200 bg-indigo-50 text-indigo-700'>
                      {selectedShipment.partner.title}
                    </Badge>
                  </div>
                </DialogHeader>

                <div className='grid gap-4 md:grid-cols-2'>
                  <div className='rounded-2xl border border-slate-200 bg-slate-50 p-4'>
                    <p className='text-sm font-medium text-slate-900'>Shipment</p>
                    <div className='mt-3 space-y-2 text-sm text-slate-600'>
                      <p>Status: {selectedShipment.trackingStatus}</p>
                      <p>Tracking: {selectedShipment.trackingCode || 'Not available'}</p>
                      <p>Source: {selectedShipment.sourceLabel}</p>
                      <p>Updated: {selectedShipment.updatedAt ? new Date(selectedShipment.updatedAt).toLocaleString('en-IN') : 'Not available'}</p>
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

                  <div className='rounded-2xl border border-slate-200 bg-slate-50 p-4'>
                    <p className='text-sm font-medium text-slate-900'>Delivery</p>
                    <div className='mt-3 space-y-2 text-sm text-slate-600'>
                      <p>Address: {selectedShipment.destinationLabel}</p>
                      <p>City: {selectedShipment.order.city || 'Not available'}</p>
                      <p>State: {selectedShipment.order.state || 'Not available'}</p>
                      <p>Pincode: {selectedShipment.order.pincode || 'Not available'}</p>
                      <p>Phone: {selectedShipment.order.customerPhone || 'Not available'}</p>
                    </div>
                  </div>
                </div>

                <div className='rounded-2xl border border-slate-200 bg-white p-4'>
                  <p className='text-sm font-medium text-slate-900'>Products</p>
                  <div className='mt-3 space-y-3'>
                    {selectedShipment.order.items.map((item, index) => (
                      <div
                        key={`${selectedShipment.order.id}-${item.productName}-${index}`}
                        className='flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600'
                      >
                        <Package2 className='mt-0.5 h-4 w-4 text-slate-400' />
                        <div>
                          <p className='font-medium text-slate-900'>{item.productName}</p>
                          <p>
                            Qty {item.quantity} | {formatINR(item.totalPrice || item.unitPrice * item.quantity)}
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
                    className='border-slate-200 bg-white hover:bg-slate-50'
                    onClick={() => window.location.assign(selectedShipment.partnerPath)}
                  >
                    Open {selectedShipment.partner.title}
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
