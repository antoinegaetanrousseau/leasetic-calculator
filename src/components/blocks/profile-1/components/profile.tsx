"use client"

import { useState, type ComponentType, type ReactNode } from "react"

import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { BillingTabContent } from "./billing-tab"
import { ProfileTabContent } from "./profile-tab"
import { TeamTabContent } from "./team-tab"
import { WorkspaceTabContent } from "./workspace-tab"
import { HugeiconsIcon } from "@hugeicons/react"
import { UserIcon, Building02Icon, UserMultiple02Icon, CreditCardIcon } from "@hugeicons/core-free-icons"

type ProfileTabValue = "profile" | "workspace" | "team" | "billing"

type ProfileTabConfig = {
  value: ProfileTabValue
  label: string
  icon: ReactNode
  component: ComponentType
}

const PROFILE_TABS: ProfileTabConfig[] = [
  {
    value: "profile",
    label: "Profile",
    icon: (
      <HugeiconsIcon icon={UserIcon} strokeWidth={2} aria-hidden="true" />
    ),
    component: ProfileTabContent,
  },
  {
    value: "workspace",
    label: "Workspace",
    icon: (
      <HugeiconsIcon icon={Building02Icon} strokeWidth={2} aria-hidden="true" />
    ),
    component: WorkspaceTabContent,
  },
  {
    value: "team",
    label: "Team",
    icon: (
      <HugeiconsIcon icon={UserMultiple02Icon} strokeWidth={2} aria-hidden="true" />
    ),
    component: TeamTabContent,
  },
  {
    value: "billing",
    label: "Billing",
    icon: (
      <HugeiconsIcon icon={CreditCardIcon} strokeWidth={2} aria-hidden="true" />
    ),
    component: BillingTabContent,
  },
]

export function Profile() {
  const isMobile = useIsMobile()
  const [activeTab, setActiveTab] = useState<ProfileTabValue>("profile")

  return (
    <div className="w-full max-w-4xl space-y-8">
      {/* Header */}
      <header className="px-1">
        <h1 className="text-xl font-semibold tracking-tight">
          Account Settings
        </h1>
        <p className="text-muted-foreground max-w-2xl text-sm leading-relaxed">
          Update your account, workspace, team, and billing.
        </p>
      </header>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as ProfileTabValue)}
        orientation={isMobile ? "horizontal" : "vertical"}
        className="w-full gap-5 lg:gap-8"
      >
        <SidebarRail isMobile={isMobile} activeValue={activeTab} />

        <div className="min-w-0 flex-1">
          {PROFILE_TABS.map((tab) => {
            const TabComponent = tab.component

            return (
              <TabsContent key={tab.value} value={tab.value} className="mt-0">
                <TabComponent />
              </TabsContent>
            )
          })}
        </div>
      </Tabs>
    </div>
  )
}

function SidebarRail({
  isMobile,
  activeValue,
}: {
  isMobile: boolean
  activeValue: ProfileTabValue
}) {
  return (
    <div className={cn("min-w-0", isMobile ? "w-full" : "w-40 shrink-0")}>
      {isMobile ? (
        <div className="-mx-1 overflow-x-auto px-1 pb-1">
          <TabsList className="h-auto w-max min-w-max justify-start gap-1 bg-transparent p-0">
            {PROFILE_TABS.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className={cn(
                  "w-full justify-start gap-3 px-3 py-1.5 shadow-none",
                  activeValue === tab.value ? "bg-muted!" : "bg-transparent"
                )}
              >
                {tab.icon}
                <span className="truncate">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      ) : (
        <TabsList className="h-auto w-full flex-col items-stretch gap-1 bg-transparent p-0">
          {PROFILE_TABS.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className={cn(
                "w-full justify-start gap-3 px-3 py-1.5 shadow-none",
                activeValue === tab.value ? "bg-muted!" : "bg-transparent"
              )}
            >
              {tab.icon}
              <span className="truncate">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      )}
    </div>
  )
}