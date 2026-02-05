import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { PreviewChrome } from '@/features/template-preview/components/PreviewChrome'
import { useTemplatePreviewData } from '@/features/template-preview/hooks/useTemplatePreviewData'
import {
  setTemplateAuth,
  templateApiFetch,
} from '@/features/template-preview/utils/templateAuth'

export const Route = createFileRoute('/template/$vendorId/login')({
  component: TemplateLogin,
})

function TemplateLogin() {
  const { vendorId } = Route.useParams()
  const { template, vendorName, subcategories, categoryMap } = useTemplatePreviewData(
    vendorId,
    'home'
  )
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await templateApiFetch(vendorId, '/login', {
        method: 'POST',
        body: JSON.stringify({
          vendor_id: vendorId,
          identifier,
          password,
        }),
      })
      setTemplateAuth(vendorId, { token: data.token, user: data.user })
      window.location.href = `/template/${vendorId}`
    } catch (err: any) {
      setError(err?.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <PreviewChrome
      vendorId={vendorId}
      logoUrl={template.components.logo}
      vendorName={vendorName || undefined}
      buttonLabel={template.components.home_page?.button_header}
      buttonColor={template.components.home_page?.hero_style?.primaryButtonColor}
      theme={template.components.theme}
      customPages={template.components.custom_pages || []}
      categories={Object.entries(categoryMap).map(([id, name]) => ({
        _id: id,
        name,
      }))}
      subcategories={subcategories}
      active='home'
    >
      <div className='mx-auto w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm'>
        <h1 className='text-3xl font-semibold text-slate-900'>Sign in</h1>
        <p className='mt-2 text-sm text-slate-500'>
          Login to continue checkout in this store.
        </p>

        {error && (
          <div className='mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600'>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className='mt-6 space-y-4'>
          <div>
            <label className='text-sm font-medium text-slate-700'>
              Email or phone
            </label>
            <input
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              className='mt-2 w-full rounded-lg border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900'
              placeholder='Enter email or phone'
              required
            />
          </div>
          <div>
            <label className='text-sm font-medium text-slate-700'>
              Password
            </label>
            <input
              type='password'
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className='mt-2 w-full rounded-lg border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900'
              placeholder='Enter password'
              required
            />
          </div>

          <button
            type='submit'
            disabled={loading}
            className='w-full rounded-lg bg-slate-900 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60'
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className='mt-6 text-center text-sm text-slate-500'>
          New here?{' '}
          <a
            href={`/template/${vendorId}/register`}
            className='font-semibold text-slate-900 hover:underline'
          >
            Create an account
          </a>
        </p>
      </div>
    </PreviewChrome>
  )
}
