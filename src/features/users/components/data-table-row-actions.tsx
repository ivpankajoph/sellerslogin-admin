import { type Row } from '@tanstack/react-table'
import { useNavigate } from '@tanstack/react-router'
import { Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { type User } from '../data/schema'

type DataTableRowActionsProps = {
  row: Row<User>
}

export function DataTableRowActions({ row }: DataTableRowActionsProps) {
  const navigate = useNavigate()
  return (
    <Button
      variant='outline'
      size='icon'
      data-row-action='true'
      title='Show user data'
      onClick={() =>
        navigate({
          to: '/users/$userId',
          params: { userId: row.original.id },
        })
      }
    >
      <Eye className='h-4 w-4' />
      <span className='sr-only'>Show user data</span>
    </Button>
  )
}
