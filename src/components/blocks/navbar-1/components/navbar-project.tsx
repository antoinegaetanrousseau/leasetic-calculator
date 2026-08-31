import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { HugeiconsIcon } from "@hugeicons/react"
import { FolderIcon } from "@hugeicons/core-free-icons"

// ── Navbar project (title + breadcrumb) ──

export function NavbarProject() {
  return (
    <Breadcrumb>
      {/* List */}
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href="#" className="flex items-center gap-1">
            <HugeiconsIcon icon={FolderIcon} strokeWidth={2} className="text-muted-foreground size-3.5" aria-hidden="true" />
            <span className="hidden md:inline">Products</span>
          </BreadcrumbLink>
        </BreadcrumbItem>

        <BreadcrumbSeparator />

        <BreadcrumbItem>
          <BreadcrumbLink href="#" className="flex items-center gap-1">
            <HugeiconsIcon icon={FolderIcon} strokeWidth={2} className="text-muted-foreground size-3.5" aria-hidden="true" />
            <span className="hidden md:inline">Mobile</span>
          </BreadcrumbLink>
        </BreadcrumbItem>

        <BreadcrumbSeparator />

        <BreadcrumbItem>
          <BreadcrumbPage>Checkout Flow</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  )
}