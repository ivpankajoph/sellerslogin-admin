import { useState } from 'react'
import axios from 'axios'
import { BASE_URL } from '@/store/slices/vendor/productSlice'
import { useSelector } from 'react-redux'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface Type {
  open: boolean
  setOpen: (v: boolean) => void
}

export function DomainModal({ open, setOpen }: Type) {
  const [domain, setDomain] = useState('')
  const [error, setError] = useState<string>('')
  const [response, setResponse] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const token = useSelector((state: any) => state?.auth?.token)
  const handleSubmit = async () => {
    if (domain.includes('http')) {
      setError('Do not include http or https in the domain name.')
      return
    }
    setError('')
    setLoading(true)

    try {
      const res = await axios.post(
        `${BASE_URL}/v1/templates/domain/initiate`,
        { domain },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }
      )
      setResponse(res.data)
    } catch (e: any) {
      setResponse(
        e?.response?.data || e?.message || 'An unknown error occurred'
      )
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setOpen(false)
    setDomain('')
    setError('')
    setResponse(null)
    setLoading(false)
  }

  // Helper to render response safely
  const renderResponse = (data: any) => {
    if (typeof data === 'string') {
      return <p className='text-sm whitespace-pre-wrap'>{data}</p>
    }

    if (typeof data === 'object' && data !== null) {
      try {
        return (
          <pre className='max-h-60 overflow-auto rounded-md border border-gray-200 bg-gray-50 p-3 text-xs'>
            {JSON.stringify(data, null, 2)}
          </pre>
        )
      } catch {
        return <p className='text-sm'>Could not display response as JSON.</p>
      }
    }

    return <p className='text-sm'>Received unexpected response type.</p>
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className='max-w-lg space-y-4 rounded-2xl border p-6 shadow-lg'
        // 👇 Add this to make sure modal scrolls internally if content overflows
        style={{
          maxHeight: '80vh',
          overflowY: 'auto',
        }}
      >
        <DialogHeader>
          <DialogTitle className='text-lg font-semibold'>
            Connect Your Domain
          </DialogTitle>
        </DialogHeader>
        <p>
          To Connect Your Domain <span>You have to verify first</span>
        </p>
        <div className='space-y-3'>
          <div className='flex flex-col space-y-1'>
            <label className='text-sm font-medium'>Enter Domain</label>
            <input
              type='text'
              className='w-full rounded-md border px-3 py-2 focus:ring focus:ring-blue-300 focus:outline-none'
              placeholder='example.com'
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
            />
            {error && <p className='text-sm text-red-600'>{error}</p>}
            <p className='text-xs text-yellow-600'>
              ⚠ Do not include http:// or https://
            </p>
          </div>

          <div className='flex justify-end gap-3 pt-2'>
            <Button variant='outline' onClick={handleClose}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? 'Submitting...' : 'Submit'}
            </Button>
          </div>

          {response !== null && (
            <div className='mt-4'>
              <h3 className='mb-2 text-sm font-medium'>Response:</h3>
              <div className='w-md rounded-md border bg-white p-3'>
                {renderResponse(response)}
              </div>
              <Button className='mt-1'>Map your Domain </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
