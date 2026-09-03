import { useState, type ComponentType, type ReactNode } from "react"
import { Badge } from "@/components/reui/badge"

import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { AccessTabContent } from "./access-tab"
import { ActivityTabContent } from "./activity-tab"
import { AuthenticationTabContent } from "./authentication-tab"
import { DangerTabContent } from "./danger-tab"
import { MEMBER_IDENTITY } from "./data"
import { SessionsTabContent } from "./sessions-tab"
import { HugeiconsIcon } from "@hugeicons/react"
import { UserMultiple02Icon, Shield01Icon, ComputerIcon, TaskDone01Icon, Delete02Icon } from "@hugeicons/core-free-icons"

type MemberTabValue =
  | "access"
  | "authentication"
  | "sessions"
  | "activity"
  | "danger"

type MemberTabConfig = {
  value: MemberTabValue
  label: string
  icon: ReactNode
  component: ComponentType
}

const MEMBER_TABS: MemberTabConfig[] = [
  {
    value: "access",
    label: "Access",
    icon: (
      <HugeiconsIcon icon={UserMultiple02Icon} strokeWidth={2} aria-hidden="true" />
    ),
    component: AccessTabContent,
  },
  {
    value: "authentication",
    label: "Authentication",
    icon: (
      <HugeiconsIcon icon={Shield01Icon} strokeWidth={2} aria-hidden="true" />
    ),
    component: AuthenticationTabContent,
  },
  {
    value: "sessions",
    label: "Sessions",
    icon: (
      <HugeiconsIcon icon={ComputerIcon} strokeWidth={2} aria-hidden="true" />
    ),
    component: SessionsTabContent,
  },
  {
    value: "activity",
    label: "Activity",
    icon: (
      <HugeiconsIcon icon={TaskDone01Icon} strokeWidth={2} aria-hidden="true" />
    ),
    component: ActivityTabContent,
  },
  {
    value: "danger",
    label: "Danger zone",
    icon: (
      <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} aria-hidden="true" />
    ),
    component: DangerTabContent,
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

export function MemberDetail() {
  const isMobile = useIsMobile()
  const [activeTab, setActiveTab] = useState<MemberTabValue>("access")

  return (
    <div className="w-full max-w-4xl space-y-8">
      {/* Identity header */}
      <header className="flex flex-wrap items-center gap-4 px-1">
        <Avatar className="size-14 border">
          <AvatarImage
            src={MEMBER_IDENTITY.avatar}
            alt={MEMBER_IDENTITY.name}
          />
          <AvatarFallback className="text-sm font-medium">
            {MEMBER_IDENTITY.initials}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight">
              {MEMBER_IDENTITY.name}
            </h1>
            <Badge variant={MEMBER_IDENTITY.statusVariant}>
              {MEMBER_IDENTITY.status}
            </Badge>
          </div>
          <p className="text-muted-foreground flex items-center gap-1.5 truncate text-sm">
            <span className="truncate">{MEMBER_IDENTITY.email}</span>
            <DotSeparator />
            <span className="truncate">{MEMBER_IDENTITY.team}</span>
          </p>
        </div>
      </header>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as MemberTabValue)}
        orientation={isMobile ? "horizontal" : "vertical"}
        className="w-full gap-5 lg:gap-8"
      >
        <SidebarRail isMobile={isMobile} activeValue={activeTab} />

        <div className="min-w-0 flex-1">
          {MEMBER_TABS.map((tab) => {
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
  activeValue: MemberTabValue
}) {
  return (
    <div className={cn("min-w-0", isMobile ? "w-full" : "w-44 shrink-0")}>
      {isMobile ? (
        <div className="-mx-1 overflow-x-auto px-1 pb-1">
          <TabsList className="h-auto w-max min-w-max justify-start gap-1 bg-transparent p-0">
            {MEMBER_TABS.map((tab) => (
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
          {MEMBER_TABS.map((tab) => (
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