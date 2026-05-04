import { useEffect, useState } from 'react'
import AnalyticsWidgetShell from '../../components/ui/AnalyticsWidgetShell.jsx'
import DateRangeFilter from '../../components/ui/DateRangeFilter.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import LoadingState from '../../components/ui/LoadingState.jsx'
import PageHeader from '../../components/ui/PageHeader.jsx'
import StatCard from '../../components/ui/StatCard.jsx'
import { api } from '../../lib/api.js'
import { formatCurrency } from '../../lib/formatters.js'

const initialFilters = {
  startDate: '',
  endDate: '',
}

const formatPercent = (value) => `${Number(value || 0).toFixed(2)}%`

function AnalyticsPage() {
  const [filters, setFilters] = useState(initialFilters)
  const [summary, setSummary] = useState(null)
  const [recentEvents, setRecentEvents] = useState([])
  const [topCampaigns, setTopCampaigns] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  const loadAnalytics = async ({ silent = false } = {}) => {
    if (!silent) {
      setIsLoading(true)
    }

    try {
      const params = {
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
      }

      const [summaryResponse, recentEventsResponse, topCampaignsResponse] = await Promise.all([
        api.get('/email/analytics/summary', { params }),
        api.get('/email/events/recent', { params: { ...params, limit: 8 } }),
        api.get('/email/campaigns/top', { params: { ...params, limit: 5 } }),
      ])

      setSummary(summaryResponse.data)
      setRecentEvents(recentEventsResponse.data.data)
      setTopCampaigns(topCampaignsResponse.data)
    } finally {
      if (!silent) {
        setIsLoading(false)
      }
    }
  }

  useEffect(() => {
    loadAnalytics()
  }, [])

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      loadAnalytics({ silent: true }).catch(() => {})
    }, 30000)

    return () => window.clearInterval(intervalId)
  }, [])

  if (isLoading && !summary) {
    return <LoadingState message="Loading analytics..." />
  }

  return (
    <div className="space-y-6">
      <section className="shell-card p-6 md:p-8">
        <PageHeader
          eyebrow="Analytics"
          title="Performance summary"
          description="Review core email engagement, recent events, and the best-performing campaigns across the selected date range."
        />
      </section>

      <section className="shell-card p-6">
        <DateRangeFilter
          filters={filters}
          onChange={(key, value) => setFilters((current) => ({ ...current, [key]: value }))}
          onApply={loadAnalytics}
        />
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Emails sent" value={summary?.sent || 0} hint="Messages handed to SES" />
        <StatCard
          label="Inbox deliveries"
          value={summary?.delivered || 0}
          hint="Messages confirmed delivered"
        />
        <StatCard
          label="People opened"
          value={summary?.opens || 0}
          hint={`Open rate ${formatPercent(summary?.openRate)}`}
        />
        <StatCard
          label="People clicked"
          value={summary?.clicks || 0}
          hint={`Click rate ${formatPercent(summary?.clickRate)}`}
        />
        <StatCard
          label="Conversions"
          value={summary?.conversionCount || 0}
          hint={`Rate ${formatPercent(summary?.conversionRate)}`}
          accent="success"
        />
        <StatCard
          label="Revenue"
          value={formatCurrency(summary?.revenueGenerated || 0)}
          hint={
            summary?.roiPercent === null || summary?.roiPercent === undefined
              ? 'ROI ready once cost is added'
              : `ROI ${formatPercent(summary?.roiPercent)}`
          }
          accent="success"
        />
        <StatCard
          label="CTOR"
          value={formatPercent(summary?.ctor)}
          hint="Unique clicks divided by unique opens"
          accent="info"
        />
        <StatCard
          label="List growth"
          value={summary?.listGrowth?.netGrowth || 0}
          hint={`Growth ${formatPercent(summary?.listGrowth?.growthRate)}`}
          accent="warning"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <AnalyticsWidgetShell
          eyebrow="Growth"
          title="Audience and revenue snapshot"
          description="Live conversion and list movement signals for the selected window."
        >
          <div className="grid gap-4 p-6 md:grid-cols-2">
            <div className="rounded-[24px] border border-ui bg-[var(--bg-subtle)] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ui-muted">
                Conversions
              </p>
              <p className="mt-2 text-2xl font-semibold text-ui-strong">
                {summary?.conversionCount || 0}
              </p>
              <p className="mt-1 text-sm text-ui-body">
                {formatPercent(summary?.conversionRate)} conversion rate
              </p>
            </div>
            <div className="rounded-[24px] border border-ui bg-[var(--bg-subtle)] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ui-muted">
                Revenue and ROI
              </p>
              <p className="mt-2 text-2xl font-semibold text-ui-strong">
                {formatCurrency(summary?.revenueGenerated || 0)}
              </p>
              <p className="mt-1 text-sm text-ui-body">
                {summary?.roiPercent === null || summary?.roiPercent === undefined
                  ? 'ROI appears once a campaign cost is provided'
                  : `ROI ${formatPercent(summary?.roiPercent)}`}
              </p>
            </div>
            <div className="rounded-[24px] border border-ui bg-[var(--bg-subtle)] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ui-muted">
                List growth
              </p>
              <p className="mt-2 text-2xl font-semibold text-ui-strong">
                {summary?.listGrowth?.netGrowth || 0}
              </p>
              <p className="mt-1 text-sm text-ui-body">
                {summary?.listGrowth?.newSubscribers || 0} new subscribers,{' '}
                {summary?.listGrowth?.unsubscribes || 0} unsubscribes
              </p>
            </div>
            <div className="rounded-[24px] border border-ui bg-[var(--bg-subtle)] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ui-muted">
                Best timing
              </p>
              <p className="mt-2 text-2xl font-semibold text-ui-strong">
                {summary?.timeBasedAnalytics?.bestHour !== null &&
                summary?.timeBasedAnalytics?.bestHour !== undefined
                  ? `Hour ${summary?.timeBasedAnalytics?.bestHour?.hour}`
                  : 'No timing data yet'}
              </p>
              <p className="mt-1 text-sm text-ui-body">
                {summary?.timeBasedAnalytics?.bestDay?.label || 'Best day appears here later'}
              </p>
            </div>
          </div>
        </AnalyticsWidgetShell>

        <AnalyticsWidgetShell
          eyebrow="Reach"
          title="Device and location mix"
          description="Breakdown of who is engaging and where it is coming from."
        >
          <div className="grid gap-4 p-6">
            <div className="rounded-[24px] border border-ui bg-[var(--bg-subtle)] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ui-muted">
                Devices
              </p>
              <div className="mt-4 space-y-3">
                {summary?.deviceBreakdown?.length ? (
                  summary.deviceBreakdown.map((item) => (
                    <div key={item.deviceType} className="grid grid-cols-[1fr_auto] gap-3 text-sm">
                      <span className="text-ui-body capitalize">{item.deviceType}</span>
                      <span className="text-ui-strong">
                        {item.count} ({formatPercent(item.share)})
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-ui-body">Device data will appear once opens and clicks arrive.</p>
                )}
              </div>
            </div>
            <div className="rounded-[24px] border border-ui bg-[var(--bg-subtle)] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ui-muted">
                Top locations
              </p>
              <div className="mt-4 space-y-3">
                {summary?.locationBreakdown?.countries?.length ? (
                  summary.locationBreakdown.countries.slice(0, 5).map((item) => (
                    <div key={item.label} className="grid grid-cols-[1fr_auto] gap-3 text-sm">
                      <span className="text-ui-body">{item.label}</span>
                      <span className="text-ui-strong">
                        {item.count} ({formatPercent(item.share)})
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-ui-body">Location data will appear as engagement is recorded.</p>
                )}
              </div>
            </div>
          </div>
        </AnalyticsWidgetShell>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="shell-card overflow-hidden">
          <div className="border-b border-slate-200 px-6 py-4">
            <h3 className="text-lg font-semibold text-slate-900">Recent events</h3>
          </div>
          <div className="overflow-x-auto">
            {recentEvents.length ? (
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-6 py-4 font-medium">Type</th>
                    <th className="px-6 py-4 font-medium">Recipient</th>
                    <th className="px-6 py-4 font-medium">Campaign</th>
                    <th className="px-6 py-4 font-medium">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {recentEvents.map((event) => (
                    <tr key={event._id} className="border-t border-slate-100">
                      <td className="px-6 py-4 capitalize">{event.eventType}</td>
                      <td className="px-6 py-4">{event.recipientEmail}</td>
                      <td className="px-6 py-4">{event.campaignId?.name || 'N/A'}</td>
                      <td className="px-6 py-4">{new Date(event.timestamp).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-6">
                <EmptyState
                  title="No recent events"
                  description="Events will appear here after test sends or live campaign activity."
                />
              </div>
            )}
          </div>
        </article>

        <article className="shell-card overflow-hidden">
          <div className="border-b border-slate-200 px-6 py-4">
            <h3 className="text-lg font-semibold text-slate-900">Top campaigns</h3>
          </div>
          <div className="overflow-x-auto">
            {topCampaigns.length ? (
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-6 py-4 font-medium">Campaign</th>
                    <th className="px-6 py-4 font-medium">Sent</th>
                    <th className="px-6 py-4 font-medium">Open rate</th>
                    <th className="px-6 py-4 font-medium">Click rate</th>
                  </tr>
                </thead>
                <tbody>
                  {topCampaigns.map((campaign) => (
                    <tr key={campaign._id} className="border-t border-slate-100">
                      <td className="px-6 py-4">{campaign.name}</td>
                      <td className="px-6 py-4">{campaign.sent || campaign.totalSent || 0}</td>
                      <td className="px-6 py-4">{campaign.openRate}%</td>
                      <td className="px-6 py-4">{campaign.clickRate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-6">
                <EmptyState
                  title="No top campaigns yet"
                  description="Campaign rankings will appear once event activity is available in the selected range."
                />
              </div>
            )}
          </div>
        </article>
      </section>

      <section>
        <AnalyticsWidgetShell
          eyebrow="Time analytics"
          title="Best send time signals"
          description="This updates from the latest open and click activity."
        >
          <div className="grid gap-4 p-6 md:grid-cols-3">
            <div className="rounded-[24px] border border-ui bg-[var(--bg-subtle)] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ui-muted">Best hour</p>
              <p className="mt-2 text-xl font-semibold text-ui-strong">
                {summary?.timeBasedAnalytics?.bestHour !== null &&
                summary?.timeBasedAnalytics?.bestHour !== undefined
                  ? `${String(summary.timeBasedAnalytics.bestHour.hour).padStart(2, '0')}:00`
                  : 'No data'}
              </p>
            </div>
            <div className="rounded-[24px] border border-ui bg-[var(--bg-subtle)] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ui-muted">Best day</p>
              <p className="mt-2 text-xl font-semibold text-ui-strong">
                {summary?.timeBasedAnalytics?.bestDay?.label || 'No data'}
              </p>
            </div>
            <div className="rounded-[24px] border border-ui bg-[var(--bg-subtle)] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ui-muted">CTR support</p>
              <p className="mt-2 text-sm text-ui-body">
                The backend now returns CTOR, device mix, and location mix so send-time decisions can be based on real engagement.
              </p>
            </div>
          </div>
        </AnalyticsWidgetShell>
      </section>
    </div>
  )
}

export default AnalyticsPage
