"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

const roomTypes = [
  {
    id: "single",
    name: "静心单人房",
    price: "¥3,800",
    description: "独立空间，适合深度内观",
  },
  {
    id: "double",
    name: "同修双人房",
    price: "¥2,800",
    description: "共享空间，相互鼓励",
  },
  {
    id: "suite",
    name: "禅意套房",
    price: "¥5,800",
    description: "山景套房，私人茶室",
  },
]

export function BookingWidget() {
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [selectedRoom, setSelectedRoom] = useState("single")

  return (
    <section className="px-6 py-8">
      <div className="mx-auto max-w-4xl">
        <h2 className="mb-6 font-serif text-2xl font-light tracking-wide text-foreground">预约禅修</h2>

        <Card className="p-6">
          <div className="space-y-6">
            {/* 日期选择 */}
            <div>
              <Label className="mb-3 block font-light">选择开始日期</Label>
              <Calendar mode="single" selected={date} onSelect={setDate} className="rounded-md border" />
            </div>

            {/* 房型选择 */}
            <div>
              <Label className="mb-3 block font-light">选择房型</Label>
              <RadioGroup value={selectedRoom} onValueChange={setSelectedRoom}>
                <div className="space-y-3">
                  {roomTypes.map((room) => (
                    <div
                      key={room.id}
                      className="flex items-center space-x-3 rounded-lg border border-border p-4 transition-colors hover:bg-accent/5"
                    >
                      <RadioGroupItem value={room.id} id={room.id} />
                      <Label htmlFor={room.id} className="flex flex-1 cursor-pointer items-center justify-between">
                        <div>
                          <p className="font-light text-foreground">{room.name}</p>
                          <p className="text-xs font-light text-muted-foreground">{room.description}</p>
                        </div>
                        <p className="font-serif text-lg font-light text-primary">{room.price}</p>
                      </Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            </div>

            {/* 价格说明 */}
            <div className="rounded-lg bg-muted/50 p-4">
              <p className="mb-2 text-xs font-light text-muted-foreground">费用包含</p>
              <ul className="space-y-1 text-sm font-light text-foreground">
                <li>• 七天六夜住宿</li>
                <li>• 素食禅意餐饮</li>
                <li>• 全程课程指导</li>
                <li>• 文旅体验活动</li>
                <li>• 禅修用品礼包</li>
              </ul>
            </div>

            <Button size="lg" className="w-full">
              立即预约
            </Button>
          </div>
        </Card>
      </div>
    </section>
  )
}
