import { createFileRoute, Outlet } from '@tanstack/react-router'

function MetaPixelRouteLayout() {
  return <Outlet />
}

export const Route = createFileRoute('/_authenticated/meta-pixel')({
  component: MetaPixelRouteLayout,
})
