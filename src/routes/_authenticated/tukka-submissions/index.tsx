import { createFileRoute } from '@tanstack/react-router'
import TukkaSubmissions from '@/features/tukka-submissions'

export const Route = createFileRoute('/_authenticated/tukka-submissions/')({
  component: TukkaSubmissions,
})
