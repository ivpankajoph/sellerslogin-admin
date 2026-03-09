import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import api from '@/lib/axios'

type BrevoTemplate = {
  _id: string
  name: string
  subject: string
  htmlContent: string
}

export default function BrevoConnectPage() {
  const [open, setOpen] = useState(true)
  const [apiKey, setApiKey] = useState('')
  const [saving, setSaving] = useState(false)
  const [connected, setConnected] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [showSendEmail, setShowSendEmail] = useState(false)
  const [showBulkEmail, setShowBulkEmail] = useState(false)
  const [showTemplateEmail, setShowTemplateEmail] = useState(false)
  const [showManageTemplates, setShowManageTemplates] = useState(false)
  const [toEmail, setToEmail] = useState('')
  const [subject, setSubject] = useState('')
  const [htmlContent, setHtmlContent] = useState('')
  const [sendingEmail, setSendingEmail] = useState(false)
  const [bulkRecipients, setBulkRecipients] = useState('')
  const [bulkSubject, setBulkSubject] = useState('')
  const [bulkContent, setBulkContent] = useState('')
  const [sendingBulk, setSendingBulk] = useState(false)
  const [templates, setTemplates] = useState<BrevoTemplate[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [templateRecipients, setTemplateRecipients] = useState('')
  const [sendingTemplateEmail, setSendingTemplateEmail] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<BrevoTemplate | null>(null)
  const [savingTemplate, setSavingTemplate] = useState(false)

  useEffect(() => {
    const loadStatus = async () => {
      try {
        const res = await api.get('/vendor/brevo/status')
        const data = res.data?.data
        if (data?.connected) {
          setConnected(true)
          setOpen(false)
        }
        if (Array.isArray(data?.templates)) {
          setTemplates(data.templates)
        }
        if (data?.connected) {
          setStatusMessage('You are connected with Brevo')
        }
      } catch {
        // ignore if status fails
      }
    }
    loadStatus()
  }, [])

  const handleConnect = async () => {
    const value = apiKey.trim()
    if (!value) {
      toast.error('Please enter your Brevo API key')
      return
    }

    try {
      setSaving(true)
      setStatusMessage(null)
      const res = await api.post('/vendor/brevo/connect', {
        api_key: value,
      })
      setConnected(true)
      setStatusMessage(res?.data?.message || 'You are connected with Brevo')
      setApiKey('')
      setOpen(false)
      toast.success(res?.data?.message || 'You are connected with Brevo')
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          'Failed to connect Brevo',
      )
    } finally {
      setSaving(false)
    }
  }

  const handleSendEmail = async () => {
    const to = toEmail.trim()
    const subj = subject.trim()
    const content = htmlContent.trim()

    if (!to || !subj || !content) {
      toast.error('Please fill recipient email, subject and content')
      return
    }

    try {
      setSendingEmail(true)
      await api.post('/vendor/brevo/send-email', {
        to,
        subject: subj,
        htmlContent: content,
      })
      toast.success('Email sent successfully via Brevo')
      setToEmail('')
      setSubject('')
      setHtmlContent('')
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          'Failed to send email via Brevo',
      )
    } finally {
      setSendingEmail(false)
    }
  }

  const handleSaveTemplate = async () => {
    const name = (editingTemplate?.name || '').trim()
    const subj = (editingTemplate?.subject || '').trim()
    const content = (editingTemplate?.htmlContent || '').trim()

    if (!name || !subj || !content) {
      toast.error('Please fill name, subject and content')
      return
    }

    try {
      setSavingTemplate(true)
      const isNew = !editingTemplate?._id
      const res = isNew
        ? await api.post('/vendor/brevo/templates', {
            name,
            subject: subj,
            htmlContent: content,
          })
        : await api.put(`/vendor/brevo/templates/${editingTemplate._id}`, {
            name,
            subject: subj,
            htmlContent: content,
          })
      const list = res.data?.data
      if (Array.isArray(list)) {
        setTemplates(list)
      }
      setEditingTemplate(null)
      toast.success(isNew ? 'Template created' : 'Template updated')
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          'Failed to save template',
      )
    } finally {
      setSavingTemplate(false)
    }
  }

  const handleDeleteTemplate = async (templateId: string) => {
    try {
      const res = await api.delete(`/vendor/brevo/templates/${templateId}`)
      const list = res.data?.data
      if (Array.isArray(list)) {
        setTemplates(list)
      } else {
        setTemplates((prev) => prev.filter((t) => t._id !== templateId))
      }
      if (selectedTemplateId === templateId) {
        setSelectedTemplateId('')
      }
      toast.success('Template deleted')
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          'Failed to delete template',
      )
    }
  }

  const handleSendBulkEmail = async () => {
    const to = bulkRecipients.trim()
    const subj = bulkSubject.trim()
    const content = bulkContent.trim()

    if (!to || !subj || !content) {
      toast.error('Please fill recipients, subject and content')
      return
    }

    try {
      setSendingBulk(true)
      await api.post('/vendor/brevo/send-bulk-email', {
        to,
        subject: subj,
        htmlContent: content,
      })
      toast.success('Bulk email sent successfully via Brevo')
      setBulkRecipients('')
      setBulkSubject('')
      setBulkContent('')
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          'Failed to send bulk email via Brevo',
      )
    } finally {
      setSendingBulk(false)
    }
  }

  const handleSendTemplateEmail = async () => {
    const to = templateRecipients.trim()
    if (!selectedTemplateId || !to) {
      toast.error('Please select a template and recipients')
      return
    }

    try {
      setSendingTemplateEmail(true)
      await api.post('/vendor/brevo/send-template-email', {
        to,
        templateId: selectedTemplateId,
      })
      toast.success('Template email sent successfully via Brevo')
      setTemplateRecipients('')
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          'Failed to send template email via Brevo',
      )
    } finally {
      setSendingTemplateEmail(false)
    }
  }

  return (
    <div className='space-y-6 p-4'>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect with Brevo</DialogTitle>
          </DialogHeader>
          <div className='mt-2 space-y-4'>
            <div className='space-y-2'>
              <Label htmlFor='brevo-api-key'>Brevo API key</Label>
              <Input
                id='brevo-api-key'
                type='password'
                placeholder='Enter your Brevo API key'
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
            </div>
            {statusMessage && (
              <p className='rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800'>
                {statusMessage}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => {
                setOpen(false)
              }}
            >
              Close
            </Button>
            <Button onClick={handleConnect} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  Connecting...
                </>
              ) : (
                'Connect'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {connected && (
        <div className='space-y-4'>
          <h2 className='text-lg font-semibold'>Brevo Tools</h2>
          <p className='text-sm text-muted-foreground'>
            You are connected with Brevo. Use the tools below to send emails.
          </p>
          <div className='flex flex-wrap gap-2'>
            <Button size='sm' onClick={() => {
              setShowSendEmail(true)
              setShowBulkEmail(false)
              setShowTemplateEmail(false)
              setShowManageTemplates(false)
            }}>
              Send Email
            </Button>
            <Button size='sm' variant={showBulkEmail ? 'default' : 'outline'} onClick={() => {
              setShowSendEmail(false)
              setShowBulkEmail(true)
              setShowTemplateEmail(false)
              setShowManageTemplates(false)
            }}>
              Send Bulk Email
            </Button>
            <Button size='sm' variant={showTemplateEmail ? 'default' : 'outline'} onClick={() => {
              setShowSendEmail(false)
              setShowBulkEmail(false)
              setShowTemplateEmail(true)
              setShowManageTemplates(false)
            }}>
              Send Template Email
            </Button>
            <Button size='sm' variant={showManageTemplates ? 'default' : 'outline'} onClick={() => {
              setShowSendEmail(false)
              setShowBulkEmail(false)
              setShowTemplateEmail(false)
              setShowManageTemplates(true)
            }}>
              Manage Templates
            </Button>
          </div>

          {showSendEmail && (
            <div className='mt-4 space-y-3 rounded-lg border border-slate-200 bg-white p-4'>
              <h3 className='text-sm font-semibold'>Send Email via Brevo</h3>
              <div className='space-y-1'>
                <Label htmlFor='brevo-to-email'>Recipient email</Label>
                <Input
                  id='brevo-to-email'
                  type='email'
                  placeholder='customer@example.com'
                  value={toEmail}
                  onChange={(e) => setToEmail(e.target.value)}
                />
              </div>
              <div className='space-y-1'>
                <Label htmlFor='brevo-subject'>Subject</Label>
                <Input
                  id='brevo-subject'
                  placeholder='Subject'
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>
              <div className='space-y-1'>
                <Label htmlFor='brevo-content'>Email content (HTML)</Label>
                <textarea
                  id='brevo-content'
                  className='min-h-[160px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
                  placeholder='<p>Hello, this is a test email.</p>'
                  value={htmlContent}
                  onChange={(e) => setHtmlContent(e.target.value)}
                />
              </div>
              <div className='flex justify-end gap-2'>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => {
                    setShowSendEmail(false)
                    setToEmail('')
                    setSubject('')
                    setHtmlContent('')
                  }}
                >
                  Cancel
                </Button>
                <Button size='sm' onClick={handleSendEmail} disabled={sendingEmail}>
                  {sendingEmail ? (
                    <>
                      <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                      Sending...
                    </>
                  ) : (
                    'Send Email'
                  )}
                </Button>
              </div>
            </div>
          )}

          {showBulkEmail && (
            <div className='mt-4 space-y-3 rounded-lg border border-slate-200 bg-white p-4'>
              <h3 className='text-sm font-semibold'>Send Bulk Email via Brevo</h3>
              <p className='text-xs text-muted-foreground'>
                Enter multiple recipient emails separated by commas.
              </p>
              <div className='space-y-1'>
                <Label htmlFor='brevo-bulk-to'>Recipients</Label>
                <Input
                  id='brevo-bulk-to'
                  placeholder='user1@example.com, user2@example.com'
                  value={bulkRecipients}
                  onChange={(e) => setBulkRecipients(e.target.value)}
                />
              </div>
              <div className='space-y-1'>
                <Label htmlFor='brevo-bulk-subject'>Subject</Label>
                <Input
                  id='brevo-bulk-subject'
                  placeholder='Subject'
                  value={bulkSubject}
                  onChange={(e) => setBulkSubject(e.target.value)}
                />
              </div>
              <div className='space-y-1'>
                <Label htmlFor='brevo-bulk-content'>Email content (HTML)</Label>
                <textarea
                  id='brevo-bulk-content'
                  className='min-h-[160px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
                  placeholder='<p>Hello, this is a bulk email.</p>'
                  value={bulkContent}
                  onChange={(e) => setBulkContent(e.target.value)}
                />
              </div>
              <div className='flex justify-end gap-2'>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => {
                    setShowBulkEmail(false)
                    setBulkRecipients('')
                    setBulkSubject('')
                    setBulkContent('')
                  }}
                >
                  Cancel
                </Button>
                <Button size='sm' onClick={handleSendBulkEmail} disabled={sendingBulk}>
                  {sendingBulk ? (
                    <>
                      <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                      Sending...
                    </>
                  ) : (
                    'Send Bulk Email'
                  )}
                </Button>
              </div>
            </div>
          )}

          {showTemplateEmail && (
            <div className='mt-4 space-y-3 rounded-lg border border-slate-200 bg-white p-4'>
              <h3 className='text-sm font-semibold'>Send Template Email via Brevo</h3>
              <div className='space-y-1'>
                <Label htmlFor='brevo-template-select'>Template</Label>
                <select
                  id='brevo-template-select'
                  className='h-9 w-full rounded-md border border-input bg-background px-2 text-sm'
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                >
                  <option value=''>Select a template</option>
                  {templates.map((tpl) => (
                    <option key={tpl._id} value={tpl._id}>
                      {tpl.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className='space-y-1'>
                <Label htmlFor='brevo-template-recipients'>Recipients</Label>
                <Input
                  id='brevo-template-recipients'
                  placeholder='user1@example.com, user2@example.com'
                  value={templateRecipients}
                  onChange={(e) => setTemplateRecipients(e.target.value)}
                />
              </div>
              <div className='flex justify-end gap-2'>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => {
                    setShowTemplateEmail(false)
                    setTemplateRecipients('')
                    setSelectedTemplateId('')
                  }}
                >
                  Cancel
                </Button>
                <Button size='sm' onClick={handleSendTemplateEmail} disabled={sendingTemplateEmail}>
                  {sendingTemplateEmail ? (
                    <>
                      <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                      Sending...
                    </>
                  ) : (
                    'Send Template Email'
                  )}
                </Button>
              </div>
            </div>
          )}

          {showManageTemplates && (
            <div className='mt-4 space-y-3 rounded-lg border border-slate-200 bg-white p-4'>
              <div className='flex items-center justify-between'>
                <h3 className='text-sm font-semibold'>Manage Templates</h3>
                <Button
                  size='sm'
                  variant='outline'
                  onClick={() =>
                    setEditingTemplate({ _id: '', name: '', subject: '', htmlContent: '' })
                  }
                >
                  + New Template
                </Button>
              </div>
              <div className='space-y-2'>
                {templates.length === 0 && (
                  <p className='text-xs text-muted-foreground'>No templates yet.</p>
                )}
                {templates.map((tpl) => (
                  <div
                    key={tpl._id}
                    className='flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm'
                  >
                    <div className='space-y-0.5'>
                      <p className='font-medium'>{tpl.name}</p>
                      <p className='text-xs text-muted-foreground'>{tpl.subject}</p>
                    </div>
                    <div className='flex gap-2'>
                      <Button size='sm' variant='outline' onClick={() => setEditingTemplate(tpl)}>
                        Edit
                      </Button>
                      <Button size='sm' variant='outline' onClick={() => handleDeleteTemplate(tpl._id)}>
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {editingTemplate && (
                <div className='mt-4 space-y-3 rounded-md border border-indigo-200 bg-indigo-50/60 p-3'>
                  <h4 className='text-xs font-semibold'>
                    {editingTemplate._id ? 'Edit Template' : 'New Template'}
                  </h4>
                  <div className='space-y-1'>
                    <Label htmlFor='tpl-name'>Name</Label>
                    <Input
                      id='tpl-name'
                      value={editingTemplate.name}
                      onChange={(e) =>
                        setEditingTemplate((prev) =>
                          prev ? { ...prev, name: e.target.value } : prev,
                        )
                      }
                    />
                  </div>
                  <div className='space-y-1'>
                    <Label htmlFor='tpl-subject'>Subject</Label>
                    <Input
                      id='tpl-subject'
                      value={editingTemplate.subject}
                      onChange={(e) =>
                        setEditingTemplate((prev) =>
                          prev ? { ...prev, subject: e.target.value } : prev,
                        )
                      }
                    />
                  </div>
                  <div className='space-y-1'>
                    <Label htmlFor='tpl-content'>Content (HTML)</Label>
                    <textarea
                      id='tpl-content'
                      className='min-h-[140px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
                      value={editingTemplate.htmlContent}
                      onChange={(e) =>
                        setEditingTemplate((prev) =>
                          prev ? { ...prev, htmlContent: e.target.value } : prev,
                        )
                      }
                    />
                  </div>
                  <div className='flex justify-end gap-2'>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => setEditingTemplate(null)}
                    >
                      Cancel
                    </Button>
                    <Button
                      size='sm'
                      onClick={handleSaveTemplate}
                      disabled={savingTemplate}
                    >
                      {savingTemplate ? (
                        <>
                          <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                          Saving...
                        </>
                      ) : (
                        'Save Template'
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

