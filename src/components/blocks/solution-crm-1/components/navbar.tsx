import { NavbarActions } from "./navbar-actions"
import { NavbarBreadcrumb } from "./navbar-breadcrumb"
import { NavbarPresence } from "./navbar-presence"

// Navbar with CRM breadcrumb, sales presence, and actions.

export function Navbar() {
  return (
    <header className="border-border bg-background sticky top-0 z-20 flex h-12 w-full shrink-0 items-center justify-between gap-2 border-b px-4">
      {/* Left - breadcrumb */}
      <NavbarBreadcrumb />

      {/* Right - team presence + actions */}
      <div className="flex shrink-0 items-center gap-2">
        <NavbarPresence />
        <NavbarActions />
      </div>
    </header>
  )
}