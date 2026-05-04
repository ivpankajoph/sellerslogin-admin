import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar.jsx'
import Topbar from './Topbar.jsx'

function DashboardLayout() {
  const [isSidebarHovered, setIsSidebarHovered] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 1024px)')

    const updateDesktopState = (event) => {
      setIsDesktop(event.matches)
    }

    setIsDesktop(mediaQuery.matches)
    mediaQuery.addEventListener('change', updateDesktopState)

    return () => mediaQuery.removeEventListener('change', updateDesktopState)
  }, [])

  const isSidebarExpanded = !isDesktop || isSidebarHovered

  return (
    <div className="vendor-dashboard-shell h-screen overflow-hidden bg-[#fbf9ff]">
      <div className="grid h-full overflow-hidden bg-[#fbf9ff] lg:grid-cols-[auto_minmax(0,1fr)]">
        <Sidebar
          expanded={isSidebarExpanded}
          onHoverChange={setIsSidebarHovered}
        />
        <main className="flex min-w-0 min-h-0 flex-col overflow-hidden bg-[#fbf9ff]">
          <Topbar />
          <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

export default DashboardLayout
