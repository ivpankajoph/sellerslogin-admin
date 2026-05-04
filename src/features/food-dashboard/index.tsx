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
  Loader2,
  MessageCircle,
  Send,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  getVendorTemplatePreviewUrl,
  resolvePreviewCityFromVendorProfile,
} from '@/lib/storefront-url'
import { getStoredActiveWebsite } from '@/features/vendor-template/components/websiteStudioStorage'
import {
  getFoodResponseArray,
  getFoodResponseObject,
} from '@/features/food-ops/shared'

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

type InventoryItem = {
  _id: string
  name?: string
  unit?: string
  stock?: number
  minimum_stock?: number
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
  linkType: 'menu' | 'offers' | 'items' | 'custom'
  customLink: string
}

type TemplateWebsiteLite = {
  _id?: string
  id?: string
  name?: string
  business_name?: string
  website_slug?: string
  template_key?: string
  templateKey?: string
  is_default?: boolean
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

const normalizeWhatsAppNumber = (value: string) => {
  const digits = value.replace(/\D/g, '')
  if (!digits) return ''
  return digits.length === 10 ? `91${digits}` : digits
}

const isValidEmail = (value: string) =>
  !value.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())

const shareLinkLabels: Record<ShareForm['linkType'], string> = {
  menu: 'Full menu',
  offers: 'Offers and combos',
  items: 'Menu items',
  custom: 'Custom link',
}

