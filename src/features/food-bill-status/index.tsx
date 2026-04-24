import { useMemo, useState } from 'react'
import { CalendarDays, Search } from 'lucide-react'
import { format } from 'date-fns'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  FoodModuleShell,
  formatLabel,
  money,
  useFoodOperationsData,
} from '@/features/food-ops/shared'

export default function FoodBillStatusPage() {
  const { loading, orders } = useFoodOperationsData()
  const [search, setSearch] = useState('')
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'paid' | 'pending' | 'failed'>('all')

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const searchValue = search.trim().toLowerCase()
      const matchesSearch =
        !searchValue ||
        String(order.order_number || '').toLowerCase().includes(searchValue) ||
        String(order.shipping_address?.full_name || '').toLowerCase().includes(searchValue)

      const orderDateRaw = String(order.createdAt || order.updatedAt || '')
      const orderDate = orderDateRaw ? format(new Date(orderDateRaw), 'yyyy-MM-dd') : ''
      const matchesDate = !selectedDate || orderDate === selectedDate
      const matchesPayment =
        paymentFilter === 'all' ||
        String(order.payment_status || '').toLowerCase() === paymentFilter

      return matchesSearch && matchesDate && matchesPayment
    })
  }, [orders, paymentFilter, search, selectedDate])

  return (
    <FoodModuleShell
      title='Bill Status'
      description='Search and review food bill payment status from the current storefront order data.'
      moduleLabel='Bill Status'
    >
      <div className='flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between'>
        <div className='relative max-w-md flex-1'>
          <Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400' />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder='Search order number or customer name'
            className='h-11 w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none'
          />
        </div>
        <div className='flex flex-wrap items-center gap-3'>
          <div className='inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm'>
            <CalendarDays className='h-4 w-4 text-slate-400' />
            <input type='date' value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} />
          </div>
          <div className='flex rounded-2xl border border-slate-200 bg-white p-1'>
            {(['all', 'paid', 'pending', 'failed'] as const).map((status) => (
              <button
                key={status}
                type='button'
                onClick={() => setPaymentFilter(status)}
                className={`rounded-xl px-3 py-2 text-xs font-black uppercase tracking-[0.16em] transition ${
                  paymentFilter === status ? 'bg-sky-600 text-white' : 'text-slate-500'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </div>

      <Card className='rounded-[28px] border border-slate-200 bg-white py-0 shadow-sm'>
        <CardHeader className='px-6 py-5'>
          <CardTitle className='text-xl font-black text-slate-900'>Bill History</CardTitle>
        </CardHeader>
        <CardContent className='space-y-3 px-6 pb-6'>
          {loading ? (
            Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className='h-16 animate-pulse rounded-2xl bg-slate-100' />
            ))
          ) : filteredOrders.length ? (
            filteredOrders.map((order) => (
              <div key={order._id} className='grid gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4 md:grid-cols-[1.3fr_1fr_auto_auto] md:items-center'>
                <div>
                  <p className='text-sm font-black text-slate-900'>{order.order_number || `#${order._id.slice(-6)}`}</p>
                  <p className='mt-1 text-xs text-slate-500'>{order.shipping_address?.full_name || 'Customer'}</p>
                </div>
                <div className='text-sm font-medium text-slate-700'>
                  {money(order.total)}
                </div>
                <Badge variant='outline' className='w-fit rounded-full px-3 py-1 text-xs font-bold'>
                  {formatLabel(order.payment_method || 'cod')}
                </Badge>
                <Badge className={`w-fit rounded-full px-3 py-1 text-xs font-bold shadow-none ${
                  String(order.payment_status || '').toLowerCase() === 'paid'
                    ? 'bg-emerald-100 text-emerald-700'
                    : String(order.payment_status || '').toLowerCase() === 'failed'
                      ? 'bg-rose-100 text-rose-700'
                      : 'bg-amber-100 text-amber-700'
                }`}>
                  {formatLabel(order.payment_status || 'pending')}
                </Badge>
              </div>
            ))
          ) : (
            <div className='rounded-2xl border border-dashed border-slate-200 px-4 py-12 text-center text-sm text-slate-500'>
              No bills found for this filter.
            </div>
          )}
        </CardContent>
      </Card>
    </FoodModuleShell>
  )
}
