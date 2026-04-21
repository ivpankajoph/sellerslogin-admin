import { useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { type AppDispatch } from '@/store'
import { logout } from '@/store/slices/authSlice'
import { fetchVendorProfile } from '@/store/slices/vendor/profileSlice'
import { getImageUrl } from '@/lib/utils'
import { KeyRound, UserRound } from 'lucide-react'
import { useDispatch, useSelector } from 'react-redux'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function ProfileDropdown() {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const user = useSelector((state: any) => state.auth.user)
  const vendorProfileState = useSelector((state: any) => state.vendorprofile)
  const vendorProfile =
    vendorProfileState?.profile?.vendor ||
    vendorProfileState?.profile?.data ||
    vendorProfileState?.profile ||
    null
  const isVendor = String(user?.role || '').toLowerCase() === 'vendor'
  const isVendorTeamUser =
    isVendor && String(user?.account_type || '').toLowerCase() === 'vendor_user'
  const vendorLoading = Boolean(vendorProfileState?.loading)
  const displayName = String(
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

  const handleLogout = () => {
    dispatch(logout())

    localStorage.removeItem('persist:root')
    localStorage.removeItem('token')

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
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant='ghost' className='relative h-8 w-8 rounded-full'>
            <Avatar className='h-8 w-8'>
              <AvatarImage src={avatarSrc} alt={displayName || 'profile'} />
              <AvatarFallback>{fallbackInitials}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className='w-56' align='end' forceMount>
          <DropdownMenuLabel className='font-normal'>
            <div className='flex flex-col gap-1.5'>
              <p className='text-sm leading-none font-medium'>
                {displayName || user?.name}
              </p>
              <p className='text-muted-foreground text-xs leading-none'>
                {displayEmail || user?.email}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => navigate({ to: '/profile' })}>
            <UserRound />
            Profile
            <DropdownMenuShortcut>Ctrl+P</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => void handleChangePassword()}>
            <KeyRound />
            Change Password
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout}>
            Sign out
            <DropdownMenuShortcut>Shift+Ctrl+Q</DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )
}
