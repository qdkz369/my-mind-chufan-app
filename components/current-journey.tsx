import { Card } from "@/components/ui/card"
import { CheckCircle2, Circle } from "lucide-react"

const journeyPhases = [
  {
    phase: "第一阶段",
    title: "见自己",
    subtitle: "觉察与内观",
    days: "第1-3天",
    completed: false,
  },
  {
    phase: "第二阶段",
    title: "见众生",
    subtitle: "慈悲与连接",
    days: "第4-5天",
    completed: false,
  },
  {
    phase: "第三阶段",
    title: "见天地",
    subtitle: "圆融与合一",
    days: "第6-7天",
    completed: false,
  },
]

export function CurrentJourney() {
  return (
    <section className="px-6 py-16">
      <div className="mx-auto max-w-4xl">
        <h2 className="mb-2 font-serif text-3xl font-light tracking-wide text-foreground">当前旅程</h2>
        <p className="mb-12 text-sm text-muted-foreground">鸡足山七天禅修 · 三阶九步</p>

        <div className="relative space-y-6">
          {/* 连接线 */}
          <div className="absolute left-4 top-8 h-[calc(100%-4rem)] w-px bg-border" />

          {journeyPhases.map((item, index) => (
            <Card
              key={index}
              className="relative ml-12 border-l-4 border-l-primary bg-card p-6 transition-all hover:shadow-md"
            >
              <div className="absolute -left-14 top-6">
                {item.completed ? (
                  <CheckCircle2 className="h-8 w-8 text-primary" />
                ) : (
                  <Circle className="h-8 w-8 text-muted-foreground" />
                )}
              </div>

              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-light text-muted-foreground">{item.phase}</p>
                  <h3 className="mt-1 font-serif text-2xl font-light tracking-wide text-foreground">{item.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{item.subtitle}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-light text-muted-foreground">{item.days}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
