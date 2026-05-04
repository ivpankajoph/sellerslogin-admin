import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import {
  CalendarClock,
  CheckCircle2,
  Clock3,
  Mail,
  Phone,
  Search,
  Table2,
  User,
  Users,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  foodOpsApi,
  type FoodOpsReservation,
  type FoodOpsTable,
} from '@/features/food-ops/api'
import { FoodModuleShell, formatLabel } from '@/features/food-ops/shared'

type ReservationStatusFilter = 'all' | 'pending' | 'confirmed' | 'cancelled'

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

const dateInputValue = (date?: Date) => (date ? format(date, 'yyyy-MM-dd') : '')

const statusTone = (status: FoodOpsReservation['status']) => {
  if (status === 'confirmed') return 'bg-emerald-100 text-emerald-700'
  if (status === 'cancelled') return 'bg-rose-100 text-rose-700'
  return 'bg-amber-100 text-amber-700'
}

const getErrorMessage = (error: unknown, fallback: string) => {
  const responseError = error as {
    response?: { data?: { message?: string } }
  }
  return responseError.response?.data?.message || fallback
}

const defaultForm = () => ({
  customer_name: '',
  customer_phone: '',
  customer_email: '',
  number_of_persons: '',
  reservation_date: dateInputValue(new Date()),
  reservation_time: '',
  status: 'pending',
  table_id: 'auto',
  notes: '',
})

