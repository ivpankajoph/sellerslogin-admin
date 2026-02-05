/* eslint-disable no-duplicate-imports */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { getRouteApi } from '@tanstack/react-router'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { UsersDialogs } from './components/users-dialogs'
import { UsersPrimaryButtons } from './components/users-primary-buttons'
import { UsersProvider } from './components/users-provider'
import { UsersTable } from './components/users-table'
import { useEffect } from 'react'

import { useDispatch } from 'react-redux'

import { fetchAllVendors } from '@/store/slices/admin/vendorSlice'
import { type AppDispatch } from '@/store'
import { useSelector } from 'react-redux'



const route = getRouteApi('/_authenticated/vendor/')

export default function Vendor() {
  const search = route.useSearch()
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
        <Search />
        <div className='ms-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>

      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div className='flex flex-wrap items-end justify-between gap-2'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>Vendor List</h2>
            <p className='text-muted-foreground'>
              Manage your vendors here.
            </p>
          </div>
          <UsersPrimaryButtons />
        </div>
        <UsersTable data={users} search={search} navigate={navigate} />
      </Main>

      <UsersDialogs />
    </UsersProvider>
  )
}
