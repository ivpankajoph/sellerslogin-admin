// src/hooks/useCan.ts
import { useSelector } from 'react-redux'

export function useCan(allowedRoles: string[]) {
  const role = useSelector((state: any) => state.auth.user?.role)

  return allowedRoles.includes(role)
}


