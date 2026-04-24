import { Link } from '@tanstack/react-router'
import { Clock3, Eye, Pencil } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  FoodModuleShell,
  formatLabel,
  money,
  useFoodOperationsData,
} from '@/features/food-ops/shared'

export default function FoodPendingOrdersPage() {
  const { loading, orders } = useFoodOperationsData()
  const pendingOrders = orders.filter(
    (order) => String(order.payment_status || '').toLowerCase() === 'pending'
  )

  return (
    <FoodModuleShell
      title='Pending Orders'
      description='Review food orders that are still waiting for payment confirmation.'
      moduleLabel='Pending Orders'
    >
      <Card className='rounded-[28px] border border-slate-200 bg-white py-0 shadow-sm'>
        <CardHeader className='flex flex-row items-center justify-between gap-4 px-6 py-5'>
          <div>
            <CardTitle className='text-xl font-black text-slate-900'>
              Orders Awaiting Payment
            </CardTitle>
            <p className='mt-1 text-sm text-slate-500'>
              Based on current Food Hub order data.
            </p>
          </div>
          <Badge variant='outline' className='rounded-full px-4 py-2 text-xs font-bold'>
            {pendingOrders.length} pending
          </Badge>
        </CardHeader>
        <CardContent className='grid gap-4 px-6 pb-6 md:grid-cols-2 xl:grid-cols-3'>
          {loading ? (
            Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className='h-48 animate-pulse rounded-2xl bg-slate-100' />
            ))
          ) : pendingOrders.length ? (
            pendingOrders.map((order) => (
              <div key={order._id} className='rounded-[24px] border border-slate-200 bg-slate-50 p-5'>
                <div className='flex items-start justify-between gap-3'>
                  <div>
                    <p className='text-sm font-black text-slate-900'>{order.order_number || `#${order._id.slice(-6)}`}</p>
                    <p className='mt-1 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400'>
                      {formatLabel(order.status)}
                    </p>
                  </div>
                  <Badge className='rounded-full bg-amber-100 px-3 py-1 text-[10px] font-black uppercase text-amber-700 shadow-none'>
                    Pending
                  </Badge>
                </div>
                <div className='mt-5 space-y-3'>
                  <div className='flex items-center gap-2 text-sm text-slate-600'>
                    <Clock3 className='h-4 w-4 text-slate-400' />
                    {order.shipping_address?.full_name || 'Customer'}
                  </div>
                  <p className='text-2xl font-black tracking-tight text-slate-900'>{money(order.total)}</p>
                  <p className='text-sm text-slate-500'>
                    Payment method: {formatLabel(order.payment_method || 'cod')}
                  </p>
                </div>
                <div className='mt-5 flex gap-2'>
                  <Link
                    to='/food'
                    hash='orders'
                    className='inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700'
                  >
                    <Eye className='h-3.5 w-3.5' />
                    View
                  </Link>
                  <Link
                    to='/food'
                    hash='orders'
                    className='inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700'
                  >
                    <Pencil className='h-3.5 w-3.5' />
                    Update
                  </Link>
                </div>
              </div>
            ))
          ) : (
            <div className='col-span-full rounded-2xl border border-dashed border-slate-200 px-4 py-12 text-center text-sm text-slate-500'>
              No pending food orders found.
            </div>
          )}
        </CardContent>
      </Card>
    </FoodModuleShell>
  )
}
