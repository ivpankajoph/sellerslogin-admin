import { createFileRoute } from '@tanstack/react-router'
import { LoaderCircle, MapPin, Package2, RefreshCcw, Truck } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { toast } from 'sonner'
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
import {
  cancelExternalDelhiveryShipment,
  cancelDelhiveryShipment,
  fetchExternalDelhiveryShipments,
  loadCourierOrders,
  refreshExternalDelhiveryShipment,
  trackDelhiveryShipment,
  type ExternalDelhiveryShipment,
} from '@/features/courier/api'
import type { CourierOrderSummary } from '@/features/courier/data'
import { formatINR } from '@/lib/currency'
import type { RootState } from '@/store'

export const Route = createFileRoute('/_authenticated/courier/tracking')({
  component: CourierTrackingPage,
})

const readText = (value: unknown) => String(value ?? '').trim()

type TimelinePoint = {
  status: string
  description: string
  location: string
  time: string
}

type TrackingViewData = {
  awb: string
  status: string
  orderLabel: string
  pickupAddress: string
  deliveryAddress: string
  paymentMode: string
  packageDetails: string
  weightLabel: string
  totalLabel: string
  customerLabel: string
  vendorLabel: string
  timeline: TimelinePoint[]
}

const normalizeTimeline = (rows: any[] = []): TimelinePoint[] =>
  rows
    .map((row) => ({
      status: readText(row?.status || row?.status_type || row?.scan || 'Update'),
      description: readText(row?.description || row?.remark || row?.instructions || ''),
      location: readText(row?.location || row?.city || row?.hub || ''),
      time: readText(row?.time || row?.updated_at || row?.date || ''),
    }))
    .filter((row) => row.status)

