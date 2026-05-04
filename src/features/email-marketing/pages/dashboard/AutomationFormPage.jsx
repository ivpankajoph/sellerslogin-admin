import { useContext, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import AutomationPreviewTestModal from '../../components/dashboard/AutomationPreviewTestModal.jsx'
import LoadingState from '../../components/ui/LoadingState.jsx'
import PageHeader from '../../components/ui/PageHeader.jsx'
import { ToastContext } from '../../context/ToastContext.jsx'
import {
  buildDripCampaignPreset,
  createWorkflowStep,
  dripCampaignPresets,
  stepTypeLabels,
  triggerLabels,
} from '../../data/automations.js'
import { api } from '../../lib/api.js'

const createInitialForm = () => ({
  name: '',
  description: '',
  trigger: 'welcome_signup',
  status: 'draft',
  entrySegmentId: '',
  websiteScope: {
    websiteId: '',
    websiteSlug: '',
    websiteName: '',
    label: '',
  },
  websiteScopes: [],
  triggerConfig: {
    delayWindow: '',
    notes: '',
  },
  steps: [createWorkflowStep('send_email'), createWorkflowStep('exit')],
})

const presetTemplateHints = {
  welcome_series: ['welcome series', 'welcome'],
  welcome_signup: ['signup email', 'welcome'],
  abandoned_cart: ['abandoned cart recovery', 'abandoned cart'],
  order_followup: ['follow-up sequence', 'follow-up'],
  reminder_email: ['reminder email', 'reminder'],
  discount_offer: ['discount offer', 'discount'],
  order_confirmation: ['order confirmation', 'order'],
  payment_success: ['payment success / thank you', 'payment success', 'thank you'],
}

const normalizeTemplateText = (value = '') =>
  String(value || '')
    .trim()
    .toLowerCase()

const resolvePresetTemplateId = (templates = [], presetKey = '') => {
  const hints = presetTemplateHints[presetKey] || []

  if (!Array.isArray(templates) || !templates.length || !hints.length) {
    return ''
  }

  const normalizedHints = hints.map(normalizeTemplateText)

  const exactMatch = templates.find((template) =>
    normalizedHints.some(
      (hint) =>
        normalizeTemplateText(template.name) === hint ||
        normalizeTemplateText(template.subject) === hint,
    ),
  )

  if (exactMatch) {
    return exactMatch._id || ''
  }

  const partialMatch = templates.find((template) => {
    const candidate = `${template.name || ''} ${template.subject || ''}`.toLowerCase()
    return normalizedHints.some((hint) => candidate.includes(hint))
  })

  return partialMatch?._id || templates[0]?._id || ''
}

const getPreviewStepLabel = (step = {}, index = 0) => {
  const labelMap = {
    delay: 'Delay',
    condition: 'Condition',
    send_email: 'Email',
    add_tag: 'Add tag',
    remove_tag: 'Remove tag',
    webhook: 'Webhook',
    exit: 'Exit',
  }

  return `${index + 1}. ${labelMap[step.type] || step.type || 'Step'}`
}

const stepTypeHelpText = {
  delay: 'Pause the automation for some time before the next step.',
  condition: 'Check whether a rule is true or false before continuing.',
  send_email: 'Send an email to the subscriber.',
  add_tag: 'Add a tag to the subscriber profile.',
  remove_tag: 'Remove a tag from the subscriber profile.',
  webhook: 'Call an external URL or system.',
  exit: 'Stop the workflow immediately.',
}

function HelpIcon({ text }) {
  const [isOpen, setIsOpen] = useState(false)
  const wrapperRef = useRef(null)

  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    const handlePointerDown = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  return (
    <span ref={wrapperRef} className="relative inline-flex">
      <button
        type="button"
        className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 bg-white text-[11px] font-bold leading-none text-slate-500 transition hover:border-slate-400 hover:text-slate-700"
        aria-label={text}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setIsOpen(false)}
        onClick={() => setIsOpen((current) => !current)}
      >
        ?
      </button>
      {isOpen ? (
        <div className="absolute left-1/2 top-7 z-20 w-72 -translate-x-1/2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs leading-6 text-slate-600 shadow-[0_16px_40px_rgba(15,23,42,0.12)]">
          {text}
        </div>
      ) : null}
    </span>
  )
}

