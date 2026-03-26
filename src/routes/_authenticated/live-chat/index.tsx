import { createFileRoute } from '@tanstack/react-router'
import { LiveChatPage } from '@/features/live-chat'

export const Route = createFileRoute('/_authenticated/live-chat/')({
  component: LiveChatPage,
})
