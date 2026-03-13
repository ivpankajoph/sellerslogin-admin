/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { BASE_URL } from '@/store/slices/vendor/productSlice'
import { useSelector } from 'react-redux'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { TemplatePageLayout } from '../components/TemplatePageLayout'
import { TemplatePreviewPanel } from '../components/TemplatePreviewPanel'
import { getStoredEditingTemplateKey } from '../components/templateVariantParam'
import {
  getVendorTemplatePreviewUrl,
  resolvePreviewCityFromVendorProfile,
} from '@/lib/storefront-url'
import { ShieldCheck, Truck, Info } from 'lucide-react'

const selectVendorId = (state: any): string | undefined => state?.auth?.user?.id

function VendorTemplatePolicies() {
  const vendor_id = useSelector(selectVendorId)
  const token = useSelector((state: any) => state.auth?.token)
  const authDefaultCitySlug = useSelector(
    (state: any) => state.auth?.user?.default_city_slug || ''
  )
  const selectedTemplateKey = useMemo(
    () => getStoredEditingTemplateKey(vendor_id),
    [vendor_id]
  )

  const [privacyPolicy, setPrivacyPolicy] = useState('')
  const [shippingPolicy, setShippingPolicy] = useState('')
  const [vendorProfile, setVendorProfile] = useState<any>({})
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Load existing policy data
  useEffect(() => {
    if (!vendor_id) return

    const endpoints = [
      `${BASE_URL}/v1/templates/social-faqs?vendor_id=${vendor_id}`,
      `${BASE_URL}/v1/templates/social-faqs/${vendor_id}`,
      `${BASE_URL}/v1/templates/${vendor_id}`,
    ]

    const load = async () => {
      setIsLoading(true)
      for (const url of endpoints) {
        try {
          const res = await axios.get(url, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          })
          const root = res.data as any
          const payload =
            root?.data || root?.template || root

          if (payload && typeof payload === 'object') {
            // Try to get policies from social_page.policies or components
            const policies =
              payload?.social_page?.policies ||
              payload?.components?.social_page?.policies

            if (policies) {
              setPrivacyPolicy(policies.privacy || '')
              setShippingPolicy(policies.shipping || '')
            }

            const profile =
              payload?.vendor_profile ||
              payload?.components?.vendor_profile
            if (profile) setVendorProfile(profile)
            break
          }
        } catch {
          continue
        }
      }
      setIsLoading(false)
    }

    load()
  }, [vendor_id, token])

  const handleSave = useCallback(async () => {
    if (!vendor_id) {
      toast.error('Vendor ID is missing. Please log in again.')
      return
    }

    setIsSaving(true)
    try {
      const payload = {
        vendor_id,
        social_page: {
          policies: {
            privacy: privacyPolicy,
            shipping: shippingPolicy,
          },
        },
      }

      const response = await axios.put(
        `${BASE_URL}/v1/templates/social-faqs`,
        payload,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        }
      )

      if (response.data?.success) {
        toast.success(response.data?.message || 'Policies saved successfully!')
      } else {
        toast.error(response.data?.message || 'Failed to save policies.')
      }
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        toast.error(
          error.response?.data?.message ||
            error.message ||
            'An error occurred while saving.'
        )
      } else {
        toast.error('Unexpected error occurred.')
      }
    } finally {
      setIsSaving(false)
    }
  }, [vendor_id, token, privacyPolicy, shippingPolicy])

  const previewCity = useMemo(
    () =>
      resolvePreviewCityFromVendorProfile(vendorProfile, authDefaultCitySlug),
    [vendorProfile, authDefaultCitySlug]
  )
  const previewBaseUrl = getVendorTemplatePreviewUrl(
    vendor_id,
    selectedTemplateKey,
    previewCity.slug
  )

  return (
    <>
      <Header fixed>
        <Search />
        <div className='ms-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>

      <TemplatePageLayout
        title='Policies'
        description='Edit your Privacy Policy & Terms of Service and your Shipping & Return Policy. These will be served on the live storefront policy pages.'
        activeKey='policies'
        editingTemplateKey={selectedTemplateKey}
        actions={
          <Button
            onClick={handleSave}
            disabled={isSaving || !vendor_id}
            className='rounded-full bg-slate-900 text-white shadow-lg shadow-slate-900/20 hover:bg-slate-800'
          >
            {isSaving ? 'Saving...' : 'Save Policies'}
          </Button>
        }
        preview={
          <TemplatePreviewPanel
            title='Live Template Preview'
            subtitle={`Sync to refresh the right-side preview. Default city: ${previewCity.label}`}
            baseSrc={previewBaseUrl}
            defaultPath='/privacy'
            pageOptions={[
              { label: 'Privacy Policy', path: '/privacy' },
              { label: 'Shipping & Returns', path: '/shipping' },
              { label: 'Home', path: '' },
            ]}
            onSync={handleSave}
            isSyncing={isSaving}
            syncDisabled={!vendor_id}
            vendorId={vendor_id}
            page='policies'
            previewData={{} as any}
            sectionOrder={[]}
          />
        }
      >
        {isLoading ? (
          <div className='rounded-3xl border border-slate-200 bg-white/90 p-8 text-center text-slate-500 shadow-sm'>
            Loading policy content...
          </div>
        ) : (
          <>
            {/* Info Banner */}
            <div className='flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4'>
              <Info className='mt-0.5 h-4 w-4 shrink-0 text-blue-600' />
              <p className='text-sm text-blue-700'>
                Write your policy content below. Use plain text or simple formatting. These appear on your storefront&apos;s{' '}
                <strong>/privacy</strong> and <strong>/shipping</strong> pages.
              </p>
            </div>

            {/* Privacy Policy Section */}
            <div className='rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm'>
              <div className='mb-4 flex items-center gap-3'>
                <div className='flex h-10 w-10 items-center justify-center rounded-full bg-slate-100'>
                  <ShieldCheck className='h-5 w-5 text-slate-600' />
                </div>
                <div>
                  <h3 className='text-base font-semibold text-slate-900'>
                    Privacy Policy &amp; Terms of Service
                  </h3>
                  <p className='text-xs text-slate-500'>
                    Displayed at <code className='rounded bg-slate-100 px-1'>/privacy</code> on your storefront
                  </p>
                </div>
              </div>
              <div className='space-y-2'>
                <Label htmlFor='privacy-policy'>Policy Content</Label>
                <Textarea
                  id='privacy-policy'
                  value={privacyPolicy}
                  onChange={(e) => setPrivacyPolicy(e.target.value)}
                  placeholder={`Privacy Policy\n\nLast updated: [Date]\n\nWe respect your privacy...\n\nTerms of Service\n\nBy using our services, you agree to...`}
                  className='min-h-[320px] resize-y rounded-xl border-slate-200 font-mono text-sm leading-relaxed'
                />
                <p className='text-xs text-slate-400'>
                  {privacyPolicy.length} characters
                </p>
              </div>
            </div>

            {/* Shipping & Return Policy Section */}
            <div className='rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm'>
              <div className='mb-4 flex items-center gap-3'>
                <div className='flex h-10 w-10 items-center justify-center rounded-full bg-amber-50'>
                  <Truck className='h-5 w-5 text-amber-600' />
                </div>
                <div>
                  <h3 className='text-base font-semibold text-slate-900'>
                    Shipping &amp; Return Policy
                  </h3>
                  <p className='text-xs text-slate-500'>
                    Displayed at <code className='rounded bg-slate-100 px-1'>/shipping</code> on your storefront
                  </p>
                </div>
              </div>
              <div className='space-y-2'>
                <Label htmlFor='shipping-policy'>Policy Content</Label>
                <Textarea
                  id='shipping-policy'
                  value={shippingPolicy}
                  onChange={(e) => setShippingPolicy(e.target.value)}
                  placeholder={`Shipping Policy\n\nWe process orders within 1-2 business days...\n\nReturn Policy\n\nIf you are not satisfied with your purchase, we offer a [X]-day return window...`}
                  className='min-h-[320px] resize-y rounded-xl border-slate-200 font-mono text-sm leading-relaxed'
                />
                <p className='text-xs text-slate-400'>
                  {shippingPolicy.length} characters
                </p>
              </div>
            </div>

            {/* Bottom Save */}
            <div className='flex justify-end'>
              <Button
                onClick={handleSave}
                disabled={isSaving || !vendor_id}
                className='rounded-full bg-slate-900 px-8 text-white shadow-lg shadow-slate-900/20 hover:bg-slate-800'
              >
                {isSaving ? 'Saving...' : 'Save Policies'}
              </Button>
            </div>
          </>
        )}
      </TemplatePageLayout>
    </>
  )
}

export default VendorTemplatePolicies
