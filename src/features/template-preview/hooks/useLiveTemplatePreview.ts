import { useEffect, useState } from 'react'
import { type TemplateData } from '@/features/vendor-template/data'

type PreviewPage = 'home' | 'about' | 'contact' | 'full'

interface LivePreviewMessage {
  type: 'template-preview-update'
  vendorId: string
  page?: PreviewPage
  payload?: TemplateData
  sectionOrder?: string[]
}

export function useLiveTemplatePreview(
  vendorId: string,
  page: PreviewPage,
  initialTemplate: TemplateData,
  initialOrder: string[]
) {
  const [template, setTemplate] = useState<TemplateData>(initialTemplate)
  const [sectionOrder, setSectionOrder] = useState<string[]>(initialOrder)

  useEffect(() => {
    setTemplate(initialTemplate)
  }, [initialTemplate])

  useEffect(() => {
    setSectionOrder(initialOrder)
  }, [initialOrder])

  useEffect(() => {
    const handler = (event: MessageEvent<LivePreviewMessage>) => {
      if (event.origin !== window.location.origin) return
      const data = event.data
      if (!data || data.type !== 'template-preview-update') return
      if (data.vendorId !== vendorId) return

      if (data.page && data.page !== 'full' && data.page !== page) return

      if (data.payload) {
        setTemplate(data.payload)
      }
      if (data.sectionOrder) {
        setSectionOrder(data.sectionOrder)
      }
    }

    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [vendorId, page])

  return { template, sectionOrder }
}
