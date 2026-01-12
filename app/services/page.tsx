import { Header } from "@/components/header"
import { ServiceList } from "@/components/service-list"
import { BottomNavigation } from "@/components/bottom-navigation"

export default function ServicesPage() {
  return (
    <main className="min-h-screen bg-background pb-20">
      <Header />
      <ServiceList />
      <BottomNavigation />
    </main>
  )
}
