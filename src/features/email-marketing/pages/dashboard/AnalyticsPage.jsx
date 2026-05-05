import { useEffect, useState } from 'react'
import AnalyticsWidgetShell from '../../components/ui/AnalyticsWidgetShell.jsx'
import DateRangeFilter from '../../components/ui/DateRangeFilter.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import LoadingState from '../../components/ui/LoadingState.jsx'
import PageHeader from '../../components/ui/PageHeader.jsx'
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
   

    </div>
  )
}

export default AnalyticsPage
