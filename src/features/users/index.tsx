import { getRouteApi } from '@tanstack/react-router'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { UsersDialogs } from './components/users-dialogs'
import { UsersProvider } from './components/users-provider'
import { UsersTable } from './components/users-table'
import { useEffect, useState } from 'react'
import api from '@/lib/axios'
import axios from 'axios'

import { useSelector } from 'react-redux'
import { type User } from './data/schema'

const route = getRouteApi('/_authenticated/users/')

export function Users() {
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const token = useSelector((state: any) => state.auth?.token)
  const role = useSelector((state: any) => state.auth?.user?.role)
  const [data, setData] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchUsers = async () => {
      if (!token) return
      setLoading(true)
      setError(null)
      try {
        const res =
          role === 'vendor'
            ? await api.get('/customers')
            : await axios.get(`${import.meta.env.VITE_PUBLIC_API_URL}/v1/users/getall`, {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              })

        const users = role === 'vendor'
          ? (res.data?.customers ?? [])
          : (res.data?.users ?? [])
        const mapped: User[] = users.map((user: any) => {
          const name = String(user?.name || '').trim()
          const nameParts = name.split(/\s+/).filter(Boolean)
          const firstName = nameParts[0] || ''
          const lastName = nameParts.slice(1).join(' ')
          const email = String(user?.email || '')
          const username = email ? email.split('@')[0] : firstName || 'user'
          const status = user?.is_active ? 'active' : 'inactive'
          const roleValue = user?.source === 'template' ? 'template_customer' : (user?.role || 'customer')

          return {
            id: String(user?._id || user?.id || ''),
            firstName,
            lastName,
            username,
            email,
            phoneNumber: String(user?.phone || ''),
            status,
            role: roleValue,
            createdAt: user?.createdAt || new Date().toISOString(),
            updatedAt: user?.updatedAt || new Date().toISOString(),
          }
        })

        setData(mapped)
      } catch (err: any) {
        setError(err?.response?.data?.message || 'Failed to load users')
        setData([])
      } finally {
        setLoading(false)
      }
    }

    fetchUsers()
  }, [token, role])

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
            <h2 className='text-2xl font-bold tracking-tight'>
              {role === 'vendor' ? 'Customer List' : 'User List'}
            </h2>
            <p className='text-muted-foreground'>
              {role === 'vendor'
                ? 'Customers who bought your products.'
                : 'Manage your users and their roles here.'}
            </p>
            {loading && (
              <p className='text-sm text-muted-foreground'>Loading users...</p>
            )}
            {error && <p className='text-sm text-red-500'>{error}</p>}
          </div>
        </div>
        <UsersTable data={data} search={search} navigate={navigate} />
      </Main>

      <UsersDialogs />
    </UsersProvider>
  )
}
