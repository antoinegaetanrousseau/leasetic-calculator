import { Auth } from "./components/auth"
import { AuthGridBackground } from "./components/auth-grid-background"

export function Page() {
  return (
    <div className="bg-background relative flex min-h-svh w-full items-center justify-center overflow-hidden px-4 py-6 sm:px-8 sm:py-10 lg:px-10">
      <AuthGridBackground cellSize={40} />
      <div className="relative z-10 flex w-full items-center justify-center">
        <Auth />
      </div>
    </div>
  )
}