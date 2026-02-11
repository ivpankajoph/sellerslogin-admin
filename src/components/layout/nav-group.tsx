import { type ReactNode } from 'react'
import { Link, useLocation } from '@tanstack/react-router'
import { ChevronRight } from 'lucide-react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { Badge } from '../ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'
import {
  type NavCollapsible,
  type NavItem,
  type NavLink,
  type NavGroup as NavGroupProps,
} from './types'

const ICON_ACCENTS = [
  { chip: 'bg-rose-100', icon: 'text-rose-600' },
  { chip: 'bg-orange-100', icon: 'text-orange-600' },
  { chip: 'bg-amber-100', icon: 'text-amber-700' },
  { chip: 'bg-emerald-100', icon: 'text-emerald-600' },
  { chip: 'bg-sky-100', icon: 'text-sky-600' },
  { chip: 'bg-indigo-100', icon: 'text-indigo-600' },
  { chip: 'bg-fuchsia-100', icon: 'text-fuchsia-600' },
]

const iconAccentByKey = (key: string) => {
  const code = Array.from(String(key || '')).reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return ICON_ACCENTS[code % ICON_ACCENTS.length]
}

export function NavGroup({ title, items }: NavGroupProps) {
  const { state, isMobile } = useSidebar()
  const href = useLocation({ select: (location) => location.href })
  return (
    <SidebarGroup>
      <SidebarGroupLabel className='font-semibold tracking-wide text-indigo-700/80'>
        {title}
      </SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => {
          const key = `${item.title}-${item.url}`

          if (!item.items)
            return <SidebarMenuLink key={key} item={item} href={href} />

          if (state === 'collapsed' && !isMobile)
            return (
              <SidebarMenuCollapsedDropdown key={key} item={item} href={href} />
            )

          return <SidebarMenuCollapsible key={key} item={item} href={href} />
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}

function NavBadge({ children }: { children: ReactNode }) {
  return (
    <Badge className='rounded-full border-rose-200 bg-rose-100 px-1.5 py-0 text-xs text-rose-700'>
      {children}
    </Badge>
  )
}

function SidebarItemIcon({
  icon: Icon,
  seed,
}: {
  icon?: NavItem['icon']
  seed: string
}) {
  if (!Icon) return null
  const accent = iconAccentByKey(seed)
  return (
    <span className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${accent.chip}`}>
      <Icon className={`h-4 w-4 ${accent.icon}`} />
    </span>
  )
}

function SidebarMenuLink({ item, href }: { item: NavLink; href: string }) {
  const { setOpenMobile } = useSidebar()
  const isActive = checkIsActive(href, item)
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={isActive}
        tooltip={item.title}
        className='text-slate-700/95 transition-all hover:bg-orange-100/80 hover:text-slate-900 data-[active=true]:bg-gradient-to-r data-[active=true]:from-rose-500/20 data-[active=true]:to-amber-500/20 data-[active=true]:text-rose-900 data-[active=true]:ring-1 data-[active=true]:ring-rose-200 data-[active=true]:shadow-sm'
      >
        <Link to={item.url} onClick={() => setOpenMobile(false)}>
          <SidebarItemIcon icon={item.icon} seed={item.title} />
          <span>{item.title}</span>
          {item.badge && <NavBadge>{item.badge}</NavBadge>}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

function SidebarMenuCollapsible({
  item,
  href,
}: {
  item: NavCollapsible
  href: string
}) {
  const { setOpenMobile } = useSidebar()
  const isActive = checkIsActive(href, item, true)
  return (
    <Collapsible
      asChild
      defaultOpen={checkIsActive(href, item, true)}
      className='group/collapsible'
    >
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton
            tooltip={item.title}
            isActive={isActive}
            className='text-slate-700/95 transition-all hover:bg-orange-100/80 hover:text-slate-900 data-[active=true]:bg-gradient-to-r data-[active=true]:from-rose-500/20 data-[active=true]:to-amber-500/20 data-[active=true]:text-rose-900 data-[active=true]:ring-1 data-[active=true]:ring-rose-200 data-[active=true]:shadow-sm'
          >
            <SidebarItemIcon icon={item.icon} seed={item.title} />
            <span>{item.title}</span>
            {item.badge && <NavBadge>{item.badge}</NavBadge>}
            <ChevronRight className='ms-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 rtl:rotate-180' />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent className='CollapsibleContent'>
          <SidebarMenuSub>
            {item.items.map((subItem) => (
              <SidebarMenuSubItem key={subItem.title}>
                <SidebarMenuSubButton
                  asChild
                  isActive={checkIsActive(href, subItem)}
                  className='text-slate-700/90 hover:bg-amber-100/80 hover:text-slate-900 data-[active=true]:bg-rose-100/85 data-[active=true]:text-rose-900 data-[active=true]:ring-1 data-[active=true]:ring-rose-200'
                >
                  <Link to={subItem.url} onClick={() => setOpenMobile(false)}>
                    <SidebarItemIcon icon={subItem.icon} seed={subItem.title} />
                    <span>{subItem.title}</span>
                    {subItem.badge && <NavBadge>{subItem.badge}</NavBadge>}
                  </Link>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  )
}

function SidebarMenuCollapsedDropdown({
  item,
  href,
}: {
  item: NavCollapsible
  href: string
}) {
  const isActive = checkIsActive(href, item, true)
  return (
    <SidebarMenuItem>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuButton
            tooltip={item.title}
            isActive={isActive}
            className='text-slate-700/95 transition-all hover:bg-orange-100/80 hover:text-slate-900 data-[active=true]:bg-gradient-to-r data-[active=true]:from-rose-500/20 data-[active=true]:to-amber-500/20 data-[active=true]:text-rose-900 data-[active=true]:ring-1 data-[active=true]:ring-rose-200 data-[active=true]:shadow-sm'
          >
            <SidebarItemIcon icon={item.icon} seed={item.title} />
            <span>{item.title}</span>
            {item.badge && <NavBadge>{item.badge}</NavBadge>}
            <ChevronRight className='ms-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90' />
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent side='right' align='start' sideOffset={4}>
          <DropdownMenuLabel>
            {item.title} {item.badge ? `(${item.badge})` : ''}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {item.items.map((sub) => (
            <DropdownMenuItem key={`${sub.title}-${sub.url}`} asChild>
              <Link
                to={sub.url}
                className={`${checkIsActive(href, sub) ? 'bg-secondary' : ''}`}
              >
                {sub.icon && <sub.icon />}
                <span className='max-w-52 text-wrap'>{sub.title}</span>
                {sub.badge && (
                  <span className='ms-auto text-xs'>{sub.badge}</span>
                )}
              </Link>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  )
}

function checkIsActive(href: string, item: NavItem, mainNav = false) {
  return (
    href === item.url || // /endpint?search=param
    href.split('?')[0] === item.url || // endpoint
    !!item?.items?.filter((i) => i.url === href).length || // if child nav is active
    (mainNav &&
      href.split('/')[1] !== '' &&
      href.split('/')[1] === item?.url?.split('/')[1])
  )
}