export default function FoodTableReservationsPage() {
  const [tables, setTables] = useState<FoodOpsTable[]>([])
  const [reservations, setReservations] = useState<FoodOpsReservation[]>([])
  const [saving, setSaving] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] =
    useState<ReservationStatusFilter>('all')
  const [form, setForm] = useState(defaultForm)

  const loadData = async () => {
    try {
      const [tablesData, reservationsData] = await Promise.all([
        foodOpsApi.getTables(),
        foodOpsApi.getReservations(),
      ])
      setTables(tablesData)
      setReservations(reservationsData)
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to load reservations'))
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
      setForm(defaultForm())
      setSelectedDate(toDateValue(form.reservation_date) || new Date())
      await loadData()
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to save reservation'))
    } finally {
      setSaving(false)
    }
  }

  const updateStatus = async (
    reservationId: string,
    status: FoodOpsReservation['status']
  ) => {
    try {
      await foodOpsApi.updateReservation(reservationId, { status })
      toast.success('Reservation updated')
      await loadData()
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to update reservation'))
    }
  }

  const reservationDates = useMemo(
    () =>
      reservations
        .map((reservation) => toDateValue(reservation.reservation_date))
        .filter((value): value is Date => !!value),
    [reservations]
  )

  const selectedDateReservations = useMemo(() => {
    const searchValue = search.trim().toLowerCase()
    return reservations.filter((reservation) => {
      const matchesDate = sameDay(
        selectedDate,
        toDateValue(reservation.reservation_date)
      )
      const matchesStatus =
        statusFilter === 'all' || reservation.status === statusFilter
      const matchesSearch =
        !searchValue ||
        [
          reservation.customer_name,
          reservation.customer_phone,
          reservation.customer_email,
          reservation.notes,
          typeof reservation.table_id === 'object'
            ? reservation.table_id?.number
            : '',
        ].some((field) =>
          String(field || '')
            .toLowerCase()
            .includes(searchValue)
        )

      return matchesDate && matchesStatus && matchesSearch
    })
  }, [reservations, search, selectedDate, statusFilter])

  const stats = useMemo(
    () => ({
      total: reservations.length,
      today: reservations.filter((reservation) =>
        sameDay(new Date(), toDateValue(reservation.reservation_date))
      ).length,
      pending: reservations.filter(
        (reservation) => reservation.status === 'pending'
      ).length,
      confirmed: reservations.filter(
        (reservation) => reservation.status === 'confirmed'
      ).length,
    }),
    [reservations]
  )

  const selectedDateLabel = selectedDate
    ? selectedDate.toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : 'Selected date'

  return (
    <FoodModuleShell
      title='Table Reservations'
      description='Create reservations, auto-assign the best table, and review the booking calendar in one place.'
      moduleLabel='Table Reservations'
      showModuleCard={false}
    >
      <div className='grid gap-4 md:grid-cols-4'>
        {[
          { label: 'Total', value: stats.total, icon: CalendarClock },
          { label: 'Today', value: stats.today, icon: Clock3 },
          { label: 'Pending', value: stats.pending, icon: Users },
          { label: 'Confirmed', value: stats.confirmed, icon: CheckCircle2 },
        ].map((stat) => (
          <Card
            key={stat.label}
            className='rounded-2xl border border-slate-200 bg-white py-0 shadow-sm'
          >
            <CardContent className='flex items-center justify-between gap-4 p-5'>
              <div>
                <p className='text-xs font-black tracking-[0.16em] text-slate-400 uppercase'>
                  {stat.label}
                </p>
                <p className='mt-2 text-2xl font-black text-slate-950'>
                  {stat.value}
                </p>
              </div>
              <span className='inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-700'>
                <stat.icon className='h-5 w-5' />
              </span>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className='grid gap-6 xl:grid-cols-[minmax(520px,1fr)_minmax(360px,440px)]'>
        <Card className='overflow-hidden rounded-[28px] border border-slate-200 bg-white py-0 shadow-[0_18px_45px_rgba(15,23,42,0.08)]'>
          <CardHeader className='border-b border-slate-100 px-5 py-5 sm:px-6'>
            <div className='flex items-center gap-3'>
              <span className='inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-700'>
                <CalendarClock className='h-6 w-6' />
              </span>
              <div>
                <CardTitle className='text-2xl font-black text-slate-950'>
                  New Reservation
                </CardTitle>
                <p className='mt-1 text-sm font-medium text-slate-500'>
                  Save guest details and reserve a table.
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className='space-y-4 bg-slate-50/70 p-5 sm:p-6 lg:px-8'>
            <div className='relative'>
              <User className='absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-slate-400' />
              <Input
                className='h-12 rounded-2xl bg-white pl-11 font-semibold'
                placeholder='Customer name'
                value={form.customer_name}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    customer_name: event.target.value,
                  }))
                }
              />
            </div>
            <div className='grid gap-4 md:grid-cols-2'>
              <div className='relative'>
                <Phone className='absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-slate-400' />
                <Input
                  className='h-12 rounded-2xl bg-white pl-11 font-semibold'
                  placeholder='Customer phone'
                  value={form.customer_phone}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      customer_phone: event.target.value,
                    }))
                  }
                />
              </div>
              <div className='relative'>
                <Mail className='absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-slate-400' />
                <Input
                  className='h-12 rounded-2xl bg-white pl-11 font-semibold'
                  placeholder='Customer email'
                  value={form.customer_email}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      customer_email: event.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <div className='grid gap-4 md:grid-cols-3'>
              <Input
                className='h-12 rounded-2xl bg-white font-semibold'
                placeholder='Guests'
                value={form.number_of_persons}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    number_of_persons: event.target.value,
                  }))
                }
              />
              <Input
                type='date'
                className='h-12 rounded-2xl bg-white font-semibold'
                value={form.reservation_date}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    reservation_date: event.target.value,
                  }))
                }
              />
              <Input
                type='time'
                className='h-12 rounded-2xl bg-white font-semibold'
                value={form.reservation_time}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    reservation_time: event.target.value,
                  }))
                }
              />
            </div>
            <div className='max-w-md'>
              <Select
                value={form.table_id}
                onValueChange={(value) =>
                  setForm((current) => ({ ...current, table_id: value }))
                }
              >
                <SelectTrigger className='h-12 rounded-2xl bg-white font-semibold'>
                  <SelectValue placeholder='Select table' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='auto'>Auto assign best table</SelectItem>
                  {tables.map((table) => (
                    <SelectItem key={table._id} value={table._id}>
                      Table {table.number} ({table.capacity} seats)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Textarea
              className='min-h-24 rounded-2xl bg-white font-semibold'
              placeholder='Notes'
              value={form.notes}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  notes: event.target.value,
                }))
              }
            />
            <Button
              className='h-14 w-full rounded-2xl bg-sky-600 text-sm font-black tracking-[0.08em] text-white uppercase shadow-[0_14px_30px_rgba(2,132,199,0.25)] hover:bg-sky-700'
              onClick={() => void saveReservation()}
              disabled={saving}
            >
              {saving ? 'Saving reservation...' : 'Save Reservation'}
            </Button>
          </CardContent>
        </Card>

        <Card className='overflow-hidden rounded-[28px] border border-slate-200 bg-white py-0 shadow-[0_18px_45px_rgba(15,23,42,0.08)]'>
          <CardHeader className='border-b border-slate-100 px-5 py-5 sm:px-6'>
            <div>
              <CardTitle className='text-2xl font-black text-slate-950'>
                Reservation Calendar
              </CardTitle>
              <p className='mt-1 text-sm font-medium text-slate-500'>
                Pick a date to view booking details below.
              </p>
            </div>
          </CardHeader>
          <CardContent className='bg-slate-50/70 p-5 sm:p-6'>
            <div className='mx-auto w-full max-w-[360px] rounded-2xl border border-slate-200 bg-white p-3 shadow-sm'>
              <Calendar
                mode='single'
                selected={selectedDate}
                onSelect={setSelectedDate}
                modifiers={{ booked: reservationDates }}
                modifiersClassNames={{
                  booked: 'bg-amber-100 text-amber-900 font-bold',
                }}
                className='w-full'
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className='overflow-hidden rounded-[28px] border border-slate-200 bg-white py-0 shadow-[0_18px_45px_rgba(15,23,42,0.08)]'>
        <CardHeader className='border-b border-slate-100 px-5 py-5 sm:px-6'>
          <div className='flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between'>
            <div>
              <CardTitle className='text-2xl font-black text-slate-950'>
                Reservations for {selectedDateLabel}
              </CardTitle>
              <p className='mt-1 text-sm font-medium text-slate-500'>
                {selectedDateReservations.length} booking(s) found for the
                selected date.
              </p>
            </div>
            <div className='grid w-full gap-3 sm:grid-cols-[minmax(220px,1fr)_180px] xl:max-w-xl'>
              <div className='relative'>
                <Search className='absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-slate-400' />
                <Input
                  className='h-12 rounded-2xl bg-slate-50 pl-11 font-semibold'
                  placeholder='Search name or phone...'
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
              <Select
                value={statusFilter}
                onValueChange={(value) =>
                  setStatusFilter(value as ReservationStatusFilter)
                }
              >
                <SelectTrigger className='h-12 rounded-2xl bg-slate-50 font-black'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>All Status</SelectItem>
                  <SelectItem value='pending'>Pending</SelectItem>
                  <SelectItem value='confirmed'>Confirmed</SelectItem>
                  <SelectItem value='cancelled'>Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className='bg-slate-50/70 p-4 sm:p-6'>
          {selectedDateReservations.length ? (
            <div className='grid gap-4 xl:grid-cols-2'>
              {selectedDateReservations.map((reservation) => (
                <article
                  key={reservation._id}
                  className='min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm'
                >
                  <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
                    <div className='min-w-0'>
                      <div className='flex flex-wrap items-center gap-2'>
                        <p className='text-base font-black text-slate-950'>
                          {reservation.customer_name}
                        </p>
                        <Badge
                          className={`rounded-full px-3 py-1 text-[10px] font-black uppercase shadow-none ${statusTone(reservation.status)}`}
                        >
                          {formatLabel(reservation.status)}
                        </Badge>
                      </div>
                      <div className='mt-3 grid gap-2 text-sm font-semibold text-slate-600 sm:grid-cols-2'>
                        <span className='inline-flex items-center gap-2'>
                          <Phone className='h-4 w-4 text-slate-400' />
                          {reservation.customer_phone}
                        </span>
                        <span className='inline-flex items-center gap-2'>
                          <Users className='h-4 w-4 text-slate-400' />
                          {reservation.number_of_persons} guests
                        </span>
                        <span className='inline-flex items-center gap-2'>
                          <Clock3 className='h-4 w-4 text-slate-400' />
                          {reservation.reservation_time || 'No time'}
                        </span>
                        <span className='inline-flex items-center gap-2'>
                          <Table2 className='h-4 w-4 text-slate-400' />
                          Table{' '}
                          {typeof reservation.table_id === 'object'
                            ? reservation.table_id?.number || 'Auto pending'
                            : 'Auto pending'}
                        </span>
                      </div>
                      {reservation.notes ? (
                        <p className='mt-3 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-500'>
                          {reservation.notes}
                        </p>
                      ) : null}
                    </div>
                    <div className='flex flex-wrap gap-2'>
                      <Button
                        variant='outline'
                        className='rounded-xl border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                        onClick={() =>
                          void updateStatus(reservation._id, 'confirmed')
                        }
                      >
                        <CheckCircle2 className='mr-2 h-4 w-4' />
                        Confirm
                      </Button>
                      <Button
                        variant='outline'
                        className='rounded-xl border-rose-200 text-rose-700 hover:bg-rose-50'
                        onClick={() =>
                          void updateStatus(reservation._id, 'cancelled')
                        }
                      >
                        <XCircle className='mr-2 h-4 w-4' />
                        Cancel
                      </Button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className='flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-12 text-center shadow-sm'>
              <CalendarClock className='h-12 w-12 text-slate-300' />
              <p className='mt-4 text-lg font-black text-slate-950'>
                No reservations found
              </p>
              <p className='mt-1 max-w-md text-sm text-slate-500'>
                Try another date, status, or search value.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </FoodModuleShell>
  )
}
