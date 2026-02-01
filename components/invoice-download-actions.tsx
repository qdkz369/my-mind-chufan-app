"use client"

import { useState } from "react"
import { Copy, ExternalLink, Loader2 } from "lucide-react"
import { fetchWithAuth } from "@/lib/auth/fetch-with-auth"

export function InvoiceDownloadActions({ invoiceId }: { invoiceId: string }) {
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const getHeaders = (): HeadersInit => {
    const headers: HeadersInit = {}
    const restaurantId = typeof window !== "undefined" ? localStorage.getItem("restaurantId") : null
    if (restaurantId) headers["x-restaurant-id"] = restaurantId
    return headers
  }

  const fetchUrl = async (): Promise<string | null> => {
    const res = await fetchWithAuth(
      `/api/invoices/download-url?invoice_id=${invoiceId}`,
      { credentials: "include", headers: getHeaders() }
    )
    const json = await res.json()
    return json.success && json.data?.url ? json.data.url : null
  }

  const handleView = async () => {
    setLoading(true)
    try {
      const url = await fetchUrl()
      if (url) window.open(url, "_blank")
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async () => {
    setLoading(true)
    setCopied(false)
    try {
      const url = await fetchUrl()
      if (url) {
        await navigator.clipboard.writeText(url)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-3 mt-1">
      <button
        type="button"
        onClick={handleView}
        disabled={loading}
        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
      >
        {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <ExternalLink className="h-3 w-3" />}
        下载 PDF
      </button>
      <span className="text-muted-foreground">|</span>
      <button
        type="button"
        onClick={handleCopy}
        disabled={loading}
        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
      >
        {copied ? "已复制" : <><Copy className="h-3 w-3" /> 复制下载链接</>}
      </button>
    </div>
  )
}
