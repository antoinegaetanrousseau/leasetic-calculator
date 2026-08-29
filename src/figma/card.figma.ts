// url=https://www.figma.com/design/OUl6fQsessGM6AcnSau98g/Leasetic-Design-System?node-id=345-3267
// source=src/components/ui/card.tsx
// component=Card
import figma from 'figma'
const instance = figma.selectedInstance

const title = instance.getString('Title')
const description = instance.getString('Description')

export default {
  example: figma.code`
<Card>
  <CardHeader>
    <CardTitle>${title}</CardTitle>
    <CardDescription>${description}</CardDescription>
  </CardHeader>
  <CardContent>{/* content */}</CardContent>
  <CardFooter className="justify-end gap-2">{/* actions */}</CardFooter>
</Card>
`,
  imports: ['import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"'],
  id: 'card',
  metadata: { nestable: true },
}
