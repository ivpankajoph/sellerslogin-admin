import { useEffect, useMemo, useState } from 'react'
import { format, isValid, parseISO, subDays } from 'date-fns'
import { useSelector } from 'react-redux'
import { Link } from '@tanstack/react-router'
import {
  AlertCircle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Clock3,
  Copy,
  DollarSign,
  MessageCircle,
  ShoppingCart,
  Sparkles,
  Store,
  Tag,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import api from '@/lib/axios'
import { Main } from '@/components/layout/main'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  getVendorTemplatePreviewUrl,
  resolvePreviewCityFromVendorProfile,
} from '@/lib/storefront-url'
import { useActiveWebsiteSelection } from '@/features/vendor-template/components/websiteStudioStorage'

type Summary = {
  restaurant_name?: string
  menu_count?: number
  active_offer_count?: number
  pending_order_count?: number
  live_order_count?: number
}

type MenuItem = {
  _id: string
  item_name?: string
  category?: string
  price?: number
  offer_price?: number
  is_available?: boolean
}

type Offer = {
  _id: string
  is_active?: boolean
}

type Order = {
  _id: string
  order_number?: string
  status?: string
  payment_method?: string
  payment_status?: string
  total?: number
  type?: string
  createdAt?: string
  updatedAt?: string
  shipping_address?: {
    full_name?: string
  }
}

type ShareForm = {
  name: string
  whatsapp: string
  email: string
}

const money = (value?: number) => `Rs. ${Number(value || 0).toFixed(2)}`

const formatLabel = (value?: string) =>
  String(value || '')
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ') || '-'

const parseOrderDate = (order: Order) => {
  const rawValue = String(order.createdAt || order.updatedAt || '').trim()
  if (!rawValue) return null
  const parsed = parseISO(rawValue)
  return isValid(parsed) ? parsed : null
}

const buildChartData = (orders: Order[]) => {
  const dayKeys = Array.from({ length: 7 }, (_, index) =>
    format(subDays(new Date(), 6 - index), 'yyyy-MM-dd')
  )
  const totals = new Map(dayKeys.map((key) => [key, 0]))

  orders.forEach((order) => {
    const orderDate = parseOrderDate(order)
    if (!orderDate) return
    const key = format(orderDate, 'yyyy-MM-dd')
    if (!totals.has(key)) return
    totals.set(key, Number(totals.get(key) || 0) + Number(order.total || 0))
  })

  return dayKeys.map((key) => ({
    key,
    label: format(parseISO(`${key}T00:00:00`), 'EEE'),
    total: Number(totals.get(key) || 0),
  }))
}

const StatCard = ({
  title,
  value,
  trend,
  hint,
  positive,
  icon,
}: {
  title: string
  value: string
  trend: string
  hint: string
  positive: boolean
  icon: React.ReactNode
}) => (
  <Card className='rounded-[28px] border border-slate-200 bg-white py-0 shadow-sm'>
    <CardContent className='p-6'>
      <div className='flex items-center justify-between gap-3'>
        <div className='flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-700'>
          {icon}
        </div>
        <div
          className={`inline-flex items-center gap-1 text-xs font-bold ${
            positive ? 'text-emerald-600' : 'text-rose-600'
          }`}
        >
          {positive ? <ArrowUpRight className='h-3.5 w-3.5' /> : <ArrowDownRight className='h-3.5 w-3.5' />}
          <span>{trend}</span>
        </div>
      </div>
      <p className='mt-6 text-xs font-black uppercase tracking-[0.2em] text-slate-400'>
        {title}
      </p>
      <p className='mt-2 text-3xl font-black tracking-tight text-slate-900'>
        {value}
      </p>
      <p className='mt-2 text-sm font-medium text-slate-500'>{hint}</p>
    </CardContent>
  </Card>
)

