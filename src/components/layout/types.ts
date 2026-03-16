import { type LinkProps } from '@tanstack/react-router'
import type { IntegrationProviderId } from '@/lib/vendor-integrations'

type User = {
  name: string
  email: string
  avatar: string
}

type Team = {
  name: string
  logo: React.ElementType
  plan: string
}

type BaseNavItem = {
  title: string
  badge?: string
  icon?: React.ElementType
  roles?: ("admin" | "vendor")[]
  requiresIntegration?: IntegrationProviderId
}

type NavLink = BaseNavItem & {
  url: LinkProps['to'] | (string & {})
  items?: never
  roles?: ("admin" | "vendor")[]
}

type NavCollapsible = BaseNavItem & {
  items: (BaseNavItem & { url: LinkProps['to'] | (string & {}) })[]
  url?: never
}

type NavItem = NavCollapsible | NavLink

type NavGroup = {
  title: string
  items: NavItem[]
  roles?: ("admin" | "vendor")[]
  useToolkitInstallFilter?: boolean
}

type SidebarData = {
  user: User
  teams: Team[]
  navGroups: NavGroup[]
  roles?: ("admin" | "vendor")[]
}

export type { SidebarData, NavGroup, NavItem, NavCollapsible, NavLink }
