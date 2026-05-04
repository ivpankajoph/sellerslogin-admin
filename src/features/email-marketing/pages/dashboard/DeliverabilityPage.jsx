import { useEffect, useState } from 'react'
import DateRangeFilter from '../../components/ui/DateRangeFilter.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import LoadingState from '../../components/ui/LoadingState.jsx'
import PageHeader from '../../components/ui/PageHeader.jsx'
import StatCard from '../../components/ui/StatCard.jsx'
import { api } from '../../lib/api.js'

const initialFilters = {
  startDate: '',
  endDate: '',
}

const initialSummary = {
  sent: 0,
  delivered: 0,
  opens: 0,
  clicks: 0,
  bounceRate: 0,
  complaintRate: 0,
  unsubscribeRate: 0,
  hardBounceCount: 0,
  softBounceCount: 0,
  rejectCount: 0,
  deliveryDelayCount: 0,
  renderingFailureCount: 0,
  suppressedCount: 0,
}

const stateStyles = {
  good: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  warning: 'border-amber-200 bg-amber-50 text-amber-700',
  critical: 'border-rose-200 bg-rose-50 text-rose-700',
}

function ComplaintTrendWidget({ data }) {
  const maxValue = Math.max(...data.map((item) => item.complaints), 1)

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
          Complaint trend
        </p>
        <h3 className="mt-1 text-xl font-semibold text-slate-950">Daily complaint pressure</h3>
      </div>

      {data.length ? (
        <div className="space-y-3">
          {data.map((item) => (
            <div key={item.date} className="grid grid-cols-[84px_minmax(0,1fr)_40px] items-center gap-3">
              <span className="text-xs font-medium text-slate-500">
                {new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </span>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-rose-400"
                  style={{ width: `${Math.max((item.complaints / maxValue) * 100, item.complaints ? 8 : 0)}%` }}
                />
              </div>
              <span className="text-right text-xs font-semibold text-slate-600">{item.complaints}</span>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No complaint trend yet"
          description="Complaint trend data will appear after live complaint events are received."
        />
      )}
    </div>
  )
}

function DeliverabilityPage() {
  const [filters, setFilters] = useState(initialFilters)
  const [summary, setSummary] = useState(initialSummary)
  const [breakdown, setBreakdown] = useState({
    bounceBreakdown: [],
    complaintBreakdown: [],
    complaintTrend: [],
  })
  const [campaigns, setCampaigns] = useState({ data: [], totals: { campaigns: 0, activeIssues: 0 } })
  const [senderHealth, setSenderHealth] = useState({
    state: 'good',
    label: 'Good',
    score: 100,
    message: '',
    metrics: {},
    domainHealth: { label: 'Pending DNS telemetry', message: '' },
    ispStats: [],
    recommendations: [],
  })
  const [isLoading, setIsLoading] = useState(true)

  const loadData = async () => {
    setIsLoading(true)

    try {
      const params = {
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
      }

      const [summaryResponse, breakdownResponse, campaignResponse, senderHealthResponse] =
        await Promise.all([
          api.get('/email/deliverability/summary', { params }),
          api.get('/email/deliverability/breakdown', { params }),
          api.get('/email/deliverability/campaigns', { params }),
          api.get('/email/deliverability/sender-health', { params }),
        ])

      setSummary({ ...initialSummary, ...summaryResponse.data })
      setBreakdown(breakdownResponse.data)
      setCampaigns(campaignResponse.data)
      setSenderHealth(senderHealthResponse.data)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  if (isLoading && !campaigns.data.length) {
    return <LoadingState message="Loading deliverability center..." />
  }

  return (
    <div className="space-y-6">

      <section className="shell-card p-6">
        <DateRangeFilter
          filters={filters}
          onChange={(key, value) => setFilters((current) => ({ ...current, [key]: value }))}
          onApply={loadData}
        />
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Sent" value={summary.sent} hint="Tracked send events" />
        <StatCard label="Delivered" value={summary.delivered} hint={`${summary.deliveryRate || 0}% delivery rate`} />
        <StatCard label="Opens" value={summary.opens} hint={`${summary.clicks} clicks recorded`} />
        <StatCard label="Suppressed" value={summary.suppressedCount} hint="Active suppression entries" />
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Bounce rate" value={`${summary.bounceRate}%`} hint={`${summary.hardBounceCount} hard / ${summary.softBounceCount} soft`} />
        <StatCard label="Complaint rate" value={`${summary.complaintRate}%`} hint={`${breakdown.complaintBreakdown.length} complaint categories`} />
        <StatCard label="Unsubscribe rate" value={`${summary.unsubscribeRate}%`} hint={`${summary.unsubscribeCount} unsubscribes`} />
        <StatCard label="Rejects" value={summary.rejectCount} hint="Rejected before delivery" />
        <StatCard label="Delivery issues" value={summary.deliveryDelayCount + summary.renderingFailureCount} hint={`${summary.deliveryDelayCount} delays / ${summary.renderingFailureCount} render failures`} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <article className="shell-card-strong p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                Sender health
              </p>
              <h3 className="mt-2 text-2xl font-semibold text-slate-950">{senderHealth.label}</h3>
            </div>
            <div className={`rounded-full border px-4 py-2 text-sm font-semibold ${stateStyles[senderHealth.state] || stateStyles.good}`}>
              Score {senderHealth.score}
            </div>
          </div>

          <p className="mt-4 text-sm leading-6 text-slate-500">{senderHealth.message}</p>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-[24px] border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Primary risk</p>
              <p className="mt-2 text-sm text-slate-900">
                Bounce rate {senderHealth.metrics?.bounceRate || 0}% and complaint rate {senderHealth.metrics?.complaintRate || 0}%.
              </p>
            </div>
            <div className="rounded-[24px] border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Domain health</p>
              <p className="mt-2 text-sm text-slate-900">{senderHealth.domainHealth?.label}</p>
              <p className="mt-2 text-sm text-slate-500">{senderHealth.domainHealth?.message}</p>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {senderHealth.recommendations?.map((item) => (
              <div key={item} className="rounded-2xl border border-slate-100 bg-white px-4 py-3 text-sm text-slate-600">
                {item}
              </div>
            ))}
          </div>
        </article>

        <article className="shell-card-strong p-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
              Bounce breakdown
            </p>
            <h3 className="mt-1 text-xl font-semibold text-slate-950">Root cause categories</h3>
          </div>

          {breakdown.bounceBreakdown.length ? (
            <div className="mt-5 space-y-3">
              {breakdown.bounceBreakdown.map((item) => (
                <div key={`${item.bounceType}-${item.bounceSubType}`} className="flex items-center justify-between rounded-[22px] border border-slate-100 bg-slate-50 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{item.bounceType}</p>
                    <p className="text-xs text-slate-500">{item.bounceSubType}</p>
                  </div>
                  <span className="text-lg font-semibold text-slate-900">{item.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-5">
              <EmptyState
                title="No bounce categories yet"
                description="Bounce diagnostics will populate once SES bounce events are received."
              />
            </div>
          )}
        </article>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <article className="shell-card-strong p-6">
          <ComplaintTrendWidget data={breakdown.complaintTrend || []} />
        </article>

        <article className="shell-card-strong p-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
              Complaint feedback
            </p>
            <h3 className="mt-1 text-xl font-semibold text-slate-950">Complaint reason mix</h3>
          </div>

          {breakdown.complaintBreakdown.length ? (
            <div className="mt-5 space-y-3">
              {breakdown.complaintBreakdown.map((item) => (
                <div key={item.feedbackType} className="flex items-center justify-between rounded-[22px] border border-slate-100 bg-slate-50 px-4 py-3">
                  <p className="text-sm font-medium text-slate-900">{item.feedbackType}</p>
                  <span className="text-lg font-semibold text-slate-900">{item.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-5">
              <EmptyState
                title="No complaint feedback yet"
                description="Complaint categories will appear once SES complaint events are tracked."
              />
            </div>
          )}
        </article>
      </section>

      <section className="shell-card-strong overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
              Campaign-wise deliverability
            </p>
            <h3 className="mt-1 text-xl font-semibold text-slate-950">Operational campaign view</h3>
          </div>
          <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-500">
            {campaigns.totals.campaigns} campaigns, {campaigns.totals.activeIssues} with active issues
          </div>
        </div>

        {campaigns.data.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-6 py-4 font-medium">Campaign</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Sent</th>
                  <th className="px-6 py-4 font-medium">Delivered</th>
                  <th className="px-6 py-4 font-medium">Open rate</th>
                  <th className="px-6 py-4 font-medium">Click rate</th>
                  <th className="px-6 py-4 font-medium">Bounce rate</th>
                  <th className="px-6 py-4 font-medium">Complaint rate</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.data.map((campaign) => (
                  <tr key={campaign._id} className="border-t border-slate-100">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-slate-900">{campaign.name}</p>
                      <p className="text-xs text-slate-500">{campaign.type} / {campaign.goal}</p>
                    </td>
                    <td className="px-6 py-4 capitalize text-slate-600">{campaign.status}</td>
                    <td className="px-6 py-4 text-slate-600">{campaign.sent}</td>
                    <td className="px-6 py-4 text-slate-600">{campaign.delivered}</td>
                    <td className="px-6 py-4 text-slate-600">{campaign.openRate}%</td>
                    <td className="px-6 py-4 text-slate-600">{campaign.clickRate}%</td>
                    <td className="px-6 py-4 text-slate-600">{campaign.bounceRate}%</td>
                    <td className="px-6 py-4 text-slate-600">{campaign.complaintRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6">
            <EmptyState
              title="No campaign deliverability data yet"
              description="Campaign rows will populate after live sends and SES event ingestion."
            />
          </div>
        )}
      </section>
    </div>
  )
}

export default DeliverabilityPage
