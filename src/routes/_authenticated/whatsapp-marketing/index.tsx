import WhatsAppMarketingPage from '@/features/whatsapp-marketing'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/whatsapp-marketing/' as any)({
  component: WhatsAppMarketingPage,
})
