"use client"

// 数据统计模块：自管订单加载，从 page.tsx 迁出
// 进入「数据统计」时自行拉取订单供图表使用，不再依赖 page 的 recentOrders

import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { logBusinessWarning } from "@/lib/utils/logger"
import { AnalyticsPanel } from "./analytics"
import type { Order } from "../types/dashboard-types"

export interface AnalyticsWithDataProps {
  userRole: string | null
  userCompanyId: string | null
}

async function retryQuery<T extends { data: any; error: any }>(
  fn: () => Promise<T>,
  maxRetries = 3,
  delay = 1000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const result = await fn()
      if (result.error) {
        const msg = result.error.message || String(result.error)
        const isNetwork = /fetch|network|ECONNRESET|ETIMEDOUT/i.test(msg)
        if (isNetwork && i < maxRetries - 1) {
          await new Promise((r) => setTimeout(r, delay * (i + 1)))
          continue
        }
      }
      return result
    } catch (e: any) {
      const msg = e?.message || String(e)
      const isNetwork = /fetch|network|ECONNRESET|ETIMEDOUT/i.test(msg)
      if (isNetwork && i < maxRetries - 1) {
        await new Promise((r) => setTimeout(r, delay * (i + 1)))
        continue
      }
      throw e
    }
  }
  throw new Error("Max retries exceeded")
}

export function AnalyticsWithData({ userRole, userCompanyId }: AnalyticsWithDataProps) {
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoadingOrders, setIsLoadingOrders] = useState(false)

  const loadOrders = useCallback(async () => {
    if (!supabase) return
    if (userRole !== null && userRole !== "super_admin" && userRole !== "admin" && !userCompanyId) {
      setOrders([])
      setIsLoadingOrders(false)
      return
    }

    setIsLoadingOrders(true)
    try {
      let companyRestaurantIds: string[] | null = null
      if (userRole !== "super_admin" && userCompanyId) {
        const { data } = await supabase.from("restaurants").select("id").eq("company_id", userCompanyId)
        companyRestaurantIds = data?.map((r) => r.id) || []
      }

      let repairQuery = supabase
        .from("repair_orders")
        .select("id, restaurant_id, service_type, status, amount, created_at, updated_at, assigned_to")
        .order("created_at", { ascending: false })
        .limit(20)
      let deliveryQuery = supabase
        .from("delivery_orders")
        .select("id, restaurant_id, service_type, status, amount, created_at, updated_at, assigned_to")
        .order("created_at", { ascending: false })
        .limit(20)

      if (companyRestaurantIds !== null && companyRestaurantIds.length > 0) {
        repairQuery = repairQuery.in("restaurant_id", companyRestaurantIds)
        deliveryQuery = deliveryQuery.in("restaurant_id", companyRestaurantIds)
      } else if (companyRestaurantIds !== null && companyRestaurantIds.length === 0) {
        setOrders([])
        setIsLoadingOrders(false)
        return
      }

      const [repairResult, deliveryResult] = await Promise.all([
        retryQuery(() => repairQuery),
        retryQuery(() => deliveryQuery),
      ])

      const repairData = repairResult.data || []
      const deliveryData = deliveryResult.data || []
      const ordersData = [...repairData, ...deliveryData]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 20)

      if (repairResult.error || deliveryResult.error) {
        logBusinessWarning("Admin Dashboard", "加载订单失败", repairResult.error || deliveryResult.error)
        setOrders([])
        return
      }

      const restaurantIds = [...new Set(ordersData.map((o: any) => o.restaurant_id).filter(Boolean))]
      let restaurantMap: Record<string, string> = {}
      if (restaurantIds.length > 0) {
        const { data: restaurantsData } = await supabase.from("restaurants").select("id, name").in("id", restaurantIds)
        if (restaurantsData) {
          restaurantMap = restaurantsData.reduce((acc: Record<string, string>, r: any) => {
            acc[r.id] = r.name
            return acc
          }, {})
        }
      }

      const formatted: Order[] = ordersData.map((order: any) => ({
        id: order.id,
        restaurant_id: order.restaurant_id,
        restaurant_name: restaurantMap[order.restaurant_id] || "未知餐厅",
        service_type: order.service_type || "燃料配送",
        status: order.status || "pending",
        amount: order.amount || 0,
        created_at: order.created_at,
        updated_at: order.updated_at,
        worker_id: order.assigned_to || order.worker_id,
      }))
      setOrders(formatted)
    } catch (error) {
      logBusinessWarning("Admin Dashboard", "加载订单时出错", error)
      setOrders([])
    } finally {
      setIsLoadingOrders(false)
    }
  }, [userRole, userCompanyId])

  useEffect(() => {
    loadOrders()
  }, [loadOrders])

  return <AnalyticsPanel orders={orders} isLoadingOrders={isLoadingOrders} />
}
