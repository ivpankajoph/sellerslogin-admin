import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { type AppDispatch } from '@/store'
import { logout } from '@/store/slices/authSlice'
import { fetchVendorProfile } from '@/store/slices/vendor/profileSlice'
import { ChevronsUpDown, LogOut, UserRound } from 'lucide-react'
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

export function NavUser() {
  const { setHoverLock, setOpen } = useSidebar()
  const [menuOpen, setMenuOpen] = useState(false)
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
  const vendorLoading = Boolean(vendorProfileState?.loading)
  const displayName = String(
    vendorProfile?.name ||
      user?.name ||
      user?.business_name ||
      user?.businessName ||
      user?.email ||
      ''
  ).trim()
  const displayEmail = String(vendorProfile?.email || user?.email || '').trim()
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
  const avatarCandidate = vendorProfile?.avatar || user?.avatar
  const avatarSrc =
    avatarCandidate && String(avatarCandidate).trim()
      ? String(avatarCandidate)
      : undefined

  useEffect(() => {
    if (!isVendor || vendorLoading || vendorProfile) return
    dispatch(fetchVendorProfile())
  }, [dispatch, isVendor, vendorLoading, vendorProfile])
  const handleLogout = () => {
    // 1. Clear Redux auth state
    dispatch(logout())

    // 2. Remove persisted token (optional if redux-persist is already doing this)
    localStorage.removeItem('persist:root') // if using redux-persist
    localStorage.removeItem('token') // if manually stored

    // 3. Redirect to login page
    navigate({ to: '/sign-in' })
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
                className='bg-sidebar-accent/40 ring-sidebar-border hover:bg-sidebar-accent data-[state=open]:bg-sidebar-accent shadow-sm ring-1 transition-colors'
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
                  <span className='truncate font-semibold'>
                    {displayName || user?.name}
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
                    <span className='truncate font-semibold'>
                      {displayName || user?.name}
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
