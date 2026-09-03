import { useState } from "react"
import { Badge } from "@/components/reui/badge"
import {
  Frame,
  FrameDescription,
  FrameFooter,
  FrameHeader,
  FramePanel,
  FrameTitle,
} from "@/components/reui/frame"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { FieldGroup } from "@/components/ui/field"

import {
  ROLE_CHIPS,
  ROLE_OPTIONS,
  SCOPE_CHIPS,
  TEAM_CHIPS,
  TEAM_OPTIONS,
  TOAST_SUCCESS_ICON,
} from "./data"
import { MemberCompactSelectField } from "./member-form-fields"
import { MemberSummaryFrame } from "./member-summary-frames"
import { SettingRow } from "./setting-row"

const SCOPE_SIGNALS = [
  {
    id: "scope-read",
    label: "Effective access",
    value: "Read across Members and Audit log",
    detail: "Inherited from the Member role and the Product team.",
    badge: { label: "Read", variant: "info-light" as const },
  },
  {
    id: "scope-write",
    label: "Elevated scope",
    value: "Write on Settings",
    detail: "Granted by the custom Support Agent role. Expires in 7 days.",
    badge: { label: "Write", variant: "warning-light" as const },
  },
]

function DotSeparator() {
  return (
    <span
      className="bg-muted-foreground/40 size-1 shrink-0 rounded-full"
      aria-hidden="true"
    />
  )
}

export function AccessTabContent() {
  const [dirty, setDirty] = useState(false)

  const handleSave = () => {
    setDirty(false)
    toast.success("Access updated", {
      description: "Nora Vale keeps Member plus the Support Agent role.",
      icon: TOAST_SUCCESS_ICON,
    })
  }

  return (
    <div className="space-y-4">
      <Frame spacing="sm" className="text-foreground">
        <FrameHeader>
          <FrameTitle className="capitalize">Roles &amp; Teams</FrameTitle>
          <FrameDescription className="dark:text-foreground/70 flex items-center gap-1.5">
            <span>2 roles</span>
            <DotSeparator />
            <span>2 teams assigned</span>
          </FrameDescription>
        </FrameHeader>

        <FramePanel className="p-0">
          <FieldGroup className="gap-0">
            <SettingRow
              title="Roles"
              description="Member plus a custom role."
              labelFor="access-role"
              titleAddon={
                dirty ? <Badge variant="warning-light">Unsaved</Badge> : null
              }
            >
              <MemberCompactSelectField
                id="access-role"
                options={ROLE_OPTIONS}
                defaultValue={ROLE_OPTIONS[0]}
              />
            </SettingRow>

            <SettingRow
              title="Assigned roles"
              description="Applied on every sign-in."
              stacked
            >
              <div className="flex flex-wrap gap-1.5">
                {ROLE_CHIPS.map((chip) => (
                  <Badge key={chip.label} variant={chip.variant}>
                    {chip.label}
                  </Badge>
                ))}
              </div>
            </SettingRow>

            <SettingRow
              title="Team"
              description="Add Nora to a team."
              labelFor="access-team"
            >
              <MemberCompactSelectField
                id="access-team"
                options={TEAM_OPTIONS}
                defaultValue={TEAM_OPTIONS[0]}
              />
            </SettingRow>

            <SettingRow
              title="Teams"
              description="Drives default access scopes."
              stacked
            >
              <div className="flex flex-wrap gap-1.5">
                {TEAM_CHIPS.map((chip) => (
                  <Badge key={chip.label} variant={chip.variant}>
                    {chip.label}
                  </Badge>
                ))}
              </div>
            </SettingRow>

            <SettingRow
              title="Permission scopes"
              description="Resolved from roles and teams."
              stacked
              last
            >
              <div className="flex flex-wrap gap-1.5">
                {SCOPE_CHIPS.map((chip) => (
                  <Badge key={chip.label} variant={chip.variant}>
                    {chip.label}
                  </Badge>
                ))}
              </div>
            </SettingRow>
          </FieldGroup>
        </FramePanel>

        <FrameFooter className="flex-row items-center justify-end gap-2">
          {dirty ? (
            <span className="text-muted-foreground me-auto text-sm">
              1 unsaved change
            </span>
          ) : null}
          <Button
            type="button"
            variant="outline"
            onClick={() => setDirty(true)}
          >
            Add role
          </Button>
          <Button type="button" disabled={!dirty} onClick={handleSave}>
            Save access
          </Button>
        </FrameFooter>
      </Frame>

      <MemberSummaryFrame
        title="Effective access"
        description="What this member can reach today."
        items={SCOPE_SIGNALS}
      />
    </div>
  )
}