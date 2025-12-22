import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Sparkles, Heart, Mountain } from "lucide-react"

const realms = [
  {
    title: "见自己",
    subtitle: "Self-Discovery",
    description: "探索内在，认识真实的自我",
    icon: Sparkles,
    color: "from-primary/20 to-primary/5",
    steps: [
      {
        title: "正念觉察",
        description: "呼吸冥想、行禅、内观练习",
        tags: ["禅宗", "道家"],
      },
      {
        title: "祖辈智慧",
        description: "儒家经典诵读、家族传承",
        tags: ["儒家"],
      },
      {
        title: "民俗仪式",
        description: "白族祭祀、彝族火塘文化",
        tags: ["云南民俗"],
      },
    ],
  },
  {
    title: "见众生",
    subtitle: "Compassion",
    description: "培养慈悲，连接他人与万物",
    icon: Heart,
    color: "from-accent/20 to-accent/5",
    steps: [
      {
        title: "慈悲心法",
        description: "慈心禅、施食法会、供养实践",
        tags: ["佛教"],
      },
      {
        title: "社区共修",
        description: "团体冥想、分享圆圈、互助行动",
        tags: ["禅宗"],
      },
      {
        title: "文旅互动",
        description: "参访古寺、茶马古道徒步",
        tags: ["云南文旅"],
      },
    ],
  },
  {
    title: "见天地",
    subtitle: "Oneness",
    description: "回归本源，体悟天人合一",
    icon: Mountain,
    color: "from-secondary/20 to-secondary/5",
    steps: [
      {
        title: "自然禅修",
        description: "金顶观日、森林浴、星空冥想",
        tags: ["道家"],
      },
      {
        title: "天人合一",
        description: "太极导引、八段锦、自然疗愈",
        tags: ["道家", "儒家"],
      },
      {
        title: "圆满回归",
        description: "感恩仪式、心愿寄存、归程祝福",
        tags: ["儒释道"],
      },
    ],
  },
]

export function ThreeRealms() {
  return (
    <section className="px-6 py-8">
      <div className="mx-auto max-w-4xl space-y-8">
        {/* 卷轴式流水线 */}
        {realms.map((realm, realmIndex) => {
          const Icon = realm.icon
          return (
            <div key={realmIndex} className="relative">
              {/* 连接线 */}
              {realmIndex < realms.length - 1 && (
                <div className="absolute left-8 top-full h-8 w-px bg-gradient-to-b from-border to-transparent" />
              )}

              <Card className={`overflow-hidden border-2 bg-gradient-to-br ${realm.color}`}>
                {/* 标题区域 */}
                <div className="border-b border-border/50 bg-background/50 p-6">
                  <div className="flex items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-background">
                      <Icon className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                      <h2 className="font-serif text-3xl font-light tracking-wide text-foreground">{realm.title}</h2>
                      <p className="mt-1 text-xs font-light uppercase tracking-widest text-muted-foreground">
                        {realm.subtitle}
                      </p>
                    </div>
                  </div>
                  <p className="mt-4 text-sm font-light text-muted-foreground">{realm.description}</p>
                </div>

                {/* 九步内容 */}
                <div className="divide-y divide-border/30 p-6">
                  {realm.steps.map((step, stepIndex) => (
                    <div key={stepIndex} className="py-6 first:pt-0 last:pb-0">
                      <div className="flex items-start gap-4">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border-2 border-primary bg-background font-serif text-sm font-light text-primary">
                          {realmIndex * 3 + stepIndex + 1}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-serif text-xl font-light tracking-wide text-foreground">{step.title}</h3>
                          <p className="mt-2 text-sm font-light leading-relaxed text-muted-foreground">
                            {step.description}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {step.tags.map((tag, tagIndex) => (
                              <Badge
                                key={tagIndex}
                                variant="outline"
                                className="border-primary/30 bg-background/50 font-light"
                              >
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )
        })}

        {/* 结束装饰 */}
        <div className="flex items-center justify-center py-8">
          <div className="h-px w-24 bg-gradient-to-r from-transparent via-border to-transparent" />
        </div>
      </div>
    </section>
  )
}
