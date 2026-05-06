import { useEffect, useState } from 'react'
import EmptyState from '../../components/ui/EmptyState.jsx'
import LoadingState from '../../components/ui/LoadingState.jsx'
import { api } from '../../lib/api.js'

const metricCards = [
  {
    key: 'sent',
    label: 'Emails sent',
    valueKey: 'sent',
    hint: 'Messages handed to SES',
  },
  {
    key: 'delivered',
    label: 'Inbox deliveries',
    valueKey: 'delivered',
    hint: 'Messages confirmed delivered',
  },
  {
    key: 'opened',
    label: 'People opened',
    valueKey: 'uniqueOpens',
    fallbackKey: 'opens',
    hint: 'Open rate',
    rateKey: 'openRate',
  },
  {
    key: 'clicked',
    label: 'People clicked',
    valueKey: 'uniqueClicks',
    fallbackKey: 'clicks',
    hint: 'Click rate',
    rateKey: 'clickRate',
  },
]

const activityColumnByMetric = {
  sent: { key: 'sentAt', label: 'Sent' },
  delivered: { key: 'deliveredAt', label: 'Delivered' },
  opened: { key: 'openedAt', label: 'Opened' },
  clicked: { key: 'clickedAt', label: 'Clicked' },
}

const formatPercent = (value) => `${Number(value || 0).toFixed(2)}%`

const formatInputDate = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const getDateParams = (dateFilter, customRange) => {
  if (dateFilter === 'today') {
    const today = formatInputDate(new Date())
    return { startDate: today, endDate: today }
  }

  if (dateFilter === 'yesterday') {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const value = formatInputDate(yesterday)
    return { startDate: value, endDate: value }
  }

  if (dateFilter === 'custom') {
    return {
      startDate: customRange.startDate || undefined,
      endDate: customRange.endDate || undefined,
    }
  }

  return {}
}

const formatDateTime = (value) => {
  if (!value) {
    return '-'
  }

  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? '-'
    : date.toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
}

const getEmptyTitle = (typeFilter) => {
  if (typeFilter === 'automation') {
    return 'No automation found'
  }

  if (typeFilter === 'campaign') {
    return 'No campaign found'
  }

  return 'No recipients found'
}

