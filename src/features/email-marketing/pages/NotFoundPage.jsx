import { Link } from 'react-router-dom'

function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="shell-card w-full max-w-lg p-8 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-400">404</p>
        <h1 className="mt-3 text-4xl font-semibold text-slate-900">Page not found</h1>
        <p className="mt-3 text-sm text-slate-500">
          The route does not exist in this standalone dashboard module.
        </p>
        <Link to="/overview" className="primary-button mt-6">
          Back to dashboard
        </Link>
      </div>
    </div>
  )
}

export default NotFoundPage
