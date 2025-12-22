"use client"

import { MapPin, CreditCard, Settings, HelpCircle, FileText, Shield, ChevronRight, Star } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

const menuItems = [
  { icon: MapPin, label: "地址管理", description: "管理配送地址", href: "/addresses" },
  { icon: CreditCard, label: "支付方式", description: "管理支付账户", href: "/payment" },
  { icon: FileText, label: "发票管理", description: "开具和查看发票", href: "/invoices" },
  { icon: Shield, label: "资质认证", description: "企业资质认证", href: "/certification" },
  { icon: Star, label: "会员权益", description: "查看会员特权", href: "/vip" },
  { icon: Settings, label: "设置", description: "账户设置", href: "/settings" },
  { icon: HelpCircle, label: "帮助中心", description: "常见问题", href: "/help" },
]

export function ProfileContent() {
  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <Card className="p-6 bg-slate-900/90 border-slate-700/50 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <Avatar className="w-16 h-16">
            <AvatarImage src="/placeholder.svg?height=64&width=64" />
            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-600 text-white">张</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-bold text-white">张老板</h2>
              <Badge variant="secondary" className="bg-gradient-to-r from-yellow-500 to-orange-600 text-white border-0">
                黄金会员
              </Badge>
            </div>
            <p className="text-sm text-slate-400">张记餐厅 · 注册2年</p>
            <p className="text-sm text-slate-400">手机: 138****8888</p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4 text-center bg-slate-900/90 border-slate-700/50 backdrop-blur-sm">
          <div className="text-2xl font-bold mb-1 text-white">106</div>
          <div className="text-xs text-slate-400">累计订单</div>
        </Card>
        <Card className="p-4 text-center bg-slate-900/90 border-slate-700/50 backdrop-blur-sm">
          <div className="text-2xl font-bold mb-1 text-white">¥28.6k</div>
          <div className="text-xs text-slate-400">累计消费</div>
        </Card>
        <Card className="p-4 text-center bg-slate-900/90 border-slate-700/50 backdrop-blur-sm">
          <div className="text-2xl font-bold mb-1 text-white">320</div>
          <div className="text-xs text-slate-400">积分余额</div>
        </Card>
      </div>

      <Card className="divide-y divide-slate-800 bg-slate-900/90 border-slate-700/50 backdrop-blur-sm">
        {menuItems.map((item) => (
          <button
            key={item.label}
            className="w-full flex items-center gap-3 p-4 hover:bg-slate-800/50 transition-colors text-left"
          >
            <div className="w-10 h-10 bg-slate-800/50 rounded-xl flex items-center justify-center flex-shrink-0">
              <item.icon className="h-5 w-5 text-slate-300" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium mb-0.5 text-white">{item.label}</h3>
              <p className="text-sm text-slate-400">{item.description}</p>
            </div>
            <ChevronRight className="h-5 w-5 text-slate-400 flex-shrink-0" />
          </button>
        ))}
      </Card>

      <Card className="p-4 bg-slate-900/90 border-slate-700/50 backdrop-blur-sm">
        <button className="w-full text-red-400 font-medium hover:text-red-300 transition-colors">退出登录</button>
      </Card>
    </div>
  )
}
