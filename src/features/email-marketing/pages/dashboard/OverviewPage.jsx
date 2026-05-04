import { useEffect, useState } from 'react'
import OverviewMetricCard from '../../components/dashboard/OverviewMetricCard.jsx'
import OverviewTrendChart from '../../components/dashboard/OverviewTrendChart.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import LoadingState from '../../components/ui/LoadingState.jsx'
import PageHeader from '../../components/ui/PageHeader.jsx'
import { api } from '../../lib/api.js'
import { formatCurrency } from '../../lib/formatters.js'

const presetOptions = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'last7', label: 'Last 7 days' },
  { id: 'last30', label: 'Last 30 days' },
  { id: 'custom', label: 'Custom range' },
]

const formatDateInput = (date) => date.toISOString().slice(0, 10)

const getPresetRange = (preset) => {
  const now = new Date()
  const end = new Date(now)
  const start = new Date(now)

  if (preset === 'today') {
    return {
      startDate: formatDateInput(start),
      endDate: formatDateInput(end),
    }
  }

  if (preset === 'yesterday') {
    start.setDate(start.getDate() - 1)
    end.setDate(end.getDate() - 1)
    return {
      startDate: formatDateInput(start),
      endDate: formatDateInput(end),
    }
  }

  if (preset === 'last30') {
    start.setDate(start.getDate() - 29)
    return {
      startDate: formatDateInput(start),
      endDate: formatDateInput(end),
    }
  }

  start.setDate(start.getDate() - 6)
  return {
    startDate: formatDateInput(start),
    endDate: formatDateInput(end),
  }
}

const initialOverview = {
  totalSent: 0,
  delivered: 0,
  opens: 0,
  uniqueOpens: 0,
  clicks: 0,
  uniqueClicks: 0,
  bounceRate: 0,
  complaintRate: 0,
  unsubscribeCount: 0,
  conversionCount: 0,
  conversionRate: 0,
  revenueGenerated: 0,
  roiPercent: null,
  listGrowth: {
    netGrowth: 0,
    growthRate: 0,
  },
  sendingHealth: {
    score: 0,
    label: 'Stable',
    tone: 'neutral',
    message: 'Overview data is ready to be populated.',
  },
  topCampaign: null,
  worstCampaign: null,
  topCampaigns: [],
  trendData: [],
  topLinks: [],
  recentEvents: [],
}

