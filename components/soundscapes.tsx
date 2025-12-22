"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Play, Pause } from "lucide-react"
import { useState } from "react"

const sounds = [
  {
    title: "雨声",
    description: "温柔的雨滴声，助你放松入眠",
    image: "gentle rain falling on leaves",
    emoji: "🌧️",
  },
  {
    title: "海浪",
    description: "平静的海浪拍打海岸",
    image: "peaceful ocean waves on beach",
    emoji: "🌊",
  },
  {
    title: "森林",
    description: "鸟鸣与树叶沙沙作响",
    image: "serene forest with birds",
    emoji: "🌲",
  },
  {
    title: "白噪音",
    description: "帮助专注和屏蔽干扰",
    image: "abstract white noise visualization",
    emoji: "⚪",
  },
  {
    title: "篝火",
    description: "温暖的火焰噼啪声",
    image: "cozy campfire burning",
    emoji: "🔥",
  },
  {
    title: "雷雨",
    description: "远处的雷声和雨声",
    image: "thunderstorm in distance",
    emoji: "⛈️",
  },
]

export function SoundScapes() {
  const [playing, setPlaying] = useState<number | null>(null)

  return (
    <section className="py-20 px-4 bg-muted/30">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center space-y-4 mb-12">
          <h2 className="text-4xl md:text-5xl font-bold text-balance">自然音景</h2>
          <p className="text-lg text-muted-foreground text-pretty max-w-2xl mx-auto leading-relaxed">
            让大自然的声音陪伴你放松、专注或入睡
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {sounds.map((sound, index) => (
            <Card
              key={index}
              className="overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer group"
              onClick={() => setPlaying(playing === index ? null : index)}
            >
              <div className="relative h-40 overflow-hidden">
                <img
                  src={`/.jpg?height=300&width=400&query=${sound.image}`}
                  alt={sound.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Button
                    size="icon"
                    className="w-14 h-14 rounded-full shadow-lg"
                    variant={playing === index ? "secondary" : "default"}
                  >
                    {playing === index ? (
                      <Pause className="w-5 h-5" fill="currentColor" />
                    ) : (
                      <Play className="w-5 h-5" fill="currentColor" />
                    )}
                  </Button>
                </div>
                <div className="absolute top-4 left-4 text-3xl">{sound.emoji}</div>
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-lg mb-1">{sound.title}</h3>
                <p className="text-sm text-muted-foreground">{sound.description}</p>
              </div>
            </Card>
          ))}
        </div>

        <div className="mt-12 p-8 bg-card rounded-3xl shadow-lg text-center space-y-4">
          <h3 className="text-2xl font-bold">准备好开始你的疗愈之旅了吗？</h3>
          <p className="text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            加入超过100万用户，每天花10分钟关注自己的心理健康。首月免费体验所有高级功能。
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Button size="lg" className="rounded-full px-8">
              立即开始 - 完全免费
            </Button>
            <p className="text-xs text-muted-foreground">无需信用卡 · 随时取消</p>
          </div>
        </div>
      </div>
    </section>
  )
}
