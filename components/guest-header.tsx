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
    <header className="sticky top-0 z-50 bg-gradient-to-r from-slate-900/95 via-blue-950/95 to-slate-900/95 backdrop-blur-lg border-b border-slate-700/50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center font-bold text-lg shadow-lg shadow-red-500/30">
              <Zap className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight text-white">智慧餐饮服务平台</h1>
              <p className="text-xs text-blue-400">一站式餐饮后勤服务大厅</p>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
              <Search className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}