function EmailOpenedClickedPage() {
  const [summary, setSummary] = useState(null)
  const [activeMetric, setActiveMetric] = useState('sent')
  const [typeFilter, setTypeFilter] = useState('all')
  const [activityDateFilter, setActivityDateFilter] = useState('all')
  const [customActivityRange, setCustomActivityRange] = useState({ startDate: '', endDate: '' })
  const [details, setDetails] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDetailsLoading, setIsDetailsLoading] = useState(false)

  const loadSummary = async ({ silent = false } = {}) => {
    if (!silent) {
      setIsLoading(true)
    }

    try {
      const response = await api.get('/email/analytics/summary')

      setSummary(response.data)
    } finally {
      if (!silent) {
        setIsLoading(false)
      }
    }
  }

  const loadDetails = async (
    metric = activeMetric,
    {
      silent = false,
      nextTypeFilter = typeFilter,
      nextDateFilter = activityDateFilter,
      nextCustomRange = customActivityRange,
    } = {},
  ) => {
    if (!silent) {
      setIsDetailsLoading(true)
    }

    try {
      const dateParams = getDateParams(nextDateFilter, nextCustomRange)
      const response = await api.get('/email/analytics/engagement-recipients', {
        params: {
          metric,
          sourceType: nextTypeFilter === 'all' ? undefined : nextTypeFilter,
          ...dateParams,
        },
      })

      setDetails(response.data)
    } finally {
      if (!silent) {
        setIsDetailsLoading(false)
      }
    }
  }

  const handleMetricClick = (metric) => {
    setActiveMetric(metric)
    loadDetails(metric).catch(() => {})
  }

  const handleTypeFilterChange = (event) => {
    const nextTypeFilter = event.target.value
    setTypeFilter(nextTypeFilter)
    loadDetails(activeMetric, { nextTypeFilter }).catch(() => {})
  }

  const handleActivityDateFilterChange = (event) => {
    const nextDateFilter = event.target.value
    setActivityDateFilter(nextDateFilter)

    if (nextDateFilter !== 'custom') {
      loadDetails(activeMetric, { nextDateFilter }).catch(() => {})
    }
  }

  const applyCustomActivityRange = () => {
    loadDetails(activeMetric, {
      nextDateFilter: 'custom',
      nextCustomRange: customActivityRange,
    }).catch(() => {})
  }

  useEffect(() => {
    loadSummary()
    loadDetails('sent')
  }, [])

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      loadSummary({ silent: true }).catch(() => {})
      loadDetails(activeMetric, { silent: true }).catch(() => {})
    }, 30000)

    return () => window.clearInterval(intervalId)
  }, [activeMetric, typeFilter, activityDateFilter, customActivityRange])

  if (isLoading && !summary) {
    return <LoadingState message="Loading email engagement..." />
  }

  const activityColumn = activityColumnByMetric[activeMetric] || activityColumnByMetric.sent

  return (
    <div className="space-y-6">
      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {metricCards.map((card) => {
          const value = summary?.[card.valueKey] ?? summary?.[card.fallbackKey] ?? 0
          const hint = card.rateKey
            ? `${card.hint} ${formatPercent(summary?.[card.rateKey])}`
            : card.hint
          const isActive = activeMetric === card.key

          return (
            <button
              key={card.key}
              type="button"
              onClick={() => handleMetricClick(card.key)}
              className={`border p-4 text-left transition ${
                isActive
                  ? 'border-[#7c3aed] bg-[#7c3aed] shadow-[0_12px_24px_rgba(124,58,237,0.22)]'
                  : 'border-[#d8ccef] bg-white hover:border-[#b794f4]'
              }`}
            >
              <div>
                <p className={`text-[13px] font-semibold ${isActive ? 'text-white' : 'text-[#6d4b90]'}`}>
                  {card.label}
                </p>
                <p className={`mt-3 text-2xl font-semibold leading-none ${isActive ? 'text-white' : 'text-[#21192d]'}`}>
                  {value}
                </p>
                <p className={`mt-2 text-[13px] ${isActive ? 'text-[#efe7ff]' : 'text-[#9b8caf]'}`}>
                  {hint}
                </p>
              </div>
            </button>
          )
        })}
      </section>

      <section className="shell-card overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-ui p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ui-muted">
              {details?.label || 'Emails sent'}
            </p>
            <h2 className="mt-1 text-xl font-semibold text-ui-strong">Recipient activity</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="soft-pill">Total mails: {details?.totals?.totalMessages || 0}</span>
            <span className="soft-pill">
              Total recipients: {details?.totals?.totalRecipients || 0}
            </span>
            <span className="soft-pill">Campaign: {details?.totals?.campaigns || 0}</span>
            <span className="soft-pill">Automation: {details?.totals?.automations || 0}</span>
          </div>
        </div>
        {isDetailsLoading ? (
          <div className="p-6 text-sm text-ui-muted">Loading recipient activity...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[var(--bg-subtle)] text-ui-muted">
                <tr>
                  <th className="px-5 py-4 font-medium">Recipient</th>
                  <th className="px-5 py-4 font-medium">
                    <select
                      className="field min-h-10 min-w-[165px] bg-white px-3 py-2 text-sm leading-normal normal-case tracking-normal"
                      value={typeFilter}
                      onChange={handleTypeFilterChange}
                      aria-label="Filter by type"
                    >
                      <option value="all">All</option>
                      <option value="campaign">Campaign</option>
                      <option value="automation">Automation</option>
                    </select>
                  </th>
                  <th className="px-5 py-4 font-medium">Campaign / Automation</th>
                  <th className="px-5 py-4 font-medium">{activityColumn.label}</th>
                  <th className="px-5 py-4 font-medium">
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        className="field min-h-10 min-w-[210px] bg-white px-3 py-2 text-sm leading-normal normal-case tracking-normal"
                        value={activityDateFilter}
                        onChange={handleActivityDateFilterChange}
                        aria-label="Filter by last activity"
                      >
                        <option value="all">All</option>
                        <option value="today">Today</option>
                        <option value="yesterday">Yesterday</option>
                        <option value="custom">Custom date</option>
                      </select>
                      {activityDateFilter === 'custom' ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <input
                            className="field min-h-10 min-w-[135px] bg-white px-3 py-2 text-sm leading-normal normal-case tracking-normal"
                            type="date"
                            value={customActivityRange.startDate}
                            onChange={(event) =>
                              setCustomActivityRange((current) => ({
                                ...current,
                                startDate: event.target.value,
                              }))
                            }
                          />
                          <input
                            className="field min-h-10 min-w-[135px] bg-white px-3 py-2 text-sm leading-normal normal-case tracking-normal"
                            type="date"
                            value={customActivityRange.endDate}
                            onChange={(event) =>
                              setCustomActivityRange((current) => ({
                                ...current,
                                endDate: event.target.value,
                              }))
                            }
                          />
                          <button
                            type="button"
                            className="secondary-button min-h-10 px-3 py-2 text-xs"
                            onClick={applyCustomActivityRange}
                          >
                            Apply
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {details?.data?.length ? (
                  details.data.map((row) => (
                    <tr key={row.id} className="border-t border-ui">
                      <td className="px-5 py-4 text-ui-strong">{row.recipientEmail}</td>
                      <td className="px-5 py-4 text-ui-body">{row.sourceType}</td>
                      <td className="px-5 py-4 text-ui-body">
                        <div>{row.sourceName || '-'}</div>
                        {row.sourceStatus ? (
                          <div className="mt-1 text-xs capitalize text-ui-muted">{row.sourceStatus}</div>
                        ) : null}
                      </td>
                      <td className="px-5 py-4 text-ui-body">
                        {formatDateTime(row[activityColumn.key])}
                      </td>
                      <td className="px-5 py-4 text-ui-body">{formatDateTime(row.activityAt)}</td>
                    </tr>
                  ))
                ) : (
                  <tr className="border-t border-ui">
                    <td colSpan={5} className="px-5 py-8">
                      <EmptyState
                        title={getEmptyTitle(typeFilter)}
                        description="Try another type or activity date filter to view recipient rows."
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

export default EmailOpenedClickedPage