function OverviewPage() {
  const [preset, setPreset] = useState('last7')
  const [filters, setFilters] = useState(getPresetRange('last7'))
  const [overview, setOverview] = useState(initialOverview)
  const [isLoading, setIsLoading] = useState(true)

  const loadOverview = async (nextFilters = filters) => {
    setIsLoading(true)

    try {
      const { data } = await api.get('/email/overview', {
        params: {
          startDate: nextFilters.startDate || undefined,
          endDate: nextFilters.endDate || undefined,
        },
      })

      setOverview({ ...initialOverview, ...data })
    } catch {
      setOverview(initialOverview)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const nextFilters = getPresetRange('last7')
    loadOverview(nextFilters)
  }, [])

  const handlePresetChange = (nextPreset) => {
    setPreset(nextPreset)

    if (nextPreset === 'custom') {
      return
    }

    const nextFilters = getPresetRange(nextPreset)
    setFilters(nextFilters)
    loadOverview(nextFilters)
  }

  const summaryCards = [
    {
      title: 'Total sent',
      value: overview.totalSent.toLocaleString(),
      hint: `${overview.delivered.toLocaleString()} delivered`,
      tone: 'blue',
      icon: 'SN',
    },
    {
      title: 'Delivered',
      value: overview.delivered.toLocaleString(),
      hint: `${overview.opens.toLocaleString()} opens recorded`,
      tone: 'emerald',
      icon: 'DL',
    },
    {
      title: 'Opens',
      value: overview.opens.toLocaleString(),
      hint: `${overview.uniqueOpens.toLocaleString()} unique opens`,
      tone: 'default',
      icon: 'OP',
    },
    {
      title: 'Clicks',
      value: overview.clicks.toLocaleString(),
      hint: `${overview.uniqueClicks.toLocaleString()} unique clicks`,
      tone: 'default',
      icon: 'CL',
    },
    {
      title: 'Bounce rate',
      value: `${overview.bounceRate}%`,
      hint: 'Based on send events',
      tone: 'amber',
      icon: 'BR',
    },
    {
      title: 'Complaint rate',
      value: `${overview.complaintRate}%`,
      hint: 'Deliverability watch metric',
      tone: 'rose',
      icon: 'CR',
    },
    {
      title: 'Unsubscribes',
      value: overview.unsubscribeCount.toLocaleString(),
      hint: 'Suppression-based unsubscribe count',
      tone: 'default',
      icon: 'UN',
    },
    {
      title: 'Revenue',
      value: formatCurrency(overview.revenueGenerated || 0),
      hint:
        overview.roiPercent === null || overview.roiPercent === undefined
          ? 'Attribution ready'
          : `ROI ${Number(overview.roiPercent || 0).toFixed(2)}%`,
      tone: 'emerald',
      icon: '₹',
    },
    {
      title: 'Conversions',
      value: overview.conversionCount.toLocaleString(),
      hint: `Conversion rate ${Number(overview.conversionRate || 0).toFixed(2)}%`,
      tone: 'emerald',
      icon: 'CL',
    },
    {
      title: 'List growth',
      value: overview.listGrowth?.netGrowth?.toLocaleString?.() || '0',
      hint: `${Number(overview.listGrowth?.growthRate || 0).toFixed(2)}% growth`,
      tone: 'blue',
      icon: 'SN',
    },
  ]

  const healthToneClasses = {
    healthy: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    neutral: 'border-slate-200 bg-slate-50 text-slate-700',
    warning: 'border-amber-200 bg-amber-50 text-amber-700',
  }

  if (isLoading && !overview.trendData.length) {
    return <LoadingState message="Loading premium dashboard..." />
  }

  return (
    <div className="space-y-5">
      <section className="space-y-4">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-3">
            <PageHeader
              
               title={<span className="whitespace-nowrap">Email Marketing Dashboard</span>}

              // description="Track sending performance, top campaigns, and audience response from a central admin view."
            />
            <div className="flex flex-wrap gap-2 text-sm text-[#6e6787]">
              <span className="soft-pill">Top campaign: {overview.topCampaign?.name || 'Not available yet'}</span>
              <span className="soft-pill">Health: {overview.sendingHealth.label}</span>
            </div>
          </div>

          <div className="w-full max-w-2xl space-y-3">
            <div className="flex flex-wrap gap-2">
              {presetOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => handlePresetChange(option.id)}
                  className={`rounded-[3px] border px-4 py-2 text-sm font-semibold transition ${
                    preset === option.id
                      ? 'border-[#7c3aed] bg-[#7c3aed] text-white'
                      : 'border-[#ddd4f2] bg-white text-[#6e6787]'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {preset === 'custom' ? (
              <form
                className="grid gap-3 md:grid-cols-[1fr_1fr_auto]"
                onSubmit={(event) => {
                  event.preventDefault()
                  loadOverview(filters)
                }}
              >
                <input
                  className="field"
                  type="date"
                  value={filters.startDate}
                  onChange={(event) =>
                    setFilters((current) => ({ ...current, startDate: event.target.value }))
                  }
                />
                <input
                  className="field"
                  type="date"
                  value={filters.endDate}
                  onChange={(event) =>
                    setFilters((current) => ({ ...current, endDate: event.target.value }))
                  }
                />
                <button type="submit" className="primary-button">
                  Apply range
                </button>
              </form>
            ) : null}
          </div>
        </div>
      </section>

      <section className="dashboard-grid md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <OverviewMetricCard
            key={card.title}
            title={card.title}
            value={card.value}
            hint={card.hint}
            tone={card.tone}
            icon={card.icon}
          />
        ))}
      </section>

      <section className="dashboard-grid xl:grid-cols-[1.05fr_1.05fr]">
        <article className="shell-card-strong p-5 md:p-6">
          <div className="mb-4">
            <h3 className="text-[18px] font-semibold text-[#2f2b3d]">Performance Overview</h3>
            <p className="mt-1 text-sm text-[#8b84a5]">Delivery and engagement trend across the selected range.</p>
          </div>
          <OverviewTrendChart data={overview.trendData} />
        </article>

        <article className="shell-card-strong p-6">
          <div className="mb-5">
            <h3 className="text-[18px] font-semibold text-[#2f2b3d]">Sending Health</h3>
            <p className="mt-1 text-sm text-[#8b84a5]">Snapshot of sender quality and risk indicators.</p>
          </div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-2xl font-semibold tracking-tight text-[#2f2b3d]">
                {overview.sendingHealth.label}
              </h3>
            </div>
            <div
              className={`rounded-full border px-4 py-2 text-sm font-semibold ${
                healthToneClasses[overview.sendingHealth.tone] || healthToneClasses.neutral
              }`}
            >
              Score {overview.sendingHealth.score}
            </div>
          </div>
          <p className="mt-4 text-sm leading-6 text-[#7b7592]">{overview.sendingHealth.message}</p>

          <div className="mt-6 space-y-4">
            <div className="rounded-[24px] border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Strongest campaign
              </p>
              <p className="mt-2 text-lg font-semibold text-slate-950">
                {overview.topCampaign?.name || 'No campaign data yet'}
              </p>
              <p className="mt-2 text-sm text-slate-500">
                Open rate {overview.topCampaign?.openRate ?? 0}% and click rate {overview.topCampaign?.clickRate ?? 0}%.
              </p>
            </div>

            <div className="rounded-[24px] border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Lowest performer
              </p>
              <p className="mt-2 text-lg font-semibold text-slate-950">
                {overview.worstCampaign?.name || 'No risk signal yet'}
              </p>
              <p className="mt-2 text-sm text-slate-500">
                Bounce rate {overview.worstCampaign?.bounceRate ?? 0}% and complaint rate {overview.worstCampaign?.complaintRate ?? 0}%.
              </p>
            </div>

            <div className="rounded-[24px] border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Conversion and revenue
              </p>
              <p className="mt-2 text-lg font-semibold text-slate-950">
                {overview.conversionCount.toLocaleString()} conversions
              </p>
              <p className="mt-2 text-sm text-slate-500">
                Revenue tracking is structured and ready for real attribution data.
              </p>
            </div>
          </div>
        </article>
      </section>

      <section className="dashboard-grid xl:grid-cols-[1.2fr_0.8fr]">
        <article className="shell-card-strong overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">
                Top campaigns
              </p>
              <h3 className="mt-1 text-xl font-semibold text-slate-950">Best performers</h3>
            </div>
          </div>
          {overview.topCampaigns.length ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-6 py-4 font-medium">Campaign</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 font-medium">Sent</th>
                    <th className="px-6 py-4 font-medium">Open rate</th>
                    <th className="px-6 py-4 font-medium">Click rate</th>
                  </tr>
                </thead>
                <tbody>
                  {overview.topCampaigns.map((campaign) => (
                    <tr key={campaign._id} className="border-t border-slate-100">
                      <td className="px-6 py-4 font-semibold text-slate-900">{campaign.name}</td>
                      <td className="px-6 py-4 capitalize text-slate-500">{campaign.status}</td>
                      <td className="px-6 py-4 text-slate-600">{campaign.sent || campaign.totalSent || 0}</td>
                      <td className="px-6 py-4 text-slate-600">{campaign.openRate}%</td>
                      <td className="px-6 py-4 text-slate-600">{campaign.clickRate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6">
              <EmptyState
                title="No campaign performance yet"
                description="Campaign rankings will populate as real event data arrives."
              />
            </div>
          )}
        </article>

        <article className="shell-card-strong overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">
                Top clicked links
              </p>
              <h3 className="mt-1 text-xl font-semibold text-slate-950">Link engagement</h3>
            </div>
          </div>
          {overview.topLinks.length ? (
            <div className="space-y-4 p-6">
              {overview.topLinks.map((link) => (
                <div key={link.url} className="rounded-[24px] border border-slate-100 bg-slate-50 p-4">
                  <p className="truncate text-sm font-semibold text-slate-900">{link.url}</p>
                  <div className="mt-3 flex items-center justify-between text-sm text-slate-500">
                    <span>{link.totalClicks} total clicks</span>
                    <span>{link.uniqueClicks} unique</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6">
              <EmptyState
                title="No clicked links yet"
                description="Top links will appear here once click tracking payloads include URL data."
              />
            </div>
          )}
        </article>
      </section>

      <section className="shell-card-strong overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">
              Recent activity
            </p>
            <h3 className="mt-1 text-xl font-semibold text-slate-950">Latest email events</h3>
          </div>
        </div>
        {overview.recentEvents.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-6 py-4 font-medium">Event</th>
                  <th className="px-6 py-4 font-medium">Recipient</th>
                  <th className="px-6 py-4 font-medium">Campaign</th>
                  <th className="px-6 py-4 font-medium">Time</th>
                </tr>
              </thead>
              <tbody>
                {overview.recentEvents.map((event) => (
                  <tr key={event._id} className="border-t border-slate-100">
                    <td className="px-6 py-4 capitalize font-medium text-slate-900">{event.eventType}</td>
                    <td className="px-6 py-4 text-slate-600">{event.recipientEmail}</td>
                    <td className="px-6 py-4 text-slate-600">{event.campaignId?.name || 'N/A'}</td>
                    <td className="px-6 py-4 text-slate-500">
                      {new Date(event.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6">
            <EmptyState
              title="No recent activity"
              description="The activity stream will populate after test sends and live delivery events."
            />
          </div>
        )}
      </section>
    </div>
  )
}

export default OverviewPage
