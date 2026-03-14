import { useNavigate, useSearch } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useDispatch } from 'react-redux'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { AuthLayout } from '../auth-layout'
import { UserAuthForm } from './components/user-auth-form'
import type { AppDispatch } from '@/store'
import { setAuthSession } from '@/store/slices/authSlice'

const AUTO_LOGIN_CACHE_KEY = 'seller_autologin_cache_v1'

const decodeBase64Json = (value?: string) => {
  if (!value) return null
  try {
    const binary = window.atob(value)
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
    const decoded = new TextDecoder().decode(bytes)
    return JSON.parse(decoded)
  } catch {
    return null
  }
}

const normalizeAutoLoginUser = (value: unknown) => {
  const safeUser = value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
  const normalizedRole = String(safeUser.role ?? 'vendor').trim().toLowerCase()
  return {
    ...safeUser,
    role: normalizedRole || 'vendor',
  }
}

export function SignIn() {
  const { redirect, autologin, authtoken, authuser } = useSearch({ from: '/(auth)/sign-in' })
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()

  useEffect(() => {
    const shouldAutoLogin = String(autologin || '').toLowerCase() === '1'
    if (!shouldAutoLogin || !authtoken) return

    const parsedUser = normalizeAutoLoginUser(decodeBase64Json(authuser))
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(
        AUTO_LOGIN_CACHE_KEY,
        JSON.stringify({
          token: authtoken,
          user: parsedUser,
          redirectTo: redirect || '/',
        })
      )
    }
    dispatch(setAuthSession({ token: authtoken, user: parsedUser }))
    navigate({ to: redirect || '/', replace: true })
  }, [authtoken, autologin, authuser, dispatch, navigate, redirect])

  useEffect(() => {
    const shouldAutoLogin = String(autologin || '').toLowerCase() === '1'
    if (shouldAutoLogin) return
    if (typeof window === 'undefined') return

    const cached = window.sessionStorage.getItem(AUTO_LOGIN_CACHE_KEY)
    if (!cached) return

    try {
      const parsed = JSON.parse(cached) as {
        token?: string
        user?: unknown
        redirectTo?: string
      }
      if (!parsed?.token) {
        window.sessionStorage.removeItem(AUTO_LOGIN_CACHE_KEY)
        return
      }

      dispatch(
        setAuthSession({
          token: parsed.token,
          user: normalizeAutoLoginUser(parsed.user),
        })
      )
      window.sessionStorage.removeItem(AUTO_LOGIN_CACHE_KEY)
      navigate({ to: parsed.redirectTo || redirect || '/', replace: true })
    } catch {
      window.sessionStorage.removeItem(AUTO_LOGIN_CACHE_KEY)
    }
  }, [autologin, dispatch, navigate, redirect])

  return (
    <AuthLayout>
      <Card className='gap-4'>
        <CardHeader>
          <CardTitle className='text-lg tracking-tight'>Sign in</CardTitle>
          <CardDescription>
            Enter your email and password below to <br />
            log into your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UserAuthForm redirectTo={redirect} />
        </CardContent>
        <CardFooter>
          <p className='text-muted-foreground px-8 text-center text-sm'>
            By clicking sign in, you agree to our{' '}
            <a
              href='/terms'
              className='hover:text-primary underline underline-offset-4'
            >
              Terms of Service
            </a>{' '}
            and{' '}
            <a
              href='/privacy'
              className='hover:text-primary underline underline-offset-4'
            >
              Privacy Policy
            </a>
            .
          </p>
        </CardFooter>
      </Card>
    </AuthLayout>
  )
}
