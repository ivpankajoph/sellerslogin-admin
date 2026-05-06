import { useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../../lib/api.js'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const titleCase = (value = '') => {
  const text = String(value || '').trim()
  return text ? text.charAt(0).toUpperCase() + text.slice(1).toLowerCase() : ''
}

const deriveRecipientFromEmail = (email = '', row = {}) => {
  const normalizedEmail = String(email || '').trim().toLowerCase()
  const [localPart = '', domain = ''] = normalizedEmail.split('@')
  const nameParts = localPart
    .replace(/\d+/g, ' ')
    .replace(/[._-]+/g, ' ')
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
  const emailDigits = (localPart.match(/\d+/g) || []).join('')

  return {
    email: normalizedEmail,
    firstName: row.firstName || titleCase(nameParts[0] || localPart),
    lastName: row.lastName || titleCase(nameParts.slice(1).join(' ')),
    domain,
    emailDigits,
  }
}

const splitCsvLine = (line = '') => {
  const values = []
  let current = ''
  let inQuotes = false

  for (const character of String(line)) {
    if (character === '"') {
      inQuotes = !inQuotes
    } else if (character === ',' && !inQuotes) {
      values.push(current.trim().replace(/^"|"$/g, ''))
      current = ''
    } else {
      current += character
    }
  }

  values.push(current.trim().replace(/^"|"$/g, ''))
  return values
}

