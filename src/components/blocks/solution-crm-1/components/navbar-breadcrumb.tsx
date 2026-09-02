import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { HugeiconsIcon } from "@hugeicons/react"
import { Home03Icon, DashboardSquare02Icon } from "@hugeicons/core-free-icons"

// Navbar breadcrumb

export function NavbarBreadcrumb() {
  return (
    <Breadcrumb>
      {/* List */}
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href="#" className="flex items-center md:gap-1.5">
            <HugeiconsIcon icon={Home03Icon} strokeWidth={2} className="text-muted-foreground size-3.5" aria-hidden="true" />
            <span className="hidden md:block">Home</span>
          </BreadcrumbLink>
        </BreadcrumbItem>

        <BreadcrumbSeparator>/</BreadcrumbSeparator>

        <BreadcrumbItem>
          <BreadcrumbLink href="#" className="flex items-center gap-1.5">
            <HugeiconsIcon icon={DashboardSquare02Icon} strokeWidth={2} className="text-muted-foreground size-3.5" aria-hidden="true" />
            <span className="hidden md:block">CRM</span>
          </BreadcrumbLink>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  )
}