export default function FoodOperationsDashboardPage() {
  const authUser = useSelector((state: any) => state.auth?.user || null)
  const vendorProfile = useSelector(
    (state: any) =>
      state.vendorprofile?.profile?.vendor ||
      state.vendorprofile?.profile?.data ||
      state.vendorprofile?.profile ||
      null
  )
  const vendorId = String(authUser?.id || authUser?._id || '')
  const { activeWebsite, activeWebsiteId } = useActiveWebsiteSelection(vendorId)

  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [offers, setOffers] = useState<Offer[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [shareOpen, setShareOpen] = useState(false)
  const [shareForm, setShareForm] = useState<ShareForm>({
    name: '',
    whatsapp: '',
    email: '',
  })

  useEffect(() => {
    let active = true

    const loadDashboard = async () => {
      setLoading(true)
      try {
        const [summaryRes, menuRes, offersRes, ordersRes] = await Promise.all([
          api.get('/food/summary'),
          api.get('/food/menu'),
          api.get('/food/offers'),
          api.get('/food/orders'),
        ])

        if (!active) return
        setSummary(summaryRes?.data?.data || summaryRes?.data || null)
        setMenuItems(menuRes?.data?.data || menuRes?.data || [])
        setOffers(offersRes?.data?.data || offersRes?.data || [])
        setOrders(ordersRes?.data?.data || ordersRes?.data || [])
      } catch (error: any) {
        if (!active) return
        toast.error(
          error?.response?.data?.message || 'Failed to load food operations dashboard'
        )
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadDashboard()

    return () => {
      active = false
    }
  }, [])

  const previewCity = useMemo(
    () => resolvePreviewCityFromVendorProfile(vendorProfile),
    [vendorProfile]
  )

  const menuShareUrl = useMemo(() => {
    const templateKey =
      String(activeWebsite?.templateKey || '').trim() || 'pocofood'
    return (
      getVendorTemplatePreviewUrl(
        vendorId,
        templateKey,
        previewCity.slug,
        activeWebsiteId || activeWebsite?.id
      ) || ''
    )
  }, [activeWebsite?.id, activeWebsite?.templateKey, activeWebsiteId, previewCity.slug, vendorId])

  const totalRevenue = useMemo(
    () => orders.reduce((sum, order) => sum + Number(order.total || 0), 0),
    [orders]
  )

  const activeOffersCount = useMemo(
    () => offers.filter((offer) => offer.is_active !== false).length,
    [offers]
  )

  const attentionItemsCount = useMemo(
    () => menuItems.filter((item) => item.is_available === false).length,
    [menuItems]
  )

  const recentOrders = useMemo(() => orders.slice(0, 5), [orders])
  const chartData = useMemo(() => buildChartData(orders), [orders])

  const copyMenuLink = async () => {
    if (!menuShareUrl) {
      toast.error('Food website preview link is not ready yet.')
      return
    }

    try {
      await navigator.clipboard.writeText(menuShareUrl)
      toast.success('Menu link copied')
    } catch {
      toast.error('Could not copy the menu link')
    }
  }

  const shareMenuByMessage = async () => {
    if (!menuShareUrl) {
      toast.error('Preview link is not ready yet. Please save/select your website first.')
      return
    }

    try {
      await navigator.clipboard.writeText(menuShareUrl)
      toast.success(`Menu link copied for ${shareForm.name || 'customer'}`)
      setShareOpen(false)
      setShareForm({ name: '', whatsapp: '', email: '' })
    } catch {
      toast.error('Could not copy the menu link')
    }
  }

  return (
    <Main className='flex flex-1 flex-col gap-6 bg-slate-50'>
      <div className='space-y-2'>
        <p className='text-xs font-black uppercase tracking-[0.24em] text-slate-400'>
          Restaurant POS / Inventory
        </p>
        <div className='flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between'>
          <div>
            <h1 className='text-3xl font-black tracking-tight text-slate-900'>
              Overview
            </h1>
            <p className='mt-1 text-sm text-slate-600'>
              Daily health, order activity, and quick actions for your food business.
            </p>
          </div>
          <div className='flex flex-wrap gap-3'>
            <Button
              variant='outline'
              className='h-11 rounded-2xl px-5'
              onClick={copyMenuLink}
            >
              <Copy className='mr-2 h-4 w-4' />
              Copy menu link
            </Button>
            <Button className='h-11 rounded-2xl bg-emerald-500 px-5 text-white hover:bg-emerald-600' onClick={() => setShareOpen(true)}>
              <MessageCircle className='mr-2 h-4 w-4' />
              Menu by message
            </Button>
          </div>
        </div>
      </div>

      <div className='grid gap-5 md:grid-cols-2 xl:grid-cols-4'>
        <StatCard
          title='Total Revenue'
          value={money(totalRevenue)}
          trend={orders.length ? `${orders.length} orders` : 'No orders yet'}
          hint='Revenue from current food orders'
          positive
          icon={<DollarSign className='h-5 w-5 text-indigo-600' />}
        />
        <StatCard
          title='Total Orders'
          value={String(orders.length)}
          trend={
            (summary?.pending_order_count || 0) + (summary?.live_order_count || 0) > 0
              ? `${(summary?.pending_order_count || 0) + (summary?.live_order_count || 0)} live`
              : 'All caught up'
          }
          hint='Includes pending and completed orders'
          positive={(summary?.pending_order_count || 0) + (summary?.live_order_count || 0) >= 0}
          icon={<ShoppingCart className='h-5 w-5 text-emerald-600' />}
        />
        <StatCard
          title='Active Offers'
          value={String(activeOffersCount)}
          trend={summary?.active_offer_count ? `${summary.active_offer_count} from summary` : 'Offer ready'}
          hint='Live combos and discounts'
          positive={activeOffersCount > 0}
          icon={<Tag className='h-5 w-5 text-sky-600' />}
        />
        <StatCard
          title='Items Need Attention'
          value={String(attentionItemsCount)}
          trend={attentionItemsCount > 0 ? 'Check availability' : 'All available'}
          hint='Unavailable items in your food menu'
          positive={attentionItemsCount === 0}
          icon={<AlertCircle className={`h-5 w-5 ${attentionItemsCount > 0 ? 'text-rose-600' : 'text-slate-400'}`} />}
        />
      </div>

      <div className='grid gap-6 xl:grid-cols-[minmax(0,1.8fr)_minmax(320px,0.9fr)]'>
        <Card className='rounded-[30px] border border-slate-200 bg-white py-0 shadow-sm'>
          <CardHeader className='flex flex-row items-center justify-between gap-4 px-8 py-7'>
            <div>
              <CardTitle className='text-2xl font-black text-slate-900'>
                Sales Analytics
              </CardTitle>
              <p className='mt-1 text-sm text-slate-500'>
                Last 7 days order revenue from your Food Hub.
              </p>
            </div>
            <Badge variant='outline' className='rounded-full px-4 py-2 text-xs font-bold'>
              Last 7 Days
            </Badge>
          </CardHeader>
          <CardContent className='px-4 pb-6 sm:px-8'>
            <div className='h-80'>
              <ResponsiveContainer width='100%' height='100%'>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id='foodDashboardRevenue' x1='0' y1='0' x2='0' y2='1'>
                      <stop offset='5%' stopColor='#4f46e5' stopOpacity={0.18} />
                      <stop offset='95%' stopColor='#4f46e5' stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray='3 3' vertical={false} stroke='#e2e8f0' />
                  <XAxis
                    dataKey='label'
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fontWeight: 700, fill: '#94a3b8' }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fontWeight: 700, fill: '#94a3b8' }}
                    tickFormatter={(value) => `Rs ${value}`}
                  />
                  <Tooltip
                    formatter={(value: number) => [money(value), 'Revenue']}
                    contentStyle={{
                      borderRadius: '18px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 12px 24px rgba(15,23,42,0.08)',
                    }}
                  />
                  <Area
                    type='monotone'
                    dataKey='total'
                    stroke='#4f46e5'
                    strokeWidth={3}
                    fill='url(#foodDashboardRevenue)'
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className='rounded-[30px] border border-slate-200 bg-white py-0 shadow-sm'>
          <CardHeader className='flex flex-row items-center justify-between gap-4 px-8 py-7'>
            <div>
              <CardTitle className='text-2xl font-black text-slate-900'>
                Recent Orders
              </CardTitle>
              <p className='mt-1 text-sm text-slate-500'>
                Latest food orders from your storefront.
              </p>
            </div>
            <Button asChild variant='ghost' className='rounded-full px-3 text-indigo-600 hover:text-indigo-700'>
              <Link to='/food' hash='orders'>View all</Link>
            </Button>
          </CardHeader>
          <CardContent className='space-y-5 px-8 pb-8'>
            {loading ? (
              <div className='space-y-4'>
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className='h-16 animate-pulse rounded-2xl bg-slate-100' />
                ))}
              </div>
            ) : recentOrders.length ? (
              recentOrders.map((order) => (
                <div
                  key={order._id}
                  className='flex items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3'
                >
                  <div className='flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm'>
                    <Clock3 className='h-5 w-5' />
                  </div>
                  <div className='min-w-0 flex-1'>
                    <p className='truncate text-sm font-black text-slate-900'>
                      {order.order_number || `#${order._id.slice(-6)}`}
                    </p>
                    <p className='mt-1 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400'>
                      {formatLabel(order.status)} • {formatLabel(order.payment_method || 'cod')}
                    </p>
                    <p className='mt-1 truncate text-xs text-slate-500'>
                      {order.shipping_address?.full_name || 'Customer'}
                    </p>
                  </div>
                  <div className='text-right'>
                    <p className='text-sm font-black text-slate-900'>
                      {money(order.total)}
                    </p>
                    <p className='mt-1 text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-600'>
                      {formatLabel(order.payment_status || 'pending')}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className='rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500'>
                No food orders yet.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className='grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]'>
        <Card className='rounded-[30px] border border-slate-200 bg-white py-0 shadow-sm'>
          <CardHeader className='px-8 py-7'>
            <CardTitle className='text-2xl font-black text-slate-900'>
              Quick Actions
            </CardTitle>
            <p className='text-sm text-slate-500'>
              Open the most-used sections for restaurant operations.
            </p>
          </CardHeader>
          <CardContent className='grid gap-4 px-8 pb-8 md:grid-cols-2'>
            {[
              {
                title: 'Restaurant setup',
                description: 'Update restaurant profile, logo, timings, and delivery settings.',
                to: '/food' as const,
                hash: 'restaurant-setup' as const,
                icon: <Store className='h-5 w-5 text-sky-600' />,
              },
              {
                title: 'Food items',
                description: 'Add or update dishes, categories, pricing, and availability.',
                to: '/food' as const,
                hash: 'food-items' as const,
                icon: <ShoppingCart className='h-5 w-5 text-emerald-600' />,
              },
              {
                title: 'Offers and combos',
                description: 'Create combo deals and manage active restaurant offers.',
                to: '/food' as const,
                hash: 'offer-form' as const,
                icon: <Tag className='h-5 w-5 text-amber-600' />,
              },
              {
                title: 'Food orders',
                description: 'Track order status, payment, and delivery flow from one place.',
                to: '/food' as const,
                hash: 'orders' as const,
                icon: <Sparkles className='h-5 w-5 text-indigo-600' />,
              },
            ].map((action) => (
              <Link
                key={action.title}
                to={action.to}
                hash={action.hash}
                className='group rounded-[24px] border border-slate-200 bg-slate-50 p-5 transition hover:border-slate-300 hover:bg-white'
              >
                <div className='flex items-start justify-between gap-3'>
                  <div className='flex h-11 w-11 items-center justify-center rounded-2xl bg-white shadow-sm'>
                    {action.icon}
                  </div>
                  <ArrowRight className='h-4 w-4 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-slate-700' />
                </div>
                <p className='mt-4 text-lg font-black text-slate-900'>{action.title}</p>
                <p className='mt-2 text-sm leading-6 text-slate-500'>{action.description}</p>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card className='rounded-[30px] border border-slate-200 bg-white py-0 shadow-sm'>
          <CardHeader className='px-8 py-7'>
            <CardTitle className='text-2xl font-black text-slate-900'>
              Food Hub Snapshot
            </CardTitle>
            <p className='text-sm text-slate-500'>
              Current restaurant and menu status at a glance.
            </p>
          </CardHeader>
          <CardContent className='space-y-4 px-8 pb-8'>
            {[
              ['Restaurant', summary?.restaurant_name || 'Not configured'],
              ['Menu Items', String(summary?.menu_count || menuItems.length || 0)],
              ['Active Offers', String(summary?.active_offer_count || activeOffersCount)],
              [
                'Live Orders',
                String((summary?.pending_order_count || 0) + (summary?.live_order_count || 0)),
              ],
            ].map(([label, value]) => (
              <div
                key={label}
                className='flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4'
              >
                <span className='text-sm font-bold text-slate-500'>{label}</span>
                <span className='text-base font-black text-slate-900'>{value}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className='max-w-[560px] rounded-[28px] border-0 p-0 shadow-2xl'>
          <div className='border-b border-slate-100 bg-white px-6 py-5'>
            <DialogHeader className='text-left'>
              <DialogTitle className='text-2xl font-black tracking-tight text-slate-900'>
                Share Digital Menu
              </DialogTitle>
              <DialogDescription className='mt-2 text-sm text-slate-500'>
                Copy the current PocoFood menu link and share it with your customer.
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className='space-y-5 px-6 py-6'>
            <div className='space-y-2'>
              <label className='text-xs font-black uppercase tracking-[0.18em] text-slate-400'>
                Customer Name
              </label>
              <Input
                placeholder='Example: Rahul Sharma'
                value={shareForm.name}
                onChange={(event) =>
                  setShareForm((current) => ({ ...current, name: event.target.value }))
                }
              />
            </div>
            <div className='space-y-2'>
              <label className='text-xs font-black uppercase tracking-[0.18em] text-slate-400'>
                WhatsApp Number
              </label>
              <Input
                placeholder='Example: 9876543210'
                value={shareForm.whatsapp}
                onChange={(event) =>
                  setShareForm((current) => ({ ...current, whatsapp: event.target.value }))
                }
              />
            </div>
            <div className='space-y-2'>
              <label className='text-xs font-black uppercase tracking-[0.18em] text-slate-400'>
                Email (Optional)
              </label>
              <Input
                placeholder='customer@example.com'
                value={shareForm.email}
                onChange={(event) =>
                  setShareForm((current) => ({ ...current, email: event.target.value }))
                }
              />
            </div>
            <div className='rounded-2xl border border-slate-200 bg-slate-50 p-4'>
              <p className='text-xs font-black uppercase tracking-[0.16em] text-slate-400'>
                Current Menu Link
              </p>
              <p className='mt-2 break-all text-sm font-medium text-slate-700'>
                {menuShareUrl || 'Select/save your active food website to generate the preview link.'}
              </p>
            </div>
            <div className='flex flex-col gap-3 sm:flex-row sm:justify-end'>
              <Button variant='outline' className='rounded-2xl' onClick={copyMenuLink}>
                <Copy className='mr-2 h-4 w-4' />
                Copy Link
              </Button>
              <Button className='rounded-2xl bg-emerald-500 text-white hover:bg-emerald-600' onClick={shareMenuByMessage}>
                <MessageCircle className='mr-2 h-4 w-4' />
                Ready to Share
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Main>
  )
}
