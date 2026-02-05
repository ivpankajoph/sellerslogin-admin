import z from 'zod'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowRight, CreditCard, Truck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type PaymentGateway = {
  id: 'razorpay' | 'cod'
  name: string
  description: string
  status: string
  icon: typeof CreditCard
}

const gateways: PaymentGateway[] = [
  {
    id: 'razorpay',
    name: 'Razorpay',
    description: 'Cards, UPI, and net banking payments.',
    status: 'Active',
    icon: CreditCard,
  },
  {
    id: 'cod',
    name: 'Cash on Delivery',
    description: 'Collect payment when the order is delivered.',
    status: 'Available',
    icon: Truck,
  },
]

export const Route = createFileRoute('/_authenticated/payments/')({
  validateSearch: z.object({
    gateway: z.enum(['razorpay', 'cod']).optional().catch(undefined),
  }),
  component: PaymentsPage,
})

function PaymentsPage() {
  const search = Route.useSearch()
  const activeGateway = search.gateway
  return (
    <div className='space-y-6'>
      <div className='flex flex-col gap-2'>
        <h1 className='text-2xl font-semibold text-slate-900'>Payments</h1>
        <p className='text-sm text-muted-foreground'>
          Review payment gateway performance and detailed payment reports.
        </p>
      </div>

      <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
        {gateways.map((gateway) => (
          <Card
            key={gateway.id}
            className={`group ${activeGateway === gateway.id ? 'border-indigo-200 shadow-md' : ''}`}
          >
            <CardHeader className='pb-2'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-3'>
                  <div className='flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-900'>
                    <gateway.icon className='h-5 w-5' />
                  </div>
                  <div>
                    <CardTitle className='text-base'>{gateway.name}</CardTitle>
                    <p className='text-xs text-muted-foreground'>{gateway.id}</p>
                  </div>
                </div>
                <Badge className='rounded-full px-2 py-0.5 text-xs'>
                  {gateway.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className='space-y-4'>
              <p className='text-sm text-muted-foreground'>{gateway.description}</p>
              <Button asChild variant='outline' className='w-full justify-between'>
                <Link to='/payments' search={{ gateway: gateway.id }}>
                  View report
                  <ArrowRight className='h-4 w-4' />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className='pb-2'>
          <CardTitle className='text-base'>Reports snapshot</CardTitle>
        </CardHeader>
        <CardContent className='text-sm text-muted-foreground'>
          Select a gateway to view payment status, revenue, and order-level details for that provider.
        </CardContent>
      </Card>
    </div>
  )
}
