import { PlaceholderPage } from "@/components/placeholder-page"

export default function NotFound() {
  return (
    <PlaceholderPage
      title="Page Not Found"
      message="Sorry, the page you're looking for doesn't exist or hasn't been built yet."
      backUrl="/"
      backLabel="Back to Home"
    />
  )
}
