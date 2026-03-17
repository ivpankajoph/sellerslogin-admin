import { useEffect, useRef, useState } from 'react'
import {
  Outlet,
  useLocation,
  useNavigate,
  useRouterState,
} from '@tanstack/react-router'
import { useSelector } from 'react-redux'
import { getCookie } from '@/lib/cookies'
import api from '@/lib/axios'
import { cn } from '@/lib/utils'
import { LayoutProvider } from '@/context/layout-provider'
import { SearchProvider } from '@/context/search-provider'
import { VendorIntegrationsProvider } from '@/context/vendor-integrations-provider'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { SkipToMain } from '@/components/skip-to-main'
import {
  canAccessVendorPath,
  getFirstAccessibleVendorRoute,
  normalizeVendorPageAccess,
  resolveVendorPageAccessKey,
} from '@/features/team-access/access-config'
import { getStoredActiveWebsiteId } from '@/features/vendor-template/components/websiteStudioStorage'

type AuthenticatedLayoutProps = {
  children?: React.ReactNode
}

type LoaderViewportRect = {
  height: number
  left: number
  top: number
  width: number
}

function ContentNavigationLoader({ rect }: { rect: LoaderViewportRect | null }) {
  if (!rect) return null

  return (
    <div
      className='fixed z-50 flex items-center justify-center bg-background/55 backdrop-blur-md'
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

import { CreatePasswordModal } from '@/components/auth/create-password-modal'

export function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  const defaultOpen = getCookie('sidebar_state') !== 'false'
  const navigate = useNavigate()
  const pathname = useLocation({ select: (location) => location.pathname })
  const authUser = useSelector((state: any) => state.auth?.user || null)
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
  const content = children ?? <Outlet />
  const showNavigationLoader = isNavigating
  const isVendorTeamUser =
    String(authUser?.role || '').toLowerCase() === 'vendor' &&
    String(authUser?.account_type || '').toLowerCase() === 'vendor_user'
  const vendorPageAccess = normalizeVendorPageAccess(authUser?.page_access)
  const vendorId = String(
    authUser?.vendor_id || authUser?.id || authUser?._id || ''
  ).trim()

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

  if (isAnalytics) {
    return (
      <VendorIntegrationsProvider>
        <SearchProvider>
          <LayoutProvider>
            <div className='vendor-flow dashboard-square relative min-h-svh w-full'>
              <div ref={contentViewportRef} className='relative min-h-svh w-full'>
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
                  'peer-data-[variant=inset]:has-[[data-layout=fixed]]:h-[calc(100svh-(var(--spacing)*4))]',
                )}
              >
                <div ref={contentViewportRef} className='relative min-h-svh w-full'>
                  {content}
                </div>
                {showNavigationLoader ? (
                  <ContentNavigationLoader rect={loaderRect} />
                ) : null}
                <CreatePasswordModal />
              </SidebarInset>
            </SidebarProvider>
          </div>
        </LayoutProvider>
      </SearchProvider>
    </VendorIntegrationsProvider>
  )
}
