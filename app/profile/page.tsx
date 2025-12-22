import { Header } from "@/components/header"
import { ProfileContent } from "@/components/profile-content"
import { BottomNavigation } from "@/components/bottom-navigation"

export default function ProfilePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 pb-20">
      <Header />
      <ProfileContent />
      <BottomNavigation />
    </main>
  )
}
