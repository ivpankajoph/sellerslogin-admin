import { useContext } from 'react'
import { AuthContext } from '../../context/AuthContext.jsx'

function ProtectedRoute({ children }) {
  const { admin, authError, isLoading } = useContext(AuthContext)

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="shell-card-strong w-full max-w-md p-8 text-center">
          <div className="loading-skeleton mx-auto h-12 w-12 rounded-2xl" />
          <p className="mt-5 text-sm font-medium text-ui-body">Checking session and role access...</p>
        </div>
      </div>
    )
  }

  if (!admin) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="shell-card-strong w-full max-w-md p-8 text-center">
          <p className="text-sm font-medium text-ui-body">
            {authError || 'Please sign in to SellersLogin first, then open Email Marketing again.'}
          </p>
        </div>
      </div>
    )
  }

  return children
}

export default ProtectedRoute
