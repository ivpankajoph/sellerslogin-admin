import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
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
  type FoodOpsReservation,
  type FoodOpsTable,
} from '@/features/food-ops/api'

const toDateValue = (value?: string) => {
  if (!value) return undefined
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date
}

const sameDay = (a?: Date, b?: Date) =>
  !!a &&
  !!b &&
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate()

export default function FoodTableReservationsPage() {
  const [tables, setTables] = useState<FoodOpsTable[]>([])
  const [reservations, setReservations] = useState<FoodOpsReservation[]>([])
  const [saving, setSaving] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [form, setForm] = useState({
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    number_of_persons: '',
    reservation_date: '',
    reservation_time: '',
    status: 'pending',
    table_id: 'auto',
    notes: '',
  })

  const loadData = async () => {
    try {
      const [tablesData, reservationsData] = await Promise.all([
        foodOpsApi.getTables(),
        foodOpsApi.getReservations(),
      ])
      setTables(tablesData)
      setReservations(reservationsData)
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to load reservations')
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  const saveReservation = async () => {
    if (!form.customer_name.trim() || !form.customer_phone.trim()) {
      return toast.error('Customer name and phone are required')
    }
    if (!form.reservation_date || !form.reservation_time) {
      return toast.error('Reservation date and time are required')
    }
    setSaving(true)
    try {
      await foodOpsApi.createReservation({
        ...form,
        number_of_persons: Number(form.number_of_persons || 1),
        table_id: form.table_id === 'auto' ? undefined : form.table_id,
      })
      toast.success(
        form.table_id === 'auto'
          ? 'Reservation saved and table auto-assigned'
          : 'Reservation saved'
      )
      setForm({
        customer_name: '',
        customer_phone: '',
        customer_email: '',
        number_of_persons: '',
        reservation_date: '',
        reservation_time: '',
        status: 'pending',
        table_id: 'auto',
        notes: '',
      })
      await loadData()
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to save reservation')
    } finally {
      setSaving(false)
    }
  }

  const updateStatus = async (reservationId: string, status: FoodOpsReservation['status']) => {
    try {
      await foodOpsApi.updateReservation(reservationId, { status })
      toast.success('Reservation updated')
      await loadData()
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to update reservation')
    }
  }

  const reservationDates = useMemo(
    () =>
      reservations
        .map((reservation) => toDateValue(reservation.reservation_date))
        .filter((value): value is Date => !!value),
    [reservations]
  )

  const reservationsForSelectedDate = useMemo(() => {
    return reservations.filter((reservation) =>
      sameDay(selectedDate, toDateValue(reservation.reservation_date))
    )
  }, [reservations, selectedDate])

  return (
    <FoodModuleShell
      title='Table Reservations'
      description='Create reservations, auto-assign the best table, and review the booking calendar in one place.'
      moduleLabel='Table Reservations'
    >
      <div className='grid gap-6 xl:grid-cols-[0.92fr_1.08fr]'>
        <Card className='rounded-[28px] border border-slate-200 bg-white py-0 shadow-sm'>
          <CardHeader className='px-6 py-5'>
            <CardTitle className='text-xl font-black text-slate-900'>New Reservation</CardTitle>
          </CardHeader>
          <CardContent className='space-y-3 px-6 pb-6'>
            <Input placeholder='Customer name' value={form.customer_name} onChange={(event) => setForm((current) => ({ ...current, customer_name: event.target.value }))} />
            <Input placeholder='Customer phone' value={form.customer_phone} onChange={(event) => setForm((current) => ({ ...current, customer_phone: event.target.value }))} />
            <Input placeholder='Customer email' value={form.customer_email} onChange={(event) => setForm((current) => ({ ...current, customer_email: event.target.value }))} />
            <Input placeholder='Number of persons' value={form.number_of_persons} onChange={(event) => setForm((current) => ({ ...current, number_of_persons: event.target.value }))} />
            <Input type='date' value={form.reservation_date} onChange={(event) => setForm((current) => ({ ...current, reservation_date: event.target.value }))} />
            <Input type='time' value={form.reservation_time} onChange={(event) => setForm((current) => ({ ...current, reservation_time: event.target.value }))} />
            <Select value={form.table_id} onValueChange={(value) => setForm((current) => ({ ...current, table_id: value }))}>
              <SelectTrigger><SelectValue placeholder='Select table' /></SelectTrigger>
              <SelectContent>
                <SelectItem value='auto'>Auto assign best table</SelectItem>
                {tables.map((table) => (
                  <SelectItem key={table._id} value={table._id}>
                    Table {table.number} ({table.capacity} seats)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea placeholder='Notes' value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} />
            <Button className='w-full rounded-2xl' onClick={() => void saveReservation()} disabled={saving}>Save Reservation</Button>
          </CardContent>
        </Card>

        <div className='space-y-6'>
          <Card className='rounded-[28px] border border-slate-200 bg-white py-0 shadow-sm'>
            <CardHeader className='px-6 py-5'>
              <CardTitle className='text-xl font-black text-slate-900'>Reservation Calendar</CardTitle>
            </CardHeader>
            <CardContent className='px-6 pb-6'>
              <Calendar
                mode='single'
                selected={selectedDate}
                onSelect={setSelectedDate}
                modifiers={{ booked: reservationDates }}
                modifiersClassNames={{ booked: 'bg-amber-100 text-amber-900 font-bold' }}
                className='rounded-2xl border border-slate-200'
              />
            </CardContent>
          </Card>

          <Card className='rounded-[28px] border border-slate-200 bg-white py-0 shadow-sm'>
            <CardHeader className='px-6 py-5'>
              <CardTitle className='text-xl font-black text-slate-900'>
                {selectedDate
                  ? `Reservations for ${selectedDate.toLocaleDateString()}`
                  : 'Upcoming Reservations'}
              </CardTitle>
            </CardHeader>
            <CardContent className='space-y-3 px-6 pb-6'>
              {reservationsForSelectedDate.length ? reservationsForSelectedDate.map((reservation) => (
                <div key={reservation._id} className='rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4'>
                  <div className='flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
                    <div>
                      <p className='text-sm font-black text-slate-900'>{reservation.customer_name}</p>
                      <p className='mt-1 text-xs text-slate-500'>
                        {reservation.customer_phone} • {reservation.number_of_persons} guests
                      </p>
                      <p className='mt-1 text-xs text-slate-500'>
                        {reservation.reservation_time} • Table{' '}
                        {typeof reservation.table_id === 'object'
                          ? reservation.table_id?.number || 'Auto pending'
                          : 'Auto pending'}
                      </p>
                    </div>
                    <div className='flex flex-wrap gap-2'>
                      <Button variant='outline' className='rounded-xl' onClick={() => void updateStatus(reservation._id, 'confirmed')}>Confirm</Button>
                      <Button variant='outline' className='rounded-xl' onClick={() => void updateStatus(reservation._id, 'cancelled')}>Cancel</Button>
                    </div>
                  </div>
                </div>
              )) : <div className='rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500'>No reservations on this date.</div>}
            </CardContent>
          </Card>
        </div>
      </div>
    </FoodModuleShell>
  )
}
