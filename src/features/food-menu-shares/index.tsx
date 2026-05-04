import { useEffect, useMemo, useState } from 'react'
import {
  CheckCircle2,
  Clock3,
  Copy,
  ExternalLink,
  Mail,
  MessageCircle,
  Search,
  Send,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'

import api from '@/lib/axios'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { FoodModuleShell } from '@/features/food-ops/shared'

type ShareChannel = {
  channel: 'whatsapp' | 'email'
  success?: boolean
  status?: string
  delivery_confirmed?: boolean
  message?: string
}

type MenuShareLog = {
  _id: string
  customer_name?: string
  whatsapp?: string
  email?: string
  link_type?: string
  link?: string
  status?: 'sent' | 'partial' | 'failed'
  channels?: ShareChannel[]
  createdAt?: string
}

type ShareSummary = {
  total?: number
  sent?: number
  partial?: number
  failed?: number
  unique_customers?: number
}

type StatusFilter = 'all' | 'sent' | 'partial' | 'failed'

const formatDateTime = (value?: string) => {
  if (!value) return 'No date'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'No date'
  return date.toLocaleString()
}

const statusTone = (status?: string) => {
  if (status === 'sent') return 'bg-emerald-100 text-emerald-700'
  if (status === 'partial') return 'bg-amber-100 text-amber-700'
  return 'bg-rose-100 text-rose-700'
}

const channelText = (channel: ShareChannel) => {
  if (channel.channel === 'email') return channel.success ? 'Email sent' : 'Email failed'
  if (channel.delivery_confirmed) return 'WhatsApp delivered'
  return channel.success ? 'WhatsApp submitted' : 'WhatsApp failed'
}

const channelTone = (channel: ShareChannel) => {
  if (!channel.success) return 'border-rose-200 bg-rose-50 text-rose-700'
  if (channel.channel === 'whatsapp' && !channel.delivery_confirmed) {
    return 'border-amber-200 bg-amber-50 text-amber-700'
  }
  return 'border-emerald-200 bg-emerald-50 text-emerald-700'
}

export default function FoodMenuSharesPage() {
  const [logs, setLogs] = useState<MenuShareLog[]>([])
  const [summary, setSummary] = useState<ShareSummary>({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  useEffect(() => {
    let active = true
    const loadLogs = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        if (statusFilter !== 'all') params.set('status', statusFilter)
        if (search.trim()) params.set('search', search.trim())
        const response = await api.get(`/food/share-menu-links?${params.toString()}`)
        if (!active) return
        setLogs(Array.isArray(response?.data?.rows) ? response.data.rows : [])
        setSummary(response?.data?.summary || {})
      } catch (error: any) {
        if (active) {
          toast.error(error?.response?.data?.message || 'Failed to load menu share history')
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    const timeout = window.setTimeout(() => {
      void loadLogs()
    }, 250)

    return () => {
      active = false
      window.clearTimeout(timeout)
    }
  }, [search, statusFilter])

  const stats = useMemo(
    () => [
      { label: 'Total Attempts', value: summary.total || 0, icon: Send, tone: 'text-sky-700 bg-sky-50' },
      { label: 'Sent', value: summary.sent || 0, icon: CheckCircle2, tone: 'text-emerald-700 bg-emerald-50' },
      { label: 'Partial', value: summary.partial || 0, icon: Clock3, tone: 'text-amber-700 bg-amber-50' },
      { label: 'Failed', value: summary.failed || 0, icon: XCircle, tone: 'text-rose-700 bg-rose-50' },
    ],
    [summary]
  )

  const copyLink = async (link?: string) => {
    if (!link) {
      toast.error('No link available')
      return
    }
    try {
      await navigator.clipboard.writeText(link)
      toast.success('Menu link copied')
    } catch {
      toast.error('Could not copy link')
    }
  }

  return (
    <FoodModuleShell
      title='Menu Share History'
      description='Track every menu link sent by WhatsApp or email.'
      moduleLabel='Customer Messaging'
      showModuleCard={false}
    >
      <div className='grid gap-3 md:grid-cols-2 xl:grid-cols-4'>
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.label} className='rounded-xl border-slate-200 py-0 shadow-sm'>
              <CardContent className='flex items-center justify-between gap-4 p-4'>
                <div>
                  <p className='text-[11px] font-black uppercase tracking-[0.16em] text-slate-400'>
                    {stat.label}
                  </p>
                  <p className='mt-2 text-2xl font-black text-slate-950'>{stat.value}</p>
                </div>
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${stat.tone}`}>
                  <Icon className='h-5 w-5' />
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card className='rounded-xl border-slate-200 py-0 shadow-sm'>
        <CardContent className='p-0'>
          <div className='flex flex-col gap-4 border-b border-slate-100 p-5 xl:flex-row xl:items-center xl:justify-between'>
            <div>
              <h2 className='text-xl font-black text-slate-950'>Sent Menu Links</h2>
              <p className='mt-1 text-sm text-slate-500'>
                {loading ? 'Loading records...' : `${logs.length} records showing`}
              </p>
            </div>
            <div className='flex flex-col gap-3 xl:flex-row'>
              <div className='relative w-full xl:w-[360px]'>
                <Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400' />
                <Input
                  className='h-10 rounded-lg pl-10'
                  placeholder='Search customer, phone, email...'
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
              <div className='grid grid-cols-4 overflow-hidden rounded-lg border border-slate-200 bg-white'>
                {(['all', 'sent', 'partial', 'failed'] as StatusFilter[]).map((item) => (
                  <button
                    key={item}
                    type='button'
                    onClick={() => setStatusFilter(item)}
                    className={`h-10 px-3 text-[11px] font-black uppercase tracking-[0.12em] ${
                      statusFilter === item
                        ? 'bg-[#0b6691] text-white'
                        : 'text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className='divide-y divide-slate-100'>
            {logs.length ? (
              logs.map((log) => (
                <div
                  key={log._id}
                  className='grid gap-4 p-5 transition hover:bg-slate-50/70 xl:grid-cols-[1.1fr_1fr_1.15fr_1fr_auto] xl:items-center'
                >
                  <div className='min-w-0'>
                    <p className='truncate text-base font-black text-slate-950'>
                      {log.customer_name || 'Customer'}
                    </p>
                    <p className='mt-1 text-xs font-semibold text-slate-500'>
                      {formatDateTime(log.createdAt)}
                    </p>
                    <Badge className={`mt-2 rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.1em] ${statusTone(log.status)}`}>
                      {log.status || 'failed'}
                    </Badge>
                  </div>
                  <div className='space-y-2 text-sm font-semibold text-slate-600'>
                    <p className='flex items-center gap-2'>
                      <MessageCircle className='h-4 w-4 text-emerald-600' />
                      {log.whatsapp || '-'}
                    </p>
                    <p className='flex items-center gap-2'>
                      <Mail className='h-4 w-4 text-slate-500' />
                      {log.email || '-'}
                    </p>
                  </div>
                  <div className='min-w-0'>
                    <p className='text-xs font-black uppercase tracking-[0.16em] text-slate-400'>
                      {log.link_type || 'Full menu'}
                    </p>
                    <a
                      href={log.link}
                      target='_blank'
                      rel='noreferrer'
                      className='mt-2 block truncate text-sm font-semibold text-[#0b6691] hover:underline'
                    >
                      {log.link || '-'}
                    </a>
                  </div>
                  <div className='space-y-2'>
                    {(log.channels || []).map((channel) => (
                      <div
                        key={`${log._id}-${channel.channel}`}
                        className={`rounded-lg border px-3 py-2 text-xs font-bold ${channelTone(channel)}`}
                      >
                        {channelText(channel)}
                      </div>
                    ))}
                  </div>
                  <div className='flex gap-2 xl:justify-end'>
                    <Button
                      variant='outline'
                      size='sm'
                      className='h-9 rounded-lg px-3'
                      onClick={() => copyLink(log.link)}
                    >
                      <Copy className='h-4 w-4' />
                    </Button>
                    <Button
                      asChild
                      variant='outline'
                      size='sm'
                      className='h-9 rounded-lg px-3'
                    >
                      <a href={log.link || '#'} target='_blank' rel='noreferrer'>
                        <ExternalLink className='h-4 w-4' />
                      </a>
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className='px-5 py-12 text-center'>
                <div className='mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-300'>
                  <Send className='h-7 w-7' />
                </div>
                <p className='mt-4 text-lg font-black text-slate-950'>
                  No menu share history yet
                </p>
                <p className='mt-2 text-sm text-slate-500'>
                  Send a menu link from the dashboard to create the first record.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </FoodModuleShell>
  )
}
