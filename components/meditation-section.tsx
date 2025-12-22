"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Play, Clock, Star } from "lucide-react"

const meditations = [
  {
    title: "初学者入门",
    duration: "5分钟",
    category: "基础冥想",
    image: "meditation beginner peaceful lotus",
    rating: 4.8,
  },
  {
    title: "深度放松",
    duration: "15分钟",
    category: "减压放松",
    image: "serene nature landscape for meditation",
    rating: 4.9,
  },
  {
    title: "专注力提升",
    duration: "10分钟",
    category: "工作学习",
    image: "focused mind meditation abstract",
    rating: 4.7,
  },
  {
    title: "睡前冥想",
    duration: "20分钟",
    category: "改善睡眠",
    image: "peaceful night sky for sleep meditation",
    rating: 4.9,
  },
]

export function MeditationSection() {
  return (
    <section id="meditation" className="py-20 px-4">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center space-y-4 mb-12">
          <h2 className="text-4xl md:text-5xl font-bold text-balance">精选冥想课程</h2>
          <p className="text-lg text-muted-foreground text-pretty max-w-2xl mx-auto leading-relaxed">
            无论你是冥想新手还是经验者，都能找到适合自己的练习
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {meditations.map((meditation, index) => (
            <Card key={index} className="overflow-hidden hover:shadow-xl transition-all duration-300 group">
              <div className="relative h-48 overflow-hidden">
                <img
                  src={`/.jpg?height=400&width=600&query=${meditation.image}`}
                  alt={meditation.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <Button
                  size="icon"
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Play className="w-6 h-6" fill="currentColor" />
                </Button>
                <div className="absolute top-4 right-4 flex items-center gap-1 bg-black/50 backdrop-blur-sm px-3 py-1 rounded-full">
                  <Star className="w-4 h-4 text-yellow-400" fill="currentColor" />
                  <span className="text-white text-sm font-medium">{meditation.rating}</span>
                </div>
              </div>
              <div className="p-6">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-medium text-primary bg-primary/10 px-3 py-1 rounded-full">
                    {meditation.category}
                  </span>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>{meditation.duration}</span>
                  </div>
                </div>
                <h3 className="text-xl font-semibold mb-2">{meditation.title}</h3>
                <Button variant="outline" className="w-full rounded-full mt-2 bg-transparent">
                  开始冥想
                </Button>
              </div>
            </Card>
          ))}
        </div>

        <div className="text-center mt-8">
          <Button size="lg" variant="outline" className="rounded-full bg-transparent">
            浏览所有课程 (100+)
          </Button>
        </div>
      </div>
    </section>
  )
}
