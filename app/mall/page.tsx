import { Header } from "@/components/header"
import { MallContent } from "@/components/mall-content"
import { BottomNavigation } from "@/components/bottom-navigation"

export default function MallPage() {
  return (
    <main className="min-h-screen bg-background pb-20">
      <Header />
      <MallContent />
      <BottomNavigation />
    </main>
  )
}
