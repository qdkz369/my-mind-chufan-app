"use client"

// 设备监控模块：自管数据，从 page.tsx 迁出
// 进入「设备监控」时自行加载设备列表

import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { logBusinessWarning } from "@/lib/utils/logger"
import { DevicesMonitoring } from "./devices-monitoring"
import type { Device } from "../types/dashboard-types"

export interface DevicesWithDataProps {
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

export function DevicesWithData({ userRole, userCompanyId }: DevicesWithDataProps) {
  const [devices, setDevices] = useState<Device[]>([])

  const loadDevices = useCallback(async () => {
    if (!supabase) return
    const client = supabase
    if (userRole !== null && userRole !== "super_admin" && userRole !== "admin" && !userCompanyId) {
      setDevices([])
      return
    }

    try {
      const { data, error } = await retryQuery(async () => {
        let query = client
          .from("devices")
          .select("device_id, restaurant_id, model, address, installer, install_date, status")
          .order("install_date", { ascending: false })
        if (userRole !== "super_admin" && userCompanyId) {
          query = query.eq("company_id", userCompanyId)
        }
        return await query
      })

      if (error) {
        logBusinessWarning("Admin Dashboard", "加载设备列表失败", error)
        setDevices([])
        return
      }
      setDevices(data || [])
    } catch (error) {
      logBusinessWarning("Admin Dashboard", "加载设备列表失败", error)
      setDevices([])
    }
  }, [userRole, userCompanyId])

  useEffect(() => {
    loadDevices()
  }, [loadDevices])

  return <DevicesMonitoring devices={devices} />
}
