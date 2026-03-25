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
  { chip: 'bg-rose-100 dark:bg-rose-500/20', icon: 'text-rose-600 dark:text-rose-300' },
  { chip: 'bg-orange-100 dark:bg-orange-500/20', icon: 'text-orange-600 dark:text-orange-300' },
  { chip: 'bg-amber-100 dark:bg-amber-500/20', icon: 'text-amber-700 dark:text-amber-300' },
  { chip: 'bg-emerald-100 dark:bg-emerald-500/20', icon: 'text-emerald-600 dark:text-emerald-300' },
  { chip: 'bg-sky-100 dark:bg-sky-500/20', icon: 'text-sky-600 dark:text-sky-300' },
  { chip: 'bg-indigo-100 dark:bg-indigo-500/20', icon: 'text-indigo-600 dark:text-indigo-300' },
  { chip: 'bg-fuchsia-100 dark:bg-fuchsia-500/20', icon: 'text-fuchsia-600 dark:text-fuchsia-300' },
]

const NAV_ITEM_TEXT_CLASS = 'flex-1 min-w-0 whitespace-nowrap leading-none text-start'

const iconAccentByKey = (key: string) => {
  const code = Array.from(String(key || '')).reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return ICON_ACCENTS[code % ICON_ACCENTS.length]
}

export function NavGroup({ title, items }: NavGroupProps) {
  const { state, isMobile } = useSidebar()
  const href = useLocation({ select: (location) => location.href })
  return (
    <SidebarGroup>
      <SidebarGroupLabel className='font-semibold tracking-wide text-sidebar-foreground/70'>
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
    <Badge className='rounded-full border-sidebar-border bg-sidebar-accent px-1.5 py-0 text-xs text-sidebar-accent-foreground'>
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
  const isActive = item.disabled ? false : checkIsActive(href, item)
  return (
    <SidebarMenuItem>
      {item.disabled ? (
        <SidebarMenuButton
          disabled
          tooltip={item.title}
          className='text-sidebar-foreground/90 data-[active=true]:text-sidebar-accent-foreground'
        >
          <SidebarItemIcon icon={item.icon} seed={item.title} />
          <span className={NAV_ITEM_TEXT_CLASS}>{item.title}</span>
          {item.badge && <NavBadge>{item.badge}</NavBadge>}
        </SidebarMenuButton>
      ) : (
          <SidebarMenuButton
            asChild
            isActive={isActive}
            tooltip={item.title}
            className='text-sidebar-foreground/90 data-[active=true]:text-sidebar-accent-foreground'
          >
            <Link to={item.url} onClick={() => setOpenMobile(false)}>
              <SidebarItemIcon icon={item.icon} seed={item.title} />
              <span className={NAV_ITEM_TEXT_CLASS}>{item.title}</span>
              {item.badge && <NavBadge>{item.badge}</NavBadge>}
            </Link>
          </SidebarMenuButton>
      )}
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
            className='text-sidebar-foreground/90 data-[active=true]:text-sidebar-accent-foreground'
          >
            <SidebarItemIcon icon={item.icon} seed={item.title} />
            <span className={NAV_ITEM_TEXT_CLASS}>{item.title}</span>
            {item.badge && <NavBadge>{item.badge}</NavBadge>}
            <ChevronRight className='ms-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 rtl:rotate-180' />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent className='CollapsibleContent'>
          <SidebarMenuSub>
            {item.items.map((subItem) => (
              <SidebarMenuSubItem key={subItem.title}>
                {subItem.disabled ? (
                  <SidebarMenuSubButton
                    aria-disabled={true}
                    className='text-sidebar-foreground/85 data-[active=true]:text-sidebar-accent-foreground'
                  >
                    <SidebarItemIcon icon={subItem.icon} seed={subItem.title} />
                    <span className={NAV_ITEM_TEXT_CLASS}>{subItem.title}</span>
                    {subItem.badge && <NavBadge>{subItem.badge}</NavBadge>}
                  </SidebarMenuSubButton>
                ) : (
                  <SidebarMenuSubButton
                    asChild
                    isActive={checkIsActive(href, subItem)}
                    className='text-sidebar-foreground/85 data-[active=true]:text-sidebar-accent-foreground'
                  >
                    <Link to={subItem.url} onClick={() => setOpenMobile(false)}>
                      <SidebarItemIcon icon={subItem.icon} seed={subItem.title} />
                      <span className={NAV_ITEM_TEXT_CLASS}>{subItem.title}</span>
                      {subItem.badge && <NavBadge>{subItem.badge}</NavBadge>}
                    </Link>
                  </SidebarMenuSubButton>
                )}
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
            className='text-sidebar-foreground/90 data-[active=true]:text-sidebar-accent-foreground'
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
            <DropdownMenuItem
              key={`${sub.title}-${sub.url}`}
              disabled={sub.disabled}
              asChild={!sub.disabled}
            >
              {sub.disabled ? (
                <>
                  {sub.icon && <sub.icon />}
                  <span className='max-w-52 text-wrap'>{sub.title}</span>
                  {sub.badge && (
                    <span className='ms-auto text-xs'>{sub.badge}</span>
                  )}
                </>
              ) : (
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
              )}
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
