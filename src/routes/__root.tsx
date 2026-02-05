import { type QueryClient } from '@tanstack/react-query'
import {
  createRootRouteWithContext,
  Outlet,
  useRouterState,
} from '@tanstack/react-router'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Toaster } from '@/components/ui/sonner'
import { useSelector } from 'react-redux'
import { useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { NavigationProgress } from '@/components/navigation-progress'

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient
}>()({
  component: () => {
    const navigate = useNavigate()
    const token = useSelector((state: any) => state.auth.token)
    const routerState = useRouterState()

    useEffect(() => {
      const currentPath = routerState.location.pathname
      if (!token && currentPath !== '/sign-in') {
        navigate({ to: '/sign-in' })
      }
    }, [token, routerState.location.pathname])

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
