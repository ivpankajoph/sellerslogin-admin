import { useEffect, useState } from 'react'
import { Crown, Sparkles } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { toast } from 'sonner'
import api from '@/lib/axios'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  type BillingSummary,
  formatPlanDate,
  formatPlanPrice,
  loadRazorpayCheckout,
  PREMIUM_HIGHLIGHTS,
} from '@/features/plans/shared'

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

type UpgradePlanDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  userName?: string
  userEmail?: string
  onPlanActivated?: () => void | Promise<void>
}

export function UpgradePlanDialog({
  open,
  onOpenChange,
  userName,
  userEmail,
  onPlanActivated,
}: UpgradePlanDialogProps) {
  const [summary, setSummary] = useState<BillingSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

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
    if (!open) return
    loadSummary()
  }, [open])

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
            await onPlanActivated?.()
            onOpenChange(false)
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
          name: order?.customer?.name || userName || '',
          email: order?.customer?.email || userEmail || '',
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-2xl'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <Crown className='h-5 w-5 text-amber-600' />
            Upgrade Your Plan
          </DialogTitle>
          <DialogDescription>
            You are on the free plan right now. Upgrade to Premium to connect multiple apps and create unlimited websites.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className='py-10 text-center text-sm text-muted-foreground'>Loading plan details...</div>
        ) : summary ? (
          <div className='space-y-4'>
            <div className='rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-yellow-50 p-5'>
              <div className='flex flex-wrap items-start justify-between gap-3'>
                <div>
                  <p className='text-sm text-muted-foreground'>Current plan</p>
                  <p className='text-xl font-semibold capitalize'>{summary.plan.current}</p>
                </div>
                <Badge className='bg-amber-500 text-black hover:bg-amber-500'>
                  {summary.pricing.discount_label}
                </Badge>
              </div>
              <div className='mt-4 flex items-end gap-3'>
                <div className='text-3xl font-bold'>
                  {formatPlanPrice(summary.pricing.monthly_price, summary.pricing.currency)}
                </div>
                <div className='pb-1 text-sm text-muted-foreground'>/ month</div>
                <div className='pb-1 text-sm text-muted-foreground line-through'>
                  {formatPlanPrice(summary.pricing.original_price, summary.pricing.currency)}
                </div>
              </div>
              <div className='mt-4 grid gap-3 sm:grid-cols-2'>
                {PREMIUM_HIGHLIGHTS.map((item) => (
                  <div key={item} className='rounded-md border bg-white p-3 text-sm'>
                    {item}
                  </div>
                ))}
              </div>
              {summary.plan.is_premium_active ? (
                <div className='mt-4 rounded-md border bg-white p-3 text-sm text-muted-foreground'>
                  Your Premium plan is active until {formatPlanDate(summary.plan.ends_at)}.
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        <DialogFooter>
          <div className='flex w-full flex-col gap-2 sm:flex-row sm:justify-between'>
            <Button variant='outline' asChild>
              <Link to='/plans'>Manage Plan</Link>
            </Button>
            <Button
              onClick={handleUpgrade}
              disabled={actionLoading || loading || summary?.plan.is_premium_active}
              className='border border-amber-300 bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 text-black hover:brightness-95'
            >
              <Sparkles className='mr-2 h-4 w-4' />
              {summary?.plan.is_premium_active
                ? 'Premium Active'
                : actionLoading
                  ? 'Starting checkout...'
                  : 'Upgrade to Premium'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
