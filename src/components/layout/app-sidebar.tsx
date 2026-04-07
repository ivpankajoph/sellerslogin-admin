'use client'

import { type JSX } from 'react/jsx-runtime'
import type { RootState } from '@/store'
import { ChevronsLeft, ChevronsRight } from 'lucide-react'
import { useSelector } from 'react-redux'
import {
  getInstalledProviderIds,
  type IntegrationProviderId,
} from '@/lib/vendor-integrations'
import { useLayout } from '@/context/layout-provider'
import { useVendorIntegrations } from '@/context/vendor-integrations-provider'
import { Button } from '@/components/ui/button'
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar'
import {
  hasVendorPageAccess,
  normalizeVendorPageAccess,
} from '@/features/team-access/access-config'
import { sidebarData } from './data/sidebar-data'
import { NavGroup } from './nav-group'
import { NavUser } from './nav-user'
import type {
  NavCollapsible,
  NavGroup as SidebarNavGroup,
  NavItem,
} from './types'

const hasChildren = (item: NavItem): item is NavCollapsible =>
  'items' in item && Array.isArray(item.items)

export function AppSidebar() {
  const { collapsible, variant } = useLayout()
  const { data, isProviderVisible } = useVendorIntegrations()
  const { state, toggleSidebar } = useSidebar()
  const user = useSelector((state: RootState) => state.auth.user)
  const userType = user?.role
  const effectiveRole = userType === 'superadmin' ? 'admin' : userType
  const isVendorTeamUser =
    effectiveRole === 'vendor' &&
    String(user?.account_type || '').toLowerCase() === 'vendor_user'
  const pageAccess = normalizeVendorPageAccess(user?.page_access)
  const installedToolkitProviders = getInstalledProviderIds(data)
  const installedToolkitCount = installedToolkitProviders.length
  const canShowByIntegration = (provider?: string) => {
    if (!provider) return true
    return isProviderVisible(provider as IntegrationProviderId)
  }
  const canShowByToolkitInstall = (provider?: string) => {
    if (!provider) return true
    if (effectiveRole !== 'vendor') return true
    return installedToolkitProviders.includes(provider as IntegrationProviderId)
  }
  const canShowByPageAccess = (pageKey?: string) => {
    if (!isVendorTeamUser) return true
    if (!pageKey) return true
    return hasVendorPageAccess(pageAccess, pageKey as never)
  }

  const filteredNavGroups = sidebarData.navGroups
    .filter(
      (group): group is SidebarNavGroup =>
        !group.roles || group.roles.includes(effectiveRole)
    )
    .map(
      (group): SidebarNavGroup => ({
        ...group,
        items: group.items
          .filter(
            (item) =>
              (!item.roles || item.roles.includes(effectiveRole)) &&
              canShowByPageAccess(item.pageKey) &&
              (group.useToolkitInstallFilter
                ? canShowByToolkitInstall(item.requiresIntegration)
                : canShowByIntegration(item.requiresIntegration))
          )
          .map((item): NavItem => {
            const badge =
              item.title === 'My Apps' &&
              effectiveRole === 'vendor' &&
              installedToolkitCount
                ? String(installedToolkitCount)
                : item.badge

            if (!hasChildren(item)) {
              return { ...item, badge }
            }

            return {
              ...item,
              badge,
              items: item.items.filter(
                (subItem) =>
                  (!subItem.roles || subItem.roles.includes(effectiveRole)) &&
                  canShowByPageAccess(subItem.pageKey) &&
                  (group.useToolkitInstallFilter
                    ? canShowByToolkitInstall(subItem.requiresIntegration)
                    : canShowByIntegration(subItem.requiresIntegration))
              ),
            }
          })
          .filter((item) => !hasChildren(item) || item.items.length > 0),
      })
    )
    .filter((group) => group.items.length > 0)

  const orderedNavGroups =
    effectiveRole === 'vendor'
      ? [...filteredNavGroups].sort((a, b) => {
          if (a.title === 'Storefront' && b.title === 'Product Management') {
            return -1
          }
          if (a.title === 'Product Management' && b.title === 'Storefront') {
            return 1
          }
          return 0
        })
      : filteredNavGroups

  const sidebarShellClassName =
    '[&_[data-slot=sidebar-inner]]:border [&_[data-slot=sidebar-inner]]:border-sidebar-border [&_[data-slot=sidebar-inner]]:bg-sidebar/90 [&_[data-slot=sidebar-inner]]:text-sidebar-foreground [&_[data-slot=sidebar-inner]]:shadow-[0_24px_56px_rgba(15,23,42,0.08)] dark:[&_[data-slot=sidebar-inner]]:shadow-[0_24px_56px_rgba(2,6,23,0.42)]'

  return (
    <Sidebar
      collapsible={collapsible}
      variant={variant}
      className={sidebarShellClassName}
      id='admin-sidebar'
      data-role={effectiveRole}
    >
      <SidebarHeader className='border-sidebar-border/70 border-b p-3 group-data-[collapsible=icon]:px-2'>
        <div className='border-sidebar-border/70 bg-sidebar-accent/40 flex items-center gap-2 border p-2 shadow-sm group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-1.5'>
          <div className='min-w-0 flex-1 group-data-[collapsible=icon]:hidden'>
            <NavUser />
          </div>
          <Button
            type='button'
            variant='ghost'
            size='icon'
            onClick={toggleSidebar}
            className='border-sidebar-border/70 bg-sidebar text-sidebar-foreground hover:bg-sidebar-accent size-8 border shadow-sm'
            title={state === 'expanded' ? 'Collapse sidebar' : 'Expand sidebar'}
            aria-label={
              state === 'expanded' ? 'Collapse sidebar' : 'Expand sidebar'
            }
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
        {orderedNavGroups.map(
          (group: JSX.IntrinsicAttributes & SidebarNavGroup) => (
            <NavGroup key={group.title} {...group} />
          )
        )}
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  )
}
