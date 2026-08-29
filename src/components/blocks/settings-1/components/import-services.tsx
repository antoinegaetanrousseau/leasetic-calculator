import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { SERVICES } from "./data"
import { ServiceCard } from "./service-card"
import { HugeiconsIcon } from "@hugeicons/react"
import { Alert02Icon, ArrowLeft02Icon, ArrowRight02Icon } from "@hugeicons/core-free-icons"

const MAX_SELECTED_SERVICES = 2

const TOAST_ICONS = {
  warning: (
    <HugeiconsIcon icon={Alert02Icon} strokeWidth={2} className="text-warning size-4" aria-hidden="true" />
  ),
}

export function ImportServices() {
  const [selected, setSelected] = useState<string[]>([])

  function toggleService(id: string) {
    if (selected.includes(id)) {
      setSelected((prev) => prev.filter((s) => s !== id))
      return
    }

    if (selected.length >= MAX_SELECTED_SERVICES) {
      toast.warning("Select up to 2 services", {
        description: "Remove one service before adding another.",
        icon: TOAST_ICONS.warning,
      })
      return
    }

    setSelected((prev) => [...prev, id])
  }

  return (
    <Card className="w-full max-w-4xl">
      {/* Header */}
      <CardHeader>
        <CardTitle>Import from other services</CardTitle>
        <CardDescription>
          Select maximum 2 services to copy tasks from and authentication
          details to access their API.
        </CardDescription>
      </CardHeader>

      {/* Content */}
      <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
        {SERVICES.map((service) => (
          <ServiceCard
            key={service.id}
            service={service}
            selected={selected.includes(service.id)}
            onSelect={toggleService}
          />
        ))}
      </CardContent>

      {/* Footer */}
      <CardFooter className="flex items-center justify-between">
        <Button variant="outline">
          <HugeiconsIcon icon={ArrowLeft02Icon} strokeWidth={2} aria-hidden="true" />
          Go back
        </Button>

        <Button>
          {selected.length > 0 && <span>({selected.length})</span>}
          Next step
          <HugeiconsIcon icon={ArrowRight02Icon} strokeWidth={2} aria-hidden="true" />
        </Button>
      </CardFooter>
    </Card>
  )
}