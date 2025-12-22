"use client"

import { Card } from "@/components/ui/card"
import { Sunrise, Moon, Mountain, Heart, Leaf, Star, Sparkles } from "lucide-react"

const journeySchedule = [
  {
    day: 1,
    title: "启程·归心",
    subtitle: "Opening - Return to Heart",
    icon: Sunrise,
    morning: "欢迎仪式 · 禅茶一味",
    afternoon: "鸡足山朝圣 · 华首门祈福",
    evening: "开营晚课 · 点灯祈愿",
    focus: "放下都市喧嚣，回归内心宁静",
  },
  {
    day: 2,
    title: "儒学·修身",
    subtitle: "Confucianism - Self Cultivation",
    icon: Mountain,
    morning: "晨起太极 · 经典诵读",
    afternoon: "儒学讲座 · 书法静心",
    evening: "夜话论语 · 反思日记",
    focus: "修身齐家，培养浩然正气",
  },
  {
    day: 3,
    title: "禅宗·明心",
    subtitle: "Buddhism - Clear Mind",
    icon: Leaf,
    morning: "行禅山间 · 寺院打坐",
    afternoon: "禅师开示 · 抄经静修",
    evening: "月下禅坐 · 观心法门",
    focus: "参禅悟道，明心见性",
  },
  {
    day: 4,
    title: "道法·养生",
    subtitle: "Taoism - Nourishment",
    icon: Sparkles,
    morning: "导引术 · 五禽戏",
    afternoon: "道医养生 · 自然疗愈",
    evening: "观星辟谷 · 吐纳调息",
    focus: "天人合一，顺应自然",
  },
  {
    day: 5,
    title: "民族·融合",
    subtitle: "Ethnic Culture - Integration",
    icon: Heart,
    morning: "白族扎染 · 彝族刺绣",
    afternoon: "纳西古乐 · 篝火晚会",
    evening: "民族故事 · 月光音乐会",
    focus: "体验云南多元民族文化智慧",
  },
  {
    day: 6,
    title: "自然·疗愈",
    subtitle: "Nature - Healing",
    icon: Star,
    morning: "森林浴 · 山泉冥想",
    afternoon: "艺术疗愈 · 香道体验",
    evening: "围炉夜话 · 分享感悟",
    focus: "融入自然，身心合一",
  },
  {
    day: 7,
    title: "圆满·新生",
    subtitle: "Completion - Rebirth",
    icon: Moon,
    morning: "日出祈福 · 金顶朝圣",
    afternoon: "结业仪式 · 心愿封存",
    evening: "告别晚宴 · 薪火相传",
    focus: "带着觉悟与祝福，重返生活",
  },
]

export function SevenDayJourney() {
  return (
    <section className="py-24 bg-gradient-to-b from-background to-muted/20">
      <div className="container px-4 mx-auto max-w-7xl">
        <div className="text-center mb-16">
          <div className="inline-block px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            七天愈修之旅
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-balance">身心灵的深度蜕变</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto text-pretty">
            融合儒释道三教智慧，结合云南民族文化，在鸡足山的灵山秀水中完成内在转化
          </p>
        </div>

        <div className="grid gap-6 md:gap-8">
          {journeySchedule.map((day, index) => {
            const Icon = day.icon
            return (
              <Card
                key={day.day}
                className="group hover:shadow-xl transition-all duration-300 overflow-hidden border-2 hover:border-primary/50"
              >
                <div className="p-6 md:p-8">
                  <div className="flex flex-col md:flex-row gap-6 md:gap-8">
                    {/* Day Number */}
                    <div className="flex-shrink-0">
                      <div className="relative">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-primary-foreground shadow-lg group-hover:scale-110 transition-transform">
                          <div className="text-center">
                            <div className="text-sm font-medium opacity-90">第</div>
                            <div className="text-2xl font-bold leading-none">{day.day}</div>
                            <div className="text-sm font-medium opacity-90">天</div>
                          </div>
                        </div>
                        <div className="absolute -right-2 -top-2 w-10 h-10 rounded-full bg-accent flex items-center justify-center shadow-md">
                          <Icon className="w-5 h-5 text-accent-foreground" />
                        </div>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 space-y-4">
                      <div>
                        <h3 className="text-2xl md:text-3xl font-bold mb-1 group-hover:text-primary transition-colors">
                          {day.title}
                        </h3>
                        <p className="text-sm text-muted-foreground font-medium">{day.subtitle}</p>
                      </div>

                      <div className="grid md:grid-cols-3 gap-4">
                        <div className="space-y-1">
                          <div className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                            晨 · 06:00-12:00
                          </div>
                          <div className="text-sm">{day.morning}</div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs font-semibold text-orange-600 dark:text-orange-400">
                            午 · 13:00-18:00
                          </div>
                          <div className="text-sm">{day.afternoon}</div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                            暮 · 19:00-21:00
                          </div>
                          <div className="text-sm">{day.evening}</div>
                        </div>
                      </div>

                      <div className="flex items-start gap-2 pt-2 border-t">
                        <Heart className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-muted-foreground italic">{day.focus}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>

        {/* Summary */}
        <div className="mt-12 text-center">
          <Card className="inline-block p-6 bg-gradient-to-r from-primary/5 to-accent/5">
            <p className="text-lg font-medium text-balance max-w-3xl">
              七天时间，从身到心，从心到灵。在鸡足山的加持下，让儒家的正气、佛家的慈悲、道家的自然与民族智慧融入生命，开启全新的人生篇章。
            </p>
          </Card>
        </div>
      </div>
    </section>
  )
}
