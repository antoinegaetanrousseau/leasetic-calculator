// url=https://www.figma.com/design/OUl6fQsessGM6AcnSau98g/Leasetic-Design-System?node-id=348-3326
// source=src/components/ui/table.tsx
// component=Table
import figma from 'figma'
const instance = figma.selectedInstance

export default {
  example: figma.code`
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Contract</TableHead>
      <TableHead>Client</TableHead>
      <TableHead>Status</TableHead>
      <TableHead className="text-right">Amount</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {rows.map((row) => (
      <TableRow key={row.id}>
        <TableCell className="font-medium">{row.contract}</TableCell>
        <TableCell className="text-muted-foreground">{row.client}</TableCell>
        <TableCell><Badge variant={row.statusVariant}>{row.status}</Badge></TableCell>
        <TableCell className="text-right">{row.amount}</TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
`,
  imports: ['import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"'],
  id: 'table',
  metadata: { nestable: false },
}
