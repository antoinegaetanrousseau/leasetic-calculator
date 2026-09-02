import { NavbarActions } from "./navbar-actions"
import { NavbarBreadcrumb } from "./navbar-breadcrumb"

// Navbar with breadcrumb and report range actions.

export function Navbar() {
  return (
    <header
      className="flex min-h-9 w-full shrink-0 items-center justify-between gap-2 pb-1"
      aria-label="Fulfillment command header"
    >
      <NavbarBreadcrumb />

      <NavbarActions />
    </header>
  )
}