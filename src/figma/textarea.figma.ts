// url=https://www.figma.com/design/OUl6fQsessGM6AcnSau98g/Leasetic-Design-System?node-id=340-3245
// source=src/components/ui/textarea.tsx
// component=Textarea
import figma from 'figma'
const instance = figma.selectedInstance

const label = instance.getString('Label')
const showLabel = instance.getBoolean('Show label')
const value = instance.getString('Value')
const errorText = instance.getString('Error text')
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
  <Textarea
    placeholder="${value}"
    ${state === 'disabled' ? 'disabled' : ''}
    ${state === 'error' ? 'aria-invalid' : ''}
  />
  ${state === 'error' ? figma.code`<p className="text-destructive text-xs">${errorText}</p>` : ''}
</div>
`,
  imports: [
    'import { Textarea } from "@/components/ui/textarea"',
    'import { Label } from "@/components/ui/label"',
  ],
  id: 'textarea',
  metadata: { nestable: true },
}
