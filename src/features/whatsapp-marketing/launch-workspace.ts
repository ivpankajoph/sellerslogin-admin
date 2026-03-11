import api from '@/lib/axios'

export async function launchWhatsAppMarketingWorkspace() {
  const marketingWindow = window.open('', '_blank')

  if (!marketingWindow) {
    throw new Error('Popup blocked. Allow popups for this site and try again.')
  }

  marketingWindow.document.title = 'Opening WhatsApp Marketing...'
  marketingWindow.focus()

  try {
    const response = await api.get('/marketing/launch')
    const launchUrl = String(response?.data?.launchUrl || '').trim()

    if (!launchUrl) {
      throw new Error('Launch URL not returned by the server')
    }

    marketingWindow.opener = null
    marketingWindow.location.replace(launchUrl)
    marketingWindow.focus()
  } catch (error) {
    marketingWindow.close()
    throw error
  }
}
