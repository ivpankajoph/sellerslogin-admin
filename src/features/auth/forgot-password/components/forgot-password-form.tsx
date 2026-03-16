import { useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowRight, Loader2 } from 'lucide-react'
import Swal from 'sweetalert2'
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

const formSchema = z.object({
  email: z.email({
    error: (iss) => (iss.input === '' ? 'Please enter your email' : undefined),
  }),
})

export function ForgotPasswordForm({
  className,
  ...props
}: React.HTMLAttributes<HTMLFormElement>) {
  const [isLoading, setIsLoading] = useState(false)
  const apiBaseUrl = String(import.meta.env.VITE_PUBLIC_API_URL || '').replace(/\/$/, '')
  const authBaseUrl = apiBaseUrl.endsWith('/v1')
    ? apiBaseUrl.slice(0, -3)
    : apiBaseUrl

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: '' },
  })

  async function onSubmit(data: z.infer<typeof formSchema>) {
    setIsLoading(true)

    try {
      const res = await fetch(`${authBaseUrl}/v1/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: data.email }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        const message =
          res.status === 404
            ? 'u dont exists'
            : body?.message || 'Unable to send reset link'
        throw new Error(message)
      }
      const successMessage = 'Link has been sent to email'
      toast.success(successMessage)
      await Swal.fire({
        icon: 'success',
        title: 'Email Sent',
        text: successMessage,
      })
      form.reset()
    } catch (error: any) {
      const message = error?.message || 'Unable to send reset link'
      const title = message === 'u dont exists' ? 'Email Not Found' : 'Request Failed'
      toast.error(message)
      await Swal.fire({
        icon: 'error',
        title,
        text: message,
      })
    } finally {
      setIsLoading(false)
    }
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
          name='email'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder='name@example.com' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button className='mt-2' disabled={isLoading}>
          Continue
          {isLoading ? <Loader2 className='animate-spin' /> : <ArrowRight />}
        </Button>
      </form>
    </Form>
  )
}
