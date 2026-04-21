import { Link } from '@tanstack/react-router'
import {
  ArrowLeft,
  ArrowRight,
  LayoutDashboard,
  RotateCcw,
  Upload,
  type LucideIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar'

export type ProductEditorSidebarSection = {
  step: number
  title: string
  description: string
  icon: LucideIcon
  meta: string
  complete: boolean
}

type Props = {
  currentStep: number
  sections: ProductEditorSidebarSection[]
  productName: string
  isEditMode: boolean
  lastSavedLabel: string
  isAvailable: boolean
  selectedWebsiteCount: number
  onStepSelect: (step: number) => void
  onPrevious: () => void
  onNext: () => void
  canGoPrevious: boolean
  canGoNext: boolean
  onReset: () => void
  resetLabel: string
}

export default function ProductEditorSidebar({
  currentStep,
  sections,
  onStepSelect,
  onPrevious,
  onNext,
  canGoPrevious,
  canGoNext,
  onReset,
  resetLabel,
}: Props) {
  return (
    <Sidebar
      className='[&_[data-slot=sidebar-inner]]:border-sidebar-border/70 [&_[data-slot=sidebar-inner]]:bg-sidebar/98 [&_[data-slot=sidebar-inner]]:border-r [&_[data-slot=sidebar-inner]]:shadow-[0_14px_34px_rgba(15,23,42,0.06)] dark:[&_[data-slot=sidebar-inner]]:shadow-[0_14px_34px_rgba(2,6,23,0.28)]'
      id='product-editor-sidebar'
    >
      <SidebarContent className='p-3'>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {sections.map((section) => {
                const SectionIcon = section.icon
                return (
                  <SidebarMenuItem key={section.step}>
                    <SidebarMenuButton
                      type='button'
                      isActive={currentStep === section.step}
                      onClick={() => onStepSelect(section.step)}
                      className='rounded-lg px-3 py-2.5'
                    >
                      <SectionIcon className='h-4 w-4 shrink-0' />
                      <span>{section.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild className='rounded-lg px-3 py-2.5'>
                  <Link to='/products'>
                    <ArrowLeft className='h-4 w-4' />
                    <span>Back to products</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild className='rounded-lg px-3 py-2.5'>
                  <Link to='/upload-products'>
                    <Upload className='h-4 w-4' />
                    <span>Upload excel</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  type='button'
                  onClick={onReset}
                  className='rounded-lg px-3 py-2.5'
                >
                  <RotateCcw className='h-4 w-4' />
                  <span>{resetLabel}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild className='rounded-lg px-3 py-2.5'>
                  <Link to='/'>
                    <LayoutDashboard className='h-4 w-4' />
                    <span>Exit to dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className='border-sidebar-border/70 border-t p-3'>
        <div className='grid grid-cols-2 gap-2'>
          <Button
            type='button'
            variant='outline'
            disabled={!canGoPrevious}
            onClick={onPrevious}
            className='h-10 rounded-lg hover:bg-white hover:text-black'
          >
            <ArrowLeft className='mr-2 h-4 w-4' />
            Previous
          </Button>
          <Button
            type='button'
            disabled={!canGoNext}
            onClick={onNext}
            className='h-10 rounded-lg bg-slate-900 text-white hover:bg-white hover:text-black dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100'
          >
            Next
            <ArrowRight className='ml-2 h-4 w-4' />
          </Button>
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
