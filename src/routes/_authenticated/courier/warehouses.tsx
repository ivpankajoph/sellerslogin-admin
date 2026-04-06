import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { LoaderCircle, Plus, RefreshCcw, Warehouse } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { toast } from 'sonner'
import { Main } from '@/components/layout/main'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import {
  createDelhiveryWarehouse,
  fetchDelhiveryWarehouses,
  updateDelhiveryWarehouse,
  type DelhiveryWarehouse,
} from '@/features/courier/api'
import type { RootState } from '@/store'

export const Route = createFileRoute('/_authenticated/courier/warehouses')({
  component: CourierWarehouseManagePage,
})

type WarehouseForm = {
  name: string
  registered_name: string
  phone: string
  email: string
  address: string
  city: string
  pin: string
  country: string
  return_address: string
  return_city: string
  return_pin: string
  return_state: string
  return_country: string
  working_days: string[]
}

const readText = (value: unknown) => String(value ?? '').trim()

const defaultForm: WarehouseForm = {
  name: '',
  registered_name: '',
  phone: '',
  email: '',
  address: '',
  city: '',
  pin: '',
  country: 'India',
  return_address: '',
  return_city: '',
  return_pin: '',
  return_state: '',
  return_country: 'India',
  working_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
}

const WORKING_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const toggleDay = (days: string[], day: string) =>
  days.includes(day) ? days.filter((entry) => entry !== day) : [...days, day]

