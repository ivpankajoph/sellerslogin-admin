import { useEffect, useRef, useState } from 'react'
import {
  Link,
  Outlet,
  useLocation,
  useNavigate,
  useRouterState,
  useSearch,
} from '@tanstack/react-router'
import {
  ChevronDown,
  Crown,
  Sparkles,
  Search,
  BarChart3,
  Users,
  ShieldCheck,
  XCircle,
} from 'lucide-react'
import { useSelector } from 'react-redux'
import api from '@/lib/axios'
import { getCookie } from '@/lib/cookies'
import { cn } from '@/lib/utils'
import { LayoutProvider } from '@/context/layout-provider'
import { SearchProvider } from '@/context/search-provider'
import { VendorIntegrationsProvider } from '@/context/vendor-integrations-provider'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { CreatePasswordModal } from '@/components/auth/create-password-modal'
import { ConfigDrawer } from '@/components/config-drawer'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { ROLES, sidebarData } from '@/components/layout/data/sidebar-data'
import { Header } from '@/components/layout/header'
import { NotificationBell } from '@/components/notifications/notification-bell'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { SkipToMain } from '@/components/skip-to-main'
import { ThemeSwitch } from '@/components/theme-switch'
import { UpgradePlanDialog } from '@/features/dashboard/components/UpgradePlanDialog'
import type { BillingSummary } from '@/features/plans/shared'
import {
  canAccessVendorPath,
  getFirstAccessibleVendorRoute,
  normalizeVendorPageAccess,
  resolveVendorPageAccessKey,
} from '@/features/team-access/access-config'
import {
  getStoredActiveWebsiteId,
  setStoredActiveWebsite,
} from '@/features/vendor-template/components/websiteStudioStorage'

type AuthenticatedLayoutProps = {
  children?: React.ReactNode
}

type LoaderViewportRect = {
  height: number
  left: number
  top: number
  width: number
}

type SidebarNavItem = {
  title: string
  url?: string
  roles?: string[]
  items?: SidebarNavItem[]
}

const flattenSidebarItems = (items: SidebarNavItem[]): SidebarNavItem[] =>
  items.flatMap((item) => [
    item,
    ...(item.items ? flattenSidebarItems(item.items) : []),
  ])

const humanizePathSegment = (segment: string) =>
  segment.replace(/[-_]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())

const getSectionTitleFromPath = (pathname: string, role: string) => {
  const normalizedRole = role === 'admin' ? ROLES.ADMIN : ROLES.VENDOR
  const visibleItems = sidebarData.navGroups
    .filter((group) => !group.roles || group.roles.includes(normalizedRole))
    .flatMap((group) => flattenSidebarItems(group.items as SidebarNavItem[]))
    .filter(
      (item) => item.url && (!item.roles || item.roles.includes(normalizedRole))
    )

  const matchedItem = visibleItems
    .filter((item) => {
      const itemUrl = String(item.url || '').trim()
      if (!itemUrl) return false
      return pathname === itemUrl || pathname.startsWith(`${itemUrl}/`)
    })
    .sort((a, b) => String(b.url || '').length - String(a.url || '').length)[0]

  if (matchedItem?.title) return matchedItem.title

  const pathSegments = pathname
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean)

  const fallbackSegment = [...pathSegments]
    .reverse()
    .find((segment) => !segment.startsWith('$'))

  return fallbackSegment ? humanizePathSegment(fallbackSegment) : 'Dashboard'
}

function ContentNavigationLoader({
  rect,
}: {
  rect: LoaderViewportRect | null
}) {
  if (!rect) return null

  return (
    <div
      className='bg-background/55 fixed z-50 flex items-center justify-center backdrop-blur-md'
      style={{
        height: rect.height,
        left: rect.left,
        top: rect.top,
        width: rect.width,
      }}
    >
      <div className='relative flex h-full w-full items-center justify-center'>
        <div className='absolute h-28 w-28 rounded-full bg-white/70 blur-3xl' />
        <img
          src='/images/sellerslogin-logo.svg'
          alt='SellersLogin logo'
          className='relative h-16 w-16 animate-pulse drop-shadow-[0_16px_40px_rgba(109,40,217,0.2)]'
        />
      </div>
    </div>
  )
}

