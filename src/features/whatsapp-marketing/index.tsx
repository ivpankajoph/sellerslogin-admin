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
import { launchWhatsAppMarketingWorkspace } from './launch-workspace'

const AUTO_LAUNCH_DEDUPE_MS = 1500
const AUTO_LAUNCH_STORAGE_KEY = 'oph-whatsapp-marketing-auto-launch-at'

export default function WhatsAppMarketingPage() {
  const [isLaunching, setIsLaunching] = useState(true)
  const [isLaunched, setIsLaunched] = useState(false)
  const [error, setError] = useState('')

  const launchWorkspace = async () => {
    try {
      setIsLaunching(true)
      setIsLaunched(false)
      setError('')
      await launchWhatsAppMarketingWorkspace()
      setIsLaunched(true)
      setIsLaunching(false)
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
    const now = Date.now()
    const previousLaunchAt = Number(
      sessionStorage.getItem(AUTO_LAUNCH_STORAGE_KEY) || 0
    )

    if (now - previousLaunchAt < AUTO_LAUNCH_DEDUPE_MS) {
      return
    }

    sessionStorage.setItem(AUTO_LAUNCH_STORAGE_KEY, String(now))
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
          ) : isLaunched ? (
            <div className='space-y-5'>
              <div className='rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700'>
                WhatsApp Marketing opened in a new window.
              </div>
              <div className='flex flex-col gap-3 sm:flex-row sm:justify-center'>
                <Button
                  type='button'
                  className='bg-emerald-600 text-white hover:bg-emerald-700'
                  onClick={launchWorkspace}
                >
                  <MessageSquareText className='h-4 w-4' />
                  Open Again
                  <ArrowUpRight className='h-4 w-4' />
                </Button>
                <Button asChild variant='outline'>
                  <Link to='/'>Back to Dashboard</Link>
                </Button>
              </div>
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
