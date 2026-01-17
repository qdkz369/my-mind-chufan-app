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

interface BottomNavigationProps {
  /** 侧边栏是否打开（可选，用于双导航模式） */
  sidebarOpen?: boolean
  /** 是否强制显示（可选，默认根据屏幕尺寸和侧边栏状态） */
  forceShow?: boolean
}

export function BottomNavigation({ sidebarOpen, forceShow }: BottomNavigationProps = {}) {
  const pathname = usePathname()

  // 双导航模式逻辑（修改版）：
  // - 手机端（< md）：始终显示底部导航
  // - 电脑端（>= md）：
  //   - 侧边栏打开：显示底部导航（md:block）- 电脑端同时显示左侧导航和底部导航
  //   - 侧边栏关闭：显示底部导航（md:block）- 电脑端显示底部导航
  // - forceShow 为 true 时：强制显示（电脑端和手机端都显示）
  // - 未提供 sidebarOpen 时：默认行为（手机端和电脑端都显示）
  
  let visibilityClasses = ''
  if (forceShow === true) {
    // 强制显示：不添加任何隐藏类
    visibilityClasses = 'block'
  } else if (forceShow === false) {
    // 强制隐藏
    visibilityClasses = 'hidden'
  } else {
    // 无论侧边栏状态如何，手机端和电脑端都显示底部导航
    // 手机端：block，电脑端：md:block
    visibilityClasses = 'block md:block'
  }

  return (
    <nav className={`theme-glass fixed bottom-0 left-0 right-0 z-[100] border-t border-border/50 will-change-transform ${visibilityClasses}`}>
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
