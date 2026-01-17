"use client"

/**
 * 游客专用Header
 * 
 * 特点：
 * - 不显示通知、二维码等需要登录的功能
 * - 只显示搜索和基础信息
 * - 主题：Apple White（信任/克制）
 */

import { Search, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export function GuestHeader() {
  return (
    <header className="sticky top-0 z-50 theme-glass border-b border-border/50">
      <div className="container mx-auto px-3 md:px-4 lg:px-6 py-3 md:py-4">
        <div className="flex items-center justify-between gap-2">
          <Link href="/" className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-destructive to-destructive/80 rounded-lg md:rounded-xl flex items-center justify-center font-bold text-base md:text-lg shadow-lg shadow-destructive/30 flex-shrink-0" style={{ borderRadius: 'var(--radius-button)' }}>
              <Zap className="h-5 w-5 md:h-6 md:w-6 text-primary-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg md:text-2xl lg:text-3xl xl:text-4xl font-bold leading-tight text-foreground break-words">智慧餐饮服务平台</h1>
              <p className="text-xs md:text-sm text-muted-foreground truncate">一站式餐饮后勤服务大厅</p>
            </div>
          </Link>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button variant="ghost" size="icon" className="text-foreground hover:bg-muted/50 h-8 w-8 md:h-10 md:w-10">
              <Search className="h-4 w-4 md:h-5 md:w-5" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}
