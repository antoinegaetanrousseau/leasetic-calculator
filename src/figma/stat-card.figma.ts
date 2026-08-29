// url=https://www.figma.com/design/OUl6fQsessGM6AcnSau98g/Leasetic-Design-System?node-id=345-3295
// source=src/components/ui/stat-card.tsx
// component=StatCard
import figma from 'figma'
const instance = figma.selectedInstance

const label = instance.getString('Label')
const value = instance.getString('Value')
const delta = instance.getString('Delta')
const context = instance.getString('Context')
const trend = instance.getEnum('Trend', { 'Up': 'up', 'Down': 'down' })

export default {
  example: figma.code`
<StatCard
  label="${label}"
  value="${value}"
  delta="${delta}"
  context="${context}"
  trend="${trend}"
/>
`,
  imports: ['import { StatCard } from "@/components/ui/stat-card"'],
  id: 'stat-card',
  metadata: { nestable: true },
}
