// url=https://www.figma.com/design/OUl6fQsessGM6AcnSau98g/Leasetic-Design-System?node-id=341-3265
// source=src/components/ui/progress.tsx
// component=Progress
import figma from 'figma'
const instance = figma.selectedInstance

const label = instance.getString('Label')
const value = instance.getEnum('Value', { '25': '25', '60': '60', '100': '100' })

export default {
  example: figma.code`
<div className="grid gap-2">
  <div className="flex items-center justify-between text-xs font-medium">
    <span className="text-muted-foreground">${label}</span>
    <span>${value}%</span>
  </div>
  <Progress value={${value}} />
</div>
`,
  imports: ['import { Progress } from "@/components/ui/progress"'],
  id: 'progress',
  metadata: { nestable: true },
}
