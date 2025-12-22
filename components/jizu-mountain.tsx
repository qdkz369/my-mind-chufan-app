"use client"

import { Card } from "@/components/ui/card"
import { Mountain, Sparkles, Trees, Sun } from "lucide-react"
import Image from "next/image"

const highlights = [
  {
    icon: Mountain,
    title: "迦叶道场",
    description: "释迦牟尼大弟子迦叶尊者入定之地，佛教禅宗发源地",
    color: "text-amber-600",
  },
  {
    icon: Sparkles,
    title: "华首门",
    description: "千年灵迹，守候弥勒降生的神圣之门",
    color: "text-orange-600",
  },
  {
    icon: Trees,
    title: "天然氧吧",
    description: "森林覆盖率85%以上，负氧离子含量极高",
    color: "text-green-600",
  },
  {
    icon: Sun,
    title: "金顶日出",
    description: "云海翻腾，佛光普照，震撼心灵的自然奇观",
    color: "text-rose-600",
  },
]

export function JizuMountain() {
  return (
    <section className="py-24 bg-muted/30">
      <div className="container px-4 mx-auto max-w-7xl">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left - Image */}
          <div className="relative">
            <div className="aspect-[4/3] relative rounded-2xl overflow-hidden shadow-2xl">
              <Image src="/-----------.jpg" alt="鸡足山金顶" fill className="object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <div className="absolute bottom-6 left-6 text-white">
                <h3 className="text-2xl font-bold mb-1">鸡足山</h3>
                <p className="text-sm opacity-90">中国十大佛教名山之一</p>
              </div>
            </div>

            {/* Decorative Element */}
            <div className="absolute -top-6 -right-6 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-6 -left-6 w-40 h-40 bg-accent/10 rounded-full blur-3xl" />
          </div>

          {/* Right - Content */}
          <div className="space-y-8">
            <div>
              <div className="inline-block px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
                人间净土 · 禅修圣地
              </div>
              <h2 className="text-4xl md:text-5xl font-bold mb-4 text-balance">鸡足山的千年灵韵</h2>
              <p className="text-lg text-muted-foreground leading-relaxed text-pretty">
                位于云南大理宾川的鸡足山，是迦叶菩萨守衣入定之地，两千多年来香火鼎盛。清末高僧虚云和尚曾驻锡弘法十四年，使鸡足山成为南亚、东南亚著名的佛教圣地。
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              {highlights.map((item) => {
                const Icon = item.icon
                return (
                  <Card key={item.title} className="p-5 hover:shadow-lg transition-shadow">
                    <div className="flex items-start gap-3">
                      <div
                        className={`flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center ${item.color}`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-semibold mb-1">{item.title}</h4>
                        <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>

            <div className="p-6 rounded-xl bg-gradient-to-r from-primary/5 to-accent/5 border">
              <p className="text-sm leading-relaxed text-muted-foreground">
                <span className="font-semibold text-foreground">为什么选择鸡足山？</span>
                <br />
                这里不仅有深厚的佛教底蕴和自然灵气，更有虚云老和尚留下的禅修传承。在这片净土上，远离都市喧嚣，在晨钟暮鼓中聆听内心的声音，在云海佛光中体悟生命的真谛。
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
