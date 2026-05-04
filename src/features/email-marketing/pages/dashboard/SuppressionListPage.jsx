import { useContext, useEffect, useState } from 'react'
import DateRangeFilter from '../../components/ui/DateRangeFilter.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import LoadingState from '../../components/ui/LoadingState.jsx'
import PageHeader from '../../components/ui/PageHeader.jsx'
import { ToastContext } from '../../context/ToastContext.jsx'
import { api } from '../../lib/api.js'

const initialFilters = {
  startDate: '',
  endDate: '',
  search: '',
  status: 'active',
  reason: '',
}

const initialForm = {
  email: '',
  reason: 'manual',
}

const reasonChips = [
  { value: '', label: 'All reasons' },
  { value: 'unsubscribe', label: 'Unsubscribes' },
  { value: 'bounce', label: 'Bounces' },
  { value: 'complaint', label: 'Complaints' },
  { value: 'reject', label: 'Rejects' },
  { value: 'manual', label: 'Manual' },
]

function SuppressionListPage() {
  const toast = useContext(ToastContext)
  const [filters, setFilters] = useState(initialFilters)
  const [form, setForm] = useState(initialForm)
  const [items, setItems] = useState([])
  const [counts, setCounts] = useState({ total: 0, unsubscribeCount: 0 })
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 })
  const [isLoading, setIsLoading] = useState(true)

  const loadSuppressions = async (page = 1) => {
    setIsLoading(true)

    try {
      const { data } = await api.get('/email/suppressions', {
        params: {
          page,
          limit: 10,
          startDate: filters.startDate || undefined,
          endDate: filters.endDate || undefined,
          search: filters.search || undefined,
          status: filters.status || undefined,
          reason: filters.reason || undefined,
        },
      })

      setItems(data.data)
      setPagination(data.pagination)
      setCounts(data.counts || { total: data.pagination.total, unsubscribeCount: 0 })
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to load suppressions')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadSuppressions()
  }, [])

  const handleCreate = async (event) => {
    event.preventDefault()

    if (!form.email.trim()) {
      toast.error('Suppression email is required')
      return
    }

    try {
      await api.post('/email/suppressions', form)
      toast.success('Email added to suppression list')
      setForm(initialForm)
      loadSuppressions(1)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to add suppression')
    }
  }

  const handleUnsuppress = async (id) => {
    try {
      await api.post(`/email/suppressions/${id}/unsuppress`)
      toast.success('Suppression released')
      loadSuppressions(pagination.page)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to release suppression')
    }
  }

  return (
    <div className="space-y-6">
      <section className="shell-card-strong p-6 md:p-8">
        <div className="flex flex-col  gap-6 xl:flex-row xl:items-end xl:justify-between">
          <PageHeader
           
            title="Suppression control center"
           
          />
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-[24px] border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Active entries</p>
              <p className="mt-2 text-3xl font-semibold text-slate-950">{counts.total}</p>
            </div>
            <div className="rounded-[24px] border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Unsubscribes</p>
              <p className="mt-2 text-3xl font-semibold text-slate-950">{counts.unsubscribeCount}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="shell-card p-6">
          <DateRangeFilter
            filters={filters}
            onChange={(key, value) => setFilters((current) => ({ ...current, [key]: value }))}
            onApply={() => loadSuppressions(1)}
          />

          <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1fr)_180px]">
            <input
              className="field"
              placeholder="Search by email"
              value={filters.search}
              onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
            />
            <select
              className="field"
              value={filters.status}
              onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
            >
              <option value="active">Active only</option>
              <option value="released">Released only</option>
              <option value="">All statuses</option>
            </select>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {reasonChips.map((chip) => (
              <button
                key={chip.value || 'all'}
                type="button"
                onClick={() => {
                  setFilters((current) => ({ ...current, reason: chip.value }))
                  setTimeout(() => loadSuppressions(1), 0)
                }}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  filters.reason === chip.value
                    ? 'bg-slate-950 text-white'
                    : 'border border-slate-200 bg-white text-slate-500'
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </article>

        <article className="shell-card p-6">
          <div className="mb-4">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">Manual suppress</p>
            <h3 className="mt-1 text-xl font-semibold text-slate-950">Add exclusion entry</h3>
          </div>

          <form className="space-y-4" onSubmit={handleCreate}>
            <input
              className="field"
              type="email"
              placeholder="email@example.com"
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
            />
            <select
              className="field"
              value={form.reason}
              onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))}
            >
              <option value="manual">manual</option>
              <option value="unsubscribe">unsubscribe</option>
              <option value="bounce">bounce</option>
              <option value="complaint">complaint</option>
              <option value="reject">reject</option>
            </select>
            <button type="submit" className="primary-button w-full">
              Add suppression
            </button>
          </form>
        </article>
      </section>

      {isLoading ? (
        <LoadingState message="Loading suppression center..." />
      ) : items.length ? (
        <section className="shell-card-strong overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                Suppression list
              </p>
              <h3 className="mt-1 text-xl font-semibold text-slate-950">Operational exclusions</h3>
            </div>
            <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-500">
              Page {pagination.page} of {pagination.totalPages}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-6 py-4 font-medium">Email</th>
                  <th className="px-6 py-4 font-medium">Reason</th>
                  <th className="px-6 py-4 font-medium">Source</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Related</th>
                  <th className="px-6 py-4 font-medium">Created</th>
                  <th className="px-6 py-4 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item._id} className="border-t border-slate-100">
                    <td className="px-6 py-4 font-medium text-slate-900">{item.email}</td>
                    <td className="px-6 py-4 capitalize text-slate-600">{item.reason}</td>
                    <td className="px-6 py-4 capitalize text-slate-600">{item.source}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          item.status === 'active'
                            ? 'bg-rose-50 text-rose-700'
                            : 'bg-emerald-50 text-emerald-700'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {item.relatedSubscriberId || item.relatedCampaignId
                        ? `${item.relatedSubscriberId ? 'subscriber linked' : ''}${item.relatedSubscriberId && item.relatedCampaignId ? ' / ' : ''}${item.relatedCampaignId ? 'campaign linked' : ''}`
                        : 'No relation'}
                    </td>
                    <td className="px-6 py-4 text-slate-500">{new Date(item.createdAt).toLocaleString()}</td>
                    <td className="px-6 py-4">
                      {item.status === 'active' ? (
                        <button
                          type="button"
                          className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                          onClick={() => handleUnsuppress(item._id)}
                        >
                          Unsuppress
                        </button>
                      ) : (
                        <span className="text-sm text-slate-400">Released</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between px-6 py-4 text-sm text-slate-500">
            <span>{pagination.total} entries matched current filters</span>
            <div className="flex gap-3">
              <button
                type="button"
                className="rounded-2xl border border-slate-200 px-4 py-2 disabled:opacity-50"
                disabled={pagination.page <= 1}
                onClick={() => loadSuppressions(pagination.page - 1)}
              >
                Previous
              </button>
              <button
                type="button"
                className="rounded-2xl border border-slate-200 px-4 py-2 disabled:opacity-50"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => loadSuppressions(pagination.page + 1)}
              >
                Next
              </button>
            </div>
          </div>
        </section>
      ) : (
        <EmptyState
          title="No suppression entries found"
          description="Entries will appear here after unsubscribes, hard bounces, complaints, rejects, or manual suppression."
        />
      )}
    </div>
  )
}

export default SuppressionListPage
