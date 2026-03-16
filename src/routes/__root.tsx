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
import Swal from 'sweetalert2'

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient
}>()({
  component: () => {
    const navigate = useNavigate()
    const token = useSelector((state: any) => state.auth.token)
    const role = useSelector((state: any) => state.auth?.user?.role)
    const authUser = useSelector((state: any) => state.auth?.user)
    const routerState = useRouterState()
    const validatedSessionKeyRef = useRef<string>('')
    const reminderPopupKeyRef = useRef<string>('')

    useEffect(() => {
      const currentPath = routerState.location.pathname
      const publicPaths = new Set([
        '/sign-in',
        '/forgot-password',
        '/reset-password',
        '/sign-up',
      ])
      if (!token && !publicPaths.has(currentPath)) {
        navigate({ to: '/sign-in' })
      }
    }, [navigate, routerState.location.pathname, token])

    useEffect(() => {
      const currentPath = routerState.location.pathname
      const mustChangePassword =
        Boolean(token) &&
        String(authUser?.role || '').toLowerCase() === 'vendor' &&
        Boolean(authUser?.must_change_password)

      if (!mustChangePassword) return
      if (currentPath !== '/profile') {
        navigate({ to: '/profile' })
      }
    }, [
      authUser?.must_change_password,
      authUser?.role,
      navigate,
      routerState.location.pathname,
      token,
    ])

    useEffect(() => {
      const mustChangePassword =
        Boolean(token) &&
        String(authUser?.role || '').toLowerCase() === 'vendor' &&
        Boolean(authUser?.must_change_password)

      if (!mustChangePassword) {
        reminderPopupKeyRef.current = ''
        return
      }

      const issuedAtRaw = authUser?.temp_password_issued_at
      if (!issuedAtRaw) return
      const issuedAt = new Date(issuedAtRaw).getTime()
      if (!Number.isFinite(issuedAt)) return

      const elapsedHours = Math.floor((Date.now() - issuedAt) / (60 * 60 * 1000))
      if (elapsedHours < 24) return

      const dayBucket = Math.floor(elapsedHours / 24)
      const reminderKey = `${authUser?.id || 'vendor'}:${dayBucket}`
      if (reminderPopupKeyRef.current === reminderKey) return
      reminderPopupKeyRef.current = reminderKey

      const expiresAtRaw = authUser?.temp_password_expires_at
      const expiresAt = expiresAtRaw ? new Date(expiresAtRaw).getTime() : Number.NaN
      const hoursLeft =
        Number.isFinite(expiresAt)
          ? Math.max(0, Math.ceil((expiresAt - Date.now()) / (60 * 60 * 1000)))
          : null

      void Swal.fire({
        icon: 'warning',
        title: 'Password Change Reminder',
        html: `
          <p>Your account is still using a temporary password.</p>
          <p>Please change it now from <strong>Profile &gt; Change Password</strong>.</p>
          ${
            typeof hoursLeft === 'number'
              ? `<p><strong>${hoursLeft} hour(s)</strong> left before account deletion.</p>`
              : '<p>Your account will be deleted if you do not change it in time.</p>'
          }
        `,
        confirmButtonText: 'Change Password',
      })
    }, [
      authUser?.id,
      authUser?.must_change_password,
      authUser?.role,
      authUser?.temp_password_expires_at,
      authUser?.temp_password_issued_at,
      routerState.location.pathname,
      token,
    ])

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
