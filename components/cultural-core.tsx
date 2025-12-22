"use client"

import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BookOpen, Flower2, Wind, Lightbulb } from "lucide-react"

const cultures = [
  {
    id: "confucianism",
    label: "儒",
    icon: BookOpen,
    title: "儒家 · 修身养性",
    subtitle: "Confucianism - Self Cultivation",
    description:
      "以儒家经典为根基，通过诵读《论语》《大学》《中庸》，学习修身、齐家、治国、平天下的智慧。书法、太极等实践帮助培养浩然正气，建立内在道德准则。",
    practices: [
      { name: "经典诵读", detail: "晨读《论语》等儒家经典" },
      { name: "书法静心", detail: "通过书法修炼专注与定力" },
      { name: "太极养生", detail: "动静结合，涵养正气" },
      { name: "礼仪修习", detail: "学习传统礼仪，修身正心" },
    ],
    color: "from-amber-500 to-orange-500",
  },
  {
    id: "buddhism",
    label: "释",
    icon: Flower2,
    title: "佛家 · 明心见性",
    subtitle: "Buddhism - Clear Mind and See Nature",
    description:
      "依托鸡足山迦叶道场的殊胜因缘，通过禅坐、行禅、抄经等方式，学习佛法智慧。在禅师的引导下参悟本心，培养慈悲喜舍的菩提心。",
    practices: [
      { name: "禅坐冥想", detail: "寺院禅堂正统禅修" },
      { name: "行禅山间", detail: "在自然中练习觉知" },
      { name: "抄经静修", detail: "一笔一画，净化心灵" },
      { name: "禅师开示", detail: "深入浅出的佛法智慧" },
    ],
    color: "from-orange-500 to-rose-500",
  },
  {
    id: "taoism",
    label: "道",
    icon: Wind,
    title: "道家 · 天人合一",
    subtitle: "Taoism - Unity of Heaven and Human",
    description:
      "学习道家清静无为、顺应自然的哲学。通过导引术、五禽戏、吐纳调息等养生功法，以及观星、辟谷等实践，体验天人合一的境界。",
    practices: [
      { name: "导引养生", detail: "古法导引术与五禽戏" },
      { name: "吐纳调息", detail: "呼吸法门，培养内丹" },
      { name: "道医养生", detail: "学习中医养生智慧" },
      { name: "自然冥想", detail: "融入山水，道法自然" },
    ],
    color: "from-cyan-500 to-blue-500",
  },
]

export function CulturalCore() {
  return (
    <section className="py-24">
      <div className="container px-4 mx-auto max-w-7xl">
        <div className="text-center mb-16">
          <div className="inline-block px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            三教合一 · 文化精髓
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-balance">儒释道的智慧融合</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto text-pretty">
            不是简单的文化堆砌，而是深度体验三教合一的中国式智慧，在实修中领悟儒家的正气、佛家的慈悲、道家的自然
          </p>
        </div>

        <Tabs defaultValue="confucianism" className="w-full">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-3 mb-12">
            {cultures.map((culture) => {
              const Icon = culture.icon
              return (
                <TabsTrigger key={culture.id} value={culture.id} className="gap-2">
                  <Icon className="w-4 h-4" />
                  <span className="text-lg font-bold">{culture.label}</span>
                </TabsTrigger>
              )
            })}
          </TabsList>

          {cultures.map((culture) => (
            <TabsContent key={culture.id} value={culture.id} className="mt-0">
              <Card className="overflow-hidden">
                <div className={`h-2 bg-gradient-to-r ${culture.color}`} />
                <div className="p-8 md:p-12">
                  <div className="max-w-4xl mx-auto space-y-8">
                    <div className="text-center space-y-2">
                      <h3 className="text-3xl md:text-4xl font-bold">{culture.title}</h3>
                      <p className="text-muted-foreground">{culture.subtitle}</p>
                    </div>

                    <p className="text-lg leading-relaxed text-center text-pretty">{culture.description}</p>

                    <div className="grid sm:grid-cols-2 gap-6 pt-6">
                      {culture.practices.map((practice, index) => (
                        <div
                          key={index}
                          className="flex items-start gap-4 p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                        >
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                            {index + 1}
                          </div>
                          <div>
                            <h4 className="font-semibold mb-1">{practice.name}</h4>
                            <p className="text-sm text-muted-foreground">{practice.detail}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            </TabsContent>
          ))}
        </Tabs>

        {/* Integration Message */}
        <div className="mt-12 text-center">
          <Card className="inline-block p-6 md:p-8 max-w-3xl bg-gradient-to-br from-primary/5 via-accent/5 to-primary/5">
            <Lightbulb className="w-8 h-8 mx-auto mb-4 text-primary" />
            <h4 className="text-xl font-bold mb-3">三教合一，殊途同归</h4>
            <p className="text-muted-foreground leading-relaxed text-pretty">
              儒家教我们如何做人，佛家教我们如何明心，道家教我们如何养生。三教看似不同，实则都在追求人的完善与和谐。在七天愈修中，你将亲身体验这份中国文化独有的圆融智慧。
            </p>
          </Card>
        </div>
      </div>
    </section>
  )
}
