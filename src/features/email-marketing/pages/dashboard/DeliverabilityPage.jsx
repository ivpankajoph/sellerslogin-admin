import { useEffect, useState } from 'react'
import DateRangeFilter from '../../components/ui/DateRangeFilter.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import LoadingState from '../../components/ui/LoadingState.jsx'
import { api } from '../../lib/api.js'

const initialFilters = {
  startDate: '',
  endDate: '',
  search: '',
  metric: 'totalEmails',
}

const initialPagination = {
  page: 1,
  limit: 25,
  total: 0,
  totalPages: 1,
}

const pageConfig = {
  bounces: {
    title: 'Bounce Emails',
    description:
      "Emails that were not delivered because the recipient address does not exist or the recipient's mail server rejected the message.",
    endpoint: '/email/deliverability/bounces',
    emptyTitle: 'No bounced emails found',
    emptyDescription: 'Bounced and rejected emails will appear here after delivery events are received.',
    totalLabel: 'Total bounced emails',
    totalMetric: 'totalEmails',
    secondaryStats: [
      ['hardBounces', 'Hard bounce'],
      ['softBounces', 'Soft bounce'],
      ['rejected', 'Rejected'],
    ],
  },
  'complaints-suppressions': {
    title: 'Complaints & Suppressions',
    description:
      'Recipients who marked email as spam, or email addresses blocked from future sending by suppression rules.',
    endpoint: '/email/deliverability/complaints-suppressions',
    emptyTitle: 'No complaint or suppression records found',
    emptyDescription: 'Spam complaint and suppression records will appear here as they are tracked.',
    totalLabel: 'Total complaint/suppression emails',
    totalMetric: 'totalEmails',
    secondaryStats: [
      ['complaints', 'Spam complaints'],
      ['suppressions', 'Suppressed emails'],
    ],
  },
  unsubscribes: {
    title: 'Unsubscribe Emails',
    description:
      'Recipients who unsubscribed from email communication, including the device, location, and time when available.',
    endpoint: '/email/deliverability/unsubscribes',
    emptyTitle: 'No unsubscribe emails found',
    emptyDescription: 'Unsubscribed email records will appear here after users unsubscribe.',
    totalLabel: 'Total unsubscribe emails',
    totalMetric: 'totalEmails',
    secondaryStats: [
      ['eventUnsubscribes', 'Unsubscribe clicks'],
      ['suppressionUnsubscribes', 'Blocked from future emails'],
    ],
  },
}

const formatDateTime = (value) => {
  if (!value) {
    return 'Unknown'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Unknown'
  }

  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function StatTile({ label, value, active = false, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`border p-4 text-left transition ${
        active
          ? 'border-[#7c3aed] bg-[#7c3aed] shadow-[0_12px_24px_rgba(124,58,237,0.22)]'
          : 'border-[#d8ccef] bg-white hover:border-[#b794f4]'
      }`}
    >
      <p className={`text-[13px] font-semibold ${active ? 'text-white' : 'text-[#6d4b90]'}`}>{label}</p>
      <p className={`mt-3 text-2xl font-semibold ${active ? 'text-white' : 'text-[#21192d]'}`}>
        {Number(value || 0).toLocaleString()}
      </p>
    </button>
  )
}

