import { useContext, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import LoadingState from '../../components/ui/LoadingState.jsx'
import PageHeader from '../../components/ui/PageHeader.jsx'
import { ToastContext } from '../../context/ToastContext.jsx'
import { subscriberSources, subscriberStatuses } from '../../data/audience.js'
import { api } from '../../lib/api.js'
import { toDateTimeLocalInput } from '../../lib/datetime.js'

const createInitialForm = () => ({
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  status: 'subscribed',
  source: 'manual',
  tags: '',
  city: '',
  state: '',
  country: '',
  totalOrders: 0,
  totalSpent: 0,
  lastOrderDate: '',
  lastEmailSentAt: '',
  lastOpenAt: '',
  lastClickAt: '',
  notes: '',
  customFields: '{}',
})

const formatOptionLabel = (value) =>
  value
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase())

const FormField = ({ label, hint, className = '', children }) => (
  <label className={`block space-y-2 ${className}`}>
    <span className="text-sm font-semibold text-[#2f2b3d]">{label}</span>
    {hint ? <span className="block text-xs text-[#8a93a6]">{hint}</span> : null}
    {children}
  </label>
)

function SubscriberFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useContext(ToastContext)
  const [form, setForm] = useState(createInitialForm())
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(Boolean(id))

  useEffect(() => {
    if (!id) {
      return
    }

    const loadSubscriber = async () => {
      try {
        const { data } = await api.get(`/subscribers/${id}`)
        setForm({
          ...data,
          tags: (data.tags || []).join(', '),
          lastOrderDate: toDateTimeLocalInput(data.lastOrderDate),
          lastEmailSentAt: toDateTimeLocalInput(data.lastEmailSentAt),
          lastOpenAt: toDateTimeLocalInput(data.lastOpenAt),
          lastClickAt: toDateTimeLocalInput(data.lastClickAt),
          notes: data.notes || '',
          customFields: JSON.stringify(data.customFields || {}, null, 2),
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadSubscriber()
  }, [id])

  const handleChange = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim()) {
      setError('First name, last name, and email are required')
      return
    }

    try {
      JSON.parse(form.customFields || '{}')
    } catch {
      setError('Custom fields must be valid JSON')
      return
    }

    setIsSubmitting(true)

    try {
      const payload = {
        ...form,
        tags: form.tags,
        customFields: form.customFields,
      }

      if (id) {
        await api.put(`/subscribers/${id}`, payload)
        toast.success('Subscriber updated')
      } else {
        await api.post('/subscribers', payload)
        toast.success('Subscriber created')
      }

      navigate('/audience')
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to save subscriber')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return <LoadingState message="Loading subscriber..." />
  }

  return (
    <div className="space-y-6">
      <section className="shell-card-strong p-6 md:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <PageHeader
            eyebrow="Audience"
            title={id ? 'Edit subscriber' : 'Add subscriber'}
            description="Store CRM-ready subscriber records with lifecycle, value, engagement, and custom profile context."
          />
          <Link to="/audience" className="rounded-xl border border-[#ddd4f2] px-4 py-3 text-sm font-medium text-[#5f5878]">
            Back to audience
          </Link>
        </div>
      </section>

      <form className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]" onSubmit={handleSubmit}>
        <section className="shell-card-strong space-y-6 p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="First name">
              <input className="field" value={form.firstName} onChange={(event) => handleChange('firstName', event.target.value)} />
            </FormField>
            <FormField label="Last name">
              <input className="field" value={form.lastName} onChange={(event) => handleChange('lastName', event.target.value)} />
            </FormField>
            <FormField label="Email">
              <input className="field" type="email" value={form.email} onChange={(event) => handleChange('email', event.target.value)} />
            </FormField>
            <FormField label="Phone">
              <input className="field" value={form.phone} onChange={(event) => handleChange('phone', event.target.value)} />
            </FormField>
            <FormField label="Status">
              <select className="field" value={form.status} onChange={(event) => handleChange('status', event.target.value)}>
                {subscriberStatuses.map((status) => (
                  <option key={status} value={status}>
                    {formatOptionLabel(status)}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Source">
              <select className="field" value={form.source} onChange={(event) => handleChange('source', event.target.value)}>
                {subscriberSources.map((source) => (
                  <option key={source} value={source}>
                    {formatOptionLabel(source)}
                  </option>
                ))}
              </select>
            </FormField>
            {/* <FormField label="Tags" hint="Comma-separated values used for filtering and segmentation." className="md:col-span-2">
              <input className="field" placeholder="VIP, newsletter, repeat-buyer" value={form.tags} onChange={(event) => handleChange('tags', event.target.value)} /> 
            </FormField> */}
            <FormField label="City">
              <input className="field" value={form.city} onChange={(event) => handleChange('city', event.target.value)} />
            </FormField>
            <FormField label="State">
              <input className="field" value={form.state} onChange={(event) => handleChange('state', event.target.value)} />
            </FormField>
            <FormField label="Country">
              <input className="field" value={form.country} onChange={(event) => handleChange('country', event.target.value)} />
            </FormField>
            <FormField label="Total orders">
              <input className="field" type="number" min="0" value={form.totalOrders} onChange={(event) => handleChange('totalOrders', event.target.value)} />
            </FormField>
            <FormField label="Total spent">
              <input className="field" type="number" min="0" step="0.01" value={form.totalSpent} onChange={(event) => handleChange('totalSpent', event.target.value)} />
            </FormField>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8a93a6]">Engagement timeline</p>
              <p className="mt-1 text-sm text-[#5f5878]">
                These timestamps help the dashboard calculate activity and segment subscribers by recent behavior.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="Last order date" >
                <input className="field" type="datetime-local" value={form.lastOrderDate} onChange={(event) => handleChange('lastOrderDate', event.target.value)} />
              </FormField>
              <FormField label="Last email sent" >
                <input className="field" type="datetime-local" value={form.lastEmailSentAt} onChange={(event) => handleChange('lastEmailSentAt', event.target.value)} />
              </FormField>
              <FormField label="Last open" >
                <input className="field" type="datetime-local" value={form.lastOpenAt} onChange={(event) => handleChange('lastOpenAt', event.target.value)} />
              </FormField>
              <FormField label="Last click" >
                <input className="field" type="datetime-local" value={form.lastClickAt} onChange={(event) => handleChange('lastClickAt', event.target.value)} />
              </FormField>
            </div>
          </div>

          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          ) : null}

          <div className="flex justify-end">
            <button type="submit" className="primary-button" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : id ? 'Update subscriber' : 'Create subscriber'}
            </button>
          </div>
        </section>

        <section className="space-y-6">
          <article className="shell-card-strong p-6">
            <FormField label="Notes" hint="Internal CRM notes visible only to your team.">
              <textarea className="field min-h-[160px] resize-y" placeholder="Add internal context, preferences, or follow-up notes" value={form.notes} onChange={(event) => handleChange('notes', event.target.value)} />
            </FormField>
          </article>

          <article className="shell-card-strong p-6">
            <FormField label="Custom fields" hint="Valid JSON for any extra subscriber data your team wants to store.">
              <textarea className="field min-h-[220px] resize-y font-mono text-xs" placeholder='{"favoriteCategory":"Skincare"}' value={form.customFields} onChange={(event) => handleChange('customFields', event.target.value)} />
            </FormField>
          </article>
        </section>
      </form>
    </div>
  )
}

export default SubscriberFormPage
