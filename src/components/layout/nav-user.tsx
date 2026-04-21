import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { type AppDispatch, type RootState } from '@/store'
import api from '@/lib/axios'
import { getImageUrl } from '@/lib/utils'
import { logout } from '@/store/slices/authSlice'
import { fetchVendorProfile } from '@/store/slices/vendor/profileSlice'
import { ChevronsUpDown, Crown, KeyRound, LogOut, UserRound } from 'lucide-react'
import { useDispatch, useSelector } from 'react-redux'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'

type VendorProfileLike = {
  name?: string
  email?: string
  avatar?: string
  business_name?: string
  businessName?: string
  subscription?: {
    current_plan?: string
    status?: string
  } | null
}

export function NavUser() {
  const { setHoverLock, setOpen } = useSidebar()
  const [menuOpen, setMenuOpen] = useState(false)
  const [premiumActive, setPremiumActive] = useState(false)
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const user = useSelector((state: RootState) => state.auth.user)
  const vendorProfileState = useSelector((state: RootState) => state.vendorprofile)
  const profileData = vendorProfileState?.profile || null
  const nestedProfile = profileData as
    | {
        vendor?: VendorProfileLike | null
        data?: VendorProfileLike | null
      }
    | null
  const flatProfile = profileData as VendorProfileLike | null
  const vendorProfile: VendorProfileLike | null =
    nestedProfile?.vendor ||
    nestedProfile?.data ||
    flatProfile ||
    null
  const isVendor = String(user?.role || '').toLowerCase() === 'vendor'
  const isVendorTeamUser =
    isVendor && String(user?.account_type || '').toLowerCase() === 'vendor_user'
  const vendorLoading = Boolean(vendorProfileState?.loading)
  const isPremiumVendor =
    isVendor &&
    !isVendorTeamUser &&
    (premiumActive ||
      (Boolean(vendorProfile?.subscription?.current_plan === 'premium') &&
        Boolean(vendorProfile?.subscription?.status === 'active')))
  const companyName = String(
    vendorProfile?.business_name ||
      vendorProfile?.businessName ||
      user?.business_name ||
      user?.businessName ||
      ''
  ).trim()
  const displayName = String(
    (isPremiumVendor ? companyName : '') ||
      (isVendorTeamUser ? user?.name : vendorProfile?.name) ||
      user?.name ||
      user?.business_name ||
      user?.businessName ||
      user?.email ||
      ''
  ).trim()
  const displayEmail = String(
    (isVendorTeamUser ? user?.email : vendorProfile?.email) || user?.email || ''
  ).trim()
  const userInitials = displayName
    .split(/[\s._-]+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase())
    .filter(Boolean)
    .slice(0, 2)
    .join('')
  const fallbackInitials =
    userInitials ||
    displayName
      .replace(/[^a-zA-Z0-9]/g, '')
      .slice(0, 2)
      .toUpperCase() ||
    'V'
  const avatarCandidate =
    (isVendorTeamUser ? user?.avatar : vendorProfile?.avatar) ||
    vendorProfile?.avatar ||
    user?.avatar
  const avatarSrc = getImageUrl(avatarCandidate)

  useEffect(() => {
    if (!isVendor || vendorLoading || vendorProfile) return
    dispatch(fetchVendorProfile())
  }, [dispatch, isVendor, vendorLoading, vendorProfile])

  useEffect(() => {
    if (!isVendor || isVendorTeamUser) return

    const loadBillingSummary = async () => {
      try {
        const res = await api.get('/billing/summary')
        setPremiumActive(Boolean(res.data?.data?.plan?.is_premium_active))
      } catch {
        setPremiumActive(false)
      }
    }

    loadBillingSummary()
  }, [isVendor, isVendorTeamUser, user?.id])
  const handleLogout = () => {
    // 1. Clear Redux auth state
    dispatch(logout())

    // 2. Remove persisted token (optional if redux-persist is already doing this)
    localStorage.removeItem('persist:root') // if using redux-persist
    localStorage.removeItem('token') // if manually stored

    // 3. Redirect to login page
    navigate({ to: '/sign-in' })
  }

  const handleChangePassword = async () => {
    await navigate({ to: '/profile' })
    if (typeof window !== 'undefined') {
      window.location.hash = 'change-password'
      window.dispatchEvent(new HashChangeEvent('hashchange'))
    }
  }
  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu
            open={menuOpen}
            onOpenChange={(nextOpen) => {
              setMenuOpen(nextOpen)
              setHoverLock(nextOpen)
              if (nextOpen) {
                setOpen(true)
              }
            }}
          >
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size='lg'
                className={`ring-sidebar-border shadow-sm ring-1 transition-colors ${
                  isPremiumVendor
                    ? 'border border-amber-200 bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-100 hover:from-amber-100 hover:to-amber-200 data-[state=open]:from-amber-100 data-[state=open]:to-amber-200'
                    : 'bg-sidebar-accent/40 hover:bg-sidebar-accent data-[state=open]:bg-sidebar-accent'
                }`}
              >
                <Avatar className='h-8 w-8 rounded-lg'>
                  <AvatarImage
                    src={avatarSrc}
                    alt={displayName || user?.name}
                  />
                  <AvatarFallback className='rounded-lg'>
                    {fallbackInitials}
                  </AvatarFallback>
                </Avatar>
                <div className='grid flex-1 text-start text-sm leading-tight'>
                  <span
                    className={`truncate font-semibold ${
                      isPremiumVendor ? 'flex items-center gap-1 text-amber-600' : ''
                    }`}
                  >
                    {isPremiumVendor ? <Crown className='h-3.5 w-3.5 shrink-0 text-amber-500' /> : null}
                    <span className='truncate'>{displayName || user?.name}</span>
                  </span>
                  <span className='truncate text-xs'>
                    {displayEmail || user?.email}
                  </span>
                </div>
                <ChevronsUpDown className='ms-auto size-4' />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className='w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg'
              side='bottom'
              align='start'
              sideOffset={4}
            >
              <DropdownMenuLabel className='p-0 font-normal'>
                <div className='flex items-center gap-2 px-1 py-1.5 text-start text-sm'>
                  <Avatar className='h-8 w-8 rounded-lg'>
                    <AvatarImage
                      src={avatarSrc}
                      alt={displayName || user?.name}
                    />
                    <AvatarFallback className='rounded-lg'>
                      {fallbackInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div className='grid flex-1 text-start text-sm leading-tight'>
                    <span
                      className={`truncate font-semibold ${
                        isPremiumVendor ? 'flex items-center gap-1 text-amber-600' : ''
                      }`}
                    >
                      {isPremiumVendor ? <Crown className='h-3.5 w-3.5 shrink-0 text-amber-500' /> : null}
                      <span className='truncate'>{displayName || user?.name}</span>
                    </span>
                    <span className='truncate text-xs'>
                      {displayEmail || user?.email}
                    </span>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate({ to: '/profile' })}>
                <UserRound />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => void handleChangePassword()}>
                <KeyRound />
                Change Password
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
    </>
  )
}
