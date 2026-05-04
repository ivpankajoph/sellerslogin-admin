import { useEffect, useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowRight, DatabaseZap, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import api from '@/lib/axios'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Main } from '@/components/layout/main'

export type FoodSummary = {
  restaurant_name?: string
  menu_count?: number
  active_offer_count?: number
  pending_order_count?: number
  live_order_count?: number
}

export type FoodRestaurantProfile = {
  restaurant_name?: string
  mobile?: string
  email?: string
  address?: string
  city?: string
  state?: string
  pincode?: string
  gst_number?: string
  fssai_license_number?: string
}

export type FoodMenuItem = {
  _id: string
  item_name?: string
  category?: string
  image_url?: string
  gallery_images?: string[]
  price?: number
  offer_price?: number
  is_available?: boolean
  variants?: Array<{
    name?: string
    price?: number
    offer_price?: number
    is_default?: boolean
    is_available?: boolean
  }>
}

export type FoodOffer = {
  _id: string
  offer_title?: string
  offer_type?: string
  combo_price?: number
  discount_percent?: number
  flat_discount?: number
  free_item_name?: string
  coupon_code?: string
  min_cart_value?: number
  max_discount?: number
  start_date?: string | null
  end_date?: string | null
  is_active?: boolean
  combo_items?: Array<{
    menu_item_id?: string | null
    item_name?: string
    quantity?: number
  }>
}

export type FoodOrder = {
  _id: string
  order_number?: string
  status?: string
  refund_status?: string
  payment_method?: string
  payment_status?: string
  total?: number
  createdAt?: string
  updatedAt?: string
  shipping_address?: {
    full_name?: string
    phone?: string
    line1?: string
    city?: string
    state?: string
    pincode?: string
    landmark?: string
  }
  items?: Array<{
    product_name?: string
    quantity?: number
    price?: number
    total_price?: number
  }>
}

export const money = (value?: number) => `Rs. ${Number(value || 0).toFixed(2)}`

export const formatLabel = (value?: string) =>
  String(value || '')
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ') || '-'

export const getFoodResponseObject = <T,>(
  payload: unknown,
  key: string
): T | null => {
  const data = payload as Record<string, unknown> | null | undefined
  if (!data || typeof data !== 'object') return null
  const directValue = data[key]
  if (
    directValue &&
    typeof directValue === 'object' &&
    !Array.isArray(directValue)
  ) {
    return directValue as T
  }
  const nestedData = data.data as Record<string, unknown> | null | undefined
  if (
    nestedData &&
    typeof nestedData === 'object' &&
    !Array.isArray(nestedData)
  ) {
    const nestedValue = nestedData[key]
    if (
      nestedValue &&
      typeof nestedValue === 'object' &&
      !Array.isArray(nestedValue)
    ) {
      return nestedValue as T
    }
    return nestedData as T
  }
  return data as T
}

export const getFoodResponseArray = <T,>(
  payload: unknown,
  key: string
): T[] => {
  const data = payload as Record<string, unknown> | null | undefined
  if (!data || typeof data !== 'object') return []
  if (Array.isArray(data[key])) return data[key] as T[]
  if (Array.isArray(data.data)) return data.data as T[]

  const nestedData = data.data as Record<string, unknown> | null | undefined
  if (
    nestedData &&
    typeof nestedData === 'object' &&
    !Array.isArray(nestedData) &&
    Array.isArray(nestedData[key])
  ) {
    return nestedData[key] as T[]
  }

  return []
}

