"use client"

import { Card } from "@/components/ui/card"
import { Palette, Music, Heart, Sparkles } from "lucide-react"
import Image from "next/image"

const ethnicCultures = [
  {
    icon: Palette,
    title: "白族扎染",
    description: "千年传承的植物染色技艺，亲手制作独一无二的扎染作品",
    image: "白族扎染艺术作品蓝色渐变",
  },
  {
    icon: Music,
    title: "纳西古乐",
    description: "世界文化遗产，聆听穿越千年的天籁之音",
    image: "纳西古乐演奏场景传统乐器",
  },
  {
    icon: Heart,
    title: "彝族刺绣",
    description: "色彩斑斓的刺绣艺术，体验指尖上的民族智慧",
    image: "彝族刺绣图案色彩鲜艳",
  },
  {
    icon: Sparkles,
    title: "篝火晚会",
    description: "载歌载舞，在星空下感受云南人的热情与奔放",
    image: "篝火晚会夜晚星空舞蹈",
  },
]

export function YunnanCulture() {
  return (
    <section className="py-24 bg-gradient-to-b from-muted/30 to-background">
      <div className="container px-4 mx-auto max-w-7xl">
        <div className="text-center mb-16">
          <div className="inline-block px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            多彩云南 · 民族瑰宝
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-balance">云南少数民族文化体验</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto text-pretty">
            云南是26个民族的家园，这里有最纯粹的民族文化和最热情的待客之道。在愈修旅程中，深度体验白族、纳西族、彝族等民族的艺术与智慧
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-16">
          {ethnicCultures.map((culture, index) => {
            const Icon = culture.icon
            return (
              <Card key={index} className="group overflow-hidden hover:shadow-xl transition-all duration-300">
                <div className="aspect-[16/9] relative overflow-hidden">
                  <Image
                    src={`/.jpg?height=400&width=600&query=${culture.image}`}
                    alt={culture.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4">
                    <div className="flex items-center gap-3 text-white">
                      <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                        <Icon className="w-5 h-5" />
                      </div>
                      <h3 className="text-xl font-bold">{culture.title}</h3>
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <p className="text-muted-foreground leading-relaxed">{culture.description}</p>
                </div>
              </Card>
            )
          })}
        </div>

        {/* Cultural Integration */}
        <Card className="p-8 md:p-12 bg-gradient-to-br from-primary/5 to-accent/5">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <h3 className="text-2xl md:text-3xl font-bold">文旅融合 · 身心疗愈</h3>
            <p className="text-lg leading-relaxed text-muted-foreground text-pretty">
              我们不只是带你"看"云南，而是让你"成为"云南的一部分。在扎染中学习耐心，在古乐中聆听天籁，在刺绣中体会专注，在篝火旁释放天性。民族文化的智慧与儒释道的精髓相得益彰，共同滋养你的身心灵。
            </p>
            <div className="grid sm:grid-cols-3 gap-6 pt-6">
              <div className="space-y-2">
                <div className="text-3xl font-bold text-primary">26+</div>
                <div className="text-sm text-muted-foreground">个民族文化元素</div>
              </div>
              <div className="space-y-2">
                <div className="text-3xl font-bold text-primary">100%</div>
                <div className="text-sm text-muted-foreground">沉浸式文化体验</div>
              </div>
              <div className="space-y-2">
                <div className="text-3xl font-bold text-primary">7天</div>
                <div className="text-sm text-muted-foreground">深度文化疗愈</div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </section>
  )
}
