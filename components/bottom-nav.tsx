"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, BookOpen, Users } from "lucide-react"

const navItems = [
  {
    href: "/",
    label: "禅修",
    icon: Home,
  },
  {
    href: "/course",
    label: "课程",
    icon: BookOpen,
  },
  {
    href: "/community",
    label: "交流",
    icon: Users,
  },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-4xl items-center justify-around py-3">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 px-6 py-2 transition-colors ${
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs font-light">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
