import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { SignIn } from '@/features/auth/sign-in'

const searchSchema = z.object({
  redirect: z.string().optional(),
  autologin: z.union([z.string(), z.number()]).optional().transform((value) => {
    if (value === undefined || value === null) return undefined;
    return String(value);
  }),
  authtoken: z.string().optional(),
  authuser: z.string().optional(),
})

export const Route = createFileRoute('/(auth)/sign-in')({
  component: SignIn,
  validateSearch: searchSchema,
})
