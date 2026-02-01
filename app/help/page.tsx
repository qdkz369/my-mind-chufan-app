"use client"

import { Header } from "@/components/header"
import { BottomNavigation } from "@/components/bottom-navigation"
import { Card } from "@/components/ui/card"
import { ArrowLeft, HelpCircle } from "lucide-react"
import Link from "next/link"

export default function HelpPage() {
  return (
    <main className="min-h-screen bg-background pb-20 transition-colors duration-300">
      <Header />
      <div className="container mx-auto max-w-7xl px-4 py-6 space-y-6">
        <Link href="/profile">
          <div className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer mb-4">
            <ArrowLeft className="h-5 w-5" />
            <span className="text-sm">返回</span>
          </div>
        </Link>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground mb-2">帮助中心</h1>
          <p className="text-sm text-muted-foreground">常见问题与使用指南</p>
        </div>

        <Card semanticLevel="secondary_fact" className="theme-card p-6">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <HelpCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <h2 className="text-lg font-semibold text-foreground mb-2">常见问题</h2>
            <p className="text-sm text-muted-foreground max-w-md mb-6">
              关于燃料配送、设备租赁、一键报修等服务的使用说明和常见问题解答。
            </p>
            <div className="w-full text-left space-y-4">
              <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                <h3 className="font-medium text-foreground mb-1">如何下单燃料配送？</h3>
                <p className="text-sm text-muted-foreground">首页点击「燃料配送」进入，选择燃料类型和数量，填写地址后提交订单即可。</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                <h3 className="font-medium text-foreground mb-1">设备如何报修？</h3>
                <p className="text-sm text-muted-foreground">首页点击「一键报修」，选择设备并描述问题，提交后会有专人联系处理。</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                <h3 className="font-medium text-foreground mb-1">如何联系客服？</h3>
                <p className="text-sm text-muted-foreground">可通过 App 内反馈或拨打客服热线获取帮助。</p>
              </div>
            </div>
          </div>
        </Card>
      </div>
      <BottomNavigation />
    </main>
  )
}
