"use client"

import { Header } from "@/components/header"
import { BottomNavigation } from "@/components/bottom-navigation"
import { Card } from "@/components/ui/card"
import { ArrowLeft, CreditCard } from "lucide-react"
import Link from "next/link"

export default function PaymentMethodsPage() {
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
          <h1 className="text-2xl font-bold text-foreground mb-2">支付方式</h1>
          <p className="text-sm text-muted-foreground">管理您的支付账户和付款方式</p>
        </div>

        <Card semanticLevel="secondary_fact" className="theme-card p-6">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
            <h2 className="text-lg font-semibold text-foreground mb-2">支付方式管理</h2>
            <p className="text-sm text-muted-foreground max-w-md">
              支持添加银行卡、支付宝、微信支付等付款方式，便于快速完成燃料配送、设备租赁等订单支付。
            </p>
            <p className="text-xs text-muted-foreground mt-4">该功能即将上线，敬请期待</p>
          </div>
        </Card>
      </div>
      <BottomNavigation />
    </main>
  )
}
