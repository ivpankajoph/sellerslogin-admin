import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { VITE_PUBLIC_API_URL } from '@/config'
import { useSelector } from 'react-redux'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'

type Summary = {
  totals: {
    pageViews: number
    uniqueVisitors: number
    sessions: number
    avgTimeOnPageMs: number
  }
  topPages: Array<{ path: string; views: number }>
  topReferrers: Array<{ referrer: string; visits: number }>
  topBrowsers: Array<{ browser: string; visits: number }>
  topDevices: Array<{ device: string; visits: number }>
  topCountries: Array<{ country: string; visits: number }>
  timeline: Array<{ date: string; views: number }>
}

type AnalyticsEvent = {
  _id: string
  eventType: string
  path: string
  visitorId?: string
  userId?: string
  ip?: string
  durationMs?: number
  browser?: string
  device?: string
  country?: string
  city?: string
  createdAt: string
  user?: { name?: string; email?: string; phone?: string }
}

type VisitorSummary = {
  key: string
  type: 'user' | 'ip' | 'visitorId'
  visits: number
  lastSeen: string
  user?: { name?: string; email?: string; phone?: string }
}

const ranges = [
  { value: '24h', label: 'Last 24 hours' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
]

const formatDuration = (ms: number) => {
  if (!ms || ms <= 0) return '0s'
  const totalSeconds = Math.round(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  if (minutes <= 0) return `${seconds}s`
  return `${minutes}m ${seconds}s`
}

const formatVisitorLabel = (visitor: VisitorSummary) => {
  if (visitor.user?.name || visitor.user?.email) {
    return `${visitor.user?.name || 'Customer'}${
      visitor.user?.email ? ` • ${visitor.user.email}` : ''
    }`
  }
  return visitor.key
}

export default function VendorAnalytics() {
  const [range, setRange] = useState('7d')
  const [summary, setSummary] = useState<Summary | null>(null)
  const [events, setEvents] = useState<AnalyticsEvent[]>([])
  const [visitors, setVisitors] = useState<VisitorSummary[]>([])
  const [selectedVisitor, setSelectedVisitor] = useState<VisitorSummary | null>(
    null
  )
  const [page, setPage] = useState(1)
  const [, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const auth = useSelector((state: any) => state.auth)
  const vendorId = auth?.user?._id || auth?.user?.id

  const pageSize = 20

  const chartMax = useMemo(() => {
    if (!summary?.timeline?.length) return 0
    return Math.max(...summary.timeline.map((item) => item.views))
  }, [summary])

  useEffect(() => {
    if (!vendorId) return
    const fetchSummary = async () => {
      setLoading(true)
      try {
        const res = await axios.get(
          `${VITE_PUBLIC_API_URL}/v1/analytics/summary`,
          {
            params: { range, vendorId },
          }
        )
        setSummary(res.data)
      } catch (error) {
        console.error('Failed to load vendor analytics summary', error)
      } finally {
        setLoading(false)
      }
    }
    fetchSummary()
  }, [range, vendorId])

  useEffect(() => {
    if (!vendorId) return
    const fetchEvents = async () => {
      try {
        const res = await axios.get(
          `${VITE_PUBLIC_API_URL}/v1/analytics/events`,
          {
            params: {
              range: selectedVisitor ? 'all' : range,
              page,
              pageSize,
              vendorId,
              includeUser: 1,
              userId:
                selectedVisitor?.type === 'user'
                  ? selectedVisitor.key
                  : undefined,
              ip:
                selectedVisitor?.type === 'ip'
                  ? selectedVisitor.key
                  : undefined,
              visitorId:
                selectedVisitor?.type === 'visitorId'
                  ? selectedVisitor.key
                  : undefined,
            },
          }
        )
        setEvents(res.data.events || [])
        setTotal(res.data.total || 0)
      } catch (error) {
        console.error('Failed to load vendor analytics events', error)
      }
    }
    fetchEvents()
  }, [range, page, vendorId, selectedVisitor])

  useEffect(() => {
    if (!vendorId) return
    const fetchVisitors = async () => {
      try {
        const res = await axios.get(
          `${VITE_PUBLIC_API_URL}/v1/analytics/visitors`,
          {
            params: { range: 'all', page: 1, pageSize: 10, vendorId },
          }
        )
        setVisitors(res.data.visitors || [])
      } catch (error) {
        console.error('Failed to load vendor analytics visitors', error)
      }
    }
    fetchVisitors()
  }, [vendorId, range])

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

      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div className='flex flex-wrap items-end justify-between gap-3'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>
              Storefront Analytics
            </h2>
            <p className='text-muted-foreground'>
              Track visitor activity for your template storefront.
            </p>
          </div>
          <div className='flex items-center gap-2'>
            <label className='text-muted-foreground text-sm font-medium'>
              Range
            </label>
            <select
              className='rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm'
              value={range}
              onChange={(event) => {
                setRange(event.target.value)
                setPage(1)
              }}
            >
              {ranges.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
          <Card>
            <CardHeader>
              <CardTitle>Total Page Views</CardTitle>
              <CardDescription>All page views in range</CardDescription>
            </CardHeader>
            <CardContent className='text-3xl font-semibold'>
              {summary?.totals.pageViews ?? 0}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Unique Visitors</CardTitle>
              <CardDescription>Distinct visitors tracked</CardDescription>
            </CardHeader>
            <CardContent className='text-3xl font-semibold'>
              {summary?.totals.uniqueVisitors ?? 0}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Sessions</CardTitle>
              <CardDescription>Unique sessions created</CardDescription>
            </CardHeader>
            <CardContent className='text-3xl font-semibold'>
              {summary?.totals.sessions ?? 0}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Avg. Time on Page</CardTitle>
              <CardDescription>Per page session</CardDescription>
            </CardHeader>
            <CardContent className='text-3xl font-semibold'>
              {formatDuration(summary?.totals.avgTimeOnPageMs ?? 0)}
            </CardContent>
          </Card>
        </div>

        <div className='grid gap-4 lg:grid-cols-[2fr_1fr]'>
          <Card>
            <CardHeader>
              <CardTitle>Daily Traffic</CardTitle>
              <CardDescription>Page views by day</CardDescription>
            </CardHeader>
            <CardContent>
              <div className='space-y-2'>
                {(summary?.timeline || []).map((item) => (
                  <div key={item.date} className='flex items-center gap-3'>
                    <span className='text-muted-foreground w-24 text-xs'>
                      {item.date}
                    </span>
                    <div className='h-2 flex-1 rounded-full bg-slate-100'>
                      <div
                        className='h-2 rounded-full bg-slate-900'
                        style={{
                          width: `${
                            chartMax ? (item.views / chartMax) * 100 : 0
                          }%`,
                        }}
                      />
                    </div>
                    <span className='w-10 text-end text-xs font-medium'>
                      {item.views}
                    </span>
                  </div>
                ))}
                {!summary?.timeline?.length && (
                  <p className='text-muted-foreground text-sm'>
                    No traffic yet in this range.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <div className='grid gap-4'>
            <Card>
              <CardHeader>
                <CardTitle>Top Pages</CardTitle>
                <CardDescription>Most visited URLs</CardDescription>
              </CardHeader>
              <CardContent>
                <div className='space-y-2'>
                  {(summary?.topPages || []).map((page) => (
                    <div
                      key={page.path}
                      className='flex items-center justify-between text-sm'
                    >
                      <span className='truncate pr-2'>{page.path}</span>
                      <span className='font-medium'>{page.views}</span>
                    </div>
                  ))}
                  {!summary?.topPages?.length && (
                    <p className='text-muted-foreground text-sm'>
                      No page data yet.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Referrers</CardTitle>
                <CardDescription>Where visitors came from</CardDescription>
              </CardHeader>
              <CardContent>
                <div className='space-y-2'>
                  {(summary?.topReferrers || []).map((item) => (
                    <div
                      key={item.referrer}
                      className='flex items-center justify-between text-sm'
                    >
                      <span className='truncate pr-2'>{item.referrer}</span>
                      <span className='font-medium'>{item.visits}</span>
                    </div>
                  ))}
                  {!summary?.topReferrers?.length && (
                    <p className='text-muted-foreground text-sm'>
                      No referrer data yet.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Unique Visitors</CardTitle>
                <CardDescription>Grouped by user/IP (all time)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className='space-y-2'>
                  {visitors.map((visitor) => (
                    <button
                      key={visitor.key}
                      className={`flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition ${
                        selectedVisitor?.key === visitor.key
                          ? 'border-slate-900 bg-slate-50'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                      onClick={() => {
                        setSelectedVisitor(visitor)
                        setPage(1)
                      }}
                    >
                      <span className='truncate pr-2'>
                        {formatVisitorLabel(visitor)}
                      </span>
                      <span className='text-muted-foreground text-xs'>
                        {visitor.visits} visits
                      </span>
                    </button>
                  ))}
                  {!visitors.length && (
                    <p className='text-muted-foreground text-sm'>
                      No visitor data yet.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {selectedVisitor ? (
          <Card>
            <CardHeader>
              <CardTitle>Visitor History</CardTitle>
              <CardDescription>All events for selected visitor</CardDescription>
              <div className='mt-2 flex items-center gap-2 text-sm'>
                <span className='rounded-full bg-slate-100 px-3 py-1'>
                  History for {formatVisitorLabel(selectedVisitor)} (all time)
                </span>
                <button
                  className='text-xs font-medium text-slate-600 hover:text-slate-900'
                  onClick={() => {
                    setSelectedVisitor(null)
                    setPage(1)
                  }}
                >
                  Clear filter
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event</TableHead>
                    <TableHead>Path</TableHead>
                    <TableHead>User/IP</TableHead>
                    <TableHead>Device</TableHead>
                    <TableHead>Browser</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((event) => (
                    <TableRow key={event._id}>
                      <TableCell className='capitalize'>
                        {event.eventType.replace('_', ' ')}
                      </TableCell>
                      <TableCell className='max-w-[240px] truncate'>
                        {event.path}
                      </TableCell>
                      <TableCell className='max-w-[200px] truncate'>
                        {event.user?.name
                          ? `${event.user.name}${event.user.email ? ` • ${event.user.email}` : ''}`
                          : event.ip ||
                            event.visitorId ||
                            event.userId ||
                            'anonymous'}
                      </TableCell>
                      <TableCell className='capitalize'>
                        {event.device || '-'}
                      </TableCell>
                      <TableCell className='max-w-[180px] truncate'>
                        {event.browser || '-'}
                      </TableCell>
                      <TableCell className='max-w-[200px] truncate'>
                        {event.city || event.country
                          ? `${event.city ? `${event.city}, ` : ''}${event.country || ''}`
                          : '-'}
                      </TableCell>
                      <TableCell>
                        {event.eventType === 'page_duration'
                          ? formatDuration(event.durationMs || 0)
                          : '-'}
                      </TableCell>
                      <TableCell>
                        {new Date(event.createdAt).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                  {!events.length && !loading && (
                    <TableRow>
                      <TableCell colSpan={8} className='text-muted-foreground'>
                        No analytics events captured yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Visitor History</CardTitle>
              <CardDescription>
                Select a visitor to see full history
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className='text-muted-foreground rounded-lg border border-dashed border-slate-200 p-6 text-sm'>
                No visitor selected yet.
              </div>
            </CardContent>
          </Card>
        )}
      </Main>
    </>
  )
}
