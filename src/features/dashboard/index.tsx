import { Link } from '@tanstack/react-router'
import { ChevronDown, Crown, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { NotificationBell } from '@/components/notifications/notification-bell'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import VendorDashboard from './components/VendorDashboard'
import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import api from '@/lib/axios'
import type { RootState } from '@/store'
import { setUser } from '@/store/slices/authSlice'
import {

  normalizeVendorPageAccess,
} from '@/features/team-access/access-config'
import { UpgradePlanDialog } from './components/UpgradePlanDialog'
import type { BillingSummary } from '@/features/plans/shared'

export function Dashboard() {
  const dispatch = useDispatch()
  const user = useSelector((state: RootState) => state.auth.user)
  const effectiveRole = user?.role === 'superadmin' ? 'admin' : user?.role
  const isVendor = effectiveRole === 'vendor'
  const isVendorTeamUser =
    isVendor && String(user?.account_type || '').toLowerCase() === 'vendor_user'
  const pageAccess = normalizeVendorPageAccess(user?.page_access)
  const canAccessMyWebsites = isVendor && (!isVendorTeamUser || pageAccess.has('my_websites'))

  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false)
  const [billingSummary, setBillingSummary] = useState<BillingSummary | null>(null)

  useEffect(() => {
    if (isVendorTeamUser) return
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
  }, [dispatch, isVendorTeamUser, user?.id])

  useEffect(() => {
    if (!isVendor || isVendorTeamUser) return

    const loadBillingSummary = async () => {
      try {
        const res = await api.get('/billing/summary')
        setBillingSummary((res.data?.data || null) as BillingSummary | null)
      } catch {
        setBillingSummary(null)
      }
    }

    loadBillingSummary()
  }, [isVendor, isVendorTeamUser, user?.id])

  const handleConnectDomainClick = () => {
    if (typeof window === 'undefined') return
    window.location.assign('/template-workspace?openConnectDomain=1')
  }

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
              {canAccessMyWebsites ? (
                <Button variant='outline' asChild>
                  <Link to='/template-workspace'>
                    <Sparkles className='h-4 w-4 text-primary' />
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
                <DropdownMenuContent align='end' className='min-w-[200px]'>
                  <DropdownMenuItem onClick={handleConnectDomainClick}>
                    Connect Domain
                  </DropdownMenuItem>
                  <DropdownMenuItem>Book Domain</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              {isVendor && !isVendorTeamUser ? (
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
            <NotificationBell />
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

      {isVendor && !isVendorTeamUser ? (
        <UpgradePlanDialog
          open={upgradeDialogOpen}
          onOpenChange={setUpgradeDialogOpen}
          userName={user?.name}
          userEmail={user?.email}
          onPlanActivated={async () => {
            try {
              const res = await api.get('/billing/summary')
              setBillingSummary((res.data?.data || null) as BillingSummary | null)
            } catch {
              return
            }
          }}
        />
      ) : null}
    </>
  )
}
