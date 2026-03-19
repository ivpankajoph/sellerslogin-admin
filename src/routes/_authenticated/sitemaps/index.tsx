import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'

export const Route = createFileRoute('/_authenticated/sitemaps/')({
  component: RouteComponent,
})

function RouteComponent() {
  const navigate = useNavigate()

  useEffect(() => {
    navigate({ to: '/seo/sitemaps' })
  }, [navigate])

  return null
}
