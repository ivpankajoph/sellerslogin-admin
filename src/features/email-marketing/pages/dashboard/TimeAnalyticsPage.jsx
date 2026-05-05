import { useEffect, useState } from 'react'
import AnalyticsWidgetShell from '../../components/ui/AnalyticsWidgetShell.jsx'
import LoadingState from '../../components/ui/LoadingState.jsx'
import { api } from '../../lib/api.js'

function TimeAnalyticsPage() {
  const [summary, setSummary] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

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

  useEffect(() => {
    loadSummary()
  }, [])

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      loadSummary({ silent: true }).catch(() => {})
    }, 30000)

    return () => window.clearInterval(intervalId)
  }, [])

  if (isLoading && !summary) {
    return <LoadingState message="Loading time analytics..." />
  }

  const bestHour = summary?.timeBasedAnalytics?.bestHour
  const bestHourLabel =
    bestHour !== null && bestHour !== undefined
      ? `${String(bestHour.hour).padStart(2, '0')}:00`
      : 'No data'

  return (
    <div className="space-y-6">
      <AnalyticsWidgetShell
        eyebrow="Time-Based analytics"
        title="Best send time signals"
        description="This updates from the latest open and click activity."
      >
        <div className="grid gap-4 p-6 md:grid-cols-3">
          <div className="rounded-[24px] border border-ui bg-[var(--bg-subtle)] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ui-muted">Best hour</p>
            <p className="mt-2 text-xl font-semibold text-ui-strong">{bestHourLabel}</p>
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
    </div>
  )
}

export default TimeAnalyticsPage
