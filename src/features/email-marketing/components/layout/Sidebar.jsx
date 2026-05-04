import { useContext, useEffect, useRef, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { AuthContext } from '../../context/AuthContext.jsx'
import { navigationItems } from '../../data/navigation.js'
import { roleLabels } from '../../data/permissions.js'

function ChevronIcon({ open = false }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-4 w-4 fill-none stroke-current transition-transform ${open ? 'rotate-180' : ''}`}
      strokeWidth="1.8"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="1.8">
      <path d="M4 11.2 12 4l8 7.2" />
      <path d="M6.5 10.8V20h11V10.8" />
      <path d="M10 20v-6h4v6" />
    </svg>
  )
}

function DashboardIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="1.8">
      <path d="M4 5h7v6H4V5Z" />
      <path d="M13 5h7v14h-7V5Z" />
      <path d="M4 13h7v6H4v-6Z" />
    </svg>
  )
}

function PeopleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="1.8">
      <path d="M16.5 20a5 5 0 0 0-9 0" />
      <path d="M12 13.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
      <path d="M19.5 20a4 4 0 0 0-3.1-3.9" />
      <path d="M17.3 6.8a2.7 2.7 0 0 1 0 5.1" />
    </svg>
  )
}

function PaperPlaneIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="1.8">
      <path d="M21 3 10.2 13.8" />
      <path d="M21 3 14 21l-3.8-7.2L3 10.5 21 3Z" />
    </svg>
  )
}

function FlowIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="1.8">
      <path d="M7 6h10" />
      <path d="M7 18h10" />
      <path d="M7 6v12" />
      <circle cx="7" cy="6" r="1.5" />
      <circle cx="17" cy="12" r="1.5" />
      <circle cx="7" cy="18" r="1.5" />
      <path d="M8.5 6c2.8 0 2.8 6 8.5 6" />
      <path d="M8.5 18c2.8 0 2.8-6 8.5-6" />
    </svg>
  )
}

function SparkleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="1.8">
      <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" />
      <path d="M18 14l.8 2.2L21 17l-2.2.8L18 20l-.8-2.2L15 17l2.2-.8L18 14Z" />
    </svg>
  )
}

function ReceiptIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="1.8">
      <path d="M6 4h12v16l-2-1.4-2 1.4-2-1.4-2 1.4-2-1.4-2 1.4V4Z" />
      <path d="M8 8h8M8 12h8" />
    </svg>
  )
}

function BubbleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="1.8">
      <path d="M5 6.5h14a2 2 0 0 1 2 2V15a2 2 0 0 1-2 2H11l-4.5 3v-3H5a2 2 0 0 1-2-2V8.5a2 2 0 0 1 2-2Z" />
      <path d="M8 10h8M8 13h5" />
    </svg>
  )
}

function ChartIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="1.8">
      <path d="M4 19V5" />
      <path d="M4 19h16" />
      <path d="M8 15v-4" />
      <path d="M12 15V8" />
      <path d="M16 15v-6" />
    </svg>
  )
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="1.8">
      <path d="M10.3 4.8h3.4l.4 2a6.9 6.9 0 0 1 1.5.9l2-.6 1.7 3-1.5 1.4c.1.5.2 1 .2 1.5s-.1 1-.2 1.5l1.5 1.4-1.7 3-2-.6c-.5.3-1 .6-1.5.9l-.4 2h-3.4l-.4-2a6.9 6.9 0 0 1-1.5-.9l-2 .6-1.7-3 1.5-1.4c-.1-.5-.2-1-.2-1.5s.1-1 .2-1.5L4.7 10.1l1.7-3 2 .6c.5-.3 1-.6 1.5-.9l.4-2Z" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  )
}

function TeamUsersIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="1.8">
      <path d="M9 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
      <path d="M18 11a2.5 2.5 0 1 0-1.2-4.7" />
      <path d="M4 19a6 6 0 0 1 10.5-3.8" />
      <path d="M13.5 18.5a4.5 4.5 0 0 1 7.5-3.5" />
      <path d="M17 14.8v6M14 17.8h6" />
    </svg>
  )
}

function MarketingIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="1.8">
      <path d="M4.5 7.5h15l-1.2 3.5H5.7L4.5 7.5Z" />
      <path d="M6 11v6.5h12V11" />
      <path d="M9 18v-3h6v3" />
      <path d="M8 4.5h8l1 3H7l1-3Z" />
    </svg>
  )
}

function iconForItem(item) {
  const iconMap = {
    home: HomeIcon,
    campaigns: PaperPlaneIcon,
    templates: ReceiptIcon,
    builder: SparkleIcon,
    audience: PeopleIcon,
    segments: FlowIcon,
    suppression: BubbleIcon,
    analytics: ChartIcon,
    deliverability: ChartIcon,
    automation: FlowIcon,
    reports: ChartIcon,
    team: TeamUsersIcon,
    settings: SettingsIcon,
  }

  return iconMap[item.icon] || HomeIcon
}

function Sidebar({ expanded = true, onHoverChange = () => {} }) {
  const { admin, can } = useContext(AuthContext)
  const location = useLocation()
  const visibleItems = navigationItems.filter((item) => can(item.permission))
  const [openMenu, setOpenMenu] = useState(false)
  const [marketingOpen, setMarketingOpen] = useState(true)
  const menuRef = useRef(null)

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpenMenu(false)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  useEffect(() => {
    if (!expanded) {
      setOpenMenu(false)
    }
  }, [expanded])

  useEffect(() => {
    const isMarketingRoute = ['/campaigns', '/templates'].some(
      (path) => location.pathname === path || location.pathname.startsWith(`${path}/`),
    )

    if (isMarketingRoute) {
      setMarketingOpen(true)
    }
  }, [location.pathname])

  const homeItems = visibleItems.filter((item) => item.path === '/overview')
  const marketingItems = visibleItems.filter((item) => ['/campaigns', '/templates'].includes(item.path))
  const otherItems = visibleItems.filter((item) => !['/overview', '/campaigns', '/templates'].includes(item.path))

  return (
    <aside
      className={`sidebar-panel flex h-full min-h-0 flex-col overflow-hidden text-[var(--text-strong)] transition-[width] duration-200 ease-out ${
        expanded ? 'lg:w-[296px]' : 'lg:w-[72px]'
      } w-full`}
      onMouseEnter={() => onHoverChange(true)}
      onMouseLeave={() => onHoverChange(false)}
    >
      <div
        ref={menuRef}
        className={`relative border-b border-[var(--border-soft)] transition-all duration-200 ${
          expanded ? 'p-4' : 'p-2 lg:p-3'
        }`}
      >
        <button
          type="button"
          onClick={() => setOpenMenu((current) => !current)}
          className={`w-full rounded-[24px] border border-[var(--border-soft)] bg-white/70 text-left backdrop-blur-sm transition hover:bg-white ${
            expanded ? 'p-3' : 'p-2 lg:p-2'
          }`}
          title={expanded ? undefined : roleLabels[admin?.role] || 'Super Admin'}
        >
          <div
            className={`flex items-center rounded-[20px] border border-[var(--border-soft)] bg-white/80 transition-all duration-200 ${
              expanded ? 'gap-3 px-3 py-3' : 'justify-center gap-0 px-0 py-3'
            }`}
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[rgba(21,128,61,0.12)] text-sm font-semibold text-[#0f172a]">
              {admin?.name?.slice(0, 2).toUpperCase() || 'SA'}
            </div>
            {expanded ? (
              <>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-semibold text-[#101828]">
                    {roleLabels[admin?.role] || 'Super Admin'}
                  </p>
                  <p className="truncate text-xs text-[#667085]">
                    {admin?.email || 'admin@emarketing.local'}
                  </p>
                </div>
                <div className="text-[#667085]">
                  <ChevronIcon open={openMenu} />
                </div>
              </>
            ) : null}
          </div>
        </button>

        {openMenu ? (
          <div className="absolute left-4 right-4 top-[calc(100%-4px)] z-50 overflow-hidden rounded-[18px] border border-[var(--border-soft)] bg-white shadow-[0_18px_42px_rgba(16,24,40,0.14)]">
            <div className="border-b border-[var(--border-soft)] px-4 py-3">
              <p className="text-[15px] font-semibold text-[#101828]">{admin?.name || 'Super Admin'}</p>
              <p className="mt-1 text-sm text-[#667085]">{admin?.email}</p>
              <div className="mt-3 inline-flex rounded-full bg-[rgba(21,128,61,0.1)] px-3 py-1 text-xs font-semibold text-[#0f7a33]">
                {roleLabels[admin?.role] || 'Super Admin'}
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                window.location.assign('/')
              }}
              className="flex w-full items-center justify-between px-4 py-3 text-left text-sm text-[#101828] transition hover:bg-[#f4f6ee]"
            >
              <span className="flex items-center gap-3">
                <DashboardIcon />
                <span>Main Dashboard</span>
              </span>
              <span className="text-[#667085]">Open</span>
            </button>
          </div>
        ) : null}
      </div>

      <nav
        className={`scrollbar-none min-h-0 flex-1 overflow-y-auto ${expanded ? 'space-y-3 px-3 py-4' : 'space-y-3 px-2 py-3 lg:px-2'}`}
      >
        <div className="space-y-2">
          {homeItems.map((item) => {
            const Icon = iconForItem(item)

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `nav-link ${isActive ? 'nav-link-active' : ''} ${expanded ? '' : 'justify-center px-3'}`
                }
                title={expanded ? undefined : item.label}
              >
                <span className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-2xl border border-[var(--border-soft)] bg-white/70 text-[#0f172a] shadow-[0_8px_18px_rgba(16,24,40,0.04)]">
                    <Icon />
                  </span>
                  {expanded ? <span>{item.label}</span> : null}
                </span>
              </NavLink>
            )
          })}

          <div className="pt-1">
            <button
              type="button"
              onClick={() => setMarketingOpen((current) => !current)}
              className={`nav-link w-full ${marketingOpen ? 'nav-link-active' : ''} ${expanded ? '' : 'justify-center px-3'}`}
              title={expanded ? undefined : 'Marketing'}
            >
              <span className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-2xl border border-[var(--border-soft)] bg-white/70 text-[#0f172a] shadow-[0_8px_18px_rgba(16,24,40,0.04)]">
                  <MarketingIcon />
                </span>
                {expanded ? <span>Marketing</span> : null}
              </span>
              {expanded ? <ChevronIcon open={marketingOpen} /> : null}
            </button>
          </div>

          {marketingOpen ? (
            <div className={`space-y-2 ${expanded ? 'pl-3' : ''}`}>
              {marketingItems.map((item) => {
                const Icon = iconForItem(item)

                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      `nav-link ${isActive ? 'nav-link-active' : ''} ${expanded ? '' : 'justify-center px-3'}`
                    }
                    title={expanded ? undefined : item.label}
                  >
                    <span className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-2xl border border-[var(--border-soft)] bg-white/70 text-[#0f172a] shadow-[0_8px_18px_rgba(16,24,40,0.04)]">
                        <Icon />
                      </span>
                      {expanded ? <span>{item.label}</span> : null}
                    </span>
                  </NavLink>
                )
              })}
            </div>
          ) : null}

          {otherItems.map((item) => {
            const Icon = iconForItem(item)

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `nav-link ${isActive ? 'nav-link-active' : ''} ${expanded ? '' : 'justify-center px-3'}`
                }
                title={expanded ? undefined : item.label}
              >
                <span className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-2xl border border-[var(--border-soft)] bg-white/70 text-[#0f172a] shadow-[0_8px_18px_rgba(16,24,40,0.04)]">
                    <Icon />
                  </span>
                  {expanded ? <span>{item.label}</span> : null}
                </span>
              </NavLink>
            )
          })}
        </div>
      </nav>
    </aside>
  )
}

export default Sidebar
