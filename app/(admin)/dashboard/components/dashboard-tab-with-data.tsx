"use client"

// 工作台 Tab：自管 recentOrders、recentOrdersCount、servicePoints，从 page.tsx 迁出
// 迁出 loadRecentOrdersCount、loadRecentOrders、orders 表实时订阅；迁出 servicePoints、loadServicePoints（仅地图用）

import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { logBusinessWarning } from "@/lib/utils/logger"
import { DashboardOverview } from "./dashboard-overview"
import { MapDashboard, type MapDashboardHandle } from "./map-dashboard"
import type { Order, Restaurant, ServicePoint } from "../types/dashboard-types"

async function retryQuery<T extends { data?: any; error?: any }>(
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

const MOCK_SERVICE_POINTS: ServicePoint[] = [
  {
    id: "sp_001",
    name: "五华区服务点",
    township: "五华区",
    latitude: 25.0389,
    longitude: 102.7183,
    service_radius: 15,
    legal_entity: "昆明市五华区燃料服务有限公司",
    status: "active",
    created_at: new Date().toISOString(),
    workers: [],
  },
  {
    id: "sp_002",
    name: "盘龙区服务点",
    township: "盘龙区",
    latitude: 25.0853,
    longitude: 102.7353,
    service_radius: 12,
    legal_entity: "昆明市盘龙区能源服务有限公司",
    status: "active",
    created_at: new Date().toISOString(),
    workers: [],
  },
]

export interface DashboardTabWithDataProps {
  userRole: string | null
  userCompanyId: string | null
  restaurants: Restaurant[]
  orders: Order[]
  setRestaurants: (v: Restaurant[] | ((prev: Restaurant[]) => Restaurant[])) => void
  supabase: typeof supabase
  onNavigateToRepairs: (orderId: string) => void
  mapDashboardRef: React.RefObject<MapDashboardHandle | null>
}

export function DashboardTabWithData({
  userRole,
  userCompanyId,
  restaurants,
  orders,
  setRestaurants,
  supabase: supabaseClient,
  onNavigateToRepairs,
  mapDashboardRef,
}: DashboardTabWithDataProps) {
  const [recentOrders, setRecentOrders] = useState<Order[]>([])
  const [recentOrdersCount, setRecentOrdersCount] = useState(0)
  const [isRecentOrdersExpanded, setIsRecentOrdersExpanded] = useState(false)
  const [isLoadingRecentOrders, setIsLoadingRecentOrders] = useState(false)
  const [servicePoints, setServicePoints] = useState<ServicePoint[]>([])

  const loadRecentOrdersCount = useCallback(async () => {
    if (!supabaseClient) return
    // 🔒 多租户隔离：非 super_admin 必须有 companyId
    if (userRole !== "super_admin" && !userCompanyId) {
      setRecentOrdersCount(0)
      return
    }
    try {
      let repairQuery = supabaseClient.from("repair_orders").select("*", { count: "exact", head: true })
      let deliveryQuery = supabaseClient.from("delivery_orders").select("*", { count: "exact", head: true })
      // 🔒 按公司餐厅过滤
      if (userRole !== "super_admin" && userCompanyId) {
        const { data: companyRestaurants } = await supabaseClient.from("restaurants").select("id").eq("company_id", userCompanyId)
        const ids = companyRestaurants?.map((r: any) => r.id) || []
        if (ids.length === 0) {
          setRecentOrdersCount(0)
          return
        }
        repairQuery = repairQuery.in("restaurant_id", ids)
        deliveryQuery = deliveryQuery.in("restaurant_id", ids)
      }
      const [repairResult, deliveryResult] = await Promise.all([
        retryQuery(async () => {
          const r = await repairQuery
          return { data: r.count ?? 0, error: r.error }
        }),
        retryQuery(async () => {
          const r = await deliveryQuery
          return { data: r.count ?? 0, error: r.error }
        }),
      ])
      if (repairResult.error || deliveryResult.error) {
        setRecentOrdersCount(0)
        return
      }
      const repairCount = Number((repairResult as { data?: number }).data) || 0
      const deliveryCount = Number((deliveryResult as { data?: number }).data) || 0
      setRecentOrdersCount(repairCount + deliveryCount)
    } catch (e) {
      logBusinessWarning("Admin Dashboard", "获取订单数量失败", e)
      setRecentOrdersCount(0)
    }
  }, [supabaseClient, userRole, userCompanyId])

  const loadRecentOrders = useCallback(async () => {
    if (!supabaseClient) return
    // 🔒 多租户隔离：非 super_admin 必须有 companyId
    if (userRole !== "super_admin" && !userCompanyId) {
      setRecentOrders([])
      setIsLoadingRecentOrders(false)
      return
    }
    setIsLoadingRecentOrders(true)
    try {
      let companyRestaurantIds: string[] | null = null
      if (userRole !== "super_admin" && userCompanyId) {
        const { data } = await supabaseClient.from("restaurants").select("id").eq("company_id", userCompanyId)
        companyRestaurantIds = data?.map((r) => r.id) || []
      }
      let repairQuery = supabaseClient
        .from("repair_orders")
        .select("id, restaurant_id, service_type, status, amount, created_at, updated_at, assigned_to")
        .order("created_at", { ascending: false })
        .limit(20)
      let deliveryQuery = supabaseClient
        .from("delivery_orders")
        .select("id, restaurant_id, service_type, status, amount, created_at, updated_at, assigned_to")
        .order("created_at", { ascending: false })
        .limit(20)
      if (companyRestaurantIds !== null && companyRestaurantIds.length > 0) {
        repairQuery = repairQuery.in("restaurant_id", companyRestaurantIds)
        deliveryQuery = deliveryQuery.in("restaurant_id", companyRestaurantIds)
      } else if (companyRestaurantIds !== null && companyRestaurantIds.length === 0) {
        setRecentOrders([])
        setIsLoadingRecentOrders(false)
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
        setRecentOrders([])
        return
      }
      const restaurantIds = [...new Set(ordersData.map((o: any) => o.restaurant_id).filter(Boolean))]
      let restaurantMap: Record<string, string> = {}
      if (restaurantIds.length > 0) {
        const { data: restaurantsData } = await supabaseClient.from("restaurants").select("id, name").in("id", restaurantIds)
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
      setRecentOrders(formatted)
    } catch (e) {
      logBusinessWarning("Admin Dashboard", "加载订单时出错", e)
      setRecentOrders([])
    } finally {
      setIsLoadingRecentOrders(false)
    }
  }, [supabaseClient, userRole, userCompanyId])

  const loadServicePoints = useCallback(async () => {
    // 🔒 多租户隔离：非 super_admin 必须有 companyId（服务点用于地图，无公司则用模拟数据）
    if (userRole !== "super_admin" && !userCompanyId) {
      setServicePoints(MOCK_SERVICE_POINTS)
      return
    }
    if (!supabaseClient) {
      setServicePoints(MOCK_SERVICE_POINTS)
      return
    }
    try {
      const { data, error } = await supabaseClient
        .from("service_points")
        .select("id, name, township, latitude, longitude, service_radius, legal_entity, status, created_at")
        .order("created_at", { ascending: false })
      if (error) {
        if (error.code === "PGRST205" || error.code === "42P01" || error.message?.includes("service_points") || error.message?.includes("not found")) {
          setServicePoints(MOCK_SERVICE_POINTS)
          return
        }
      }
      setServicePoints(data || MOCK_SERVICE_POINTS)
    } catch {
      setServicePoints(MOCK_SERVICE_POINTS)
    }
  }, [supabaseClient, userRole, userCompanyId])

  useEffect(() => {
    loadRecentOrdersCount()
    loadServicePoints()
  }, [loadRecentOrdersCount, loadServicePoints])

  useEffect(() => {
    if (!supabaseClient) return
    const channel = supabaseClient
      .channel("dashboard_tab_orders")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => {
          loadRecentOrdersCount()
          if (isRecentOrdersExpanded) loadRecentOrders()
        }
      )
      .subscribe()
    return () => {
      supabaseClient.removeChannel(channel)
    }
  }, [supabaseClient, loadRecentOrdersCount, loadRecentOrders, isRecentOrdersExpanded])

  return (
    <>
      <DashboardOverview
        restaurants={restaurants}
        orders={orders}
        recentOrders={recentOrders}
        recentOrdersCount={recentOrdersCount}
        isLoadingOrders={isLoadingRecentOrders}
        isRecentOrdersExpanded={isRecentOrdersExpanded}
        onExpandOrders={() => setIsRecentOrdersExpanded(true)}
        onCollapseOrders={() => setIsRecentOrdersExpanded(false)}
        onLoadRecentOrders={loadRecentOrders}
        onNavigateToRepairs={onNavigateToRepairs}
      />
      <MapDashboard
        ref={mapDashboardRef}
        restaurants={restaurants}
        orders={orders}
        servicePoints={servicePoints}
        setRestaurants={setRestaurants}
        supabase={supabaseClient}
      />
    </>
  )
}
