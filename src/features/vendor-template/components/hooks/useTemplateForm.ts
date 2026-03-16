import { useState, useEffect } from 'react'
import axios from 'axios'
import { type AppDispatch } from '@/store'
import { BASE_URL } from '@/store/slices/vendor/productSlice'
import { fetchVendorProfile } from '@/store/slices/vendor/profileSlice'
import toast from 'react-hot-toast'
import { useSelector, useDispatch } from 'react-redux'
import { initialData } from '../../data'
import { updateFieldImmutable } from './utils'
import { uploadFile, uploadImage } from '../../helper/fileupload'
import { getStoredActiveWebsiteId } from '../websiteStudioStorage'

type TemplateCatalogItem = {
  key: string
  name: string
  description?: string
  previewImage?: string
  isCore?: boolean
  deletable?: boolean
}

const CORE_TEMPLATE_KEYS = new Set(['mquiq', 'poupqz', 'oragze', 'whiterose'])

const normalizeTemplateKey = (value: unknown) =>
  String(value || '')
    .trim()
    .toLowerCase()

const isCoreTemplate = (template: TemplateCatalogItem) => {
  if (typeof template.isCore === 'boolean') return template.isCore
  const key = normalizeTemplateKey(template.key)
  return CORE_TEMPLATE_KEYS.has(key)
}