export const useFoodOperationsData = () => {
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<FoodSummary | null>(null)
  const [restaurant, setRestaurant] = useState<FoodRestaurantProfile | null>(
    null
  )
  const [menuItems, setMenuItems] = useState<FoodMenuItem[]>([])
  const [offers, setOffers] = useState<FoodOffer[]>([])
  const [orders, setOrders] = useState<FoodOrder[]>([])

  useEffect(() => {
    let active = true

    const load = async () => {
      setLoading(true)
      try {
        const [summaryRes, restaurantRes, menuRes, offersRes, ordersRes] =
          await Promise.all([
          api.get('/food/summary'),
          api.get('/food/restaurant'),
          api.get('/food/menu'),
          api.get('/food/offers'),
          api.get('/food/orders'),
        ])
        if (!active) return
        setSummary(
          getFoodResponseObject<FoodSummary>(summaryRes?.data, 'summary')
        )
        setRestaurant(
          getFoodResponseObject<FoodRestaurantProfile>(
            restaurantRes?.data,
            'profile'
          )
        )
        setMenuItems(getFoodResponseArray<FoodMenuItem>(menuRes?.data, 'items'))
        setOffers(getFoodResponseArray<FoodOffer>(offersRes?.data, 'offers'))
        setOrders(getFoodResponseArray<FoodOrder>(ordersRes?.data, 'orders'))
      } catch (error: any) {
        if (!active) return
        toast.error(
          error?.response?.data?.message ||
            'Failed to load food operations data'
        )
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()
    return () => {
      active = false
    }
  }, [])

  return { loading, summary, restaurant, menuItems, offers, orders }
}

export function FoodModuleShell({
  title,
  description,
  moduleLabel,
  children,
  showModuleCard = true,
}: {
  title: string
  description: string
  moduleLabel: string
  children?: React.ReactNode
  showModuleCard?: boolean
}) {
  return (
    <Main className='flex flex-1 flex-col gap-6 bg-slate-50'>
      <div className='space-y-2'>
        <p className='text-xs font-black tracking-[0.24em] text-slate-400 uppercase'>
          Restaurant POS / Inventory
        </p>
        <div>
          <h1 className='text-3xl font-black tracking-tight text-slate-900'>
            {title}
          </h1>
          <p className='mt-1 text-sm text-slate-600'>{description}</p>
        </div>
      </div>
      {children}
      {showModuleCard ? (
        <Card className='rounded-[28px] border border-dashed border-slate-300 bg-white/70 py-0 shadow-none'>
          <CardHeader className='px-6 py-5'>
            <div className='flex items-center gap-3'>
              <div className='flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700'>
                <DatabaseZap className='h-5 w-5' />
              </div>
              <div>
                <CardTitle className='text-lg font-black text-slate-900'>
                  {moduleLabel} Module
                </CardTitle>
                <p className='mt-1 text-sm text-slate-500'>
                  This DineDash module has been added inside Food Hub. The
                  remaining advanced flows can be wired safely on top of the
                  current backend.
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className='flex flex-wrap gap-3 px-6 pb-6'>
            <Button asChild variant='outline' className='rounded-2xl'>
              <Link to='/food' hash='orders'>
                Food Orders
                <ArrowRight className='ml-2 h-4 w-4' />
              </Link>
            </Button>
            <Button asChild variant='outline' className='rounded-2xl'>
              <Link to='/food' hash='food-items'>
                Food Items
                <ArrowRight className='ml-2 h-4 w-4' />
              </Link>
            </Button>
            <Button asChild variant='outline' className='rounded-2xl'>
              <Link to='/food/dashboard'>
                Dashboard
                <Sparkles className='ml-2 h-4 w-4' />
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </Main>
  )
}

export const useFoodHotItems = (orders: FoodOrder[]) =>
  useMemo(() => {
    const map = new Map<
      string,
      { name: string; quantity: number; revenue: number }
    >()
    orders.forEach((order) => {
      order.items?.forEach((item) => {
        const key = String(item.product_name || 'Item')
        const quantity = Number(item.quantity || 0)
        const existing = map.get(key) || { name: key, quantity: 0, revenue: 0 }
        existing.quantity += quantity
        existing.revenue += quantity
          ? Number(order.total || 0) / Math.max(order.items?.length || 1, 1)
          : 0
        map.set(key, existing)
      })
    })
    return Array.from(map.values()).sort((a, b) => b.quantity - a.quantity)
  }, [orders])
