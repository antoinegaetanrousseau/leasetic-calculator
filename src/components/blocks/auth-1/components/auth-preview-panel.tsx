import { Card, CardContent } from "@/components/ui/card"

export function AuthPreviewPanel() {
  return (
    <section className="hidden min-w-0 items-center justify-center lg:flex lg:justify-end">
      {/* Card */}
      <Card className="bg-background w-full gap-0 overflow-hidden border-0 p-0 shadow-none">
        <CardContent className="p-0">
          {/* Light */}
          <img
            src="https://images.unsplash.com/photo-1743657166981-8d8e11d03c3e?auto=format&fit=crop&w=1080&h=1500&q=80"
            alt=""
            aria-hidden="true"
            loading="eager"
            className="h-[24rem] w-full object-cover sm:h-[34rem] lg:h-[78svh] lg:max-h-[58rem] xl:h-[82svh] xl:max-h-[62rem] dark:hidden"
          />
          {/* Dark */}
          <img
            src="https://images.unsplash.com/photo-1651065567117-ac52c1a62e21?auto=format&fit=crop&w=1080&h=1500&q=80"
            alt=""
            aria-hidden="true"
            loading="eager"
            className="hidden h-[24rem] w-full object-cover sm:h-[34rem] lg:h-[78svh] lg:max-h-[58rem] xl:h-[82svh] xl:max-h-[62rem] dark:block"
          />
        </CardContent>
      </Card>
    </section>
  )
}