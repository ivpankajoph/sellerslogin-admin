import { useEffect, useMemo, useState } from 'react'
import {
  Crown,
  Eye,
  Mail,
  Plus,
  ReceiptText,
  Search,
  TrendingUp,
  UserRound,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  FoodModuleShell,
  money,
  useFoodOperationsData,
} from '@/features/food-ops/shared'
import {
  foodOpsApi,
  type FoodOpsCustomer,
  type FoodOpsPosOrder,
} from '@/features/food-ops/api'

type CustomerRow = {
  key: string
  id?: string
  name: string
  phone: string
  email: string
  city: string
  birthday: string
  anniversary: string
  status: 'Active' | 'Inactive'
  source: 'manual' | 'orders'
  orders: number
  totalSpend: number
  lastOrderAt: string
}

type CustomerForm = {
  id: string
  name: string
  phone: string
  email: string
  city: string
  birthday: string
  anniversary: string
  status: 'Active' | 'Inactive'
}

const defaultCustomerForm = (): CustomerForm => ({
  id: '',
  name: '',
  phone: '',
  email: '',
  city: '',
  birthday: '',
  anniversary: '',
  status: 'Active',
})

const getErrorMessage = (error: unknown, fallback: string) => {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof error.response === 'object' &&
    error.response !== null &&
    'data' in error.response &&
    typeof error.response.data === 'object' &&
    error.response.data !== null &&
    'message' in error.response.data &&
    typeof error.response.data.message === 'string'
  ) {
    return error.response.data.message
  }

  return fallback
}

const getOrderCustomer = (order: {
  customer_details?: { name?: string; phone?: string; email?: string }
  shipping_address?: { full_name?: string; phone?: string }
}) => ({
  name:
    order.customer_details?.name ||
    order.shipping_address?.full_name ||
    'Walk-in customer',
  phone: order.customer_details?.phone || order.shipping_address?.phone || '',
  email: order.customer_details?.email || '',
})

