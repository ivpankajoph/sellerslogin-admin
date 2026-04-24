import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  FoodModuleShell,
  formatLabel,
  money,
  useFoodOperationsData,
} from '@/features/food-ops/shared'

export default function FoodOnlineOrdersPage() {
  const { loading, orders } = useFoodOperationsData()

  return (
    <FoodModuleShell
      title='Online Orders'
      description='Monitor digital food orders flowing in from your active storefront.'
      moduleLabel='Online Orders'
    >
      <Card className='rounded-[28px] border border-slate-200 bg-white py-0 shadow-sm'>
        <CardHeader className='px-6 py-5'>
          <CardTitle className='text-xl font-black text-slate-900'>Latest Online Orders</CardTitle>
        </CardHeader>
        <CardContent className='space-y-4 px-6 pb-6'>
          {loading ? (
            Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className='h-20 animate-pulse rounded-2xl bg-slate-100' />
            ))
          ) : orders.length ? (
            orders.slice(0, 10).map((order) => (
              <div key={order._id} className='grid gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4 md:grid-cols-[1.4fr_1fr_auto_auto] md:items-center'>
                <div>
                  <p className='text-sm font-black text-slate-900'>{order.order_number || `#${order._id.slice(-6)}`}</p>
                  <p className='mt-1 text-xs text-slate-500'>
                    {order.shipping_address?.full_name || 'Customer'} • {order.shipping_address?.phone || '-'}
                  </p>
                </div>
                <div className='text-sm font-black text-slate-900'>{money(order.total)}</div>
                <Badge variant='outline' className='w-fit rounded-full px-3 py-1 text-xs font-bold'>
                  {formatLabel(order.status)}
                </Badge>
                <Badge className='w-fit rounded-full bg-sky-100 px-3 py-1 text-xs font-bold text-sky-700 shadow-none'>
                  {formatLabel(order.payment_status || 'pending')}
                </Badge>
              </div>
            ))
          ) : (
            <div className='rounded-2xl border border-dashed border-slate-200 px-4 py-12 text-center text-sm text-slate-500'>
              No online food orders found yet.
            </div>
          )}
        </CardContent>
      </Card>
    </FoodModuleShell>
  )
}
