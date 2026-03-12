'use client'

import { type JSX } from 'react/jsx-runtime'
import { useSelector } from 'react-redux'
import { useLayout } from '@/context/layout-provider'
import { useVendorIntegrations } from '@/context/vendor-integrations-provider'
import type { IntegrationProviderId } from '@/lib/vendor-integrations'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar'
import { sidebarData } from './data/sidebar-data'
import { NavGroup } from './nav-group'
import { NavUser } from './nav-user'

export function AppSidebar() {
  const { collapsible, variant } = useLayout()
  const { isProviderVisible } = useVendorIntegrations()
  const user = useSelector((state: any) => state.auth.user)
  const roleKey = String(user?.role || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]/g, '')
  const isSuperAdmin = roleKey === 'superadmin'
  const effectiveRole = isSuperAdmin ? 'admin' : roleKey
  const canShowByIntegration = (provider?: string) => {
    if (!provider) return true
    return isProviderVisible(provider as IntegrationProviderId)
  }

  const filteredNavGroups = sidebarData.navGroups
    .filter(
      (group: { roles: string | any[] }) =>
        (!group.roles || group.roles.includes(effectiveRole)) &&
        (!group.superAdminOnly || isSuperAdmin)
    )
    .map((group: { items: any[] }) => ({
      ...group,
      items: group.items
        ?.filter(
          (item) =>
            (!item.roles || item.roles.includes(effectiveRole)) &&
            (!item.superAdminOnly || isSuperAdmin) &&
            canShowByIntegration(item.requiresIntegration),
        )
        .map((item) => ({
          ...item,
          items: item.items?.filter(
            (subItem: { roles: string | any[] }) =>
              (!subItem.roles || subItem.roles.includes(effectiveRole)) &&
              (!(subItem as any).superAdminOnly || isSuperAdmin) &&
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
      <SidebarHeader>
        <SidebarFooter>
          <NavUser />
        </SidebarFooter>
      </SidebarHeader>

      <SidebarContent>
        {filteredNavGroups.map((props: JSX.IntrinsicAttributes & any) => (
          <NavGroup key={props.title} {...props} />
        ))}
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  )
}
