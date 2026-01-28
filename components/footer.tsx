"use client"

import { Separator } from "@/components/ui/separator"
import { Mountain, Mail, Phone, MapPin } from "lucide-react"

export function Footer() {
  return (
    <footer className="bg-muted/30 border-t">
      <div className="container px-4 mx-auto max-w-7xl py-12">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Mountain className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <div className="font-bold text-lg">我的项目</div>
                <div className="text-xs text-muted-foreground">设备租赁管理</div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              专业的设备租赁与管理平台
            </p>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold mb-4">联系我们</h4>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="w-4 h-4" />
                <span>400-000-0000</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="w-4 h-4" />
                <span>support@example.com</span>
              </div>
              <div className="flex items-start gap-2 text-muted-foreground">
                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>中国</span>
              </div>
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold mb-4">快速链接</h4>
            <div className="space-y-2 text-sm">
              <a href="#" className="block text-muted-foreground hover:text-primary transition-colors">
                关于我们
              </a>
              <a href="#" className="block text-muted-foreground hover:text-primary transition-colors">
                服务条款
              </a>
              <a href="#" className="block text-muted-foreground hover:text-primary transition-colors">
                帮助中心
              </a>
              <a href="#" className="block text-muted-foreground hover:text-primary transition-colors">
                联系我们
              </a>
            </div>
          </div>

          {/* Info */}
          <div>
            <h4 className="font-semibold mb-4">法律信息</h4>
            <div className="space-y-2 text-sm">
              <a href="#" className="block text-muted-foreground hover:text-primary transition-colors">
                隐私政策
              </a>
              <a href="#" className="block text-muted-foreground hover:text-primary transition-colors">
                服务协议
              </a>
              <a href="#" className="block text-muted-foreground hover:text-primary transition-colors">
                使用条款
              </a>
            </div>
          </div>
        </div>

        <Separator className="my-8" />

        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
          <div>© 2025 我的项目. 保留所有权利.</div>
          <div className="flex gap-6">
            <a href="#" className="hover:text-primary transition-colors">
              微信公众号
            </a>
            <a href="#" className="hover:text-primary transition-colors">
              官方微博
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
