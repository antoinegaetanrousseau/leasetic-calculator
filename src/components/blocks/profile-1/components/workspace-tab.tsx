import {
  Frame,
  FrameDescription,
  FrameFooter,
  FrameHeader,
  FramePanel,
  FrameTitle,
} from "@/components/reui/frame"

import { Button } from "@/components/ui/button"
import { FieldGroup } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group"
import { Switch } from "@/components/ui/switch"

import { BrandAccentPicker } from "./brand-accent-picker"
import {
  LANDING_VIEW_OPTIONS,
  WORKSPACE_IDENTITY,
  WORKSPACE_SIGNALS,
} from "./data"
import { ImageUploadField } from "./image-upload-field"
import { ProfileAdvancedSelectField } from "./profile-form-fields"
import { ProfileSummaryFrame } from "./profile-summary-frames"
import { SettingRow } from "./setting-row"

export function WorkspaceTabContent() {
  return (
    <div className="space-y-4">
      <Frame spacing="sm">
        <FrameHeader>
          <FrameTitle className="capitalize">Workspace details</FrameTitle>
          <FrameDescription>Brand and contact info.</FrameDescription>
        </FrameHeader>

        <FramePanel className="p-0!">
          <FieldGroup className="gap-0">
            <SettingRow
              title="Workspace logo"
              description="Used in navigation and shared links."
              labelFor="workspace-logo"
            >
              <ImageUploadField
                ariaLabel="Upload workspace logo"
                inputId="workspace-logo"
                defaultImage="https://images.unsplash.com/photo-1557683316-973673baf926?w=96&h=96&fit=crop&dpr=2&q=80"
                alt={WORKSPACE_IDENTITY.name}
              />
            </SettingRow>

            <SettingRow title="Workspace name" labelFor="workspace-name">
              <Input
                id="workspace-name"
                defaultValue={WORKSPACE_IDENTITY.name}
              />
            </SettingRow>

            <SettingRow
              title="Workspace URL"
              description="Link for teammates and clients."
              labelFor="workspace-subdomain"
            >
              <InputGroup className="w-full">
                <InputGroupInput
                  id="workspace-subdomain"
                  defaultValue={WORKSPACE_IDENTITY.subdomain}
                />
                <InputGroupAddon align="inline-end">
                  <InputGroupText>
                    {WORKSPACE_IDENTITY.domainSuffix}
                  </InputGroupText>
                </InputGroupAddon>
              </InputGroup>
            </SettingRow>

            <SettingRow
              title="Support email"
              description="Shown on help surfaces."
              labelFor="workspace-support-email"
            >
              <Input
                id="workspace-support-email"
                defaultValue={WORKSPACE_IDENTITY.supportEmail}
              />
            </SettingRow>

            <SettingRow
              title="Accent color"
              description="Used for highlights and links. Select one accent."
              compact
              last
            >
              <BrandAccentPicker />
            </SettingRow>
          </FieldGroup>
        </FramePanel>

        <FrameFooter className="flex-row justify-end gap-2">
          <Button type="button" variant="outline">
            Preview brand
          </Button>
          <Button type="button">Save workspace</Button>
        </FrameFooter>
      </Frame>

      <Frame spacing="sm">
        <FrameHeader>
          <FrameTitle className="capitalize">Workspace preferences</FrameTitle>
          <FrameDescription>Sharing and automation defaults.</FrameDescription>
        </FrameHeader>

        <FramePanel className="p-0!">
          <FieldGroup className="gap-0">
            <SettingRow title="Default landing view" compact>
              <ProfileAdvancedSelectField
                id="workspace-landing-view"
                options={LANDING_VIEW_OPTIONS}
                defaultValue={LANDING_VIEW_OPTIONS[1]}
              />
            </SettingRow>

            <SettingRow
              title="External sharing"
              description="Create client-safe links."
              labelFor="workspace-external-sharing"
              compact
            >
              <Switch id="workspace-external-sharing" defaultChecked />
            </SettingRow>

            <SettingRow
              title="AI project recaps"
              description="Short recaps as work changes."
              labelFor="workspace-ai-recaps"
              compact
              last
            >
              <Switch id="workspace-ai-recaps" defaultChecked />
            </SettingRow>
          </FieldGroup>
        </FramePanel>
      </Frame>

      <ProfileSummaryFrame
        title="Workspace summary"
        description="Brand, routing, and region."
        items={WORKSPACE_SIGNALS}
      />
    </div>
  )
}