function CourierWarehouseManagePage() {
  const navigate = useNavigate()
  const user = useSelector((state: RootState) => state.auth?.user)
  const role = String(user?.role || '').toLowerCase()
  const isVendor = role === 'vendor'

  useEffect(() => {
    if (user && !isVendor) {
      void navigate({ to: '/' })
    }
  }, [isVendor, navigate, user])

  const [warehouses, setWarehouses] = useState<DelhiveryWarehouse[]>([])
  const [loading, setLoading] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [busy, setBusy] = useState<'create' | 'edit' | ''>('')
  const [createForm, setCreateForm] = useState<WarehouseForm>(defaultForm)
  const [editForm, setEditForm] = useState<WarehouseForm>(defaultForm)
  const [selected, setSelected] = useState<DelhiveryWarehouse | null>(null)
  const [returnSameAsAbove, setReturnSameAsAbove] = useState(false)

  const loadWarehouses = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetchDelhiveryWarehouses()
      setWarehouses(Array.isArray(response?.warehouses) ? response.warehouses : [])
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to load warehouses')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadWarehouses()
  }, [loadWarehouses])

  const orderedWarehouses = useMemo(
    () =>
      [...warehouses].sort((a, b) => {
        const aTime = new Date(a.updatedAt || 0).getTime()
        const bTime = new Date(b.updatedAt || 0).getTime()
        return bTime - aTime
      }),
    [warehouses]
  )

  const onCreate = async () => {
    if (!readText(createForm.name)) return toast.error('Warehouse name is required')
    if (!readText(createForm.phone)) return toast.error('Phone is required')
    if (!readText(createForm.pin)) return toast.error('Pin is required')

    const payload = {
      ...createForm,
      return_address: returnSameAsAbove ? readText(createForm.address) : readText(createForm.return_address),
      return_city: returnSameAsAbove ? readText(createForm.city) : readText(createForm.return_city),
      return_pin: returnSameAsAbove ? readText(createForm.pin) : readText(createForm.return_pin),
      return_state: returnSameAsAbove ? readText(createForm.return_state) : readText(createForm.return_state),
      return_country: returnSameAsAbove ? readText(createForm.country || 'India') : readText(createForm.return_country || 'India'),
      working_days: createForm.working_days,
    }

    if (!readText(payload.return_address)) return toast.error('Return address is required')
    if (!Array.isArray(payload.working_days) || payload.working_days.length === 0) {
      return toast.error('Select at least one working day')
    }

    try {
      setBusy('create')
      await createDelhiveryWarehouse(payload)
      toast.success('Warehouse created')
      setCreateOpen(false)
      setCreateForm(defaultForm)
      setReturnSameAsAbove(false)
      await loadWarehouses()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to create warehouse')
    } finally {
      setBusy('')
    }
  }

  const onEdit = async () => {
    if (!selected) return
    if (!readText(editForm.address) && !readText(editForm.pin) && !readText(editForm.phone)) {
      return toast.error('Provide address, pin, or phone to update')
    }

    try {
      setBusy('edit')
      await updateDelhiveryWarehouse({
        name: selected.name,
        address: readText(editForm.address) || undefined,
        pin: readText(editForm.pin) || undefined,
        phone: readText(editForm.phone) || undefined,
        working_days: editForm.working_days,
      })
      toast.success('Warehouse updated')
      setEditOpen(false)
      await loadWarehouses()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update warehouse')
    } finally {
      setBusy('')
    }
  }

  return (
    <Main>
      <div className='space-y-6 p-4 md:p-6'>
        <div className='rounded-none border border-border bg-card p-4 md:p-5'>
          <div className='flex flex-wrap items-center justify-between gap-3'>
            <div>
              <h1 className='text-2xl font-semibold tracking-tight'>Delhivery Warehouse Manage</h1>
              <p className='text-sm text-muted-foreground'>
                Create and edit vendor warehouses synced with Delhivery.
              </p>
            </div>
            <div className='flex items-center gap-2'>
              <Button variant='outline' onClick={() => void loadWarehouses()} disabled={loading}>
                <RefreshCcw className='h-4 w-4' />
                Refresh
              </Button>
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className='h-4 w-4' />
                Create Warehouse
              </Button>
            </div>
          </div>
        </div>

        <div className='rounded-none border border-border bg-card p-4 md:p-5'>
          {loading ? (
            <div className='text-sm text-muted-foreground'>Loading warehouses...</div>
          ) : orderedWarehouses.length === 0 ? (
            <div className='rounded-none border border-dashed p-6 text-sm text-muted-foreground'>
              No warehouses found. Create your first warehouse.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Pin</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Working Days</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className='text-right'>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orderedWarehouses.map((warehouse) => (
                  <TableRow key={warehouse.id}>
                    <TableCell className='font-medium'>{warehouse.name}</TableCell>
                    <TableCell>{warehouse.phone || 'N/A'}</TableCell>
                    <TableCell>{warehouse.pin || 'N/A'}</TableCell>
                    <TableCell className='max-w-[320px] whitespace-normal'>
                      {warehouse.address || 'N/A'}
                    </TableCell>
                    <TableCell className='max-w-[260px] whitespace-normal'>
                      {Array.isArray(warehouse.working_days) && warehouse.working_days.length
                        ? warehouse.working_days.join(', ')
                        : 'N/A'}
                    </TableCell>
                    <TableCell>
                      {warehouse.updatedAt ? new Date(warehouse.updatedAt).toLocaleString('en-IN') : 'N/A'}
                    </TableCell>
                    <TableCell className='text-right'>
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() => {
                          setSelected(warehouse)
                          setEditForm({
                            ...defaultForm,
                            name: warehouse.name || '',
                            address: warehouse.address || '',
                            pin: warehouse.pin || '',
                            phone: warehouse.phone || '',
                            working_days:
                              Array.isArray(warehouse.working_days) && warehouse.working_days.length
                                ? warehouse.working_days
                                : defaultForm.working_days,
                          })
                          setEditOpen(true)
                        }}
                      >
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open)
          if (!open) setReturnSameAsAbove(false)
        }}
      >
        <DialogContent className='w-[min(96vw,860px)] max-h-[90vh] overflow-y-auto rounded-none'>
          <DialogHeader className='text-left'>
            <DialogTitle>Create Delhivery Warehouse</DialogTitle>
            <DialogDescription>Delhivery create warehouse API + Mongo sync.</DialogDescription>
          </DialogHeader>
          <div className='grid gap-3 sm:grid-cols-2'>
            <Input placeholder='Warehouse name*' value={createForm.name} onChange={(e) => setCreateForm((c) => ({ ...c, name: e.target.value }))} />
            <Input placeholder='Registered name' value={createForm.registered_name} onChange={(e) => setCreateForm((c) => ({ ...c, registered_name: e.target.value }))} />
            <Input placeholder='Phone*' value={createForm.phone} onChange={(e) => setCreateForm((c) => ({ ...c, phone: e.target.value }))} />
            <Input placeholder='Email' value={createForm.email} onChange={(e) => setCreateForm((c) => ({ ...c, email: e.target.value }))} />
            <Textarea className='sm:col-span-2 min-h-[78px] rounded-none' placeholder='Address' value={createForm.address} onChange={(e) => setCreateForm((c) => ({ ...c, address: e.target.value }))} />
            <Input placeholder='City' value={createForm.city} onChange={(e) => setCreateForm((c) => ({ ...c, city: e.target.value }))} />
            <Input placeholder='Pin*' value={createForm.pin} onChange={(e) => setCreateForm((c) => ({ ...c, pin: e.target.value }))} />
            <Input placeholder='Country' value={createForm.country} onChange={(e) => setCreateForm((c) => ({ ...c, country: e.target.value }))} />
            <div className='sm:col-span-2 space-y-2'>
              <p className='text-sm font-medium'>Working Days</p>
              <div className='flex flex-wrap gap-2'>
                {WORKING_DAYS.map((day) => {
                  const active = createForm.working_days.includes(day)
                  return (
                    <button
                      key={day}
                      type='button'
                      onClick={() =>
                        setCreateForm((c) => ({ ...c, working_days: toggleDay(c.working_days, day) }))
                      }
                      className={`rounded-none border px-3 py-1.5 text-sm ${
                        active ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-border bg-background text-foreground'
                      }`}
                    >
                      {day}
                    </button>
                  )
                })}
              </div>
            </div>
            <label className='sm:col-span-2 flex items-center gap-2 text-sm'>
              <input
                type='checkbox'
                checked={returnSameAsAbove}
                onChange={(e) => setReturnSameAsAbove(e.target.checked)}
              />
              Return as same above address
            </label>
            {!returnSameAsAbove ? (
              <>
                <Textarea className='sm:col-span-2 min-h-[78px] rounded-none' placeholder='Return address*' value={createForm.return_address} onChange={(e) => setCreateForm((c) => ({ ...c, return_address: e.target.value }))} />
                <Input placeholder='Return city' value={createForm.return_city} onChange={(e) => setCreateForm((c) => ({ ...c, return_city: e.target.value }))} />
                <Input placeholder='Return pin' value={createForm.return_pin} onChange={(e) => setCreateForm((c) => ({ ...c, return_pin: e.target.value }))} />
                <Input placeholder='Return state' value={createForm.return_state} onChange={(e) => setCreateForm((c) => ({ ...c, return_state: e.target.value }))} />
                <Input placeholder='Return country' value={createForm.return_country} onChange={(e) => setCreateForm((c) => ({ ...c, return_country: e.target.value }))} />
              </>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => {
                setCreateOpen(false)
                setReturnSameAsAbove(false)
              }}
            >
              Cancel
            </Button>
            <Button onClick={() => void onCreate()} disabled={busy === 'create'}>
              {busy === 'create' ? <LoaderCircle className='h-4 w-4 animate-spin' /> : <Warehouse className='h-4 w-4' />}
              {busy === 'create' ? 'Creating' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className='max-w-lg rounded-none'>
          <DialogHeader className='text-left'>
            <DialogTitle>Edit Warehouse</DialogTitle>
            <DialogDescription>{selected?.name || 'Warehouse'}</DialogDescription>
          </DialogHeader>
          <div className='grid gap-3'>
            <Textarea className='min-h-[78px] rounded-none' placeholder='Address' value={editForm.address} onChange={(e) => setEditForm((c) => ({ ...c, address: e.target.value }))} />
            <Input placeholder='Pin' value={editForm.pin} onChange={(e) => setEditForm((c) => ({ ...c, pin: e.target.value }))} />
            <Input placeholder='Phone' value={editForm.phone} onChange={(e) => setEditForm((c) => ({ ...c, phone: e.target.value }))} />
            <div className='space-y-2'>
              <p className='text-sm font-medium'>Working Days</p>
              <div className='flex flex-wrap gap-2'>
                {WORKING_DAYS.map((day) => {
                  const active = editForm.working_days.includes(day)
                  return (
                    <button
                      key={day}
                      type='button'
                      onClick={() =>
                        setEditForm((c) => ({ ...c, working_days: toggleDay(c.working_days, day) }))
                      }
                      className={`rounded-none border px-3 py-1.5 text-sm ${
                        active ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-border bg-background text-foreground'
                      }`}
                    >
                      {day}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={() => void onEdit()} disabled={busy === 'edit'}>
              {busy === 'edit' ? <LoaderCircle className='h-4 w-4 animate-spin' /> : null}
              {busy === 'edit' ? 'Updating' : 'Update'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Main>
  )
}
