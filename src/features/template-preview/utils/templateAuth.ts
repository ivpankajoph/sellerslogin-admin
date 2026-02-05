"use client"

import { VITE_PUBLIC_API_URL } from "@/config"

export type TemplateAuthPayload = {
  token: string
  user: {
    id: string
    name: string
    email: string
    phone: string
    vendor_id: string
  }
}

const API_BASE =
  VITE_PUBLIC_API_URL && VITE_PUBLIC_API_URL.endsWith("/v1")
    ? VITE_PUBLIC_API_URL
    : `${VITE_PUBLIC_API_URL}/v1`

const storageKey = (vendorId: string) => `template_auth_${vendorId}`

export const getTemplateAuth = (
  vendorId: string
): TemplateAuthPayload | null => {
  if (typeof window === "undefined") return null
  const raw = localStorage.getItem(storageKey(vendorId))
  if (!raw) return null
  try {
    return JSON.parse(raw) as TemplateAuthPayload
  } catch {
    return null
  }
}

export const setTemplateAuth = (
  vendorId: string,
  payload: TemplateAuthPayload
) => {
  if (typeof window === "undefined") return
  localStorage.setItem(storageKey(vendorId), JSON.stringify(payload))
}

export const clearTemplateAuth = (vendorId: string) => {
  if (typeof window === "undefined") return
  localStorage.removeItem(storageKey(vendorId))
}

export const templateApiFetch = async (
  vendorId: string,
  path: string,
  options: RequestInit = {}
) => {
  const auth = getTemplateAuth(vendorId)
  const headers = new Headers(options.headers || {})
  headers.set("Content-Type", "application/json")
  if (auth?.token) {
    headers.set("Authorization", `Bearer ${auth.token}`)
  }

  const response = await fetch(`${API_BASE}/template-users${path}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error?.message || "Request failed")
  }

  return response.json()
}