export default function FoodCustomersPage() {
  const { loading, orders } = useFoodOperationsData()
  const [posOrders, setPosOrders] = useState<FoodOpsPosOrder[]>([])
  const [manualCustomers, setManualCustomers] = useState<FoodOpsCustomer[]>([])
  const [form, setForm] = useState<CustomerForm>(defaultCustomerForm)
  const [formOpen, setFormOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRow | null>(null)

  const loadManualCustomers = async () => {
    try {
      setManualCustomers(await foodOpsApi.getCustomers())
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to load saved customers'))
    }
  }

  useEffect(() => {
    const loadCustomerData = async () => {
      try {
        const [posData] = await Promise.all([
          foodOpsApi.getPosOrders(),
          loadManualCustomers(),
        ])
        setPosOrders(posData)
      } catch (error) {
        toast.error(getErrorMessage(error, 'Failed to load POS customers'))
      }
    }

    void loadCustomerData()
  }, [])

  const customers = useMemo(() => {
    const map = new Map<string, CustomerRow>()
    const addCustomer = (
      customer: { name: string; phone: string; email: string },
      total: number,
      lastOrderAt?: string
    ) => {
      const key = customer.phone || customer.email || customer.name
      if (!key) return
      const existing = map.get(key) || {
        key,
        id: '',
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        city: '',
        birthday: '',
        anniversary: '',
        status: 'Active' as const,
        source: 'orders' as const,
        orders: 0,
        totalSpend: 0,
        lastOrderAt: '',
      }
      existing.orders += 1
      existing.totalSpend += Number(total || 0)
      if (lastOrderAt && lastOrderAt > existing.lastOrderAt) {
        existing.lastOrderAt = lastOrderAt
      }
      map.set(key, existing)
    }

    manualCustomers.forEach((customer) => {
      const key = customer.phone || customer.email || customer.name
      if (!key) return
      const existing = map.get(key) || {
        key,
        orders: 0,
        totalSpend: 0,
        lastOrderAt: customer.createdAt || '',
      } as CustomerRow
      map.set(key, {
        ...existing,
        id: customer._id,
        name: customer.name || existing.name || 'Customer',
        phone: customer.phone || existing.phone || '',
        email: customer.email || existing.email || '',
        city: customer.city || existing.city || '',
        birthday: customer.birthday || existing.birthday || '',
        anniversary: customer.anniversary || existing.anniversary || '',
        status: customer.status || 'Active',
        source: 'manual',
      })
    })
    orders.forEach((order) => {
      addCustomer(getOrderCustomer(order), Number(order.total || 0), order.createdAt || order.updatedAt)
    })
    posOrders.forEach((order) => {
      addCustomer(getOrderCustomer(order), Number(order.total || 0), order.createdAt)
    })

    return Array.from(map.values()).sort((a, b) => b.totalSpend - a.totalSpend)
  }, [manualCustomers, orders, posOrders])

  const filteredCustomers = useMemo(() => {
    const value = search.trim().toLowerCase()
    if (!value) return customers
    return customers.filter((customer) =>
      [customer.name, customer.phone, customer.email].some((field) =>
        String(field || '').toLowerCase().includes(value)
      )
    )
  }, [customers, search])

  const customerStats = useMemo(() => {
    const totalSpend = customers.reduce((sum, customer) => sum + customer.totalSpend, 0)
    const repeatCustomers = customers.filter((customer) => customer.orders > 1).length
    const topCustomer = customers[0] || null
    return {
      totalCustomers: customers.length,
      repeatCustomers,
      totalSpend,
      averageSpend: customers.length ? totalSpend / customers.length : 0,
      topCustomer,
    }
  }, [customers])

  const resetForm = () => setForm(defaultCustomerForm())
  const closeForm = () => {
    resetForm()
    setFormOpen(false)
  }

  const saveCustomer = async () => {
    if (!form.name.trim()) return toast.error('Customer name is required')
    if (!form.phone.trim() && !form.email.trim()) {
      return toast.error('Add mobile number or email')
    }

    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        city: form.city.trim(),
        birthday: form.birthday,
        anniversary: form.anniversary,
        status: form.status,
      }
      if (form.id) {
        await foodOpsApi.updateCustomer(form.id, payload)
        toast.success('Customer updated')
      } else {
        await foodOpsApi.createCustomer(payload)
        toast.success('Customer created')
      }
      resetForm()
      setFormOpen(false)
      await loadManualCustomers()
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to save customer'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <FoodModuleShell
      title='Customer List'
      description='Track restaurant customers, repeat visits, contact details, and spending from POS and online orders.'
      moduleLabel='Customer List'
      showModuleCard={false}
    >
      <div className='grid gap-4 md:grid-cols-4'>
        {[
          { label: 'Customers', value: String(customerStats.totalCustomers), icon: Users },
          { label: 'Repeat Customers', value: String(customerStats.repeatCustomers), icon: TrendingUp },
          { label: 'Total Spend', value: money(customerStats.totalSpend), icon: ReceiptText },
          { label: 'Avg Spend', value: money(customerStats.averageSpend), icon: Crown },
        ].map((stat) => (
          <Card key={stat.label} className='rounded-2xl border border-slate-200 bg-white py-0 shadow-sm'>
            <CardContent className='flex items-center justify-between gap-4 p-5'>
              <div className='min-w-0'>
                <p className='truncate text-xs font-black uppercase tracking-[0.16em] text-slate-400'>{stat.label}</p>
                <p className='mt-2 truncate text-2xl font-black text-slate-900'>{stat.value}</p>
              </div>
              <div className='flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-sky-700'>
                <stat.icon className='h-5 w-5' />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {customerStats.topCustomer ? (
        <Card className='rounded-2xl border border-amber-200 bg-amber-50 py-0 shadow-sm'>
          <CardContent className='flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between'>
            <div className='flex items-center gap-4'>
              <div className='flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-amber-700 shadow-sm'>
                <Crown className='h-5 w-5' />
              </div>
              <div>
                <p className='text-xs font-black uppercase tracking-[0.18em] text-amber-700'>Top Customer</p>
                <p className='mt-1 text-lg font-black text-slate-900'>
                  {customerStats.topCustomer.name}
                </p>
              </div>
            </div>
            <div className='flex flex-wrap gap-3 text-sm font-bold text-slate-700'>
              <span>{customerStats.topCustomer.orders} orders</span>
              <span>{money(customerStats.topCustomer.totalSpend)}</span>
              {customerStats.topCustomer.phone ? <span>{customerStats.topCustomer.phone}</span> : null}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {formOpen ? <Card className='overflow-hidden rounded-2xl border border-slate-200 bg-white py-0 shadow-sm'>
        <CardHeader className='flex flex-col gap-4 border-b border-slate-100 bg-white px-6 py-5 sm:flex-row sm:items-start sm:justify-between'>
          <div className='min-w-0'>
            <p className='text-xs font-black uppercase tracking-[0.18em] text-sky-600'>Customer Management</p>
            <CardTitle className='mt-2 text-xl font-black text-slate-900'>
              {form.id ? 'Edit Customer' : 'Add New Customer'}
            </CardTitle>
          </div>
          <Button className='h-10 rounded-xl bg-sky-600 px-5 text-white hover:bg-sky-700' onClick={closeForm}>
            Cancel
          </Button>
        </CardHeader>
        <CardContent className='px-6 py-6'>
          <div className='max-w-2xl space-y-5'>
            <div>
              <p className='mb-2 text-xs font-black uppercase tracking-[0.12em] text-slate-500'>Customer Name</p>
              <Input placeholder='Full name' value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
            </div>
            <div>
              <p className='mb-2 text-xs font-black uppercase tracking-[0.12em] text-slate-500'>Mobile Number</p>
              <Input placeholder='10 digit number' value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value.replace(/\D/g, '') }))} />
            </div>
            <div>
              <p className='mb-2 text-xs font-black uppercase tracking-[0.12em] text-slate-500'>Email Address</p>
              <Input placeholder='email@example.com' value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
            </div>
            <div>
              <p className='mb-2 text-xs font-black uppercase tracking-[0.12em] text-slate-500'>City</p>
              <Input placeholder='City' value={form.city} onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))} />
            </div>
            <div className='grid gap-4 sm:grid-cols-2'>
              <div>
                <p className='mb-2 text-xs font-black uppercase tracking-[0.12em] text-slate-500'>Birthday <span className='font-bold text-slate-400'>(Optional)</span></p>
                <Input type='date' value={form.birthday} onChange={(event) => setForm((current) => ({ ...current, birthday: event.target.value }))} />
              </div>
              <div>
                <p className='mb-2 text-xs font-black uppercase tracking-[0.12em] text-slate-500'>Anniversary <span className='font-bold text-slate-400'>(Optional)</span></p>
                <Input type='date' value={form.anniversary} onChange={(event) => setForm((current) => ({ ...current, anniversary: event.target.value }))} />
              </div>
            </div>
            <div className='max-w-40'>
              <p className='mb-2 text-xs font-black uppercase tracking-[0.12em] text-slate-500'>Status</p>
              <Select value={form.status} onValueChange={(value) => setForm((current) => ({ ...current, status: value as CustomerForm['status'] }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value='Active'>Active</SelectItem>
                  <SelectItem value='Inactive'>Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className='h-12 w-full rounded-xl bg-sky-600 text-white hover:bg-sky-700' onClick={() => void saveCustomer()} disabled={saving}>
              <Plus className='mr-2 h-4 w-4' />
              {saving ? 'Saving...' : form.id ? 'Update Customer' : 'Save Changes'}
            </Button>
          </div>
        </CardContent>
      </Card> : null}

      <Card className='rounded-2xl border border-slate-200 bg-white py-0 shadow-sm'>
        <CardHeader className='flex flex-col gap-4 px-6 py-5 lg:flex-row lg:items-center lg:justify-between'>
          <div>
            <CardTitle className='text-xl font-black text-slate-900'>
              Restaurant Customers
            </CardTitle>
            <p className='mt-1 text-sm text-slate-500'>
              POS and online customers grouped by phone, email, or name.
            </p>
          </div>
          <div className='flex w-full flex-col gap-3 sm:flex-row lg:w-auto'>
            <div className='relative w-full lg:w-80'>
              <Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400' />
              <Input
                className='pl-9'
                placeholder='Search customer'
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            {!formOpen ? (
              <Button
                className='h-11 rounded-xl bg-sky-600 px-5 text-white hover:bg-sky-700'
                onClick={() => {
                  resetForm()
                  setFormOpen(true)
                }}
              >
                <Plus className='mr-2 h-4 w-4' />
                Add Customer
              </Button>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className='space-y-3 px-6 pb-6'>
          {loading ? (
            Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className='h-20 animate-pulse rounded-2xl bg-slate-100' />
            ))
          ) : filteredCustomers.length ? (
            filteredCustomers.map((customer, index) => (
              <div key={customer.key} className='overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm'>
                <div className='grid gap-5 p-5 lg:grid-cols-[minmax(280px,0.9fr)_minmax(0,1.5fr)_auto] lg:items-start'>
                  <div className='flex min-w-0 gap-4'>
                    <div className='flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-50 text-slate-700 ring-1 ring-slate-100'>
                      <UserRound className='h-5 w-5' />
                    </div>
                    <div className='min-w-0'>
                      <div className='flex flex-wrap items-center gap-2'>
                        <p className='min-w-0 break-words text-lg font-black leading-tight text-slate-900'>
                          {customer.name}
                        </p>
                        {index === 0 ? (
                          <Badge className='rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-black uppercase text-amber-700 shadow-none'>
                            Top
                          </Badge>
                        ) : null}
                        {customer.orders > 1 ? (
                          <Badge className='rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-black uppercase text-emerald-700 shadow-none'>
                            Repeat
                          </Badge>
                        ) : null}
                        {customer.source === 'manual' ? (
                          <Badge className='rounded-full bg-sky-100 px-2.5 py-1 text-[10px] font-black uppercase text-sky-700 shadow-none'>
                            Saved
                          </Badge>
                        ) : null}
                        <Badge className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase shadow-none ${customer.status === 'Active' ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-600'}`}>
                          {customer.status}
                        </Badge>
                      </div>
                      <div className='mt-3 space-y-1.5 text-sm text-slate-600'>
                        <p className='flex min-w-0 items-center gap-2'>
                          <Mail className='h-4 w-4 shrink-0 text-slate-400' />
                          <span className='break-all'>{customer.email || 'No email'}</span>
                        </p>
                        <p className='font-semibold text-slate-800'>{customer.phone || 'No phone number'}</p>
                      </div>
                    </div>
                  </div>

                  <div className='grid gap-3 text-sm text-slate-700 sm:grid-cols-2 xl:grid-cols-4'>
                    <div className='rounded-xl bg-slate-50 p-3'>
                      <p className='text-[10px] font-black uppercase tracking-[0.12em] text-slate-400'>Orders</p>
                      <p className='mt-1 flex items-center gap-1.5 text-base font-black text-slate-900'>
                        <ReceiptText className='h-3.5 w-3.5 text-slate-400' />
                        {customer.orders}
                      </p>
                    </div>
                    <div className='rounded-xl bg-slate-50 p-3'>
                      <p className='text-[10px] font-black uppercase tracking-[0.12em] text-slate-400'>Spend</p>
                      <p className='mt-1 break-words text-base font-black text-slate-900'>{money(customer.totalSpend)}</p>
                    </div>
                    <div className='rounded-xl bg-slate-50 p-3'>
                      <p className='text-[10px] font-black uppercase tracking-[0.12em] text-slate-400'>Last Order</p>
                      <p className='mt-1 font-bold text-slate-900'>{customer.lastOrderAt ? new Date(customer.lastOrderAt).toLocaleDateString() : '-'}</p>
                    </div>
                    <div className='rounded-xl bg-slate-50 p-3'>
                      <p className='text-[10px] font-black uppercase tracking-[0.12em] text-slate-400'>Source</p>
                      <p className='mt-1 font-bold text-slate-900'>{customer.source === 'manual' ? 'Saved customer' : 'Order history'}</p>
                    </div>
                    <div className='rounded-xl bg-slate-50 p-3'>
                      <p className='text-[10px] font-black uppercase tracking-[0.12em] text-slate-400'>City</p>
                      <p className='mt-1 break-words font-bold text-slate-900'>{customer.city || '-'}</p>
                    </div>
                    <div className='rounded-xl bg-slate-50 p-3'>
                      <p className='text-[10px] font-black uppercase tracking-[0.12em] text-slate-400'>Birthday</p>
                      <p className='mt-1 font-bold text-slate-900'>{customer.birthday || '-'}</p>
                    </div>
                    <div className='rounded-xl bg-slate-50 p-3 sm:col-span-2'>
                      <p className='text-[10px] font-black uppercase tracking-[0.12em] text-slate-400'>Anniversary</p>
                      <p className='mt-1 font-bold text-slate-900'>{customer.anniversary || '-'}</p>
                    </div>
                  </div>

                  <div className='flex lg:justify-end'>
                    <Button
                      variant='outline'
                      className='h-10 rounded-xl px-4'
                      onClick={() => setSelectedCustomer(customer)}
                    >
                      <Eye className='mr-2 h-4 w-4' />
                      View
                    </Button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className='rounded-2xl border border-dashed border-slate-200 px-4 py-12 text-center text-sm text-slate-500'>
              No restaurant customers found for this search.
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(selectedCustomer)}
        onOpenChange={(open) => {
          if (!open) setSelectedCustomer(null)
        }}
      >
        <DialogContent className='max-w-2xl rounded-2xl p-0'>
          {selectedCustomer ? (
            <>
              <DialogHeader className='border-b border-slate-100 px-6 py-5 pr-12'>
                <div className='flex items-start gap-4'>
                  <div className='flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-50 text-slate-700 ring-1 ring-slate-100'>
                    <UserRound className='h-5 w-5' />
                  </div>
                  <div className='min-w-0'>
                    <DialogTitle className='break-words text-xl font-black text-slate-900'>
                      {selectedCustomer.name}
                    </DialogTitle>
                    <DialogDescription className='mt-1 break-all text-sm text-slate-500'>
                      {selectedCustomer.email || 'No email'} | {selectedCustomer.phone || 'No phone number'}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              <div className='grid gap-3 px-6 py-6 sm:grid-cols-2'>
                {[
                  ['Status', selectedCustomer.status],
                  ['Source', selectedCustomer.source === 'manual' ? 'Saved customer' : 'Order history'],
                  ['Orders', String(selectedCustomer.orders)],
                  ['Total Spend', money(selectedCustomer.totalSpend)],
                  ['City', selectedCustomer.city || '-'],
                  ['Last Order', selectedCustomer.lastOrderAt ? new Date(selectedCustomer.lastOrderAt).toLocaleDateString() : '-'],
                  ['Birthday', selectedCustomer.birthday || '-'],
                  ['Anniversary', selectedCustomer.anniversary || '-'],
                ].map(([label, value]) => (
                  <div key={label} className='rounded-xl bg-slate-50 p-4'>
                    <p className='text-[10px] font-black uppercase tracking-[0.12em] text-slate-400'>{label}</p>
                    <p className='mt-1 break-words text-sm font-bold text-slate-900'>{value}</p>
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </FoodModuleShell>
  )
}
