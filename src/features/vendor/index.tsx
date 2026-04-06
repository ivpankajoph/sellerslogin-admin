/* eslint-disable no-duplicate-imports */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { getRouteApi } from '@tanstack/react-router'
import { Main } from '@/components/layout/main'
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
    dispatch(fetchAllVendors({ search: search.username as string }))
  }, [dispatch, search.username])

  const users = useSelector((state: any) => state.vendors.vendors)
  return (
    <UsersProvider>

      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <UsersTable data={users} search={search} navigate={navigate} />
      </Main>

      <UsersDialogs />
    </UsersProvider>
  )
}
