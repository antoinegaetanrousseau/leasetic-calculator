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
import { PhoneInput } from "@/components/reui/phone-input"

import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"

import {
  DIGEST_OPTIONS,
  LANDING_VIEW_OPTIONS,
  LANGUAGE_OPTIONS,
  PROFILE_IDENTITY,
  ROLE_OPTIONS,
} from "./data"
import { ImageUploadField } from "./image-upload-field"
import {
  ProfileAdvancedSelectField,
  ProfileCompactSelectField,
  ProfileTimezoneField,
} from "./profile-form-fields"
import { SettingRow } from "./setting-row"

export function ProfileTabContent() {
  const [phoneNumber, setPhoneNumber] = useState(PROFILE_IDENTITY.phone)

  return (
    <div className="space-y-4">
      <Frame spacing="sm">
        <FrameHeader>
          <FrameTitle className="capitalize">Profile details</FrameTitle>
          <FrameDescription>Personal account info.</FrameDescription>
        </FrameHeader>

        <FramePanel className="p-0">
          <FieldGroup className="gap-0">
            <SettingRow
              title="Profile photo"
              description="Shown in comments and mentions."
              labelFor="profile-photo"
            >
              <ImageUploadField
                ariaLabel="Upload profile photo"
                inputId="profile-photo"
                variant="avatar"
                defaultImage="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=96&h=96&dpr=2&q=80"
                alt={PROFILE_IDENTITY.name}
              />
            </SettingRow>

            <SettingRow
              title="Full name"
              description="Used across Atlas."
              labelFor="profile-name"
            >
              <Input id="profile-name" defaultValue={PROFILE_IDENTITY.name} />
            </SettingRow>

            <SettingRow
              title="Email address"
              description="Primary sign-in email."
              labelFor="profile-email"
              titleAddon={
                <Badge variant="success-light" size="sm">
                  Verified
                </Badge>
              }
            >
              <Input id="profile-email" defaultValue={PROFILE_IDENTITY.email} />
            </SettingRow>

            <SettingRow
              title="Phone number"
              description="Recovery and urgent alerts."
            >
              <PhoneInput
                className="w-full"
                variant="sm"
                placeholder="Enter phone number"
                defaultCountry="US"
                value={phoneNumber}
                onChange={(value) => setPhoneNumber(value || "")}
              />
            </SettingRow>

            <SettingRow
              title="Username"
              description="Used in mentions and links."
              labelFor="profile-username"
            >
              <InputGroup className="w-full">
                <InputGroupAddon align="inline-start">
                  <InputGroupText>@</InputGroupText>
                </InputGroupAddon>
                <InputGroupInput
                  id="profile-username"
                  defaultValue={PROFILE_IDENTITY.username}
                />
              </InputGroup>
            </SettingRow>

            <SettingRow
              title="Public details"
              description="Shown across Atlas."
              contentClassName="@md/field-group:max-w-[32rem]"
            >
              <FieldSet className="w-full gap-3">
                <FieldLegend className="sr-only">Public details</FieldLegend>
                <FieldDescription className="sr-only">
                  Public profile and workspace defaults.
                </FieldDescription>

                <FieldGroup className="gap-3">
                  <Field>
                    <FieldLabel htmlFor="profile-role">Role</FieldLabel>
                    <ProfileCompactSelectField
                      id="profile-role"
                      options={ROLE_OPTIONS}
                      defaultValue={ROLE_OPTIONS[0]}
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="profile-timezone">
                      Time zone
                    </FieldLabel>
                    <ProfileTimezoneField
                      id="profile-timezone"
                      placeholder="Select a timezone"
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="profile-website">Website</FieldLabel>
                    <InputGroup className="w-full">
                      <InputGroupAddon align="inline-start">
                        <InputGroupText>https://</InputGroupText>
                      </InputGroupAddon>
                      <InputGroupInput
                        id="profile-website"
                        defaultValue={PROFILE_IDENTITY.website}
                      />
                    </InputGroup>
                  </Field>
                </FieldGroup>
              </FieldSet>
            </SettingRow>

            <SettingRow
              title="Bio"
              description="Short profile summary."
              labelFor="profile-bio"
              contentClassName="@md/field-group:w-full"
              last
            >
              <Textarea
                id="profile-bio"
                defaultValue={PROFILE_IDENTITY.bio}
                className="min-h-24 w-full resize-none"
              />
            </SettingRow>
          </FieldGroup>
        </FramePanel>

        <FrameFooter className="flex-row justify-end gap-2">
          <Button type="button" variant="outline">
            Cancel
          </Button>
          <Button type="button">Save changes</Button>
        </FrameFooter>
      </Frame>

      <Frame spacing="sm">
        <FrameHeader>
          <FrameTitle className="capitalize">Profile preferences</FrameTitle>
          <FrameDescription>Default workspace behavior.</FrameDescription>
        </FrameHeader>

        <FramePanel className="p-0">
          <FieldGroup className="gap-0">
            <SettingRow title="Language" compact>
              <ProfileAdvancedSelectField
                id="profile-language"
                options={LANGUAGE_OPTIONS}
                defaultValue={LANGUAGE_OPTIONS[0]}
              />
            </SettingRow>

            <SettingRow title="Landing view" compact>
              <ProfileAdvancedSelectField
                id="profile-landing-view"
                options={LANDING_VIEW_OPTIONS}
                defaultValue={LANDING_VIEW_OPTIONS[2]}
              />
            </SettingRow>

            <SettingRow title="Digest cadence" compact>
              <ProfileAdvancedSelectField
                id="profile-digest"
                options={DIGEST_OPTIONS}
                defaultValue={DIGEST_OPTIONS[2]}
              />
            </SettingRow>

            <SettingRow
              title="Daily briefing"
              description="Morning recap before meetings."
              labelFor="profile-daily-briefing"
              compact
              last
            >
              <Switch id="profile-daily-briefing" defaultChecked />
            </SettingRow>
          </FieldGroup>
        </FramePanel>
      </Frame>
    </div>
  )
}