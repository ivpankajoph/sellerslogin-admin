/* eslint-disable react-refresh/only-export-components */
import { createContext, useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { canAccess } from '../data/permissions.js'
import { api, setAuthToken } from '../lib/api.js'

export const AuthContext = createContext(null)

const parseJsonSafely = (value) => {
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

const readPersistedSellersLoginSession = () => {
  if (typeof window === 'undefined') {
    return { token: null, user: null }
  }

  const rawRoot = window.localStorage.getItem('persist:root')
  const persistedRoot = rawRoot ? parseJsonSafely(rawRoot) : null
  const authState = persistedRoot?.auth
    ? parseJsonSafely(persistedRoot.auth)
    : null

  return {
    token: authState?.token || window.localStorage.getItem('token') || null,
    user: authState?.user || null,
  }
}

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [authError, setAuthError] = useState('')
  const sellersLoginToken = useSelector((state) => state.auth?.token)
  const sellersLoginUser = useSelector((state) => state.auth?.user)

  useEffect(() => {
    const bootstrapAuth = async () => {
      setIsLoading(true)
      setAuthError('')
      try {
        const persistedSession = readPersistedSellersLoginSession()
        const activeSellersLoginToken = sellersLoginToken || persistedSession.token
        const activeSellersLoginUser = sellersLoginUser || persistedSession.user

        if (activeSellersLoginToken) {
          setAuthToken(null)
          const { data } = await api.post(
            '/auth/sellerslogin-sso',
            {
              name: activeSellersLoginUser?.name || activeSellersLoginUser?.vendor_name || '',
              email: activeSellersLoginUser?.email || '',
            },
            {
              headers: {
                Authorization: `Bearer ${activeSellersLoginToken}`,
              },
            },
          )
          setAuthToken(data.token)
          setAdmin(data.user || data.admin)
          return
        }

        const { data } = await api.get('/auth/me')
        setAdmin(data.user || data.admin)
      } catch (error) {
        setAuthToken(null)
        setAdmin(null)
        const status = error?.response?.status
        const message = error?.response?.data?.message || error?.message || ''
        if (status === 404) {
          setAuthError('Email Marketing SSO route is not active. Restart the Ophmate backend server once.')
        } else if (status === 401 || status === 403) {
          setAuthError(message || 'Your SellersLogin session could not be verified. Please refresh the dashboard.')
        } else if (message) {
          setAuthError(message)
        }
      } finally {
        setIsLoading(false)
      }
    }

    bootstrapAuth()
  }, [sellersLoginToken, sellersLoginUser?.email, sellersLoginUser?.name, sellersLoginUser?.vendor_name])

  const login = async (credentials) => {
    const { data } = await api.post('/auth/login', credentials)
    setAuthToken(data.token)
    setAdmin(data.user || data.admin)
    return data.user || data.admin
  }

  const logout = async () => {
    try {
      await api.post('/auth/logout')
    } finally {
      setAuthToken(null)
      setAdmin(null)
    }
  }

  return (
    <AuthContext.Provider value={{ admin, user: admin, isLoading, authError, login, logout, can: (permission) => canAccess(admin, permission) }}>
      {children}
    </AuthContext.Provider>
  )
}
