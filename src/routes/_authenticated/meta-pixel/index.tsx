import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'

export const Route = createFileRoute('/_authenticated/meta-pixel/')({
  component: MetaPixelRedirect,
})

function MetaPixelRedirect() {
  const navigate = useNavigate()

  useEffect(() => {
    navigate({ to: '/meta-pixel/connect' })
  }, [navigate])

  return null
}
