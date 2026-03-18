import { useMemo, useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setUser } from '@/store/slices/authSlice'
import { Loader2, ShieldCheck, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import { PASSWORD_REQUIREMENTS, isStrongPassword } from '@/lib/password-rules'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
      .min(8, { message: 'Password must be at least 8 characters' })
      .refine(isStrongPassword, {
        message: 'Use 1 capital letter, 1 number, and 1 special character.',
      }),
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export function CreatePasswordModal() {
  const dispatch = useAppDispatch()
  const { user, token } = useAppSelector((state) => state.auth)
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const mustChangePassword = useMemo(
    () =>
      String(user?.role || '').toLowerCase() === 'vendor' &&
      Boolean(user?.must_change_password),
    [user?.must_change_password, user?.role]
  )

  const apiBaseUrl = String(import.meta.env.VITE_PUBLIC_API_URL || '').replace(
    /\/$/,
    ''
  )

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { password: '', confirmPassword: '' },
  })
  const passwordValue = form.watch('password')

  async function onSubmit(data: z.infer<typeof formSchema>) {
    if (!token) {
      toast.error('Authentication token missing. Please log in again.')
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch(`${apiBaseUrl}/v1/vendors/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          newPassword: data.password,
          confirmPassword: data.confirmPassword,
        }),
      })

      const body = await res
        .json()
        .catch(() => ({ message: 'Invalid response from server' }))

      if (!res.ok) {
        throw new Error(body?.message || `Server error: ${res.status}`)
      }

      dispatch(
        setUser({
          ...user,
          must_change_password: false,
          temp_password_issued_at: null,
          temp_password_expires_at: null,
          hours_left_to_change_password: null,
          show_password_change_reminder: false,
        })
      )
      toast.success('Password created successfully')
      form.reset()
    } catch (error: any) {
      console.error('Password creation error:', error)
      toast.error(error?.message || 'Failed to update password')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog
      open={mustChangePassword}
      onOpenChange={(nextOpen) => {
        if (!mustChangePassword || nextOpen) return
      }}
    >
      <DialogContent
        className='max-h-[calc(100vh-1.5rem)] w-[min(92vw,30rem)] overflow-y-auto p-5 sm:max-w-[30rem] sm:p-6'
        showCloseButton={false}
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className='space-y-3'>
          <div className='mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-violet-100 text-violet-700 sm:h-12 sm:w-12'>
            <ShieldCheck className='h-5 w-5 sm:h-6 sm:w-6' />
          </div>
          <DialogTitle className='text-center text-2xl leading-tight font-bold'>
            Create Your Password
          </DialogTitle>
          <DialogDescription className='mx-auto max-w-sm text-center text-sm leading-6 sm:text-base'>
            To keep your account secure, please create a new password for your
            first login.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className='space-y-3 py-3 sm:space-y-4'
          >
            <div className='rounded-lg border border-slate-200 bg-slate-50 p-3 sm:p-4'>
              <p className='text-[11px] font-semibold tracking-[0.18em] text-slate-500 uppercase sm:text-xs'>
                Strong password rules
              </p>
              <ul className='mt-3 grid gap-x-4 gap-y-2 text-sm sm:grid-cols-2'>
                {PASSWORD_REQUIREMENTS.map((requirement) => (
                  <li
                    key={requirement.key}
                    className={cn(
                      'flex items-center gap-2',
                      requirement.test(passwordValue)
                        ? 'text-emerald-600'
                        : 'text-slate-500'
                    )}
                  >
                    <span className='text-base leading-none'>&bull;</span>
                    <span>{requirement.label}</span>
                  </li>
                ))}
              </ul>
            </div>

            <FormField
              control={form.control}
              name='password'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Password</FormLabel>
                  <div className='relative'>
                    <FormControl>
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder='Create a strong password'
                        className='h-12 pr-10'
                        {...field}
                      />
                    </FormControl>
                    <button
                      type='button'
                      onClick={() => setShowPassword(!showPassword)}
                      className='absolute top-1/2 right-3 -translate-y-1/2 text-slate-500 hover:text-slate-700'
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='confirmPassword'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm Password</FormLabel>
                  <div className='relative'>
                    <FormControl>
                      <Input
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder='Repeat your password'
                        className='h-12 pr-10'
                        {...field}
                      />
                    </FormControl>
                    <button
                      type='button'
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      className='absolute top-1/2 right-3 -translate-y-1/2 text-slate-500 hover:text-slate-700'
                    >
                      {showConfirmPassword ? (
                        <EyeOff size={18} />
                      ) : (
                        <Eye size={18} />
                      )}
                    </button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type='submit'
              className='h-12 w-full bg-violet-700 hover:bg-violet-800'
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  Creating...
                </>
              ) : (
                'Create Password'
              )}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
