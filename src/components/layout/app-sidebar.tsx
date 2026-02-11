'use client'

import { type JSX } from 'react/jsx-runtime'
import { useSelector } from 'react-redux'
import { useLayout } from '@/context/layout-provider'
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
  const user = useSelector((state: any) => state.auth.user)
  const userType = user?.role

  const filteredNavGroups = sidebarData.navGroups
    .filter(
      (group: { roles: string | any[] }) =>
        !group.roles || group.roles.includes(userType)
    )
    .map((group: { items: any[] }) => ({
      ...group,
      items: group.items
        ?.filter((item) => !item.roles || item.roles.includes(userType))
        .map((item) => ({
          ...item,
          items: item.items?.filter(
            (subItem: { roles: string | any[] }) =>
              !subItem.roles || subItem.roles.includes(userType)
          ),
        }))
        .filter((item) => !item.items || item.items.length > 0),
    }))
    .filter((group: { items: string | any[] }) => group.items.length > 0)

  return (
    <Sidebar
      collapsible={collapsible}
      variant={variant}
      className='[&_[data-slot=sidebar-inner]]:border-e [&_[data-slot=sidebar-inner]]:border-rose-100 [&_[data-slot=sidebar-inner]]:bg-gradient-to-b [&_[data-slot=sidebar-inner]]:from-rose-50 [&_[data-slot=sidebar-inner]]:via-amber-50/60 [&_[data-slot=sidebar-inner]]:to-sky-50/80 [&_[data-slot=sidebar-inner]]:shadow-sm'
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
