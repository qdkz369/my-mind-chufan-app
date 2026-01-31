"use client"

// 异常处理模块：自管数据（逾期账期、逾期设备），进入时加载
// 从 page.tsx 迁出 overdueBilling/overdueRentals、loadOverdueBillingData/loadOverdueRentalsData 及 useEffect

import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { fetchWithAuth } from "@/lib/auth/fetch-with-auth"
import { logBusinessWarning } from "@/lib/utils/logger"
import { ExceptionHandlingPanel } from "./exception-handling"

export function ExceptionHandlingWithData() {
  const [overdueBilling, setOverdueBilling] = useState<any[]>([])
  const [overdueRentals, setOverdueRentals] = useState<any[]>([])
  const [isLoadingOverdueBilling, setIsLoadingOverdueBilling] = useState(false)
  const [isLoadingOverdueRentals, setIsLoadingOverdueRentals] = useState(false)

  const loadOverdueBillingData = useCallback(async () => {
    setIsLoadingOverdueBilling(true)
    try {
      const headers: HeadersInit = {}
      if (supabase) {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`
      }
      const response = await fetchWithAuth("/api/finance/billing/overdue", { credentials: "include", headers })
      const result = await response.json()
      if (result.success) {
        setOverdueBilling(result.data?.overdue_cycles || [])
      }
    } catch (error: any) {
      logBusinessWarning('异常处理', '加载逾期账期失败', error)
    } finally {
      setIsLoadingOverdueBilling(false)
    }
  }, [])

  const loadOverdueRentalsData = useCallback(async () => {
    setIsLoadingOverdueRentals(true)
    try {
      const response = await fetchWithAuth("/api/cron/check-overdue-rentals?dry_run=true")
      const result = await response.json()
      if (result.success) {
        setOverdueRentals(result.data?.overdue_orders || [])
      }
    } catch (error: any) {
      logBusinessWarning('异常处理', '加载逾期设备失败', error)
    } finally {
      setIsLoadingOverdueRentals(false)
    }
  }, [])

  useEffect(() => {
    loadOverdueBillingData()
    loadOverdueRentalsData()
  }, [loadOverdueBillingData, loadOverdueRentalsData])

  return (
    <ExceptionHandlingPanel
      overdueBilling={overdueBilling}
      isLoadingOverdueBilling={isLoadingOverdueBilling}
      overdueRentals={overdueRentals}
      isLoadingOverdueRentals={isLoadingOverdueRentals}
    />
  )
}
