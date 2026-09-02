// url=https://www.figma.com/design/OUl6fQsessGM6AcnSau98g/Leasetic-Design-System?node-id=346-3328
// source=src/components/ui/breadcrumb.tsx
// component=Breadcrumb
import figma from 'figma'
const instance = figma.selectedInstance

export default {
  example: figma.code`
<Breadcrumb>
  <BreadcrumbList>
    <BreadcrumbItem><BreadcrumbLink href="/">Home</BreadcrumbLink></BreadcrumbItem>
    <BreadcrumbSeparator />
    <BreadcrumbItem><BreadcrumbLink href="/contracts">Contracts</BreadcrumbLink></BreadcrumbItem>
    <BreadcrumbSeparator />
    <BreadcrumbItem><BreadcrumbPage>LEASETIC-2026-114</BreadcrumbPage></BreadcrumbItem>
  </BreadcrumbList>
</Breadcrumb>
`,
  imports: ['import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"'],
  id: 'breadcrumb',
  metadata: { nestable: false },
}
