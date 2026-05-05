import { useContext, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import EmptyState from '../../components/ui/EmptyState.jsx'
import LoadingState from '../../components/ui/LoadingState.jsx'
import Modal from '../../components/ui/Modal.jsx'
import PageHeader from '../../components/ui/PageHeader.jsx'
import AutomationPreviewTestModal from '../../components/dashboard/AutomationPreviewTestModal.jsx'
import StatusBadge from '../../components/ui/StatusBadge.jsx'
import { ToastContext } from '../../context/ToastContext.jsx'
import { dripCampaignPresets, triggerLabels, workflowStatusTabs } from '../../data/automations.js'
import { api } from '../../lib/api.js'

const initialFilters = {
  search: '',
  trigger: '',
}

const defaultAutomationUsage = { used: 0, limit: 0, remaining: 0, isExhausted: false }

function AutomationListPage() {
  const navigate = useNavigate()
  const toast = useContext(ToastContext)
  const [workflows, setWorkflows] = useState([])
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 })
  const [meta, setMeta] = useState({ triggers: [] })
  const [filters, setFilters] = useState(initialFilters)
  const [statusTab, setStatusTab] = useState('all')
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateChooser, setShowCreateChooser] = useState(false)
  const [showRecipeGallery, setShowRecipeGallery] = useState(false)
  const [previewWorkflow, setPreviewWorkflow] = useState(null)
  const [previewEmail, setPreviewEmail] = useState(null)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [isPreviewLoading, setIsPreviewLoading] = useState(false)
  const [actionMenuWorkflowId, setActionMenuWorkflowId] = useState(null)
  const [workflowPendingDelete, setWorkflowPendingDelete] = useState(null)
  const [isDeletingWorkflow, setIsDeletingWorkflow] = useState(false)
  const [automationUsage, setAutomationUsage] = useState(defaultAutomationUsage)
  const actionMenuRef = useRef(null)

  const loadWorkflows = async (page = 1, nextStatus = statusTab, nextFilters = filters) => {
    setIsLoading(true)

    try {
      const [metaResponse, listResponse, billingResponse] = await Promise.all([
        api.get('/automations/meta'),
        api.get('/automations', {
          params: {
            page,
            limit: 10,
            status: nextStatus,
            search: nextFilters.search || undefined,
            trigger: nextFilters.trigger || undefined,
          },
        }),
        api.get('/billing/me').catch(() => ({ data: null })),
      ])

      setMeta(metaResponse.data)
      setWorkflows(listResponse.data.data)
      setPagination(listResponse.data.pagination)
      setAutomationUsage(billingResponse.data?.featureUsage?.automations || defaultAutomationUsage)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to load workflows')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadWorkflows(1)
  }, [])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target)) {
        setActionMenuWorkflowId(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleToggleStatus = async (workflow) => {
    try {
      await api.post(`/automations/${workflow._id}/${workflow.isActive ? 'deactivate' : 'activate'}`)
      toast.success(workflow.isActive ? 'Workflow deactivated' : 'Workflow activated')
      loadWorkflows(pagination.page)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to update workflow')
    }
  }

  const handleDeleteWorkflow = async (workflow) => {
    setWorkflowPendingDelete(workflow)
  }

  const confirmDeleteWorkflow = async () => {
    if (!workflowPendingDelete?._id) {
      return
    }

    setIsDeletingWorkflow(true)
    try {
      await api.delete(`/automations/${workflowPendingDelete._id}`)
      toast.success('Workflow deleted')

      const nextPage =
        workflows.length === 1 && pagination.page > 1 ? pagination.page - 1 : pagination.page

      loadWorkflows(nextPage)
      setWorkflowPendingDelete(null)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to delete workflow')
    } finally {
      setIsDeletingWorkflow(false)
    }
  }

  const handleChooseReadyMade = () => {
    setShowCreateChooser(false)
    setShowRecipeGallery(true)
  }

  const handleChooseCustom = () => {
    setShowCreateChooser(false)
    navigate('/automations/new')
  }

  const handlePreviewWorkflow = async (workflowId) => {
    setIsPreviewLoading(true)
    setPreviewWorkflow(null)
    setPreviewEmail(null)

    try {
      const { data } = await api.get(`/automations/${workflowId}`)
      setPreviewWorkflow(data)
      const previewResponse = await api.post('/automations/preview-email', {
        workflowId,
      })
      setPreviewEmail(previewResponse.data)
      setShowPreviewModal(true)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to load workflow preview')
    } finally {
      setIsPreviewLoading(false)
    }
  }

  const handleRunSampleExecution = async ({ emails }) => {
    if (!previewWorkflow?._id) {
      toast.error('Workflow preview is not ready')
      return
    }

    const recipientEmails = Array.isArray(emails)
      ? emails.map((email) => String(email || '').trim().toLowerCase()).filter(Boolean)
      : []

    if (!recipientEmails.length) {
      toast.error('Enter a recipient email address')
      return
    }

    try {
      await api.post(`/automations/${previewWorkflow._id}/sample-execution`, {
        emails: recipientEmails,
      })
      toast.success('Test email sent')
      setShowPreviewModal(false)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to send test email')
    }
  }

  return (
    <div className="space-y-6">
      <section className="brevo-card p-6 md:p-8">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-3">
            <PageHeader title="Workflow automation studio" />
            <div className="flex flex-wrap gap-2">
              <span className="soft-pill">{pagination.total} workflows in workspace</span>
            </div>
          </div>
          <button
            type="button"
            className="primary-button"
            onClick={() => setShowCreateChooser(true)}
          >
            Create Automation
          </button>
        </div>
      </section>

      <section className="grid gap-3 rounded-[20px] border border-[#e7def8] bg-white px-5 py-4 shadow-[0_10px_24px_rgba(43,29,75,0.04)] md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
        <div>
          <p className="text-sm font-semibold text-[#2f2b3d]">
            Automations created: {automationUsage.used}
          </p>
          <p className="mt-1 text-sm text-[#6e6787]">
            Automation creation is unlimited. Email credits are enforced when messages send.
          </p>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-[#eee9f8] md:w-56">
          <div
            className="h-full bg-[#8338ec]"
            style={{ width: '100%' }}
          />
        </div>
      </section>

      <section className="brevo-card p-5 md:p-6">
        <div className="flex flex-wrap gap-2">
          {workflowStatusTabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => {
                setStatusTab(tab)
                loadWorkflows(1, tab, filters)
              }}
              className={`brevo-tab capitalize ${statusTab === tab ? 'brevo-tab-active' : ''}`}
            >
              {tab === 'all' ? 'All ' : tab}
            </button>
          ))}
        </div>

        <form
          className="mt-5 grid gap-4 md:grid-cols-[minmax(0,1.4fr)_220px_auto]"
          onSubmit={(event) => {
            event.preventDefault()
            loadWorkflows(1)
          }}
        >
          <input
            className="field"
            placeholder="Search workflow name or description"
            value={filters.search}
            onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
          />
          <select
            className="field"
            value={filters.trigger}
            onChange={(event) => setFilters((current) => ({ ...current, trigger: event.target.value }))}
          >
            <option value="">All triggers</option>
            {meta.triggers.map((trigger) => (
              <option key={trigger} value={trigger}>
                {triggerLabels[trigger] || trigger}
              </option>
            ))}
          </select>
          <button type="submit" className="primary-button">
            Apply filters
          </button>
        </form>
      </section>

      <section className="brevo-card overflow-hidden">
        {isLoading ? (
          <LoadingState message="Loading workflows..." />
        ) : workflows.length ? (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-[var(--border-soft)] bg-[#f7f9f1] text-[#667085]">
                  <tr>
                    <th className="px-6 py-4 font-medium">Workflow</th>
                    <th className="px-6 py-4 font-medium">Trigger</th>
                    <th className="px-6 py-4 font-medium">Steps</th>
                    <th className="px-6 py-4 font-medium">Executions</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {workflows.map((workflow) => (
                    <tr key={workflow._id} className="border-b border-[var(--border-soft)] align-top last:border-b-0">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2">
                          <Link to={`/automations/${workflow._id}`} className="text-[15px] font-semibold text-[#101828]">
                            {workflow.name}
                          </Link>
                          <button
                            type="button"
                            onClick={() => handlePreviewWorkflow(workflow._id)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800"
                            aria-label={`Preview ${workflow.name}`}
                            title="Preview & test"
                            disabled={isPreviewLoading}
                          >
                            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="2">
                              <path d="M1.5 12S5.5 4.5 12 4.5 22.5 12 22.5 12 18.5 19.5 12 19.5 1.5 12 1.5 12Z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                          </button>
                        </div>
                        <p className="mt-1 text-sm text-[#667085]">
                          {workflow.description || 'No workflow description yet'}
                        </p>
                      </td>
                      <td className="px-6 py-5 text-[#475467]">
                        {triggerLabels[workflow.trigger] || workflow.trigger}
                      </td>
                      <td className="px-6 py-5 text-[#475467]">{workflow.stepCount}</td>
                      <td className="px-6 py-5 text-[#475467]">
                        <p>{workflow.executionCount || 0} total runs</p>
                        <p className="mt-1 text-xs text-[#667085]">
                          {workflow.executionStats?.completed || 0} completed / {workflow.executionStats?.failed || 0} failed
                        </p>
                      </td>
                      <td className="px-6 py-5">
                        <StatusBadge status={workflow.status} />
                      </td>
                      <td className="px-6 py-5">
                        <div className="relative inline-flex" ref={actionMenuWorkflowId === workflow._id ? actionMenuRef : null}>
                          <button
                            type="button"
                            onClick={() =>
                              setActionMenuWorkflowId((current) =>
                                current === workflow._id ? null : workflow._id,
                              )
                            }
                            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800"
                            aria-label={`Actions for ${workflow.name}`}
                            aria-haspopup="menu"
                            aria-expanded={actionMenuWorkflowId === workflow._id}
                          >
                            <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
                              <circle cx="12" cy="5" r="1.7" />
                              <circle cx="12" cy="12" r="1.7" />
                              <circle cx="12" cy="19" r="1.7" />
                            </svg>
                          </button>

                          {actionMenuWorkflowId === workflow._id ? (
                            <div
                              role="menu"
                              className="absolute right-0 top-12 z-20 w-44 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_16px_40px_rgba(15,23,42,0.14)]"
                            >
                              <Link
                                role="menuitem"
                                className="block rounded-xl px-3 py-2 text-sm font-medium text-[#101828] hover:bg-slate-50"
                                to={`/automations/${workflow._id}`}
                                onClick={() => setActionMenuWorkflowId(null)}
                              >
                                View
                              </Link>
                              <Link
                                role="menuitem"
                                className="block rounded-xl px-3 py-2 text-sm font-medium text-[#166534] hover:bg-slate-50"
                                to={`/automations/${workflow._id}/edit`}
                                onClick={() => setActionMenuWorkflowId(null)}
                              >
                                Edit
                              </Link>
                              <button
                                type="button"
                                role="menuitem"
                                className="block w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-[#b54708] hover:bg-slate-50"
                                onClick={() => {
                                  setActionMenuWorkflowId(null)
                                  handleToggleStatus(workflow)
                                }}
                              >
                                {workflow.isActive ? 'Deactivate' : 'Activate'}
                              </button>
                              <Link
                                role="menuitem"
                                className="block rounded-xl px-3 py-2 text-sm font-medium text-[#667085] hover:bg-slate-50"
                                to={`/automations/${workflow._id}/executions`}
                                onClick={() => setActionMenuWorkflowId(null)}
                              >
                                Logs
                              </Link>
                              <button
                                type="button"
                                role="menuitem"
                                className="block w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-rose-600 hover:bg-rose-50"
                                onClick={() => {
                                  setActionMenuWorkflowId(null)
                                  handleDeleteWorkflow(workflow)
                                }}
                              >
                                Delete
                              </button>
                            </div>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3 px-6 py-4 text-sm text-[#667085] md:flex-row md:items-center md:justify-between">
              <span>
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <div className="flex gap-3">
                <button
                  type="button"
                  className="rounded-full border border-[var(--border-strong)] px-4 py-2 disabled:opacity-50"
                  disabled={pagination.page <= 1}
                  onClick={() => loadWorkflows(pagination.page - 1)}
                >
                  Previous
                </button>
                <button
                  type="button"
                  className="rounded-full border border-[var(--border-strong)] px-4 py-2 disabled:opacity-50"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => loadWorkflows(pagination.page + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="p-6">
            <EmptyState
              title="No workflows match these filters"
              description="Create a workflow, switch status tabs, or widen the filters to continue building your automation layer."
              action={
                <Link to="/automations/new" className="primary-button">
                  Create Automation

                </Link>
              }
            />
          </div>
        )}
      </section>

      {showCreateChooser ? (
        <Modal
          title="Create workflow"
          // description="Pick a ready-made automation recipe or start with a custom flow."
          onClose={() => setShowCreateChooser(false)}
          className="max-w-4xl"
          bodyClassName="grid gap-4 md:grid-cols-2"
        >
          <button
            type="button"
            onClick={handleChooseReadyMade}
            className="rounded-[28px] border border-emerald-200 bg-[#f6fff8] p-6 text-left transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-lg"
          >
            <div className="inline-flex rounded-2xl bg-emerald-100 px-3 py-2 text-sm font-semibold text-emerald-700">
              Ready-made automation
            </div>
            
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Pick a workflow for welcome, signup, abandoned cart recovery, order confirmation, payment thank-you, follow-up, reminder, or discount flows.
            </p>
            <p className="mt-4 text-sm font-medium text-emerald-700">
              Browse automation recipes -&gt;
            </p>
          </button>

          <button
            type="button"
            onClick={handleChooseCustom}
            className="rounded-[28px] border border-slate-200 bg-white p-6 text-left transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg"
          >
            <div className="inline-flex rounded-2xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">
              Custom flow
            </div>
            <h3 className="mt-4 text-2xl font-semibold text-slate-900">
              Build from scratch
            </h3>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Open the workflow builder and create your own trigger, steps, delays, conditions, and email actions.
            </p>
            <p className="mt-4 text-sm font-medium text-slate-900">
              Open builder -&gt;
            </p>
          </button>
        </Modal>
      ) : null}

      {showRecipeGallery ? (
        <Modal
          title="Ready-made automation"
          description="Pick a proven workflow recipe and open the builder with matching starter steps."
          onClose={() => setShowRecipeGallery(false)}
          className="max-w-6xl"
          bodyClassName="space-y-4"
        >
        
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {dripCampaignPresets.map((preset) => (
              <Link
                key={preset.key}
                to={`/automations/new?preset=${preset.key}`}
                onClick={() => {
                  setShowRecipeGallery(false)
                }}
                className="rounded-[24px] border border-[var(--border-soft)] bg-white p-4 transition hover:border-[rgba(21,128,61,0.2)] hover:bg-[#f7f9f1]"
              >
                <p className="text-[15px] font-semibold text-[#101828]">{preset.label}</p>
                <p className="mt-1 text-sm text-[#667085]">{preset.description}</p>
                <p className="mt-3 text-xs font-medium text-[#166534]">
                  Trigger: {triggerLabels[preset.trigger] || preset.trigger}
                </p>
              </Link>
            ))}
          </div>
        </Modal>
      ) : null}

      <AutomationPreviewTestModal
        open={showPreviewModal}
        workflow={previewWorkflow}
        previewEmail={previewEmail}
        onClose={() => {
          setShowPreviewModal(false)
          setPreviewWorkflow(null)
          setPreviewEmail(null)
        }}
        onRunSample={handleRunSampleExecution}
      />

      {workflowPendingDelete ? (
        <Modal
          title="Delete workflow"
          description={`Are you sure you want to delete "${workflowPendingDelete.name}"? This will remove the workflow, its steps, executions, and logs.`}
          onClose={() => {
            if (!isDeletingWorkflow) {
              setWorkflowPendingDelete(null)
            }
          }}
          className="max-w-lg"
          bodyClassName="flex flex-col gap-5"
        >
          <div className="flex flex-col gap-3 rounded-3xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-900">
            <p className="font-semibold">This action cannot be undone.</p>
            <p className="leading-6">
              Deleting the workflow removes its automation logic, related runs, and audit logs from the workspace.
            </p>
          </div>

          <div className="flex flex-wrap justify-end gap-3">
            <button
              type="button"
              className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
              onClick={() => setWorkflowPendingDelete(null)}
              disabled={isDeletingWorkflow}
            >
              Cancel
            </button>
            <button
              type="button"
              className="rounded-xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-60"
              onClick={confirmDeleteWorkflow}
              disabled={isDeletingWorkflow}
            >
              {isDeletingWorkflow ? 'Deleting...' : 'Yes, delete'}
            </button>
          </div>
        </Modal>
      ) : null}
    </div>
  )
}

export default AutomationListPage
