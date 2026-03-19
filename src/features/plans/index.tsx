import { useEffect, useState } from 'react'
import { ArrowLeft, CheckCircle2, Crown, RefreshCcw, ShieldCheck, Sparkles } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { toast } from 'sonner'
import api from '@/lib/axios'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useSelector } from 'react-redux'
import type { RootState } from '@/store'
import {
  type BillingSummary,
  formatPlanDate,
  formatPlanPrice,
  loadRazorpayCheckout,
  PREMIUM_HIGHLIGHTS,
} from './shared'

const getErrorMessage = (error: unknown, fallback: string) => {
  if (
    error &&
    typeof error === 'object' &&
    'response' in error &&
    error.response &&
    typeof error.response === 'object' &&
    'data' in error.response &&
    error.response.data &&
    typeof error.response.data === 'object' &&
    'message' in error.response.data &&
    typeof error.response.data.message === 'string'
  ) {
    return error.response.data.message
  }

  return fallback
}

export default function PlansPage() {
  const user = useSelector((state: RootState) => state.auth.user)
  const isVendor = String(user?.role || '').toLowerCase() === 'vendor'
  const isVendorTeamUser =
    isVendor && String(user?.account_type || '').toLowerCase() === 'vendor_user'

  const [summary, setSummary] = useState<BillingSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)

  const loadSummary = async () => {
    try {
      setLoading(true)
      const response = await api.get('/billing/summary')
      setSummary((response.data?.data || null) as BillingSummary | null)
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to load billing summary'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!isVendor || isVendorTeamUser) return
    loadSummary()
  }, [isVendor, isVendorTeamUser])

  const handleUpgrade = async () => {
    if (!summary) return

    try {
      setActionLoading(true)
      const scriptLoaded = await loadRazorpayCheckout()
      if (!scriptLoaded || !window.Razorpay) {
        toast.error('Failed to load Razorpay checkout')
        return
      }

      const orderResponse = await api.post('/billing/create-order')
      const order = orderResponse.data?.data

      const razorpay = new window.Razorpay({
        key: order?.key_id,
        amount: order?.amount,
        currency: order?.currency || 'INR',
        name: 'SellersLogin Premium',
        description: order?.description || 'Premium monthly plan',
        order_id: order?.order_id,
        handler: async (paymentResponse: Record<string, unknown>) => {
          try {
            await api.post('/billing/verify', {
              razorpay_order_id: paymentResponse.razorpay_order_id,
              razorpay_payment_id: paymentResponse.razorpay_payment_id,
              razorpay_signature: paymentResponse.razorpay_signature,
            })
            toast.success('Premium plan activated successfully')
            await loadSummary()
            window.setTimeout(() => {
              window.location.reload()
            }, 900)
          } catch (error: unknown) {
            toast.error(getErrorMessage(error, 'Failed to verify payment'))
          } finally {
            setActionLoading(false)
          }
        },
        prefill: {
          name: order?.customer?.name || user?.name || '',
          email: order?.customer?.email || user?.email || '',
          contact: order?.customer?.contact || '',
        },
        theme: {
          color: '#d4a017',
        },
        modal: {
          ondismiss: () => setActionLoading(false),
        },
      })

      razorpay.open()
    } catch (error: unknown) {
      setActionLoading(false)
      toast.error(getErrorMessage(error, 'Failed to create subscription order'))
    }
  }

  const handleCancelPlan = async () => {
    try {
      setActionLoading(true)
      await api.post('/billing/cancel')
      setCancelDialogOpen(false)
      toast.success('Plan cancelled successfully. Premium access has been removed.')
      await loadSummary()
      window.setTimeout(() => {
        window.location.reload()
      }, 900)
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to cancel plan'))
    } finally {
      setActionLoading(false)
    }
  }

  const handleReactivatePlan = async () => {
    try {
      setActionLoading(true)
      await api.post('/billing/reactivate')
      toast.success('Plan reactivated successfully')
      await loadSummary()
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to reactivate plan'))
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <>
      <Header fixed>
        <div className='flex w-full flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
          <div>
            <div className='text-lg font-semibold tracking-tight'>Plans & Billing</div>
            <p className='text-muted-foreground text-sm'>
              Upgrade, cancel, or reactivate your premium plan from one place.
            </p>
          </div>
          <div className='flex items-center gap-2'>
            <Button variant='outline' asChild>
              <Link to='/'>
                <ArrowLeft className='mr-2 h-4 w-4' />
                Back to Dashboard
              </Link>
            </Button>
            <Button variant='outline' onClick={loadSummary} disabled={loading}>
              <RefreshCcw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
        <div className='ms-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>

      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        {!isVendor || isVendorTeamUser ? (
          <Card>
            <CardContent className='py-10 text-center text-muted-foreground'>
              This page is available only for the vendor owner.
            </CardContent>
          </Card>
        ) : loading ? (
          <Card>
            <CardContent className='py-10 text-center text-muted-foreground'>
              Loading billing details...
            </CardContent>
          </Card>
        ) : summary ? (
          <>
            {summary.plan.is_premium_active ? (
              <Card className='border-emerald-200 bg-gradient-to-r from-emerald-50 via-white to-amber-50'>
                <CardContent className='py-8'>
                  <div className='text-center'>
                    <p className='text-sm font-medium uppercase tracking-[0.3em] text-emerald-700'>
                      Premium Activated
                    </p>
                    <h2 className='mt-3 text-4xl font-bold tracking-tight text-slate-900'>
                      Congratulations on Upgrading to Premium!
                    </h2>
                    <p className='text-muted-foreground mt-3 text-base'>
                      Your premium plan is now active and all premium features are unlocked.
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : null}

            <div className='grid gap-4 lg:grid-cols-[1.1fr_0.9fr]'>
              <Card className='border-amber-200 bg-gradient-to-br from-amber-50 via-white to-yellow-50'>
                <CardHeader>
                  <div className='flex items-center justify-between gap-3'>
                    <div>
                      <CardTitle className='flex items-center gap-2'>
                        <Crown className='h-5 w-5 text-amber-600' />
                        SellersLogin Premium
                      </CardTitle>
                      <p className='text-muted-foreground mt-1 text-sm'>
                        You are on{' '}
                        <span className='font-semibold capitalize'>{summary.plan.current}</span>{' '}
                        plan right now.
                      </p>
                    </div>
                    <Badge className='bg-amber-500 text-black hover:bg-amber-500'>
                      {summary.pricing.discount_label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className='space-y-4'>
                  <div className='flex items-end gap-3'>
                    <div className='text-3xl font-bold'>
                      {formatPlanPrice(summary.pricing.monthly_price, summary.pricing.currency)}
                    </div>
                    <div className='pb-1 text-sm text-muted-foreground'>/ month</div>
                    <div className='pb-1 text-sm text-muted-foreground line-through'>
                      {formatPlanPrice(summary.pricing.original_price, summary.pricing.currency)}
                    </div>
                  </div>

                  <div className='grid gap-3 sm:grid-cols-2'>
                    {PREMIUM_HIGHLIGHTS.map((item) => (
                      <div key={item} className='flex items-start gap-2 rounded-md border bg-white p-3'>
                        <CheckCircle2 className='mt-0.5 h-4 w-4 text-emerald-600' />
                        <span className='text-sm'>{item}</span>
                      </div>
                    ))}
                  </div>

                  <div className='flex flex-wrap gap-2'>
                    {!summary.plan.is_premium_active ? (
                      <Button
                        onClick={handleUpgrade}
                        disabled={actionLoading}
                        className='border border-amber-300 bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 text-black hover:brightness-95'
                      >
                        <Sparkles className='mr-2 h-4 w-4' />
                        {actionLoading ? 'Starting checkout...' : 'Upgrade to Premium'}
                      </Button>
                    ) : summary.plan.auto_renew ? (
                      <Button
                        variant='destructive'
                        onClick={() => setCancelDialogOpen(true)}
                        disabled={actionLoading}
                      >
                        Cancel Plan
                      </Button>
                    ) : (
                      <Button onClick={handleReactivatePlan} disabled={actionLoading}>
                        Reactivate Plan
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className='flex items-center gap-2'>
                    <ShieldCheck className='h-5 w-5 text-emerald-600' />
                    Current Plan Status
                  </CardTitle>
                </CardHeader>
                <CardContent className='space-y-4'>
                  <div className='grid gap-3 sm:grid-cols-2'>
                    <div className='rounded-md border p-3'>
                      <p className='text-muted-foreground text-xs uppercase'>Plan</p>
                      <p className='mt-1 font-semibold capitalize'>{summary.plan.current}</p>
                    </div>
                    <div className='rounded-md border p-3'>
                      <p className='text-muted-foreground text-xs uppercase'>Status</p>
                      <p className='mt-1 font-semibold capitalize'>{summary.plan.status}</p>
                    </div>
                    <div className='rounded-md border p-3'>
                      <p className='text-muted-foreground text-xs uppercase'>Started</p>
                      <p className='mt-1 font-semibold'>{formatPlanDate(summary.plan.started_at)}</p>
                    </div>
                    <div className='rounded-md border p-3'>
                      <p className='text-muted-foreground text-xs uppercase'>Valid Till</p>
                      <p className='mt-1 font-semibold'>{formatPlanDate(summary.plan.ends_at)}</p>
                    </div>
                  </div>

                  <div className='rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground'>
                    {summary.plan.is_premium_active ? (
                      summary.plan.auto_renew
                        ? 'Your Premium plan is active. If you cancel it, Premium access will end immediately and you will need to upgrade again to restore it.'
                        : 'Your Premium plan has been cancelled and your account is now back on the free plan.'
                    ) : (
                      'You are currently on the free plan. Use the upgrade button to unlock Premium.'
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className='grid gap-4 lg:grid-cols-2'>
              <Card>
                <CardHeader>
                  <CardTitle>Free Plan Includes</CardTitle>
                </CardHeader>
                <CardContent className='space-y-3'>
                  {summary.features.free.map((item) => (
                    <div key={item} className='rounded-md border p-3 text-sm'>
                      {item}
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Premium Plan Includes</CardTitle>
                </CardHeader>
                <CardContent className='space-y-3'>
                  {summary.features.premium.map((item) => (
                    <div key={item} className='rounded-md border border-amber-200 bg-amber-50 p-3 text-sm'>
                      {item}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </>
        ) : null}
      </Main>

      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Premium Plan?</AlertDialogTitle>
            <AlertDialogDescription>
              Your Premium features will be removed immediately after cancellation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className='space-y-2 text-sm text-muted-foreground'>
            <p>You will lose Premium access right away, including premium-only tools and benefits.</p>
            <p>You will not be able to reactivate this same plan later from here. To use Premium again, you will need to purchase a new upgrade.</p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Keep Premium</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelPlan}
              disabled={actionLoading}
              className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
            >
              {actionLoading ? 'Cancelling...' : 'Confirm Cancel'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
