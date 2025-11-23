import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Construction, Rocket } from "lucide-react"

interface PlaceholderPageProps {
  title?: string
  message?: string
  backUrl?: string
  backLabel?: string
}

export function PlaceholderPage({
  title = "Coming Soon",
  message = "We're working hard to bring you this feature. Please check back later!",
  backUrl = "/dashboard",
  backLabel = "Back to Dashboard",
}: PlaceholderPageProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1">
        <div className="container flex flex-col items-center justify-center gap-6 py-20 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
            <Construction className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight">{title}</h1>
          <p className="max-w-[600px] text-lg text-muted-foreground">{message}</p>

          <div className="relative mt-8 w-full max-w-md">
            <Image
              src="/images/under-construction.jpg"
              alt="Under Construction"
              width={500}
              height={300}
              className="mx-auto rounded-lg"
            />
          </div>

          <div className="mt-6 flex flex-col items-center gap-6">
            <div className="flex items-center gap-2 rounded-lg border bg-card p-4 shadow-sm">
              <Rocket className="h-5 w-5 text-primary" />
              <span className="text-sm">This page is under construction and will be available soon.</span>
            </div>

            <Link href={backUrl}>
              <Button className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                {backLabel}
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
