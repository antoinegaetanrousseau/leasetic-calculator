"use client"

import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/components/reui/alert"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { HugeiconsIcon } from "@hugeicons/react"
import { Shield01Icon } from "@hugeicons/core-free-icons"

export function AccessReviewAlert() {
  return (
    <Alert variant="warning">
      <HugeiconsIcon icon={Shield01Icon} strokeWidth={2} aria-hidden="true" />
      <AlertTitle>Access review</AlertTitle>
      {/* Description */}
      <AlertDescription>
        Review billing roles and approvers before renewal.
      </AlertDescription>
      <AlertAction>
        <Button
          type="button"
          variant="outline"
          size="xs"
          onClick={() =>
            toast.message("Dismissed", {
              description:
                "Hide the billing access reminder in your app state.",
            })
          }
        >
          Dismiss
        </Button>
        <Button
          type="button"
          size="xs"
          onClick={() =>
            toast.info("Review access", {
              description: "Open your billing roles and approver review flow.",
            })
          }
        >
          Review
        </Button>
      </AlertAction>
    </Alert>
  )
}