import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useEffect } from "react"

function VendorAnalyticsRedirect() {
  const navigate = useNavigate()

  useEffect(() => {
    navigate({ to: "/analytics" })
  }, [navigate])

  return null
}

export const Route = createFileRoute("/_authenticated/vendor-analytics/")({
  component: VendorAnalyticsRedirect,
})
