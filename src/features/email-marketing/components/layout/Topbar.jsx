import { useContext, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { ThemeContext } from '../../context/ThemeContext.jsx'
import { navigationItems } from '../../data/navigation.js'

function IconButton({ children, isActive = false, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex h-11 w-11 items-center justify-center rounded-full border transition ${
        isActive
          ? 'border-[rgba(21,128,61,0.2)] bg-[#eef7e8] text-[#166534] shadow-[0_6px_18px_rgba(21,128,61,0.08)]'
          : 'border-[var(--border-soft)] bg-white/80 text-[#475467] hover:border-[rgba(21,128,61,0.2)] hover:bg-[#f4f8ef]'
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

  const currentPage =
    navigationItems.find(
      (item) => location.pathname === item.path || location.pathname.startsWith(`${item.path}/`),
    ) || navigationItems[0]

  const toggleMenu = (menuName) => {
    setOpenMenu((current) => (current === menuName ? null : menuName))
  }

  return (
    <header className="topbar-panel flex flex-col gap-4 px-5 py-5 md:flex-row md:items-center md:justify-between md:px-6">
      <div>
        {/* <p className="text-xs font-semibold uppercase tracking-[0.24em] text-ui-muted">Marketing Workspace</p> */}
        <h2 className="mt-2 text-[34px] font-semibold tracking-tight text-ui-strong">
          {currentPage.path === '/overview' ? 'Dashboard' : currentPage.label}
        </h2>
        <p className="mt-1 max-w-2xl text-[15px] text-ui-body">{currentPage.description}</p>
      </div>

      <div className="relative flex items-center gap-3">
        <div className="relative">
          <IconButton onClick={() => toggleMenu('theme')}>
            <SunIcon />
          </IconButton>

          {openMenu === 'theme' ? (
            <div className="absolute right-0 top-[52px] z-30 w-[170px] overflow-hidden rounded-[18px] border border-ui bg-[var(--bg-card-strong)] shadow-[var(--shadow-strong)]">
              {[
                ['light', 'Light'],
                ['dark', 'Dark'],
                ['system', 'System'],
              ].map(([label, active]) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setThemeMode(label)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left text-sm text-ui-strong transition hover:bg-[var(--bg-subtle)]"
                >
                  <span>{active}</span>
                  <span className="text-ui-muted">{themeMode === label ? 'OK' : ''}</span>
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
