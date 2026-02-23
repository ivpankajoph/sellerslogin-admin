import z from 'zod'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useMemo } from 'react'
import { ArrowRight, CreditCard, Truck } from 'lucide-react'
import { useSelector } from 'react-redux'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useVendorIntegrations } from '@/context/vendor-integrations-provider'
import type { RootState } from '@/store'

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
  const role = useSelector((state: RootState) => state.auth?.user?.role)
  const isVendor = role === 'vendor'
  const { loading: integrationsLoading, isProviderVisible } = useVendorIntegrations()

  const visibleGateways = useMemo(
    () =>
      gateways.filter((gateway) => {
        if (!isVendor) return true
        if (gateway.id === 'cod') return true
        return isProviderVisible(gateway.id)
      }),
    [isProviderVisible, isVendor],
  )

  const selectedGateway =
    activeGateway && visibleGateways.some((gateway) => gateway.id === activeGateway)
      ? activeGateway
      : undefined

  return (
    <div className='space-y-6'>
      <div className='flex flex-col gap-2'>
        <h1 className='text-2xl font-semibold text-slate-900'>Payments</h1>
        <p className='text-sm text-muted-foreground'>
          Review payment gateway performance and detailed payment reports.
        </p>
      </div>

      {isVendor && integrationsLoading ? (
        <Card>
          <CardContent className='py-8 text-sm text-muted-foreground'>
            Loading connected payment apps...
          </CardContent>
        </Card>
      ) : (
        <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
          {visibleGateways.map((gateway) => (
            <Card
              key={gateway.id}
              className={`group ${selectedGateway === gateway.id ? 'border-indigo-200 shadow-md' : ''}`}
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
      )}

      {!integrationsLoading && visibleGateways.length === 0 && (
        <Card>
          <CardContent className='py-8 text-sm text-muted-foreground'>
            No payment provider is connected for this vendor yet.
          </CardContent>
        </Card>
      )}

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
