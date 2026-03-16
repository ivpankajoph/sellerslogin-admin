import { useEffect } from 'react'
import { createFileRoute } from '@tanstack/react-router'

const VENDOR_REGISTRATION_URL =
  import.meta.env.VITE_VENDOR_REGISTRATION_URL ||
  'http://localhost:3000/vendor/registration'

export const Route = createFileRoute('/clerk/(auth)/sign-up')({
  component: SignUpRedirect,
})

function SignUpRedirect() {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.location.replace(VENDOR_REGISTRATION_URL)
    }
  }, [])

  return (
    <div className='flex min-h-screen items-center justify-center text-sm text-muted-foreground'>
      Redirecting to vendor registration...
    </div>
  )
}
