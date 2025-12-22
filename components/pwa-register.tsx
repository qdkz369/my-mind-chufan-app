"use client"

import { useEffect } from "react"

export function PWARegister() {
  useEffect(() => {
    // Service Worker在v0预览环境中无法正常工作
    // 部署到生产环境后可以启用以下代码实现离线缓存
    /*
    if (typeof window !== "undefined" && "serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("[v0] Service Worker registered:", registration.scope)
        })
        .catch((error) => {
          console.error("[v0] Service Worker registration failed:", error)
        })
    }
    */
  }, [])

  return null
}
