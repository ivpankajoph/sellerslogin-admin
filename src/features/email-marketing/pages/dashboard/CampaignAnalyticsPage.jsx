import { useContext, useEffect, useMemo, useState } from 'react'
import AnalyticsWidgetShell from '../../components/ui/AnalyticsWidgetShell.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import LoadingState from '../../components/ui/LoadingState.jsx'
import { ToastContext } from '../../context/ToastContext.jsx'
import { api } from '../../lib/api.js'
import { formatCurrency } from '../../lib/formatters.js'

const exportTargetOptions = [
  { value: 'campaign_report', label: 'Campaign report' },
  { value: 'selected_summary', label: 'Selected summary' },
  { value: 'deliverability_report', label: 'Deliverability report' },
  { value: 'audience_growth', label: 'Audience growth' },
]

const formatRate = (numerator, denominator) =>
  denominator ? `${((numerator / denominator) * 100).toFixed(2)}%` : '0.00%'

const formatExportLabel = (format) => {
  if (format === 'excel') {
    return 'excel'
  }

  return format.replaceAll('_', ' ')
}

const getFilenameFromDisposition = (contentDisposition, fallback) => {
  const match = contentDisposition?.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i)
  return match?.[1] ? decodeURIComponent(match[1]) : fallback
}

function CampaignAnalyticsPage() {
  const toast = useContext(ToastContext)
  const [campaignReport, setCampaignReport] = useState([])
  const [exportFormats, setExportFormats] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [exportTarget, setExportTarget] = useState('campaign_report')
  const [comparisonLeftId, setComparisonLeftId] = useState('')
  const [comparisonRightId, setComparisonRightId] = useState('')
  const [activeTab, setActiveTab] = useState('snapshot')

  const loadCampaignAnalytics = async ({ silent = false } = {}) => {
    if (!silent) {
      setIsLoading(true)
    }

    try {
      const { data } = await api.get('/email/analytics/campaigns')
      const rows = Array.isArray(data.campaignReport) ? data.campaignReport : []

      setCampaignReport(rows)
      setExportFormats(Array.isArray(data.exportFormats) ? data.exportFormats : [])
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to load campaign analytics')
    } finally {
      if (!silent) {
        setIsLoading(false)
      }
    }
  }

  useEffect(() => {
    loadCampaignAnalytics()
  }, [])

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      loadCampaignAnalytics({ silent: true }).catch(() => {})
    }, 30000)

    return () => window.clearInterval(intervalId)
  }, [])

  useEffect(() => {
    if (!campaignReport.length) {
      return
    }

    setComparisonLeftId((current) => current || campaignReport[0]._id)
    setComparisonRightId(
      (current) => current || campaignReport[1]?._id || campaignReport[0]._id,
    )
  }, [campaignReport])

  const comparison = useMemo(() => {
    const left = campaignReport.find((campaign) => campaign._id === comparisonLeftId)
    const right = campaignReport.find((campaign) => campaign._id === comparisonRightId)

    return { left, right }
  }, [campaignReport, comparisonLeftId, comparisonRightId])

  const handleExport = async (report, format) => {
    try {
      const response = await api.get('/reports/export', {
        params: {
          report,
          format,
        },
        responseType: 'blob',
      })
      const extension = format === 'excel' ? 'xlsx' : format.replace('pdf_placeholder', 'pdf')
      const filename = getFilenameFromDisposition(
        response.headers['content-disposition'],
        `${report}.${extension}`,
      )
      const blobUrl = URL.createObjectURL(new Blob([response.data]))
      const anchor = document.createElement('a')
      anchor.href = blobUrl
      anchor.download = filename
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60000)
      toast.success('Report downloaded')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to download report')
    }
  }

  if (isLoading) {
    return <LoadingState message="Loading campaign analytics..." />
  }

  return (
    <div className="space-y-6">
      <section className="shell-card p-3">
        <div className="grid grid-cols-2 gap-2">
          {[
            ['snapshot', 'Performance Snapshot'],
            ['compare', 'Compare Campaigns'],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setActiveTab(value)}
              className={`px-4 py-3 text-sm font-semibold transition ${
                activeTab === value
                  ? 'bg-[#8338ec] text-white shadow-[0_10px_24px_rgba(131,56,236,0.18)]'
                  : 'bg-[var(--bg-subtle)] text-[#5d437b] hover:bg-[#f1e7ff] hover:text-[#5a189a]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      {activeTab === 'snapshot' ? (
        <AnalyticsWidgetShell
          eyebrow="Campaign report"
          title="Campaign performance snapshot"
          actions={
            <div className="flex flex-wrap gap-2">
              <select
                className="field min-w-[190px]"
                value={exportTarget}
                onChange={(event) => setExportTarget(event.target.value)}
              >
                {exportTargetOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {exportFormats.map((format) => (
                <button
                  key={format}
                  type="button"
                  onClick={() => handleExport(exportTarget, format)}
                  className="secondary-button"
                >
                  Export {formatExportLabel(format)}
                </button>
              ))}
            </div>
          }
        >
          {campaignReport.length ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-[var(--bg-subtle)] text-ui-muted">
                  <tr>
                    <th className="px-6 py-4 font-medium">Campaign</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 font-medium">Sent</th>
                    <th className="px-6 py-4 font-medium">Delivered</th>
                    <th className="px-6 py-4 font-medium">Opens</th>
                    <th className="px-6 py-4 font-medium">Clicks</th>
                    <th className="px-6 py-4 font-medium">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {campaignReport.map((row) => (
                    <tr key={row._id} className="border-t border-ui">
                      <td className="px-6 py-4 text-ui-strong">{row.name}</td>
                      <td className="px-6 py-4 capitalize text-ui-body">{row.status}</td>
                      <td className="px-6 py-4 text-ui-body">{row.sent || 0}</td>
                      <td className="px-6 py-4 text-ui-body">{row.delivered || 0}</td>
                      <td className="px-6 py-4 text-ui-body">{row.opens || 0}</td>
                      <td className="px-6 py-4 text-ui-body">{row.clicks || 0}</td>
                      <td className="px-6 py-4 text-ui-body">
                        {formatCurrency(row.estimatedCost || 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6">
              <EmptyState
                title="No campaign report rows"
                description="Campaign rows will appear once campaign activity is available."
              />
            </div>
          )}
        </AnalyticsWidgetShell>
      ) : (
        <AnalyticsWidgetShell
          eyebrow="Campaign comparison"
          title="Compare two campaigns"
          description="Select any two campaigns from the current report window to compare delivery and engagement."
        >
          <div className="grid gap-4 p-6">
            <div className="grid gap-3 md:grid-cols-2">
              <select
                className="field"
                value={comparisonLeftId}
                onChange={(event) => setComparisonLeftId(event.target.value)}
              >
                {campaignReport.map((campaign) => (
                  <option key={campaign._id} value={campaign._id}>
                    {campaign.name}
                  </option>
                ))}
              </select>
              <select
                className="field"
                value={comparisonRightId}
                onChange={(event) => setComparisonRightId(event.target.value)}
              >
                {campaignReport.map((campaign) => (
                  <option key={campaign._id} value={campaign._id}>
                    {campaign.name}
                  </option>
                ))}
              </select>
            </div>

            {comparison.left && comparison.right ? (
              <div className="grid gap-4 md:grid-cols-2">
                {[comparison.left, comparison.right].map((campaign) => (
                  <article
                    key={campaign._id}
                    className="rounded-[24px] border border-ui bg-[var(--bg-subtle)] p-4"
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ui-muted">
                      {campaign.name}
                    </p>
                    <p className="mt-2 text-sm text-ui-body capitalize">{campaign.status}</p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div>
                        <p className="text-xs text-ui-muted">Sent</p>
                        <p className="mt-1 text-xl font-semibold text-ui-strong">
                          {campaign.sent || 0}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-ui-muted">Delivered</p>
                        <p className="mt-1 text-xl font-semibold text-ui-strong">
                          {campaign.delivered || 0}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-ui-muted">Open rate</p>
                        <p className="mt-1 text-xl font-semibold text-ui-strong">
                          {formatRate(campaign.opens || 0, campaign.sent || 0)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-ui-muted">Click rate</p>
                        <p className="mt-1 text-xl font-semibold text-ui-strong">
                          {formatRate(campaign.clicks || 0, campaign.sent || 0)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-ui-muted">Estimated cost</p>
                        <p className="mt-1 text-xl font-semibold text-ui-strong">
                          {formatCurrency(campaign.estimatedCost || 0)}
                        </p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState
                title="Comparison needs two campaigns"
                description="Pick two campaigns from the report window to see a side-by-side breakdown."
              />
            )}
          </div>
        </AnalyticsWidgetShell>
      )}
    </div>
  )
}

export default CampaignAnalyticsPage
