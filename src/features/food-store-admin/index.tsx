import { useEffect, useMemo, useState } from 'react'
import {
  BadgeCheck,
  CircleSlash2,
  Pencil,
  Phone,
  Plus,
  Search,
  ShieldCheck,
  Table2,
  Trash2,
  UserRound,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FoodModuleShell } from '@/features/food-ops/shared'
import {
  foodOpsApi,
  type FoodOpsCashier,
  type FoodOpsTable,
  type FoodOpsWaiter,
} from '@/features/food-ops/api'

type TableForm = { number: string; capacity: string; status: string }
type WaiterForm = { name: string; mobile: string; status: string }
type CashierForm = {
  name: string
  mobile: string
  employee_id: string
  shift_timing: string
  status: string
}

type StoreAdminMode = 'all' | 'tables' | 'waiters' | 'cashiers'

export default function FoodStoreAdminPage({ mode = 'all' }: { mode?: StoreAdminMode }) {
  const [tables, setTables] = useState<FoodOpsTable[]>([])
  const [waiters, setWaiters] = useState<FoodOpsWaiter[]>([])
  const [cashiers, setCashiers] = useState<FoodOpsCashier[]>([])
  const [saving, setSaving] = useState(false)

  const [tableForm, setTableForm] = useState<TableForm>({ number: '', capacity: '', status: 'available' })
  const [waiterForm, setWaiterForm] = useState<WaiterForm>({ name: '', mobile: '', status: 'Active' })
  const [cashierForm, setCashierForm] = useState<CashierForm>({ name: '', mobile: '', employee_id: '', shift_timing: '', status: 'Active' })
  const [cashierFormOpen, setCashierFormOpen] = useState(false)
  const [search, setSearch] = useState('')

  const [editingTableId, setEditingTableId] = useState<string | null>(null)
  const [editingWaiterId, setEditingWaiterId] = useState<string | null>(null)
  const [editingCashierId, setEditingCashierId] = useState<string | null>(null)

  const loadData = async () => {
    try {
      const [tablesData, waitersData, cashiersData] = await Promise.all([
        foodOpsApi.getTables(),
        foodOpsApi.getWaiters(),
        foodOpsApi.getCashiers(),
      ])
      setTables(tablesData)
      setWaiters(waitersData)
      setCashiers(cashiersData)
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to load store admin data')
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  const resetTableForm = () => {
    setEditingTableId(null)
    setTableForm({ number: '', capacity: '', status: 'available' })
  }

  const resetWaiterForm = () => {
    setEditingWaiterId(null)
    setWaiterForm({ name: '', mobile: '', status: 'Active' })
  }

  const resetCashierForm = () => {
    setEditingCashierId(null)
    setCashierForm({ name: '', mobile: '', employee_id: '', shift_timing: '', status: 'Active' })
  }

  const closeCashierForm = () => {
    resetCashierForm()
    setCashierFormOpen(false)
  }

  const saveTable = async () => {
    if (!tableForm.number.trim()) return toast.error('Table number is required')
    setSaving(true)
    try {
      const payload = {
        number: tableForm.number,
        capacity: Number(tableForm.capacity || 2),
        status: tableForm.status as FoodOpsTable['status'],
      }
      if (editingTableId) {
        await foodOpsApi.updateTable(editingTableId, payload)
        toast.success('Table updated')
      } else {
        await foodOpsApi.createTable(payload)
        toast.success('Table saved')
      }
      resetTableForm()
      await loadData()
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to save table')
    } finally {
      setSaving(false)
    }
  }

  const saveWaiter = async () => {
    if (!waiterForm.name.trim()) return toast.error('Waiter name is required')
    setSaving(true)
    try {
      const payload = {
        ...waiterForm,
        status: waiterForm.status as 'Active' | 'Inactive',
      }
      if (editingWaiterId) {
        await foodOpsApi.updateWaiter(editingWaiterId, payload)
        toast.success('Waiter updated')
      } else {
        await foodOpsApi.createWaiter(payload)
        toast.success('Waiter saved')
      }
      resetWaiterForm()
      await loadData()
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to save waiter')
    } finally {
      setSaving(false)
    }
  }

  const saveCashier = async () => {
    if (!cashierForm.name.trim()) return toast.error('Cashier name is required')
    setSaving(true)
    try {
      const payload = {
        ...cashierForm,
        status: cashierForm.status as 'Active' | 'Inactive',
      }
      if (editingCashierId) {
        await foodOpsApi.updateCashier(editingCashierId, payload)
        toast.success('Cashier updated')
      } else {
        await foodOpsApi.createCashier(payload)
        toast.success('Cashier saved')
      }
      resetCashierForm()
      setCashierFormOpen(false)
      await loadData()
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to save cashier')
    } finally {
      setSaving(false)
    }
  }

  const waiterStats = useMemo(() => ({
    total: waiters.length,
    active: waiters.filter((item) => item.status === 'Active').length,
    inactive: waiters.filter((item) => item.status !== 'Active').length,
  }), [waiters])

  const tableStats = useMemo(() => ({
    total: tables.length,
    available: tables.filter((item) => item.status === 'available').length,
    occupied: tables.filter((item) => item.status === 'occupied').length,
    reserved: tables.filter((item) => item.status === 'reserved').length,
  }), [tables])

  const cashierStats = useMemo(() => ({
    total: cashiers.length,
    active: cashiers.filter((item) => item.status === 'Active').length,
    inactive: cashiers.filter((item) => item.status !== 'Active').length,
  }), [cashiers])

  const filteredWaiters = useMemo(() => {
    const value = search.trim().toLowerCase()
    if (!value) return waiters
    return waiters.filter((waiter) =>
      [waiter.name, waiter.mobile, waiter.status].some((field) =>
        String(field || '').toLowerCase().includes(value)
      )
    )
  }, [search, waiters])

  const filteredTables = useMemo(() => {
    const value = search.trim().toLowerCase()
    if (!value) return tables
    return tables.filter((table) =>
      [table.number, table.capacity, table.status].some((field) =>
        String(field || '').toLowerCase().includes(value)
      )
    )
  }, [search, tables])

  const filteredCashiers = useMemo(() => {
    const value = search.trim().toLowerCase()
    if (!value) return cashiers
    return cashiers.filter((cashier) =>
      [cashier.name, cashier.mobile, cashier.employee_id, cashier.shift_timing, cashier.status].some((field) =>
        String(field || '').toLowerCase().includes(value)
      )
    )
  }, [cashiers, search])

  if (mode === 'waiters') {
    return (
      <FoodModuleShell
        title='Waiter List'
        description='Add, search, edit, and manage floor staff for Restaurant POS billing.'
        moduleLabel='Store Admin'
        showModuleCard={false}
      >
        <div className='grid gap-4 md:grid-cols-3'>
          {[
            { label: 'Total Waiters', value: waiterStats.total, icon: Users, tone: 'bg-sky-50 text-sky-700' },
            { label: 'Active Staff', value: waiterStats.active, icon: BadgeCheck, tone: 'bg-emerald-50 text-emerald-700' },
            { label: 'Inactive Staff', value: waiterStats.inactive, icon: CircleSlash2, tone: 'bg-amber-50 text-amber-700' },
          ].map((stat) => (
            <Card key={stat.label} className='rounded-2xl border border-slate-200 bg-white py-0 shadow-sm'>
              <CardContent className='flex items-center justify-between gap-4 p-5'>
                <div>
                  <p className='text-xs font-black uppercase tracking-[0.16em] text-slate-400'>{stat.label}</p>
                  <p className='mt-2 text-3xl font-black text-slate-900'>{stat.value}</p>
                </div>
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${stat.tone}`}>
                  <stat.icon className='h-5 w-5' />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className='grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]'>
          <Card className='rounded-2xl border border-slate-200 bg-white py-0 shadow-sm'>
            <CardHeader className='px-6 py-5'>
              <CardTitle className='text-lg font-black text-slate-900'>
                {editingWaiterId ? 'Edit Waiter' : 'Add Waiter'}
              </CardTitle>
              <p className='text-sm text-slate-500'>Keep waiter details ready for dine-in billing and table assignment.</p>
            </CardHeader>
            <CardContent className='space-y-4 px-6 pb-6'>
              <Input placeholder='Waiter name' value={waiterForm.name} onChange={(event) => setWaiterForm((current) => ({ ...current, name: event.target.value }))} />
              <Input placeholder='Mobile number' value={waiterForm.mobile} onChange={(event) => setWaiterForm((current) => ({ ...current, mobile: event.target.value }))} />
              <Select value={waiterForm.status} onValueChange={(value) => setWaiterForm((current) => ({ ...current, status: value }))}>
                <SelectTrigger><SelectValue placeholder='Status' /></SelectTrigger>
                <SelectContent>
                  <SelectItem value='Active'>Active</SelectItem>
                  <SelectItem value='Inactive'>Inactive</SelectItem>
                </SelectContent>
              </Select>
              <div className='flex gap-3'>
                <Button className='h-11 flex-1 rounded-xl bg-slate-900 text-white hover:bg-black' onClick={() => void saveWaiter()} disabled={saving}>
                  {editingWaiterId ? 'Update Waiter' : 'Save Waiter'}
                </Button>
                {editingWaiterId ? <Button variant='outline' className='h-11 rounded-xl' onClick={resetWaiterForm}>Cancel</Button> : null}
              </div>
            </CardContent>
          </Card>

          <Card className='rounded-2xl border border-slate-200 bg-white py-0 shadow-sm'>
            <CardHeader className='flex flex-col gap-4 px-6 py-5 lg:flex-row lg:items-center lg:justify-between'>
              <div>
                <CardTitle className='text-lg font-black text-slate-900'>Waiter Directory</CardTitle>
                <p className='mt-1 text-sm text-slate-500'>Clean list of staff available for POS orders.</p>
              </div>
              <div className='relative w-full lg:w-80'>
                <Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400' />
                <Input className='pl-9' placeholder='Search waiter' value={search} onChange={(event) => setSearch(event.target.value)} />
              </div>
            </CardHeader>
            <CardContent className='space-y-3 px-6 pb-6'>
              {filteredWaiters.length ? filteredWaiters.map((waiter) => (
                <div key={waiter._id} className='grid gap-4 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4 md:grid-cols-[1fr_auto] md:items-center'>
                  <div className='flex min-w-0 items-center gap-4'>
                    <div className='flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-slate-700 shadow-sm'>
                      <UserRound className='h-5 w-5' />
                    </div>
                    <div className='min-w-0'>
                      <p className='truncate text-base font-black text-slate-900'>{waiter.name}</p>
                      <div className='mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500'>
                        <span className='inline-flex items-center gap-1'>
                          <Phone className='h-3.5 w-3.5' />
                          {waiter.mobile || 'No mobile'}
                        </span>
                        <Badge className={`rounded-full px-3 py-1 text-xs font-bold shadow-none ${waiter.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                          {waiter.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className='flex flex-wrap gap-2 md:justify-end'>
                    <Button variant='outline' className='rounded-xl' onClick={() => {
                      setEditingWaiterId(waiter._id)
                      setWaiterForm({ name: waiter.name, mobile: waiter.mobile || '', status: waiter.status })
                    }}>
                      <Pencil className='mr-2 h-4 w-4' />
                      Edit
                    </Button>
                    <Button variant='ghost' className='rounded-xl text-rose-600 hover:bg-rose-50 hover:text-rose-700' onClick={() => void foodOpsApi.deleteWaiter(waiter._id).then(loadData).then(() => toast.success('Waiter deleted')).catch((error: any) => toast.error(error?.response?.data?.message || 'Failed to delete waiter'))}>
                      <Trash2 className='mr-2 h-4 w-4' />
                      Delete
                    </Button>
                  </div>
                </div>
              )) : (
                <div className='rounded-2xl border border-dashed border-slate-200 px-4 py-12 text-center text-sm text-slate-500'>
                  No waiters found. Add your first waiter from the form.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </FoodModuleShell>
    )
  }

  if (mode === 'tables') {
    return (
      <FoodModuleShell
        title='Table List'
        description='Manage dine-in tables, seating capacity, and current floor availability.'
        moduleLabel='Store Admin'
        showModuleCard={false}
      >
        <div className='grid gap-4 md:grid-cols-4'>
          {[
            { label: 'Total Tables', value: tableStats.total },
            { label: 'Available', value: tableStats.available },
            { label: 'Occupied', value: tableStats.occupied },
            { label: 'Reserved', value: tableStats.reserved },
          ].map((stat) => (
            <Card key={stat.label} className='rounded-2xl border border-slate-200 bg-white py-0 shadow-sm'>
              <CardContent className='flex items-center justify-between gap-4 p-5'>
                <div>
                  <p className='text-xs font-black uppercase tracking-[0.16em] text-slate-400'>{stat.label}</p>
                  <p className='mt-2 text-3xl font-black text-slate-900'>{stat.value}</p>
                </div>
                <div className='flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-700'>
                  <Table2 className='h-5 w-5' />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className='grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]'>
          <Card className='rounded-2xl border border-slate-200 bg-white py-0 shadow-sm'>
            <CardHeader className='px-6 py-5'>
              <CardTitle className='text-lg font-black text-slate-900'>
                {editingTableId ? 'Edit Table' : 'Add Table'}
              </CardTitle>
              <p className='text-sm text-slate-500'>Create table records for dine-in POS orders and reservations.</p>
            </CardHeader>
            <CardContent className='space-y-4 px-6 pb-6'>
              <Input placeholder='Table number' value={tableForm.number} onChange={(event) => setTableForm((current) => ({ ...current, number: event.target.value }))} />
              <Input placeholder='Seating capacity' value={tableForm.capacity} onChange={(event) => setTableForm((current) => ({ ...current, capacity: event.target.value }))} />
              <Select value={tableForm.status} onValueChange={(value) => setTableForm((current) => ({ ...current, status: value }))}>
                <SelectTrigger><SelectValue placeholder='Status' /></SelectTrigger>
                <SelectContent>
                  <SelectItem value='available'>Available</SelectItem>
                  <SelectItem value='occupied'>Occupied</SelectItem>
                  <SelectItem value='reserved'>Reserved</SelectItem>
                </SelectContent>
              </Select>
              <div className='flex gap-3'>
                <Button className='h-11 flex-1 rounded-xl bg-slate-900 text-white hover:bg-black' onClick={() => void saveTable()} disabled={saving}>
                  {editingTableId ? 'Update Table' : 'Save Table'}
                </Button>
                {editingTableId ? <Button variant='outline' className='h-11 rounded-xl' onClick={resetTableForm}>Cancel</Button> : null}
              </div>
            </CardContent>
          </Card>

          <Card className='rounded-2xl border border-slate-200 bg-white py-0 shadow-sm'>
            <CardHeader className='flex flex-col gap-4 px-6 py-5 lg:flex-row lg:items-center lg:justify-between'>
              <div>
                <CardTitle className='text-lg font-black text-slate-900'>Floor Tables</CardTitle>
                <p className='mt-1 text-sm text-slate-500'>Scan table capacity and status before seating guests.</p>
              </div>
              <div className='relative w-full lg:w-80'>
                <Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400' />
                <Input className='pl-9' placeholder='Search table' value={search} onChange={(event) => setSearch(event.target.value)} />
              </div>
            </CardHeader>
            <CardContent className='grid gap-3 px-6 pb-6 md:grid-cols-2 xl:grid-cols-3'>
              {filteredTables.length ? filteredTables.map((table) => (
                <div key={table._id} className='rounded-2xl border border-slate-100 bg-slate-50 p-4'>
                  <div className='flex items-start justify-between gap-3'>
                    <div>
                      <p className='text-lg font-black text-slate-900'>Table {table.number}</p>
                      <p className='mt-1 text-sm text-slate-500'>{table.capacity} seats</p>
                    </div>
                    <Badge className='rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-700 shadow-none'>
                      {table.status}
                    </Badge>
                  </div>
                  <div className='mt-5 flex flex-wrap gap-2'>
                    <Button variant='outline' className='rounded-xl' onClick={() => {
                      setEditingTableId(table._id)
                      setTableForm({ number: table.number, capacity: String(table.capacity), status: table.status })
                    }}>
                      <Pencil className='mr-2 h-4 w-4' />
                      Edit
                    </Button>
                    <Button variant='ghost' className='rounded-xl text-rose-600 hover:bg-rose-50 hover:text-rose-700' onClick={() => void foodOpsApi.deleteTable(table._id).then(loadData).then(() => toast.success('Table deleted')).catch((error: any) => toast.error(error?.response?.data?.message || 'Failed to delete table'))}>
                      <Trash2 className='mr-2 h-4 w-4' />
                      Delete
                    </Button>
                  </div>
                </div>
              )) : (
                <div className='col-span-full rounded-2xl border border-dashed border-slate-200 px-4 py-12 text-center text-sm text-slate-500'>
                  No tables found. Add your first table from the form.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </FoodModuleShell>
    )
  }

  if (mode === 'cashiers') {
    return (
      <FoodModuleShell
        title='Cashier List'
        description='Manage cashier access details and shift coverage for billing counters.'
        moduleLabel='Store Admin'
        showModuleCard={false}
      >
        <div className='grid gap-4 md:grid-cols-3'>
          {[
            { label: 'Total Cashiers', value: cashierStats.total },
            { label: 'Active Cashiers', value: cashierStats.active },
            { label: 'Inactive Cashiers', value: cashierStats.inactive },
          ].map((stat) => (
            <Card key={stat.label} className='rounded-2xl border border-slate-200 bg-white py-0 shadow-sm'>
              <CardContent className='flex items-center justify-between gap-4 p-5'>
                <div>
                  <p className='text-xs font-black uppercase tracking-[0.16em] text-slate-400'>{stat.label}</p>
                  <p className='mt-2 text-3xl font-black text-slate-900'>{stat.value}</p>
                </div>
                <div className='flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700'>
                  <ShieldCheck className='h-5 w-5' />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {cashierFormOpen ? (
          <Card className='overflow-hidden rounded-2xl border border-slate-200 bg-white py-0 shadow-sm'>
            <CardHeader className='flex flex-col gap-4 border-b border-slate-100 bg-white px-6 py-5 sm:flex-row sm:items-start sm:justify-between'>
              <div>
                <p className='text-xs font-black uppercase tracking-[0.18em] text-sky-600'>
                  Cashiers Management
                </p>
                <CardTitle className='mt-2 text-xl font-black text-slate-900'>
                  {editingCashierId ? 'Edit Cashier' : 'Add New Cashier'}
                </CardTitle>
              </div>
              <Button className='h-10 rounded-xl bg-sky-600 px-5 text-white hover:bg-sky-700' onClick={closeCashierForm}>
                Cancel
              </Button>
            </CardHeader>
            <CardContent className='px-6 py-6'>
              <div className='max-w-2xl space-y-5'>
                <div>
                  <p className='mb-2 text-xs font-black uppercase tracking-[0.12em] text-slate-500'>Cashier Name</p>
                  <Input placeholder='Cashier name' value={cashierForm.name} onChange={(event) => setCashierForm((current) => ({ ...current, name: event.target.value }))} />
                </div>
                <div>
                  <p className='mb-2 text-xs font-black uppercase tracking-[0.12em] text-slate-500'>Mobile Number</p>
                  <Input placeholder='Mobile number' value={cashierForm.mobile} onChange={(event) => setCashierForm((current) => ({ ...current, mobile: event.target.value }))} />
                </div>
                <div>
                  <p className='mb-2 text-xs font-black uppercase tracking-[0.12em] text-slate-500'>Employee ID</p>
                  <Input placeholder='Employee ID' value={cashierForm.employee_id} onChange={(event) => setCashierForm((current) => ({ ...current, employee_id: event.target.value }))} />
                </div>
                <div>
                  <p className='mb-2 text-xs font-black uppercase tracking-[0.12em] text-slate-500'>Shift Timing</p>
                  <Input placeholder='Shift timing' value={cashierForm.shift_timing} onChange={(event) => setCashierForm((current) => ({ ...current, shift_timing: event.target.value }))} />
                </div>
                <div className='max-w-40'>
                  <p className='mb-2 text-xs font-black uppercase tracking-[0.12em] text-slate-500'>Status</p>
                  <Select value={cashierForm.status} onValueChange={(value) => setCashierForm((current) => ({ ...current, status: value }))}>
                    <SelectTrigger><SelectValue placeholder='Status' /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value='Active'>Active</SelectItem>
                      <SelectItem value='Inactive'>Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button className='h-12 w-full rounded-xl bg-sky-600 text-white hover:bg-sky-700' onClick={() => void saveCashier()} disabled={saving}>
                  <Plus className='mr-2 h-4 w-4' />
                  {saving ? 'Saving...' : editingCashierId ? 'Update Cashier' : 'Save Changes'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

          <Card className='rounded-2xl border border-slate-200 bg-white py-0 shadow-sm'>
            <CardHeader className='flex flex-col gap-4 px-6 py-5 lg:flex-row lg:items-center lg:justify-between'>
              <div>
                <p className='text-xs font-black uppercase tracking-[0.18em] text-slate-500'>
                  Cashiers Management
                </p>
                <CardTitle className='mt-2 text-lg font-black text-slate-900'>Cashier Directory</CardTitle>
                <p className='mt-1 text-sm text-slate-500'>Billing counter staff with shift and employee ID details.</p>
              </div>
              <div className='flex w-full flex-col gap-3 sm:flex-row lg:w-auto'>
                <div className='relative w-full lg:w-80'>
                  <Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400' />
                  <Input className='pl-9' placeholder='Search cashier' value={search} onChange={(event) => setSearch(event.target.value)} />
                </div>
                {!cashierFormOpen ? (
                  <Button
                    className='h-11 rounded-xl bg-sky-600 px-5 text-white hover:bg-sky-700'
                    onClick={() => {
                      resetCashierForm()
                      setCashierFormOpen(true)
                    }}
                  >
                    <Plus className='mr-2 h-4 w-4' />
                    Add New
                  </Button>
                ) : null}
              </div>
            </CardHeader>
            <CardContent className='space-y-3 px-6 pb-6'>
              {filteredCashiers.length ? filteredCashiers.map((cashier) => (
                <div key={cashier._id} className='grid gap-4 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4 md:grid-cols-[1fr_auto] md:items-center'>
                  <div>
                    <p className='text-base font-black text-slate-900'>{cashier.name}</p>
                    <p className='mt-1 text-sm text-slate-500'>
                      {cashier.employee_id || 'No employee ID'} / {cashier.shift_timing || 'No shift'} / {cashier.mobile || 'No mobile'}
                    </p>
                    <Badge className={`mt-3 rounded-full px-3 py-1 text-xs font-bold shadow-none ${cashier.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                      {cashier.status}
                    </Badge>
                  </div>
                  <div className='flex flex-wrap gap-2 md:justify-end'>
                    <Button variant='outline' className='rounded-xl' onClick={() => {
                      setEditingCashierId(cashier._id)
                      setCashierForm({
                        name: cashier.name,
                        mobile: cashier.mobile || '',
                        employee_id: cashier.employee_id || '',
                        shift_timing: cashier.shift_timing || '',
                        status: cashier.status,
                      })
                      setCashierFormOpen(true)
                      window.scrollTo({ top: 0, behavior: 'smooth' })
                    }}>
                      <Pencil className='mr-2 h-4 w-4' />
                      Edit
                    </Button>
                    <Button variant='ghost' className='rounded-xl text-rose-600 hover:bg-rose-50 hover:text-rose-700' onClick={() => void foodOpsApi.deleteCashier(cashier._id).then(loadData).then(() => toast.success('Cashier deleted')).catch((error: any) => toast.error(error?.response?.data?.message || 'Failed to delete cashier'))}>
                      <Trash2 className='mr-2 h-4 w-4' />
                      Delete
                    </Button>
                  </div>
                </div>
              )) : (
                <div className='rounded-2xl border border-dashed border-slate-200 px-4 py-12 text-center text-sm text-slate-500'>
                  No cashiers found. Click Add New to create your first cashier.
                </div>
              )}
            </CardContent>
          </Card>
      </FoodModuleShell>
    )
  }

  return (
    <FoodModuleShell
      title='Store Admin'
      description='Manage restaurant tables, waiters, and cashiers from one operational panel.'
      moduleLabel='Store Admin'
      showModuleCard={false}
    >
      <div className='grid gap-6 xl:grid-cols-3'>
        <Card className='rounded-[28px] border border-slate-200 bg-white py-0 shadow-sm'>
          <CardHeader className='px-6 py-5'><CardTitle className='text-xl font-black text-slate-900'>Tables</CardTitle></CardHeader>
          <CardContent className='space-y-3 px-6 pb-6'>
            <Input placeholder='Table number' value={tableForm.number} onChange={(event) => setTableForm((current) => ({ ...current, number: event.target.value }))} />
            <Input placeholder='Capacity' value={tableForm.capacity} onChange={(event) => setTableForm((current) => ({ ...current, capacity: event.target.value }))} />
            <Select value={tableForm.status} onValueChange={(value) => setTableForm((current) => ({ ...current, status: value }))}>
              <SelectTrigger><SelectValue placeholder='Status' /></SelectTrigger>
              <SelectContent>
                <SelectItem value='available'>Available</SelectItem>
                <SelectItem value='occupied'>Occupied</SelectItem>
                <SelectItem value='reserved'>Reserved</SelectItem>
              </SelectContent>
            </Select>
            <div className='flex gap-3'>
              <Button className='w-full rounded-2xl' onClick={() => void saveTable()} disabled={saving}>
                {editingTableId ? 'Update Table' : 'Save Table'}
              </Button>
              {editingTableId ? <Button variant='outline' className='rounded-2xl' onClick={resetTableForm}>Cancel</Button> : null}
            </div>
            <div className='space-y-2 pt-2'>
              {tables.map((table) => (
                <div key={table._id} className='rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-700'>
                  <div className='flex items-start justify-between gap-3'>
                    <div>
                      Table {table.number} • {table.capacity} seats • {table.status}
                    </div>
                    <div className='flex gap-2'>
                      <Button variant='outline' size='sm' className='rounded-xl' onClick={() => {
                        setEditingTableId(table._id)
                        setTableForm({ number: table.number, capacity: String(table.capacity), status: table.status })
                      }}>
                        <Pencil className='mr-2 h-3.5 w-3.5' />
                        Edit
                      </Button>
                      <Button variant='ghost' size='sm' className='rounded-xl text-rose-600' onClick={() => void foodOpsApi.deleteTable(table._id).then(loadData).then(() => toast.success('Table deleted')).catch((error: any) => toast.error(error?.response?.data?.message || 'Failed to delete table'))}>
                        <Trash2 className='mr-2 h-3.5 w-3.5' />
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className='rounded-[28px] border border-slate-200 bg-white py-0 shadow-sm'>
          <CardHeader className='px-6 py-5'><CardTitle className='text-xl font-black text-slate-900'>Waiters</CardTitle></CardHeader>
          <CardContent className='space-y-3 px-6 pb-6'>
            <Input placeholder='Waiter name' value={waiterForm.name} onChange={(event) => setWaiterForm((current) => ({ ...current, name: event.target.value }))} />
            <Input placeholder='Mobile' value={waiterForm.mobile} onChange={(event) => setWaiterForm((current) => ({ ...current, mobile: event.target.value }))} />
            <Select value={waiterForm.status} onValueChange={(value) => setWaiterForm((current) => ({ ...current, status: value }))}>
              <SelectTrigger><SelectValue placeholder='Status' /></SelectTrigger>
              <SelectContent>
                <SelectItem value='Active'>Active</SelectItem>
                <SelectItem value='Inactive'>Inactive</SelectItem>
              </SelectContent>
            </Select>
            <div className='flex gap-3'>
              <Button className='w-full rounded-2xl' onClick={() => void saveWaiter()} disabled={saving}>
                {editingWaiterId ? 'Update Waiter' : 'Save Waiter'}
              </Button>
              {editingWaiterId ? <Button variant='outline' className='rounded-2xl' onClick={resetWaiterForm}>Cancel</Button> : null}
            </div>
            <div className='space-y-2 pt-2'>
              {waiters.map((waiter) => (
                <div key={waiter._id} className='rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-700'>
                  <div className='flex items-start justify-between gap-3'>
                    <div>{waiter.name} • {waiter.mobile || '-'} • {waiter.status}</div>
                    <div className='flex gap-2'>
                      <Button variant='outline' size='sm' className='rounded-xl' onClick={() => {
                        setEditingWaiterId(waiter._id)
                        setWaiterForm({ name: waiter.name, mobile: waiter.mobile || '', status: waiter.status })
                      }}>
                        <Pencil className='mr-2 h-3.5 w-3.5' />
                        Edit
                      </Button>
                      <Button variant='ghost' size='sm' className='rounded-xl text-rose-600' onClick={() => void foodOpsApi.deleteWaiter(waiter._id).then(loadData).then(() => toast.success('Waiter deleted')).catch((error: any) => toast.error(error?.response?.data?.message || 'Failed to delete waiter'))}>
                        <Trash2 className='mr-2 h-3.5 w-3.5' />
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className='rounded-[28px] border border-slate-200 bg-white py-0 shadow-sm'>
          <CardHeader className='px-6 py-5'><CardTitle className='text-xl font-black text-slate-900'>Cashiers</CardTitle></CardHeader>
          <CardContent className='space-y-3 px-6 pb-6'>
            <Input placeholder='Cashier name' value={cashierForm.name} onChange={(event) => setCashierForm((current) => ({ ...current, name: event.target.value }))} />
            <Input placeholder='Mobile' value={cashierForm.mobile} onChange={(event) => setCashierForm((current) => ({ ...current, mobile: event.target.value }))} />
            <Input placeholder='Employee ID' value={cashierForm.employee_id} onChange={(event) => setCashierForm((current) => ({ ...current, employee_id: event.target.value }))} />
            <Input placeholder='Shift timing' value={cashierForm.shift_timing} onChange={(event) => setCashierForm((current) => ({ ...current, shift_timing: event.target.value }))} />
            <Select value={cashierForm.status} onValueChange={(value) => setCashierForm((current) => ({ ...current, status: value }))}>
              <SelectTrigger><SelectValue placeholder='Status' /></SelectTrigger>
              <SelectContent>
                <SelectItem value='Active'>Active</SelectItem>
                <SelectItem value='Inactive'>Inactive</SelectItem>
              </SelectContent>
            </Select>
            <div className='flex gap-3'>
              <Button className='w-full rounded-2xl' onClick={() => void saveCashier()} disabled={saving}>
                {editingCashierId ? 'Update Cashier' : 'Save Cashier'}
              </Button>
              {editingCashierId ? <Button variant='outline' className='rounded-2xl' onClick={resetCashierForm}>Cancel</Button> : null}
            </div>
            <div className='space-y-2 pt-2'>
              {cashiers.map((cashier) => (
                <div key={cashier._id} className='rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-700'>
                  <div className='flex items-start justify-between gap-3'>
                    <div>{cashier.name} • {cashier.employee_id || '-'} • {cashier.status}</div>
                    <div className='flex gap-2'>
                      <Button variant='outline' size='sm' className='rounded-xl' onClick={() => {
                        setEditingCashierId(cashier._id)
                        setCashierForm({
                          name: cashier.name,
                          mobile: cashier.mobile || '',
                          employee_id: cashier.employee_id || '',
                          shift_timing: cashier.shift_timing || '',
                          status: cashier.status,
                        })
                      }}>
                        <Pencil className='mr-2 h-3.5 w-3.5' />
                        Edit
                      </Button>
                      <Button variant='ghost' size='sm' className='rounded-xl text-rose-600' onClick={() => void foodOpsApi.deleteCashier(cashier._id).then(loadData).then(() => toast.success('Cashier deleted')).catch((error: any) => toast.error(error?.response?.data?.message || 'Failed to delete cashier'))}>
                        <Trash2 className='mr-2 h-3.5 w-3.5' />
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </FoodModuleShell>
  )
}
