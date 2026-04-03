/* eslint-disable no-duplicate-imports */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { getRouteApi } from '@tanstack/react-router'
import { RefreshCcw, Search } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { Button } from '@/components/ui/button'
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
        <div className='flex w-full items-center justify-center gap-4'>
          <div className='relative w-full max-w-xl'>
            <Search className='pointer-events-none absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
            <Input
              placeholder='Find vendors by name, email, or phone'
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
              className='h-14 rounded-full border-border/70 bg-background/80 pl-12 pr-5 text-sm shadow-sm'
            />
          </div>
          <Button
            type='button'
            variant='outline'
            className='h-11 shrink-0 gap-2'
            onClick={() => dispatch(fetchAllVendors())}
          >
            <RefreshCcw className='h-4 w-4' />
            Refresh
          </Button>
        </div>
      </Header>

      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <UsersTable data={users} search={search} navigate={navigate} />
      </Main>

      <UsersDialogs />
    </UsersProvider>
  )
}
