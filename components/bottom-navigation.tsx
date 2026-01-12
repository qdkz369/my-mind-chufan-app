"use client"

import { Home, Grid3x3, ShoppingCart, FileText, User } from "lucide-react"
import { usePathname } from "next/navigation"
import Link from "next/link"

const navItems = [
  { icon: Home, label: "首页", href: "/" },
  { icon: Grid3x3, label: "服务", href: "/services" },
  { icon: ShoppingCart, label: "商城", href: "/mall" },
  { icon: FileText, label: "订单", href: "/orders" },
  { icon: User, label: "我的", href: "/profile" },
]

export function BottomNavigation() {
  const pathname = usePathname()

  return (
    <nav className="theme-glass fixed bottom-0 left-0 right-0 z-50 border-t border-border/50 will-change-transform">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-around">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`theme-button flex flex-col items-center gap-1 py-3 px-4 transition-all ${
                  isActive 
                    ? "text-primary bg-primary/10" 
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
                style={{ borderRadius: 'var(--radius-button)' }}
              >
                <item.icon className={`h-5 w-5 ${isActive ? "drop-shadow-[0_0_8px_rgba(var(--primary),0.8)]" : ""}`} />
                <span className="text-xs font-medium">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
