import { Link, useNavigate } from '@tanstack/react-router'
import { type AppDispatch } from '@/store'
import { logout } from '@/store/slices/authSlice'
import {
  BadgeCheck,
  Bell,
  ChevronsUpDown,
  CreditCard,
  LogOut,
  Sparkles,
} from 'lucide-react'
import { useDispatch } from 'react-redux'
import { useState } from 'react'
import { useSelector } from 'react-redux'
import useDialogState from '@/hooks/use-dialog-state'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
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
import { SignOutDialog } from '@/components/sign-out-dialog'

export function NavUser() {
  const { setHoverLock, setOpen } = useSidebar()
  const [dialogOpen, setDialogOpen] = useDialogState()
  const [menuOpen, setMenuOpen] = useState(false)
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const user = useSelector((state: any) => state.auth.user)
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
                className='bg-white/80 shadow-sm ring-1 ring-rose-100 backdrop-blur-sm transition-all hover:bg-amber-50 data-[state=open]:bg-rose-100 data-[state=open]:text-rose-900'
              >
                <Avatar className='h-8 w-8 rounded-lg'>
                  <AvatarImage src={user?.avatar} alt={user?.name} />
                  <AvatarFallback className='rounded-lg'>SN</AvatarFallback>
                </Avatar>
                <div className='grid flex-1 text-start text-sm leading-tight'>
                  <span className='truncate font-semibold'>{user?.name}</span>
                  <span className='truncate text-xs'>{user?.email}</span>
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
                    <AvatarImage src={user?.avatar} alt={user?.name} />
                    <AvatarFallback className='rounded-lg'>SN</AvatarFallback>
                  </Avatar>
                  <div className='grid flex-1 text-start text-sm leading-tight'>
                    <span className='truncate font-semibold'>{user?.name}</span>
                    <span className='truncate text-xs'>{user?.email}</span>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem>
                  <Sparkles />
                  Upgrade to Pro
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem asChild>
                  <Link to='/'>
                    <BadgeCheck />
                    Account
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to='/'>
                    <CreditCard />
                    Billing
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to='/'>
                    <Bell />
                    Notifications
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      <SignOutDialog open={!!dialogOpen} onOpenChange={setDialogOpen} />
    </>
  )
}
