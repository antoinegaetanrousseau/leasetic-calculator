"use client"

import { useState } from "react"
import {
  Frame,
  FrameDescription,
  FrameHeader,
  FramePanel,
  FrameTitle,
} from "@/components/reui/frame"
import { toast } from "sonner"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { FieldGroup } from "@/components/ui/field"

import { TOAST_INFO_ICON, TOAST_SUCCESS_ICON } from "./data"
import { SettingRow } from "./setting-row"

export function DangerTabContent() {
  const [removeOpen, setRemoveOpen] = useState(false)

  const handleSuspend = () => {
    toast("Member suspended", {
      description: "Nora Vale cannot sign in until an admin restores access.",
      icon: TOAST_INFO_ICON,
    })
  }

  const handleDeactivate = () => {
    toast("Member deactivated", {
      description: "Seat freed. Access removed while history is kept.",
      icon: TOAST_INFO_ICON,
    })
  }

  const handleRemove = () => {
    setRemoveOpen(false)
    toast.success("Member removed", {
      description: "Nora Vale lost workspace access. usr_a1b2c3d4 is archived.",
      icon: TOAST_SUCCESS_ICON,
    })
  }

  return (
    <Frame spacing="sm" className="text-foreground border-destructive/30">
      <FrameHeader>
        <FrameTitle className="text-destructive-foreground capitalize">
          Danger Zone
        </FrameTitle>
        <FrameDescription className="dark:text-foreground/70">
          Actions that limit or end access.
        </FrameDescription>
      </FrameHeader>

      <FramePanel className="p-0">
        <FieldGroup className="gap-0">
          <SettingRow
            title="Suspend member"
            description="Block sign-in but keep the seat and history."
          >
            <Button type="button" variant="outline" onClick={handleSuspend}>
              Suspend
            </Button>
          </SettingRow>

          <SettingRow
            title="Deactivate member"
            description="Free the seat and revoke access. History is kept."
          >
            <Button type="button" variant="outline" onClick={handleDeactivate}>
              Deactivate
            </Button>
          </SettingRow>

          <SettingRow
            title="Remove member"
            description="Delete the member and detach all roles. Cannot be undone."
            last
          >
            <Button
              type="button"
              variant="destructive"
              onClick={() => setRemoveOpen(true)}
            >
              Remove
            </Button>
          </SettingRow>
        </FieldGroup>
      </FramePanel>

      <AlertDialog open={removeOpen} onOpenChange={setRemoveOpen}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this member?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes{" "}
              <span className="text-foreground font-medium">Nora Vale</span>{" "}
              from Acme Cloud and detaches 2 roles and 2 teams. Connect your API
              to persist changes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleRemove}>
              Remove Member
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Frame>
  )
}