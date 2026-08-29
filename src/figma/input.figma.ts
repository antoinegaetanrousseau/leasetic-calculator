// url=https://www.figma.com/design/OUl6fQsessGM6AcnSau98g/Leasetic-Design-System?node-id=337-3292
// source=src/components/ui/input.tsx
// component=Input
import figma from 'figma'
const instance = figma.selectedInstance

const label = instance.getString('Label')
const showLabel = instance.getBoolean('Show label')
const value = instance.getString('Value')
const errorText = instance.getString('Error text')
const size = instance.getEnum('Size', { 'MD': 'md', 'LG': 'lg' })
const surface = instance.getEnum('Surface', { 'Field': 'field', 'White': 'white' })
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
  <Input
    size="${size}"
    placeholder="${value}"
    ${surface === 'white' ? 'className="bg-background"' : ''}
    ${state === 'disabled' ? 'disabled' : ''}
    ${state === 'error' ? 'aria-invalid' : ''}
  />
  ${state === 'error' ? figma.code`<p className="text-destructive text-xs">${errorText}</p>` : ''}
</div>
`,
  imports: [
    'import { Input } from "@/components/ui/input"',
    'import { Label } from "@/components/ui/label"',
  ],
  id: 'input',
  metadata: { nestable: true },
}