export function useTemplateForm() {
  const [data, setData] = useState(initialData)
  const [templateCatalog, setTemplateCatalog] = useState<TemplateCatalogItem[]>(
    []
  )
  const [selectedTemplateKey, setSelectedTemplateKey] = useState('mquiq')
  const [activeTemplateKey, setActiveTemplateKey] = useState('mquiq')
  const [isUpdatingTemplate, setIsUpdatingTemplate] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState('idle')
  const [uploadingPaths, setUploadingPaths] = useState<Set<string>>(new Set())
  const [loadedSectionOrder, setLoadedSectionOrder] = useState<string[]>([])
  const [isDeletingTemplateKey, setIsDeletingTemplateKey] = useState<
    string | null
  >(null)

  const authUser = useSelector((s: any) => s.auth?.user || null)
  const role = useSelector((s: any) => s.auth?.user?.role)
  const token = useSelector((s: any) => s.auth?.token)
  const vendorProfile = useSelector(
    (s: any) =>
      s.vendorprofile?.profile?.vendor ||
      s.vendorprofile?.profile?.data ||
      s.vendorprofile?.profile ||
      null
  )
  const vendor_id = String(
    authUser?.id ||
      authUser?._id ||
      authUser?.vendor_id ||
      authUser?.vendorId ||
      vendorProfile?._id ||
      vendorProfile?.id ||
      vendorProfile?.vendor_id ||
      ''
  ).trim()
  const vendor_weburl = String(
    vendorProfile?.bound_url || authUser?.bound_url || ''
  ).trim()
  const vendor_default_city_slug = String(
    vendorProfile?.default_city_slug || authUser?.default_city_slug || ''
  ).trim()
  const activeWebsiteId = getStoredActiveWebsiteId(vendor_id)
  const isAdmin = role === 'admin' || role === 'superadmin'

  const dispatch = useDispatch<AppDispatch>()
  useEffect(() => {
    if (!token || vendorProfile) return
    dispatch(fetchVendorProfile())
  }, [dispatch, token, vendorProfile])

  useEffect(() => {
    if (!vendor_id) return

    const pickArray = (value: unknown): string[] =>
      Array.isArray(value) ? (value as string[]) : []

    const firstNonEmpty = (...values: string[][]) =>
      values.find((value) => value.length > 0) || []

    const mergeTemplate = (payload: Record<string, unknown>) => {
      const base = structuredClone(initialData)
      const merged = {
        ...base,
        components: {
          ...base.components,
          ...(payload.components && typeof payload.components === 'object'
            ? (payload.components as typeof base.components)
            : {}),
        },
      }

      merged.components.theme = {
        ...base.components.theme,
        ...(payload.components && typeof payload.components === 'object'
          ? (payload.components as any).theme
          : {}),
        ...(payload.theme ? (payload.theme as typeof base.components.theme) : {}),
      }

      if (payload.logo) {
        merged.components.logo = payload.logo as string
      }
      if (payload.home_page) {
        merged.components.home_page =
          payload.home_page as typeof base.components.home_page
      }
      if (payload.about_page) {
        merged.components.about_page =
          payload.about_page as typeof base.components.about_page
      }
      if (payload.contact_page) {
        merged.components.contact_page =
          payload.contact_page as typeof base.components.contact_page
      }
      if (payload.social_page) {
        merged.components.social_page =
          payload.social_page as typeof base.components.social_page
      }

      return merged
    }

    const endpoints = [
      `${BASE_URL}/v1/templates/home?vendor_id=${vendor_id}${
        activeWebsiteId ? `&website_id=${encodeURIComponent(activeWebsiteId)}` : ''
      }`,
      `${BASE_URL}/v1/templates/home/${vendor_id}`,
      `${BASE_URL}/v1/templates/${vendor_id}`,
    ]

    const load = async () => {
      for (const url of endpoints) {
        try {
          const res = await axios.get(url, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          })
          const root = res.data as unknown
          const record =
            root && typeof root === 'object'
              ? (root as Record<string, unknown>)
              : null
          const payload =
            (record?.data as Record<string, unknown>) ||
            (record?.template as Record<string, unknown>) ||
            record

          if (payload && typeof payload === 'object') {
            const order = firstNonEmpty(
              pickArray((payload as Record<string, unknown>).section_order),
              pickArray((payload as Record<string, unknown>).sectionOrder),
              pickArray(
                (
                  (payload as Record<string, unknown>).components as Record<
                    string,
                    unknown
                  >
                )?.section_order
              )
            )
            const templateKey =
              (payload as Record<string, unknown>).template_key ||
              (payload as Record<string, unknown>).templateKey
            if (typeof templateKey === 'string') {
              setSelectedTemplateKey(templateKey)
              setActiveTemplateKey(templateKey)
            }
            setData(mergeTemplate(payload as Record<string, unknown>))
            if (order.length) setLoadedSectionOrder(order)
            return
          }
        } catch {
          continue
        }
      }
    }

    load()
  }, [activeWebsiteId, token, vendor_id])

  useEffect(() => {
    const loadCatalog = async () => {
      try {
      const res = await axios.get(`${BASE_URL}/v1/templates/catalog`)
      const items = Array.isArray(res.data?.data) ? res.data.data : []
      const normalizedItems = (items as TemplateCatalogItem[]).map((item) => ({
        ...item,
        key: normalizeTemplateKey(item.key),
        isCore:
          typeof item.isCore === 'boolean'
            ? item.isCore
            : CORE_TEMPLATE_KEYS.has(normalizeTemplateKey(item.key)),
        deletable: typeof item.deletable === 'boolean' ? item.deletable : true,
      }))
      setTemplateCatalog(normalizedItems)
      } catch {
        setTemplateCatalog([])
      }
    }

    loadCatalog()
  }, [])

  useEffect(() => {
    if (!templateCatalog.length) return

    const fallbackKey =
      templateCatalog.find((item) => item.key === 'mquiq')?.key ||
      templateCatalog[0]?.key ||
      'mquiq'

    if (!templateCatalog.some((item) => item.key === selectedTemplateKey)) {
      setSelectedTemplateKey(fallbackKey)
    }

    if (!templateCatalog.some((item) => item.key === activeTemplateKey)) {
      setActiveTemplateKey(fallbackKey)
    }
  }, [templateCatalog, selectedTemplateKey, activeTemplateKey])

  // Update any nested value
  const updateField = (path: string[], value: any) => {
    setData((prev) => updateFieldImmutable(prev, path, value))
  }

  // Handle image update + cloudinary upload
  const handleImageChange = async (path: string[], file: File | null) => {
    const pathKey = path.join('.')

    if (!file) {
      updateField(path, '')
      setUploadingPaths((prev) => {
        const newSet = new Set(prev)
        newSet.delete(pathKey)
        return newSet
      })
      return
    }

    setUploadingPaths((prev) => new Set(prev).add(pathKey))

    try {
      const url = await uploadImage(file,"template_images")
      updateField(path, url || '')
    } finally {
      setUploadingPaths((prev) => {
        const newSet = new Set(prev)
        newSet.delete(pathKey)
        return newSet
      })
    }
  }

  // Save template
  const handleSubmit = async (
    sectionOrder?: string[],
    options?: { silent?: boolean }
  ) => {
    setIsSubmitting(true)
    setSubmitStatus('idle')

    try {
      const payload = {
        vendor_id,
        website_id: activeWebsiteId,
        components: data.components,
        section_order: sectionOrder,
      }

      const res = await axios.put(`${BASE_URL}/v1/templates/home`, payload)

      if (res.status === 200 || res.status === 201) {
        setSubmitStatus('success')
        if (!options?.silent) {
          toast.success('Template saved!')
        }
      } else {
        throw new Error()
      }
    } catch {
      setSubmitStatus('error')
      if (!options?.silent) {
        toast.error('Save failed')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDocumentChange = async (path: string[], file: File | null) => {
    const pathKey = path.join('.')

    if (!file) {
      updateField(path, '')
      setUploadingPaths((prev) => {
        const newSet = new Set(prev)
        newSet.delete(pathKey)
        return newSet
      })
      return
    }

    setUploadingPaths((prev) => new Set(prev).add(pathKey))

    try {
      const url = await uploadFile(file, 'template_documents')
      updateField(path, url || '')
    } finally {
      setUploadingPaths((prev) => {
        const newSet = new Set(prev)
        newSet.delete(pathKey)
        return newSet
      })
    }
  }

  const applyTemplateVariant = async () => {
    if (!vendor_id) return
    setIsUpdatingTemplate(true)

    try {
      const res = await axios.put(
        `${BASE_URL}/v1/templates/template`,
        {
          vendor_id,
          template_key: selectedTemplateKey,
          website_id: activeWebsiteId,
        },
        {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        }
      )
      const updatedKey =
        res.data?.data?.template_key || res.data?.data?.templateKey
      if (typeof updatedKey === 'string') {
        setSelectedTemplateKey(updatedKey)
        setActiveTemplateKey(updatedKey)
      } else {
        setActiveTemplateKey(selectedTemplateKey)
      }
      toast.success('Template updated!')
    } catch {
      toast.error('Template update failed')
    } finally {
      setIsUpdatingTemplate(false)
    }
  }

  const deleteTemplateVariant = async (templateKey: string) => {
    if (!isAdmin) return

    const target = templateCatalog.find((item) => item.key === templateKey)
    if (!target) return

    if (!token) {
      toast.error('Unauthorized request')
      return
    }

    const isCore = isCoreTemplate(target)
    const confirmed = window.confirm(
      `Delete template "${target.name}"?${
        isCore ? '\n\nWARNING: This is a core template.' : ''
      }\n\nThis will remove it from admin template options and fallback vendors using it to another template.`
    )
    if (!confirmed) return

    setIsDeletingTemplateKey(templateKey)
    try {
      const res = await axios.delete(
        `${BASE_URL}/v1/templates/catalog/${encodeURIComponent(templateKey)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )

      const items = Array.isArray(res.data?.data)
        ? (res.data.data as TemplateCatalogItem[])
        : []

      setTemplateCatalog(items)

      const fallbackKey = items.find((item) => item.key === 'mquiq')?.key ||
        items[0]?.key ||
        'mquiq'

      if (selectedTemplateKey === templateKey) {
        setSelectedTemplateKey(fallbackKey)
      }
      if (activeTemplateKey === templateKey) {
        setActiveTemplateKey(fallbackKey)
      }

      toast.success(res.data?.message || 'Template deleted')
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Template delete failed')
    } finally {
      setIsDeletingTemplateKey(null)
    }
  }

  return {
    data,
    setData,
    updateField,
    handleImageChange,
    handleDocumentChange,
    handleSubmit,
    templateCatalog,
    selectedTemplateKey,
    activeTemplateKey,
    setSelectedTemplateKey,
    applyTemplateVariant,
    isUpdatingTemplate,
    uploadingPaths,
    submitStatus,
    isSubmitting,
    vendor_id,
    vendor_weburl,
    vendor_default_city_slug,
    activeWebsiteId,
    loadedSectionOrder,
    isAdmin,
    deleteTemplateVariant,
    isDeletingTemplateKey,
  }
}