function FieldLabel({ label, help }) {
  return (
    <div className="mb-2 flex items-center gap-2">
      <span className="text-[12px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</span>
      {help ? <HelpIcon text={help} /> : null}
    </div>
  )
}

const emptyWebsiteScope = {
  websiteId: '',
  websiteSlug: '',
  websiteName: '',
  label: '',
}

const normalizeWebsiteScope = (scope = {}) => ({
  websiteId: String(scope.websiteId || scope.website_id || '').trim(),
  websiteSlug: String(scope.websiteSlug || scope.website_slug || '').trim(),
  websiteName: String(scope.websiteName || scope.website_name || '').trim(),
  label: String(
    scope.label ||
      scope.websiteName ||
      scope.website_name ||
      scope.websiteSlug ||
      scope.website_slug ||
      scope.websiteId ||
      scope.website_id ||
      '',
  ).trim(),
})

const getWebsiteOptionScope = (website = {}) => ({
  websiteId: website.websiteId || '',
  websiteSlug: website.websiteSlug || '',
  websiteName: website.websiteName || '',
  label: website.label || website.websiteName || website.websiteSlug || website.websiteId || '',
})

const hasWebsiteScope = (scope = {}) =>
  Boolean(scope.websiteId || scope.websiteSlug || scope.websiteName)

const getWebsiteScopeKey = (scope = {}) =>
  [scope.websiteId || '', scope.websiteSlug || '', scope.websiteName || ''].join('::')

const normalizeWebsiteScopes = (scopes = []) => {
  const source = Array.isArray(scopes) ? scopes : scopes ? [scopes] : []
  const unique = new Map()

  source.forEach((item) => {
    const scope = normalizeWebsiteScope(item)
    if (!hasWebsiteScope(scope)) return
    unique.set(getWebsiteScopeKey(scope).toLowerCase(), scope)
  })

  return Array.from(unique.values())
}

const getWebsiteAudienceLabel = (scopes = []) => {
  const normalizedScopes = normalizeWebsiteScopes(scopes)

  if (!normalizedScopes.length) {
    return 'All eligible subscribers'
  }

  return normalizedScopes.map((scope) => scope.label || scope.websiteName || scope.websiteSlug || scope.websiteId).join(', ')
}

