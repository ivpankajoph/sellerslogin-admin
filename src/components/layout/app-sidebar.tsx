'use client'

import { type JSX } from 'react/jsx-runtime'
import { ChevronsLeft, ChevronsRight } from 'lucide-react'
import { useSelector } from 'react-redux'
import { useEffect, useState } from 'react'
import api from '@/lib/axios'
import { useLayout } from '@/context/layout-provider'
import { useVendorIntegrations } from '@/context/vendor-integrations-provider'
import {
  getInstalledProviderIds,
  type IntegrationProviderId,
} from '@/lib/vendor-integrations'
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
  const { data, isProviderVisible } = useVendorIntegrations()
  const { state, toggleSidebar } = useSidebar()
  const user = useSelector((state: any) => state.auth.user)
  const userType = user?.role
  const effectiveRole = userType === 'superadmin' ? 'admin' : userType
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

  const [unreadCounts, setUnreadCounts] = useState({ queries: 0, reviews: 0, vendors: 0, tickets: 0 })

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const res = await api.get('/users/support/queries/unread/counts')
        if (res.data.success) {
          setUnreadCounts(res.data.data)
        }
      } catch (error) {
        console.error('Failed to fetch unread counts for sidebar', error)
      }
    }
    fetchCounts()
    // Poll every 2 minutes
    const interval = setInterval(fetchCounts, 120000)
    return () => clearInterval(interval)
  }, [])

  const filteredNavGroups = sidebarData.navGroups
    .filter((group: any) => !group.roles || group.roles.includes(effectiveRole))
    .map((group: any) => ({
      ...group,
      items: group.items
        ?.filter(
          (item: any) =>
            (!item.roles || item.roles.includes(effectiveRole)) &&
            (group.title === 'Sellerslogin Toolkit'
              ? canShowByToolkitInstall(item.requiresIntegration)
              : canShowByIntegration(item.requiresIntegration)),
        )
        .map((item: any) => {
          let injectedBadge = item.badge
          
          if (item.title === 'My Apps' && effectiveRole === 'vendor' && installedToolkitCount) {
             injectedBadge = String(installedToolkitCount)
          } else if (item.title === 'Customer Queries' && unreadCounts.queries > 0) {
             injectedBadge = String(unreadCounts.queries)
          } else if (item.title === 'Customer Reviews' && unreadCounts.reviews > 0) {
             injectedBadge = String(unreadCounts.reviews)
          } else if (item.title === 'All Vendors' && effectiveRole === 'admin' && unreadCounts.vendors > 0) {
             injectedBadge = String(unreadCounts.vendors)
          } else if (item.title === 'Help Center' && unreadCounts.tickets > 0) {
             // If parent has tickets unread, we show it on parent too or just child? 
             // Usually parent shows sum.
             injectedBadge = String(unreadCounts.tickets)
          }

          return {
            ...item,
            badge: injectedBadge,
            items: item.items?.map((subItem: any) => {
              let subBadge = subItem.badge
              if (subItem.title === 'Ticket Centre' && unreadCounts.tickets > 0) {
                subBadge = String(unreadCounts.tickets)
              }
              return { ...subItem, badge: subBadge }
            }).filter(
            (subItem: any) =>
              (!subItem.roles || subItem.roles.includes(effectiveRole)) &&
              (group.title === 'Sellerslogin Toolkit'
                ? canShowByToolkitInstall(subItem.requiresIntegration)
                : canShowByIntegration(subItem.requiresIntegration)),
            ),
          }
        })
        .filter((item: any) => !item.items || item.items.length > 0),
    }))
    .filter((group: any) => group.items.length > 0)

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
