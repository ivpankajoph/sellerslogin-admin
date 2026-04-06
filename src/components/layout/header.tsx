import { useEffect, useState } from 'react'
import { useLocation } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'

type HeaderProps = React.HTMLAttributes<HTMLElement> & {
  fixed?: boolean
  ref?: React.Ref<HTMLElement>
}

export function Header({ className, fixed, children, ...props }: HeaderProps) {
  const [offset, setOffset] = useState(0)
  const pathname = useLocation({ select: (location) => location.pathname })
  const isThemeEditor = pathname.startsWith('/vendor-template')

  useEffect(() => {
    const onScroll = () => {
      setOffset(document.body.scrollTop || document.documentElement.scrollTop)
    }

    // Add scroll listener to the body
    document.addEventListener('scroll', onScroll, { passive: true })

    // Clean up the event listener on unmount
    return () => document.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={cn(
        isThemeEditor ? 'z-50 h-[68px]' : 'z-50 h-16',
        fixed &&
          (isThemeEditor
            ? 'sticky top-0 w-full'
            : 'header-fixed peer/header sticky top-0 w-[inherit]'),
        offset > 10 && fixed && !isThemeEditor ? 'shadow' : 'shadow-none',
        className
      )}
      {...props}
    >
      <div
        className={cn(
          isThemeEditor
            ? 'relative flex h-full items-center gap-3 border-b border-slate-200 bg-white px-4 text-slate-900 sm:px-6 lg:px-8'
            : 'relative flex h-full items-center gap-3 border border-border/70 bg-background/80 p-4 text-foreground shadow-sm backdrop-blur sm:gap-4',
          !isThemeEditor &&
            offset > 10 &&
            fixed &&
            'after:bg-background/20 after:absolute after:inset-0 after:-z-10 after:backdrop-blur-lg'
        )}
      >
        {!isThemeEditor ? (
          <>
            <SidebarTrigger
              variant='outline'
              className='max-md:scale-125 border border-border/70 bg-background/90 text-foreground shadow-sm hover:border-primary/40 hover:text-primary md:hidden'
            />
            <Separator orientation='vertical' className='h-6 md:hidden' />
          </>
        ) : null}
        {children}
      </div>
    </header>
  )
}
