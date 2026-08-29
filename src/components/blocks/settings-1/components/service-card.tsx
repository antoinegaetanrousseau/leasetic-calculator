import { Badge } from "@/components/reui/badge"
import { Frame, FramePanel } from "@/components/reui/frame"

import { cn } from "@/lib/utils"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldLabel } from "@/components/ui/field"
import { Item, ItemMedia } from "@/components/ui/item"

import { type IService, type ServiceStatus } from "./data"

const statusConfig: Record<
  ServiceStatus,
  { label: string; variant: "info-light" | "warning-light" }
> = {
  easy: { label: "Easy Import", variant: "info-light" },
  "multi-step": { label: "2-Step Import", variant: "warning-light" },
}

export function ServiceCard({
  service,
  selected,
  onSelect,
}: {
  service: IService
  selected: boolean
  onSelect: (id: string) => void
}) {
  const { label, variant } = statusConfig[service.status]
  const checkboxId = `import-service-${service.id}`

  return (
    <Frame
      className={cn("transition-colors", selected && "ring-primary ring-2")}
    >
      {/* Content */}
      <FramePanel className="relative flex flex-col p-0 shadow-none! before:hidden">
        <FieldLabel
          htmlFor={checkboxId}
          className="relative block w-full cursor-pointer border-0 p-0!"
        >
          <Field orientation="horizontal" className="w-full">
            <Checkbox
              id={checkboxId}
              name={`import-service-${service.id}`}
              checked={selected}
              onCheckedChange={() => onSelect(service.id)}
              className="absolute top-2.5 right-2.5 z-10 size-5 rounded-full"
            />
            <div className="flex w-full flex-col gap-3">
              <Item className="bg-muted/60 border-background flex size-11 shrink-0 items-center justify-center border-2 p-0 shadow-[0_1px_3px_0_rgba(0,0,0,0.14)] dark:border">
                <ItemMedia variant="icon" className="size-auto">
                  {service.logo}
                </ItemMedia>
              </Item>

              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">{service.name}</h2>
                <Badge variant={variant}>{label}</Badge>
              </div>

              <p className="text-muted-foreground text-sm">
                {service.description}
              </p>
            </div>
          </Field>
        </FieldLabel>
      </FramePanel>
    </Frame>
  )
}