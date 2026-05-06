import { createFileRoute } from '@tanstack/react-router'
import { Save } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import api from '@/lib/axios'
import { formatINR } from '@/lib/currency'
import type { RootState } from '@/store'

export const Route = createFileRoute('/_authenticated/delivery-markup/')({
  component: DeliveryMarkupPage,
})

type Markup = {
  partner_id: 'delhivery' | 'shadowfax'
  markup_type: 'percentage' | 'fixed'
  markup_value: string
  active: boolean
}

type HistoryRow = {
  _id?: string
  partner_id?: string
  order_number?: string
  actual_price?: number
  hiked_price?: number
  markup_type?: string
  markup_value?: number
  createdAt?: string
}

const defaultMarkups: Markup[] = [
  { partner_id: 'delhivery', markup_type: 'percentage', markup_value: '', active: true },
  { partner_id: 'shadowfax', markup_type: 'percentage', markup_value: '', active: true },
]

const partnerLabels: Record<Markup['partner_id'], string> = {
  delhivery: 'Delhivery',
  shadowfax: 'Shadowfax',
}

function DeliveryMarkupPage() {
  const role = useSelector((state: RootState) => state.auth.user?.role)
  const isAdmin = role === 'admin' || role === 'superadmin'
  const [markups, setMarkups] = useState<Markup[]>(defaultMarkups)
  const [history, setHistory] = useState<HistoryRow[]>([])
  const [loading, setLoading] = useState(false)

  const byPartner = useMemo(
    () => new Map(markups.map((entry) => [entry.partner_id, entry])),
    [markups]
  )

  const load = async () => {
    if (!isAdmin) return
    setLoading(true)
    try {
      const [markupRes, historyRes] = await Promise.all([
        api.get('/delivery-markup'),
        api.get('/delivery-markup/history'),
      ])
      const rows = Array.isArray(markupRes?.data?.markups) ? markupRes.data.markups : []
      setMarkups(
        defaultMarkups.map((entry) => {
          const saved = rows.find((row: any) => row.partner_id === entry.partner_id)
          return {
            ...entry,
            ...(saved || {}),
            markup_value:
              saved?.markup_value === undefined || saved?.markup_value === null
                ? ''
                : String(saved.markup_value),
          }
        })
      )
      setHistory(Array.isArray(historyRes?.data?.history) ? historyRes.data.history : [])
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to load delivery markup')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [isAdmin])

  const updateMarkup = (partnerId: Markup['partner_id'], patch: Partial<Markup>) => {
    setMarkups((current) =>
      current.map((entry) => (entry.partner_id === partnerId ? { ...entry, ...patch } : entry))
    )
  }

  const save = async () => {
    setLoading(true)
    try {
      await api.post('/delivery-markup', {
        markups: markups.map((entry) => ({
          ...entry,
          markup_value: entry.markup_value === '' ? 0 : Number(entry.markup_value),
        })),
      })
      toast.success('Delivery markup updated')
      await load()
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to save delivery markup')
    } finally {
      setLoading(false)
    }
  }

  if (!isAdmin) {
    return (
      <div className='border border-border bg-background p-6 text-sm text-muted-foreground'>
        Only admin accounts can manage delivery white-label pricing.
      </div>
    )
  }

  return (
    <div className='space-y-5 px-2 pt-10 md:px-4'>
      <div className='flex flex-wrap items-center justify-between gap-3 border border-border bg-background p-5 shadow-sm'>
        <div>
          <h1 className='text-2xl font-semibold text-foreground'>Delivery White Label Pricing</h1>
          <p className='mt-1 text-sm text-muted-foreground'>
            Configure the extra amount vendors see for Delhivery and Shadowfax courier assignment.
          </p>
        </div>
        <Button className='bg-emerald-700 text-white hover:bg-emerald-800' disabled={loading} onClick={save}>
          <Save className='h-4 w-4' />
          Save
        </Button>
      </div>

      <div className='grid gap-4 xl:grid-cols-2'>
        {defaultMarkups.map((item) => {
          const markup = byPartner.get(item.partner_id) || item
          return (
            <div key={item.partner_id} className='border border-border bg-background p-5 shadow-sm'>
              <div className='flex items-center justify-between gap-3'>
                <div>
                  <h2 className='font-semibold text-foreground'>{partnerLabels[item.partner_id]}</h2>
                  <p className='mt-1 text-xs text-muted-foreground'>
                    This markup is added only to the vendor-facing courier price.
                  </p>
                </div>
                <label className='flex items-center gap-2 text-sm text-muted-foreground'>
                  <input
                    type='checkbox'
                    checked={markup.active}
                    onChange={(event) => updateMarkup(item.partner_id, { active: event.target.checked })}
                  />
                  Active
                </label>
              </div>
              <div className='mt-5 grid gap-3 md:grid-cols-[180px_1fr]'>
                <label className='space-y-1'>
                  <span className='text-xs font-medium uppercase text-muted-foreground'>Type</span>
                  <select
                    className='h-10 w-full border border-border bg-background px-3 text-sm'
                    value={markup.markup_type}
                    onChange={(event) =>
                      updateMarkup(item.partner_id, { markup_type: event.target.value as Markup['markup_type'] })
                    }
                  >
                    <option value='percentage'>Percentage</option>
                    <option value='fixed'>Fixed amount</option>
                  </select>
                </label>
                <label className='space-y-1'>
                  <span className='text-xs font-medium uppercase text-muted-foreground'>
                    {markup.markup_type === 'fixed' ? 'Amount' : 'Percent'}
                  </span>
                  <div className='flex h-10 items-center border border-border bg-background'>
                    <span className='border-r border-border px-3 text-sm text-muted-foreground'>
                      {markup.markup_type === 'fixed' ? '₹' : '%'}
                    </span>
                    <input
                      className='h-full min-w-0 flex-1 bg-transparent px-3 text-sm outline-none'
                      inputMode='decimal'
                      placeholder='0'
                      value={markup.markup_value}
                      onChange={(event) => {
                        const value = event.target.value.replace(/[^\d.]/g, '')
                        updateMarkup(item.partner_id, { markup_value: value })
                      }}
                    />
                  </div>
                </label>
              </div>
            </div>
          )
        })}
      </div>

      <div className='border border-border bg-background p-5 shadow-sm'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <div>
            <h2 className='text-lg font-semibold text-foreground'>Price History</h2>
            <p className='mt-1 text-sm text-muted-foreground'>
              Admin-only view of actual courier price and vendor-facing marked-up price.
            </p>
          </div>
        </div>
        <div className='mt-4 overflow-x-auto'>
          <table className='min-w-full text-sm'>
            <thead className='bg-muted/50 text-left'>
              <tr>
                <th className='px-3 py-2'>Partner</th>
                <th className='px-3 py-2'>Order</th>
                <th className='px-3 py-2'>Actual</th>
                <th className='px-3 py-2'>Vendor price</th>
                <th className='px-3 py-2'>Markup</th>
                <th className='px-3 py-2'>Date</th>
              </tr>
            </thead>
            <tbody>
              {history.map((row) => (
                <tr key={row._id || `${row.order_number}-${row.createdAt}`} className='border-t border-border'>
                  <td className='px-3 py-2 capitalize'>{row.partner_id || 'all'}</td>
                  <td className='px-3 py-2'>{row.order_number || 'Not available'}</td>
                  <td className='px-3 py-2'>{formatINR(Number(row.actual_price || 0))}</td>
                  <td className='px-3 py-2'>{formatINR(Number(row.hiked_price || 0))}</td>
                  <td className='px-3 py-2'>
                    {row.markup_type === 'fixed' ? formatINR(Number(row.markup_value || 0)) : `${row.markup_value || 0}%`}
                  </td>
                  <td className='px-3 py-2'>
                    {row.createdAt ? new Date(row.createdAt).toLocaleString('en-IN') : 'Not available'}
                  </td>
                </tr>
              ))}
              {!history.length ? (
                <tr>
                  <td className='px-3 py-6 text-muted-foreground' colSpan={6}>
                    No price history yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
