import { useContext, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { ThemeContext } from '../../context/ThemeContext.jsx'
import { navigationItems } from '../../data/navigation.js'

const routePageMeta = {
  '/analytics/email-opened-clicked': {
    label: 'Email Opened/Clicked',
    // description:
    //   'Track sent messages, inbox deliveries, unique opens, and unique clicks.',
  },
  '/analytics/conversion-revenue': {
    label: 'Conversion/Revenue',
    description:
      'Review conversion count, revenue, click-to-open rate, and list growth.',
  },
  '/analytics/device-location': {
    label: 'Device & Location Tracking',
    description:
      'Track recipient-level device, location, open, and click activity for campaigns and automations.',
  },
  '/analytics/time-analytics': {
    label: 'Time Based Analytics',
    description: 'Review best send-time signals from the latest open and click activity.',
  },
  '/analytics/campaign-analytics': {
    label: 'Campaign Analytics',
    description: 'Compare campaign delivery, engagement, and cost performance.',
  },
  '/deliverability/bounces': {
    label: 'Bounce Emails',
    description: 'Emails that were not delivered because the address or recipient server rejected them.',
  },
  '/deliverability/complaints-suppressions': {
    label: 'Complaints & Suppressions',
    description: 'Emails marked as spam or blocked from future sends by suppression rules.',
  },
  '/deliverability/unsubscribes': {
    label: 'Unsubscribe Emails',
    description: 'Recipients who unsubscribed from email communication.',
  },
  '/connect-domain/my-domains': {
    label: 'My Domains',
    description: 'Add, review, and manage verified business domains for email sending.',
  },
  '/connect-domain/dns-records': {
    label: 'Setup DNS Records',
    description: 'Copy SPF, DKIM, DMARC, and tracking records into your domain provider.',
  },
  '/connect-domain/domain-health': {
    label: 'Domain Health',
    description: 'Monitor domain reputation, delivery rate, bounce rate, and complaint signals.',
  },
  '/connect-domain/dedicated-ip': {
    label: 'Dedicated IP',
    description: 'Review the advanced dedicated IP option for high-volume email sending.',
  },
}

function IconButton({ children, isActive = false, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex h-10 w-10 items-center justify-center border transition ${
        isActive
          ? 'border-[#cbb6ee] bg-[#f0e6ff] text-[#5a189a] shadow-[0_6px_18px_rgba(131,56,236,0.08)]'
          : 'border-[#ded7ef] bg-white text-[#5a4380] hover:border-[#cbb6ee] hover:bg-[#f5efff]'
      }`}
    >
      {children}
    </button>
  )
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth="1.8">
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 2.5v2.2M12 19.3v2.2M21.5 12h-2.2M4.7 12H2.5M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6M18.7 18.7l-1.6-1.6M6.9 6.9 5.3 5.3" />
    </svg>
  )
}

function Topbar() {
  const { themeMode, setThemeMode } = useContext(ThemeContext)
  const location = useLocation()
  const [openMenu, setOpenMenu] = useState(null)

  const currentPageOverride = routePageMeta[location.pathname]
  const currentPage = currentPageOverride ||
    navigationItems.find(
      (item) => location.pathname === item.path || location.pathname.startsWith(`${item.path}/`),
    ) || navigationItems[0]

  const toggleMenu = (menuName) => {
    setOpenMenu((current) => (current === menuName ? null : menuName))
  }

  return (
    <header className="topbar-panel sticky top-0 z-20 flex flex-col gap-4 border-b border-[#ddd7e8] bg-white/95 px-4 py-3 backdrop-blur md:flex-row md:items-center md:justify-between md:px-5">
      <div>
        <h2 className="text-[20px] font-semibold tracking-tight text-[#21192d]">
          {currentPage.path === '/overview' ? 'Dashboard' : currentPage.label}
        </h2>
        <p className="mt-0.5 max-w-2xl text-[13px] text-[#7f6f96]">{currentPage.description}</p>
      </div>

      <div className="relative flex items-center gap-3">
        <div className="relative">
          <IconButton onClick={() => toggleMenu('theme')}>
            <SunIcon />
          </IconButton>

          {openMenu === 'theme' ? (
            <div className="absolute right-0 top-12 z-30 w-[170px] overflow-hidden border border-[#ded7ef] bg-white shadow-[var(--shadow-strong)]">
              {[
                ['light', 'Light'],
                ['dark', 'Dark'],
                ['system', 'System'],
              ].map(([label, active]) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setThemeMode(label)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left text-[13px] text-[#21192d] transition hover:bg-[#f5efff]"
                >
                  <span>{active}</span>
                  <span className="text-[#8d7fa3]">{themeMode === label ? 'OK' : ''}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </header>
  )
}

export default Topbar
