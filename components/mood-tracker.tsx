"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Smile, Meh, Frown, Heart, Coffee, Moon } from "lucide-react"
import { useState } from "react"

const moods = [
  { icon: Smile, label: "很好", color: "text-primary hover:bg-primary/10" },
  { icon: Heart, label: "开心", color: "text-secondary hover:bg-secondary/10" },
  { icon: Coffee, label: "平静", color: "text-accent hover:bg-accent/10" },
  { icon: Meh, label: "一般", color: "text-muted-foreground hover:bg-muted" },
  { icon: Frown, label: "低落", color: "text-chart-4 hover:bg-chart-4/10" },
  { icon: Moon, label: "疲惫", color: "text-chart-5 hover:bg-chart-5/10" },
]

export function MoodTracker() {
  const [selectedMood, setSelectedMood] = useState<number | null>(null)

  return (
    <section id="mood" className="py-20 px-4 bg-muted/30">
      <div className="container mx-auto max-w-6xl">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <Card className="p-8 shadow-xl order-2 lg:order-1">
            <div className="space-y-6">
              <div>
                <h3 className="text-2xl font-semibold mb-2">今天的心情如何？</h3>
                <p className="text-muted-foreground leading-relaxed">选择一个最符合你当前状态的表情</p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                {moods.map((mood, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedMood(index)}
                    className={`p-6 rounded-2xl border-2 transition-all duration-300 ${
                      selectedMood === index
                        ? "border-primary bg-primary/5 scale-105"
                        : "border-border hover:border-primary/50"
                    } ${mood.color}`}
                  >
                    <mood.icon className="w-10 h-10 mx-auto mb-2" />
                    <p className="text-sm font-medium text-center">{mood.label}</p>
                  </button>
                ))}
              </div>

              {selectedMood !== null && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="p-4 bg-accent/10 rounded-xl">
                    <p className="text-sm text-accent-foreground leading-relaxed">
                      💡 AI建议：根据你的情绪，推荐你尝试5分钟的正念呼吸练习，帮助调节心情。
                    </p>
                  </div>
                  <Button className="w-full rounded-full">记录今日心情</Button>
                </div>
              )}

              <div className="pt-4 border-t border-border">
                <h4 className="font-semibold mb-3">本周情绪趋势</h4>
                <div className="h-32 flex items-end gap-2">
                  {[60, 75, 55, 80, 70, 65, 85].map((height, index) => (
                    <div key={index} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className="w-full bg-primary/20 rounded-t-lg transition-all hover:bg-primary/30"
                        style={{ height: `${height}%` }}
                      />
                      <span className="text-xs text-muted-foreground">
                        {["一", "二", "三", "四", "五", "六", "日"][index]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          <div className="space-y-6 order-1 lg:order-2">
            <h2 className="text-4xl md:text-5xl font-bold text-balance">了解你的情绪规律</h2>

            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p className="text-lg">通过每日记录和AI分析，帮助你：</p>
              <ul className="space-y-3 ml-4">
                <li className="flex items-start gap-3">
                  <span className="text-primary mt-1 text-xl">📊</span>
                  <span>可视化情绪变化趋势，发现影响因素</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary mt-1 text-xl">🎯</span>
                  <span>识别触发情绪波动的特定事件</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary mt-1 text-xl">💪</span>
                  <span>培养情绪管理能力，建立健康应对机制</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary mt-1 text-xl">🌱</span>
                  <span>见证自己的成长和进步</span>
                </li>
              </ul>
              <div className="p-6 bg-secondary/10 rounded-2xl mt-6">
                <p className="text-secondary-foreground font-medium mb-2">💡 科学依据</p>
                <p className="text-sm">
                  研究表明，情绪日记能有效提升自我觉察能力，降低焦虑和抑郁水平。坚持21天，你会看到明显变化！
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
