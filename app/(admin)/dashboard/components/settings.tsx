"use client"

// 系统设置组件
// 从 page.tsx 的 renderSettings() 函数提取

import { Lock, Database } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface SettingsProps {
  onOpenChangePasswordDialog: () => void
  isSupabaseConnected: boolean
}

export function SettingsPanel({ onOpenChangePasswordDialog, isSupabaseConnected }: SettingsProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">系统设置</h1>
        <p className="text-slate-400">系统配置和参数设置</p>
      </div>

      {/* 修改密码卡片 */}
      <Card semanticLevel="secondary_fact" className="bg-gradient-to-br from-slate-900/90 to-blue-950/90 border-blue-800/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-white">账户安全</CardTitle>
          <CardDescription className="text-slate-400">修改登录密码</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg">
              <div className="flex items-center gap-3">
                <Lock className="h-5 w-5 text-blue-400" />
                <div>
                  <div className="text-white font-medium">登录密码</div>
                  <div className="text-sm text-slate-400">定期修改密码可以保护账户安全</div>
                </div>
              </div>
              <Button onClick={onOpenChangePasswordDialog} className="bg-blue-600 hover:bg-blue-700 text-white">
                <Lock className="h-4 w-4 mr-2" />
                修改密码
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 数据库连接 */}
      <Card semanticLevel="secondary_fact" className="bg-gradient-to-br from-slate-900/90 to-blue-950/90 border-blue-800/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-white">数据库连接</CardTitle>
          <CardDescription className="text-slate-400">Supabase配置状态</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg">
              <div className="flex items-center gap-3">
                <Database className="h-5 w-5 text-blue-400" />
                <div>
                  <div className="text-white font-medium">Supabase连接</div>
                  <div className="text-sm text-slate-400">{isSupabaseConnected ? "已连接" : "未配置"}</div>
                </div>
              </div>
              <Badge
                className={
                  isSupabaseConnected
                    ? "bg-green-500/20 text-green-400 border-green-500/30"
                    : "bg-red-500/20 text-red-400 border-red-500/30"
                }
              >
                {isSupabaseConnected ? "正常" : "异常"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
