import { ActivityTimeline } from "./components/activity-timeline"

export function Page() {
  return (
    <div className="bg-background text-foreground flex min-h-svh w-full items-start justify-center p-4 sm:p-8 md:p-12">
      <ActivityTimeline />
    </div>
  )
}