import { useEffect, useMemo, useState } from 'react'
import { Link, getRouteApi } from '@tanstack/react-router'
import axios from 'axios'
import { useSelector } from 'react-redux'

import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ConfigDrawer } from '@/components/config-drawer'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatINR } from '@/lib/currency'

type UserDetailsResponse = {
  user?: any
  addresses?: any[]
  orders?: any[]
  summary?: {
    totalOrders?: number
    totalSpend?: number
    totalItems?: number
    lastOrderAt?: string
    currency?: string
  }
}

const route = getRouteApi('/_authenticated/users/$userId')

export function UserDetails() {
  const { userId } = route.useParams()
  const token = useSelector((state: any) => state.auth?.token)
  const role = useSelector((state: any) => state.auth?.user?.role)
  const [data, setData] = useState<UserDetailsResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null)

  useEffect(() => {
    const fetchDetails = async () => {
      if (!token) return
      const isAdmin = role === 'admin' || role === 'superadmin'
      const isVendor = role === 'vendor'
      if (!isAdmin && !isVendor) {
        setError('You do not have access to view user details.')
        return
      }
      setLoading(true)
      setError(null)
      try {
        const url = isVendor
          ? `${import.meta.env.VITE_PUBLIC_API_URL}/v1/vendor/customers/${userId}/details`
          : `${import.meta.env.VITE_PUBLIC_API_URL}/v1/users/admin/${userId}/details`
        const res = await axios.get(
          url,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        )
        setData(res.data || {})
      } catch (err: any) {
        setError(err?.response?.data?.message || 'Failed to load user details')
      } finally {
        setLoading(false)
      }
    }

    fetchDetails()
  }, [token, role, userId])

  const summary = data?.summary || {}
  const orders = data?.orders || []
  const addresses = data?.addresses || []
  const user = data?.user || {}

  const orderTotal = (order: any) => formatINR(order?.total || order?.subtotal || 0)

  const spendLabel = useMemo(
    () => formatINR(summary.totalSpend, { maximumFractionDigits: 2 }),
    [summary.totalSpend],
  )

  const country =
    user.country ||
    addresses.find((address) => address?.country)?.country ||
    'Unknown'

  return (
    <>
      <Header fixed>
        <Search />
        <div className='ms-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>

      <Main className='flex flex-1 flex-col gap-6'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>User Details</h2>
            <p className='text-muted-foreground'>
              Full history, orders, and personal info for this user.
            </p>
          </div>
          <Button variant='outline' className='bg-green-500 text-white hover:bg-green-600' asChild>
            <Link to='/users'>Back to Users</Link>
          </Button>
        </div>

        {loading && <p className='text-sm text-muted-foreground'>Loading...</p>}
        {error && <p className='text-sm text-red-500'>{error}</p>}

        {!loading && !error && (
          <div className='grid gap-6 lg:grid-cols-[1.2fr_1fr]'>
            <div className='grid gap-6'>
              <Card>
                <CardHeader>
                  <CardTitle>Profile</CardTitle>
                  <CardDescription>Personal and contact information.</CardDescription>
                </CardHeader>
                <CardContent className='grid gap-4 text-sm'>
                  <div className='grid gap-1'>
                    <p className='text-muted-foreground'>Name</p>
                    <p className='font-medium'>{user.name || '—'}</p>
                  </div>
                  <div className='grid gap-1'>
                    <p className='text-muted-foreground'>Email</p>
                    <p className='font-medium'>{user.email || '—'}</p>
                  </div>
                  <div className='grid gap-1'>
                    <p className='text-muted-foreground'>Phone</p>
                    <p className='font-medium'>{user.phone || '—'}</p>
                  </div>
                  <div className='grid gap-1'>
                    <p className='text-muted-foreground'>Country</p>
                    <p className='font-medium'>{country}</p>
                  </div>
                  <div className='grid gap-1'>
                    <p className='text-muted-foreground'>Status</p>
                    <Badge variant='outline' className='w-fit capitalize'>
                      {user.is_active ? 'active' : 'inactive'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Orders</CardTitle>
                  <CardDescription>Complete order history.</CardDescription>
                </CardHeader>
                <CardContent>
                  {orders.length === 0 ? (
                    <p className='text-sm text-muted-foreground'>
                      No orders found for this user.
                    </p>
                  ) : (
                    <div className='overflow-hidden rounded-md border'>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Order #</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Payment</TableHead>
                            <TableHead className='text-right'>Total</TableHead>
                            <TableHead className='text-right'>Date</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {orders.map((order: any) => (
                            <TableRow key={order._id || order.id}>
                              <TableCell className='font-medium'>
                                <button
                                  type='button'
                                  onClick={() => setSelectedOrder(order)}
                                  className='text-left text-foreground hover:text-primary underline-offset-2 hover:underline'
                                >
                                  {order.order_number || '—'}
                                </button>
                              </TableCell>
                              <TableCell className='capitalize'>
                                {order.status || '—'}
                              </TableCell>
                              <TableCell className='capitalize'>
                                {order.payment_status || '—'}
                              </TableCell>
                              <TableCell className='text-right'>
                                {orderTotal(order)}
                              </TableCell>
                              <TableCell className='text-right'>
                                {order.createdAt
                                  ? new Date(order.createdAt).toLocaleDateString()
                                  : '—'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className='grid gap-6'>
              <Card>
                <CardHeader>
                  <CardTitle>Summary</CardTitle>
                  <CardDescription>Spending and order totals.</CardDescription>
                </CardHeader>
                <CardContent className='grid gap-4 text-sm'>
                  <div className='grid gap-1'>
                    <p className='text-muted-foreground'>Total Orders</p>
                    <p className='text-2xl font-semibold'>
                      {summary.totalOrders ?? 0}
                    </p>
                  </div>
                  <div className='grid gap-1'>
                    <p className='text-muted-foreground'>Total Spend</p>
                    <p className='text-2xl font-semibold'>{spendLabel}</p>
                  </div>
                  <div className='grid gap-1'>
                    <p className='text-muted-foreground'>Total Items</p>
                    <p className='text-2xl font-semibold'>
                      {summary.totalItems ?? 0}
                    </p>
                  </div>
                  <div className='grid gap-1'>
                    <p className='text-muted-foreground'>Last Order</p>
                    <p className='font-medium'>
                      {summary.lastOrderAt
                        ? new Date(summary.lastOrderAt).toLocaleDateString()
                        : '—'}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Addresses</CardTitle>
                  <CardDescription>Saved shipping addresses.</CardDescription>
                </CardHeader>
                <CardContent className='grid gap-3 text-sm'>
                  {addresses.length === 0 ? (
                    <p className='text-sm text-muted-foreground'>
                      No saved addresses.
                    </p>
                  ) : (
                    addresses.map((address: any) => (
                      <div
                        key={address._id || address.id}
                        className='rounded-lg border p-3'
                      >
                        <div className='flex items-center justify-between'>
                          <p className='font-medium'>
                            {address.label || 'Address'}
                          </p>
                          {address.is_default && (
                            <Badge variant='outline'>Default</Badge>
                          )}
                        </div>
                        <p className='text-muted-foreground'>
                          {address.full_name || '—'}
                        </p>
                        <p className='text-muted-foreground'>
                          {address.line1}
                          {address.line2 ? `, ${address.line2}` : ''}
                        </p>
                        <p className='text-muted-foreground'>
                          {address.city}, {address.state} {address.pincode}
                        </p>
                        <p className='text-muted-foreground'>
                          {address.country}
                        </p>
                        <p className='text-muted-foreground'>
                          {address.phone}
                        </p>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </Main>

      <Dialog
        open={Boolean(selectedOrder)}
        onOpenChange={(open) => {
          if (!open) setSelectedOrder(null)
        }}
      >
        <DialogContent className='max-w-3xl'>
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
            <DialogDescription>
              {selectedOrder?.order_number
                ? `Order #${selectedOrder.order_number}`
                : 'Order information'}
            </DialogDescription>
          </DialogHeader>

          {!selectedOrder ? null : (
            <div className='space-y-6 text-sm'>
              <div className='grid gap-3 sm:grid-cols-3'>
                <div>
                  <p className='text-muted-foreground'>Status</p>
                  <p className='font-medium capitalize'>
                    {selectedOrder.status || '—'}
                  </p>
                </div>
                <div>
                  <p className='text-muted-foreground'>Payment</p>
                  <p className='font-medium capitalize'>
                    {selectedOrder.payment_status || '—'}
                  </p>
                </div>
                <div>
                  <p className='text-muted-foreground'>Date</p>
                  <p className='font-medium'>
                    {selectedOrder.createdAt
                      ? new Date(selectedOrder.createdAt).toLocaleString()
                      : '—'}
                  </p>
                </div>
              </div>

              <div className='space-y-3'>
                <p className='text-sm font-semibold'>Items</p>
                <div className='max-h-[320px] space-y-3 overflow-y-auto pr-2'>
                  {(selectedOrder.items || []).map((item: any) => (
                    <div
                      key={item.product_id || item._id}
                      className='flex gap-3 rounded-lg border p-3'
                    >
                      <div className='h-12 w-12 overflow-hidden rounded-md bg-slate-100'>
                        <img
                          src={item.image_url || '/placeholder.png'}
                          alt={item.product_name || 'Product'}
                          className='h-full w-full object-cover'
                        />
                      </div>
                      <div className='flex flex-1 items-start justify-between gap-3'>
                        <div className='min-w-0'>
                          <p className='font-medium text-slate-900 line-clamp-2'>
                            {item.product_name || 'Product'}
                          </p>
                          <p className='text-xs text-muted-foreground'>
                            {Object.values(item.variant_attributes || {}).join(
                              ' / '
                            )}
                          </p>
                          <p className='text-xs text-muted-foreground'>
                            Qty: {item.quantity || 0}
                          </p>
                        </div>
                        <div className='text-sm font-semibold whitespace-nowrap'>
                          {formatINR(item.total_price)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className='grid gap-3 sm:grid-cols-2'>
                <div className='rounded-lg border p-3'>
                  <p className='text-sm font-semibold'>Shipping address</p>
                  <p className='text-sm'>
                    {selectedOrder.shipping_address?.line1}
                    {selectedOrder.shipping_address?.line2
                      ? `, ${selectedOrder.shipping_address?.line2}`
                      : ''}
                  </p>
                  <p className='text-xs text-muted-foreground'>
                    {selectedOrder.shipping_address?.city},{' '}
                    {selectedOrder.shipping_address?.state}{' '}
                    {selectedOrder.shipping_address?.pincode}
                  </p>
                  <p className='text-xs text-muted-foreground'>
                    {selectedOrder.shipping_address?.country || 'India'}
                  </p>
                  <p className='text-xs text-muted-foreground'>
                    {selectedOrder.shipping_address?.phone}
                  </p>
                </div>
                <div className='rounded-lg border p-3'>
                  <p className='text-sm font-semibold'>Totals</p>
                  <div className='mt-2 space-y-1 text-sm'>
                    <div className='flex justify-between'>
                      <span className='text-muted-foreground'>Subtotal</span>
                      <span className='font-medium'>
                        {formatINR(selectedOrder.subtotal)}
                      </span>
                    </div>
                    <div className='flex justify-between'>
                      <span className='text-muted-foreground'>Shipping</span>
                      <span className='font-medium'>
                        {formatINR(selectedOrder.shipping_fee)}
                      </span>
                    </div>
                    <div className='flex justify-between'>
                      <span className='text-muted-foreground'>Discount</span>
                      <span className='font-medium'>
                        -{formatINR(selectedOrder.discount)}
                      </span>
                    </div>
                    <div className='flex justify-between text-base font-semibold'>
                      <span>Total</span>
                      <span>
                        {formatINR(selectedOrder.total)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
