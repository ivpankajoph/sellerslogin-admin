import { useMemo, useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowRight, CheckCircle2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'

const formSchema = z
  .object({
    password: z
      .string()
      .min(7, { message: 'Password must be at least 7 characters' }),
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type ResetPasswordFormProps = React.HTMLAttributes<HTMLFormElement> & {
  email?: string
  token?: string
}

export function ResetPasswordForm({
  className,
  email,
  token,
  ...props
}: ResetPasswordFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [done, setDone] = useState(false)
  const apiBaseUrl = String(import.meta.env.VITE_PUBLIC_API_URL || '').replace(/\/$/, '')
  const authBaseUrl = apiBaseUrl.endsWith('/v1')
    ? apiBaseUrl.slice(0, -3)
    : apiBaseUrl

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { password: '', confirmPassword: '' },
  })

  const canSubmit = useMemo(() => Boolean(email && token), [email, token])

  async function onSubmit(data: z.infer<typeof formSchema>) {
    if (!canSubmit) {
      toast.error('Reset link is missing or invalid')
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch(`${authBaseUrl}/v1/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          token,
          password: data.password,
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(body?.message || 'Failed to reset password')
      }
      setDone(true)
      toast.success(body?.message || 'Password updated successfully')
      form.reset()
    } catch (error: any) {
      toast.error(error?.message || 'Failed to reset password')
    } finally {
      setIsLoading(false)
    }
  }

  if (done) {
    return (
      <div className='grid gap-4 text-sm text-slate-700'>
        <div className='flex items-center gap-2 text-emerald-600'>
          <CheckCircle2 className='h-5 w-5' />
          <span>Password updated successfully.</span>
        </div>
        <p>You can now sign in with your new password.</p>
        <Button asChild>
          <a href='/sign-in'>
            Go to sign in
            <ArrowRight />
          </a>
        </Button>
      </div>
    )
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={cn('grid gap-2', className)}
        {...props}
      >
        <FormField
          control={form.control}
          name='password'
          render={({ field }) => (
            <FormItem>
              <FormLabel>New password</FormLabel>
              <FormControl>
                <Input type='password' placeholder='Enter new password' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='confirmPassword'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirm password</FormLabel>
              <FormControl>
                <Input type='password' placeholder='Confirm password' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button className='mt-2' disabled={isLoading || !canSubmit}>
          {isLoading ? <Loader2 className='animate-spin' /> : <ArrowRight />}
          Reset password
        </Button>
      </form>
    </Form>
  )
}
