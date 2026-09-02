// url=https://www.figma.com/design/OUl6fQsessGM6AcnSau98g/Leasetic-Design-System?node-id=346-3273
// source=src/components/ui/dropdown-menu.tsx
// component=DropdownMenu
import figma from 'figma'
const instance = figma.selectedInstance

export default {
  example: figma.code`
<DropdownMenu>
  <DropdownMenuTrigger asChild>{/* trigger */}</DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem>Edit</DropdownMenuItem>
    <DropdownMenuItem>Share</DropdownMenuItem>
    <DropdownMenuItem>Settings</DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
`,
  imports: ['import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"'],
  id: 'dropdown-menu',
  metadata: { nestable: false },
}
