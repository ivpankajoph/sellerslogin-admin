import { Rocket } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Type {
  open: any
  setOpen: any
  isDeploying: any
  deployMessage: any
  handleDeploy: any
  handleCancel: any
}
export function DeploymentModal({
  open,
  setOpen,
  isDeploying,
  deployMessage,
  handleDeploy,
  handleCancel,
}: Type) {
  if (!open) return null

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4'>
      <div className='relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl'>
        {!isDeploying ? (
          <div className='space-y-6'>
            <div className='flex justify-center'>
              <div className='rounded-full bg-indigo-100 p-4'>
                <Rocket className='h-12 w-12 text-indigo-600' />
              </div>
            </div>

            <div className='text-center'>
              <h2 className='text-2xl font-bold'>Deploy Your Website</h2>
              <p className='mt-2 text-gray-600'>
                Your storefront will be deployed. This takes 2–3 minutes.
              </p>
            </div>

            <div className='flex gap-3 pt-4'>
              <Button
                variant='outline'
                className='flex-1'
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>

              <Button
                className='flex-1 bg-emerald-500 text-white'
                onClick={handleDeploy}
              >
                <Rocket className='mr-2 h-4 w-4' /> Deploy Now
              </Button>
            </div>
          </div>
        ) : (
          <div className='flex flex-col items-center py-8'>
            <div className='mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100'>
              <div className='h-16 w-16 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent'></div>
            </div>

            <h3 className='text-xl font-bold'>Building Your Website</h3>

            <pre className='mt-2 max-h-60 overflow-y-auto rounded bg-gray-50 p-3 text-xs text-gray-600'>
              {deployMessage}
            </pre>

            <div className='mt-8 w-full'>
              <Button onClick={handleCancel}>Cancel Deployment</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
