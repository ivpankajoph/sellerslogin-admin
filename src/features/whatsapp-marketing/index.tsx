import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import {
  AlertCircle,
  ArrowUpRight,
  Loader2,
  MessageSquareText,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import api from '@/lib/axios'

export default function WhatsAppMarketingPage() {
  const [isLaunching, setIsLaunching] = useState(true)
  const [error, setError] = useState('')

  const launchWorkspace = async () => {
    try {
      setIsLaunching(true)
      setError('')

      const response = await api.get('/marketing/launch')
      const launchUrl = String(response?.data?.launchUrl || '').trim()

      if (!launchUrl) {
        throw new Error('Launch URL not returned by the server')
      }

      window.location.assign(launchUrl)
    } catch (launchError: any) {
      setError(
        launchError?.response?.data?.message ||
          launchError?.message ||
          'Failed to open WhatsApp marketing dashboard'
      )
      setIsLaunching(false)
    }
  }

  useEffect(() => {
    launchWorkspace()
  }, [])

  return (
    <div className='flex min-h-[calc(100svh-4rem)] items-center justify-center p-6'>
      <Card className='w-full max-w-2xl border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-teal-50 shadow-sm'>
        <CardHeader className='space-y-4 text-center'>
          <div className='mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg'>
            <MessageSquareText className='h-8 w-8' />
          </div>
          <div className='space-y-2'>
            <CardTitle className='text-2xl text-slate-900'>
              WhatsApp Marketing
            </CardTitle>
            <CardDescription className='text-base text-slate-600'>
              Opening your dedicated WhatsApp campaigns, templates, automation,
              and inbox workspace.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className='space-y-6'>
          {isLaunching ? (
            <div className='flex flex-col items-center gap-4 py-8 text-center'>
              <Loader2 className='h-8 w-8 animate-spin text-emerald-600' />
              <p className='text-sm text-slate-600'>
                Launching your vendor marketing dashboard...
              </p>
            </div>
          ) : (
            <div className='space-y-5'>
              <div className='flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700'>
                <AlertCircle className='mt-0.5 h-4 w-4 shrink-0' />
                <span>{error}</span>
              </div>
              <div className='flex flex-col gap-3 sm:flex-row sm:justify-center'>
                <Button
                  type='button'
                  className='bg-emerald-600 text-white hover:bg-emerald-700'
                  onClick={launchWorkspace}
                >
                  <MessageSquareText className='h-4 w-4' />
                  Try Again
                  <ArrowUpRight className='h-4 w-4' />
                </Button>
                <Button asChild variant='outline'>
                  <Link to='/'>Back to Dashboard</Link>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
