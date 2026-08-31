// url=https://www.figma.com/design/OUl6fQsessGM6AcnSau98g/Leasetic-Design-System?node-id=339-3260
// source=src/components/ui/select.tsx
// component=Select
import figma from 'figma'
const instance = figma.selectedInstance

const label = instance.getString('Label')
const showLabel = instance.getBoolean('Show label')
const value = instance.getString('Value')
const errorText = instance.getString('Error text')
const size = instance.getEnum('Size', { 'MD': 'md', 'LG': 'lg' })
const state = instance.getEnum('State', {
  'Default': 'default',
  'Focus': 'focus',
  'Error': 'error',
  'Disabled': 'disabled',
})

export default {
  example: figma.code`
<div className="grid gap-2">
  ${showLabel ? figma.code`<Label>${label}</Label>` : ''}
  <Select ${state === 'disabled' ? 'disabled' : ''}>
    <SelectTrigger size="${size}" ${state === 'error' ? 'aria-invalid' : ''}>
      <SelectValue placeholder="${value}" />
    </SelectTrigger>
    <SelectContent>{/* SelectItem list */}</SelectContent>
  </Select>
  ${state === 'error' ? figma.code`<p className="text-destructive text-xs">${errorText}</p>` : ''}
</div>
`,
  imports: [
    'import { Select, SelectContent, SelectTrigger, SelectValue } from "@/components/ui/select"',
    'import { Label } from "@/components/ui/label"',
  ],
  id: 'select',
  metadata: { nestable: true },
}
