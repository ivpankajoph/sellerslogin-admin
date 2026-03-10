// import { useEffect, useState } from 'react'
// import {
//   Dialog,
//   DialogContent,
//   DialogFooter,
//   DialogHeader,
//   DialogTitle,
// } from '@/components/ui/dialog'
// import { Button } from '@/components/ui/button'
// import { Input } from '@/components/ui/input'
// import { Label } from '@/components/ui/label'
// import {
//   Loader2,
//   Mail,
//   Users,
//   BarChart3,
//   History,
//   Plus,
//   Send,
//   Trash2,
//   ExternalLink,
// } from 'lucide-react'
// import { toast } from 'sonner'
// import api from '@/lib/axios'
// import {
//   Tabs,
//   TabsContent,
//   TabsList,
//   TabsTrigger,
// } from '@/components/ui/tabs'
// import {
//   Card,
//   CardContent,
//   CardDescription,
//   CardHeader,
//   CardTitle,
// } from '@/components/ui/card'
// import {
//   Table,
//   TableBody,
//   TableCell,
//   TableHead,
//   TableHeader,
//   TableRow,
// } from '@/components/ui/table'
// import { Badge } from '@/components/ui/badge'

// type BrevoTemplate = {
//   _id: string
//   name: string
//   subject: string
//   htmlContent: string
// }

// type BrevoCampaign = {
//   id: number
//   name: string
//   subject: string
//   status: string
//   sentDate?: string
// }

// type BrevoContact = {
//   email: string
//   id: number
//   createdAt: string
// }

// type BrevoStat = {
//   actionName: string
//   count: number
// }

// type EmailLog = {
//   _id: string
//   recipient_email: string
//   subject: string
//   email_type: string
//   status: string
//   createdAt: string
// }

// export default function BrevoConnectPage() {
//   const [open, setOpen] = useState(true)
//   const [apiKey, setApiKey] = useState('')
//   const [saving, setSaving] = useState(false)
//   const [connected, setConnected] = useState(false)
//   const [statusMessage, setStatusMessage] = useState<string | null>(null)

//   // Email States
//   const [showSendEmail, setShowSendEmail] = useState(false)
//   const [showBulkEmail, setShowBulkEmail] = useState(false)
//   const [showTemplateEmail, setShowTemplateEmail] = useState(false)
//   const [showManageTemplates, setShowManageTemplates] = useState(false)
//   const [toEmail, setToEmail] = useState('')
//   const [subject, setSubject] = useState('')
//   const [htmlContent, setHtmlContent] = useState('')
//   const [sendingEmail, setSendingEmail] = useState(false)
//   const [bulkRecipients, setBulkRecipients] = useState('')
//   const [bulkSubject, setBulkSubject] = useState('')
//   const [bulkContent, setBulkContent] = useState('')
//   const [sendingBulk, setSendingBulk] = useState(false)
//   const [templates, setTemplates] = useState<BrevoTemplate[]>([])
//   const [selectedTemplateId, setSelectedTemplateId] = useState('')
//   const [templateRecipients, setTemplateRecipients] = useState('')
//   const [sendingTemplateEmail, setSendingTemplateEmail] = useState(false)
//   const [editingTemplate, setEditingTemplate] = useState<BrevoTemplate | null>(null)
//   const [savingTemplate, setSavingTemplate] = useState(false)

//   // New Feature States
//   const [campaigns, setCampaigns] = useState<BrevoCampaign[]>([])
//   const [loadingCampaigns, setLoadingCampaigns] = useState(false)
//   const [contacts, setContacts] = useState<BrevoContact[]>([])
//   const [loadingContacts, setLoadingContacts] = useState(false)
//   const [stats, setStats] = useState<any[]>([])
//   const [loadingStats, setLoadingStats] = useState(false)
//   const [logs, setLogs] = useState<EmailLog[]>([])
//   const [loadingLogs, setLoadingLogs] = useState(false)

//   // Campaign Form
//   const [newCampaign, setNewCampaign] = useState({ name: '', subject: '', htmlContent: '' })
//   const [creatingCampaign, setCreatingCampaign] = useState(false)

//   // Contact Form
//   const [newContactEmail, setNewContactEmail] = useState('')
//   const [addingContact, setAddingContact] = useState(false)

//   useEffect(() => {
//     const loadStatus = async () => {
//       try {
//         const res = await api.get('/vendor/brevo/status')
//         const data = res.data?.data
//         if (data?.connected) {
//           setConnected(true)
//           setOpen(false)
//           setStatusMessage('You are connected with Brevo')
//         }
//         if (Array.isArray(data?.templates)) {
//           setTemplates(data.templates)
//         }
//       } catch {
//         // ignore if status fails
//       }
//     }
//     loadStatus()
//   }, [])

//   const handleConnect = async () => {
//     const value = apiKey.trim()
//     if (!value) {
//       toast.error('Please enter your Brevo API key')
//       return
//     }

//     try {
//       setSaving(true)
//       setStatusMessage(null)
//       const res = await api.post('/vendor/brevo/connect', {
//         api_key: value,
//       })
//       setConnected(true)
//       setStatusMessage(res?.data?.message || 'You are connected with Brevo')
//       setApiKey('')
//       setOpen(false)
//       toast.success(res?.data?.message || 'You are connected with Brevo')
//     } catch (error: any) {
//       toast.error(error?.response?.data?.message || 'Failed to connect Brevo')
//     } finally {
//       setSaving(false)
//     }
//   }

//   const handleSendEmail = async () => {
//     const to = toEmail.trim()
//     const subj = subject.trim()
//     const content = htmlContent.trim()

//     if (!to || !subj || !content) {
//       toast.error('Please fill recipient email, subject and content')
//       return
//     }

//     try {
//       setSendingEmail(true)
//       await api.post('/vendor/brevo/send-email', {
//         to,
//         subject: subj,
//         htmlContent: content,
//       })
//       toast.success('Email sent successfully via Brevo')
//       setToEmail('')
//       setSubject('')
//       setHtmlContent('')
//       loadLogs()
//     } catch (error: any) {
//       toast.error(error?.response?.data?.message || 'Failed to send email via Brevo')
//     } finally {
//       setSendingEmail(false)
//     }
//   }

//   const handleSaveTemplate = async () => {
//     const name = (editingTemplate?.name || '').trim()
//     const subj = (editingTemplate?.subject || '').trim()
//     const content = (editingTemplate?.htmlContent || '').trim()