function StepEditor({ step, index, templates, onChange, onRemove }) {
  return (
    <article className="rounded-[24px] border border-slate-100 bg-slate-50 p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-500">
              Step {index + 1}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-900">Step type</span>
              <HelpIcon text={stepTypeHelpText[step.type] || 'Pick what this step should do in the workflow.'} />
            </div>
            <select
              className="field max-w-[220px]"
              value={step.type}
              onChange={(event) => onChange(index, { ...createWorkflowStep(event.target.value), type: event.target.value })}
            >
              {Object.entries(stepTypeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <FieldLabel label="Step title" help="A short name that helps you identify this step later." />
              <input
                className="field"
                placeholder="Step title"
                value={step.title}
                onChange={(event) => onChange(index, { ...step, title: event.target.value })}
              />
            </div>
            <div>
              <FieldLabel label="Short description" help="Optional note about why this step is included." />
              <input
                className="field"
                placeholder="Short description"
                value={step.description}
                onChange={(event) => onChange(index, { ...step, description: event.target.value })}
              />
            </div>
          </div>

          <div className="mt-4">
            {step.type === 'delay' ? (
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <FieldLabel label="Delay value" help="How long this step should pause before continuing." />
                  <input
                    className="field"
                    type="number"
                    min="1"
                    value={step.config?.value || ''}
                    onChange={(event) =>
                      onChange(index, {
                        ...step,
                        config: { ...step.config, value: event.target.value },
                      })
                    }
                  />
                </div>
                <div>
                  <FieldLabel label="Delay unit" help="Choose whether the delay is in minutes, hours, or days." />
                  <select
                    className="field"
                    value={step.config?.unit || 'hours'}
                    onChange={(event) =>
                      onChange(index, {
                        ...step,
                        config: { ...step.config, unit: event.target.value },
                      })
                    }
                  >
                    <option value="minutes">Minutes</option>
                    <option value="hours">Hours</option>
                    <option value="days">Days</option>
                  </select>
                </div>
              </div>
            ) : null}

            {step.type === 'condition' ? (
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <FieldLabel label="Field" help="The subscriber detail you want to check in this rule." />
                  <input
                    className="field"
                    placeholder="Field"
                    value={step.config?.field || ''}
                    onChange={(event) =>
                      onChange(index, {
                        ...step,
                        config: { ...step.config, field: event.target.value },
                      })
                    }
                  />
                </div>
                <div>
                  <FieldLabel label="Operator" help="How the field should be compared with the value." />
                  <select
                    className="field"
                    value={step.config?.operator || 'gte'}
                    onChange={(event) =>
                      onChange(index, {
                        ...step,
                        config: { ...step.config, operator: event.target.value },
                      })
                    }
                  >
                    <option value="eq">Equals</option>
                    <option value="gte">Greater than or equal</option>
                    <option value="lte">Less than or equal</option>
                    <option value="contains">Contains</option>
                  </select>
                </div>
                <div>
                  <FieldLabel label="Value" help="The value used for the comparison." />
                  <input
                    className="field"
                    placeholder="Value"
                    value={step.config?.value || ''}
                    onChange={(event) =>
                      onChange(index, {
                        ...step,
                        config: { ...step.config, value: event.target.value },
                      })
                    }
                  />
                </div>
              </div>
            ) : null}

            {step.type === 'send_email' ? (
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <FieldLabel label="Template" help="Select the email template this step will send." />
                  <select
                    className="field"
                    value={step.config?.templateId || ''}
                    onChange={(event) =>
                      onChange(index, {
                        ...step,
                        config: { ...step.config, templateId: event.target.value },
                      })
                    }
                  >
                    <option value="">Select template</option>
                    {templates.map((template) => (
                      <option key={template._id} value={template._id}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <FieldLabel label="Subject override" help="Optional custom subject line for this email." />
                  <input
                    className="field"
                    placeholder="Optional subject override"
                    value={step.config?.subjectOverride || ''}
                    onChange={(event) =>
                      onChange(index, {
                        ...step,
                        config: { ...step.config, subjectOverride: event.target.value },
                      })
                    }
                  />
                </div>
              </div>
            ) : null}

            {step.type === 'add_tag' || step.type === 'remove_tag' ? (
              <div>
                <FieldLabel label="Tag name" help="The tag that will be added to or removed from the subscriber." />
                <input
                  className="field"
                  placeholder="Tag name"
                  value={step.config?.tag || ''}
                  onChange={(event) =>
                    onChange(index, {
                      ...step,
                      config: { ...step.config, tag: event.target.value },
                    })
                  }
                />
              </div>
            ) : null}

            {step.type === 'webhook' ? (
              <div className="grid gap-4 md:grid-cols-[1fr_160px]">
                <div>
                  <FieldLabel label="Webhook URL" help="The URL that this step will call." />
                  <input
                    className="field"
                    placeholder="Webhook URL"
                    value={step.config?.url || ''}
                    onChange={(event) =>
                      onChange(index, {
                        ...step,
                        config: { ...step.config, url: event.target.value },
                      })
                    }
                  />
                </div>
                <div>
                  <FieldLabel label="Method" help="The HTTP method used to call the webhook." />
                  <select
                    className="field"
                    value={step.config?.method || 'POST'}
                    onChange={(event) =>
                      onChange(index, {
                        ...step,
                        config: { ...step.config, method: event.target.value },
                      })
                    }
                  >
                    <option value="POST">POST</option>
                    <option value="GET">GET</option>
                    <option value="PUT">PUT</option>
                  </select>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <button
          type="button"
          className="rounded-xl border border-[#ddd4f2] px-4 py-3 text-sm font-medium text-[#5f5878]"
          onClick={() => onRemove(index)}
        >
          Remove
        </button>
      </div>
    </article>
  )
}

function AutomationFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const toast = useContext(ToastContext)
  const [form, setForm] = useState(createInitialForm())
  const [meta, setMeta] = useState({ triggers: [], statuses: [], templates: [], segments: [], ecommerceHooks: null })
  const [websites, setWebsites] = useState([])
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [previewEmail, setPreviewEmail] = useState(null)
  const presetKey = searchParams.get('preset') || ''
  const selectedPreset = useMemo(
    () => dripCampaignPresets.find((preset) => preset.key === presetKey) || null,
    [presetKey],
  )
  const selectedWebsiteScopes = normalizeWebsiteScopes(form.websiteScopes?.length ? form.websiteScopes : form.websiteScope)
  const selectedWebsiteKeys = new Set(selectedWebsiteScopes.map((scope) => getWebsiteScopeKey(scope)))

  useEffect(() => {
    const loadData = async () => {
      try {
        const [metaResponse, workflowResponse, summaryResponse] = await Promise.all([
          api.get('/automations/meta'),
          id ? api.get(`/automations/${id}`) : Promise.resolve({ data: null }),
          api.get('/subscribers/summary'),
        ])

        setMeta(metaResponse.data)
        const websiteOptions = summaryResponse.data?.websites || []
        const defaultWebsiteScope = websiteOptions[0] ? getWebsiteOptionScope(websiteOptions[0]) : emptyWebsiteScope
        setWebsites(websiteOptions)

        if (workflowResponse.data) {
          const savedWebsiteScopes = normalizeWebsiteScopes(
            workflowResponse.data.websiteScopes?.length
              ? workflowResponse.data.websiteScopes
              : workflowResponse.data.websiteScope || workflowResponse.data.entrySegmentId?.websiteScope || {},
          )
          setForm({
            name: workflowResponse.data.name || '',
            description: workflowResponse.data.description || '',
            trigger: workflowResponse.data.trigger || 'welcome_signup',
            status: workflowResponse.data.status || 'draft',
            entrySegmentId: '',
            websiteScope: savedWebsiteScopes[0] || defaultWebsiteScope,
            websiteScopes: savedWebsiteScopes.length ? savedWebsiteScopes : defaultWebsiteScope ? [defaultWebsiteScope] : [],
            triggerConfig: {
              delayWindow: workflowResponse.data.triggerConfig?.delayWindow || '',
              notes: workflowResponse.data.triggerConfig?.notes || '',
            },
            steps: workflowResponse.data.steps?.length ? workflowResponse.data.steps : [createWorkflowStep('send_email')],
          })
        } else if (selectedPreset) {
          const presetTemplateId = resolvePresetTemplateId(metaResponse.data.templates, selectedPreset.key)
          const nextPreset = buildDripCampaignPreset(selectedPreset.key, presetTemplateId)

          if (nextPreset) {
            setForm({
              ...createInitialForm(),
              ...nextPreset,
              websiteScope: defaultWebsiteScope,
              websiteScopes: defaultWebsiteScope ? [defaultWebsiteScope] : [],
            })
          }
        } else {
          setForm((current) => ({
            ...current,
            websiteScope: normalizeWebsiteScopes(current.websiteScopes?.length ? current.websiteScopes : current.websiteScope)[0] || defaultWebsiteScope,
            websiteScopes: normalizeWebsiteScopes(current.websiteScopes?.length ? current.websiteScopes : current.websiteScope).length
              ? normalizeWebsiteScopes(current.websiteScopes?.length ? current.websiteScopes : current.websiteScope)
              : defaultWebsiteScope ? [defaultWebsiteScope] : [],
          }))
        }
      } catch (requestError) {
        setError(requestError.response?.data?.message || 'Unable to load workflow editor')
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [id, selectedPreset])

  const updateStep = (index, nextStep) => {
    setForm((current) => ({
      ...current,
      steps: current.steps.map((step, stepIndex) => (stepIndex === index ? nextStep : step)),
    }))
  }

  const removeStep = (index) => {
    setForm((current) => ({
      ...current,
      steps: current.steps.filter((_, stepIndex) => stepIndex !== index),
    }))
  }

  const addStep = (type) => {
    setForm((current) => ({
      ...current,
      steps: [...current.steps, createWorkflowStep(type)],
    }))
  }

  const validateForm = () => {
    if (!form.name.trim()) {
      return 'Workflow name is required'
    }

    if (!form.trigger) {
      return 'Workflow trigger is required'
    }

    if (!form.steps.length) {
      return 'Add at least one step to this workflow'
    }

    if (!normalizeWebsiteScopes(form.websiteScopes?.length ? form.websiteScopes : form.websiteScope).length) {
      return 'Select at least one website audience'
    }

    return ''
  }

  const handleSubmit = async (nextStatus = form.status, options = {}) => {
    const { redirectAfterSave = true } = options
    const validationMessage = validateForm()
    if (validationMessage) {
      setError(validationMessage)
      toast.error(validationMessage)
      return
    }

    setError('')
    setIsSubmitting(true)

    try {
      const payload = {
        ...form,
        status: nextStatus,
        isActive: nextStatus === 'active',
        entrySegmentId: null,
        websiteScopes: normalizeWebsiteScopes(form.websiteScopes || []),
        websiteScope: normalizeWebsiteScopes(form.websiteScopes || [])[0] || emptyWebsiteScope,
      }

      if (id) {
        await api.put(`/automations/${id}`, payload)
        toast.success('Workflow updated')
        if (redirectAfterSave) {
          navigate('/automations')
        }
        return { _id: id, ...payload }
      } else {
        const { data } = await api.post('/automations', payload)
        toast.success('Workflow created')
        if (redirectAfterSave) {
          navigate(`/automations/${data._id}`)
        }
        return data
      }
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to save workflow')
      toast.error(requestError.response?.data?.message || 'Unable to save workflow')
      return null
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePreviewTestRun = async ({ emails }) => {
    const validationMessage = validateForm()
    if (validationMessage) {
      setError(validationMessage)
      toast.error(validationMessage)
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
      await api.post(`/automations/${id || 'preview'}/sample-execution`, {
        workflow: {
          ...form,
          steps: form.steps,
        },
        emails: recipientEmails,
      })
      toast.success('Test email sent')
      setShowPreviewModal(false)
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || 'Unable to send test email')
    }
  }

  const handleOpenPreviewModal = async () => {
    const validationMessage = validateForm()
    if (validationMessage) {
      setError(validationMessage)
      toast.error(validationMessage)
      return
    }

    try {
      const { data } = await api.post('/automations/preview-email', {
        workflow: {
          ...form,
          steps: form.steps,
        },
      })

      setPreviewEmail(data)
      setShowPreviewModal(true)
    } catch (requestError) {
      toast.error(requestError.response?.data?.message || 'Unable to load workflow preview')
    }
  }

  if (isLoading) {
    return <LoadingState message="Loading workflow builder..." />
  }

  return (
    <div className="space-y-6">
      <section className="shell-card-strong p-6 md:p-8">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-3">
            <PageHeader
              eyebrow={selectedPreset && !id ? 'Ready-made workflow' : undefined}
              title={selectedPreset && !id ? selectedPreset.label : id ? 'Edit workflow' : 'Build a workflow'}
              description={
                selectedPreset && !id
                  ? selectedPreset.description
                  : 'Create a trigger-based workflow with delays, conditions, and email steps.'
              }
            />
            <div className="flex flex-wrap gap-2">
              {/* <span className="soft-pill">Visual step builder</span> */}
              <span className="soft-pill">{meta.ecommerceHooks?.message}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleOpenPreviewModal}
              className="rounded-xl border border-[#ddd4f2] px-4 py-3 text-sm font-medium text-[#5f5878]"
            >
              Preview &amp; test
            </button>
            <Link to="/automations" className="rounded-xl border border-[#ddd4f2] px-4 py-3 text-sm font-medium text-[#5f5878]">
              Back to automations
            </Link>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <form
          className="space-y-6"
          onSubmit={(event) => {
            event.preventDefault()
            handleSubmit(form.status)
          }}
        >
          <section className="shell-card-strong space-y-6 p-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <FieldLabel label="Workflow name" help="The name you and your team will see." />
                <input
                  className="field"
                  placeholder="Workflow name"
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                />
              </div>
              <div className="md:col-span-2">
                <FieldLabel label="Description" help="A short summary of what this workflow does." />
                <textarea
                  className="field min-h-[120px] resize-y"
                  placeholder="Describe what this workflow is meant to achieve"
                  value={form.description}
                  onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                />
              </div>
              <div>
                <FieldLabel label="Trigger" help="The event that starts this automation." />
                <select
                  className="field"
                  value={form.trigger}
                  onChange={(event) => setForm((current) => ({ ...current, trigger: event.target.value }))}
                >
                  {meta.triggers.map((trigger) => (
                    <option key={trigger} value={trigger}>
                      {triggerLabels[trigger] || trigger}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <FieldLabel label="Status" help="Draft keeps it off. Active turns it on." />
                <select
                  className="field"
                  value={form.status}
                  onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
                >
                  {meta.statuses.filter((status) => status !== 'archived').map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <FieldLabel label="Audience" help="Choose your website to enter this workflow." />
                <div className="space-y-2">
                  <details className="group relative">
                    <summary className="field flex cursor-pointer list-none items-center justify-between gap-3">
                      <span className="min-w-0 truncate">{getWebsiteAudienceLabel(selectedWebsiteScopes)}</span>
                      <span className="text-xs text-slate-400 transition group-open:rotate-180">⌄</span>
                    </summary>
                    <div className="absolute left-0 right-0 z-30 mt-2 max-h-56 space-y-2 overflow-y-auto border border-[#ddd4f2] bg-white p-3 shadow-[0_18px_40px_rgba(47,43,61,0.16)]">
                      {websites.length ? (
                        websites.map((website) => {
                          const scope = getWebsiteOptionScope(website)
                          const key = getWebsiteScopeKey(scope)
                          const checked = selectedWebsiteKeys.has(key)

                          return (
                            <label key={website.id} className="flex cursor-pointer items-center justify-between gap-3 border border-slate-100 bg-slate-50 px-3 py-2 text-sm hover:bg-white">
                              <span className="min-w-0">
                                <span className="block truncate font-semibold text-slate-900">{website.label}</span>
                                <span className="text-xs text-slate-500">{website.count || 0} subscribers</span>
                              </span>
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(event) => {
                                  setForm((current) => {
                                    const currentScopes = normalizeWebsiteScopes(current.websiteScopes?.length ? current.websiteScopes : current.websiteScope)
                                    const nextScopes = event.target.checked
                                      ? normalizeWebsiteScopes([...currentScopes, scope])
                                      : currentScopes.filter((item) => getWebsiteScopeKey(item) !== key)

                                    return {
                                      ...current,
                                      websiteScope: nextScopes[0] || emptyWebsiteScope,
                                      websiteScopes: nextScopes,
                                      entrySegmentId: '',
                                    }
                                  })
                                }}
                              />
                            </label>
                          )
                        })
                      ) : (
                        <p className="px-3 py-2 text-sm text-slate-500">No websites found</p>
                      )}
                    </div>
                  </details>
                </div>
              </div>
              <div>
                <FieldLabel label="Delay window hint" help="A small note about timing, if needed." />
                <input
                  className="field"
                  placeholder="Optional delay window hint"
                  value={form.triggerConfig.delayWindow}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      triggerConfig: { ...current.triggerConfig, delayWindow: event.target.value },
                    }))
                  }
                />
              </div>
              <div className="md:col-span-2">
                <FieldLabel label="Internal workflow notes" help="Private notes for your team only." />
                <input
                  className="field"
                  placeholder="Internal workflow notes"
                  value={form.triggerConfig.notes}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      triggerConfig: { ...current.triggerConfig, notes: event.target.value },
                    }))
                  }
                />
              </div>
            </div>
          </section>

          <section className="shell-card-strong space-y-5 p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">Workflow steps</p>
                {/* <h3 className="mt-1 text-xl font-semibold text-slate-950">Sequence builder</h3> */}
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                  These steps define what happens after the trigger starts the workflow. Use them to wait, check rules,
                  send emails, add tags, or call a webhook.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.keys(stepTypeLabels).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => addStep(type)}
                    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600"
                  >
                    Add {stepTypeLabels[type]}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              {form.steps.map((step, index) => (
                <StepEditor
                  key={`${step.type}-${index}`}
                  step={step}
                  index={index}
                  templates={meta.templates}
                  onChange={updateStep}
                  onRemove={removeStep}
                />
              ))}
            </div>

            {error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="rounded-xl border border-[#ddd4f2] px-4 py-3 text-sm font-semibold text-[#5f5878]"
                disabled={isSubmitting}
                onClick={() => handleSubmit('draft')}
              >
                {isSubmitting ? 'Saving...' : 'Save as draft'}
              </button>
              <button type="submit" className="primary-button" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : id ? 'Update workflow' : 'Create workflow'}
              </button>
            </div>
          </section>
        </form>

        <div className="space-y-6">
          <section className="shell-card-strong p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-[#2f2b3d]">
                  {selectedPreset && !id ? 'Ready-made preview' : 'Workflow preview'}
                </h3>
                <p className="mt-2 text-sm text-[#6e6787]">
                  {selectedPreset && !id
                    ? 'This is the preset version the user will start from.'
                    : 'This reflects the current custom workflow draft.'}
                </p>
              </div>
              <span className="rounded-full border border-[#ddd4f2] bg-white px-3 py-1 text-xs font-semibold text-[#5f5878]">
                {form.steps.length} steps
              </span>
            </div>

            <div className="mt-5 rounded-2xl border border-[#ebe6fb] bg-[#faf8ff] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8a7fb3]">
                Name
              </p>
              <p className="mt-1 text-[15px] font-semibold text-[#1f1d2b]">
                {form.name || 'Untitled workflow'}
              </p>
              <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8a7fb3]">
                Trigger
              </p>
              <p className="mt-1 text-sm text-[#1f1d2b]">
                {triggerLabels[form.trigger] || form.trigger}
              </p>
              <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8a7fb3]">
                Description
              </p>
              <p className="mt-1 text-sm leading-6 text-[#5f5878]">
                {form.description || 'No description added yet.'}
              </p>
            </div>

            <div className="mt-5 space-y-3">
              {form.steps.map((step, index) => (
                <div
                  key={`${step.type}-${index}`}
                  className="rounded-2xl border border-[#ebe6fb] bg-white px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-[#1f1d2b]">
                      {getPreviewStepLabel(step, index)}
                    </p>
                    <span className="rounded-full bg-[#f3efff] px-3 py-1 text-xs font-medium text-[#6b5fb5]">
                      {stepTypeLabels[step.type] || step.type}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-[#6e6787]">
                    {step.title || 'Untitled step'}
                  </p>
                  {step.description ? (
                    <p className="mt-1 text-xs leading-5 text-[#8b84a8]">{step.description}</p>
                  ) : null}
                </div>
              ))}
            </div>
          </section>

          <section className="shell-card-strong p-6">
            <h3 className="text-xl font-semibold text-[#2f2b3d]">Preview note</h3>
            <div className="mt-4 rounded-2xl bg-[#faf7ff] p-4 text-sm text-[#6e6787]">
              <p>
                The preview updates as you edit the workflow, so ready-made and custom flows both stay easy to verify before saving.
              </p>
            </div>
          </section>
        </div>
      </div>

      <AutomationPreviewTestModal
        open={showPreviewModal}
        workflow={{
          ...form,
          steps: form.steps,
        }}
        previewEmail={previewEmail}
        onClose={() => {
          setShowPreviewModal(false)
          setPreviewEmail(null)
        }}
        onRunSample={handlePreviewTestRun}
      />
    </div>
  )
}

export default AutomationFormPage
