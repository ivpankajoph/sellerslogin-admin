import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

type RecentItem = {
  id: string
  name: string
  subtitle: string
  amount: string
  imageUrl?: string
}

type RecentSalesProps = {
  items: RecentItem[]
}

export function RecentSales({ items }: RecentSalesProps) {
  return (
    <div className='space-y-8'>
      {items.map((item) => {
        const initials = item.name
          .split(' ')
          .map((part) => part[0])
          .join('')
          .slice(0, 2)
          .toUpperCase()

        return (
          <div key={item.id} className='flex items-center gap-4'>
            <Avatar className='h-9 w-9'>
              {item.imageUrl ? (
                <AvatarImage src={item.imageUrl} alt={item.name} />
              ) : null}
              <AvatarFallback>{initials || 'PR'}</AvatarFallback>
            </Avatar>
            <div className='flex flex-1 flex-wrap items-center justify-between'>
              <div className='space-y-1'>
                <p className='text-sm leading-none font-medium'>{item.name}</p>
                <p className='text-muted-foreground text-sm'>{item.subtitle}</p>
              </div>
              <div className='font-medium'>{item.amount}</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