//     if (!name || !subj || !content) {
//       toast.error('Please fill name, subject and content')
//       return
//     }

//     try {
//       setSavingTemplate(true)
//       const isNew = !editingTemplate?._id
//       const res = isNew
//         ? await api.post('/vendor/brevo/templates', {
//           name,
//           subject: subj,
//           htmlContent: content,
//         })
//         : await api.put(`/vendor/brevo/templates/${editingTemplate._id}`, {
//           name,
//           subject: subj,
//           htmlContent: content,
//         })
//       const list = res.data?.data
//       if (Array.isArray(list)) {
//         setTemplates(list)
//       }
//       setEditingTemplate(null)
//       toast.success(isNew ? 'Template created' : 'Template updated')
//     } catch (error: any) {
//       toast.error(error?.response?.data?.message || 'Failed to save template')
//     } finally {
//       setSavingTemplate(false)
//     }
//   }

//   const handleDeleteTemplate = async (templateId: string) => {
//     try {
//       const res = await api.delete(`/vendor/brevo/templates/${templateId}`)
//       const list = res.data?.data
//       if (Array.isArray(list)) {
//         setTemplates(list)
//       } else {
//         setTemplates((prev) => prev.filter((t) => t._id !== templateId))
//       }
//       if (selectedTemplateId === templateId) {
//         setSelectedTemplateId('')
//       }
//       toast.success('Template deleted')
//     } catch (error: any) {
//       toast.error(error?.response?.data?.message || 'Failed to delete template')
//     }
//   }

//   const handleSendBulkEmail = async () => {
//     const to = bulkRecipients.trim()
//     const subj = bulkSubject.trim()
//     const content = bulkContent.trim()

//     if (!to || !subj || !content) {
//       toast.error('Please fill recipients, subject and content')
//       return
//     }

//     try {
//       setSendingBulk(true)
//       await api.post('/vendor/brevo/send-bulk-email', {
//         to,
//         subject: subj,
//         htmlContent: content,
//       })
//       toast.success('Bulk email sent successfully via Brevo')
//       setBulkRecipients('')
//       setBulkSubject('')
//       setBulkContent('')
//       loadLogs()
//     } catch (error: any) {
//       toast.error(error?.response?.data?.message || 'Failed to send bulk email via Brevo')
//     } finally {
//       setSendingBulk(false)
//     }
//   }

//   const handleSendTemplateEmail = async () => {
//     const to = templateRecipients.trim()
//     if (!selectedTemplateId || !to) {
//       toast.error('Please select a template and recipients')
//       return
//     }

//     try {
//       setSendingTemplateEmail(true)
//       await api.post('/vendor/brevo/send-template-email', {
//         to,
//         templateId: selectedTemplateId,
//       })
//       toast.success('Template email sent successfully via Brevo')
//       setTemplateRecipients('')
//       loadLogs()
//     } catch (error: any) {
//       toast.error(error?.response?.data?.message || 'Failed to send template email via Brevo')
//     } finally {
//       setSendingTemplateEmail(false)
//     }
//   }

//   // New Feature Handlers
//   const loadCampaigns = async () => {
//     try {
//       setLoadingCampaigns(true)
//       const res = await api.get('/vendor/brevo/campaigns')
//       setCampaigns(res.data?.data?.campaigns || [])
//     } catch (error: any) {
//       toast.error('Failed to load campaigns')
//     } finally {
//       setLoadingCampaigns(false)
//     }
//   }

//   const handleCreateCampaign = async () => {
//     if (!newCampaign.name || !newCampaign.subject || !newCampaign.htmlContent) {
//       toast.error('Please fill all fields for the campaign')
//       return
//     }
//     try {
//       setCreatingCampaign(true)
//       await api.post('/vendor/brevo/campaigns', {
//         ...newCampaign,
//         sender: { name: 'Store Owner', email: 'abdul.oph305@gmail.com' }, // Placeholder or vendor specific
//         type: 'classic',
//       })
//       toast.success('Campaign created successfully')
//       setNewCampaign({ name: '', subject: '', htmlContent: '' })
//       loadCampaigns()
//     } catch (error: any) {
//       toast.error(error?.response?.data?.message || 'Failed to create campaign')
//     } finally {
//       setCreatingCampaign(false)
//     }
//   }

//   const handleSendCampaign = async (campaignId: number) => {
//     try {
//       await api.post(`/vendor/brevo/campaigns/${campaignId}/send`)
//       toast.success('Campaign sending initiated')
//       loadCampaigns()
//       loadLogs()
//     } catch (error: any) {
//       toast.error(error?.response?.data?.message || 'Failed to send campaign')
//     }
//   }

//   const loadContacts = async () => {
//     try {
//       setLoadingContacts(true)
//       const res = await api.get('/vendor/brevo/contacts')
//       setContacts(res.data?.data?.contacts || [])
//     } catch (error: any) {
//       toast.error('Failed to load contacts')
//     } finally {
//       setLoadingContacts(false)
//     }
//   }

//   const handleAddContact = async () => {
//     if (!newContactEmail.trim()) {
//       toast.error('Email is required')
//       return
//     }
//     try {
//       setAddingContact(true)
//       await api.post('/vendor/brevo/contacts', {
//         email: newContactEmail,
//         listIds: [2], // Default list or pick from lists
//       })
//       toast.success('Contact added')
//       setNewContactEmail('')
//       loadContacts()
//     } catch (error: any) {
//       toast.error(error?.response?.data?.message || 'Failed to add contact')
//     } finally {
//       setAddingContact(false)
//     }
//   }

//   const loadStats = async () => {
//     try {
//       setLoadingStats(true)
//       const res = await api.get('/vendor/brevo/analytics')
//       setStats(res.data?.data || [])
//     } catch (error: any) {
//       toast.error('Failed to load analytics')
//     } finally {
//       setLoadingStats(false)
//     }
//   }

//   const loadLogs = async () => {
//     try {
//       setLoadingLogs(true)
//       const res = await api.get('/vendor/brevo/logs')
//       setLogs(res.data?.data || [])
//     } catch (error: any) {
//       toast.error('Failed to load logs')
//     } finally {
//       setLoadingLogs(false)
//     }
//   }

