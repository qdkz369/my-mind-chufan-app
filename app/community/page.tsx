import { BottomNav } from "@/components/bottom-nav"
import { LocalExperiences } from "@/components/local-experiences"
import { FellowSeekers } from "@/components/fellow-seekers"
import { BookingWidget } from "@/components/booking-widget"
import { CommunityHeader } from "@/components/community-header"

export default function CommunityPage() {
  return (
    <main className="min-h-screen bg-background pb-20">
      <CommunityHeader />
      <LocalExperiences />
      <FellowSeekers />
      <BookingWidget />
      <BottomNav />
    </main>
  )
}
