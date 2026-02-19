import { type QueryClient } from '@tanstack/react-query'
import {
  createRootRouteWithContext,
  Outlet,
  useRouterState,
} from '@tanstack/react-router'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Toaster } from '@/components/ui/sonner'
import { useSelector } from 'react-redux'
import { useEffect, useRef } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { NavigationProgress } from '@/components/navigation-progress'
import api from '@/lib/axios'

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient
}>()({
  component: () => {
    const navigate = useNavigate()
    const token = useSelector((state: any) => state.auth.token)
    const role = useSelector((state: any) => state.auth?.user?.role)
    const routerState = useRouterState()
    const validatedSessionKeyRef = useRef<string>('')

    useEffect(() => {
      const currentPath = routerState.location.pathname
      if (!token && currentPath !== '/sign-in') {
        navigate({ to: '/sign-in' })
      }
    }, [navigate, routerState.location.pathname, token])

    useEffect(() => {
      if (!token || !role) {
        validatedSessionKeyRef.current = ''
        return
      }

      const sessionKey = `${role}:${token}`
      if (validatedSessionKeyRef.current === sessionKey) return
      validatedSessionKeyRef.current = sessionKey

      let isCancelled = false

      const validateSession = async () => {
        try {
          await api.get('/profile')
        } catch {
          if (isCancelled) return
          // Interceptor handles logout + redirect for invalid/deleted accounts.
        }
      }

      void validateSession()

      return () => {
        isCancelled = true
      }
    }, [role, token])

    return (
      <>
        <NavigationProgress />
        <Outlet />
        <Toaster />
    
        <ReactQueryDevtools />
      </>
    )
  },
})