//   return (
//     <div className='space-y-6 p-4 md:p-8'>
//       <Dialog open={open} onOpenChange={setOpen}>
//         <DialogContent>
//           <DialogHeader>
//             <DialogTitle>Connect with Brevo</DialogTitle>
//           </DialogHeader>
//           <div className='mt-2 space-y-4'>
//             <div className='space-y-2'>
//               <Label htmlFor='brevo-api-key'>Brevo API key</Label>
//               <Input
//                 id='brevo-api-key'
//                 type='password'
//                 placeholder='Enter your Brevo API key'
//                 value={apiKey}
//                 onChange={(e) => setApiKey(e.target.value)}
//               />
//             </div>
//             {statusMessage && (
//               <p className='rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800'>
//                 {statusMessage}
//               </p>
//             )}
//           </div>
//           <DialogFooter>
//             <Button variant='outline' onClick={() => setOpen(false)}>
//               Close
//             </Button>
//             <Button onClick={handleConnect} disabled={saving}>
//               {saving ? (
//                 <>
//                   <Loader2 className='mr-2 h-4 w-4 animate-spin' />
//                   Connecting...
//                 </>
//               ) : (
//                 'Connect'
//               )}
//             </Button>
//           </DialogFooter>
//         </DialogContent>
//       </Dialog>

//       <div className='flex items-center justify-between'>
//         <div className='space-y-1'>
//           <h1 className='text-2xl font-bold tracking-tight'>Brevo Marketing Hub</h1>
//           <p className='text-sm text-muted-foreground'>
//             Manage your email campaigns, contacts, and track performance.
//           </p>
//         </div>
//         {!connected && (
//           <Button onClick={() => setOpen(true)}>Connect Brevo Account</Button>
//         )}
//       </div>

//       {connected && (
//         <Tabs defaultValue='overview' className='space-y-4' onValueChange={(val) => {
//           if (val === 'campaigns') loadCampaigns()
//           if (val === 'contacts') loadContacts()
//           if (val === 'analytics') loadStats()
//           if (val === 'logs') loadLogs()
//         }}>
//           <TabsList className='grid w-full grid-cols-2 md:w-auto md:grid-cols-5'>
//             <TabsTrigger value='overview' className='gap-2'>
//               <Mail className='h-4 w-4' />
//               Emails
//             </TabsTrigger>
//             <TabsTrigger value='campaigns' className='gap-2'>
//               <Send className='h-4 w-4' />
//               Campaigns
//             </TabsTrigger>
//             <TabsTrigger value='contacts' className='gap-2'>
//               <Users className='h-4 w-4' />
//               Contacts
//             </TabsTrigger>
//             <TabsTrigger value='analytics' className='gap-2'>
//               <BarChart3 className='h-4 w-4' />
//               Analytics
//             </TabsTrigger>
//             <TabsTrigger value='logs' className='gap-2'>
//               <History className='h-4 w-4' />
//               Logs
//             </TabsTrigger>
//           </TabsList>

//           <TabsContent value='overview' className='space-y-4'>
//             <div className='flex flex-wrap gap-2'>
//               <Button size='sm' onClick={() => {
//                 setShowSendEmail(!showSendEmail)
//                 setShowBulkEmail(false)
//                 setShowTemplateEmail(false)
//                 setShowManageTemplates(false)
//               }}>
//                 {showSendEmail ? 'Close Single Email' : 'Send Email'}
//               </Button>
//               <Button size='sm' variant={showBulkEmail ? 'default' : 'outline'} onClick={() => {
//                 setShowSendEmail(false)
//                 setShowBulkEmail(!showBulkEmail)
//                 setShowTemplateEmail(false)
//                 setShowManageTemplates(false)
//               }}>
//                 {showBulkEmail ? 'Close Bulk' : 'Send Bulk Email'}
//               </Button>
//               <Button size='sm' variant={showTemplateEmail ? 'default' : 'outline'} onClick={() => {
//                 setShowSendEmail(false)
//                 setShowBulkEmail(false)
//                 setShowTemplateEmail(!showTemplateEmail)
//                 setShowManageTemplates(false)
//               }}>
//                 {showTemplateEmail ? 'Close Template' : 'Send Template Email'}
//               </Button>
//               <Button size='sm' variant={showManageTemplates ? 'default' : 'outline'} onClick={() => {
//                 setShowSendEmail(false)
//                 setShowBulkEmail(false)
//                 setShowTemplateEmail(false)
//                 setShowManageTemplates(!showManageTemplates)
//               }}>
//                 {showManageTemplates ? 'Close Manage' : 'Manage Templates'}
//               </Button>
//             </div>

//             {showSendEmail && (
//               <Card className='mt-4'>
//                 <CardHeader>
//                   <CardTitle className='text-sm'>Send Single Email</CardTitle>
//                 </CardHeader>
//                 <CardContent className='space-y-4'>
//                   <div className='space-y-2'>
//                     <Label>Recipient Email</Label>
//                     <Input placeholder='customer@example.com' value={toEmail} onChange={(e) => setToEmail(e.target.value)} />
//                   </div>
//                   <div className='space-y-2'>
//                     <Label>Subject</Label>
//                     <Input placeholder='Hello from Store' value={subject} onChange={(e) => setSubject(e.target.value)} />
//                   </div>
//                   <div className='space-y-2'>
//                     <Label>Content (HTML)</Label>
//                     <textarea value={htmlContent} onChange={(e) => setHtmlContent(e.target.value)} className='min-h-[160px] w-full rounded-md border border-input p-2 text-sm' />
//                   </div>
//                   <Button onClick={handleSendEmail} disabled={sendingEmail}>
//                     {sendingEmail ? <Loader2 className='mr-2 h-4 w-4 animate-spin' /> : <Send className='mr-2 h-4 w-4' />}
//                     Send Now
//                   </Button>
//                 </CardContent>
//               </Card>
//             )}

