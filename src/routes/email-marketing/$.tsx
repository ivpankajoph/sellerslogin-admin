import { createFileRoute } from '@tanstack/react-router'
import EmailMarketingFeature from '@/features/email-marketing'

export const Route = createFileRoute('/email-marketing/$')({
  component: EmailMarketingFeature,
})