const isPocoFoodWebsite = (website?: TemplateWebsiteLite | null) => {
  const key = String(website?.template_key || website?.templateKey || '')
    .trim()
    .toLowerCase()
  return key === 'pocofood' || key.includes('pocofood')
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
  const authToken = useSelector((state: any) => state.auth?.token || '')
  const vendorProfile = useSelector(
    (state: any) =>
      state.vendorprofile?.profile?.vendor ||
      state.vendorprofile?.profile?.data ||
      state.vendorprofile?.profile ||
      null
  )
  const vendorId = String(authUser?.id || authUser?._id || '')

  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [offers, setOffers] = useState<Offer[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [shareOpen, setShareOpen] = useState(false)
  const [shareForm, setShareForm] = useState<ShareForm>({
    name: '',
    whatsapp: '',
    email: '',
    linkType: 'menu',
    customLink: '',
  })
  const [sendingShare, setSendingShare] = useState(false)
  const [foodWebsite, setFoodWebsite] = useState<TemplateWebsiteLite | null>(null)

  useEffect(() => {
    let active = true

    const loadDashboard = async () => {
      setLoading(true)
      try {
        const [summaryRes, menuRes, offersRes, ordersRes, inventoryRes] =
          await Promise.all([
          api.get('/food/summary'),
          api.get('/food/menu'),
          api.get('/food/offers'),
          api.get('/food/orders'),
          api.get('/food/inventory'),
        ])

        if (!active) return
        setSummary(getFoodResponseObject<Summary>(summaryRes?.data, 'summary'))
        setMenuItems(getFoodResponseArray<MenuItem>(menuRes?.data, 'items'))
        setOffers(getFoodResponseArray<Offer>(offersRes?.data, 'offers'))
        setOrders(getFoodResponseArray<Order>(ordersRes?.data, 'orders'))
        setInventoryItems(
          getFoodResponseArray<InventoryItem>(inventoryRes?.data, 'rows')
        )
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

  useEffect(() => {
    let active = true

    const loadFoodWebsite = async () => {
      const storedWebsite = getStoredActiveWebsite(vendorId)
      if (isPocoFoodWebsite(storedWebsite)) {
        setFoodWebsite({
          _id: storedWebsite?.id,
          id: storedWebsite?.id,
          name: storedWebsite?.name,
          template_key: 'pocofood',
          website_slug: storedWebsite?.websiteSlug,
        })
        return
      }

      try {
        const apiBase = String(import.meta.env.VITE_PUBLIC_API_URL || '').replace(/\/+$/, '')
        if (!apiBase || !vendorId) return
        const response = await fetch(
          `${apiBase}/v1/templates/by-vendor?vendor_id=${encodeURIComponent(vendorId)}&_ts=${Date.now()}`,
          {
            headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
          }
        )
        const payload = await response.json().catch(() => null)
        const websites = Array.isArray(payload?.data)
          ? (payload.data as TemplateWebsiteLite[])
          : []
        const defaultPocoFoodWebsite = websites.find(
          (website) => isPocoFoodWebsite(website) && website.is_default
        )
        const pocoFoodWebsite =
          defaultPocoFoodWebsite || websites.find((website) => isPocoFoodWebsite(website))
        if (active) setFoodWebsite(pocoFoodWebsite || null)
      } catch {
        if (active) setFoodWebsite(null)
      }
    }

    void loadFoodWebsite()

    return () => {
      active = false
    }
  }, [authToken, vendorId])

  const previewCity = useMemo(
    () => resolvePreviewCityFromVendorProfile(vendorProfile),
    [vendorProfile]
  )

  const menuShareUrl = useMemo(() => {
    const websiteId = String(
      foodWebsite?._id ||
        foodWebsite?.id ||
        vendorProfile?.default_website_id ||
        vendorProfile?.defaultWebsiteId ||
        authUser?.default_website_id ||
        ''
    ).trim()
    return (
      getVendorTemplatePreviewUrl(
        vendorId,
        'pocofood',
        previewCity.slug,
        websiteId || undefined
      ) || ''
    )
  }, [
    authUser?.default_website_id,
    foodWebsite?._id,
    foodWebsite?.id,
    previewCity.slug,
    vendorId,
    vendorProfile?.defaultWebsiteId,
    vendorProfile?.default_website_id,
  ])

  const selectedShareUrl = useMemo(() => {
    const baseUrl = menuShareUrl
    if (shareForm.linkType === 'custom') return shareForm.customLink.trim()
    if (!baseUrl) return ''
    if (shareForm.linkType === 'offers') return `${baseUrl}/combo`
    return `${baseUrl}/all-products`
  }, [menuShareUrl, shareForm.customLink, shareForm.linkType])

  const shareMessage = useMemo(() => {
    const customerName = shareForm.name.trim()
    const restaurantName = summary?.restaurant_name || 'our restaurant'
    return [
      customerName ? `Hi ${customerName},` : 'Hi,',
      `Here is the ${shareLinkLabels[shareForm.linkType].toLowerCase()} link for ${restaurantName}.`,
      'Tap the link below to open the menu and place your order:',
      '',
      selectedShareUrl || 'Menu link is not ready yet.',
    ].join('\n')
  }, [selectedShareUrl, shareForm.linkType, shareForm.name, summary?.restaurant_name])

  const sharePreviewMessage = useMemo(
    () =>
      shareMessage.replace(
        selectedShareUrl || 'Menu link is not ready yet.',
        selectedShareUrl ? `[${shareLinkLabels[shareForm.linkType]} link will be attached]` : 'Menu link is not ready yet.'
      ),
    [selectedShareUrl, shareForm.linkType, shareMessage]
  )

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

  const lowStockItems = useMemo(
    () =>
      inventoryItems.filter(
        (item) =>
          Number(item.minimum_stock || 0) > 0 &&
          Number(item.stock || 0) <= Number(item.minimum_stock || 0)
      ),
    [inventoryItems]
  )

  const recentOrders = useMemo(() => orders.slice(0, 5), [orders])
  const chartData = useMemo(() => buildChartData(orders), [orders])

  const copyMenuLink = async () => {
    if (!selectedShareUrl) {
      toast.error('Food website preview link is not ready yet.')
      return
    }

    try {
      await navigator.clipboard.writeText(selectedShareUrl)
      toast.success('Menu link copied')
    } catch {
      toast.error('Could not copy the menu link')
    }
  }

  const copyShareMessage = async () => {
    if (!selectedShareUrl) {
      toast.error('Preview link is not ready yet. Please save/select your website first.')
      return
    }

    try {
      await navigator.clipboard.writeText(shareMessage)
      toast.success(`Menu message copied for ${shareForm.name || 'customer'}`)
    } catch {
      toast.error('Could not copy the menu message')
    }
  }

  const sendMenuLink = async () => {
    if (!selectedShareUrl) {
      toast.error('Preview link is not ready yet. Please save/select your website first.')
      return
    }
    const whatsappNumber = normalizeWhatsAppNumber(shareForm.whatsapp)
    const email = shareForm.email.trim()
    if (!whatsappNumber && !email) {
      toast.error('Enter customer WhatsApp number or email')
      return
    }
    if (!isValidEmail(email)) {
      toast.error('Enter a valid email address')
      return
    }

    setSendingShare(true)
    try {
      const response = await api.post('/food/share-menu-link', {
        name: shareForm.name.trim(),
        whatsapp: whatsappNumber,
        email,
        link: selectedShareUrl,
        link_type: shareLinkLabels[shareForm.linkType],
        restaurant_name: summary?.restaurant_name || '',
        message: shareMessage,
      })
      const results = Array.isArray(response?.data?.results) ? response.data.results : []
      const deliveredChannels = results
        .filter(
          (result: any) =>
            result?.success &&
            (result.channel !== 'whatsapp' || result.delivery_confirmed === true)
        )
        .map((result: any) => String(result?.channel || '').trim())
        .filter(Boolean)
      const submittedChannels = results
        .filter(
          (result: any) =>
            result?.success &&
            result.channel === 'whatsapp' &&
            result.delivery_confirmed !== true
        )
        .map((result: any) => String(result?.channel || '').trim())
        .filter(Boolean)
      const failedChannels = results
        .filter((result: any) => result && result.success === false)
        .map((result: any) => `${result.channel}: ${result.message}`)

      if (failedChannels.length || submittedChannels.length) {
        const parts = [
          deliveredChannels.length ? `Sent by ${deliveredChannels.join(' and ')}` : '',
          submittedChannels.length
            ? `WhatsApp submitted, delivery not confirmed`
            : '',
          failedChannels.length ? `Failed: ${failedChannels.join(' | ')}` : '',
        ].filter(Boolean)
        toast.warning(
          parts.join('. ')
        )
      } else {
        toast.success(
          deliveredChannels.length
            ? `Menu link sent by ${deliveredChannels.join(' and ')}`
            : response?.data?.message || 'Menu link sent'
        )
        setShareOpen(false)
      }
    } catch (error: any) {
      const results = Array.isArray(error?.response?.data?.results)
        ? error.response.data.results
        : []
      const detail = results
        .filter((result: any) => result && result.success === false)
        .map((result: any) => `${result.channel}: ${result.message}`)
        .join(' | ')
      toast.error(
        detail ||
          error?.response?.data?.message ||
          'Could not send the menu link. Check WhatsApp and email setup.'
      )
    } finally {
      setSendingShare(false)
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

      {lowStockItems.length ? (
        <Card className='rounded-[28px] border border-rose-200 bg-rose-50 py-0 shadow-sm'>
          <CardContent className='flex flex-col gap-4 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between'>
            <div className='min-w-0'>
              <div className='flex items-center gap-3'>
                <span className='inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-100 text-rose-700'>
                  <AlertCircle className='h-5 w-5' />
                </span>
                <div>
                  <p className='text-lg font-black text-slate-950'>
                    Low material stock
                  </p>
                  <p className='text-sm font-semibold text-slate-600'>
                    {lowStockItems.length} material needs manager attention.
                  </p>
                </div>
              </div>
              <div className='mt-3 flex flex-wrap gap-2'>
                {lowStockItems.slice(0, 5).map((item) => (
                  <span
                    key={item._id}
                    className='rounded-full bg-white px-3 py-1 text-xs font-black text-rose-700 shadow-sm'
                  >
                    {item.name || 'Material'}: {Number(item.stock || 0)}{' '}
                    {String(item.unit || '').toUpperCase()}
                  </span>
                ))}
              </div>
            </div>
            <Button asChild className='h-11 rounded-2xl bg-slate-950 px-5 text-white hover:bg-black'>
              <Link to='/food/inventory'>Open Inventory Alerts</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

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
        <DialogContent className='max-h-[92vh] max-w-xl overflow-hidden rounded-[24px] border-0 p-0 shadow-2xl'>
          <div className='border-b border-slate-100 bg-white px-5 py-4 sm:px-6'>
            <DialogHeader className='text-left'>
              <DialogTitle className='text-xl font-black tracking-tight text-slate-900 sm:text-2xl'>
                Send Menu Link
              </DialogTitle>
              <DialogDescription className='mt-1 text-sm leading-6 text-slate-500'>
                Enter customer details and send the menu link by WhatsApp or email.
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className='max-h-[calc(92vh-92px)] overflow-y-auto bg-slate-50 px-5 py-5 sm:px-6'>
            <div className='space-y-4'>
              <div className='rounded-2xl border border-slate-200 bg-white p-4 shadow-sm'>
                <p className='text-xs font-black uppercase tracking-[0.18em] text-slate-400'>
                  Customer Details
                </p>
                <div className='mt-4 grid gap-4'>
                  <div className='space-y-2'>
                    <label className='text-xs font-black uppercase tracking-[0.14em] text-slate-500'>
                      Customer Name
                    </label>
                    <Input
                      className='h-11 rounded-xl bg-slate-50 font-semibold'
                      placeholder='Example: Rahul Sharma'
                      value={shareForm.name}
                      onChange={(event) =>
                        setShareForm((current) => ({ ...current, name: event.target.value }))
                      }
                    />
                  </div>
                  <div className='grid gap-4 sm:grid-cols-2'>
                    <div className='space-y-2'>
                      <label className='text-xs font-black uppercase tracking-[0.14em] text-slate-500'>
                        WhatsApp Number
                      </label>
                      <Input
                        className='h-11 rounded-xl bg-slate-50 font-semibold'
                        placeholder='9876543210'
                        value={shareForm.whatsapp}
                        onChange={(event) =>
                          setShareForm((current) => ({
                            ...current,
                            whatsapp: event.target.value.replace(/[^\d+]/g, ''),
                          }))
                        }
                      />
                    </div>
                    <div className='space-y-2'>
                      <label className='text-xs font-black uppercase tracking-[0.14em] text-slate-500'>
                        Email
                      </label>
                      <Input
                        className='h-11 rounded-xl bg-slate-50 font-semibold'
                        placeholder='customer@example.com'
                        value={shareForm.email}
                        onChange={(event) =>
                          setShareForm((current) => ({ ...current, email: event.target.value }))
                        }
                      />
                    </div>
                  </div>
                  <div className='space-y-2'>
                    <label className='text-xs font-black uppercase tracking-[0.14em] text-slate-500'>
                      Link to Send
                    </label>
                    <Select
                      value={shareForm.linkType}
                      onValueChange={(value) =>
                        setShareForm((current) => ({
                          ...current,
                          linkType: value as ShareForm['linkType'],
                        }))
                      }
                    >
                      <SelectTrigger className='h-11 rounded-xl bg-slate-50 font-semibold'>
                        <SelectValue placeholder='Choose link' />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='menu'>Full menu</SelectItem>
                        <SelectItem value='offers'>Offers and combos</SelectItem>
                        <SelectItem value='items'>Menu items</SelectItem>
                        <SelectItem value='custom'>Custom link</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {shareForm.linkType === 'custom' ? (
                    <div className='space-y-2'>
                      <label className='text-xs font-black uppercase tracking-[0.14em] text-slate-500'>
                        Custom Link
                      </label>
                      <Input
                        className='h-11 rounded-xl bg-slate-50 font-semibold'
                        placeholder='https://...'
                        value={shareForm.customLink}
                        onChange={(event) =>
                          setShareForm((current) => ({
                            ...current,
                            customLink: event.target.value,
                          }))
                        }
                      />
                    </div>
                  ) : null}
                </div>
              </div>

              <div className='rounded-2xl border border-emerald-200 bg-emerald-50 p-4'>
                <div className='flex items-center justify-between gap-3'>
                  <p className='text-xs font-black uppercase tracking-[0.18em] text-emerald-700'>
                    Message Preview
                  </p>
                  <Badge className='rounded-full bg-white px-3 py-1 text-[10px] font-black text-emerald-700 shadow-none'>
                    {shareLinkLabels[shareForm.linkType]}
                  </Badge>
                </div>
                <div className='mt-3 whitespace-pre-line rounded-2xl bg-white p-4 text-sm font-semibold leading-6 text-slate-700 shadow-sm'>
                  {sharePreviewMessage}
                </div>
                <p className='mt-3 text-xs font-semibold leading-5 text-emerald-700'>
                  The real clickable menu link is only included inside the WhatsApp or email message sent to the customer.
                </p>
              </div>

              <div className='sticky bottom-0 -mx-5 border-t border-slate-200 bg-slate-50/95 px-5 py-4 backdrop-blur sm:-mx-6 sm:px-6'>
                <div className='grid gap-3 sm:grid-cols-[1fr_auto]'>
                  <Button
                    className='h-11 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700'
                    onClick={sendMenuLink}
                    disabled={sendingShare}
                  >
                    {sendingShare ? (
                      <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                    ) : (
                      <Send className='mr-2 h-4 w-4' />
                    )}
                    Send Link
                  </Button>
                  <Button
                    variant='outline'
                    className='h-11 rounded-xl bg-white'
                    onClick={copyShareMessage}
                    disabled={sendingShare}
                  >
                    <Copy className='mr-2 h-4 w-4' />
                    Copy Message
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Main>
  )
}