//             {showBulkEmail && (
//               <Card className='mt-4'>
//                 <CardHeader>
//                   <CardTitle className='text-sm'>Send Bulk Email</CardTitle>
//                   <CardDescription>Enter comma separated emails</CardDescription>
//                 </CardHeader>
//                 <CardContent className='space-y-4'>
//                   <div className='space-y-2'>
//                     <Label>Recipients</Label>
//                     <Input placeholder='a@b.com, c@d.com' value={bulkRecipients} onChange={(e) => setBulkRecipients(e.target.value)} />
//                   </div>
//                   <div className='space-y-2'>
//                     <Label>Subject</Label>
//                     <Input value={bulkSubject} onChange={(e) => setBulkSubject(e.target.value)} />
//                   </div>
//                   <div className='space-y-2'>
//                     <Label>Content</Label>
//                     <textarea value={bulkContent} onChange={(e) => setBulkContent(e.target.value)} className='min-h-[160px] w-full rounded-md border border-input p-2 text-sm' />
//                   </div>
//                   <Button onClick={handleSendBulkEmail} disabled={sendingBulk}>
//                     {sendingBulk ? <Loader2 className='mr-2 h-4 w-4 animate-spin' /> : <Send className='mr-2 h-4 w-4' />}
//                     Send Bulk
//                   </Button>
//                 </CardContent>
//               </Card>
//             )}

//             {showTemplateEmail && (
//               <Card className='mt-4'>
//                 <CardHeader>
//                   <CardTitle className='text-sm'>Send with Template</CardTitle>
//                 </CardHeader>
//                 <CardContent className='space-y-4'>
//                   <div className='space-y-2'>
//                     <Label>Select Template</Label>
//                     <select value={selectedTemplateId} onChange={(e) => setSelectedTemplateId(e.target.value)} className='w-full rounded-md border border-input p-2 text-sm'>
//                       <option value=''>-- Select --</option>
//                       {templates.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
//                     </select>
//                   </div>
//                   <div className='space-y-2'>
//                     <Label>Recipients</Label>
//                     <Input value={templateRecipients} onChange={(e) => setTemplateRecipients(e.target.value)} />
//                   </div>
//                   <Button onClick={handleSendTemplateEmail} disabled={sendingTemplateEmail}>
//                     Send Template Email
//                   </Button>
//                 </CardContent>
//               </Card>
//             )}

//             {showManageTemplates && (
//               <Card className='mt-4'>
//                 <CardHeader className='flex-row items-center justify-between'>
//                   <CardTitle className='text-sm'>Templates Repository</CardTitle>
//                   <Button size='sm' onClick={() => setEditingTemplate({ _id: '', name: '', subject: '', htmlContent: '' })}>
//                     <Plus className='mr-2 h-4 w-4' /> New
//                   </Button>
//                 </CardHeader>
//                 <CardContent className='space-y-4'>
//                   {templates.map(t => (
//                     <div key={t._id} className='flex items-center justify-between rounded-lg border p-3'>
//                       <div>
//                         <p className='font-medium'>{t.name}</p>
//                         <p className='text-xs text-muted-foreground'>{t.subject}</p>
//                       </div>
//                       <div className='flex gap-2'>
//                         <Button variant='ghost' size='sm' onClick={() => setEditingTemplate(t)}>Edit</Button>
//                         <Button variant='ghost' size='sm' className='text-destructive' onClick={() => handleDeleteTemplate(t._id)}><Trash2 className='h-4 w-4' /></Button>
//                       </div>
//                     </div>
//                   ))}
//                   {editingTemplate && (
//                     <div className='space-y-3 rounded-lg bg-secondary/20 p-4'>
//                       <h4 className='font-semibold'>{editingTemplate._id ? 'Edit' : 'Create'} Template</h4>
//                       <Input placeholder='Template Name' value={editingTemplate.name} onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })} />
//                       <Input placeholder='Subject' value={editingTemplate.subject} onChange={(e) => setEditingTemplate({ ...editingTemplate, subject: e.target.value })} />
//                       <textarea placeholder='HTML Content' value={editingTemplate.htmlContent} onChange={(e) => setEditingTemplate({ ...editingTemplate, htmlContent: e.target.value })} className='min-h-[120px] w-full rounded-md border p-2 text-sm' />
//                       <div className='flex justify-end gap-2'>
//                         <Button variant='outline' size='sm' onClick={() => setEditingTemplate(null)}>Cancel</Button>
//                         <Button size='sm' onClick={handleSaveTemplate} disabled={savingTemplate}>Save</Button>
//                       </div>
//                     </div>
//                   )}
//                 </CardContent>
//               </Card>
//             )}
//           </TabsContent>

//           <TabsContent value='campaigns' className='space-y-4'>
//             <div className='grid gap-4 md:grid-cols-2'>
//               <Card>
//                 <CardHeader>
//                   <CardTitle>Email Campaigns</CardTitle>
//                   <CardDescription>Manage and send your marketing campaigns.</CardDescription>
//                 </CardHeader>
//                 <CardContent className='space-y-4'>
//                   {loadingCampaigns ? <Loader2 className='h-4 w-4 animate-spin' /> : campaigns.map(c => (
//                     <div key={c.id} className='flex items-center justify-between rounded-lg border p-3'>
//                       <div>
//                         <p className='font-medium'>{c.name}</p>
//                         <Badge variant='outline'>{c.status}</Badge>
//                       </div>
//                       {c.status === 'draft' && (
//                         <Button size='sm' onClick={() => handleSendCampaign(c.id)}>Send Now</Button>
//                       )}
//                     </div>
//                   ))}
//                 </CardContent>
//               </Card>

//               <Card>
//                 <CardHeader>
//                   <CardTitle>Create Campaign</CardTitle>
//                 </CardHeader>
//                 <CardContent className='space-y-4'>
//                   <div className='space-y-2'>
//                     <Label>Campaign Name</Label>
//                     <Input value={newCampaign.name} onChange={e => setNewCampaign({ ...newCampaign, name: e.target.value })} />
//                   </div>
//                   <div className='space-y-2'>
//                     <Label>Subject Line</Label>
//                     <Input value={newCampaign.subject} onChange={e => setNewCampaign({ ...newCampaign, subject: e.target.value })} />
//                   </div>
//                   <div className='space-y-2'>
//                     <Label>HTML Content</Label>
//                     <textarea value={newCampaign.htmlContent} onChange={e => setNewCampaign({ ...newCampaign, htmlContent: e.target.value })} className='min-h-[140px] w-full rounded-md border p-2 text-sm' />
//                   </div>
//                   <Button className='w-full' onClick={handleCreateCampaign} disabled={creatingCampaign}>
//                     {creatingCampaign && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
//                     Save Campaign
//                   </Button>
//                 </CardContent>
//               </Card>
//             </div>
//           </TabsContent>

