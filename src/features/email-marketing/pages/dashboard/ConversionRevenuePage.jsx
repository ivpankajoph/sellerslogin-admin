import { useEffect, useState } from 'react'
import DateRangeFilter from '../../components/ui/DateRangeFilter.jsx'
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

function ConversionRevenuePage() {
  const [filters, setFilters] = useState(initialFilters)
  const [summary, setSummary] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  const loadSummary = async ({ silent = false } = {}) => {
    if (!silent) {
      setIsLoading(true)
    }

    try {
      const response = await api.get('/email/analytics/summary', {
        params: {
          startDate: filters.startDate || undefined,
          endDate: filters.endDate || undefined,
        },
      })

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
    return <LoadingState message="Loading conversion analytics..." />
  }

  return (
    <div className="space-y-6">
      

      <section className="shell-card p-6">
        <DateRangeFilter
          filters={filters}
          onChange={(key, value) => setFilters((current) => ({ ...current, [key]: value }))}
          onApply={loadSummary}
        />
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
    </div>
  )
}

export default ConversionRevenuePage
