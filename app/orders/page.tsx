import { Header } from "@/components/header"
import { OrderList } from "@/components/order-list"
import { BottomNavigation } from "@/components/bottom-navigation"

export default function OrdersPage() {
  return (
    <main className="min-h-screen bg-background pb-20">
      <Header />
      <OrderList />
      <BottomNavigation />
    </main>
  )
}
