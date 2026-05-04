import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ArrowUpRight, Eye, LoaderCircle, PackageOpen, RefreshCcw, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { loadManualCourierOrders } from '@/features/courier/api'
import type { CourierOrderSummary } from '@/features/courier/data'
import { formatINR } from '@/lib/currency'

export const Route = createFileRoute('/_authenticated/courier/manual-list')({
  component: ManualCourierOrderListPage,
})

const readText = (value: unknown) => String(value ?? '').trim()
const hasDisplayValue = (value: unknown) => {
  const text = readText(value)
  if (!text) return false
  return !['not available', 'not placed', 'none', 'null', 'undefined'].includes(text.toLowerCase())
}

const formatDateTime = (value: unknown) => {
  const text = readText(value)
  if (!text) return ''
  const date = new Date(text)
  if (Number.isNaN(date.getTime())) return text
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const DetailKV = ({ label, value }: { label: string; value: unknown }) => {
  if (!hasDisplayValue(value)) return null
  return (
    <div className='min-w-0 rounded-none border border-border bg-muted/20 p-3'>
      <p className='text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground'>{label}</p>
      <p className='mt-1 break-words text-sm font-medium text-foreground'>{readText(value)}</p>
    </div>
  )
}

const DetailSection = ({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) => (
  <section className='space-y-3'>
    <h3 className='border-b border-border pb-2 text-sm font-semibold text-foreground'>{title}</h3>
    {children}
  </section>
)

const getErrorMessage = (error: unknown, fallback: string) => {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof (error as { response?: unknown }).response === 'object'
  ) {
    const data = (error as { response?: { data?: { message?: unknown; error?: unknown } } }).response?.data
    return readText(data?.message || data?.error) || fallback
  }
  if (error instanceof Error) return error.message || fallback
  return fallback
}

function ManualCourierOrderListPage() {
  const navigate = useNavigate()
  const [orders, setOrders] = useState<CourierOrderSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState<CourierOrderSummary | null>(null)

  const loadOrders = async () => {
    try {
      setLoading(true)
      setOrders(await loadManualCourierOrders())
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to load manual orders'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadOrders()
  }, [])

  const checkPrice = (order: CourierOrderSummary) => {
    const overrides = (order.manualCourier?.shipment_overrides || {}) as Record<string, unknown>
    const origin = readText(overrides.pickup_pincode || overrides.rts_pincode || overrides.rto_pincode)
    const destination = readText(order.pincode)
    const params = new URLSearchParams()
    params.set('orderId', order.id)
    if (origin) params.set('origin', origin)
    if (destination) params.set('destination', destination)
    void navigate({ to: `/courier?${params.toString()}` })
  }

  const hasShipmentData = (order: CourierOrderSummary) =>
    [
      order.deliveryProvider,
      order.externalDeliveryId,
      order.trackingUrl,
      order.delhivery?.waybill,
      order.delhivery?.status,
      order.delhivery?.status_description,
      order.shadowfax?.tracking_number,
      order.shadowfax?.status,
      order.shadowfax?.status_description,
      order.borzo?.order_id,
    ].some(hasDisplayValue)

  return (
    <>
      <div className='space-y-5'>
        <div className='flex flex-wrap items-start justify-between gap-4 border border-border bg-card p-5'>
          <div>
            <h1 className='text-3xl font-semibold tracking-tight text-foreground'>Manual Order List</h1>
            <p className='mt-2 max-w-3xl text-sm leading-6 text-muted-foreground'>
              View manual orders and create shipments from saved order data.
            </p>
          </div>
          <div className='flex flex-wrap gap-2'>
            <Button variant='outline' onClick={() => void loadOrders()} disabled={loading}>
              {loading ? <LoaderCircle className='h-4 w-4 animate-spin' /> : <RefreshCcw className='h-4 w-4' />}
              Refresh
            </Button>
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

        <Card className='rounded-none border-border bg-card shadow-sm'>
          <CardContent className='pt-6'>
            {loading ? (
              <div className='rounded-none border border-border bg-muted/30 p-6 text-sm text-muted-foreground'>Loading manual orders...</div>
            ) : !orders.length ? (
              <div className='rounded-none border border-dashed border-border bg-muted/30 p-6 text-sm text-muted-foreground'>No manual orders created yet.</div>
            ) : (
              <div className='overflow-x-auto'>
                <table className='w-full min-w-[1040px] text-left text-sm'>
                  <thead className='border-b border-border bg-muted/40 text-muted-foreground'>
                    <tr>
                      <th className='px-4 py-3'>Order</th>
                      <th className='px-4 py-3'>Customer</th>
                      <th className='px-4 py-3'>Destination</th>
                      <th className='px-4 py-3'>Order value</th>
                      <th className='px-4 py-3'>Shipment</th>
                      <th className='px-4 py-3 text-right'>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => (
                      <tr key={order.id} className='border-b border-border align-top'>
                        <td className='px-4 py-4 font-semibold text-foreground'>{order.orderNumber}</td>
                        <td className='px-4 py-4'>
                          <p className='font-medium text-foreground'>{order.customerName}</p>
                          <p className='text-muted-foreground'>{order.customerPhone}</p>
                        </td>
                        <td className='px-4 py-4 text-muted-foreground'>{order.city}, {order.state}, {order.pincode}</td>
                        <td className='px-4 py-4 text-muted-foreground'>{formatINR(order.total)}</td>
                        <td className='px-4 py-4 text-muted-foreground'>
                          {order.delhivery?.waybill || order.shadowfax?.tracking_number || order.deliveryProvider || 'Not placed'}
                        </td>
                        <td className='px-4 py-4'>
                          <div className='flex justify-end gap-2'>
                            <Button
                              size='sm'
                              variant='outline'
                              className='rounded-none'
                              onClick={() => setSelectedOrder(order)}
                            >
                              <Eye className='h-4 w-4' />
                              View data
                            </Button>
                            <Button
                              size='sm'
                              className='rounded-none bg-primary text-primary-foreground hover:bg-primary/90'
                              onClick={() => checkPrice(order)}
                            >
                              <Search className='h-4 w-4' />
                              Check price
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={Boolean(selectedOrder)} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <DialogContent className='max-h-[90vh] overflow-y-auto rounded-none sm:max-w-5xl'>
          <DialogHeader>
            <DialogTitle>Manual order data</DialogTitle>
            <DialogDescription>
              {selectedOrder?.orderNumber || 'Order'} full saved courier details.
            </DialogDescription>
          </DialogHeader>

          {selectedOrder ? (
            <div className='space-y-6'>
              <DetailSection title='Order'>
                <div className='grid gap-3 md:grid-cols-2 xl:grid-cols-4'>
                  <DetailKV label='Order number' value={selectedOrder.orderNumber} />
                  <DetailKV label='Order ID' value={selectedOrder.id} />
                  <DetailKV label='Source' value={selectedOrder.source} />
                  <DetailKV label='Created' value={formatDateTime(selectedOrder.createdAt)} />
                  <DetailKV label='Status' value={selectedOrder.status} />
                  <DetailKV label='Order value' value={formatINR(selectedOrder.total)} />
                  <DetailKV label='Items count' value={selectedOrder.itemsCount} />
                  <DetailKV label='Website' value={selectedOrder.websiteLabel} />
                </div>
              </DetailSection>

              <DetailSection title='Customer and destination'>
                <div className='grid gap-3 md:grid-cols-2 xl:grid-cols-4'>
                  <DetailKV label='Customer name' value={selectedOrder.customerName} />
                  <DetailKV label='Phone' value={selectedOrder.customerPhone} />
                  <DetailKV label='Email' value={selectedOrder.customerEmail} />
                  <DetailKV label='Pincode' value={selectedOrder.pincode} />
                  <DetailKV label='City' value={selectedOrder.city} />
                  <DetailKV label='State' value={selectedOrder.state} />
                  <div className='md:col-span-2'>
                    <DetailKV label='Address' value={selectedOrder.address} />
                  </div>
                </div>
              </DetailSection>

              <DetailSection title='Items'>
                <div className='overflow-x-auto border border-border'>
                  <table className='w-full min-w-[720px] text-left text-sm'>
                    <thead className='bg-muted/40 text-muted-foreground'>
                      <tr>
                        <th className='px-3 py-2'>Product</th>
                        <th className='px-3 py-2'>Variant</th>
                        <th className='px-3 py-2'>Qty</th>
                        <th className='px-3 py-2'>Unit price</th>
                        <th className='px-3 py-2'>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedOrder.items.map((item, index) => (
                        <tr key={`${item.productId}-${index}`} className='border-t border-border'>
                          <td className='px-3 py-2 font-medium text-foreground'>{item.productName}</td>
                          <td className='px-3 py-2 text-muted-foreground'>{item.variantSummary}</td>
                          <td className='px-3 py-2 text-muted-foreground'>{item.quantity}</td>
                          <td className='px-3 py-2 text-muted-foreground'>{formatINR(item.unitPrice)}</td>
                          <td className='px-3 py-2 text-muted-foreground'>{formatINR(item.totalPrice)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </DetailSection>

              {hasShipmentData(selectedOrder) ? (
                <DetailSection title='Shipment'>
                  <div className='grid gap-3 md:grid-cols-2 xl:grid-cols-4'>
                    <DetailKV label='Provider' value={selectedOrder.deliveryProvider} />
                    <DetailKV label='External delivery ID' value={selectedOrder.externalDeliveryId} />
                    <DetailKV label='Tracking URL' value={selectedOrder.trackingUrl} />
                    <DetailKV label='Delhivery waybill' value={selectedOrder.delhivery?.waybill} />
                    <DetailKV label='Delhivery status' value={selectedOrder.delhivery?.status || selectedOrder.delhivery?.status_description} />
                    <DetailKV label='Shadowfax tracking' value={selectedOrder.shadowfax?.tracking_number} />
                    <DetailKV label='Shadowfax status' value={selectedOrder.shadowfax?.status || selectedOrder.shadowfax?.status_description} />
                    <DetailKV label='Borzo order ID' value={selectedOrder.borzo?.order_id} />
                  </div>
                </DetailSection>
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}
