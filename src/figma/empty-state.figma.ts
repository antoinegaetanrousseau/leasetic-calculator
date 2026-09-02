// url=https://www.figma.com/design/OUl6fQsessGM6AcnSau98g/Leasetic-Design-System?node-id=347-3318
// source=src/components/ui/empty-state.tsx
// component=EmptyState
import figma from 'figma'
const instance = figma.selectedInstance

const title = instance.getString('Title')
const description = instance.getString('Description')

export default {
  example: figma.code`
<EmptyState
  icon={FolderIcon}
  title="${title}"
  description="${description}"
  action={{/* primary action */}}
/>
`,
  imports: ['import { EmptyState } from "@/components/ui/empty-state"'],
  id: 'empty-state',
  metadata: { nestable: false },
}
