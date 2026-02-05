import { Button } from '@/components/ui/button'

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
import api from '@/lib/axios'
import { setUser } from '@/store/slices/authSlice'

export function Dashboard() {
  const dispatch = useDispatch()
  const user = useSelector((state: any) => state.auth.user)
  const [unreadCount, setUnreadCount] = useState(0)

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
            <Button>Download</Button>
          </div>
        </div>
        <Tabs
          orientation='vertical'
          defaultValue='overview'
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

