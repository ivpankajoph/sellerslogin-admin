import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import EmptyState from '../../components/ui/EmptyState.jsx'
import LoadingState from '../../components/ui/LoadingState.jsx'
import PageHeader from '../../components/ui/PageHeader.jsx'
import StatusBadge from '../../components/ui/StatusBadge.jsx'
import { triggerLabels } from '../../data/automations.js'
import { api } from '../../lib/api.js'

function AutomationExecutionsPage() {
  const { id } = useParams()
  const [workflow, setWorkflow] = useState(null)
  const [executions, setExecutions] = useState([])
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 })
  const [isLoading, setIsLoading] = useState(true)

  const loadExecutions = async (page = 1) => {
    setIsLoading(true)

    try {
      const [workflowResponse, executionResponse] = await Promise.all([
        api.get(`/automations/${id}`),
        api.get(`/automations/${id}/executions`, {
          params: { page, limit: 12 },
        }),
      ])

      setWorkflow(workflowResponse.data)
      setExecutions(executionResponse.data.data)
      setPagination(executionResponse.data.pagination)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadExecutions(1)
  }, [id])

  if (isLoading && !workflow) {
    return <LoadingState message="Loading execution logs..." />
  }

  return (
    <div className="space-y-6">
      <section className="shell-card-strong p-6 md:p-8">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <PageHeader
            eyebrow="Automations"
            title={`${workflow?.name || 'Workflow'} executions`}
            description="Inspect execution history, run status, and trigger context while the automation processor grows into a fuller event engine."
          />
          <Link to={`/automations/${id}`} className="rounded-xl border border-[#ddd4f2] px-4 py-3 text-sm font-medium text-[#5f5878]">
            Back to workflow
          </Link>
        </div>
      </section>

      <section className="shell-card-strong overflow-hidden">
        {isLoading ? (
          <LoadingState message="Refreshing execution logs..." />
        ) : executions.length ? (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-100 bg-[#faf7ff] text-[#7a7296]">
                  <tr>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 font-medium">Subscriber</th>
                    <th className="px-6 py-4 font-medium">Trigger</th>
                    <th className="px-6 py-4 font-medium">Current step</th>
                    <th className="px-6 py-4 font-medium">Started</th>
                    <th className="px-6 py-4 font-medium">Completed</th>
                  </tr>
                </thead>
                <tbody>
                  {executions.map((execution) => (
                    <tr key={execution._id} className="border-b border-slate-100 last:border-b-0">
                      <td className="px-6 py-5">
                        <StatusBadge status={execution.status} />
                      </td>
                      <td className="px-6 py-5 text-[#5f5878]">
                        {execution.subscriberId?.email || 'Preview execution'}
                      </td>
                      <td className="px-6 py-5 text-[#5f5878]">
                        {triggerLabels[execution.trigger] || execution.trigger}
                      </td>
                      <td className="px-6 py-5 text-[#5f5878]">{execution.currentStepOrder}</td>
                      <td className="px-6 py-5 text-[#5f5878]">
                        {execution.startedAt ? new Date(execution.startedAt).toLocaleString() : 'Not started'}
                      </td>
                      <td className="px-6 py-5 text-[#5f5878]">
                        {execution.completedAt ? new Date(execution.completedAt).toLocaleString() : 'Not completed'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3 px-6 py-4 text-sm text-[#6e6787] md:flex-row md:items-center md:justify-between">
              <span>
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <div className="flex gap-3">
                <button
                  type="button"
                  className="rounded-xl border border-[#ddd4f2] px-4 py-2 disabled:opacity-50"
                  disabled={pagination.page <= 1}
                  onClick={() => loadExecutions(pagination.page - 1)}
                >
                  Previous
                </button>
                <button
                  type="button"
                  className="rounded-xl border border-[#ddd4f2] px-4 py-2 disabled:opacity-50"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => loadExecutions(pagination.page + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="p-6">
            <EmptyState
              title="No execution logs yet"
              description="Execution history will appear here once the workflow is run manually or triggered by future event hooks."
            />
          </div>
        )}
      </section>
    </div>
  )
}

export default AutomationExecutionsPage
