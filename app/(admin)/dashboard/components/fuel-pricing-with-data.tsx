"use client"

// 燃料价格模块：自管数据，从 page.tsx 迁出
// 迁出 fuelPrices/isSavingPrice/isSyncingPrice、handleSaveFuelPrice/handleSyncMarketPrice/handleToggleAutoSync
// 仍从 page 接收 userRole、userCompanyId、companyFuelTypes、isLoading（与身份/权限加载一致）

import { useState } from "react"
import { logBusinessWarning } from "@/lib/utils/logger"
import { FuelPricingPanel } from "./fuel-pricing"
import type { FuelPrice } from "../types/dashboard-types"

const defaultFuelPrices: FuelPrice[] = [
  { id: "lpg", name: "液化气", unit: "kg", unitLabel: "公斤", basePrice: 11.5, autoSync: false },
  { id: "clean", name: "热能清洁燃料", unit: "L", unitLabel: "升", basePrice: 7.5, autoSync: false },
  { id: "alcohol", name: "醇基燃料", unit: "kg", unitLabel: "公斤", basePrice: 3.5, autoSync: false },
  { id: "outdoor", name: "户外环保燃料", unit: "kg", unitLabel: "公斤", basePrice: 6, autoSync: false },
]

export interface FuelPricingWithDataProps {
  userRole: string | null
  userCompanyId: string | null
  companyFuelTypes: string[]
  isLoading: boolean
}

export function FuelPricingWithData({
  userRole,
  userCompanyId,
  companyFuelTypes,
  isLoading,
}: FuelPricingWithDataProps) {
  const [fuelPrices, setFuelPrices] = useState<FuelPrice[]>(defaultFuelPrices)
  const [isSavingPrice, setIsSavingPrice] = useState(false)
  const [isSyncingPrice, setIsSyncingPrice] = useState(false)

  const handleSaveFuelPrice = async (fuelId: string, newPrice: number) => {
    if (userRole !== "super_admin" && userCompanyId) {
      if (!companyFuelTypes.includes(fuelId)) {
        alert(`⚠️ 权限不足：您没有权限修改 "${fuelId}" 的价格。请联系管理员分配该燃料品种的权限。`)
        return
      }
    }
    setIsSavingPrice(true)
    try {
      setFuelPrices(prev =>
        prev.map(fuel =>
          fuel.id === fuelId
            ? { ...fuel, basePrice: newPrice, lastUpdated: new Date().toISOString() }
            : fuel
        )
      )
      alert("价格已保存")
    } catch (error) {
      logBusinessWarning("Fuel Pricing", "保存价格失败", error)
      alert("保存失败，请重试")
    } finally {
      setIsSavingPrice(false)
    }
  }

  const handleSyncMarketPrice = async () => {
    setIsSyncingPrice(true)
    try {
      const mockMarketPrices: Record<string, number> = {
        lpg: 11.8,
        clean: 7.8,
        alcohol: 3.6,
        outdoor: 6.2,
      }
      setFuelPrices(prev =>
        prev.map(fuel => {
          const marketPrice = mockMarketPrices[fuel.id]
          if (marketPrice !== undefined && fuel.autoSync) {
            return {
              ...fuel,
              marketPrice,
              basePrice: marketPrice,
              lastUpdated: new Date().toISOString(),
            }
          }
          return {
            ...fuel,
            marketPrice,
            lastUpdated: new Date().toISOString(),
          }
        })
      )
      alert("市场价格已同步")
    } catch (error) {
      logBusinessWarning("Fuel Pricing", "同步市场价格失败", error)
      alert("同步失败，请重试")
    } finally {
      setIsSyncingPrice(false)
    }
  }

  const handleToggleAutoSync = (fuelId: string) => {
    setFuelPrices(prev =>
      prev.map(fuel =>
        fuel.id === fuelId ? { ...fuel, autoSync: !fuel.autoSync } : fuel
      )
    )
  }

  return (
    <FuelPricingPanel
      fuelPrices={fuelPrices}
      onFuelPricesChange={setFuelPrices}
      onSyncMarketPrice={handleSyncMarketPrice}
      isSyncingPrice={isSyncingPrice}
      onSaveFuelPrice={handleSaveFuelPrice}
      isSavingPrice={isSavingPrice}
      onToggleAutoSync={handleToggleAutoSync}
      userRole={userRole}
      userCompanyId={userCompanyId}
      companyFuelTypes={companyFuelTypes}
      isLoading={isLoading}
    />
  )
}
