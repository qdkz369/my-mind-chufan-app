"use client"

/**
 * 游客营销门户组件
 * 
 * 核心原则：
 * - 完全不引入任何业务组件（订单、资产、看板、审计相关）
 * - 只使用公开API（只读，无 audit_logs，无 trace_logs）
 * - 支持SEO（未来可被搜索引擎抓取）
 * - 主题：Apple White（信任/克制）
 */

import { useState } from "react"
import {
  ShoppingCart,
  Wrench,
  Store,
  Droplet,
  HardHat,
  CreditCard,
  User,
  ArrowRight,
  AlertCircle,
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import Link from "next/link"

// 游客服务列表 - 6大营销板块
const guestServices = [
  {
    icon: ShoppingCart,
    label: "B2B供应链商城",
    description: "食材采购、调料批发、一站式采购平台",
    marketingText: "全品类食材供应链，批发价格，快速配送",
    color: "from-indigo-500 to-purple-600",
    shadowColor: "shadow-indigo-500/30",
    href: "/mall",
    badge: "热门",
  },
  {
    icon: Wrench,
    label: "维修服务",
    description: "水电维修、设备保养、故障排查",
    marketingText: "24小时快速响应，专业维修团队，30分钟上门",
    color: "from-green-500 to-emerald-600",
    shadowColor: "shadow-green-500/30",
    href: "/services",
    badge: "快速响应",
  },
  {
    icon: Store,
    label: "厨房用品",
    description: "锅具、刀具、餐具等厨房用品采购",
    marketingText: "品牌厨具直供，质量保证，次日达服务",
    color: "from-blue-500 to-cyan-600",
    shadowColor: "shadow-blue-500/30",
    href: "/mall",
    badge: "次日达",
  },
  {
    icon: Droplet,
    label: "清洁服务",
    description: "油烟机清洗、厨房深度清洁",
    marketingText: "专业清洁团队，标准化作业，定期维护方案",
    color: "from-cyan-500 to-teal-600",
    shadowColor: "shadow-cyan-500/30",
    href: "/services",
    badge: "专业团队",
  },
  {
    icon: HardHat,
    label: "工程改造",
    description: "厨房布局优化、设备升级改造",
    marketingText: "一站式改造方案，设计+施工+验收，全程跟踪",
    color: "from-purple-500 to-pink-600",
    shadowColor: "shadow-purple-500/30",
    href: "/services",
    badge: "一站式",
  },
  {
    icon: CreditCard,
    label: "金融服务",
    description: "账期延长、设备分期、经营贷款",
    marketingText: "企业专享流水贷，授信高至50万，低利率快速放款",
    color: "from-yellow-500 to-orange-600",
    shadowColor: "shadow-yellow-500/30",
    href: "/services",
    badge: "低利率",
  },
]

// 游客登录引导对话框
function GuestLoginDialog({ isOpen, onClose, serviceName }: { isOpen: boolean; onClose: () => void; serviceName: string }) {
  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900/95 border-slate-700/50 backdrop-blur-md max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-blue-400" />
            登录以查看详情
          </DialogTitle>
          <DialogDescription className="text-slate-400 pt-2">
            您正在查看 <span className="font-semibold text-white">{serviceName}</span> 的详细信息。请先注册或登录账户以继续。
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 pt-4">
          <Link href="/register" className="w-full">
            <Button className="w-full bg-gradient-to-r from-blue-500 to-cyan-600 hover:opacity-90 text-white">
              <User className="h-4 w-4 mr-2" />
              立即登录/注册
            </Button>
          </Link>
          <Button 
            variant="outline" 
            onClick={onClose}
            className="w-full text-slate-300 border-slate-600 hover:bg-slate-800"
          >
            稍后再说
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function GuestServices() {
  const [selectedService, setSelectedService] = useState<string | null>(null)
  const [showLoginDialog, setShowLoginDialog] = useState(false)

  const handleServiceClick = (e: React.MouseEvent, service: typeof guestServices[0]) => {
    e.preventDefault()
    setSelectedService(service.label)
    setShowLoginDialog(true)
  }

  return (
    <div className="space-y-6">
      {/* Hero区域 - 醒目标题 */}
      <div className="text-center mb-6 md:mb-8 py-4 md:py-6 lg:py-8 px-2 md:px-4">
        <h1 className="text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold text-white mb-3 md:mb-4 leading-tight break-words">
          智慧餐饮数字化服务平台
        </h1>
        <p className="text-base md:text-lg text-slate-300 mb-2">
          一站式餐饮后勤服务大厅
        </p>
        <p className="text-xs md:text-sm text-slate-400 px-2">
          为您的餐厅提供全方位解决方案，助力餐饮企业数字化转型
        </p>
      </div>

      {/* 业务矩阵 - iOS风格Grid宫格卡片（毛玻璃、大圆角） */}
      <div className="grid grid-cols-3 gap-3 md:gap-4 lg:gap-6">
        {guestServices.map((service) => (
          <button
            key={service.label}
            onClick={(e) => handleServiceClick(e, service)}
            className="text-left w-full"
          >
            <Card semanticLevel="action" className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 border-slate-700/50 backdrop-blur-sm p-4 md:p-5 lg:p-6 hover:scale-[1.02] hover:border-blue-500/30 transition-all cursor-pointer group h-full rounded-xl md:rounded-2xl">
              <div className="flex items-start gap-3 md:gap-4 mb-3 md:mb-4">
                <div
                  className={`w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br ${service.color} rounded-lg md:rounded-xl flex items-center justify-center shadow-lg ${service.shadowColor} group-hover:scale-110 transition-transform flex-shrink-0`}
                >
                  <service.icon className="h-6 w-6 md:h-7 md:w-7 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <h3 className="text-base md:text-lg font-semibold text-white">{service.label}</h3>
                    {service.badge && (
                      <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">
                        {service.badge}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs md:text-sm text-slate-400 leading-relaxed mb-2">{service.description}</p>
                  {/* 营销文案 */}
                  <p className="text-xs text-blue-400 font-medium leading-relaxed">{service.marketingText}</p>
                </div>
              </div>
              <div className="flex items-center justify-between mt-3 md:mt-4 pt-3 md:pt-4 border-t border-slate-700/50">
                <span className="text-xs text-slate-500">点击查看详情</span>
                <ArrowRight className="h-4 w-4 text-blue-400 group-hover:translate-x-1 transition-transform" />
              </div>
            </Card>
          </button>
        ))}
      </div>

      {/* 注册引导按钮 */}
      <div className="text-center mt-6 md:mt-8">
        <Link href="/register">
          <Button className="bg-gradient-to-r from-blue-500 to-cyan-600 hover:opacity-90 text-white px-6 md:px-8 py-4 md:py-6 text-base md:text-lg shadow-lg shadow-blue-500/30 rounded-lg md:rounded-xl">
            <User className="h-4 w-4 md:h-5 md:w-5 mr-2" />
            注册账户，享受更多服务
          </Button>
        </Link>
      </div>

      {/* 登录引导对话框 */}
      <GuestLoginDialog
        isOpen={showLoginDialog}
        onClose={() => {
          setShowLoginDialog(false)
          setSelectedService(null)
        }}
        serviceName={selectedService || ''}
      />
    </div>
  )
}
