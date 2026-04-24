import { useLocation, useNavigate } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  Boxes,
  CheckCircle2,
  ClipboardList,
  Home,
  LayoutDashboard,
  Loader2,
  Menu,
  PackageCheck,
  PackageOpen,
  RefreshCcw,
  Search,
  Settings,
  ShoppingCart,
  Truck,
  Warehouse,
} from 'lucide-react'
import { type ReactNode } from 'react'
import { useSelector } from 'react-redux'
import delhiveryLogo from '@/assets/toolkit-apps/delhivery.png'
import shadowfaxLogo from '@/assets/toolkit-apps/shadowfax.svg'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  fetchExternalDelhiveryShipments,
  loadCourierOrders,
  type ExternalDelhiveryShipment,
} from '@/features/courier/api'
import {
  hasAnyActiveCourierAssignment,
  type CourierOrderSummary,
} from '@/features/courier/data'
import { useVendorIntegrations } from '@/context/vendor-integrations-provider'
import { formatINR } from '@/lib/currency'
import type { RootState } from '@/store'

type DeliveryView = 'dashboard' | 'orders'

const readText = (value: unknown) => String(value ?? '').trim()

const formatDateTime = (value?: string) =>
  value ? new Date(value).toLocaleString('en-IN') : 'Not available'

const getOrderSearchText = (order: CourierOrderSummary) =>
  [
    order.orderNumber,
    order.customerName,
    order.customerPhone,
    order.customerEmail,
    order.city,
    order.state,
    order.pincode,
    order.status,
    order.websiteLabel,
    order.delhivery?.waybill,
    order.delhivery?.waybills?.[0],
    order.shadowfax?.tracking_number,
    order.shadowfax?.order_id,
  ]
    .map((value) => readText(value).toLowerCase())
    .filter(Boolean)
    .join(' ')

const getDelhiveryCode = (order: CourierOrderSummary) =>
  readText(order.delhivery?.waybill) ||
  readText(order.delhivery?.waybills?.[0]) ||
  readText(order.externalDeliveryId)

const getShadowfaxCode = (order: CourierOrderSummary) =>
  readText(order.shadowfax?.tracking_number) || readText(order.shadowfax?.order_id)

const getShadowfaxLabel = (order: CourierOrderSummary) => {
  const model = readText(order.shadowfax?.order_model).toLowerCase()
  if (model === 'warehouse') return 'Shadowfax Warehouse'
  if (model === 'marketplace') return 'Shadowfax Marketplace'
  return 'Shadowfax'
}

const getTrackingCode = (order: CourierOrderSummary) =>
  getShadowfaxCode(order) || getDelhiveryCode(order)

const getShipmentStatus = (order: CourierOrderSummary) =>
  readText(order.shadowfax?.status) ||
  readText(order.delhivery?.status) ||
  readText(order.status) ||
  'pending'

