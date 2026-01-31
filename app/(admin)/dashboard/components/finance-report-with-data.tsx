"use client"

// 财务报表模块：自管数据，从 page.tsx 迁出
// 迁出 reportType/reportData/financeStartDate/financeEndDate、loadFinanceReport

import { useState, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { fetchWithAuth } from "@/lib/auth/fetch-with-auth"
import { FinanceReportPanel } from "./finance-report"

export function FinanceReportWithData() {
  const [reportType, setReportType] = useState<string>("revenue")
  const [reportData, setReportData] = useState<any>(null)
  const [isLoadingReport, setIsLoadingReport] = useState(false)
  const [financeStartDate, setFinanceStartDate] = useState(() => {
    const date = new Date()
    date.setDate(date.getDate() - 30)
    return date.toISOString().split("T")[0]
  })
  const [financeEndDate, setFinanceEndDate] = useState(() => new Date().toISOString().split("T")[0])

  const loadFinanceReport = useCallback(async () => {
    setIsLoadingReport(true)
    try {
      const params = new URLSearchParams({
        report_type: reportType,
        start_date: financeStartDate,
        end_date: financeEndDate,
      })
      const headers: HeadersInit = { "Content-Type": "application/json" }
      if (supabase) {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`
      }
      const response = await fetchWithAuth(`/api/finance/report?${params}`, { credentials: "include", headers })
      const result = await response.json()
      if (result.success) {
        setReportData(result.data)
      } else {
        const msg = result.details ? `${result.error}: ${result.details}` : (result.error || "加载报表失败")
        if (response.status === 401) {
          alert(`${msg}\n\n若使用无痕/隐私模式，请改用普通浏览器窗口并重新登录后再试。`)
        } else {
          alert(msg)
        }
      }
    } catch (error: any) {
      alert(`加载报表失败: ${error.message}`)
    } finally {
      setIsLoadingReport(false)
    }
  }, [reportType, financeStartDate, financeEndDate])

  return (
    <FinanceReportPanel
      reportType={reportType}
      onReportTypeChange={setReportType}
      reportData={reportData}
      isLoadingReport={isLoadingReport}
      financeStartDate={financeStartDate}
      onFinanceStartDateChange={setFinanceStartDate}
      financeEndDate={financeEndDate}
      onFinanceEndDateChange={setFinanceEndDate}
      onLoadReport={loadFinanceReport}
    />
  )
}
