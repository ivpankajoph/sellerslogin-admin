import { createFileRoute } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MessageSquareOff } from 'lucide-react'

export const Route = createFileRoute('/_authenticated/help-center/chat')({
  component: LiveChatCentrePage,
})

function LiveChatCentrePage() {
  return (
    <div className='space-y-6'>
      <div>
        <h1 className='text-2xl font-semibold text-slate-900'>Live Chat Centre</h1>
        <p className='text-sm text-muted-foreground'>
          Real-time communication with the support team.
        </p>
      </div>

      <Card className='flex flex-col items-center justify-center py-20 text-center'>
        <div className='mb-4 rounded-full bg-slate-50 p-6'>
          <MessageSquareOff className='h-12 w-12 text-slate-400' />
        </div>
        <CardHeader>
          <CardTitle className='text-xl'>Live Chat Unavailable</CardTitle>
        </CardHeader>
        <CardContent>
          <p className='max-w-md text-muted-foreground'>
            The live chat system is currently undergoing maintenance or is not yet enabled for your account. 
            Please use the <span className='font-semibold'>Ticket Centre</span> for any urgent queries.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
