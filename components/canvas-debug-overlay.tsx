"use client"

/**
 * 多端画布对齐 - 自检 Debug 悬浮窗
 * 仅开发环境可见，显示 width、height、currentScale
 */

import { useEffect, useState } from "react"

const BASE_WIDTH = 414

export function CanvasDebugOverlay() {
  const [size, setSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const update = () => {
      setSize({
        width: typeof window !== "undefined" ? window.innerWidth : 0,
        height: typeof window !== "undefined" ? window.innerHeight : 0,
      })
    }
    update()
    window.addEventListener("resize", update)
    return () => window.removeEventListener("resize", update)
  }, [])

  if (process.env.NODE_ENV !== "development") return null

  const currentScale = size.width > 0 ? (size.width / BASE_WIDTH).toFixed(2) : "—"

  return (
    <div
      className="fixed top-3 right-3 z-[9999] px-2 py-1.5 rounded text-[10px] font-mono bg-black/70 text-green-400 border border-green-500/40 pointer-events-none"
      aria-hidden
    >
      <div>w: {size.width}</div>
      <div>h: {size.height}</div>
      <div>scale: {currentScale}</div>
    </div>
  )
}