const FALLBACK_IMAGE =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
      <rect width="96" height="96" fill="#f1f5f9"/>
      <rect x="14" y="14" width="68" height="68" fill="#e2e8f0" stroke="#cbd5e1" stroke-width="2"/>
      <path d="M26 62l14-17 10 11 8-10 12 12" fill="none" stroke="#94a3b8" stroke-width="3"/>
      <circle cx="35" cy="35" r="5" fill="#94a3b8"/>
    </svg>`
  )

const isAbsoluteUrl = (value: string) => /^https?:\/\//i.test(value)

const resolveItemImage = (value?: string) => {
  const text = readText(value)
  if (!text) return FALLBACK_IMAGE
  if (text.startsWith('data:') || text.startsWith('blob:')) return text
  if (text.startsWith('//')) return `https:${text}`
  if (isAbsoluteUrl(text)) return text
  if (text.startsWith('/')) return text
  return `/${text}`
}

const getCourierStatusText = (order: CourierOrderSummary) =>
  `${readText(order.status)} ${readText(order.delhivery?.status)} ${readText(
    order.delhivery?.status_description
  )} ${readText(order.shadowfax?.status)} ${readText(order.shadowfax?.status_description)}`.toLowerCase()

const isPendingPickup = (order: CourierOrderSummary) => {
  const status = readText(order.status).toLowerCase()
  const courierStatus = getCourierStatusText(order)
  if (getTrackingCode(order)) return false
  return (
    !status ||
    ['pending', 'placed', 'confirmed', 'processing', 'new'].some((entry) =>
      status.includes(entry)
    ) ||
    courierStatus.includes('manifest')
  )
}

const isInTransit = (order: CourierOrderSummary) => {
  const status = getCourierStatusText(order)
  return ['ship', 'transit', 'dispatch', 'out for delivery', 'picked'].some((entry) =>
    status.includes(entry)
  )
}

const isAtDestinationHub = (order: CourierOrderSummary) => {
  const status = getCourierStatusText(order)
  return ['destination', 'hub', 'reached facility'].some((entry) =>
    status.includes(entry)
  )
}

const isDelivered = (order: CourierOrderSummary) => {
  const status = getCourierStatusText(order)
  return status.includes('delivered') || status.includes('completed')
}

function PackageArtwork() {
  return (
    <div className='relative hidden min-h-[210px] flex-1 items-center justify-center lg:flex'>
      <div className='absolute h-36 w-56 translate-x-10 translate-y-8 rounded-[6px] bg-gradient-to-br from-orange-200 via-amber-300 to-orange-400 shadow-[0_20px_55px_rgba(180,99,28,0.28)]' />
      <div className='absolute h-16 w-16 translate-x-28 translate-y-4 border-4 border-orange-700/45 bg-orange-100/20'>
        <ArrowRight className='absolute bottom-1 left-2 h-9 w-9 rotate-[-90deg] text-orange-800/70' />
      </div>
      <div className='absolute h-28 w-28 -translate-x-20 -translate-y-12 rounded-[6px] bg-gradient-to-b from-sky-300 to-blue-500 p-4 shadow-xl'>
        <div className='mb-3 flex items-center gap-2'>
          <CheckCircle2 className='h-4 w-4 text-white' />
          <div className='h-3 flex-1 rounded-sm bg-white' />
        </div>
        <div className='mb-3 flex items-center gap-2'>
          <CheckCircle2 className='h-4 w-4 text-white' />
          <div className='h-3 flex-1 rounded-sm bg-white' />
        </div>
        <div className='flex items-center gap-2'>
          <span className='h-4 w-4 rounded-sm bg-white' />
          <div className='h-3 flex-1 rounded-sm bg-white' />
        </div>
      </div>
      <div className='absolute h-3 w-12 translate-x-2 translate-y-20 rounded-full bg-orange-900/40' />
      <div className='absolute h-3 w-12 translate-x-2 translate-y-36 rounded-full bg-orange-900/40' />
    </div>
  )
}

function RailButton({
  active,
  collapsed = true,
  icon: Icon,
  label,
  onClick,
}: {
  active?: boolean
  collapsed?: boolean
  icon: typeof LayoutDashboard
  label: string
  onClick: () => void
}) {
  return (
    <button
      type='button'
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`flex h-14 items-center rounded-lg transition ${
        collapsed ? 'w-14 justify-center' : 'w-full justify-start gap-3 px-4'
      } ${
        active
          ? 'bg-teal-600 text-white shadow-lg shadow-teal-600/20'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
      }`}
    >
      <Icon className='h-6 w-6' />
      {!collapsed ? <span className='truncate text-sm font-semibold'>{label}</span> : null}
    </button>
  )
}

function RailImageButton({
  active,
  collapsed = true,
  imageSrc,
  label,
  onClick,
}: {
  active?: boolean
  collapsed?: boolean
  imageSrc: string
  label: string
  onClick: () => void
}) {
  return (
    <button
      type='button'
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`flex h-14 items-center rounded-lg transition ${
        collapsed ? 'w-14 justify-center' : 'w-full justify-start gap-3 px-4'
      } ${
        active
          ? 'bg-teal-600 text-white shadow-lg shadow-teal-600/20'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
      }`}
    >
      <span className='flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded bg-white p-0.5'>
        <img src={imageSrc} alt='' className='h-full w-full object-contain' />
      </span>
      {!collapsed ? <span className='truncate text-sm font-semibold'>{label}</span> : null}
    </button>
  )
}

function StatTile({
  label,
  value,
  className = '',
  valueClassName = '',
}: {
  label: string
  value: number | string
  className?: string
  valueClassName?: string
}) {
  return (
    <div
      className={`flex min-h-[168px] flex-col justify-between rounded-[6px] border border-slate-200 bg-white p-5 ${className}`}
    >
      <p className='text-sm font-semibold leading-snug uppercase tracking-[0.16em] text-slate-500'>
        {label}
      </p>
      <p className={`mt-6 text-4xl leading-none font-bold text-slate-950 ${valueClassName}`}>
        {value}
      </p>
    </div>
  )
}

function QuickAction({
  icon: Icon,
  title,
  subtitle,
  onClick,
}: {
  icon: typeof Truck
  title: string
  subtitle: string
  onClick: () => void
}) {
  return (
    <button
      type='button'
      onClick={onClick}
      className='flex w-full items-center gap-4 rounded-[6px] p-3 text-left transition hover:bg-slate-50'
    >
      <span className='flex h-12 w-12 items-center justify-center rounded-[6px] border border-slate-200 bg-slate-50'>
        <Icon className='h-5 w-5 text-teal-700' />
      </span>
      <span className='min-w-0 flex-1'>
        <span className='block text-base font-bold text-slate-950'>{title}</span>
        <span className='block truncate text-sm text-slate-500'>{subtitle}</span>
      </span>
      <span className='flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-slate-600'>
        <ArrowRight className='h-5 w-5' />
      </span>
    </button>
  )
}

export function DeliveryWorkspaceShell({
  children,
  activeSection,
  searchValue = '',
  onSearchChange,
  onSearchFocus,
}: {
  children: ReactNode
  activeSection?: 'dashboard' | 'orders' | 'courier-list' | 'apps' | 'delhivery' | 'shadowfax' | 'warehouses' | 'tracking'
  searchValue?: string
  onSearchChange?: (value: string) => void
  onSearchFocus?: () => void
}) {
  const navigate = useNavigate()
  const [internalSearch, setInternalSearch] = useState(searchValue)
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return true
    return window.localStorage.getItem('delivery-sidebar-collapsed') !== 'false'
  })

  const setSidebarCollapsed = (value: boolean) => {
    setCollapsed(value)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('delivery-sidebar-collapsed', String(value))
    }
  }

  const openPath = (path: string) => {
    void navigate({ to: path })
  }

  const handleSearchChange = (value: string) => {
    if (onSearchChange) {
      onSearchChange(value)
      return
    }
    setInternalSearch(value)
  }

  const openSearchResults = () => {
    const value = onSearchChange ? searchValue : internalSearch
    const params = new URLSearchParams()
    params.set('view', 'orders')
    if (value.trim()) {
      params.set('q', value.trim())
    }
    void navigate({ to: `/delivery-system?${params.toString()}` })
  }

  return (
    <div className='min-h-svh bg-[#f4f8fb] text-slate-950'>
      <header className='sticky top-0 z-30 border-b border-slate-200 bg-white shadow-sm'>
        <div className='flex min-h-[88px] items-center gap-5 px-5 lg:px-7'>
          <button
            type='button'
            aria-label={collapsed ? 'Expand delivery sidebar' : 'Collapse delivery sidebar'}
            className='flex h-11 w-11 items-center justify-center rounded-[6px] text-slate-800 hover:bg-slate-100'
            onClick={() => setSidebarCollapsed(!collapsed)}
          >
            <Menu className='h-7 w-7' />
          </button>
          <button
            type='button'
            onClick={() => openPath('/delivery-system')}
            className={`flex items-center gap-2 text-left ${collapsed ? 'min-w-[220px]' : 'min-w-[248px]'}`}
          >
            <span className='flex h-11 w-11 items-center justify-center rounded-[6px] bg-gradient-to-br from-lime-400 to-teal-600 text-white'>
              <Truck className='h-6 w-6' />
            </span>
            <span>
              <span className='block text-lg font-black uppercase tracking-tight text-teal-700'>
                SellersLogin
              </span>
              <span className='block text-xs font-semibold uppercase tracking-[0.18em] text-lime-600'>
                Delivery System
              </span>
            </span>
          </button>
          <div className='relative hidden flex-1 lg:block'>
            <Search className='pointer-events-none absolute top-1/2 left-5 h-5 w-5 -translate-y-1/2 text-slate-400' />
            <input
              value={onSearchChange ? searchValue : internalSearch}
              onChange={(event) => handleSearchChange(event.target.value)}
              onFocus={onSearchFocus}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !onSearchChange) {
                  openSearchResults()
                }
              }}
              placeholder='Search AWB or Order ID'
              className='h-14 w-full rounded-[6px] border border-slate-200 bg-slate-100 px-14 text-base outline-none focus:border-teal-500 focus:bg-white'
            />
          </div>
          <div className='ml-auto flex items-center gap-2'>
            <button
              type='button'
              onClick={() => window.location.reload()}
              className='flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200'
              aria-label='Refresh'
            >
              <RefreshCcw className='h-5 w-5' />
            </button>
          </div>
        </div>
      </header>

      <div className='flex'>
        <aside
          className={`sticky top-[89px] hidden h-[calc(100svh-89px)] shrink-0 border-r border-slate-200 bg-white transition-[width] duration-200 md:block ${
            collapsed ? 'w-[88px]' : 'w-[264px]'
          }`}
        >
          <div className={`flex h-full flex-col gap-5 py-5 ${collapsed ? 'items-center px-0' : 'px-4'}`}>
            <RailButton
              collapsed={collapsed}
              active={activeSection === 'dashboard'}
              icon={LayoutDashboard}
              label='Delivery Dashboard'
              onClick={() => openPath('/delivery-system')}
            />
            <RailButton
              collapsed={collapsed}
              active={activeSection === 'orders'}
              icon={ShoppingCart}
              label='Orders'
              onClick={() => openPath('/delivery-system?view=orders')}
            />
            <RailButton
              collapsed={collapsed}
              active={activeSection === 'apps'}
              icon={Truck}
              label='Check Price'
              onClick={() => openPath('/courier')}
            />
            <RailImageButton
              collapsed={collapsed}
              active={activeSection === 'delhivery'}
              imageSrc={delhiveryLogo}
              label='Delhivery'
              onClick={() => openPath('/courier/delhivery')}
            />
            <RailImageButton
              collapsed={collapsed}
              active={activeSection === 'shadowfax'}
              imageSrc={shadowfaxLogo}
              label='Shadowfax'
              onClick={() => openPath('/courier/shadowfax')}
            />
            <RailButton
              collapsed={collapsed}
              active={activeSection === 'warehouses'}
              icon={Warehouse}
              label='Warehouses'
              onClick={() => openPath('/courier/warehouses')}
            />
            <RailButton
              collapsed={collapsed}
              active={activeSection === 'tracking'}
              icon={ClipboardList}
              label='Tracking'
              onClick={() => openPath('/courier/tracking')}
            />
            <div className='mt-auto w-full'>
              <RailButton
                collapsed={collapsed}
                icon={Home}
                label='Main Dashboard'
                onClick={() => openPath('/')}
              />
            </div>
          </div>
        </aside>

        <main className='min-w-0 flex-1 px-4 py-4 md:px-5 lg:px-7'>{children}</main>
      </div>
    </div>
  )
}

export function DeliverySystemDashboard() {
  const navigate = useNavigate()
  const searchStr = useLocation({ select: (location) => location.searchStr })
  const role = String(
    useSelector((state: RootState) => state.auth?.user?.role || '')
  ).toLowerCase()
  const user = useSelector((state: RootState) => state.auth?.user)
  const token = useSelector((state: RootState) => state.auth?.token)
  const isVendor = role === 'vendor'
  const { data: integrationData } = useVendorIntegrations()
  const [activeView, setActiveView] = useState<DeliveryView>('dashboard')
  const [orders, setOrders] = useState<CourierOrderSummary[]>([])
  const [externalShipments, setExternalShipments] = useState<ExternalDelhiveryShipment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const [selectedOrder, setSelectedOrder] = useState<CourierOrderSummary | null>(null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      if (!token || !user) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError('')
        const [ordersResult, externalResult] = await Promise.allSettled([
          loadCourierOrders(isVendor),
          isVendor
            ? fetchExternalDelhiveryShipments()
            : Promise.resolve({ shipments: [] as ExternalDelhiveryShipment[] }),
        ])

        if (cancelled) return

        if (ordersResult.status === 'fulfilled') {
          setOrders(ordersResult.value)
        } else {
          setOrders([])
          setError(
            ordersResult.reason?.response?.data?.message ||
              ordersResult.reason?.message ||
              'Failed to load orders'
          )
        }

        if (externalResult.status === 'fulfilled') {
          setExternalShipments(
            Array.isArray(externalResult.value?.shipments)
              ? externalResult.value.shipments
              : []
          )
        } else {
          setExternalShipments([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [isVendor, refreshKey, token, user])

  useEffect(() => {
    const params = new URLSearchParams(searchStr)
    const view = params.get('view')
    const search = params.get('q')
    setActiveView(view === 'orders' ? 'orders' : 'dashboard')
    setQuery(search || '')
  }, [searchStr])

  const filteredOrders = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return orders
    return orders.filter((order) => getOrderSearchText(order).includes(term))
  }, [orders, query])

  const stats = useMemo(
    () => ({
      totalOrders: orders.length,
      pendingPickup: orders.filter(isPendingPickup).length,
      inTransit: orders.filter(isInTransit).length,
      destinationHub: orders.filter(isAtDestinationHub).length,
      delivered: orders.filter(isDelivered).length,
      activeShipments:
        orders.filter(hasAnyActiveCourierAssignment).length + externalShipments.length,
      revenue: orders.reduce((sum, order) => sum + Number(order.total || 0), 0),
    }),
    [externalShipments.length, orders]
  )

  const delhiveryConnected = Boolean(
    integrationData?.providers?.delhivery?.connected ||
      integrationData?.providers?.delhivery?.enabled
  )

  const openPath = (path: string) => {
    void navigate({ to: path })
  }

  const openPriceCheckForOrder = (order: CourierOrderSummary) => {
    const params = new URLSearchParams()
    const origin = readText(user?.pincode || user?.pin || user?.postal_code || user?.zip)
    params.set('orderId', order.id)
    if (origin) params.set('origin', origin)
    if (order.pincode) params.set('destination', order.pincode)
    openPath(`/courier?${params.toString()}`)
  }

  return (
    <DeliveryWorkspaceShell
      activeSection={activeView === 'orders' ? 'orders' : 'dashboard'}
      searchValue={query}
      onSearchChange={setQuery}
      onSearchFocus={() => setActiveView('orders')}
    >
          {error ? (
            <div className='mb-4 rounded-[6px] border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700'>
              {error}
            </div>
          ) : null}

          {activeView === 'dashboard' ? (
            <div className='space-y-5'>
              <section className='overflow-hidden rounded-[26px] bg-gradient-to-r from-blue-500 via-sky-200 to-yellow-200 px-8 py-9 shadow-sm lg:px-12 lg:py-10'>
                <div className='flex flex-col gap-8 lg:flex-row lg:items-center'>
                  <div className='min-w-0 flex-[1.6]'>
                    <h1 className='max-w-4xl text-3xl font-black leading-tight text-white md:text-5xl'>
                      Congratulations! Your delivery workspace is ready.
                    </h1>
                    <p className='mt-6 text-xl font-bold text-slate-900'>
                      Start with creating and shipping your first order
                    </p>
                    <div className='mt-8 flex flex-wrap items-center gap-6'>
                      <button
                        type='button'
                        onClick={() => openPath('/courier')}
                        className='flex h-16 items-center gap-5 rounded-[8px] bg-white px-9 text-lg font-bold text-slate-900 shadow-sm hover:bg-slate-50'
                      >
                        Check price for delivery
                        <ArrowRight className='h-7 w-7' />
                      </button>
                    </div>
                  </div>
                  <PackageArtwork />
                </div>
              </section>

              <div className='grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.8fr)]'>
                <section className='rounded-[26px] border border-slate-200 bg-white p-6 shadow-sm'>
                  <div className='grid gap-4 md:grid-cols-2 2xl:grid-cols-3'>
                    <StatTile label='Total Orders' value={loading ? '...' : stats.totalOrders} />
                    <StatTile label='Pending Pickup' value={stats.pendingPickup} />
                    <StatTile label='In-Transit' value={stats.inTransit} />
                    <StatTile label='At Destination Hub' value={stats.destinationHub} />
                    <StatTile label='Delivered' value={stats.delivered} />
                    <StatTile label='Active Shipments' value={stats.activeShipments} />
                    <StatTile
                      label='Order Value'
                      value={formatINR(stats.revenue)}
                      valueClassName='text-[2.6rem] md:text-4xl'
                      className='md:col-span-2 2xl:col-span-1'
                    />
                  </div>
                </section>

                <section className='rounded-[26px] border border-slate-200 bg-white p-6 shadow-sm'>
                  <h2 className='text-2xl font-black text-slate-950'>Quick Actions</h2>
                  <div className='mt-5 space-y-3'>
                    <QuickAction
                      icon={Truck}
                      title='Create orders'
                      subtitle='Create Delhivery or Shadowfax shipment from dashboard orders'
                      onClick={() => openPath('/courier/delhivery')}
                    />
                    <QuickAction
                      icon={ClipboardList}
                      title='Orders'
                      subtitle='View all SellersLogin and website orders'
                      onClick={() => setActiveView('orders')}
                    />
                    <QuickAction
                      icon={Warehouse}
                      title='Warehouse'
                      subtitle='Create and manage Delhivery pickup locations'
                      onClick={() => openPath('/courier/warehouses')}
                    />
                    <QuickAction
                      icon={Settings}
                      title='Delhivery setup'
                      subtitle={delhiveryConnected ? 'Connected and ready' : 'Connect API token and defaults'}
                      onClick={() => openPath('/integrations/delhivery')}
                    />
                  </div>
                </section>
              </div>

            </div>
          ) : (
            <section className='rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm'>
              <div className='flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-center lg:justify-between'>
                <div>
                  <h1 className='text-3xl font-black text-slate-950'>Orders</h1>
                  <p className='mt-1 text-sm text-slate-500'>
                    Showing all SellersLogin and website orders from your dashboard.
                  </p>
                </div>
                <div className='flex flex-wrap items-center gap-3'>
                  <div className='relative min-w-[280px] flex-1 lg:w-[420px]'>
                    <Search className='pointer-events-none absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-slate-400' />
                    <input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder='Search order, customer, phone, city'
                      className='h-12 w-full rounded-[6px] border border-slate-200 bg-slate-50 px-12 outline-none focus:border-teal-500 focus:bg-white'
                    />
                  </div>
                  <Button
                    variant='outline'
                    className='h-12 rounded-[6px]'
                    onClick={() => setRefreshKey((current) => current + 1)}
                  >
                    <RefreshCcw className='h-4 w-4' />
                    Refresh
                  </Button>
                </div>
              </div>

              {loading ? (
                <div className='flex h-64 items-center justify-center text-slate-500'>
                  <Loader2 className='mr-2 h-5 w-5 animate-spin' />
                  Loading orders...
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className='flex h-64 flex-col items-center justify-center rounded-[8px] border border-dashed border-slate-300 bg-slate-50 text-center'>
                  <PackageOpen className='h-10 w-10 text-slate-400' />
                  <p className='mt-3 text-sm font-semibold text-slate-600'>No orders found</p>
                </div>
              ) : (
                <div className='mt-5 overflow-x-auto'>
                  <table className='w-full min-w-[1040px] border-collapse text-left'>
                    <thead>
                      <tr className='border-b border-slate-200 bg-slate-50 text-xs font-black uppercase tracking-[0.12em] text-slate-500'>
                        <th className='px-4 py-4'>Order</th>
                        <th className='px-4 py-4'>Customer</th>
                        <th className='px-4 py-4'>Destination</th>
                        <th className='px-4 py-4'>Items</th>
                        <th className='px-4 py-4'>Amount</th>
                        <th className='px-4 py-4'>Status</th>
                        <th className='px-4 py-4'>AWB</th>
                        <th className='px-4 py-4 text-right'>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOrders.map((order) => {
                        const awb = getTrackingCode(order)
                        const hasShadowfax = Boolean(getShadowfaxCode(order))
                        const hasDelhivery = Boolean(getDelhiveryCode(order))
                        const hasActiveShipment = hasAnyActiveCourierAssignment(order)
                        return (
                          <tr
                            key={`${order.source}-${order.id}`}
                            className='cursor-pointer border-b border-slate-100 align-top hover:bg-slate-50'
                            onClick={() => setSelectedOrder(order)}
                          >
                            <td className='px-4 py-4'>
                              <p className='font-bold text-slate-950'>{order.orderNumber}</p>
                              <p className='mt-1 text-xs text-slate-500'>
                                {order.source === 'template-orders'
                                  ? 'Website order'
                                  : 'SellersLogin order'}{' '}
                                | {formatDateTime(order.createdAt)}
                              </p>
                            </td>
                            <td className='px-4 py-4'>
                              <p className='font-semibold text-slate-800'>
                                {order.customerName || 'Customer'}
                              </p>
                              <p className='mt-1 text-xs text-slate-500'>
                                {order.customerPhone || order.customerEmail || 'No contact'}
                              </p>
                            </td>
                            <td className='max-w-[240px] px-4 py-4'>
                              <p className='line-clamp-2 text-sm text-slate-600'>
                                {order.address ||
                                  [order.city, order.state, order.pincode].filter(Boolean).join(', ') ||
                                  'Not available'}
                              </p>
                            </td>
                            <td className='px-4 py-4'>
                              <span className='inline-flex items-center gap-2 text-sm font-semibold text-slate-700'>
                                <Boxes className='h-4 w-4 text-teal-700' />
                                {order.itemsCount || order.items.length || 0}
                              </span>
                            </td>
                            <td className='px-4 py-4 font-bold text-slate-950'>
                              {formatINR(order.total)}
                            </td>
                            <td className='px-4 py-4'>
                              <span className='inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-bold capitalize text-slate-700'>
                                {getShipmentStatus(order)}
                              </span>
                            </td>
                            <td className='px-4 py-4'>
                              <div className='space-y-1'>
                                <span className='text-sm font-semibold text-slate-700'>
                                  {awb || 'Not created'}
                                </span>
                                {hasShadowfax ? (
                                  <p className='text-[11px] font-semibold uppercase tracking-[0.12em] text-orange-600'>
                                    {getShadowfaxLabel(order)}
                                  </p>
                                ) : hasDelhivery ? (
                                  <p className='text-[11px] font-semibold uppercase tracking-[0.12em] text-sky-600'>
                                    Delhivery
                                  </p>
                                ) : null}
                              </div>
                            </td>
                            <td className='px-4 py-4 text-right'>
                              <div className='flex justify-end gap-2' onClick={(event) => event.stopPropagation()}>
                                {hasDelhivery ? (
                                  <Button
                                    variant='outline'
                                    className='rounded-[6px]'
                                    onClick={() =>
                                      openPath(
                                        `/courier/tracking?kind=order&orderId=${order.id}&source=${order.source}&tracking=${encodeURIComponent(
                                          awb
                                        )}`
                                      )
                                    }
                                  >
                                    Track
                                  </Button>
                                ) : null}
                                {!hasActiveShipment ? (
                                  <Button
                                    className='rounded-[6px] bg-teal-700 text-white hover:bg-teal-800'
                                    onClick={() => openPriceCheckForOrder(order)}
                                  >
                                    Check price for delivery
                                    <PackageCheck className='h-4 w-4' />
                                  </Button>
                                ) : hasDelhivery ? (
                                  <Button
                                    className='rounded-[6px] bg-teal-700 text-white hover:bg-teal-800'
                                    onClick={() => openPriceCheckForOrder(order)}
                                  >
                                    Check price
                                    <PackageCheck className='h-4 w-4' />
                                  </Button>
                                ) : hasShadowfax ? (
                                  <Button
                                    variant='outline'
                                    className='rounded-[6px] border-orange-200 text-orange-700 hover:bg-orange-50'
                                    onClick={() => openPath('/courier/shadowfax')}
                                  >
                                    View
                                  </Button>
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}
          <Dialog
            open={Boolean(selectedOrder)}
            onOpenChange={(open) => {
              if (!open) setSelectedOrder(null)
            }}
          >
            <DialogContent className='max-h-[88vh] max-w-5xl overflow-y-auto rounded-none'>
              {selectedOrder ? (
                <div className='space-y-5'>
                  <DialogHeader>
                    <DialogTitle className='text-2xl'>{selectedOrder.orderNumber}</DialogTitle>
                    <DialogDescription>
                      {selectedOrder.customerName || 'Customer'} | {selectedOrder.pincode || 'No pincode'} | {formatINR(selectedOrder.total)}
                    </DialogDescription>
                  </DialogHeader>

                  <div className='grid gap-4 md:grid-cols-2'>
                    <div className='rounded-none border p-4'>
                      <p className='font-semibold text-slate-950'>Customer</p>
                      <div className='mt-3 space-y-2 text-sm text-slate-600'>
                        <p>Name: {selectedOrder.customerName || 'Not available'}</p>
                        <p>Phone: {selectedOrder.customerPhone || 'Not available'}</p>
                        <p>Email: {selectedOrder.customerEmail || 'Not available'}</p>
                        <p>Status: {selectedOrder.status || 'Not available'}</p>
                      </div>
                    </div>
                    <div className='rounded-none border p-4'>
                      <p className='font-semibold text-slate-950'>Delivery</p>
                      <div className='mt-3 space-y-2 text-sm text-slate-600'>
                        <p>Address: {selectedOrder.address || 'Not available'}</p>
                        <p>City: {selectedOrder.city || 'Not available'}</p>
                        <p>State: {selectedOrder.state || 'Not available'}</p>
                        <p>Pincode: {selectedOrder.pincode || 'Not available'}</p>
                      </div>
                    </div>
                  </div>

                  <div className='rounded-none border p-4'>
                    <p className='font-semibold text-slate-950'>Order Data</p>
                    <div className='mt-3 grid gap-2 text-sm text-slate-600 md:grid-cols-2'>
                      <p>Source: {selectedOrder.source}</p>
                      <p>Website: {selectedOrder.websiteLabel || 'Not available'}</p>
                      <p>Created: {formatDateTime(selectedOrder.createdAt)}</p>
                      <p>Amount: {formatINR(selectedOrder.total)}</p>
                      <p>AWB: {getTrackingCode(selectedOrder) || 'Not created'}</p>
                      <p>Courier status: {getShipmentStatus(selectedOrder)}</p>
                    </div>
                  </div>

                  <div className='rounded-none border p-4'>
                    <p className='font-semibold text-slate-950'>Products</p>
                    <div className='mt-3 space-y-3'>
                      {selectedOrder.items.map((item, index) => (
                        <div
                          key={`${selectedOrder.id}-${item.productName}-${index}`}
                          className='flex items-start gap-3 rounded-none border bg-slate-50 p-3 text-sm text-slate-600'
                        >
                          <img
                            src={resolveItemImage(item.imageUrl)}
                            alt={item.productName || 'Product'}
                            className='h-16 w-16 rounded-none border bg-white object-cover'
                            onError={(event) => {
                              const target = event.currentTarget
                              if (target.dataset.fallbackApplied) return
                              target.dataset.fallbackApplied = 'true'
                              target.src = FALLBACK_IMAGE
                            }}
                          />
                          <div className='min-w-0 flex-1'>
                            <p className='font-semibold text-slate-950'>{item.productName || 'Product'}</p>
                            <p>Qty {item.quantity} | {formatINR(item.totalPrice || item.unitPrice * item.quantity)}</p>
                            <p>Unit price: {formatINR(item.unitPrice || 0)}</p>
                            {item.variantSummary ? <p>{item.variantSummary}</p> : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
            </DialogContent>
          </Dialog>
    </DeliveryWorkspaceShell>
  )
}
