import type { ReactNode } from "react"

import { Apple } from "@/components/ui/svgs/apple"
import { AppleDark } from "@/components/ui/svgs/appleDark"
import { Google } from "@/components/ui/svgs/google"

export type AuthProvider = {
  id: string
  label: string
  logo: ReactNode
}

const providerLogoClassName = "size-4 shrink-0"

function ThemeLogo({ light, dark }: { light: ReactNode; dark?: ReactNode }) {
  if (!dark) {
    return light
  }

  return (
    <>
      <span aria-hidden className="dark:hidden">
        {light}
      </span>
      <span aria-hidden className="hidden dark:block">
        {dark}
      </span>
    </>
  )
}

export const AUTH_PROVIDERS: AuthProvider[] = [
  {
    id: "google",
    label: "Google",
    logo: <Google className={providerLogoClassName} aria-hidden="true" />,
  },
  {
    id: "apple",
    label: "Apple",
    logo: (
      <ThemeLogo
        light={<Apple className={providerLogoClassName} aria-hidden="true" />}
        dark={
          <AppleDark className={providerLogoClassName} aria-hidden="true" />
        }
      />
    ),
  },
]