export type BillingSummary = {
  vendor_id: string
  plan: {
    current: 'free' | 'premium'
    status: 'free' | 'active' | 'cancelled' | 'expired'
    auto_renew: boolean
    is_premium_active: boolean
    started_at: string | null
    ends_at: string | null
    cancelled_at: string | null
    reactivated_at: string | null
    last_payment_at: string | null
  }
  pricing: {
    currency: string
    monthly_price: number
    original_price: number
    discount_label: string
  }
  features: {
    free: string[]
    premium: string[]
  }
  razorpay: {
    key_id: string
  }
}

export const PREMIUM_HIGHLIGHTS = [
  'Connect multiple apps without free plan limits',
  'Create unlimited websites for your business',
  'Get priority support and faster onboarding',
  'Unlock advanced growth tools and scale-ready setup',
]

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void
    }
  }
}

export const formatPlanPrice = (value: number, currency = 'INR') =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value)

export const formatPlanDate = (value?: string | null) => {
  if (!value) return 'Not available'

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return 'Not available'

  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(parsed)
}

export const loadRazorpayCheckout = async () => {
  if (typeof window === 'undefined') return false
  if (window.Razorpay) return true

  return new Promise<boolean>((resolve) => {
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}
