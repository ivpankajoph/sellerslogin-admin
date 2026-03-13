import { createFileRoute, Link } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Ticket, MessageSquare } from 'lucide-react'
import { useSelector } from 'react-redux'
import type { RootState } from '@/store'

export const Route = createFileRoute('/_authenticated/help-center/')({
  component: HelpCenterLandingPage,
})

function HelpCenterLandingPage() {
  const role = useSelector((state: RootState) => state.auth?.user?.role)
  const isAdmin = role === 'admin' || role === 'superadmin'

  const options = [
    {
      title: 'Ticket Centre',
      description: 'Raise and manage support tickets with the team.',
      icon: Ticket,
      url: '/help-center/tickets',
      color: 'bg-indigo-50 text-indigo-600',
    },
    {
      title: 'Live Chat Centre',
      description: 'Chat directly with support agents in real-time.',
      icon: MessageSquare,
      url: '/help-center/chat',
      color: 'bg-emerald-50 text-emerald-600',
    },
  ]

  return (
    <div className='space-y-6'>
      <div>
        <h1 className='text-2xl font-semibold text-slate-900'>Help Centre</h1>
        <p className='text-sm text-muted-foreground'>
          {isAdmin 
            ? 'Manage support requests and communicate with vendors.' 
            : 'Get assistance and support for your platform needs.'}
        </p>
      </div>

      <div className='grid gap-6 md:grid-cols-2'>
        {options.map((option) => (
          <Link key={option.title} to={option.url}>
            <Card className='h-full cursor-pointer transition-all hover:border-slate-400 hover:shadow-md'>
              <CardHeader className='flex flex-row items-center gap-4'>
                <div className={`rounded-xl p-3 ${option.color}`}>
                  <option.icon className='h-6 w-6' />
                </div>
                <CardTitle className='text-xl'>{option.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className='text-muted-foreground'>{option.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