function CourierTrackingPage() {
  const role = String(useSelector((state: RootState) => state.auth?.user?.role || '')).toLowerCase()
  const isVendor = role === 'vendor'

  const query = useMemo(() => {
    if (typeof window === 'undefined') return { kind: 'order', orderId: '', source: '', shipmentId: '', tracking: '' }
    const params = new URLSearchParams(window.location.search)
    return {
      kind: readText(params.get('kind')) || 'order',
      orderId: readText(params.get('orderId')),
      source: readText(params.get('source')),
      shipmentId: readText(params.get('shipmentId')),
      tracking: readText(params.get('tracking')),
    }
  }, [])

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [canceling, setCanceling] = useState(false)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [pendingCancelType, setPendingCancelType] = useState<'shipment' | 'delivery'>('shipment')
  const [error, setError] = useState('')
  const [data, setData] = useState<TrackingViewData | null>(null)
  const [orderForActions, setOrderForActions] = useState<CourierOrderSummary | null>(null)

  const loadTracking = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    setError('')

    try {
      if (query.kind === 'external') {
        setOrderForActions(null)
        const list = await fetchExternalDelhiveryShipments()
        const shipment = (list?.shipments || []).find((entry) => entry.id === query.shipmentId)
        if (!shipment) throw new Error('Shipment not found')

        let latest: ExternalDelhiveryShipment = shipment
        try {
          const tracked = await refreshExternalDelhiveryShipment(shipment.id)
          if (tracked?.shipment) latest = tracked.shipment
        } catch {
          latest = shipment
        }

        const scans = normalizeTimeline(Array.isArray(latest.scans) ? latest.scans : [])
        setData({
          awb: readText(latest.waybill || latest.order_id || query.tracking || 'N/A'),
          status: readText(latest.status || latest.status_description || 'Active'),
          orderLabel: readText(latest.order_id || latest.waybill || 'Imported Delhivery shipment'),
          pickupAddress: readText(latest.origin || 'Not available'),
          deliveryAddress: readText(latest.destination || 'Not available'),
          paymentMode: 'Pre-paid',
          packageDetails: 'NA',
          weightLabel: 'NA',
          totalLabel: 'Imported from Delhivery',
          customerLabel: 'Delhivery panel shipment',
          vendorLabel: 'Seller panel import',
          timeline: scans,
        })
        return
      }

      const orders = await loadCourierOrders(isVendor)
      const order = orders.find(
        (entry) =>
          entry.id === query.orderId &&
          (!query.source || entry.source === query.source)
      )
      if (!order) throw new Error('Order not found')
      setOrderForActions(order)

      const waybill =
        query.tracking ||
        readText(order.delhivery?.waybill) ||
        readText(order.delhivery?.waybills?.[0]) ||
        undefined

      const trackRes = await trackDelhiveryShipment(order, waybill ? { waybill } : {})
      const trackingPayload = (trackRes?.tracking || trackRes?.shipment || trackRes?.data || {}) as any
      const scans = normalizeTimeline(
        Array.isArray(trackingPayload?.scans)
          ? trackingPayload.scans
          : Array.isArray(order.delhivery?.scans)
            ? order.delhivery?.scans
            : []
      )

      setData({
        awb: readText(
          trackingPayload?.waybill || trackingPayload?.awb || waybill || order.delhivery?.waybill || 'N/A'
        ),
        status: readText(
          trackingPayload?.status ||
          trackingPayload?.status_description ||
          order.delhivery?.status ||
          'Active'
        ),
        orderLabel: readText(order.orderNumber),
        pickupAddress: readText(order.delhivery?.pickup_location || 'Pickup location not available'),
        deliveryAddress: readText(order.address || `${order.city}, ${order.state}, ${order.pincode}`),
        paymentMode: readText(order.delhivery?.payment_mode || 'Pre-paid'),
        packageDetails: `${readText(order.itemsCount)} item(s)`,
        weightLabel: readText(trackingPayload?.chargeable_weight || 'NA'),
        totalLabel: formatINR(order.total),
        customerLabel: `${readText(order.customerName)} (${readText(order.customerPhone) || 'No phone'})`,
        vendorLabel: readText(order.websiteLabel || 'Vendor website'),
        timeline: scans,
      })
    } catch (err: any) {
      setOrderForActions(null)
      setData(null)
      setError(err?.response?.data?.message || err?.message || 'Failed to fetch Delhivery tracking')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    void loadTracking(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.kind, query.orderId, query.shipmentId, query.source, query.tracking, isVendor])

  const runCancel = async (type: 'shipment' | 'delivery') => {
    const isDeliveryCancel = type === 'delivery'
    try {
      setCanceling(true)
      if (query.kind === 'external') {
        const awb = readText(data?.awb || query.tracking)
        if (!query.shipmentId) {
          toast.error('Shipment id not found for cancellation')
          return
        }
        if (!awb || awb === 'N/A') {
          toast.error('Waybill not available for cancellation')
          return
        }
        await cancelExternalDelhiveryShipment(query.shipmentId, {
          waybill: awb,
          cancellation: 'true',
        })
      } else {
        if (!orderForActions) {
          toast.error('Order not found for cancellation')
          return
        }
        const awb = readText(data?.awb || orderForActions?.delhivery?.waybill || orderForActions?.delhivery?.waybills?.[0])
        if (!awb || awb === 'N/A') {
          toast.error('Waybill not available for cancellation')
          return
        }
        await cancelDelhiveryShipment(orderForActions, {
          waybill: awb,
          cancellation: 'true',
          cancel_type: isDeliveryCancel ? 'delivery' : 'shipment',
        })
      }
      toast.success(isDeliveryCancel ? 'Delivery cancel request sent to Delhivery' : 'Shipment cancel request sent to Delhivery')
      await loadTracking(true)
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to cancel on Delhivery')
    } finally {
      setCanceling(false)
    }
  }

  const openCancelDialog = (type: 'shipment' | 'delivery') => {
    setPendingCancelType(type)
    setCancelDialogOpen(true)
  }

  return (
    <>
      <div className='space-y-5'>
        <div className='flex flex-wrap items-center justify-between gap-3 rounded-none border bg-card p-4'>
          <div>
            <h1 className='text-xl font-semibold'>Delhivery Tracking</h1>
            <p className='text-sm text-muted-foreground'>Live shipment status and scan timeline.</p>
          </div>
          <div className='flex gap-2'>
            <Button
              variant='outline'
              className='border-rose-600 text-rose-600 hover:bg-rose-600 hover:text-white'
              disabled={
                canceling ||
                refreshing ||
                (query.kind === 'order' ? !orderForActions : !query.shipmentId)
              }
              onClick={() => openCancelDialog('shipment')}
            >
              {canceling ? <LoaderCircle className='h-4 w-4 animate-spin' /> : null}
              Cancel Shipment
            </Button>
            <Button
              variant='outline'
              className='border-rose-600 text-rose-600 hover:bg-rose-600 hover:text-white'
              disabled={
                canceling ||
                refreshing ||
                (query.kind === 'order' ? !orderForActions : !query.shipmentId)
              }
              onClick={() => openCancelDialog('delivery')}
            >
              {canceling ? <LoaderCircle className='h-4 w-4 animate-spin' /> : null}
              Cancel Delivery
            </Button>
            <Button variant='outline' onClick={() => window.location.assign('/courier/list')}>
              Go to Courier List
            </Button>
            <Button variant='outline' disabled={refreshing} onClick={() => void loadTracking(true)}>
              {refreshing ? <LoaderCircle className='h-4 w-4 animate-spin' /> : <RefreshCcw className='h-4 w-4' />}
              Refresh
            </Button>
          </div>
        </div>

        {loading ? (
          <div className='rounded-none border bg-card p-6 text-sm text-muted-foreground'>Loading tracking data...</div>
        ) : error ? (
          <div className='rounded-none border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700'>{error}</div>
        ) : data ? (
          <div className='grid gap-5 xl:grid-cols-[1.6fr_1fr]'>
            <div className='space-y-4'>
              <div className='rounded-none border bg-card p-4'>
                <p className='text-lg font-semibold'>Order Details</p>
                <div className='mt-3 grid gap-3 md:grid-cols-2'>
                  <div className='rounded-none border bg-muted/30 p-3'>
                    <p className='text-xs text-muted-foreground'>Order</p>
                    <p className='font-medium'>{data.orderLabel}</p>
                  </div>
                  <div className='rounded-none border bg-muted/30 p-3'>
                    <p className='text-xs text-muted-foreground'>Customer</p>
                    <p className='font-medium'>{data.customerLabel}</p>
                  </div>
                  <div className='rounded-none border bg-muted/30 p-3'>
                    <p className='text-xs text-muted-foreground'>Vendor</p>
                    <p className='font-medium'>{data.vendorLabel}</p>
                  </div>
                  <div className='rounded-none border bg-muted/30 p-3'>
                    <p className='text-xs text-muted-foreground'>Order total</p>
                    <p className='font-medium'>{data.totalLabel}</p>
                  </div>
                </div>
              </div>

              <div className='rounded-none border bg-card p-4'>
                <p className='text-lg font-semibold'>Address & Payment</p>
                <div className='mt-3 space-y-3 text-sm'>
                  <div className='flex items-start gap-2'>
                    <MapPin className='mt-0.5 h-4 w-4 text-muted-foreground' />
                    <div>
                      <p className='font-medium'>Pickup</p>
                      <p className='text-muted-foreground'>{data.pickupAddress}</p>
                    </div>
                  </div>
                  <div className='flex items-start gap-2'>
                    <MapPin className='mt-0.5 h-4 w-4 text-muted-foreground' />
                    <div>
                      <p className='font-medium'>Delivery</p>
                      <p className='text-muted-foreground'>{data.deliveryAddress}</p>
                    </div>
                  </div>
                  <div className='flex items-start gap-2'>
                    <Package2 className='mt-0.5 h-4 w-4 text-muted-foreground' />
                    <div>
                      <p className='font-medium'>Package & Payment</p>
                      <p className='text-muted-foreground'>
                        {data.packageDetails} | Payment: {data.paymentMode} | Weight: {data.weightLabel}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className='rounded-none border bg-card p-4'>
              <div className='space-y-1 border-b pb-3'>
                <p className='text-xs text-muted-foreground'>AWB / Tracking</p>
                <p className='text-lg font-semibold'>{data.awb}</p>
                <Badge className='w-fit border-indigo-500/20 bg-indigo-500/10 text-indigo-700'>{data.status}</Badge>
              </div>
              <div className='mt-4 space-y-4'>
                <p className='text-sm font-semibold'>Tracking Timeline</p>
                {data.timeline.length ? (
                  data.timeline.map((point, index) => (
                    <div key={`${point.status}-${point.time}-${index}`} className='flex gap-3'>
                      <div className='flex w-6 flex-col items-center'>
                        <span className='mt-0.5 h-2.5 w-2.5 rounded-full bg-primary' />
                        {index !== data.timeline.length - 1 ? (
                          <span className='mt-1 h-full w-px bg-border' />
                        ) : null}
                      </div>
                      <div className='pb-3'>
                        <p className='font-medium'>{point.status}</p>
                        {point.description ? (
                          <p className='text-sm text-muted-foreground'>{point.description}</p>
                        ) : null}
                        <p className='text-xs text-muted-foreground'>
                          <Truck className='mr-1 inline h-3.5 w-3.5' />
                          {point.location || 'Location not available'}
                        </p>
                        <p className='text-xs text-muted-foreground'>
                          {point.time ? new Date(point.time).toLocaleString('en-IN') : 'Time not available'}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className='rounded-none border border-dashed p-3 text-sm text-muted-foreground'>
                    No tracking scans available yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className='max-w-md rounded-none'>
          <DialogHeader>
            <DialogTitle className='text-rose-700'>Warning: Confirm Cancellation</DialogTitle>
            <DialogDescription>
              {pendingCancelType === 'delivery'
                ? 'This will send a delivery cancellation request to Delhivery. Please confirm to proceed.'
                : 'This will send a shipment cancellation request to Delhivery. Please confirm to proceed.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className='gap-2 sm:justify-end'>
            <Button variant='outline' onClick={() => setCancelDialogOpen(false)} disabled={canceling}>
              Keep Shipment
            </Button>
            <Button
              className='bg-rose-600 text-white hover:bg-rose-700'
              disabled={canceling}
              onClick={async () => {
                setCancelDialogOpen(false)
                await runCancel(pendingCancelType)
              }}
            >
              {canceling ? <LoaderCircle className='h-4 w-4 animate-spin' /> : null}
              Yes, Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