export function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  const defaultOpen = getCookie('sidebar_state') !== 'false'
  const navigate = useNavigate()
  const pathname = useLocation({ select: (location) => location.pathname })
  const searchValues = useSearch({ strict: false }) as any
  const authUser = useSelector((state: any) => state.auth?.user || null)
  const vendorsList = useSelector((state: any) => state.vendors?.vendors || [])
  const vendorProfile = useSelector(
    (state: any) =>
      state.vendorprofile?.profile?.vendor ||
      state.vendorprofile?.profile?.data ||
      state.vendorprofile?.profile ||
      null
  )
  const contentViewportRef = useRef<HTMLDivElement | null>(null)
  const lastLoggedPathRef = useRef('')
  const [loaderRect, setLoaderRect] = useState<LoaderViewportRect | null>(null)
  const isNavigating = useRouterState({
    select: (state) =>
      Boolean(
        state.resolvedLocation &&
          state.status === 'pending' &&
          state.location.href !== state.resolvedLocation.href
      ),
  })
  const isAnalytics = pathname.startsWith('/analytics')
  const isThemeEditor = pathname.startsWith('/vendor-template')
  const isProductEditor = pathname.startsWith('/products/create-products')
  const content = children ?? <Outlet />
  const showNavigationLoader = isNavigating
  const effectiveRole =
    String(authUser?.role || '').toLowerCase() === 'superadmin'
      ? 'admin'
      : String(authUser?.role || '').toLowerCase()
  const isVendor = effectiveRole === 'vendor'
  const isVendorTeamUser =
    isVendor &&
    String(authUser?.account_type || '').toLowerCase() === 'vendor_user'
  const vendorPageAccess = normalizeVendorPageAccess(authUser?.page_access)
  const vendorId = String(
    authUser?.vendor_id || authUser?.id || authUser?._id || ''
  ).trim()
  const canAccessMyWebsites =
    isVendor && (!isVendorTeamUser || vendorPageAccess.has('my_websites'))
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false)
  const [billingSummary, setBillingSummary] = useState<BillingSummary | null>(
    null
  )
  const currentSectionTitle = getSectionTitleFromPath(
    pathname,
    effectiveRole === 'admin' ? ROLES.ADMIN : ROLES.VENDOR
  )

  useEffect(() => {
    if (!isVendorTeamUser) return
    if (pathname === '/profile') return
    if (canAccessVendorPath(pathname, vendorPageAccess)) return

    void navigate({
      to: getFirstAccessibleVendorRoute(vendorPageAccess),
      replace: true,
    })
  }, [isVendorTeamUser, navigate, pathname, vendorPageAccess])

  useEffect(() => {
    if (!isVendorTeamUser || !pathname) return
    if (!canAccessVendorPath(pathname, vendorPageAccess)) return

    const pageKey = resolveVendorPageAccessKey(pathname)
    const websiteId = vendorId ? getStoredActiveWebsiteId(vendorId) : ''
    const logKey = `${pathname}|${pageKey || ''}|${websiteId || ''}`

    if (lastLoggedPathRef.current === logKey) return
    lastLoggedPathRef.current = logKey

    void api.post('/team-users/activity', {
      action: 'page_view',
      path: pathname,
      page_key: pageKey || '',
      website_id: pageKey === 'my_websites' ? websiteId : '',
    })
  }, [isVendorTeamUser, pathname, vendorId, vendorPageAccess])

  useEffect(() => {
    if (!isVendor || !vendorId) return

    const currentWebsiteId = getStoredActiveWebsiteId(vendorId)
    if (currentWebsiteId) return

    const source = vendorProfile || authUser || {}
    const defaultWebsiteId = String(
      source?.default_website_id || source?.defaultWebsiteId || ''
    ).trim()

    if (!defaultWebsiteId) return

    setStoredActiveWebsite(vendorId, {
      id: defaultWebsiteId,
      name: String(
        source?.default_website_name || source?.defaultWebsiteName || ''
      ).trim(),
      templateKey: String(
        source?.default_website_template_key ||
          source?.defaultWebsiteTemplateKey ||
          ''
      ).trim(),
      websiteSlug: String(
        source?.default_website_slug || source?.defaultWebsiteSlug || ''
      ).trim(),
    })
  }, [authUser, isVendor, vendorId, vendorProfile])

  useEffect(() => {
    if (!showNavigationLoader) {
      setLoaderRect(null)
      return
    }

    const updateLoaderRect = () => {
      const element = contentViewportRef.current
      if (!element) return

      const rect = element.getBoundingClientRect()
      const left = Math.max(rect.left, 0)
      const right = Math.min(rect.right, window.innerWidth)
      const top = Math.max(rect.top, 0)
      const bottom = Math.min(rect.bottom, window.innerHeight)

      setLoaderRect({
        height: Math.max(bottom - top, 0),
        left,
        top,
        width: Math.max(right - left, 0),
      })
    }

    updateLoaderRect()

    const resizeObserver = new ResizeObserver(updateLoaderRect)
    if (contentViewportRef.current) {
      resizeObserver.observe(contentViewportRef.current)
    }

    window.addEventListener('resize', updateLoaderRect)
    window.addEventListener('scroll', updateLoaderRect, true)

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', updateLoaderRect)
      window.removeEventListener('scroll', updateLoaderRect, true)
    }
  }, [showNavigationLoader])

  useEffect(() => {
    if (!isVendor || isVendorTeamUser) {
      setBillingSummary(null)
      return
    }

    let isCancelled = false

    const loadBillingSummary = async () => {
      try {
        const res = await api.get('/billing/summary')
        if (!isCancelled) {
          setBillingSummary((res.data?.data || null) as BillingSummary | null)
        }
      } catch {
        if (!isCancelled) {
          setBillingSummary(null)
        }
      }
    }

    void loadBillingSummary()

    return () => {
      isCancelled = true
    }
  }, [isVendor, isVendorTeamUser, authUser?.id])

  const handleConnectDomainClick = () => {
    if (typeof window === 'undefined') return
    window.location.assign('/template-workspace?openConnectDomain=1')
  }

  if (isAnalytics) {
    return (
      <VendorIntegrationsProvider>
        <SearchProvider>
          <LayoutProvider>
            <div className='vendor-flow dashboard-square relative min-h-svh w-full'>
              <div
                ref={contentViewportRef}
                className='relative min-h-svh w-full'
              >
                {content}
                <CreatePasswordModal />
              </div>
              {showNavigationLoader ? (
                <ContentNavigationLoader rect={loaderRect} />
              ) : null}
            </div>
          </LayoutProvider>
        </SearchProvider>
      </VendorIntegrationsProvider>
    )
  }

  if (isThemeEditor) {
    return (
      <VendorIntegrationsProvider>
        <SearchProvider>
          <LayoutProvider>
            <SidebarProvider defaultOpen>
              <div className='vendor-flow dashboard-square min-h-svh w-full bg-[#f6f6f7]'>
                <div
                  ref={contentViewportRef}
                  className='relative min-h-svh w-full'
                >
                  {content}
                  <CreatePasswordModal />
                </div>
                {showNavigationLoader ? (
                  <ContentNavigationLoader rect={loaderRect} />
                ) : null}
                {isVendor && !isVendorTeamUser ? (
                  <UpgradePlanDialog
                    open={upgradeDialogOpen}
                    onOpenChange={setUpgradeDialogOpen}
                    userName={authUser?.name}
                    userEmail={authUser?.email}
                    onPlanActivated={async () => {
                      try {
                        const res = await api.get('/billing/summary')
                        setBillingSummary(
                          (res.data?.data || null) as BillingSummary | null
                        )
                      } catch {
                        return
                      }
                    }}
                  />
                ) : null}
              </div>
            </SidebarProvider>
          </LayoutProvider>
        </SearchProvider>
      </VendorIntegrationsProvider>
    )
  }

  if (isProductEditor) {
    return (
      <VendorIntegrationsProvider>
        <SearchProvider>
          <LayoutProvider>
            <SidebarProvider defaultOpen>
              <div className='vendor-flow dashboard-square min-h-svh w-full bg-[#f6f6f7] dark:bg-[#101216]'>
                <SkipToMain />
                <div
                  ref={contentViewportRef}
                  className='relative min-h-svh w-full'
                >
                  {content}
                  <CreatePasswordModal />
                </div>
                {showNavigationLoader ? (
                  <ContentNavigationLoader rect={loaderRect} />
                ) : null}
                {isVendor && !isVendorTeamUser ? (
                  <UpgradePlanDialog
                    open={upgradeDialogOpen}
                    onOpenChange={setUpgradeDialogOpen}
                    userName={authUser?.name}
                    userEmail={authUser?.email}
                    onPlanActivated={async () => {
                      try {
                        const res = await api.get('/billing/summary')
                        setBillingSummary(
                          (res.data?.data || null) as BillingSummary | null
                        )
                      } catch {
                        return
                      }
                    }}
                  />
                ) : null}
              </div>
            </SidebarProvider>
          </LayoutProvider>
        </SearchProvider>
      </VendorIntegrationsProvider>
    )
  }

  return (
    <VendorIntegrationsProvider>
      <SearchProvider>
        <LayoutProvider>
          <div className='vendor-flow dashboard-square min-h-svh w-full'>
            <SidebarProvider defaultOpen={defaultOpen}>
              <SkipToMain />
              <AppSidebar />
              <SidebarInset
                className={cn(
                  // Set content container, so we can use container queries
                  '@container/content',

                  // If layout is fixed, set the height
                  // to 100svh to prevent overflow
                  'has-[[data-layout=fixed]]:h-svh',

                  // If layout is fixed and sidebar is inset,
                  // set the height to 100svh - spacing (total margins) to prevent overflow
                  'peer-data-[variant=inset]:has-[[data-layout=fixed]]:h-[calc(100svh-(var(--spacing)*4))]'
                )}
              >
                <div className='flex min-h-svh flex-col'>
                  {effectiveRole === 'vendor' || effectiveRole === 'admin' ? (
                    <Header fixed className='mb-4'>
                      <div className='flex flex-1 flex-col gap-3 py-1 md:flex-row md:items-center md:justify-between'>
                        <div className='flex min-w-0 items-center gap-4'>
                          <div className='text-foreground inline-flex max-w-full items-center rounded-lg px-1 py-1 text-xl font-bold tracking-tight'>
                            <span className='truncate'>
                              {currentSectionTitle}
                            </span>
                          </div>
                          <div id="page-action-portal" className="flex items-center gap-2"></div>
                        </div>
                        <div className='flex flex-wrap items-center gap-2 md:justify-end md:gap-3'>
                          {pathname === '/vendor' || pathname === '/vendor/' ? (
                            <div className='flex items-center gap-2'>
                              <div className='relative w-full sm:w-64 md:w-80'>
                                <Search className='text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2' />
                                <Input
                                  placeholder='Find vendors by name, email, or phone'
                                  value={searchValues?.username || ''}
                                  onChange={(event) =>
                                    navigate({
                                      to: '/vendor',
                                      search: (prev: any) => ({
                                        ...prev,
                                        username:
                                          event.target.value || undefined,
                                        page: 1,
                                      }),
                                    })
                                  }
                                  className='border-border/70 h-9 rounded-none border pr-4 pl-9 text-sm shadow-sm'
                                />
                              </div>
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    variant='outline'
                                    className='h-9 gap-2'
                                  >
                                    <BarChart3 className='h-4 w-4' />
                                    <span className='hidden sm:inline'>
                                      Statistics
                                    </span>
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className='sm:max-w-md'>
                                  <DialogHeader>
                                    <DialogTitle>Vendor Statistics</DialogTitle>
                                  </DialogHeader>
                                  <div className='grid grid-cols-2 gap-4 py-4'>
                                    <div className='bg-muted/20 flex flex-col items-center justify-center rounded-xl border p-4'>
                                      <Users className='text-primary mb-2 h-6 w-6' />
                                      <span className='text-2xl font-bold'>
                                        {vendorsList.length}
                                      </span>
                                      <span className='text-muted-foreground text-center text-xs'>
                                        Total Vendors
                                      </span>
                                    </div>
                                    <div className='flex flex-col items-center justify-center rounded-xl border bg-green-50/50 p-4 dark:bg-green-950/20'>
                                      <ShieldCheck className='mb-2 h-6 w-6 text-green-600' />
                                      <span className='text-2xl font-bold'>
                                        {
                                          vendorsList.filter(
                                            (v: any) => v.is_verified
                                          ).length
                                        }
                                      </span>
                                      <span className='text-muted-foreground text-center text-xs'>
                                        Verified Vendors
                                      </span>
                                    </div>
                                    <div className='flex flex-col items-center justify-center rounded-xl border bg-blue-50/50 p-4 dark:bg-blue-950/20'>
                                      <Sparkles className='mb-2 h-6 w-6 text-blue-600' />
                                      <span className='text-2xl font-bold'>
                                        {
                                          vendorsList.filter(
                                            (v: any) => v.is_profile_completed
                                          ).length
                                        }
                                      </span>
                                      <span className='text-muted-foreground text-center text-xs'>
                                        Completed Profiles
                                      </span>
                                    </div>
                                    <div className='flex flex-col items-center justify-center rounded-xl border bg-red-50/50 p-4 dark:bg-red-950/20'>
                                      <XCircle className='mb-2 h-6 w-6 text-red-600' />
                                      <span className='text-2xl font-bold'>
                                        {
                                          vendorsList.filter(
                                            (v: any) => !v.is_verified
                                          ).length
                                        }
                                      </span>
                                      <span className='text-muted-foreground text-center text-xs'>
                                        Unverified / Pending
                                      </span>
                                    </div>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            </div>
                          ) : null}
                          {isVendor ? (
                            <div className='flex flex-wrap items-center gap-2'>
                              {canAccessMyWebsites ? (
                                <Button
                                  variant='outline'
                                  asChild
                                  className='max-sm:w-full'
                                >
                                  <Link to='/template-workspace'>
                                    <Sparkles className='text-primary h-4 w-4' />
                                    Create your website for free
                                  </Link>
                                </Button>
                              ) : null}
                              <DropdownMenu modal={false}>
                                <DropdownMenuTrigger asChild>
                                  <Button variant='outline' className='gap-2'>
                                    Domain&apos;s
                                    <ChevronDown className='h-4 w-4' />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                  align='end'
                                  className='min-w-[200px]'
                                >
                                  <DropdownMenuItem
                                    onClick={handleConnectDomainClick}
                                  >
                                    Connect Domain
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    Book Domain
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                              {!isVendorTeamUser ? (
                                billingSummary?.plan?.is_premium_active ? (
                                  <Button
                                    asChild
                                    className='border border-amber-300 bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 text-black shadow-sm hover:brightness-95'
                                  >
                                    <Link to='/plans'>
                                      <Crown className='h-4 w-4 text-amber-900' />
                                      Premium Plan
                                    </Link>
                                  </Button>
                                ) : (
                                  <Button
                                    onClick={() => setUpgradeDialogOpen(true)}
                                    className='border border-amber-300 bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 text-black shadow-sm hover:brightness-95'
                                  >
                                    <Sparkles className='h-4 w-4 text-amber-900' />
                                    Upgrade Plan
                                  </Button>
                                )
                              ) : null}
                            </div>
                          ) : null}
                          <div className='ml-auto flex items-center gap-2 md:ml-0'>
                            <NotificationBell />
                            <ThemeSwitch />
                            <ConfigDrawer />
                            <ProfileDropdown />
                          </div>
                        </div>
                      </div>
                    </Header>
                  ) : null}
                  <div
                    ref={contentViewportRef}
                    className='relative min-h-0 w-full flex-1'
                  >
                    {content}
                  </div>
                </div>
                {showNavigationLoader ? (
                  <ContentNavigationLoader rect={loaderRect} />
                ) : null}
                <CreatePasswordModal />
                {isVendor && !isVendorTeamUser ? (
                  <UpgradePlanDialog
                    open={upgradeDialogOpen}
                    onOpenChange={setUpgradeDialogOpen}
                    userName={authUser?.name}
                    userEmail={authUser?.email}
                    onPlanActivated={async () => {
                      try {
                        const res = await api.get('/billing/summary')
                        setBillingSummary(
                          (res.data?.data || null) as BillingSummary | null
                        )
                      } catch {
                        return
                      }
                    }}
                  />
                ) : null}
              </SidebarInset>
            </SidebarProvider>
          </div>
        </LayoutProvider>
      </SearchProvider>
    </VendorIntegrationsProvider>
  )
}
