import { useEffect, useMemo, useState } from 'react'
import { getRouteApi } from '@tanstack/react-router'
import axios from 'axios'
import { useSelector } from 'react-redux'
import api from '@/lib/axios'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { StatisticsDialog } from '@/components/data-table/statistics-dialog'
import { TablePageHeader } from '@/components/data-table/table-page-header'
import { Main } from '@/components/layout/main'
import { UsersDialogs } from './components/users-dialogs'
import { UsersProvider } from './components/users-provider'
import { UsersTable } from './components/users-table'
import { type User } from './data/schema'

const route = getRouteApi('/_authenticated/users/')

type WebsiteOption = {
  id: string
  label: string
}

export function Users() {
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const token = useSelector((state: any) => state.auth?.token)
  const role = useSelector((state: any) => state.auth?.user?.role)
  const authUser = useSelector((state: any) => state.auth?.user)
  const vendorId = String(authUser?._id || authUser?.id || '')
  const [data, setData] = useState<User[]>([])
  const [websiteOptions, setWebsiteOptions] = useState<WebsiteOption[]>([])
  const [selectedWebsiteId, setSelectedWebsiteId] = useState('all')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filterValue, setFilterValue] = useState(String(search.username || ''))
  const [statsOpen, setStatsOpen] = useState(false)
  const shouldShowWebsiteFilter =
    role === 'vendor' || role === 'admin' || role === 'superadmin'

  const fetchUsers = async () => {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const isVendor = role === 'vendor'
      const endpoint = isVendor ? '/vendor/customers' : '/users/getall'
      const res = await api.get(endpoint, {
        params:
          selectedWebsiteId !== 'all'
            ? { website_id: selectedWebsiteId }
            : undefined,
      })

      const users = isVendor
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
        const roleValue =
          user?.source === 'template'
            ? 'template_customer'
            : user?.role || 'customer'
        const vendorName = String(
          user?.vendor_name ||
            user?.vendor_business_name ||
            user?.vendor_email ||
            ''
        ).trim()
        const websiteName = String(
          user?.website_name ||
            user?.source_website_name ||
            user?.website_slug ||
            ''
        ).trim()

        return {
          id: String(user?._id || user?.id || ''),
          firstName,
          lastName,
          username,
          email,
          phoneNumber: String(user?.phone || ''),
          status,
          role: roleValue,
          source: String(user?.source || ''),
          vendorId: String(user?.vendor_id || ''),
          vendorName,
          websiteId: String(user?.website_id || ''),
          websiteName,
          websiteType: String(user?.website_type || ''),
          isMainWebsite: Boolean(user?.is_main_website),
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

  useEffect(() => {
    setFilterValue(String(search.username || ''))
  }, [search.username])

  useEffect(() => {
    const timer = setTimeout(() => {
      const current = String(search.username || '')
      if (filterValue === current) {
        return
      }
      navigate({
        search: (prev) => ({
          ...prev,
          username: filterValue,
          page: 1,
        }),
      })
    }, 300)
    return () => clearTimeout(timer)
  }, [filterValue, navigate, search.username])

  useEffect(() => {
    fetchUsers()
  }, [token, role, selectedWebsiteId])

  useEffect(() => {
    if (!token || !shouldShowWebsiteFilter) {
      setWebsiteOptions([])
      setSelectedWebsiteId('all')
      return
    }

    if (role === 'vendor' && !vendorId) {
      setWebsiteOptions([])
      return
    }

    const fetchWebsiteOptions = async () => {
      try {
        const res = await axios.get(
          `${import.meta.env.VITE_PUBLIC_API_URL}/v1/templates/by-vendor`,
          {
            params: {
              ...(role === 'vendor' ? { vendor_id: vendorId } : {}),
              ...(role !== 'vendor'
                ? { include_main_website: 'true' }
                : {}),
            },
            headers: token
              ? {
                  Authorization: `Bearer ${token}`,
                }
              : undefined,
          }
        )

        const nextOptions: WebsiteOption[] = Array.isArray(res.data?.data)
          ? res.data.data
              .map((website: any) => {
                const websiteName = String(
                  website?.name ||
                    website?.business_name ||
                    website?.website_slug ||
                    website?.template_name ||
                    website?.template_key ||
                    'Website'
                ).trim()
                const vendorName = String(
                  website?.vendor_name ||
                    website?.vendor_business_name ||
                    website?.vendor_email ||
                    ''
                ).trim()

                return {
                  id: String(website?._id || website?.id || '').trim(),
                  label:
                    role === 'vendor' || !vendorName
                      ? websiteName
                      : `${websiteName} - ${vendorName}`,
                }
              })
              .filter((website: WebsiteOption) => website.id)
          : []

        setWebsiteOptions(nextOptions)
        setSelectedWebsiteId((current) =>
          current !== 'all' &&
          !nextOptions.some((website) => website.id === current)
            ? 'all'
            : current
        )
      } catch {
        setWebsiteOptions([])
        setSelectedWebsiteId('all')
      }
    }

    fetchWebsiteOptions()
  }, [token, role, vendorId, shouldShowWebsiteFilter])

  const activeUsers = useMemo(
    () => data.filter((user) => user.status === 'active').length,
    [data]
  )
  const inactiveUsers = useMemo(
    () => data.filter((user) => user.status !== 'active').length,
    [data]
  )
  const templateCustomers = useMemo(
    () => data.filter((user) => user.role === 'template_customer').length,
    [data]
  )
  const directCustomers = useMemo(
    () => data.filter((user) => user.role === 'customer').length,
    [data]
  )
  const adminUsers = useMemo(
    () =>
      data.filter((user) => ['admin', 'superadmin'].includes(String(user.role)))
        .length,
    [data]
  )
  const uniqueRoles = useMemo(
    () =>
      new Set(data.map((user) => String(user.role || '')).filter(Boolean)).size,
    [data]
  )

  const statsItems =
    role === 'vendor'
      ? [
          {
            label: 'Total Customers',
            value: data.length,
            helper: 'Customers in this list.',
          },
          { label: 'Active', value: activeUsers, helper: 'Marked as active.' },
          {
            label: 'Inactive',
            value: inactiveUsers,
            helper: 'Need attention or follow-up.',
          },
          {
            label: 'Template Customers',
            value: templateCustomers,
            helper: 'Bought via template storefronts.',
          },
          {
            label: 'Direct Customers',
            value: directCustomers,
            helper: 'Bought from the main storefront.',
          },
          {
            label: 'Roles Present',
            value: uniqueRoles,
            helper: 'Distinct role types in current data.',
          },
        ]
      : [
          {
            label: 'Total Users',
            value: data.length,
            helper: 'Users returned by the current source.',
          },
          {
            label: 'Active',
            value: activeUsers,
            helper: 'Users currently active.',
          },
          {
            label: 'Inactive',
            value: inactiveUsers,
            helper: 'Users marked inactive.',
          },
          {
            label: 'Customers',
            value: directCustomers,
            helper: 'Standard customer accounts.',
          },
          {
            label: 'Template Customers',
            value: templateCustomers,
            helper: 'Template storefront customers.',
          },
          {
            label: 'Admins',
            value: adminUsers,
            helper: 'Admin and superadmin accounts.',
          },
        ]

  return (
    <UsersProvider>
      <TablePageHeader
        title={role === 'vendor' ? 'Customer List' : 'User List'}
      >
        {websiteOptions.length ? (
          <Select
            value={selectedWebsiteId}
            onValueChange={setSelectedWebsiteId}
          >
            <SelectTrigger className='h-10 w-56 shrink-0'>
              <SelectValue placeholder='All websites' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>All websites</SelectItem>
              {websiteOptions.map((website) => (
                <SelectItem key={website.id} value={website.id}>
                  {website.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
        <Input
          value={filterValue}
          onChange={(event) => setFilterValue(event.target.value)}
          placeholder='Filter users...'
          className='h-10 w-64 shrink-0'
        />
        <Button
          variant='outline'
          className='shrink-0'
          onClick={() => setStatsOpen(true)}
        >
          Statistics
        </Button>
        <Button
          variant='outline'
          className='shrink-0'
          onClick={fetchUsers}
          disabled={loading}
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </Button>
      </TablePageHeader>

      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div className='flex flex-col gap-2'>
          {loading && (
            <p className='text-muted-foreground text-sm'>Loading users...</p>
          )}
          {error && <p className='text-sm text-red-500'>{error}</p>}
        </div>
        <UsersTable data={data} search={search} navigate={navigate} />
      </Main>

      <StatisticsDialog
        open={statsOpen}
        onOpenChange={setStatsOpen}
        title={role === 'vendor' ? 'Customer statistics' : 'User statistics'}
        description='Summary for the current list.'
        items={statsItems}
      />
      <UsersDialogs />
    </UsersProvider>
  )
}
