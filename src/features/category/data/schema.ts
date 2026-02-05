import { z } from 'zod'

// 🧩 Subcategory schema
const subcategorySchema = z.object({
  id: z.string(),
  category_id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  image_url: z.string().nullable(),
  meta_title: z.string().nullable(),
  meta_description: z.string().nullable(),
  is_active: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

// 🧱 Category schema
export const categorySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  image_url: z.string().nullable(),
  meta_title: z.string().nullable(),
  meta_description: z.string().nullable(),
  meta_keywords: z.string().nullable(),
  display_order: z.number().optional().default(0),
  is_active: z.boolean(),
  created_by: z.string().nullable(),
  updated_by: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  deletedAt: z.string().nullable(),
  subcategories: z.array(subcategorySchema).optional().default([]),
})

// 🧾 For the full API response
export const categoryListSchema = z.array(categorySchema)

// 🧠 Types for TypeScript
export type Category = z.infer<typeof categorySchema>
export type Subcategory = z.infer<typeof subcategorySchema>
