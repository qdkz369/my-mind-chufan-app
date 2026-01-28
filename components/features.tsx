import { Card } from "@/components/ui/card"
import { Brain, Heart, Music, TrendingUp, Moon, Sparkles } from "lucide-react"

const features = [
  {
    icon: Brain,
    title: "AI情感陪伴",
    description: "24/7智能AI陪伴，基于认知行为疗法，提供专业心理支持和倾听",
    color: "text-accent",
  },
  {
    icon: Heart,
    title: "情绪追踪日记",
    description: "记录每日情绪变化，AI分析情绪模式，帮助你更了解自己",
    color: "text-secondary",
  },
  {
    icon: Music,
    title: "沉浸式冥想",
    description: "100+引导冥想课程，涵盖减压、专注、睡眠等多种场景",
    color: "text-primary",
  },
  {
    icon: TrendingUp,
    title: "呼吸练习",
    description: "科学呼吸调节技术，快速缓解焦虑，提升专注力",
    color: "text-chart-4",
  },
  {
    icon: Moon,
    title: "助眠音景",
    description: "精选自然声音和白噪音，营造舒适睡眠环境",
    color: "text-chart-5",
  },
  {
    icon: Sparkles,
    title: "每日正念",
    description: "每日推送心灵滋养内容，培养积极心态和正念习惯",
    color: "text-accent",
  },
]

export function Features() {
  return (
    <section id="features" className="py-20 px-4 bg-muted/30">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center space-y-4 mb-12">
          <h2 className="text-4xl md:text-5xl font-bold text-balance">全方位心灵疗愈</h2>
          <p className="text-lg text-muted-foreground text-pretty max-w-2xl mx-auto leading-relaxed">
            融合最新AI技术和心理学研究，为你提供科学、有效的心灵疗愈方案
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <Card key={index} semanticLevel="secondary_fact" className="p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
              <feature.icon className={`w-12 h-12 mb-4 ${feature.color}`} />
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