//           <TabsContent value='contacts' className='space-y-4'>
//             <Card>
//               <CardHeader className='flex-row items-center justify-between space-y-0'>
//                 <div>
//                   <CardTitle>Subscribers</CardTitle>
//                   <CardDescription>Manage your contact lists and subscribers.</CardDescription>
//                 </div>
//                 <div className='flex gap-2'>
//                   <Input placeholder='New contact email' value={newContactEmail} onChange={e => setNewContactEmail(e.target.value)} className='w-64' />
//                   <Button onClick={handleAddContact} disabled={addingContact}>Add Contact</Button>
//                 </div>
//               </CardHeader>
//               <CardContent>
//                 <Table>
//                   <TableHeader>
//                     <TableRow>
//                       <TableHead>Email</TableHead>
//                       <TableHead>Added On</TableHead>
//                       <TableHead>Status</TableHead>
//                     </TableRow>
//                   </TableHeader>
//                   <TableBody>
//                     {loadingContacts ? (
//                       <TableRow><TableCell colSpan={3} className='text-center'>Loading...</TableCell></TableRow>
//                     ) : contacts.map(contact => (
//                       <TableRow key={contact.id}>
//                         <TableCell>{contact.email}</TableCell>
//                         <TableCell>{new Date(contact.createdAt).toLocaleDateString()}</TableCell>
//                         <TableCell><Badge>Subscribed</Badge></TableCell>
//                       </TableRow>
//                     ))}
//                   </TableBody>
//                 </Table>
//               </CardContent>
//             </Card>
//           </TabsContent>

//           <TabsContent value='analytics' className='space-y-4'>
//             <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
//               <Card>
//                 <CardHeader className='flex-row items-center justify-between pb-2'>
//                   <CardTitle className='text-sm font-medium'>Total Sent</CardTitle>
//                 </CardHeader>
//                 <CardContent>
//                   <div className='text-2xl font-bold'>{stats.find(s => s.actionName === 'sent')?.count || 0}</div>
//                 </CardContent>
//               </Card>
//               <Card>
//                 <CardHeader className='flex-row items-center justify-between pb-2'>
//                   <CardTitle className='text-sm font-medium'>Opens</CardTitle>
//                 </CardHeader>
//                 <CardContent>
//                   <div className='text-2xl font-bold'>{stats.find(s => s.actionName === 'opened')?.count || 0}</div>
//                 </CardContent>
//               </Card>
//               <Card>
//                 <CardHeader className='flex-row items-center justify-between pb-2'>
//                   <CardTitle className='text-sm font-medium'>Clicks</CardTitle>
//                 </CardHeader>
//                 <CardContent>
//                   <div className='text-2xl font-bold'>{stats.find(s => s.actionName === 'clicked')?.count || 0}</div>
//                 </CardContent>
//               </Card>
//               <Card>
//                 <CardHeader className='flex-row items-center justify-between pb-2'>
//                   <CardTitle className='text-sm font-medium'>Bounces</CardTitle>
//                 </CardHeader>
//                 <CardContent>
//                   <div className='text-2xl font-bold text-destructive'>{stats.find(s => s.actionName === 'bounces')?.count || 0}</div>
//                 </CardContent>
//               </Card>
//             </div>
//             <Card>
//               <CardHeader>
//                 <CardTitle>Performance Overview</CardTitle>
//               </CardHeader>
//               <CardContent className='h-[200px] flex items-center justify-center border-t'>
//                 <p className='text-sm text-muted-foreground'>Detailed analytics charts will appear here as campaign data accumulates.</p>
//               </CardContent>
//             </Card>
//           </TabsContent>

//           <TabsContent value='logs' className='space-y-4'>
//             <Card>
//               <CardHeader>
//                 <CardTitle>System Activity Logs</CardTitle>
//                 <CardDescription>Track all local email dispatch history.</CardDescription>
//               </CardHeader>
//               <CardContent>
//                 <Table>
//                   <TableHeader>
//                     <TableRow>
//                       <TableHead>Date</TableHead>
//                       <TableHead>Type</TableHead>
//                       <TableHead>Recipient</TableHead>
//                       <TableHead>Subject</TableHead>
//                       <TableHead>Status</TableHead>
//                     </TableRow>
//                   </TableHeader>
//                   <TableBody>
//                     {loadingLogs ? (
//                       <TableRow><TableCell colSpan={5} className='text-center'>Loading...</TableCell></TableRow>
//                     ) : logs.map(log => (
//                       <TableRow key={log._id}>
//                         <TableCell className='whitespace-nowrap'>{new Date(log.createdAt).toLocaleString()}</TableCell>
//                         <TableCell className='capitalize'>{log.email_type}</TableCell>
//                         <TableCell className='max-w-[150px] truncate'>{log.recipient_email}</TableCell>
//                         <TableCell className='max-w-[200px] truncate'>{log.subject}</TableCell>
//                         <TableCell>
//                           <Badge variant={log.status === 'sent' ? 'default' : 'destructive'} className='capitalize'>
//                             {log.status}
//                           </Badge>
//                         </TableCell>
//                       </TableRow>
//                     ))}
//                   </TableBody>
//                 </Table>
//               </CardContent>
//             </Card>
//           </TabsContent>
//         </Tabs>
//       )}
//     </div>
//   )
// }



import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Loader2,
  Mail,
  Users,
  BarChart3,
  History,
  Plus,
  Send,
  Trash2,
  ExternalLink,
} from 'lucide-react'
import { toast } from 'sonner'
import api from '@/lib/axios'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

type BrevoTemplate = {
  _id: string
  name: string
  subject: string
  htmlContent: string
}

type BrevoCampaign = {
  id: number
  name: string
  subject: string
  status: string
  sentDate?: string
}

type BrevoContact = {
  email: string
  id: number
  createdAt: string
}

type BrevoStat = {
  actionName: string
  count: number
}

type EmailLog = {
  _id: string
  recipient_email: string
  subject: string
  email_type: string
  status: string
  createdAt: string
}

