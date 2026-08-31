export type ProfileSelectOption = {
  value: string
  label: string
}

export type AvailabilityTimeSlot = {
  time: string
  available: boolean
}

export const DEFAULT_PROFILE_FORM_VALUES = {
  fullName: "Noa Brooks",
  company: "Harborline Systems",
  phone: "+1 (312) 847-1928",
  visibility: "team",
  specialties: ["Product strategy", "Team workshops"],
  birthDate: new Date(1991, 8, 18),
  availabilityDate: new Date(2026, 3, 24),
  availabilityTime: "10:30",
  dismissalTime: "17:30",
  availableToHire: true,
  avatarSrc: "https://i.pravatar.cc/96?img=47",
  avatarAlt: "Noa Brooks",
} as const

export const VISIBILITY_OPTIONS: ProfileSelectOption[] = [
  { value: "public", label: "Public" },
  { value: "team", label: "Team only" },
  { value: "private", label: "Private" },
]

export const SPECIALTY_OPTIONS = [
  "Product strategy",
  "Team workshops",
  "Design systems",
  "Customer research",
  "Launch planning",
  "Enterprise onboarding",
  "Revenue operations",
]

export const AVAILABILITY_TIME_SLOTS: AvailabilityTimeSlot[] = [
  { time: "09:00", available: false },
  { time: "09:30", available: false },
  { time: "10:00", available: true },
  { time: "10:30", available: true },
  { time: "11:00", available: true },
  { time: "11:30", available: true },
  { time: "12:00", available: false },
  { time: "12:30", available: true },
  { time: "13:00", available: true },
  { time: "13:30", available: true },
  { time: "14:00", available: true },
  { time: "14:30", available: false },
  { time: "15:00", available: false },
  { time: "15:30", available: true },
  { time: "16:00", available: true },
  { time: "16:30", available: true },
  { time: "17:00", available: true },
  { time: "17:30", available: true },
]

export const PROFILE_FORM_ACTIONS = {
  cancel: "Cancel",
  submit: "Save changes",
} as const