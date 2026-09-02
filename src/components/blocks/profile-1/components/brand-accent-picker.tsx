import { cn } from "@/lib/utils"

import { BRAND_COLORS } from "./data"

export function BrandAccentPicker() {
  return (
    <div
      role="radiogroup"
      aria-label="Accent color"
      className="flex flex-wrap items-center gap-2"
    >
      {BRAND_COLORS.map((color) => (
        <label key={color.id} className="relative cursor-pointer">
          <input
            type="radio"
            name="profile-1-brand-accent"
            value={color.id}
            defaultChecked={color.active}
            aria-label={color.label}
            className="peer sr-only"
          />
          <span
            className={cn(
              "ring-offset-background peer-checked:ring-foreground/70 peer-focus-visible:ring-foreground/70 hover:ring-foreground/20 flex size-6 items-center justify-center rounded-full border border-white/80 shadow-sm ring-offset-2 transition-[box-shadow] peer-checked:ring-2 peer-focus-visible:ring-2 hover:ring-2"
            )}
            style={{ backgroundColor: color.value }}
          />
        </label>
      ))}
    </div>
  )
}