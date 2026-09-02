// url=https://www.figma.com/design/OUl6fQsessGM6AcnSau98g/Leasetic-Design-System?node-id=344-3271
// source=src/components/ui/sonner.tsx
// component=toast
import figma from 'figma'
const instance = figma.selectedInstance

const message = instance.getString('Message')
const method = instance.getEnum('Tone', {
  'Info': 'info',
  'Success': 'success',
  'Warning': 'warning',
  'Danger': 'error',
})

export default {
  example: figma.code`toast.${method}("${message}")`,
  imports: ['import { toast } from "sonner"'],
  id: 'toast',
  metadata: { nestable: false },
}
