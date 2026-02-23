import SpecificationKeysPage from '@/features/specification-keys'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/specification-keys/')({
  component: SpecificationKeysPage,
})
