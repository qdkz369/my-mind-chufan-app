"use client"

import { useEffect, useState } from "react"

export function ZenHero() {
  const [opacity, setOpacity] = useState(0)

  useEffect(() => {
    setOpacity(1)
  }, [])

  return (
    <section className="relative h-screen w-full overflow-hidden">
      {/* 鸡足山云雾缭绕背景 */}
      <div className="absolute inset-0">
        <img src="/misty-jizu-mountain-yunnan-sunrise-golden-light-bu.jpg" alt="鸡足山" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-background" />
      </div>

      {/* 标题 - 渐入效果 */}
      <div
        className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center"
        style={{
          opacity,
          transition: "opacity 2s ease-in",
        }}
      >
        <h1 className="font-serif text-5xl font-light tracking-widest text-white md:text-7xl">见自己</h1>
        <div className="mt-8 h-px w-24 bg-white/60" />
        <p className="mt-8 font-serif text-xl font-light tracking-wide text-white/90 md:text-2xl">见众生</p>
        <div className="mt-8 h-px w-24 bg-white/60" />
        <p className="mt-8 font-serif text-xl font-light tracking-wide text-white/90 md:text-2xl">见天地</p>

        <p className="mt-12 max-w-md text-sm font-light text-white/70 md:text-base">鸡足山七天禅修之旅</p>
      </div>

      {/* 滚动提示 */}
      <div className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2 animate-bounce">
        <div className="h-8 w-px bg-white/50" />
      </div>
    </section>
  )
}
