// url=https://www.figma.com/design/OUl6fQsessGM6AcnSau98g/Leasetic-Design-System?node-id=344-3270
// source=src/components/ui/alert.tsx
// component=Alert
import figma from 'figma'
const instance = figma.selectedInstance

const title = instance.getString('Title')
const description = instance.getString('Description')
const showDescription = instance.getBoolean('Show description')
const variant = instance.getEnum('Tone', {
  'Info': 'info',
  'Success': 'success',
  'Warning': 'warning',
  'Danger': 'destructive',
})

export default {
  example: figma.code`
<Alert variant="${variant}">
  <AlertTitle>${title}</AlertTitle>
  ${showDescription ? figma.code`<AlertDescription>${description}</AlertDescription>` : ''}
</Alert>
`,
  imports: ['import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"'],
  id: 'alert',
  metadata: { nestable: true },
}
