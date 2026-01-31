"use client"

// 燃料价格监控组件
// 从 page.tsx 的 renderFuelPricing() 函数提取

import { Loader2, TrendingUp, Save, Lock, CheckCircle2, Play, Droplet, Database } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FuelPrice } from "../types/dashboard-types"

interface FuelPricingProps {
  fuelPrices: FuelPrice[]
  onFuelPricesChange: (updater: (prev: FuelPrice[]) => FuelPrice[]) => void
  onSyncMarketPrice: () => void
  isSyncingPrice: boolean
  onSaveFuelPrice: (fuelId: string, newPrice: number) => void
  isSavingPrice: boolean
  onToggleAutoSync: (fuelId: string) => void
  userRole: string | null
  userCompanyId: string | null
  companyFuelTypes: string[]
  isLoading: boolean
}

export function FuelPricingPanel({
  fuelPrices,
  onFuelPricesChange,
  onSyncMarketPrice,
  isSyncingPrice,
  onSaveFuelPrice,
  isSavingPrice,
  onToggleAutoSync,
  userRole,
  userCompanyId,
  companyFuelTypes,
  isLoading,
}: FuelPricingProps) {
  const filteredFuelPrices =
    userRole === "super_admin"
      ? fuelPrices
      : userCompanyId && companyFuelTypes.length > 0
        ? fuelPrices.filter((fuel) => companyFuelTypes.includes(fuel.id))
        : []

  // 无可见燃料时：角色/权限未加载完成则显示加载中，避免误显示「暂无授权」
  if (filteredFuelPrices.length === 0 && userRole !== "super_admin") {
    const roleOrPermissionsLoading = userRole === null || isLoading
    if (roleOrPermissionsLoading) {
      return (
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">燃料实时价格监控</h1>
            <p className="text-slate-400">管理燃料类型价格，支持第三方市场价格自动同步</p>
          </div>
          <Card semanticLevel="secondary_fact" className="bg-gradient-to-br from-slate-900/90 to-blue-950/90 border-blue-800/50 backdrop-blur-sm col-span-2">
            <CardContent className="p-12 text-center">
              <Loader2 className="h-16 w-16 text-blue-400 mx-auto mb-4 animate-spin" />
              <p className="text-slate-400 text-lg mb-2">
                {userRole === null ? "正在加载角色与权限..." : "正在加载燃料品种权限..."}
              </p>
            </CardContent>
          </Card>
        </div>
      )
    }
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">燃料实时价格监控</h1>
          <p className="text-slate-400">管理燃料类型价格，支持第三方市场价格自动同步</p>
        </div>
        <Card semanticLevel="system_hint" className="bg-gradient-to-br from-slate-900/90 to-blue-950/90 border-blue-800/50 backdrop-blur-sm col-span-2">
          <CardContent className="p-12 text-center">
            <Droplet className="h-16 w-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 text-lg mb-2">暂无授权的燃料品种</p>
            <p className="text-slate-500 text-sm">请联系管理员为您分配燃料品种权限</p>
            {process.env.NODE_ENV === "development" && (
              <div className="mt-4 p-3 bg-slate-800/50 rounded text-left text-xs text-slate-500 font-mono">
                <div>调试信息:</div>
                <div>公司ID: {userCompanyId || "null"}</div>
                <div>已授权品种数: {companyFuelTypes.length}</div>
                <div>已授权品种: {companyFuelTypes.length > 0 ? companyFuelTypes.join(", ") : "无"}</div>
                <div>所有燃料ID: {fuelPrices.map((f) => f.id).join(", ")}</div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">燃料实时价格监控</h1>
          <p className="text-slate-400">管理燃料类型价格，支持第三方市场价格自动同步</p>
        </div>
        <Button onClick={onSyncMarketPrice} disabled={isSyncingPrice} className="bg-orange-500 hover:bg-orange-600 text-white">
          {isSyncingPrice ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              同步中...
            </>
          ) : (
            <>
              <TrendingUp className="h-4 w-4 mr-2" />
              同步市场价格
            </>
          )}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredFuelPrices.map((fuel) => {
          const priceDiff = fuel.marketPrice ? ((fuel.basePrice - fuel.marketPrice) / fuel.marketPrice) * 100 : null
          const isPriceHigher = priceDiff ? priceDiff > 0 : false
          const hasPermission = userRole === "super_admin" || (!!userCompanyId && companyFuelTypes.includes(fuel.id))
          const isDisabled = isSavingPrice || !hasPermission

          return (
            <Card
              key={fuel.id}
              semanticLevel="secondary_fact"
              className="bg-gradient-to-br from-slate-900/90 to-blue-950/90 border-blue-800/50 backdrop-blur-sm"
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-white">{fuel.name}</CardTitle>
                    <CardDescription className="text-slate-400">
                      单位：{fuel.unitLabel} ({fuel.unit})
                    </CardDescription>
                  </div>
                  <Badge
                    className={
                      fuel.autoSync ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-slate-500/20 text-slate-400 border-slate-500/30"
                    }
                  >
                    {fuel.autoSync ? "自动同步" : "手动管理"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-slate-800/50 rounded-lg">
                  <Label className="text-slate-400 text-sm mb-2 block">当前价格</Label>
                  <div className="flex items-center gap-3">
                    <Input
                      type="number"
                      step="0.1"
                      value={fuel.basePrice}
                      onChange={(e) => {
                        const newPrice = parseFloat(e.target.value)
                        if (!isNaN(newPrice) && newPrice >= 0) {
                          onFuelPricesChange((prev) => prev.map((f) => (f.id === fuel.id ? { ...f, basePrice: newPrice } : f)))
                        }
                      }}
                      className="flex-1 bg-slate-900 border-slate-700 text-white"
                    />
                    <span className="text-white font-medium">元/{fuel.unitLabel}</span>
                  </div>
                </div>

                {fuel.marketPrice != null && fuel.marketPrice > 0 && (
                  <div className="p-4 bg-slate-800/50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-slate-400 text-sm">市场价格</Label>
                      {priceDiff != null && (
                        <Badge
                          className={
                            isPriceHigher ? "bg-red-500/20 text-red-400 border-red-500/30" : "bg-green-500/20 text-green-400 border-green-500/30"
                          }
                        >
                          {isPriceHigher ? "↑" : "↓"} {Math.abs(priceDiff).toFixed(2)}%
                        </Badge>
                      )}
                    </div>
                    <div className="text-white font-semibold text-lg">
                      ¥{fuel.marketPrice.toFixed(2)}/{fuel.unitLabel}
                    </div>
                    {fuel.lastUpdated && (
                      <div className="text-xs text-slate-500 mt-1">更新时间: {new Date(fuel.lastUpdated).toLocaleString("zh-CN")}</div>
                    )}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    onClick={() => onSaveFuelPrice(fuel.id, fuel.basePrice)}
                    disabled={isDisabled}
                    className={`flex-1 ${
                      hasPermission ? "bg-blue-500 hover:bg-blue-600 text-white" : "bg-slate-600/50 text-slate-400 cursor-not-allowed border-slate-600"
                    }`}
                    title={!hasPermission ? `您没有权限修改 ${fuel.name} 的价格` : ""}
                  >
                    {isSavingPrice ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        保存中...
                      </>
                    ) : !hasPermission ? (
                      <>
                        <Lock className="h-4 w-4 mr-2" />
                        无权限
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        保存价格
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => onToggleAutoSync(fuel.id)}
                    variant={fuel.autoSync ? "default" : "outline"}
                    className={
                      fuel.autoSync ? "bg-green-500 hover:bg-green-600 text-white" : "border-green-500/50 text-green-400 hover:bg-green-500/10"
                    }
                  >
                    {fuel.autoSync ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        已启用
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        启用自动同步
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card semanticLevel="secondary_fact" className="bg-gradient-to-br from-slate-900/90 to-blue-950/90 border-blue-800/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Database className="h-5 w-5 text-cyan-400" />
            功能说明
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-slate-300 text-sm">
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-400 mt-1.5" />
              <div>
                <strong className="text-white">手动调整价格：</strong>
                直接修改价格输入框中的数值，点击"保存价格"按钮即可更新。
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400 mt-1.5" />
              <div>
                <strong className="text-white">自动同步价格：</strong>
                启用"自动同步"后，系统将定期从第三方报价平台获取最新市场价格并自动更新。
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 rounded-full bg-orange-400 mt-1.5" />
              <div>
                <strong className="text-white">市场价格对比：</strong>
                显示当前价格与市场价格的差异百分比，帮助您及时调整定价策略。
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 rounded-full bg-purple-400 mt-1.5" />
              <div>
                <strong className="text-white">第三方数据源：</strong>
                未来将支持接入多个报价平台API，实现实时价格监控和自动调整。
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
