import axios from 'axios'

const isBrowser = typeof window !== 'undefined'
const currentHostname = isBrowser ? window.location.hostname : ''
const isLocalHost =
  currentHostname === 'localhost' ||
  currentHostname === '127.0.0.1' ||
  currentHostname === '::1'

const getStoredToken = () => {
  if (!isBrowser) {
    return null
  }

  return localStorage.getItem('admin_token')
}

const resolveApiBaseUrl = () => {
  const envBaseUrl =
    import.meta.env.VITE_E_MARKETING_API_URL?.trim()
  const publicApiUrl = import.meta.env.VITE_PUBLIC_API_URL?.trim()

  if (isLocalHost) {
    return envBaseUrl || `${publicApiUrl || 'http://localhost:8081/api'}/v1/e-marketing`
  }

  if (envBaseUrl) {
    return envBaseUrl
  }

  if (publicApiUrl) {
    return `${publicApiUrl.replace(/\/+$/, '')}/v1/e-marketing`
  }

  if (isBrowser) {
    return `${window.location.origin}/api/v1/e-marketing`
  }

  return 'http://localhost:8081/api/v1/e-marketing'
}

export const api = axios.create({
  baseURL: resolveApiBaseUrl(),
  withCredentials: true,
})

api.interceptors.request.use((config) => {
  const token = getStoredToken()

  if (token) {
    config.headers = config.headers || {}
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

export const setAuthToken = (nextToken) => {
  if (nextToken) {
    localStorage.setItem('admin_token', nextToken)
    api.defaults.headers.Authorization = `Bearer ${nextToken}`
    return
  }

  localStorage.removeItem('admin_token')
  delete api.defaults.headers.Authorization
}

const initialToken = getStoredToken()

if (initialToken) {
  api.defaults.headers.Authorization = `Bearer ${initialToken}`
}
