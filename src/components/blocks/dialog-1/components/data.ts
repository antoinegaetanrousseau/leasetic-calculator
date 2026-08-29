export interface TimeOption {
  value: string
  label: string
  minutes: number
}

export interface DurationPreset {
  id: string
  label: string
  minutes: number
}

function formatTimeLabel(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  const period = hours >= 12 ? "PM" : "AM"
  const normalizedHours = hours % 12 || 12

  return `${String(normalizedHours).padStart(2, "0")}:${String(minutes).padStart(2, "0")} ${period}`
}

export const TIME_OPTIONS: TimeOption[] = Array.from(
  { length: 48 },
  (_, index) => {
    const minutes = index * 30
    const hours = Math.floor(minutes / 60)
    const remainder = minutes % 60

    return {
      value: `${String(hours).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`,
      label: formatTimeLabel(minutes),
      minutes,
    }
  }
)

export const DURATION_PRESETS: DurationPreset[] = [
  {
    id: "30-min",
    label: "30 min",
    minutes: 30,
  },
  {
    id: "2-hours",
    label: "2 hours",
    minutes: 120,
  },
  {
    id: "4-hours",
    label: "4 hours",
    minutes: 240,
  },
  {
    id: "8-hours",
    label: "8 hours",
    minutes: 480,
  },
  {
    id: "12-hours",
    label: "12 hours",
    minutes: 720,
  },
  {
    id: "1-day",
    label: "1 day",
    minutes: 1440,
  },
]