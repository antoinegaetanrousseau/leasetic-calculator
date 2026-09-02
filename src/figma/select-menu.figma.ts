// url=https://www.figma.com/design/OUl6fQsessGM6AcnSau98g/Leasetic-Design-System?node-id=340-3212
// source=src/components/ui/select.tsx
// component=SelectContent
import figma from 'figma'
const instance = figma.selectedInstance

export default {
  example: figma.code`
<SelectContent>
  <SelectItem value="one">Option one</SelectItem>
  <SelectItem value="two">Option two</SelectItem>
  <SelectItem value="three">Option three</SelectItem>
</SelectContent>
`,
  imports: ['import { SelectContent, SelectItem } from "@/components/ui/select"'],
  id: 'select-menu',
  metadata: { nestable: true },
}
