import { useEffect, useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

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

export default function FoodStoreAdminPage() {
  const [tables, setTables] = useState<FoodOpsTable[]>([])
  const [waiters, setWaiters] = useState<FoodOpsWaiter[]>([])
  const [cashiers, setCashiers] = useState<FoodOpsCashier[]>([])
  const [saving, setSaving] = useState(false)

  const [tableForm, setTableForm] = useState<TableForm>({ number: '', capacity: '', status: 'available' })
  const [waiterForm, setWaiterForm] = useState<WaiterForm>({ name: '', mobile: '', status: 'Active' })
  const [cashierForm, setCashierForm] = useState<CashierForm>({ name: '', mobile: '', employee_id: '', shift_timing: '', status: 'Active' })

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
      await loadData()
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to save cashier')
    } finally {
      setSaving(false)
    }
  }

  return (
    <FoodModuleShell
      title='Store Admin'
      description='Manage restaurant tables, waiters, and cashiers from one operational panel.'
      moduleLabel='Store Admin'
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
