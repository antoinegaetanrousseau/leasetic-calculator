// url=https://www.figma.com/design/OUl6fQsessGM6AcnSau98g/Leasetic-Design-System?node-id=347-3301
// source=src/components/ui/dialog.tsx
// component=Dialog
import figma from 'figma'
const instance = figma.selectedInstance

const title = instance.getString('Title')
const body = instance.getString('Body')

export default {
  example: figma.code`
<Dialog>
  <DialogTrigger asChild>{/* trigger */}</DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>${title}</DialogTitle>
      <DialogDescription>${body}</DialogDescription>
    </DialogHeader>
    <DialogFooter>{/* secondary + primary actions */}</DialogFooter>
  </DialogContent>
</Dialog>
`,
  imports: ['import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"'],
  id: 'dialog',
  metadata: { nestable: false },
}