export default function BrevoConnectPage() {
  const [open, setOpen] = useState(true)
  const [apiKey, setApiKey] = useState('')
  const [saving, setSaving] = useState(false)
  const [connected, setConnected] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  // Email States
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

  // New Feature States
  const [campaigns, setCampaigns] = useState<BrevoCampaign[]>([])
  const [loadingCampaigns, setLoadingCampaigns] = useState(false)
  const [contacts, setContacts] = useState<BrevoContact[]>([])
  const [loadingContacts, setLoadingContacts] = useState(false)
  const [stats, setStats] = useState<BrevoStat[]>([])
  const [loadingStats, setLoadingStats] = useState(false)
  const [logs, setLogs] = useState<EmailLog[]>([])
  const [loadingLogs, setLoadingLogs] = useState(false)

  // Campaign Form
  const [newCampaign, setNewCampaign] = useState({ name: '', subject: '', htmlContent: '' })
  const [creatingCampaign, setCreatingCampaign] = useState(false)

  // Contact Form
  const [newContactEmail, setNewContactEmail] = useState('')
  const [addingContact, setAddingContact] = useState(false)

  useEffect(() => {
    const loadStatus = async () => {
      try {
        const res = await api.get('/vendor/brevo/status')
        const data = res.data?.data
        if (data?.connected) {
          setConnected(true)
          setOpen(false)
          setStatusMessage('You are connected with Brevo')
        }
        if (Array.isArray(data?.templates)) {
          setTemplates(data.templates)
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
      toast.error(error?.response?.data?.message || 'Failed to connect Brevo')
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
      loadLogs()
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to send email via Brevo')
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
      toast.error(error?.response?.data?.message || 'Failed to save template')
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
      toast.error(error?.response?.data?.message || 'Failed to delete template')
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
      loadLogs()
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to send bulk email via Brevo')
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
      loadLogs()
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to send template email via Brevo')
    } finally {
      setSendingTemplateEmail(false)
    }
  }

  // New Feature Handlers
  const loadCampaigns = async () => {
    try {
      setLoadingCampaigns(true)
      const res = await api.get('/vendor/brevo/campaigns')
      const campaignsData = res.data?.data?.campaigns
      setCampaigns(Array.isArray(campaignsData) ? campaignsData : [])
    } catch (error: any) {
      toast.error('Failed to load campaigns')
      setCampaigns([])
    } finally {
      setLoadingCampaigns(false)
    }
  }

  const handleCreateCampaign = async () => {
    if (!newCampaign.name || !newCampaign.subject || !newCampaign.htmlContent) {
      toast.error('Please fill all fields for the campaign')
      return
    }
    try {
      setCreatingCampaign(true)
      await api.post('/vendor/brevo/campaigns', {
        ...newCampaign,
        sender: { name: 'Store Owner', email: 'abdul.oph305@gmail.com' }, // Placeholder or vendor specific
        type: 'classic',
      })
      toast.success('Campaign created successfully')
      setNewCampaign({ name: '', subject: '', htmlContent: '' })
      loadCampaigns()
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to create campaign')
    } finally {
      setCreatingCampaign(false)
    }
  }

  const handleSendCampaign = async (campaignId: number) => {
    try {
      await api.post(`/vendor/brevo/campaigns/${campaignId}/send`)
      toast.success('Campaign sending initiated')
      loadCampaigns()
      loadLogs()
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to send campaign')
    }
  }

  const loadContacts = async () => {
    try {
      setLoadingContacts(true)
      const res = await api.get('/vendor/brevo/contacts')
      const contactsData = res.data?.data?.contacts
      setContacts(Array.isArray(contactsData) ? contactsData : [])
    } catch (error: any) {
      toast.error('Failed to load contacts')
      setContacts([])
    } finally {
      setLoadingContacts(false)
    }
  }

  const handleAddContact = async () => {
    if (!newContactEmail.trim()) {
      toast.error('Email is required')
      return
    }
    try {
      setAddingContact(true)
      await api.post('/vendor/brevo/contacts', {
        email: newContactEmail,
        listIds: [2], // Default list or pick from lists
      })
      toast.success('Contact added')
      setNewContactEmail('')
      loadContacts()
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to add contact')
    } finally {
      setAddingContact(false)
    }
  }

  const loadStats = async () => {
    try {
      setLoadingStats(true)
      const res = await api.get('/vendor/brevo/analytics')
      const data = res.data?.data
      // Ensure data is an array
      setStats(Array.isArray(data) ? data : [])
    } catch (error: any) {
      toast.error('Failed to load analytics')
      setStats([])
    } finally {
      setLoadingStats(false)
    }
  }

  const loadLogs = async () => {
    try {
      setLoadingLogs(true)
      const res = await api.get('/vendor/brevo/logs')
      const logsData = res.data?.data
      setLogs(Array.isArray(logsData) ? logsData : [])
    } catch (error: any) {
      toast.error('Failed to load logs')
      setLogs([])
    } finally {
      setLoadingLogs(false)
    }
  }

  // Helper function to safely get stat count
  const getStatCount = (actionName: string): number => {
    if (!Array.isArray(stats)) return 0
    const stat = stats.find(s => s.actionName === actionName)
    return stat?.count || 0
  }

  return (
    <div className='space-y-6 p-4 md:p-8'>
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
            <Button variant='outline' onClick={() => setOpen(false)}>
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

      <div className='flex items-center justify-between'>
        <div className='space-y-1'>
          <h1 className='text-2xl font-bold tracking-tight'>Brevo Marketing Hub</h1>
          <p className='text-sm text-muted-foreground'>
            Manage your email campaigns, contacts, and track performance.
          </p>
        </div>
        {!connected && (
          <Button onClick={() => setOpen(true)}>Connect Brevo Account</Button>
        )}
      </div>

      {connected && (
        <Tabs defaultValue='overview' className='space-y-4' onValueChange={(val) => {
          if (val === 'campaigns') loadCampaigns()
          if (val === 'contacts') loadContacts()
          if (val === 'analytics') loadStats()
          if (val === 'logs') loadLogs()
        }}>
          <TabsList className='grid w-full grid-cols-2 md:w-auto md:grid-cols-5'>
            <TabsTrigger value='overview' className='gap-2'>
              <Mail className='h-4 w-4' />
              Emails
            </TabsTrigger>
            <TabsTrigger value='campaigns' className='gap-2'>
              <Send className='h-4 w-4' />
              Campaigns
            </TabsTrigger>
            <TabsTrigger value='contacts' className='gap-2'>
              <Users className='h-4 w-4' />
              Contacts
            </TabsTrigger>
            <TabsTrigger value='analytics' className='gap-2'>
              <BarChart3 className='h-4 w-4' />
              Analytics
            </TabsTrigger>
            <TabsTrigger value='logs' className='gap-2'>
              <History className='h-4 w-4' />
              Logs
            </TabsTrigger>
          </TabsList>

          <TabsContent value='overview' className='space-y-4'>
            <div className='flex flex-wrap gap-2'>
              <Button size='sm' onClick={() => {
                setShowSendEmail(!showSendEmail)
                setShowBulkEmail(false)
                setShowTemplateEmail(false)
                setShowManageTemplates(false)
              }}>
                {showSendEmail ? 'Close Single Email' : 'Send Email'}
              </Button>
              <Button size='sm' variant={showBulkEmail ? 'default' : 'outline'} onClick={() => {
                setShowSendEmail(false)
                setShowBulkEmail(!showBulkEmail)
                setShowTemplateEmail(false)
                setShowManageTemplates(false)
              }}>
                {showBulkEmail ? 'Close Bulk' : 'Send Bulk Email'}
              </Button>
              <Button size='sm' variant={showTemplateEmail ? 'default' : 'outline'} onClick={() => {
                setShowSendEmail(false)
                setShowBulkEmail(false)
                setShowTemplateEmail(!showTemplateEmail)
                setShowManageTemplates(false)
              }}>
                {showTemplateEmail ? 'Close Template' : 'Send Template Email'}
              </Button>
              <Button size='sm' variant={showManageTemplates ? 'default' : 'outline'} onClick={() => {
                setShowSendEmail(false)
                setShowBulkEmail(false)
                setShowTemplateEmail(false)
                setShowManageTemplates(!showManageTemplates)
              }}>
                {showManageTemplates ? 'Close Manage' : 'Manage Templates'}
              </Button>
            </div>

            {showSendEmail && (
              <Card className='mt-4'>
                <CardHeader>
                  <CardTitle className='text-sm'>Send Single Email</CardTitle>
                </CardHeader>
                <CardContent className='space-y-4'>
                  <div className='space-y-2'>
                    <Label>Recipient Email</Label>
                    <Input placeholder='customer@example.com' value={toEmail} onChange={(e) => setToEmail(e.target.value)} />
                  </div>
                  <div className='space-y-2'>
                    <Label>Subject</Label>
                    <Input placeholder='Hello from Store' value={subject} onChange={(e) => setSubject(e.target.value)} />
                  </div>
                  <div className='space-y-2'>
                    <Label>Content (HTML)</Label>
                    <textarea value={htmlContent} onChange={(e) => setHtmlContent(e.target.value)} className='min-h-[160px] w-full rounded-md border border-input p-2 text-sm' />
                  </div>
                  <Button onClick={handleSendEmail} disabled={sendingEmail}>
                    {sendingEmail ? <Loader2 className='mr-2 h-4 w-4 animate-spin' /> : <Send className='mr-2 h-4 w-4' />}
                    Send Now
                  </Button>
                </CardContent>
              </Card>
            )} 

            {showBulkEmail && (
              <Card className='mt-4'>
                <CardHeader>
                  <CardTitle className='text-sm'>Send Bulk Email</CardTitle>
                  <CardDescription>Enter comma separated emails</CardDescription>
                </CardHeader>
                <CardContent className='space-y-4'>
                  <div className='space-y-2'>
                    <Label>Recipients</Label>
                    <Input placeholder='a@b.com, c@d.com' value={bulkRecipients} onChange={(e) => setBulkRecipients(e.target.value)} />
                  </div>
                  <div className='space-y-2'>
                    <Label>Subject</Label>
                    <Input value={bulkSubject} onChange={(e) => setBulkSubject(e.target.value)} />
                  </div>
                  <div className='space-y-2'>
                    <Label>Content</Label>
                    <textarea value={bulkContent} onChange={(e) => setBulkContent(e.target.value)} className='min-h-[160px] w-full rounded-md border border-input p-2 text-sm' />
                  </div>
                  <Button onClick={handleSendBulkEmail} disabled={sendingBulk}>
                    {sendingBulk ? <Loader2 className='mr-2 h-4 w-4 animate-spin' /> : <Send className='mr-2 h-4 w-4' />}
                    Send Bulk
                  </Button>
                </CardContent>
              </Card>
            )}

            {showTemplateEmail && (
              <Card className='mt-4'>
                <CardHeader>
                  <CardTitle className='text-sm'>Send with Template</CardTitle>
                </CardHeader>
                <CardContent className='space-y-4'>
                  <div className='space-y-2'>
                    <Label>Select Template</Label>
                    <select value={selectedTemplateId} onChange={(e) => setSelectedTemplateId(e.target.value)} className='w-full rounded-md border border-input p-2 text-sm'>
                      <option value=''>-- Select --</option>
                      {templates.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
                    </select>
                  </div>
                  <div className='space-y-2'>
                    <Label>Recipients</Label>
                    <Input value={templateRecipients} onChange={(e) => setTemplateRecipients(e.target.value)} />
                  </div>
                  <Button onClick={handleSendTemplateEmail} disabled={sendingTemplateEmail}>
                    Send Template Email
                  </Button>
                </CardContent>
              </Card>
            )}

            {showManageTemplates && (
              <Card className='mt-4'>
                <CardHeader className='flex-row items-center justify-between'>
                  <CardTitle className='text-sm'>Templates Repository</CardTitle>
                  <Button size='sm' onClick={() => setEditingTemplate({ _id: '', name: '', subject: '', htmlContent: '' })}>
                    <Plus className='mr-2 h-4 w-4' /> New
                  </Button>
                </CardHeader>
                <CardContent className='space-y-4'>
                  {templates.map(t => (
                    <div key={t._id} className='flex items-center justify-between rounded-lg border p-3'>
                      <div>
                        <p className='font-medium'>{t.name}</p>
                        <p className='text-xs text-muted-foreground'>{t.subject}</p>
                      </div>
                      <div className='flex gap-2'>
                        <Button variant='ghost' size='sm' onClick={() => setEditingTemplate(t)}>Edit</Button>
                        <Button variant='ghost' size='sm' className='text-destructive' onClick={() => handleDeleteTemplate(t._id)}><Trash2 className='h-4 w-4' /></Button>
                      </div>
                    </div>
                  ))}
                  {editingTemplate && (
                    <div className='space-y-3 rounded-lg bg-secondary/20 p-4'>
                      <h4 className='font-semibold'>{editingTemplate._id ? 'Edit' : 'Create'} Template</h4>
                      <Input placeholder='Template Name' value={editingTemplate.name} onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })} />
                      <Input placeholder='Subject' value={editingTemplate.subject} onChange={(e) => setEditingTemplate({ ...editingTemplate, subject: e.target.value })} />
                      <textarea placeholder='HTML Content' value={editingTemplate.htmlContent} onChange={(e) => setEditingTemplate({ ...editingTemplate, htmlContent: e.target.value })} className='min-h-[120px] w-full rounded-md border p-2 text-sm' />
                      <div className='flex justify-end gap-2'>
                        <Button variant='outline' size='sm' onClick={() => setEditingTemplate(null)}>Cancel</Button>
                        <Button size='sm' onClick={handleSaveTemplate} disabled={savingTemplate}>Save</Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value='campaigns' className='space-y-4'>
            <div className='grid gap-4 md:grid-cols-2'>
              <Card>
                <CardHeader>
                  <CardTitle>Email Campaigns</CardTitle>
                  <CardDescription>Manage and send your marketing campaigns.</CardDescription>
                </CardHeader>
                <CardContent className='space-y-4'>
                  {loadingCampaigns ? (
                    <div className='flex justify-center py-4'>
                      <Loader2 className='h-6 w-6 animate-spin' />
                    </div>
                  ) : campaigns.length === 0 ? (
                    <p className='text-sm text-muted-foreground text-center py-4'>No campaigns found</p>
                  ) : (
                    campaigns.map(c => (
                      <div key={c.id} className='flex items-center justify-between rounded-lg border p-3'>
                        <div>
                          <p className='font-medium'>{c.name}</p>
                          <Badge variant='outline'>{c.status}</Badge>
                        </div>
                        {c.status === 'draft' && (
                          <Button size='sm' onClick={() => handleSendCampaign(c.id)}>Send Now</Button>
                        )}
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Create Campaign</CardTitle>
                </CardHeader>
                <CardContent className='space-y-4'>
                  <div className='space-y-2'>
                    <Label>Campaign Name</Label>
                    <Input value={newCampaign.name} onChange={e => setNewCampaign({ ...newCampaign, name: e.target.value })} />
                  </div>
                  <div className='space-y-2'>
                    <Label>Subject Line</Label>
                    <Input value={newCampaign.subject} onChange={e => setNewCampaign({ ...newCampaign, subject: e.target.value })} />
                  </div>
                  <div className='space-y-2'>
                    <Label>HTML Content</Label>
                    <textarea value={newCampaign.htmlContent} onChange={e => setNewCampaign({ ...newCampaign, htmlContent: e.target.value })} className='min-h-[140px] w-full rounded-md border p-2 text-sm' />
                  </div>
                  <Button className='w-full' onClick={handleCreateCampaign} disabled={creatingCampaign}>
                    {creatingCampaign && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
                    Save Campaign
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value='contacts' className='space-y-4'>
            <Card>
              <CardHeader className='flex-row items-center justify-between space-y-0'>
                <div>
                  <CardTitle>Subscribers</CardTitle>
                  <CardDescription>Manage your contact lists and subscribers.</CardDescription>
                </div>
                <div className='flex gap-2'>
                  <Input placeholder='New contact email' value={newContactEmail} onChange={e => setNewContactEmail(e.target.value)} className='w-64' />
                  <Button onClick={handleAddContact} disabled={addingContact}>
                    {addingContact ? <Loader2 className='h-4 w-4 animate-spin' /> : 'Add Contact'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Added On</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingContacts ? (
                      <TableRow><TableCell colSpan={3} className='text-center'>Loading...</TableCell></TableRow>
                    ) : contacts.length === 0 ? (
                      <TableRow><TableCell colSpan={3} className='text-center text-muted-foreground'>No contacts found</TableCell></TableRow>
                    ) : (
                      contacts.map(contact => (
                        <TableRow key={contact.id}>
                          <TableCell>{contact.email}</TableCell>
                          <TableCell>{new Date(contact.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell><Badge>Subscribed</Badge></TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value='analytics' className='space-y-4'>
            <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
              <Card>
                <CardHeader className='flex-row items-center justify-between pb-2'>
                  <CardTitle className='text-sm font-medium'>Total Sent</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className='text-2xl font-bold'>{getStatCount('sent')}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className='flex-row items-center justify-between pb-2'>
                  <CardTitle className='text-sm font-medium'>Opens</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className='text-2xl font-bold'>{getStatCount('opened')}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className='flex-row items-center justify-between pb-2'>
                  <CardTitle className='text-sm font-medium'>Clicks</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className='text-2xl font-bold'>{getStatCount('clicked')}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className='flex-row items-center justify-between pb-2'>
                  <CardTitle className='text-sm font-medium'>Bounces</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className='text-2xl font-bold text-destructive'>{getStatCount('bounces')}</div>
                </CardContent> 
              </Card> 
            </div> 
            <Card>
              <CardHeader>
                <CardTitle>Performance Overview</CardTitle> 
              </CardHeader> 
              <CardContent className='h-[200px] flex items-center justify-center border-t'>
                <p className='text-sm text-muted-foreground'>Detailed analytics charts will appear here as campaign data accumulates.</p>
              </CardContent> 
            </Card> 
          </TabsContent> 

          <TabsContent value='logs' className='space-y-4'>
            <Card>
              <CardHeader>
                <CardTitle>System Activity Logs</CardTitle>
                <CardDescription>Track all local email dispatch history.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Recipient</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingLogs ? (
                      <TableRow><TableCell colSpan={5} className='text-center'>Loading...</TableCell></TableRow>
                    ) : logs.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className='text-center text-muted-foreground'>No logs found</TableCell></TableRow>
                    ) : (
                      logs.map(log => (
                        <TableRow key={log._id}>
                          <TableCell className='whitespace-nowrap'>{new Date(log.createdAt).toLocaleString()}</TableCell>
                          <TableCell className='capitalize'>{log.email_type}</TableCell>
                          <TableCell className='max-w-[150px] truncate'>{log.recipient_email}</TableCell>
                          <TableCell className='max-w-[200px] truncate'>{log.subject}</TableCell>
                          <TableCell>
                            <Badge variant={log.status === 'sent' ? 'default' : 'destructive'} className='capitalize'>
                              {log.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}

