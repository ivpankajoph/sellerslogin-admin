import { useEffect, useMemo, useState } from 'react'
import EmptyState from '../../components/ui/EmptyState.jsx'
import LoadingState from '../../components/ui/LoadingState.jsx'
import { api } from '../../lib/api.js'

const initialFilters = {
  campaignId: '',
  automationId: '',
  search: '',
}

const formatDateTime = (value) =>
  value
    ? new Date(value).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : 'N/A'

const formatYesNo = (value) => (value ? 'Yes' : 'No')

function DeviceLocationTrackingPage() {
  const [filters, setFilters] = useState(initialFilters)
  const [rows, setRows] = useState([])
  const [campaigns, setCampaigns] = useState([])
  const [automations, setAutomations] = useState([])
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 1 })
  const [isLoading, setIsLoading] = useState(true)
  const [isMetaLoading, setIsMetaLoading] = useState(true)

  const params = useMemo(
    () => ({
      page: pagination.page,
      limit: pagination.limit,
      campaignId: filters.campaignId || undefined,
      automationId: filters.automationId || undefined,
      search: filters.search || undefined,
    }),
    [filters, pagination.page, pagination.limit],
  )

  const loadRows = async () => {
    setIsLoading(true)

    try {
      const response = await api.get('/email/analytics/device-location', { params })
      setRows(response.data.data || [])
      setPagination((current) => ({
        ...current,
        ...(response.data.pagination || {}),
      }))
    } finally {
      setIsLoading(false)
    }
  }

  const loadFilterOptions = async () => {
    setIsMetaLoading(true)

    try {
      const [campaignResponse, automationResponse] = await Promise.all([
        api.get('/campaigns', { params: { limit: 100 } }),
        api.get('/automations', { params: { limit: 100 } }),
      ])

      setCampaigns(campaignResponse.data.data || [])
      setAutomations(automationResponse.data.data || [])
    } finally {
      setIsMetaLoading(false)
    }
  }

  useEffect(() => {
    loadFilterOptions()
  }, [])

  useEffect(() => {
    loadRows()
  }, [params])

  const updateFilter = (key, value) => {
    setFilters((current) => ({
      ...current,
      [key]: value,
      ...(key === 'campaignId' && value ? { automationId: '' } : {}),
      ...(key === 'automationId' && value ? { campaignId: '' } : {}),
    }))
    setPagination((current) => ({ ...current, page: 1 }))
  }

  return (
    <div className="space-y-6">
      <section className="shell-card p-5">
        <div className="grid gap-4 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-end">
          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase text-ui-muted">Campaign</span>
            <select
              value={filters.campaignId}
              onChange={(event) => updateFilter('campaignId', event.target.value)}
              className="h-11 w-full border border-ui bg-white px-3 text-sm text-ui-strong outline-none transition focus:border-[#8338ec]"
              disabled={isMetaLoading}
            >
              <option value="">All campaigns</option>
              {campaigns.map((campaign) => (
                <option key={campaign._id} value={campaign._id}>
                  {campaign.name}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase text-ui-muted">Automation</span>
            <select
              value={filters.automationId}
              onChange={(event) => updateFilter('automationId', event.target.value)}
              className="h-11 w-full border border-ui bg-white px-3 text-sm text-ui-strong outline-none transition focus:border-[#8338ec]"
              disabled={isMetaLoading}
            >
              <option value="">All automations</option>
              {automations.map((automation) => (
                <option key={automation._id} value={automation._id}>
                  {automation.name}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase text-ui-muted">Email ID</span>
            <input
              type="search"
              value={filters.search}
              onChange={(event) => updateFilter('search', event.target.value)}
              placeholder="Search email"
              className="h-11 w-full border border-ui bg-white px-3 text-sm text-ui-strong outline-none transition placeholder:text-ui-muted focus:border-[#8338ec]"
            />
          </label>

          <button
            type="button"
            onClick={() => {
              setFilters(initialFilters)
              setPagination((current) => ({ ...current, page: 1 }))
            }}
            className="h-11 border border-ui bg-white px-4 text-sm font-semibold text-ui-strong transition hover:bg-[var(--bg-subtle)]"
          >
            Clear
          </button>
        </div>
      </section>

      <section className="shell-card overflow-hidden">
        <div className="border-b border-ui px-6 py-4">
          <h3 className="text-lg font-semibold text-ui-strong">Recipient device and location</h3>
          <p className="mt-1 text-sm text-ui-body">
            {pagination.total} tracked recipient record{pagination.total === 1 ? '' : 's'}
          </p>
        </div>

        {isLoading ? (
          <div className="p-6">
            <LoadingState message="Loading device and location data..." />
          </div>
        ) : rows.length ? (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-[var(--bg-subtle)] text-ui-muted">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Email ID</th>
                    <th className="px-6 py-4 font-semibold">Location</th>
                    <th className="px-6 py-4 font-semibold">Device</th>
                    <th className="px-6 py-4 font-semibold">Click</th>
                    <th className="px-6 py-4 font-semibold">Open</th>
                    <th className="px-6 py-4 font-semibold">Campaign</th>
                    <th className="px-6 py-4 font-semibold">Automation</th>
                    <th className="px-6 py-4 font-semibold">Last activity</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-t border-ui">
                      <td className="px-6 py-4 font-medium text-ui-strong">{row.email}</td>
                      <td className="px-6 py-4 text-ui-body">{row.location || 'Unknown'}</td>
                      <td className="px-6 py-4 capitalize text-ui-body">{row.device || 'Unknown'}</td>
                      <td className="px-6 py-4">
                        <span className={row.clicked ? 'font-semibold text-emerald-700' : 'text-ui-muted'}>
                          {formatYesNo(row.clicked)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={row.opened ? 'font-semibold text-emerald-700' : 'text-ui-muted'}>
                          {formatYesNo(row.opened)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-ui-body">{row.campaignName || 'N/A'}</td>
                      <td className="px-6 py-4 text-ui-body">{row.automationName || 'N/A'}</td>
                      <td className="px-6 py-4 text-ui-body">{formatDateTime(row.lastActivityAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3 border-t border-ui px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-ui-body">
                Page {pagination.page} of {pagination.totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={pagination.page <= 1}
                  onClick={() => setPagination((current) => ({ ...current, page: current.page - 1 }))}
                  className="border border-ui bg-white px-4 py-2 text-sm font-semibold text-ui-strong transition hover:bg-[var(--bg-subtle)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => setPagination((current) => ({ ...current, page: current.page + 1 }))}
                  className="border border-ui bg-white px-4 py-2 text-sm font-semibold text-ui-strong transition hover:bg-[var(--bg-subtle)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="p-6">
            <EmptyState
              title="No device or location records"
              description="Open and click tracking data will appear here once recipients engage with campaigns or automations."
            />
          </div>
        )}
      </section>
    </div>
  )
}

export default DeviceLocationTrackingPage
