/* eslint-disable no-duplicate-imports */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { getRouteApi } from '@tanstack/react-router'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { Input } from '@/components/ui/input'
import { UsersDialogs } from './components/users-dialogs'
import { UsersProvider } from './components/users-provider'
import { UsersTable } from './components/users-table'
import { useEffect } from 'react'

import { useDispatch } from 'react-redux'

import { fetchAllVendors } from '@/store/slices/admin/vendorSlice'
import { type AppDispatch } from '@/store'
import { useSelector } from 'react-redux'



const route = getRouteApi('/_authenticated/vendor/')

export default function Vendor() {
  const search = route.useSearch() as Record<string, unknown>
  const navigate = route.useNavigate()
  const dispatch =useDispatch<AppDispatch>()
  useEffect(() => {
    dispatch(fetchAllVendors())
  }, 
  [dispatch])

  const users = useSelector((state: any) => state.vendors.vendors)
  return (
    <UsersProvider>
      <Header fixed>
        <div className='flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
          <div className='text-lg font-semibold tracking-tight'>Vendor</div>
          <Input
            placeholder='Filter users...'
            value={typeof search.username === 'string' ? search.username : ''}
            onChange={(event) =>
              navigate({
                search: (prev: Record<string, unknown>) => ({
                  ...prev,
                  username: event.target.value || undefined,
                  page: 1,
                }),
              })
            }
            className='h-9 w-full sm:max-w-xs'
          />
        </div>
        <div className='ms-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>

      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <UsersTable data={users} search={search} navigate={navigate} />
      </Main>

      <UsersDialogs />
    </UsersProvider>
  )
}
