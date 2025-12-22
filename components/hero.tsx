"use client"

import { Button } from "@/components/ui/button"
import { Mountain, Phone, Calendar } from "lucide-react"
import Image from "next/image"

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <Image src="/-----------.jpg" alt="鸡足山金顶日出" fill className="object-cover" priority />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-background" />
      </div>

      {/* Content */}
      <div className="relative z-10 container px-4 mx-auto max-w-7xl pt-32 pb-20">
        <div className="text-center space-y-8 text-white">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-5 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-sm">
            <Mountain className="w-4 h-4" />
            <span>中国十大佛教名山 · 迦叶道场</span>
          </div>

          {/* Main Heading */}
          <div className="space-y-4">
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold text-balance leading-tight">
              鸡足山
              <span className="block mt-2 text-primary-foreground/90">七天愈修之旅</span>
            </h1>
            <div className="text-xl md:text-2xl text-white/80 max-w-3xl mx-auto text-pretty">
              儒释道三教合一 · 云南民族文化融合
              <br />
              在千年佛教圣地，开启身心灵的深度转化
            </div>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap items-center justify-center gap-8 pt-4 text-sm">
            <div>
              <div className="text-3xl font-bold mb-1">7天6夜</div>
              <div className="text-white/70">深度禅修</div>
            </div>
            <div className="w-px h-12 bg-white/20" />
            <div>
              <div className="text-3xl font-bold mb-1">20人</div>
              <div className="text-white/70">小班教学</div>
            </div>
            <div className="w-px h-12 bg-white/20" />
            <div>
              <div className="text-3xl font-bold mb-1">98.7%</div>
              <div className="text-white/70">学员满意</div>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
            <Button
              size="lg"
              className="text-lg px-10 h-14 rounded-full shadow-2xl gap-2 bg-primary hover:bg-primary/90"
            >
              <Calendar className="w-5 h-5" />
              立即预订
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-lg px-10 h-14 rounded-full bg-white/10 backdrop-blur-md border-white/30 hover:bg-white/20 text-white"
            >
              <Phone className="w-5 h-5" />
              咨询详情
            </Button>
          </div>

          {/* Trust Indicators */}
          <div className="pt-12 text-xs text-white/60">
            ✓ 国家AAAA级景区 · ✓ 专业禅修导师 · ✓ 全程食宿包含 · ✓ 支持全额退款
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 border-2 border-white/30 rounded-full flex items-start justify-center p-2">
          <div className="w-1.5 h-1.5 bg-white/50 rounded-full" />
        </div>
      </div>
    </section>
  )
}
