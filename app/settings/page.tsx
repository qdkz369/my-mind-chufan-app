"use client"

import { Header } from "@/components/header"
import { BottomNavigation } from "@/components/bottom-navigation"
import { ThemeSwitcher } from "@/components/theme-switcher"
import { Card } from "@/components/ui/card"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function SettingsPage() {
  return (
    <main className="min-h-screen bg-background pb-20 transition-colors duration-300">
      <Header />
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* 返回按钮 */}
        <Link href="/profile">
          <div className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer mb-4">
            <ArrowLeft className="h-5 w-5" />
            <span className="text-sm">返回</span>
          </div>
        </Link>

        {/* 页面标题 */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground mb-2">设置</h1>
          <p className="text-sm text-muted-foreground">管理您的账户和偏好设置</p>
        </div>

        {/* 主题切换器 */}
        <Card className="theme-card p-6 mb-6">
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-1">主题切换</h2>
              <p className="text-sm text-muted-foreground">选择您喜欢的界面风格</p>
            </div>
            <ThemeSwitcher />
          </div>
        </Card>

        {/* 其他设置选项可以在这里添加 */}
        <Card className="theme-card p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">其他设置</h2>
          <p className="text-sm text-muted-foreground">更多设置选项即将推出...</p>
        </Card>
      </div>
      <BottomNavigation />
    </main>
  )
}
