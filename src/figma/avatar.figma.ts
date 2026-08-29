// url=https://www.figma.com/design/OUl6fQsessGM6AcnSau98g/Leasetic-Design-System?node-id=341-3264
// source=src/components/ui/avatar.tsx
// component=Avatar
import figma from 'figma'
const instance = figma.selectedInstance

const initials = instance.getString('Initials')
const type = instance.getEnum('Type', { 'Initials': 'initials', 'Icon': 'icon' })
const sizeClass = instance.getEnum('Size', { 'SM': 'size-8', 'MD': 'size-10', 'LG': 'size-14' })

export default {
  example: figma.code`
<Avatar className="${sizeClass}">
  <AvatarImage src={undefined} alt="" />
  <AvatarFallback>${type === 'icon' ? figma.code`<UserIcon className="size-1/2" />` : initials}</AvatarFallback>
</Avatar>
`,
  imports: ['import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"'],
  id: 'avatar',
  metadata: { nestable: true },
}
