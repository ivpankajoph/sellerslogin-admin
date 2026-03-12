'use client'

import { type JSX } from 'react/jsx-runtime'
import { ChevronsLeft, ChevronsRight } from 'lucide-react'
import { useSelector } from 'react-redux'
import { useLayout } from '@/context/layout-provider'
import { useVendorIntegrations } from '@/context/vendor-integrations-provider'
import type { IntegrationProviderId } from '@/lib/vendor-integrations'
import { Button } from '@/components/ui/button'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar'
import { sidebarData } from './data/sidebar-data'
import { NavGroup } from './nav-group'
import { NavUser } from './nav-user'

export function AppSidebar() {
  const { collapsible, variant } = useLayout()
  const { isProviderVisible } = useVendorIntegrations()
  const { state, toggleSidebar } = useSidebar()
  const user = useSelector((state: any) => state.auth.user)
  const userType = user?.role
  const effectiveRole = userType === 'superadmin' ? 'admin' : userType
  const canShowByIntegration = (provider?: string) => {
    if (!provider) return true
    return isProviderVisible(provider as IntegrationProviderId)
  }

  const filteredNavGroups = sidebarData.navGroups
    .filter(
      (group: { roles: string | any[] }) =>
        !group.roles || group.roles.includes(effectiveRole)
    )
    .map((group: { items: any[] }) => ({
      ...group,
      items: group.items
        ?.filter(
          (item) =>
            (!item.roles || item.roles.includes(effectiveRole)) &&
            canShowByIntegration(item.requiresIntegration),
        )
        .map((item) => ({
          ...item,
          items: item.items?.filter(
            (subItem: { roles: string | any[] }) =>
              (!subItem.roles || subItem.roles.includes(effectiveRole)) &&
              canShowByIntegration((subItem as any).requiresIntegration),
          ),
        }))
        .filter((item) => !item.items || item.items.length > 0),
    }))
    .filter((group: { items: string | any[] }) => group.items.length > 0)

  return (
    <Sidebar
      collapsible={collapsible}
      variant={variant}
      className='[&_[data-slot=sidebar-inner]]:border-e [&_[data-slot=sidebar-inner]]:border-sidebar-border [&_[data-slot=sidebar-inner]]:bg-sidebar [&_[data-slot=sidebar-inner]]:text-sidebar-foreground [&_[data-slot=sidebar-inner]]:shadow-sm'
    >
      <SidebarHeader className='border-b border-sidebar-border/70 p-3 group-data-[collapsible=icon]:px-2'>
        <div className='flex items-center justify-between gap-2 rounded-xl border border-sidebar-border/70 bg-sidebar-accent/40 p-2 shadow-sm group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-1.5'>
          <div className='min-w-0 group-data-[collapsible=icon]:hidden'>
            <p className='truncate text-sm font-semibold text-sidebar-foreground'>
              Navigation
            </p>
            <p className='truncate text-xs text-sidebar-foreground/65'>
              Expand or collapse sidebar
            </p>
          </div>
          <Button
            type='button'
            variant='ghost'
            size='icon'
            onClick={toggleSidebar}
            className='size-8 rounded-lg border border-sidebar-border/70 bg-sidebar text-sidebar-foreground shadow-sm hover:bg-sidebar-accent'
            title={state === 'expanded' ? 'Collapse sidebar' : 'Expand sidebar'}
            aria-label={state === 'expanded' ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {state === 'expanded' ? (
              <ChevronsLeft className='h-4 w-4' />
            ) : (
              <ChevronsRight className='h-4 w-4' />
            )}
          </Button>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {filteredNavGroups.map((props: JSX.IntrinsicAttributes & any) => (
          <NavGroup key={props.title} {...props} />
        ))}
      </SidebarContent>

      <SidebarFooter className='border-t border-sidebar-border/70'>
        <NavUser />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
