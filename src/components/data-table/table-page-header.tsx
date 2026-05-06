import type { ReactNode } from 'react'
import { useSelector } from 'react-redux'
import { cn } from '@/lib/utils'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'

type TablePageHeaderProps = {
  title: ReactNode
  children: ReactNode
  className?: string
  actionsClassName?: string
  stackOnMobile?: boolean
  stacked?: boolean
  showHeaderChrome?: boolean
}

export function TablePageHeader({
  title,
  children,
  className,
  actionsClassName,
  stackOnMobile = false,
  stacked = false,
  showHeaderChrome = true,
}: TablePageHeaderProps) {
  const authUser = useSelector((state: any) => state.auth?.user || null)
  const normalizedRole =
    String(authUser?.role || '').toLowerCase() === 'superadmin'
      ? 'admin'
      : String(authUser?.role || '').toLowerCase()
  const usesSharedDashboardHeader =
    normalizedRole === 'vendor' || normalizedRole === 'admin'
  const shouldShowLocalTitle = !usesSharedDashboardHeader
  const shouldShowLocalHeaderChrome =
    showHeaderChrome && !usesSharedDashboardHeader

  if (stacked) {
    return (
      <Header fixed className={cn('h-auto min-h-16', className)}>
        <div className='flex w-full min-w-0 flex-col gap-3'>
          {shouldShowLocalTitle ? (
            <div className='min-w-0'>
              <h2 className='text-base font-semibold tracking-tight'>{title}</h2>
            </div>
          ) : null}
          <div className='flex w-full min-w-0 items-center gap-3'>
            <div
              className={cn(
                'flex min-w-0 flex-1 items-center gap-3 overflow-x-auto pb-1',
                actionsClassName
              )}
            >
              {children}
              <div id='table-export-portal' className='shrink-0 empty:hidden flex items-center gap-2'></div>
            </div>
            {shouldShowLocalHeaderChrome ? (
              <div className='flex shrink-0 items-center gap-3'>
                <ThemeSwitch />
                <ConfigDrawer />
                <ProfileDropdown />
              </div>
            ) : null}
          </div>
        </div>
      </Header>
    )
  }

  return (
    <Header fixed className={cn(stackOnMobile && 'h-auto min-h-16', className)}>
      <div
        className={cn(
          'flex w-full min-w-0 items-center gap-4',
          stackOnMobile && 'flex-col items-stretch sm:flex-row sm:items-center'
        )}
      >
        {shouldShowLocalTitle ? (
          <div
            className={cn(
              'min-w-0 shrink-0',
              stackOnMobile && 'w-full sm:w-auto'
            )}
          >
            <h2 className='text-base font-semibold tracking-tight'>{title}</h2>
          </div>
        ) : null}
        <div
          className={cn(
            'flex min-w-0 items-center gap-3 overflow-x-auto pb-1',
            shouldShowLocalTitle ? 'ms-auto' : 'w-full',
            stackOnMobile &&
              'ms-0 w-full flex-wrap justify-start overflow-visible pb-0 sm:w-auto sm:flex-1 sm:flex-nowrap sm:justify-end sm:overflow-x-auto',
            actionsClassName
          )}
        >
          {children}
          <div id='table-export-portal' className='shrink-0 empty:hidden flex items-center gap-2'></div>
          {shouldShowLocalHeaderChrome ? (
            <>
              <div className='shrink-0'>
                <ThemeSwitch />
              </div>
              <div className='shrink-0'>
                <ConfigDrawer />
              </div>
              <div className='shrink-0'>
                <ProfileDropdown />
              </div>
            </>
          ) : null}
        </div>
      </div>
    </Header>
  )
}
