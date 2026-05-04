import { useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import {
  CalendarClock,
  CheckCircle2,
  Clock3,
  Eye,
  Phone,
  ReceiptText,
  Search,
  WalletCards,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  FoodModuleShell,
  type FoodOrder,
  formatLabel,
  money,
  useFoodOperationsData,
} from '@/features/food-ops/shared'

type OrderFilter = 'all' | 'new' | 'pending' | 'cancelled' | 'old'

const isNewOrder = (createdAt?: string) => {
  if (!createdAt) return false
  const createdDate = new Date(createdAt)
  if (Number.isNaN(createdDate.getTime())) return false
  const oneDayMs = 24 * 60 * 60 * 1000
  return Date.now() - createdDate.getTime() <= oneDayMs
}

export default function FoodPendingOrdersPage() {
  const { loading, orders } = useFoodOperationsData()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<OrderFilter>('all')
  const [selectedOrder, setSelectedOrder] = useState<FoodOrder | null>(null)

  const pendingOrders = useMemo(
    () =>
      orders.filter(
        (order) =>
          String(order.payment_status || '').toLowerCase() === 'pending'
      ),
    [orders]
  )

  const newOrders = useMemo(
    () => orders.filter((order) => isNewOrder(order.createdAt)),
    [orders]
  )

  const oldOrders = useMemo(
    () => orders.filter((order) => !isNewOrder(order.createdAt)),
    [orders]
  )

  const cancelledOrders = useMemo(
    () =>
      orders.filter((order) =>
        ['cancelled', 'canceled', 'failed', 'rejected'].includes(
          String(order.status || '').toLowerCase()
        )
      ),
    [orders]
  )

  const selectedOrders = useMemo(() => {
    if (filter === 'new') return newOrders
    if (filter === 'pending') return pendingOrders
    if (filter === 'cancelled') return cancelledOrders
    if (filter === 'old') return oldOrders
    return orders
  }, [cancelledOrders, filter, newOrders, oldOrders, orders, pendingOrders])

  const filteredOrders = useMemo(() => {
    const value = search.trim().toLowerCase()
    if (!value) return selectedOrders
    return selectedOrders.filter((order) =>
      [
        order.order_number,
        order.status,
        order.payment_status,
        order.payment_method,
        order.shipping_address?.full_name,
        order.shipping_address?.phone,
        order.shipping_address?.city,
        ...(order.items || []).map((item) => item.product_name),
      ].some((field) =>
        String(field || '')
          .toLowerCase()
          .includes(value)
      )
    )
  }, [search, selectedOrders])

  const pendingTotal = useMemo(
    () =>
      pendingOrders.reduce((sum, order) => sum + Number(order.total || 0), 0),
    [pendingOrders]
  )

  const totalRevenue = useMemo(
    () => orders.reduce((sum, order) => sum + Number(order.total || 0), 0),
    [orders]
  )

  return (
    <FoodModuleShell
      title='All Orders'
      description='Review every food order with customer, payment, item, and fulfilment details.'
      moduleLabel='All Orders'
      showModuleCard={false}
    >
      <div className='grid gap-4 md:grid-cols-4'>
        {[
          {
            label: 'All Orders',
            value: String(orders.length),
            helper: 'Complete order list',
            icon: ReceiptText,
          },
          {
            label: 'New Orders',
            value: String(newOrders.length),
            helper: 'Created in last 24h',
            icon: Clock3,
          },
          {
            label: 'Total Sales',
            value: money(totalRevenue),
            helper: 'All visible orders',
            icon: WalletCards,
          },
          {
            label: 'Pending Amount',
            value: money(pendingTotal),
            helper: 'Total unpaid value',
            icon: ReceiptText,
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
              <span className='inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-700'>
                <stat.icon className='h-5 w-5' />
              </span>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className='overflow-hidden rounded-[28px] border border-slate-200 bg-white py-0 shadow-[0_18px_45px_rgba(15,23,42,0.08)]'>
        <CardHeader className='border-b border-slate-100 px-5 py-5 sm:px-6'>
          <div className='flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between'>
            <div>
              <CardTitle className='text-2xl font-black text-slate-950'>
                Food Orders
              </CardTitle>
              <p className='mt-1 text-sm font-medium text-slate-500'>
                Search and review all order details from your food storefront.
              </p>
            </div>
            <div className='flex flex-col gap-3 xl:items-end'>
              <div className='flex flex-wrap gap-2'>
                {[
                  { value: 'all' as const, label: 'All Orders', count: orders.length },
                  { value: 'new' as const, label: 'New Orders', count: newOrders.length },
                  { value: 'pending' as const, label: 'Pending', count: pendingOrders.length },
                  { value: 'cancelled' as const, label: 'Cancelled', count: cancelledOrders.length },
                  { value: 'old' as const, label: 'Old Orders', count: oldOrders.length },
                ].map((option) => (
                  <button
                    key={option.value}
                    type='button'
                    onClick={() => setFilter(option.value)}
                    className={`h-10 rounded-xl border px-4 text-xs font-black transition ${
                      filter === option.value
                        ? 'border-sky-600 bg-sky-600 text-white shadow-sm'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-sky-200 hover:text-sky-700'
                    }`}
                  >
                    {option.label} ({option.count})
                  </button>
                ))}
              </div>
              <div className='flex flex-col gap-3 sm:flex-row sm:items-center'>
              <Badge className='w-fit rounded-full bg-amber-100 px-4 py-2 text-xs font-black text-amber-700 shadow-none'>
                {filteredOrders.length} showing
              </Badge>
              <div className='relative w-full sm:w-80'>
                <Search className='absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-slate-400' />
                <Input
                  className='h-12 rounded-2xl bg-slate-50 pl-11 font-semibold'
                  placeholder='Search order, customer, phone...'
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className='bg-slate-50/70 p-4 sm:p-6'>
          {loading ? (
            <div className='space-y-3'>
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className='h-28 animate-pulse rounded-2xl bg-white shadow-sm'
                />
              ))}
            </div>
          ) : filteredOrders.length ? (
            <div className='overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm'>
              <div className='hidden grid-cols-[1.3fr_1fr_1.15fr_150px_190px] gap-8 border-b border-slate-100 bg-slate-50 px-5 py-4 text-xs font-black tracking-[0.14em] text-slate-400 uppercase xl:grid xl:items-center'>
                <span>Order</span>
                <span>Customer</span>
                <span>Items</span>
                <span>Amount</span>
                <span className='text-right'>Action</span>
              </div>
              <div className='divide-y divide-slate-100'>
              {filteredOrders.map((order) => {
                const firstItems = (order.items || []).slice(0, 3)
                return (
                  <article
                    key={order._id}
                    className='grid gap-4 bg-white px-5 py-5 transition hover:bg-slate-50 xl:grid-cols-[1.3fr_1fr_1.15fr_150px_190px] xl:items-center xl:gap-8'
                  >
                    <div className='min-w-0'>
                      <p className='text-base font-black break-all text-slate-950'>
                        {order.order_number || `#${order._id.slice(-6)}`}
                      </p>
                      <div className='mt-2 flex flex-wrap items-center gap-2'>
                        <Badge className='rounded-full bg-amber-100 px-3 py-1 text-[10px] font-black text-amber-700 uppercase shadow-none'>
                          {formatLabel(order.payment_status || 'pending')}
                        </Badge>
                        {isNewOrder(order.createdAt) ? (
                          <Badge className='rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-black text-emerald-700 uppercase shadow-none'>
                            New
                          </Badge>
                        ) : (
                          <Badge className='rounded-full bg-slate-200 px-3 py-1 text-[10px] font-black text-slate-600 uppercase shadow-none'>
                            Old
                          </Badge>
                        )}
                      </div>
                      <p className='mt-2 text-xs font-black tracking-[0.16em] text-slate-400 uppercase'>
                        {formatLabel(order.status || 'accepted')}
                      </p>
                    </div>

                    <div className='min-w-0 rounded-xl bg-slate-50 px-3 py-3 xl:bg-transparent xl:p-0'>
                      <div className='flex items-center gap-3'>
                        <span className='inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-slate-500 shadow-sm xl:hidden'>
                          <Clock3 className='h-4 w-4' />
                        </span>
                        <div className='min-w-0'>
                          <p className='truncate text-sm font-black text-slate-900'>
                            {order.shipping_address?.full_name ||
                              'Walk-in customer'}
                          </p>
                          <p className='mt-1 flex items-center gap-1 truncate text-xs font-semibold text-slate-500'>
                            <Phone className='h-3.5 w-3.5 shrink-0' />
                            {order.shipping_address?.phone || 'No phone'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className='min-w-0 rounded-xl bg-slate-50 px-3 py-3 xl:bg-transparent xl:p-0'>
                      <p className='truncate text-sm font-black text-slate-900'>
                        {firstItems.length
                          ? firstItems
                              .map(
                                (item) =>
                                  `${item.product_name} x${item.quantity || 1}`
                              )
                              .join(', ')
                          : 'No item details'}
                      </p>
                      <div className='mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-slate-500'>
                        <span className='inline-flex items-center gap-1'>
                          <ReceiptText className='h-3.5 w-3.5' />
                          {(order.items || []).length} item(s)
                        </span>
                        <span className='inline-flex items-center gap-1'>
                          <CalendarClock className='h-3.5 w-3.5' />
                          {order.createdAt
                            ? new Date(order.createdAt).toLocaleDateString()
                            : 'Recent'}
                        </span>
                      </div>
                    </div>

                    <div className='flex items-center justify-between gap-3 xl:block xl:pr-4 xl:text-right'>
                      <div>
                        <p className='whitespace-nowrap text-xl font-black text-slate-950'>
                          {money(order.total)}
                        </p>
                        <p className='mt-1 text-xs font-bold text-slate-500'>
                          {formatLabel(order.payment_method || 'cod')}
                        </p>
                      </div>
                    </div>

                    <div className='flex flex-col gap-2 sm:flex-row xl:justify-end xl:gap-2'>
                      <Button
                        type='button'
                        variant='outline'
                        size='sm'
                        className='h-9 rounded-lg px-3 text-xs font-black'
                        onClick={() => setSelectedOrder(order)}
                      >
                        <Eye className='mr-1.5 h-3.5 w-3.5' />
                        View
                      </Button>
                      <Button
                        asChild
                        size='sm'
                        className='h-9 rounded-lg bg-sky-600 px-3 text-xs font-black text-white hover:bg-sky-700'
                      >
                        <Link to='/food' hash='orders'>
                          <CheckCircle2 className='mr-1.5 h-3.5 w-3.5' />
                          Payment
                        </Link>
                      </Button>
                    </div>
                  </article>
                )
              })}
              </div>
            </div>
          ) : (
            <div className='flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-12 text-center shadow-sm'>
              <span className='inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600'>
                <CheckCircle2 className='h-8 w-8' />
              </span>
              <p className='mt-4 text-lg font-black text-slate-950'>
                No orders found
              </p>
              <p className='mt-1 max-w-md text-sm text-slate-500'>
                No food orders match the selected filter or current search.
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
            <DialogTitle>Order Details</DialogTitle>
            <DialogDescription>
              Complete customer, payment, address, and item details.
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
                      {selectedOrder.createdAt
                        ? new Date(selectedOrder.createdAt).toLocaleString()
                        : 'Date unavailable'}
                    </p>
                  </div>
                  <div className='flex flex-wrap gap-2 sm:justify-end'>
                    <Badge className='rounded-full bg-slate-900 px-3 py-1 text-xs font-black text-white shadow-none'>
                      {formatLabel(selectedOrder.status || 'pending')}
                    </Badge>
                    <Badge className='rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-700 shadow-none'>
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
                    Delivery Address
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
