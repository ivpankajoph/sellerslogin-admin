import { useContext } from 'react'
import { AuthContext } from '../../context/AuthContext.jsx'
import { canAccess } from '../../data/permissions.js'
import EmptyState from '../ui/EmptyState.jsx'

function PermissionGate({ permission, children, fallback }) {
  const { admin } = useContext(AuthContext)

  if (canAccess(admin, permission)) {
    return children
  }

  return (
    fallback || (
      <div className="p-6">
        <EmptyState
          title="Restricted area"
          description="Your current role does not have access to this section."
        />
      </div>
    )
  )
}

export default PermissionGate
