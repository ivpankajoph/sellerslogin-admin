import { useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, ShieldCheck, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
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
import { useAppSelector } from '@/store/hooks'

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

export function CreatePasswordModal() {
  const { user, token } = useAppSelector((state) => state.auth)
  const [isOpen, setIsOpen] = useState(Boolean(user?.must_change_password))
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  
  const apiBaseUrl = String(import.meta.env.VITE_PUBLIC_API_URL || '').replace(/\/$/, '')

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { password: '', confirmPassword: '' },
  })

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
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          newPassword: data.password,
          confirmPassword: data.confirmPassword,
        }),
      })
      
      const body = await res.json().catch(() => ({ message: 'Invalid response from server' }))
      
      if (!res.ok) {
        throw new Error(body?.message || `Server error: ${res.status}`)
      }
      
      toast.success('Password created successfully')
      setIsOpen(false)
    } catch (error: any) {
      console.error('Password creation error:', error)
      toast.error(error?.message || 'Failed to update password')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent 
        className="sm:max-w-[425px]" 
        showCloseButton={false}
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-violet-100 text-violet-700">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <DialogTitle className="text-center text-xl font-bold">Create Your Password</DialogTitle>
          <DialogDescription className="text-center">
            To keep your account secure, please create a new password for your first login.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Password</FormLabel>
                  <div className="relative">
                    <FormControl>
                      <Input 
                        type={showPassword ? 'text' : 'password'} 
                        placeholder="Min 7 characters" 
                        className="pr-10"
                        {...field} 
                      />
                    </FormControl>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
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
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm Password</FormLabel>
                  <div className="relative">
                    <FormControl>
                      <Input 
                        type={showConfirmPassword ? 'text' : 'password'} 
                        placeholder="Repeat your password" 
                        className="pr-10"
                        {...field} 
                      />
                    </FormControl>
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                    >
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full bg-violet-700 hover:bg-violet-800" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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
