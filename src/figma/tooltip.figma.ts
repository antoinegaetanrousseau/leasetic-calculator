// url=https://www.figma.com/design/OUl6fQsessGM6AcnSau98g/Leasetic-Design-System?node-id=341-3263
// source=src/components/ui/tooltip.tsx
// component=Tooltip
import figma from 'figma'
const instance = figma.selectedInstance

const text = instance.getString('Text')
const side = instance.getEnum('Position', { 'Top': 'top', 'Bottom': 'bottom' })

export default {
  example: figma.code`
<Tooltip>
  <TooltipTrigger asChild>{/* trigger */}</TooltipTrigger>
  <TooltipContent side="${side}">${text}</TooltipContent>
</Tooltip>
`,
  imports: ['import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"'],
  id: 'tooltip',
  metadata: { nestable: true },
}