const parseCsvRecipients = (text = '') => {
  const lines = String(text || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (!lines.length) {
    return []
  }

  const firstLine = splitCsvLine(lines[0]).map((value) => value.toLowerCase())
  const hasHeader = firstLine.some((value) => ['email', 'first name', 'firstname', 'last name', 'lastname'].includes(value))
  const headers = hasHeader ? firstLine : []
  const dataLines = hasHeader ? lines.slice(1) : lines
  const byEmail = new Map()

  dataLines.forEach((line) => {
    const cells = splitCsvLine(line)
    const row = {}

    if (headers.length) {
      headers.forEach((header, index) => {
        row[header] = cells[index] || ''
      })
    }

    const email =
      row.email ||
      cells.find((cell) => emailPattern.test(String(cell || '').trim().toLowerCase())) ||
      ''

    if (!emailPattern.test(String(email || '').trim().toLowerCase())) {
      return
    }

    const recipient = deriveRecipientFromEmail(email, {
      firstName: row.firstname || row['first name'] || cells[1] || '',
      lastName: row.lastname || row['last name'] || cells[2] || '',
    })
    byEmail.set(recipient.email, recipient)
  })

  return Array.from(byEmail.values())
}

const getListCount = (lists = [], selectedIds = []) =>
  lists
    .filter((list) => selectedIds.includes(list._id))
    .reduce((total, list) => total + Number(list.recipientCount || 0), 0)

const buildListFingerprint = (recipients = []) =>
  recipients
    .map((recipient) => String(recipient.email || '').trim().toLowerCase())
    .filter(Boolean)
    .sort()
    .join('|')

const getAudienceListKey = (list = {}) =>
  list.fingerprint || `${String(list.name || '').trim().toLowerCase()}::${Number(list.recipientCount || 0)}`

const dedupeImportedAudienceLists = (lists = []) => {
  const unique = new Map()

  lists.forEach((list) => {
    const key = getAudienceListKey(list) || list._id
    if (!unique.has(key)) {
      unique.set(key, list)
    }
  })

  return Array.from(unique.values())
}

function AudiencePickerModal({
  isOpen,
  onClose,
  websites = [],
  selectedWebsiteScopes: _selectedWebsiteScopes = [],
  selectedWebsiteKeys: _selectedWebsiteKeys,
  getWebsiteOptionScope,
  getWebsiteScopeKey,
  normalizeWebsiteScopes,
  emptyWebsiteScope,
  importedAudienceLists = [],
  onImportedAudienceListsChange,
  form,
  setForm,
}) {
  const fileInputRef = useRef(null)
  const [isImporting, setIsImporting] = useState(false)
  const [importError, setImportError] = useState('')
  const [previewRecipients, setPreviewRecipients] = useState([])
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)
  const [draftForm, setDraftForm] = useState(form)
  const [draftImportedAudienceLists, setDraftImportedAudienceLists] = useState(importedAudienceLists)

  useEffect(() => {
    if (isOpen) {
      setDraftForm(form)
      setDraftImportedAudienceLists(importedAudienceLists)
      setImportError('')
    }
  }, [isOpen, form, importedAudienceLists])

  const draftWebsiteScopes = normalizeWebsiteScopes(draftForm.websiteScopes?.length ? draftForm.websiteScopes : draftForm.websiteScope)
  const draftWebsiteKeys = new Set(draftWebsiteScopes.map((scope) => getWebsiteScopeKey(scope)))
  const audienceSources = Array.isArray(draftForm.audienceSources) ? draftForm.audienceSources : []
  const selectedImportedIds = Array.isArray(draftForm.importedAudienceListIds) ? draftForm.importedAudienceListIds : []
  const previewListId = selectedImportedIds[0] || ''
  const previewList = draftImportedAudienceLists.find((list) => list._id === previewListId)
  const displayImportedAudienceLists = useMemo(
    () => dedupeImportedAudienceLists(draftImportedAudienceLists),
    [draftImportedAudienceLists],
  )
  const selectedImportedLists = useMemo(
    () => displayImportedAudienceLists.filter((list) => selectedImportedIds.includes(list._id)),
    [displayImportedAudienceLists, selectedImportedIds],
  )

  useEffect(() => {
    if (!isOpen || !previewListId) {
      setPreviewRecipients([])
      return undefined
    }

    if (previewList?.isPending) {
      setPreviewRecipients(Array.isArray(previewList.recipients) ? previewList.recipients : [])
      setIsLoadingPreview(false)
      return undefined
    }

    let isCurrent = true
    setIsLoadingPreview(true)

    api.get(`/imported-audiences/${previewListId}/recipients`)
      .then(({ data }) => {
        if (isCurrent) {
          setPreviewRecipients(Array.isArray(data) ? data : [])
        }
      })
      .catch(() => {
        if (isCurrent) {
          setPreviewRecipients([])
        }
      })
      .finally(() => {
        if (isCurrent) {
          setIsLoadingPreview(false)
        }
      })

    return () => {
      isCurrent = false
    }
  }, [isOpen, previewListId, previewList])

  if (!isOpen) {
    return null
  }

  const toggleSource = (source, checked) => {
    setDraftForm((current) => {
      const currentSources = Array.isArray(current.audienceSources) ? current.audienceSources : []
      const nextSources = checked
        ? Array.from(new Set([...currentSources, source]))
        : currentSources.filter((item) => item !== source)

      return {
        ...current,
        audienceSources: nextSources,
        websiteScopes: source === 'website' && !checked ? [] : current.websiteScopes,
        websiteScope: source === 'website' && !checked ? emptyWebsiteScope : current.websiteScope,
        importedAudienceListIds: source === 'csv' && !checked ? [] : current.importedAudienceListIds,
      }
    })
  }

  const handleCsvFile = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) {
      return
    }

    setImportError('')
    setIsImporting(true)

    try {
      const text = await file.text()
      const recipients = parseCsvRecipients(text)

      if (!recipients.length) {
        throw new Error('CSV must include at least one valid email')
      }

      const fingerprint = buildListFingerprint(recipients)
      const existingPendingList = draftImportedAudienceLists.find((list) => list.isPending && list.fingerprint === fingerprint)
      const list = existingPendingList || {
        _id: `temp:${Date.now()}:${Math.random().toString(36).slice(2)}`,
        name: file.name.replace(/\.[^.]+$/, '') || 'Imported CSV audience',
        recipientCount: recipients.length,
        recipients,
        fingerprint,
        isPending: true,
      }

      if (!existingPendingList) {
        setDraftImportedAudienceLists([list, ...draftImportedAudienceLists])
      }

      setDraftForm((current) => ({
        ...current,
        audienceSources: Array.from(new Set([...(current.audienceSources || []), 'csv'])),
        importedAudienceListIds: Array.from(new Set([...(current.importedAudienceListIds || []), list._id])),
      }))
    } catch (error) {
      setImportError(error.response?.data?.message || error.message || 'Unable to import CSV')
    } finally {
      setIsImporting(false)
    }
  }

  const handleDone = () => {
    setForm(draftForm)
    onImportedAudienceListsChange(draftImportedAudienceLists)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6">
      <div className="max-h-[92vh] w-full max-w-6xl overflow-hidden border border-[#ddd4f2] bg-white shadow-[0_28px_90px_rgba(47,43,61,0.28)]">
        <div className="border-b border-[#ece6f8] px-7 py-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-[#2f2b3d]">Choose Your audience</h2>
            <p className="mt-1 text-sm text-[#6e6787]">Select CSV contacts, website audience, or both.</p>
          </div>
          <button type="button" className="rounded-lg border border-[#ddd4f2] px-3 py-2 text-sm font-semibold" onClick={onClose}>
            Close
          </button>
        </div>
        </div>

        <div className="grid max-h-[calc(92vh-97px)] gap-0 overflow-y-auto lg:grid-cols-[360px_minmax(0,1fr)]">
          <div className="space-y-4 border-r border-[#ece6f8] bg-[#fbf9ff] p-6">
          <section className="border border-[#ece6f8] bg-white p-4">
            <label className="flex items-center justify-between gap-3">
              <span>
                <span className="block font-semibold text-[#2f2b3d]">Import CSV</span>
                <span className="text-sm text-[#6e6787]">{getListCount(displayImportedAudienceLists, selectedImportedIds)} imported recipients selected</span>
              </span>
              <input
                type="checkbox"
                checked={audienceSources.includes('csv')}
                onChange={(event) => toggleSource('csv', event.target.checked)}
              />
            </label>
            <button
              type="button"
              className="mt-4 w-full border border-[#ddd4f2] bg-white px-4 py-3 text-sm font-semibold text-[#2f2b3d]"
              disabled={isImporting}
              onClick={() => fileInputRef.current?.click()}
            >
              {isImporting ? 'Importing...' : 'Import CSV'}
            </button>
            <input ref={fileInputRef} className="hidden" type="file" accept=".csv,text/csv" onChange={handleCsvFile} />
            {importError ? <p className="mt-3 text-sm text-red-600">{importError}</p> : null}
            {audienceSources.includes('csv') ? (
              <div className="mt-4 max-h-44 space-y-2 overflow-y-auto">
                {displayImportedAudienceLists.length ? displayImportedAudienceLists.map((list) => (
                  <label key={list._id} className="flex items-center justify-between gap-3 border border-[#ece6f8] bg-white px-3 py-2 text-sm">
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-[#2f2b3d]">{list.name}</span>
                      <span className="text-xs text-[#8a93a6]">
                        {list.recipientCount || 0} recipients{list.isPending ? ' · pending save' : ''}
                      </span>
                    </span>
                    <input
                      type="checkbox"
                      checked={selectedImportedIds.includes(list._id)}
                      onChange={(event) =>
                        setDraftForm((current) => ({
                          ...current,
                          importedAudienceListIds: event.target.checked
                            ? Array.from(new Set([...(current.importedAudienceListIds || []), list._id]))
                            : (current.importedAudienceListIds || []).filter((id) => id !== list._id),
                        }))
                      }
                    />
                  </label>
                )) : <p className="text-sm text-[#8a93a6]">No CSV audience imported yet</p>}
              </div>
            ) : null}
          </section>

          <section className="border border-[#ece6f8] bg-white p-4">
            <label className="flex items-center justify-between gap-3">
              <span>
                <span className="block font-semibold text-[#2f2b3d]">Choose Your website Audience</span>
                <span className="text-sm text-[#6e6787]">{draftWebsiteScopes.length} website audience selected</span>
              </span>
              <input
                type="checkbox"
                checked={audienceSources.includes('website')}
                onChange={(event) => toggleSource('website', event.target.checked)}
              />
            </label>
            {audienceSources.includes('website') ? (
              <div className="mt-4 max-h-56 space-y-2 overflow-y-auto">
                {websites.length ? websites.map((website) => {
                  const scope = getWebsiteOptionScope(website)
                  const key = getWebsiteScopeKey(scope)
                  const checked = draftWebsiteKeys.has(key)

                  return (
                    <label key={website.id} className="flex cursor-pointer items-center justify-between gap-3 border border-[#ece6f8] bg-white px-3 py-2 text-sm hover:bg-[#faf7ff]">
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-[#2f2b3d]">{website.label}</span>
                        <span className="text-xs text-[#8a93a6]">{website.count || 0} subscribers</span>
                      </span>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(event) => {
                          setDraftForm((current) => {
                            const currentScopes = normalizeWebsiteScopes(current.websiteScopes?.length ? current.websiteScopes : current.websiteScope)
                            const nextScopes = event.target.checked
                              ? normalizeWebsiteScopes([...currentScopes, scope])
                              : currentScopes.filter((item) => getWebsiteScopeKey(item) !== key)

                            return {
                              ...current,
                              websiteScope: nextScopes[0] || emptyWebsiteScope,
                              websiteScopes: nextScopes,
                              segmentId: '',
                              entrySegmentId: '',
                            }
                          })
                        }}
                      />
                    </label>
                  )
                }) : <p className="text-sm text-[#8a93a6]">No websites found</p>}
              </div>
            ) : null}
          </section>
          </div>

          <div className="space-y-5 p-6">
            <section className="border border-[#ece6f8] bg-[#faf7ff] p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-semibold text-[#2f2b3d]">Selected audience</h3>
                  <p className="text-sm text-[#6e6787]">
                    {selectedImportedLists.length ? `${selectedImportedLists.length} CSV list selected` : 'No CSV list selected'}
                    {audienceSources.includes('website') ? `, ${draftWebsiteScopes.length} website audience selected` : ''}
                  </p>
                </div>
                <span className="border border-[#ddd4f2] bg-white px-3 py-2 text-sm font-semibold text-[#2f2b3d]">
                  {getListCount(displayImportedAudienceLists, selectedImportedIds) + draftWebsiteScopes.reduce((total, scope) => {
                    const website = websites.find((item) => getWebsiteScopeKey(getWebsiteOptionScope(item)) === getWebsiteScopeKey(scope))
                    return total + Number(website?.count || 0)
                  }, 0)} estimated recipients
                </span>
              </div>
            </section>

            <section className="border border-[#ece6f8] bg-white">
              <div className="border-b border-[#ece6f8] px-4 py-3">
                <h3 className="font-semibold text-[#2f2b3d]">CSV recipients preview</h3>
                <p className="mt-1 text-sm text-[#6e6787]">
                  {previewListId ? 'Showing the first selected CSV list.' : 'Select or import a CSV list to preview contacts.'}
                </p>
              </div>
              <div className="max-h-80 overflow-auto">
                {isLoadingPreview ? (
                  <p className="px-4 py-6 text-sm text-[#6e6787]">Loading recipients...</p>
                ) : previewRecipients.length ? (
                  <table className="w-full min-w-[720px] text-left text-sm">
                    <thead className="sticky top-0 bg-[#faf7ff] text-xs uppercase text-[#8a7fb3]">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Email</th>
                        <th className="px-4 py-3 font-semibold">First name</th>
                        <th className="px-4 py-3 font-semibold">Last name</th>
                        <th className="px-4 py-3 font-semibold">Domain</th>
                        <th className="px-4 py-3 font-semibold">Digits</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f0eafa]">
                      {previewRecipients.slice(0, 50).map((recipient) => (
                        <tr key={`${recipient.importedAudienceRecipientId || recipient.email}`}>
                          <td className="px-4 py-3 font-medium text-[#2f2b3d]">{recipient.email}</td>
                          <td className="px-4 py-3 text-[#6e6787]">{recipient.firstName || '-'}</td>
                          <td className="px-4 py-3 text-[#6e6787]">{recipient.lastName || '-'}</td>
                          <td className="px-4 py-3 text-[#6e6787]">{recipient.domain || recipient.customFields?.domain || '-'}</td>
                          <td className="px-4 py-3 text-[#6e6787]">{recipient.emailDigits || recipient.customFields?.emailDigits || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="px-4 py-6 text-sm text-[#6e6787]">No imported recipients to show yet.</p>
                )}
              </div>
            </section>

            {selectedImportedLists.length > 1 ? (
              <section className="border border-[#ece6f8] bg-white p-4">
                <h3 className="font-semibold text-[#2f2b3d]">Selected CSV lists</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedImportedLists.map((list) => (
                    <span key={list._id} className="border border-[#ddd4f2] bg-[#faf7ff] px-3 py-2 text-sm text-[#2f2b3d]">
                      {list.name} · {list.recipientCount || 0}{list.isPending ? ' · pending save' : ''}
                    </span>
                  ))}
                </div>
              </section>
            ) : null}

            <div className="flex justify-end">
              <button type="button" className="primary-button" onClick={handleDone}>Done</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AudiencePickerModal
