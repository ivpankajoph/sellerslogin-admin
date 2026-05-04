import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Eye,
  FileText,
  Phone,
  ReceiptText,
  Search,
  XCircle,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { foodOpsApi, type FoodOpsPosOrder } from '@/features/food-ops/api'
import {
  FoodModuleShell,
  type FoodOrder,
  formatLabel,
  money,
  useFoodOperationsData,
} from '@/features/food-ops/shared'

type PaymentFilter = 'all' | 'paid' | 'pending' | 'failed'

const normalizeStatus = (value?: string) =>
  String(value || 'pending').toLowerCase()

const formatOrderDate = (value?: string) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('en-CA')
}

const displayOrderDate = (value?: string) => {
  if (!value) return 'No date'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'No date'
  return date.toLocaleString()
}

const statusTone = (status?: string) => {
  const value = normalizeStatus(status)
  if (value === 'paid') return 'bg-emerald-100 text-emerald-700'
  if (value === 'failed' || value === 'cancelled')
    return 'bg-rose-100 text-rose-700'
  if (value === 'unpaid') return 'bg-orange-100 text-orange-700'
  return 'bg-amber-100 text-amber-700'
}

export default function FoodBillStatusPage() {
  const { loading, orders } = useFoodOperationsData()
  const [posOrders, setPosOrders] = useState<FoodOpsPosOrder[]>([])
  const [posLoading, setPosLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedDate, setSelectedDate] = useState('')
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('all')
  const [selectedOrder, setSelectedOrder] = useState<FoodOrder | null>(null)

  useEffect(() => {
    let active = true
    const loadPosOrders = async () => {
      setPosLoading(true)
      try {
        const rows = await foodOpsApi.getPosOrders()
        if (active) setPosOrders(rows)
      } catch (error: any) {
        if (active) {
          toast.error(
            error?.response?.data?.message || 'Failed to load POS bills'
          )
        }
      } finally {
        if (active) setPosLoading(false)
      }
    }

    void loadPosOrders()
    return () => {
      active = false
    }
  }, [])

  const billOrders = useMemo<FoodOrder[]>(
    () => [
      ...orders,
      ...posOrders.map((order) => ({
        _id: order._id,
        order_number: order.order_number,
        status: order.status,
        payment_method: order.payment_method,
        payment_status: order.payment_status,
        total: order.total,
        createdAt: order.createdAt,
        updatedAt: order.createdAt,
        shipping_address: {
          full_name:
            order.customer_details?.name ||
            order.shipping_address?.full_name ||
            'Walk-in customer',
          phone:
            order.customer_details?.phone || order.shipping_address?.phone || '',
          city: order.customer_details?.city || order.shipping_address?.city || '',
        },
        items: (order.items || []).map((item) => ({
          product_name: item.product_name,
          quantity: item.quantity,
          price: item.price,
          total_price: Number(item.price || 0) * Number(item.quantity || 0),
        })),
      })),
    ],
    [orders, posOrders]
  )

  const filteredOrders = useMemo(() => {
    const searchValue = search.trim().toLowerCase()
    return billOrders.filter((order) => {
      const matchesSearch =
        !searchValue ||
        [
          order.order_number,
          order.status,
          order.payment_method,
          order.payment_status,
          order.shipping_address?.full_name,
          order.shipping_address?.phone,
          order.shipping_address?.city,
          ...(order.items || []).map((item) => item.product_name),
        ].some((field) =>
          String(field || '')
            .toLowerCase()
            .includes(searchValue)
        )

      const orderDate = formatOrderDate(order.createdAt || order.updatedAt)
      const matchesDate = !selectedDate || orderDate === selectedDate
      const matchesPayment =
        paymentFilter === 'all' ||
        (paymentFilter === 'pending'
          ? ['pending', 'unpaid'].includes(normalizeStatus(order.payment_status))
          : paymentFilter === 'failed'
            ? ['failed', 'cancelled'].includes(
                normalizeStatus(order.payment_status)
              )
            : normalizeStatus(order.payment_status) === paymentFilter)

      return matchesSearch && matchesDate && matchesPayment
    })
  }, [billOrders, paymentFilter, search, selectedDate])

  const stats = useMemo(() => {
    const paid = billOrders.filter(
      (order) => normalizeStatus(order.payment_status) === 'paid'
    )
    const pending = billOrders.filter((order) =>
      ['pending', 'unpaid'].includes(normalizeStatus(order.payment_status))
    )
    const failed = billOrders.filter((order) =>
      ['failed', 'cancelled'].includes(normalizeStatus(order.payment_status))
    )
    return {
      total: billOrders.reduce((sum, order) => sum + Number(order.total || 0), 0),
      paidAmount: paid.reduce(
        (sum, order) => sum + Number(order.total || 0),
        0
      ),
      pendingAmount: pending.reduce(
        (sum, order) => sum + Number(order.total || 0),
        0
      ),
      paidCount: paid.length,
      pendingCount: pending.length,
      failedCount: failed.length,
    }
  }, [billOrders])

  return (
    <FoodModuleShell
      title='Bill Status'
      description='Search and review food bill payment status from the current storefront order data.'
      moduleLabel='Bill Status'
      showModuleCard={false}
    >
      <div className='grid gap-4 md:grid-cols-3'>
        {[
          {
            label: 'Total Billing',
            value: money(stats.total),
            helper: `${billOrders.length} bills recorded`,
            icon: ReceiptText,
            tone: 'bg-sky-50 text-sky-700',
          },
          {
            label: 'Paid Amount',
            value: money(stats.paidAmount),
            helper: `${stats.paidCount} paid bills`,
            icon: CheckCircle2,
            tone: 'bg-emerald-50 text-emerald-700',
          },
          {
            label: 'Pending Amount',
            value: money(stats.pendingAmount),
            helper: `${stats.pendingCount} pending bills`,
            icon: Clock3,
            tone: 'bg-amber-50 text-amber-700',
          },
        ].map((stat) => (
          <Card
            key={stat.label}
            className='rounded-2xl border border-slate-200 bg-white py-0 shadow-sm'
          >
            <CardContent className='flex items-center justify-between gap-4 p-5'>
              <div>
                <p className='text-xs font-black tracking-[0.16em] text-slate-400 uppercase'>
                  {stat.label}
                </p>
                <p className='mt-2 text-2xl font-black text-slate-950'>
                  {stat.value}
                </p>
                <p className='mt-1 text-sm font-semibold text-slate-500'>
                  {stat.helper}
                </p>
              </div>
              <span
                className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl ${stat.tone}`}
              >
                <stat.icon className='h-5 w-5' />
              </span>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className='overflow-hidden rounded-[28px] border border-slate-200 bg-white py-0 shadow-[0_18px_45px_rgba(15,23,42,0.08)]'>
        <CardHeader className='border-b border-slate-100 px-5 py-5 sm:px-6'>
          <div className='flex flex-col gap-4 2xl:flex-row 2xl:items-center 2xl:justify-between'>
            <div>
              <CardTitle className='text-2xl font-black text-slate-950'>
                Bill Status & History
              </CardTitle>
              <p className='mt-1 text-sm font-medium text-slate-500'>
                Monitor paid, unpaid, pending, and failed restaurant bills.
              </p>
            </div>
            <div className='grid gap-3 lg:grid-cols-[minmax(240px,1fr)_190px_auto] 2xl:w-[880px]'>
              <div className='relative'>
                <Search className='absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-slate-400' />
                <Input
                  className='h-12 rounded-2xl bg-slate-50 pl-11 font-semibold'
                  placeholder='Search bill, waiter, customer...'
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
              <div className='relative'>
                <CalendarDays className='absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-slate-400' />
                <Input
                  type='date'
                  value={selectedDate}
                  onChange={(event) => setSelectedDate(event.target.value)}
                  className='h-12 rounded-2xl bg-slate-50 pr-20 pl-11 font-black'
                />
                {selectedDate ? (
                  <button
                    type='button'
                    onClick={() => setSelectedDate('')}
                    className='absolute top-1/2 right-3 -translate-y-1/2 text-xs font-black text-sky-700'
                  >
                    All dates
                  </button>
                ) : null}
              </div>
              <div className='grid grid-cols-4 rounded-2xl border border-slate-200 bg-slate-50 p-1 shadow-sm'>
                {(['all', 'paid', 'pending', 'failed'] as const).map(
                  (status) => (
                    <button
                      key={status}
                      type='button'
                      onClick={() => setPaymentFilter(status)}
                      className={`h-10 rounded-xl px-3 text-xs font-black tracking-[0.14em] uppercase transition ${
                        paymentFilter === status
                          ? 'bg-sky-600 text-white shadow-sm'
                          : 'text-slate-500 hover:bg-white'
                      }`}
                    >
                      {status}
                    </button>
                  )
                )}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className='bg-slate-50/70 p-4 sm:p-6'>
          {loading || posLoading ? (
            <div className='space-y-3'>
              {Array.from({ length: 5 }).map((_, index) => (
                <div
                  key={index}
                  className='h-24 animate-pulse rounded-2xl bg-white shadow-sm'
                />
              ))}
            </div>
          ) : filteredOrders.length ? (
            <div className='overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm'>
              <div className='hidden grid-cols-[1.2fr_1fr_0.8fr_0.8fr_0.8fr_auto] border-b border-slate-100 bg-slate-50 px-5 py-4 text-xs font-black tracking-[0.14em] text-slate-400 uppercase xl:grid'>
                <span>Bill Info</span>
                <span>Customer</span>
                <span>Items</span>
                <span>Amount</span>
                <span>Status</span>
                <span>Action</span>
              </div>

              <div className='divide-y divide-slate-100'>
                {filteredOrders.map((order) => {
                  const paymentStatus = normalizeStatus(order.payment_status)
                  const itemSummary = (order.items || [])
                    .slice(0, 2)
                    .map(
                      (item) => `${item.product_name} x${item.quantity || 1}`
                    )
                    .join(', ')
                  return (
                    <article
                      key={order._id}
                      className='grid gap-4 p-5 transition hover:bg-slate-50 xl:grid-cols-[1.2fr_1fr_0.8fr_0.8fr_0.8fr_auto] xl:items-center'
                    >
                      <div className='min-w-0'>
                        <p className='text-sm font-black break-all text-slate-950'>
                          {order.order_number || `#${order._id.slice(-6)}`}
                        </p>
                        <p className='mt-1 flex items-center gap-2 text-xs font-semibold text-slate-500'>
                          <CalendarDays className='h-3.5 w-3.5' />
                          {displayOrderDate(order.createdAt || order.updatedAt)}
                        </p>
                      </div>

                      <div className='min-w-0'>
                        <p className='truncate text-sm font-black text-slate-900'>
                          {order.shipping_address?.full_name ||
                            'Walk-in customer'}
                        </p>
                        <p className='mt-1 flex items-center gap-2 text-xs font-semibold text-slate-500'>
                          <Phone className='h-3.5 w-3.5' />
                          {order.shipping_address?.phone || 'No phone'}
                        </p>
                      </div>

                      <div className='min-w-0'>
                        <p className='truncate text-sm font-bold text-slate-700'>
                          {itemSummary || 'No item details'}
                        </p>
                        <p className='mt-1 text-xs font-semibold text-slate-500'>
                          {(order.items || []).length} item(s)
                        </p>
                      </div>

                      <div>
                        <p className='text-lg font-black text-slate-950'>
                          {money(order.total)}
                        </p>
                        <Badge
                          variant='outline'
                          className='mt-1 rounded-full px-3 py-1 text-[10px] font-black uppercase'
                        >
                          {formatLabel(order.payment_method || 'cod')}
                        </Badge>
                      </div>

                      <div className='flex flex-wrap gap-2'>
                        <Badge
                          className={`rounded-full px-3 py-1 text-[10px] font-black uppercase shadow-none ${statusTone(paymentStatus)}`}
                        >
                          {formatLabel(paymentStatus)}
                        </Badge>
                        {paymentStatus === 'failed' ? (
                          <XCircle className='h-5 w-5 text-rose-500' />
                        ) : null}
                      </div>

                      <button
                        type='button'
                        onClick={() => setSelectedOrder(order)}
                        className='inline-flex h-10 w-fit items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 shadow-sm transition hover:border-sky-200 hover:text-sky-700'
                      >
                        <Eye className='h-4 w-4' />
                        View
                      </button>
                    </article>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className='flex min-h-80 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-12 text-center shadow-sm'>
              <span className='inline-flex h-16 w-16 items-center justify-center rounded-full bg-slate-50 text-slate-400'>
                <FileText className='h-8 w-8' />
              </span>
              <p className='mt-4 text-lg font-black text-slate-950'>
                No matching bills found
              </p>
              <p className='mt-1 max-w-md text-sm text-slate-500'>
                Try changing the date, payment filter, or search text to find
                the bill.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={!!selectedOrder}
        onOpenChange={(open) => !open && setSelectedOrder(null)}
      >
        <DialogContent className='max-h-[92vh] max-w-3xl overflow-hidden rounded-[24px] border-slate-200 bg-white p-0'>
          <DialogHeader className='border-b border-slate-100 px-5 py-4'>
            <DialogTitle>Bill Details</DialogTitle>
            <DialogDescription>
              Review customer, payment, status, and item details for this bill.
            </DialogDescription>
          </DialogHeader>
          {selectedOrder ? (
            <div className='max-h-[calc(92vh-104px)] overflow-y-auto px-5 py-4'>
              <div className='rounded-2xl border border-slate-200 bg-slate-50 p-4'>
                <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
                  <div>
                    <p className='text-lg font-black text-slate-950'>
                      {selectedOrder.order_number ||
                        `#${selectedOrder._id.slice(-6)}`}
                    </p>
                    <p className='mt-1 text-sm font-semibold text-slate-500'>
                      {displayOrderDate(
                        selectedOrder.createdAt || selectedOrder.updatedAt
                      )}
                    </p>
                  </div>
                  <div className='flex flex-wrap gap-2 sm:justify-end'>
                    <Badge className='rounded-full bg-slate-900 px-3 py-1 text-xs font-black text-white shadow-none'>
                      {formatLabel(selectedOrder.status || 'pending')}
                    </Badge>
                    <Badge
                      className={`rounded-full px-3 py-1 text-xs font-black shadow-none ${statusTone(
                        selectedOrder.payment_status
                      )}`}
                    >
                      {formatLabel(selectedOrder.payment_status || 'pending')}
                    </Badge>
                    <Badge className='rounded-full bg-sky-100 px-3 py-1 text-xs font-black text-sky-700 shadow-none'>
                      {formatLabel(selectedOrder.payment_method || 'cod')}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className='mt-4 grid gap-4 md:grid-cols-2'>
                <div className='rounded-2xl border border-slate-200 bg-white p-4'>
                  <p className='text-xs font-black tracking-[0.16em] text-slate-400 uppercase'>
                    Customer
                  </p>
                  <p className='mt-3 text-base font-black text-slate-950'>
                    {selectedOrder.shipping_address?.full_name ||
                      'Walk-in customer'}
                  </p>
                  <p className='mt-1 text-sm font-semibold text-slate-500'>
                    Phone: {selectedOrder.shipping_address?.phone || '-'}
                  </p>
                </div>

                <div className='rounded-2xl border border-slate-200 bg-white p-4'>
                  <p className='text-xs font-black tracking-[0.16em] text-slate-400 uppercase'>
                    Address
                  </p>
                  <p className='mt-3 text-sm font-semibold leading-6 text-slate-700'>
                    {[
                      selectedOrder.shipping_address?.line1,
                      selectedOrder.shipping_address?.landmark,
                      selectedOrder.shipping_address?.city,
                      selectedOrder.shipping_address?.state,
                      selectedOrder.shipping_address?.pincode,
                    ]
                      .filter(Boolean)
                      .join(', ') || '-'}
                  </p>
                </div>
              </div>

              <div className='mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white'>
                <div className='grid grid-cols-[minmax(0,1fr)_64px_96px_104px] gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-black tracking-[0.14em] text-slate-500 uppercase'>
                  <span>Item</span>
                  <span className='text-center'>Qty</span>
                  <span className='text-right'>Rate</span>
                  <span className='text-right'>Amount</span>
                </div>
                {(selectedOrder.items || []).length ? (
                  selectedOrder.items?.map((item, index) => {
                    const quantity = Number(item.quantity || 0)
                    const amount = Number(
                      item.total_price ||
                        (item.price ? Number(item.price) * quantity : 0)
                    )
                    const rate = item.price
                      ? Number(item.price)
                      : quantity
                        ? amount / quantity
                        : 0
                    return (
                      <div
                        key={`${item.product_name}-${index}`}
                        className='grid grid-cols-[minmax(0,1fr)_64px_96px_104px] gap-2 border-b border-slate-100 px-4 py-3 text-sm last:border-b-0'
                      >
                        <span className='font-bold text-slate-800'>
                          {item.product_name || 'Item'}
                        </span>
                        <span className='text-center font-semibold text-slate-600'>
                          {quantity || '-'}
                        </span>
                        <span className='text-right font-semibold text-slate-600'>
                          {rate ? money(rate) : '-'}
                        </span>
                        <span className='text-right font-black text-slate-950'>
                          {amount ? money(amount) : '-'}
                        </span>
                      </div>
                    )
                  })
                ) : (
                  <div className='px-4 py-8 text-center text-sm font-semibold text-slate-500'>
                    No item details available.
                  </div>
                )}
              </div>

              <div className='mt-4 ml-auto max-w-sm rounded-2xl border border-slate-200 bg-slate-50 p-4'>
                <div className='flex items-center justify-between gap-3 text-lg font-black text-slate-950'>
                  <span>Total</span>
                  <span>{money(selectedOrder.total)}</span>
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </FoodModuleShell>
  )
}
