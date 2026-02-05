import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

import {
  clearTemplateAuth,
  getTemplateAuth,
} from '@/features/template-preview/utils/templateAuth'
import { useLocation } from '@tanstack/react-router'

interface PreviewChromeProps {
  vendorId: string
  logoUrl?: string
  vendorName?: string
  buttonLabel?: string
  buttonColor?: string
  theme?: {
    templateColor?: string
    bannerColor?: string
    fontScale?: number
  }
  categories?: Array<{
    _id?: string
    name?: string
  }>
  subcategories?: Array<{
    _id?: string
    name?: string
    category_id?: { _id?: string; name?: string } | string
  }>
  customPages?: Array<{
    id?: string
    title?: string
    slug?: string
    isPublished?: boolean
  }>
  active: 'home' | 'about' | 'contact'
  children: ReactNode
  footer?: ReactNode
}

export function PreviewChrome({
  vendorId,
  logoUrl,
  vendorName,
  
  theme,
  categories = [],
  subcategories = [],
  customPages = [],
  active,
  children,
  footer,
}: PreviewChromeProps) {
  const API_BASE = import.meta.env.VITE_PUBLIC_API_URL?.endsWith('/v1')
    ? import.meta.env.VITE_PUBLIC_API_URL
    : `${import.meta.env.VITE_PUBLIC_API_URL}/v1`
  const analyticsUrl = `${API_BASE}/analytics/track`
  const assetBase = import.meta.env.VITE_PUBLIC_API_URL_BANNERS || import.meta.env.VITE_PUBLIC_API_URL || ''
  const resolvedLogoUrl =
    logoUrl && !logoUrl.startsWith('http')
      ? `${assetBase.replace(/\/$/, '')}/${logoUrl.replace(/^\//, '')}`
      : logoUrl
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null)
  const [cartCount, setCartCount] = useState(0)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const location = useLocation()
  const lastPageRef = useRef<{ path: string; startedAt: number } | null>(null)
  const visitorIdRef = useRef<string>('')
  const sessionIdRef = useRef<string>('')
  const clientIpRef = useRef<string>('')

  const subcategoriesByCategory = useMemo(() => {
    return subcategories.reduce<Record<string, typeof subcategories>>(
      (acc, sub) => {
        const categoryId =
          (typeof sub?.category_id === 'string'
            ? sub.category_id
            : sub?.category_id?._id) || ''
        if (!categoryId) return acc
        if (!acc[categoryId]) acc[categoryId] = []
        acc[categoryId].push(sub)
        return acc
      },
      {}
    )
  }, [subcategories])

  const categoryLink = (categoryId?: string) => {
    if (!categoryId) return `/template/${vendorId}`
    return `/template/${vendorId}/category/${categoryId}`
  }
  const subcategoryLink = (subcategoryId?: string) => {
    if (!subcategoryId) return `/template/${vendorId}`
    return `/template/${vendorId}/subcategory/${subcategoryId}`
  }
  const navItems = [
    { key: 'home', label: 'Home', href: `/template/${vendorId}` },
    { key: 'about', label: 'About', href: `/template/${vendorId}/about` },
    { key: 'contact', label: 'Contact', href: `/template/${vendorId}/contact` },
  ] as const
  const pageLinks = customPages
    .filter((page) => page?.isPublished !== false)
    .map((page) => ({
      key: page?.id || page?.slug || page?.title || 'page',
      label: page?.title || 'Page',
      href: `/template/${vendorId}/page/${page?.slug || page?.id}`,
    }))

  const accent = theme?.templateColor || '#0f172a'
  const fontScale = theme?.fontScale || 1
  const backgroundTint = toRgba(accent, 0.08)
  const backgroundGlow = toRgba(accent, 0.14)

  useEffect(() => {
    const root = document.documentElement
    root.style.fontSize = `calc(16px * ${fontScale})`
    root.style.setProperty('--template-accent', accent)
    return () => {
      root.style.fontSize = ''
      root.style.removeProperty('--template-accent')
    }
  }, [fontScale, accent])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const key = `tpl_vis_${vendorId}`
    const sessionKey = `tpl_sess_${vendorId}`
    const existingVisitor = localStorage.getItem(key)
    if (existingVisitor) {
      visitorIdRef.current = existingVisitor
    } else {
      const generated = crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`
      visitorIdRef.current = generated
      localStorage.setItem(key, generated)
    }
    const existingSession = sessionStorage.getItem(sessionKey)
    if (existingSession) {
      sessionIdRef.current = existingSession
    } else {
      const generated = crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`
      sessionIdRef.current = generated
      sessionStorage.setItem(sessionKey, generated)
    }
  }, [vendorId])

  useEffect(() => {
    if (typeof window === 'undefined') return
    fetch('https://api.ipify.org?format=json')
      .then((res) => res.json())
      .then((data) => {
        if (data?.ip) clientIpRef.current = data.ip
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!vendorId) return
    const path = `${location.pathname}${location.search || ''}`
    const now = Date.now()
    const auth = getTemplateAuth(String(vendorId))

    const sendEvent = (payload: Record<string, unknown>) => {
      fetch(analyticsUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(() => {})
    }

    const prev = lastPageRef.current
    if (prev && prev.path !== path) {
      sendEvent({
        eventType: 'page_duration',
        path: prev.path,
        fullUrl: prev.path,
        vendorId: String(vendorId),
        userId: auth?.user?.id,
        sessionId: sessionIdRef.current,
        visitorId: visitorIdRef.current,
        clientIp: clientIpRef.current,
        clientUserAgent: navigator.userAgent,
        clientDevice:
          'userAgentData' in navigator && (navigator as any).userAgentData?.mobile
            ? 'mobile'
            : 'desktop',
        durationMs: Math.max(0, now - prev.startedAt),
      })
    }

    sendEvent({
      eventType: 'page_view',
      path,
      fullUrl: window.location.href,
      title: document.title,
      referrer: document.referrer || '',
      vendorId: String(vendorId),
      userId: auth?.user?.id,
      sessionId: sessionIdRef.current,
      visitorId: visitorIdRef.current,
      clientIp: clientIpRef.current,
      clientUserAgent: navigator.userAgent,
      clientDevice:
        'userAgentData' in navigator && (navigator as any).userAgentData?.mobile
          ? 'mobile'
          : 'desktop',
      screen: { width: window.screen.width, height: window.screen.height },
      viewport: { width: window.innerWidth, height: window.innerHeight },
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    })

    lastPageRef.current = { path, startedAt: now }

    return () => {
      const last = lastPageRef.current
      if (!last) return
      sendEvent({
        eventType: 'page_duration',
        path: last.path,
        fullUrl: last.path,
        vendorId: String(vendorId),
        userId: auth?.user?.id,
        sessionId: sessionIdRef.current,
        visitorId: visitorIdRef.current,
        clientIp: clientIpRef.current,
        clientUserAgent: navigator.userAgent,
        clientDevice:
          'userAgentData' in navigator && (navigator as any).userAgentData?.mobile
            ? 'mobile'
            : 'desktop',
        durationMs: Math.max(0, Date.now() - last.startedAt),
      })
    }
  }, [vendorId, location.pathname, location.search])

  useEffect(() => {
    const auth = getTemplateAuth(String(vendorId))
    setIsLoggedIn(!!auth?.token)
    if (!auth?.token) {
      setCartCount(0)
      return
    }
    fetch(`${API_BASE}/template-users/cart`, {
      headers: {
        Authorization: `Bearer ${auth.token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        setCartCount(data?.cart?.total_quantity || 0)
      })
      .catch(() => {
        setCartCount(0)
      })
  }, [vendorId])

  const emitSelect = (sectionId: string) => {
    if (typeof window === 'undefined') return
    window.parent?.postMessage(
      {
        type: 'template-editor-select',
        vendorId,
        page: active,
        sectionId,
      },
      window.location.origin
    )
  }

  return (
    <div
      className='min-h-screen font-manrope text-slate-900'
      style={{
        ['--template-accent' as any]: accent,
        backgroundColor: backgroundTint,
        backgroundImage: `radial-gradient(circle_at_top,${backgroundGlow},transparent_55%),radial-gradient(circle_at_10%_90%,${backgroundGlow},transparent_50%)`,
      }}
    >
      <div className='pointer-events-none absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-white/80 to-transparent' />

      <header className='relative z-30 border-b border-white/60 bg-white/80 backdrop-blur'>
        <div className='mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6'>
          <div
            className='flex items-center gap-3'
            onClickCapture={(event) => {
              if (active !== 'home') return
              event.preventDefault()
              event.stopPropagation()
              emitSelect('branding')
            }}
          >
            <div className='h-10 w-10 overflow-hidden rounded-full border border-white bg-slate-900 text-white shadow'>
              {resolvedLogoUrl ? (
                <img
                  src={resolvedLogoUrl}
                  alt='Brand logo'
                  className='h-full w-full object-cover'
                />
              ) : (
                <div className='flex h-full w-full items-center justify-center text-xs font-semibold'>
                  OPH
                </div>
              )}
            </div>
            <div>
              <p className='text-xs font-semibold uppercase tracking-[0.32em] text-slate-500'>
                Storefront Preview
              </p>
              <p className='text-lg font-semibold text-slate-900'>
                {vendorName || 'Vendor Template'}
              </p>
            </div>
          </div>

          <nav className='relative z-30 hidden items-center gap-3 md:flex'>
            {navItems.map((item) => (
              <a
                key={item.key}
                href={item.href}
                className={cn(
                  'rounded-full px-4 py-2 text-sm font-semibold transition-all',
                  active === item.key
                    ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20'
                    : 'text-slate-600 hover:bg-white hover:text-slate-900'
                )}
                style={
                  active === item.key
                    ? { backgroundColor: accent, color: '#fff' }
                    : undefined
                }
              >
                {item.label}
              </a>
            ))}
            {pageLinks.map((page) => (
              <a
                key={page.key}
                href={page.href}
                className='rounded-full px-4 py-2 text-sm font-semibold text-slate-600 transition-all hover:bg-white hover:text-slate-900'
              >
                {page.label}
              </a>
            ))}
            <div
              className='relative z-40'
              onMouseEnter={() => setAccountOpen(true)}
              onMouseLeave={() => setAccountOpen(false)}
            >
              <button
                type='button'
                onClick={() => setAccountOpen((prev) => !prev)}
                className='rounded-full px-4 py-2 text-sm font-semibold text-slate-600 transition-all hover:bg-white hover:text-slate-900'
              >
                Account
              </button>
              <div
                className={cn(
                  'pointer-events-none absolute right-0 top-full z-50 mt-3 min-w-[220px] rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-2xl backdrop-blur transition',
                  accountOpen ? 'opacity-100' : 'opacity-0'
                )}
              >
                <div className='pointer-events-auto space-y-1'>
                  <a
                    href={`/template/${vendorId}/cart`}
                    className='flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50'
                  >
                    <span>Cart</span>
                    {cartCount > 0 ? (
                      <span className='rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-semibold text-white'>
                        {cartCount}
                      </span>
                    ) : null}
                  </a>
                  {isLoggedIn ? (
                    <>
                      <a
                        href={`/template/${vendorId}/orders`}
                        className='rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50'
                      >
                        Orders
                      </a>
                      <a
                        href={`/template/${vendorId}/profile`}
                        className='rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50'
                      >
                        Profile
                      </a>
                      <div className='my-1 h-px bg-slate-100' />
                      <button
                        type='button'
                        onClick={() => {
                          clearTemplateAuth(String(vendorId))
                          setIsLoggedIn(false)
                          setCartCount(0)
                          setAccountOpen(false)
                        }}
                        className='w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-rose-600 transition hover:bg-rose-50'
                      >
                        Logout
                      </button>
                    </>
                  ) : (
                    <a
                      href={`/template/${vendorId}/login`}
                      className='rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50'
                    >
                      Login
                    </a>
                  )}
                </div>
              </div>
            </div>

            <div
              className='relative z-40 group'
              onMouseLeave={() => setActiveCategoryId(null)}
            >
              <button
                type='button'
                className='rounded-full px-4 py-2 text-sm font-semibold transition-all text-slate-600 hover:bg-white hover:text-slate-900'
              >
                Category
              </button>
              <div className='pointer-events-none absolute left-0 top-full z-50 pt-3 opacity-0 transition duration-200 group-hover:pointer-events-auto group-hover:opacity-100'>
                <div className='flex min-w-[460px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl'>
                  <div className='w-1/2 border-r border-slate-100 p-4'>
                    <p className='mb-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-400'>
                      Categories
                    </p>
                    <div className='flex max-h-64 flex-col gap-2 overflow-auto pr-1'>
                      {categories.length ? (
                        categories.map((category) => (
                          <a
                            key={category._id}
                            href={categoryLink(category._id)}
                            onMouseEnter={() =>
                              setActiveCategoryId(category._id || null)
                            }
                            className={cn(
                              'rounded-xl px-3 py-2 text-sm transition',
                              activeCategoryId === category._id
                                ? 'bg-slate-100 text-slate-900'
                                : 'text-slate-600 hover:bg-slate-50'
                            )}
                          >
                            {category.name || 'Category'}
                          </a>
                        ))
                      ) : (
                        <div className='rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-6 text-center text-xs uppercase tracking-[0.3em] text-slate-400'>
                          No categories
                        </div>
                      )}
                    </div>
                  </div>
                  <div className='w-1/2 p-4'>
                    <p className='mb-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-400'>
                      Subcategories
                    </p>
                    <div className='flex max-h-64 flex-col gap-2 overflow-auto pr-1'>
                      {(subcategoriesByCategory[activeCategoryId || ''] || [])
                        .length ? (
                        (subcategoriesByCategory[activeCategoryId || ''] || [])
                          .map((sub) => (
                            <a
                              key={sub._id}
                              href={subcategoryLink(sub._id)}
                              className='rounded-xl px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-50'
                            >
                              {sub.name || 'Subcategory'}
                            </a>
                          ))
                      ) : (
                        <div className='rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-6 text-center text-xs uppercase tracking-[0.3em] text-slate-400'>
                          No subcategories
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </nav>

          <div className='rounded-full border border-transparent px-4 py-2 text-sm font-semibold text-transparent'>
            .
          </div>
        </div>
      </header>

      <main className='relative z-10 mx-auto flex max-w-6xl flex-col gap-10 px-4 py-10 sm:px-6'>
        {children}
      </main>

      {footer ? (
        <footer className='border-t border-white/60 bg-white/80 py-10'>
          <div className='mx-auto max-w-6xl px-4 sm:px-6'>{footer}</div>
        </footer>
      ) : null}
    </div>
  )
}

const toRgba = (hex: string, alpha: number) => {
  const sanitized = hex.replace('#', '').trim()
  const normalized =
    sanitized.length === 3
      ? sanitized
          .split('')
          .map((char) => char + char)
          .join('')
      : sanitized
  if (normalized.length !== 6) {
    return `rgba(15, 23, 42, ${alpha})`
  }
  const r = parseInt(normalized.slice(0, 2), 16)
  const g = parseInt(normalized.slice(2, 4), 16)
  const b = parseInt(normalized.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
