"use client"

import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Star } from "lucide-react"

const testimonials = [
  {
    name: "李女士",
    title: "企业高管 · 上海",
    avatar: "L",
    content:
      "在鸡足山的七天，是我人生的转折点。儒释道的智慧不再是书本上的文字，而是真实融入了我的生命。感恩这段旅程让我找回了内心的平静。",
    rating: 5,
  },
  {
    name: "张先生",
    title: "创业者 · 深圳",
    avatar: "Z",
    content:
      "从不相信什么身心灵疗愈，但这次经历彻底改变了我。专业的导师、殊胜的道场、科学的课程安排，让我真正理解了什么是'修行'。强烈推荐！",
    rating: 5,
  },
  {
    name: "王女士",
    title: "心理咨询师 · 北京",
    avatar: "W",
    content:
      "作为心理从业者，我深知这个项目的专业性和深度。它不是简单的旅游，而是系统的身心灵整合训练。云南民族文化的加入更是点睛之笔。",
    rating: 5,
  },
  {
    name: "陈先生",
    title: "教师 · 杭州",
    avatar: "C",
    content:
      "七天时间不长，但收获远超预期。从太极到禅坐，从扎染到古乐，每一个环节都经过精心设计。回去后整个人的状态都不一样了，家人都说我变温和了。",
    rating: 5,
  },
]

export function Testimonials() {
  return (
    <section className="py-24">
      <div className="container px-4 mx-auto max-w-7xl">
        <div className="text-center mb-16">
          <div className="inline-block px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            学员心声
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-balance">他们的生命因此改变</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto text-pretty">
            每一位学员都带着不同的困惑而来，但都带着相同的觉悟而归
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="p-8 hover:shadow-xl transition-shadow">
              <div className="flex items-start gap-4 mb-6">
                <Avatar className="w-14 h-14 border-2 border-primary/20">
                  <AvatarImage src={`/portrait.png?height=56&width=56&query=头像${testimonial.avatar}`} />
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold text-lg">
                    {testimonial.avatar}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h4 className="font-semibold text-lg">{testimonial.name}</h4>
                  <p className="text-sm text-muted-foreground">{testimonial.title}</p>
                  <div className="flex gap-1 mt-2">
                    {Array.from({ length: testimonial.rating }).map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                </div>
              </div>
              <p className="text-muted-foreground leading-relaxed text-pretty">"{testimonial.content}"</p>
            </Card>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Card className="inline-block p-6 bg-gradient-to-r from-primary/5 to-accent/5">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">学员满意度 98.7%</span>
              {" · "}
              <span className="font-semibold text-foreground">复训率 67.3%</span>
              {" · "}
              <span className="font-semibold text-foreground">推荐率 92.1%</span>
            </p>
          </Card>
        </div>
      </div>
    </section>
  )
}
