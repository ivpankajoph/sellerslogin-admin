import { Link } from '@tanstack/react-router'
import { ChevronDown, ExternalLink, PlugZap, Store } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import VendorDashboard from './components/VendorDashboard'
import { Analytics } from './components/analytics'
import { Notifications } from './components/notifications'

import Reports from './components/reports'
import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useVendorIntegrations } from '@/context/vendor-integrations-provider'
import api from '@/lib/axios'
import {
  getInstalledProviderIds,
  INTEGRATION_PROVIDER_META,
} from '@/lib/vendor-integrations'
import { setUser } from '@/store/slices/authSlice'

export function Dashboard() {
  const dispatch = useDispatch()
  const user = useSelector((state: any) => state.auth.user)
  const { data: integrationData } = useVendorIntegrations()
  const [unreadCount, setUnreadCount] = useState(0)
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'reports' | 'notifications'>(
    'overview',
  )
  const effectiveRole = user?.role === 'superadmin' ? 'admin' : user?.role
  const isVendor = effectiveRole === 'vendor'
  const connectedAppIds = getInstalledProviderIds(integrationData)

  useEffect(() => {
    if (!user?.id) return
    const loadProfile = async () => {
      try {
        const res = await api.get('/profile')
        const fetched =
          res.data?.user ||
          res.data?.vendor ||
          res.data?.data ||
          res.data?.admin ||
          res.data
        if (fetched) dispatch(setUser({ ...user, ...fetched }))
      } catch (error) {
        console.error('Failed to load profile', error)
      }
    }
    loadProfile()
  }, [dispatch, user?.id])

  useEffect(() => {
    const loadUnreadCount = async () => {
      try {
        const res = await api.get('/notifications?limit=200')
        const list = res.data?.notifications || []
        const unread = list.filter((n: any) => !n.read).length
        setUnreadCount(unread)
      } catch (error) {
        console.error('Failed to load notifications', error)
      }
    }
    loadUnreadCount()
    const interval = setInterval(loadUnreadCount, 30000)
    return () => clearInterval(interval)
  }, [])

  return (
    <>
      {/* ===== Top Heading ===== */}
      <Header>
        <div className='ms-auto flex items-center space-x-4'>
          <Search />
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>

      {/* ===== Main ===== */}
      <Main>
        <div className='mb-2 flex items-center justify-between space-y-2'>
          <h1 className='text-2xl font-bold tracking-tight'>Dashboard</h1>
          <div className='flex items-center space-x-2'>
            {isVendor && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant='outline' className='border-slate-200 bg-white'>
                    <PlugZap className='h-4 w-4 text-indigo-600' />
                    Apps{connectedAppIds.length ? ` (${connectedAppIds.length})` : ''}
                    <ChevronDown className='h-4 w-4 text-slate-500' />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align='end' className='w-72'>
                  <DropdownMenuLabel>Sellerslogin Toolkit</DropdownMenuLabel>
                  <DropdownMenuItem asChild>
                    <Link to='/integrations' className='flex items-center gap-2'>
                      <Store className='h-4 w-4' />
                      <span>Open Toolkit Store</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {connectedAppIds.length ? (
                    connectedAppIds.map((providerId) => (
                      <DropdownMenuItem key={providerId} asChild>
                        <Link
                          to='/integrations/$provider'
                          params={{ provider: providerId }}
                          className='flex items-center gap-2'
                        >
                          <span className='font-medium'>
                            {INTEGRATION_PROVIDER_META[providerId].title}
                          </span>
                          <span className='ml-auto text-xs text-slate-500'>
                            {INTEGRATION_PROVIDER_META[providerId].category}
                          </span>
                        </Link>
                      </DropdownMenuItem>
                    ))
                  ) : (
                    <DropdownMenuItem disabled>
                      No connected apps yet
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to='/integrations' className='flex items-center gap-2'>
                      <span>Browse all apps</span>
                      <ExternalLink className='ml-auto h-4 w-4' />
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <Button>Download</Button>
          </div>
        </div>
        <Tabs
          orientation='vertical'
          value={activeTab}
          onValueChange={(value) =>
            setActiveTab(value as 'overview' | 'analytics' | 'reports' | 'notifications')
          }
          className='space-y-4'
        >
          <div className='w-full overflow-x-auto pb-2'>
            <TabsList>
              <TabsTrigger value='overview'>Overview</TabsTrigger>
              <TabsTrigger value='analytics'>Analytics</TabsTrigger>
              <TabsTrigger value='reports'>Reports</TabsTrigger>
              <TabsTrigger value='notifications'>
                Notifications{unreadCount > 0 ? ` (${unreadCount})` : ''}
              </TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value='overview' className='space-y-4'>
            <VendorDashboard />
          </TabsContent>
          <TabsContent value='analytics' className='space-y-4'>
            <Analytics />
          </TabsContent>
          <TabsContent value='reports' className='space-y-4'>
            <Reports />
          </TabsContent>
          <TabsContent value='notifications' className='space-y-4'>
            <Notifications />
          </TabsContent>
        </Tabs>
      </Main>
    </>
  )
}
