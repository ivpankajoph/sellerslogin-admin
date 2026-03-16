import { Link } from '@tanstack/react-router'
import { ChevronDown, ExternalLink, PlugZap, Sparkles, Store } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import VendorDashboard from './components/VendorDashboard'
import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useVendorIntegrations } from '@/context/vendor-integrations-provider'
import api from '@/lib/axios'
import {
  getInstalledProviderIds,
  INTEGRATION_PROVIDER_META,
} from '@/lib/vendor-integrations'
import type { RootState } from '@/store'
import { setUser } from '@/store/slices/authSlice'

export function Dashboard() {
  const dispatch = useDispatch()
  const user = useSelector((state: RootState) => state.auth.user)
  const { data: integrationData } = useVendorIntegrations()
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
        if (fetched) dispatch(setUser(fetched))
      } catch {
        return
      }
    }
    loadProfile()
  }, [dispatch, user?.id])

  return (
    <>
      {/* ===== Top Heading ===== */}
      <Header>
        <div className='flex flex-1 items-center justify-between gap-4'>
          <div className='min-w-0'>
            <h1 className='truncate text-xl font-bold tracking-tight text-foreground'>
              Dashboard
            </h1>
          </div>
          <div className='flex items-center space-x-4'>
            <div className='flex items-center space-x-2'>
              <Button variant='outline' asChild>
                <Link to='/template-workspace'>
                  <Sparkles className='h-4 w-4 text-primary' />
                  Create your website for free
                </Link>
              </Button>
              {isVendor && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant='outline'
                      className='border-slate-200 bg-white hover:border-primary hover:bg-primary hover:text-primary-foreground'
                    >
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
            </div>
            <ThemeSwitch />
            <ConfigDrawer />
            <ProfileDropdown />
          </div>
        </div>
      </Header>

      {/* ===== Main ===== */}
      <Main>
        <VendorDashboard />
      </Main>
    </>
  )
}
