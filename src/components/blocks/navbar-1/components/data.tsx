export type TabItem = {
  value: string
  label: string
  badge?: number
}

export type Collaborator = {
  src?: string
  initials: string
}

// ── Tabs ──

export const TAB_ITEMS: TabItem[] = [
  { value: "discussion", label: "Discussion", badge: 3 },
  { value: "tasks", label: "Tasks" },
  { value: "timeline", label: "Timeline" },
  { value: "files", label: "Files" },
  { value: "overview", label: "Overview" },
]

export const TABS_DEFAULT_VALUE = "tasks"

// ── Collaborators ──

export const COLLABORATORS: Collaborator[] = [
  {
    src: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=96&h=96&dpr=2&q=80",
    initials: "RW",
  },
  {
    src: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=96&h=96&dpr=2&q=80",
    initials: "KL",
  },
  {
    src: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=96&h=96&dpr=2&q=80",
    initials: "JP",
  },
]

export const COLLABORATORS_EXTRA_COUNT = 9