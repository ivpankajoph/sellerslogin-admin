import { useContext, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import EmptyState from '../../components/ui/EmptyState.jsx'
import LoadingState from '../../components/ui/LoadingState.jsx'
import PageHeader from '../../components/ui/PageHeader.jsx'
import StatusBadge from '../../components/ui/StatusBadge.jsx'
import { ToastContext } from '../../context/ToastContext.jsx'
import { stepTypeLabels, triggerLabels } from '../../data/automations.js'
import { api } from '../../lib/api.js'

function AutomationDetailsPage() {
  const { id } = useParams()
  const toast = useContext(ToastContext)
  const [workflow, setWorkflow] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  const loadWorkflow = async () => {
    setIsLoading(true)

    try {
      const { data } = await api.get(`/automations/${id}`)
      setWorkflow(data)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to load workflow')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadWorkflow()
  }, [id])

  const handleToggleStatus = async () => {
    try {
      await api.post(`/automations/${id}/${workflow.isActive ? 'deactivate' : 'activate'}`)
      toast.success(workflow.isActive ? 'Workflow deactivated' : 'Workflow activated')
      loadWorkflow()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to update workflow')
    }
  }

  const handleSampleExecution = async () => {
    try {
      await api.post(`/automations/${id}/sample-execution`)
      toast.success('Sample execution processed')
      loadWorkflow()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to process sample execution')
    }
  }

  if (isLoading) {
    return <LoadingState message="Loading workflow..." />
  }

  if (!workflow) {
    return <EmptyState title="Workflow not found" description="This workflow could not be loaded." />
  }

  return (
    <div className="space-y-6">
      <section className="shell-card-strong p-6 md:p-8">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-3">
            <PageHeader
              eyebrow="Automations"
              title={workflow.name}
              description={workflow.description || 'This workflow is ready for trigger-based lifecycle execution.'}
            />
            <div className="flex flex-wrap gap-2">
              <span className="soft-pill">{triggerLabels[workflow.trigger] || workflow.trigger}</span>
              <span className="soft-pill">{workflow.steps.length} ordered steps</span>
              <span className="soft-pill">{workflow.executionCount || 0} total executions</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link to={`/automations/${workflow._id}/edit`} className="rounded-xl border border-[#ddd4f2] px-4 py-3 text-sm font-medium text-[#5f5878]">
              Edit
            </Link>
            <button type="button" onClick={handleSampleExecution} className="rounded-xl border border-[#ddd4f2] px-4 py-3 text-sm font-medium text-[#5f5878]">
              Run sample
            </button>
            <button type="button" onClick={handleToggleStatus} className="primary-button">
              {workflow.isActive ? 'Deactivate' : 'Activate'}
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="shell-card p-5">
          <p className="text-sm text-slate-500">Status</p>
          <div className="mt-3"><StatusBadge status={workflow.status} /></div>
        </article>
        <article className="shell-card p-5">
          <p className="text-sm text-slate-500">Executions</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">{workflow.executionCount || 0}</p>
        </article>
        <article className="shell-card p-5">
          <p className="text-sm text-slate-500">Completed</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">{workflow.executionStats?.completed || 0}</p>
        </article>
        <article className="shell-card p-5">
          <p className="text-sm text-slate-500">Failed</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">{workflow.executionStats?.failed || 0}</p>
        </article>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <article className="shell-card-strong p-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">Sequence</p>
            <h3 className="mt-1 text-xl font-semibold text-slate-950">Workflow steps</h3>
          </div>

          <div className="mt-5 space-y-4">
            {workflow.steps.map((step, index) => (
              <div key={step._id} className="rounded-[24px] border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Step {index + 1}</p>
                    <p className="mt-1 text-lg font-semibold text-slate-900">{step.title}</p>
                    <p className="mt-1 text-sm text-slate-500">{step.description || stepTypeLabels[step.type]}</p>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-500">
                    {stepTypeLabels[step.type] || step.type}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="shell-card-strong p-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">Workflow metadata</p>
            <h3 className="mt-1 text-xl font-semibold text-slate-950">Configuration</h3>
          </div>

          <div className="mt-5 grid gap-4">
            <div className="rounded-[24px] border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Entry segment</p>
              <p className="mt-2 text-sm text-slate-900">{workflow.entrySegmentId?.name || 'All eligible subscribers'}</p>
            </div>
            <div className="rounded-[24px] border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Trigger notes</p>
              <p className="mt-2 text-sm text-slate-900">{workflow.triggerConfig?.notes || 'No internal notes yet'}</p>
            </div>
            <div className="rounded-[24px] border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Last run</p>
              <p className="mt-2 text-sm text-slate-900">
                {workflow.lastRunAt ? new Date(workflow.lastRunAt).toLocaleString() : 'No executions yet'}
              </p>
            </div>
          </div>
        </article>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <article className="shell-card-strong overflow-hidden">
          <div className="border-b border-slate-100 px-6 py-5">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">Recent executions</p>
            <h3 className="mt-1 text-xl font-semibold text-slate-950">Execution activity</h3>
          </div>
          {workflow.recentExecutions.length ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 font-medium">Subscriber</th>
                    <th className="px-6 py-4 font-medium">Trigger</th>
                    <th className="px-6 py-4 font-medium">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {workflow.recentExecutions.map((execution) => (
                    <tr key={execution._id} className="border-t border-slate-100">
                      <td className="px-6 py-4"><StatusBadge status={execution.status} /></td>
                      <td className="px-6 py-4 text-slate-600">
                        {execution.subscriberId?.email || 'Preview execution'}
                      </td>
                      <td className="px-6 py-4 text-slate-600">{triggerLabels[execution.trigger] || execution.trigger}</td>
                      <td className="px-6 py-4 text-slate-500">{new Date(execution.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6">
              <EmptyState
                title="No executions yet"
                description="Run a sample execution or activate the workflow to begin collecting run history."
              />
            </div>
          )}
        </article>

        <article className="shell-card-strong overflow-hidden">
          <div className="border-b border-slate-100 px-6 py-5">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">Workflow logs</p>
            <h3 className="mt-1 text-xl font-semibold text-slate-950">Processor timeline</h3>
          </div>
          {workflow.logs.length ? (
            <div className="space-y-3 p-6">
              {workflow.logs.map((log) => (
                <div key={log._id} className="rounded-[22px] border border-slate-100 bg-slate-50 px-4 py-3">
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-sm font-semibold text-slate-900">{log.message}</p>
                    <span className="text-xs text-slate-400">{new Date(log.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-400">{log.eventType}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6">
              <EmptyState
                title="No logs yet"
                description="Logs will appear here as the workflow is edited, activated, or executed."
              />
            </div>
          )}
        </article>
      </section>
    </div>
  )
}

export default AutomationDetailsPage
