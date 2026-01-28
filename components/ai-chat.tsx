"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar } from "@/components/ui/avatar"
import { Send, Sparkles } from "lucide-react"
import { useState } from "react"

export function AIChat() {
  const [message, setMessage] = useState("")
  const [messages, setMessages] = useState([
    {
      role: "ai",
      content: "你好！我是你的AI心灵伙伴。无论你感到焦虑、压力或只是想聊聊天，我都在这里陪伴你。今天感觉怎么样？",
    },
  ])

  const handleSend = () => {
    if (!message.trim()) return

    setMessages([...messages, { role: "user", content: message }])
    setMessage("")

    // 模拟AI回复
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          content: "我理解你的感受。让我们一起来探索这些情绪背后的原因，找到应对的方法。你愿意跟我分享更多吗？",
        },
      ])
    }, 1000)
  }

  return (
    <section id="ai-chat" className="py-20 px-4">
      <div className="container mx-auto max-w-6xl">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-accent/30 rounded-full text-sm text-accent-foreground">
              <Sparkles className="w-4 h-4" />
              <span>AI技术驱动</span>
            </div>

            <h2 className="text-4xl md:text-5xl font-bold text-balance">你的24/7心灵伙伴</h2>

            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p className="text-lg">基于先进的自然语言处理和认知行为疗法（CBT）原理，我们的AI能够：</p>
              <ul className="space-y-2 ml-4">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>识别和理解你的情绪状态</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>提供个性化的应对策略和建议</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>引导你进行深度自我探索</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>在任何时候提供情感支持</span>
                </li>
              </ul>
              <p className="text-sm italic pt-2">注：AI陪伴不能替代专业心理咨询，如有严重心理问题请寻求专业帮助</p>
            </div>
          </div>

          <Card semanticLevel="action" className="p-6 shadow-xl">
            <div className="space-y-4">
              <div className="h-[400px] overflow-y-auto space-y-4 mb-4 pr-2">
                {messages.map((msg, index) => (
                  <div key={index} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                    <Avatar
                      className={`w-10 h-10 flex items-center justify-center ${msg.role === "ai" ? "bg-primary" : "bg-secondary"}`}
                    >
                      {msg.role === "ai" ? (
                        <Sparkles className="w-5 h-5 text-primary-foreground" />
                      ) : (
                        <span className="text-secondary-foreground font-semibold">你</span>
                      )}
                    </Avatar>
                    <div
                      className={`flex-1 p-4 rounded-2xl ${msg.role === "ai" ? "bg-muted" : "bg-primary text-primary-foreground"}`}
                    >
                      <p className="leading-relaxed">{msg.content}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder="分享你的感受..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSend()}
                  className="rounded-full"
                />
                <Button size="icon" onClick={handleSend} className="rounded-full shrink-0">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </section>
  )
}
