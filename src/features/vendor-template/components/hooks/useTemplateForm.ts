import { useState, useEffect } from 'react'
import axios from 'axios'
import { type AppDispatch } from '@/store'
import { BASE_URL } from '@/store/slices/vendor/productSlice'
import { fetchVendorProfile } from '@/store/slices/vendor/profileSlice'
import toast from 'react-hot-toast'
import { useSelector, useDispatch } from 'react-redux'
import { initialData } from '../../data'
import { updateFieldImmutable } from './utils'
import { uploadImage } from '../../helper/fileupload'

type TemplateCatalogItem = {
  key: string
  name: string
  description?: string
  previewImage?: string
}

export function useTemplateForm() {
  const [data, setData] = useState(initialData)
  const [templateCatalog, setTemplateCatalog] = useState<TemplateCatalogItem[]>(
    []
  )
  const [selectedTemplateKey, setSelectedTemplateKey] = useState('classic')
  const [activeTemplateKey, setActiveTemplateKey] = useState('classic')
  const [isUpdatingTemplate, setIsUpdatingTemplate] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState('idle')
  const [uploadingPaths, setUploadingPaths] = useState(new Set())
  const [open, setOpen] = useState(false)
  const [isDeploying, setIsDeploying] = useState(false)
  const [deployMessage, setDeployMessage] = useState('Deploying website...')
  const [loadedSectionOrder, setLoadedSectionOrder] = useState<string[]>([])

  const vendor_id = useSelector((s: any) => s.auth?.user?.id)
  const token = useSelector((s: any) => s.auth?.token)
  const vendor_weburl = useSelector(
    (s: any) => s.vendorprofile?.profile?.vendor?.bound_url
  )

  const dispatch = useDispatch<AppDispatch>()
  useEffect(() => {
    dispatch(fetchVendorProfile())
  }, [dispatch])

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
      `${BASE_URL}/v1/templates/home?vendor_id=${vendor_id}`,
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
  }, [vendor_id])

  useEffect(() => {
    const loadCatalog = async () => {
      try {
        const res = await axios.get(`${BASE_URL}/v1/templates/catalog`)
        const items = Array.isArray(res.data?.data) ? res.data.data : []
        setTemplateCatalog(items)
      } catch {
        setTemplateCatalog([])
      }
    }

    loadCatalog()
  }, [])

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
  const handleSubmit = async (sectionOrder?: string[]) => {
    setIsSubmitting(true)
    setSubmitStatus('idle')

    try {
      const payload = {
        vendor_id,
        components: data.components,
        section_order: sectionOrder,
      }

      const res = await axios.put(`${BASE_URL}/v1/templates/home`, payload)

      if (res.status === 200 || res.status === 201) {
        setSubmitStatus('success')
        toast.success('Template saved!')
      } else {
        throw new Error()
      }
    } catch {
      setSubmitStatus('error')
      toast.error('Save failed')
    } finally {
      setIsSubmitting(false)
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

  // Deployment + binding
  async function bindURL(url: string) {
    try {
      await axios.put(`${BASE_URL}/vendor/bind-url`, {
        url,
        vendor_id,
      })
      toast.success('URL bound successfully!')
    } catch {
      toast.error('URL binding failed')
    }
  }
 

  const handleDeploy = async () => {
    setIsDeploying(true)
    toast.loading('Starting deployment...', { id: 'deploy' })
    try {
      const response = await axios.post(
        `${BASE_URL}/v1/templates/deploy`,
        {
          projectName: `sellerslogin-${vendor_id}`,
          templatePath: `../vendor-template`,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          responseType: 'stream', // IMPORTANT for Node streaming
        }
      )

      let serviceUrl = null

      response.data.on('data', (chunk: any) => {
        const text = chunk.toString()

        setDeployMessage((prev) => prev + text)

        const match = text.match(/https:\/\/[a-zA-Z0-9.-]+\.run\.app/)
        if (match) serviceUrl = match[0]
      })

      await new Promise((resolve) => response.data.on('end', resolve))

      toast.success('Deployment complete', { id: 'deploy' })

      if (serviceUrl) await bindURL(serviceUrl)
    } catch {
      toast.error('Deployment failed', { id: 'deploy' })
    } finally {
      setIsDeploying(false)
    }
  }

  // Cancel Deployment
  const handleCancel = async () => {
    try {
      await axios.post(`${BASE_URL}/v1/templates/deploy/cancel`)
      toast.success('Deployment canceled')
    } catch {
      toast.error('Cancel failed')
    }
  }

  return {
    data,
    setData,
    updateField,
    handleImageChange,
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
    open,
    setOpen,
    isDeploying,
    deployMessage,
    handleDeploy,
    handleCancel,
    loadedSectionOrder,
  }
}
