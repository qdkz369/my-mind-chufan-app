"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Check, Calendar, Users, MapPin } from "lucide-react"

const includes = [
  "7天6夜全程食宿（禅意素食）",
  "专业导师团队全程陪伴",
  "鸡足山景区门票及导览",
  "所有课程材料与文化体验",
  "民族服饰体验与纪念品",
  "专属疗愈音乐与冥想指导",
  "结业证书与心愿封存",
  "往返大理机场接送服务",
]

export function BookingCTA() {
  return (
    <section className="py-24 bg-gradient-to-br from-primary/5 via-accent/5 to-primary/5">
      <div className="container px-4 mx-auto max-w-7xl">
        <div className="max-w-4xl mx-auto">
          <Card className="overflow-hidden shadow-2xl">
            <div className="bg-gradient-to-r from-primary to-primary/80 p-8 md:p-12 text-primary-foreground text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 text-balance">开启你的愈修之旅</h2>
              <p className="text-lg opacity-90 max-w-2xl mx-auto text-pretty">
                名额有限，每期仅接收20位学员，确保每个人都能得到充分的关注与指导
              </p>
            </div>

            <div className="p-8 md:p-12 space-y-8">
              {/* Price */}
              <div className="text-center pb-8 border-b">
                <div className="inline-block">
                  <div className="text-sm text-muted-foreground mb-2">七天愈修全包价</div>
                  <div className="flex items-end justify-center gap-2">
                    <span className="text-5xl md:text-6xl font-bold text-primary">¥12,800</span>
                    <span className="text-lg text-muted-foreground mb-2">/人</span>
                  </div>
                  <div className="text-sm text-muted-foreground mt-2">早鸟优惠：提前30天预订享9折优惠</div>
                </div>
              </div>

              {/* Includes */}
              <div>
                <h3 className="font-semibold text-lg mb-4 text-center">项目包含</h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  {includes.map((item, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                        <Check className="w-3 h-3 text-primary" />
                      </div>
                      <span className="text-sm">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Info Grid */}
              <div className="grid sm:grid-cols-3 gap-4 pt-4">
                <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
                  <Calendar className="w-5 h-5 text-primary flex-shrink-0" />
                  <div>
                    <div className="text-xs text-muted-foreground">开营时间</div>
                    <div className="text-sm font-semibold">每月第一周</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
                  <Users className="w-5 h-5 text-primary flex-shrink-0" />
                  <div>
                    <div className="text-xs text-muted-foreground">招募人数</div>
                    <div className="text-sm font-semibold">20人/期</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
                  <MapPin className="w-5 h-5 text-primary flex-shrink-0" />
                  <div>
                    <div className="text-xs text-muted-foreground">集合地点</div>
                    <div className="text-sm font-semibold">大理机场</div>
                  </div>
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Button size="lg" className="flex-1 text-lg h-14">
                  立即预订
                </Button>
                <Button size="lg" variant="outline" className="flex-1 text-lg h-14 bg-transparent">
                  咨询详情
                </Button>
              </div>

              <p className="text-center text-sm text-muted-foreground">支持全额退款保障（开营前7天）· 可转让名额</p>
            </div>
          </Card>

          {/* Additional Note */}
          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground max-w-2xl mx-auto text-pretty">
              我们相信，这不仅是一次旅行，更是一场生命的觉醒。如果你感到疲惫、迷茫或焦虑，如果你渴望内在的平静与力量，鸡足山七天愈修将为你打开一扇通往内心的门。
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
