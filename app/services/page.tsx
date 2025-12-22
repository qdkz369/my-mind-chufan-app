import { Header } from "@/components/header"
import { ServiceList } from "@/components/service-list"
import { BottomNavigation } from "@/components/bottom-navigation"

export default function ServicesPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 pb-20">
      <Header />
      <ServiceList />
      <BottomNavigation />
    </main>
  )
}