function DeliverabilityPage({ type = 'bounces' }) {
  const config = pageConfig[type] || pageConfig.bounces
  const [filters, setFilters] = useState(initialFilters)
  const [rows, setRows] = useState([])
  const [totals, setTotals] = useState({ totalEmails: 0 })
  const [pagination, setPagination] = useState(initialPagination)
  const [isLoading, setIsLoading] = useState(true)
  const statOptions = [[config.totalMetric, config.totalLabel], ...config.secondaryStats]
  const activeStatLabel =
    statOptions.find(([key]) => key === filters.metric)?.[1] || config.totalLabel

  const loadRows = async (page = 1, nextFilters = filters) => {
    setIsLoading(true)

    try {
      const { data } = await api.get(config.endpoint, {
        params: {
          page,
          limit: pagination.limit,
          startDate: nextFilters.startDate || undefined,
          endDate: nextFilters.endDate || undefined,
          search: nextFilters.search || undefined,
          metric: nextFilters.metric === config.totalMetric ? undefined : nextFilters.metric,
        },
      })

      setRows(data.data || [])
      setTotals(data.totals || { totalEmails: 0 })
      setPagination(data.pagination || initialPagination)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    setFilters(initialFilters)
    setRows([])
    setTotals({ totalEmails: 0 })
    setPagination(initialPagination)
    loadRows(1, initialFilters)
  }, [type])

  const handleSearchSubmit = (event) => {
    event.preventDefault()
    loadRows(1)
  }

  const handleStatClick = (metric) => {
    const nextFilters = { ...filters, metric }
    setFilters(nextFilters)
    loadRows(1, nextFilters)
  }

  if (isLoading && !rows.length) {
    return <LoadingState message={`Loading ${config.title.toLowerCase()}...`} />
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label={config.totalLabel}
          value={totals.totalEmails || pagination.total}
          active={filters.metric === config.totalMetric}
          onClick={() => handleStatClick(config.totalMetric)}
        />
        {config.secondaryStats.map(([key, label]) => (
          <StatTile
            key={key}
            label={label}
            value={totals[key]}
            active={filters.metric === key}
            onClick={() => handleStatClick(key)}
          />
        ))}
      </section>

      <section className="shell-card p-6">
        <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
          <DateRangeFilter
            filters={filters}
            onChange={(key, value) => setFilters((current) => ({ ...current, [key]: value }))}
            onApply={() => loadRows(1)}
          />
          <form className="flex gap-3" onSubmit={handleSearchSubmit}>
            <input
              className="field min-w-0 flex-1"
              value={filters.search}
              onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
              placeholder="Search email"
              type="search"
            />
            <button type="submit" className="primary-button">
              Search
            </button>
          </form>
        </div>
      </section>

      <section className="shell-card-strong overflow-hidden">
        <div className="flex flex-col gap-2 border-b border-[#e4d8f3] px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-[#21192d]">{activeStatLabel} table</h3>
            <p className="text-sm text-[#7f6f96]">{pagination.total} emails matched current filters</p>
          </div>
          <div className="flex items-center gap-3 text-sm font-semibold text-[#5d437b]">
            <span>Page {pagination.page} of {pagination.totalPages}</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[#eadff6] text-left text-sm">
            <thead className="bg-[#fbf8ff] text-xs uppercase tracking-[0.12em] text-[#7f6f96]">
              <tr>
                <th className="px-5 py-4 font-semibold">Recipient</th>
                <th className="px-5 py-4 font-semibold">Device</th>
                <th className="px-5 py-4 font-semibold">Location</th>
                <th className="px-5 py-4 font-semibold">Time / Date</th>
                <th className="px-5 py-4 font-semibold">Reason</th>
                <th className="px-5 py-4 font-semibold">Campaign / Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0e6fb] bg-white text-[#21192d]">
              {rows.length ? (
                rows.map((row) => (
                  <tr key={`${row.source}-${row.id}`} className="align-top">
                    <td className="px-5 py-4">
                      <p className="font-semibold">{row.email || 'Unknown'}</p>
                      <p className="mt-1 text-xs text-[#8c7aa4]">{row.issueType || row.category}</p>
                    </td>
                    <td className="px-5 py-4 text-[#5d437b]">{row.device || 'Unknown'}</td>
                    <td className="px-5 py-4 text-[#5d437b]">{row.location || 'Unknown'}</td>
                    <td className="px-5 py-4 text-[#5d437b]">{formatDateTime(row.occurredAt)}</td>
                    <td className="px-5 py-4 text-[#5d437b]">{row.reason || 'Unknown'}</td>
                    <td className="px-5 py-4">
                      <p className="font-medium text-[#21192d]">{row.campaignName || 'Not linked'}</p>
                      <p className="mt-1 text-xs capitalize text-[#8c7aa4]">{row.source || 'event'}</p>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-5 py-6">
                    <EmptyState title={config.emptyTitle} description={config.emptyDescription} />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-[#e4d8f3] px-5 py-4 text-sm text-[#5d437b] md:flex-row md:items-center md:justify-between">
          <span>{pagination.total} total emails</span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="secondary-button"
              disabled={pagination.page <= 1 || isLoading}
              onClick={() => loadRows(pagination.page - 1)}
            >
              Previous
            </button>
            <button
              type="button"
              className="secondary-button"
              disabled={pagination.page >= pagination.totalPages || isLoading}
              onClick={() => loadRows(pagination.page + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}

export default DeliverabilityPage
