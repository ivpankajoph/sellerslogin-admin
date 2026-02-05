import { UserPlus } from 'lucide-react'
import { useCan } from '@/hooks/useCan'
import { Button } from '@/components/ui/button'
import { ROLES } from '@/components/layout/data/sidebar-data'
import UploadCategoryDialog from './UploadCategoryDialog'
import { useUsers } from './users-provider'

export function UsersPrimaryButtons() {
  const { setOpen } = useUsers()

  const canAdminSee = useCan([ROLES.ADMIN])
  return (
    <div className='flex gap-2'>
      {canAdminSee && (
        <>
          <UploadCategoryDialog />
          <Button className='space-x-1' onClick={() => setOpen('add')}>
            <span>Add Category</span> <UserPlus size={18} />
          </Button>
        </>
      )}
    </div>
  )
}
