"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Send, Loader2 } from "lucide-react"
import { logBusinessWarning } from "@/lib/utils/logger"

interface SendNotificationProps {
  restaurants?: Array<{ id: string; name: string }>
}

export function SendNotification({ restaurants = [] }: SendNotificationProps) {
  const [formData, setFormData] = useState({
    restaurant_id: "",
    title: "",
    content: "",
    type: "announcement",
    category: "admin_message",
    priority: "normal",
    action_url: "",
    action_label: "",
  })
  const [isSending, setIsSending] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSend = async () => {
    if (!formData.restaurant_id || !formData.title || !formData.content) {
      alert("请填写所有必填字段")
      return
    }

    setIsSending(true)
    setSuccess(false)

    try {
      const response = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurant_id: formData.restaurant_id,
          title: formData.title,
          content: formData.content,
          type: formData.type,
          category: formData.category,
          priority: formData.priority,
          action_url: formData.action_url || undefined,
          action_label: formData.action_label || undefined,
          sender_type: "admin",
        }),
      })

      const result = await response.json()
      if (result.success) {
        setSuccess(true)
        setFormData({
          restaurant_id: "",
          title: "",
          content: "",
          type: "announcement",
          category: "admin_message",
          priority: "normal",
          action_url: "",
          action_label: "",
        })
        setTimeout(() => setSuccess(false), 3000)
      } else {
        alert(result.error || "发送失败")
      }
    } catch (error) {
      logBusinessWarning('发送通知', '失败', error)
      alert("发送失败")
    } finally {
      setIsSending(false)
    }
  }

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white">发送通知</CardTitle>
        <CardDescription className="text-slate-400">
          向指定餐厅发送通知消息
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="text-slate-300">目标餐厅 *</Label>
          <Select
            value={formData.restaurant_id}
            onValueChange={(value) => setFormData({ ...formData, restaurant_id: value })}
          >
            <SelectTrigger className="bg-slate-800 border-slate-600 text-white mt-1">
              <SelectValue placeholder="选择餐厅" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-600">
              {restaurants.map((restaurant) => (
                <SelectItem key={restaurant.id} value={restaurant.id}>
                  {restaurant.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-slate-300">通知标题 *</Label>
          <Input
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="bg-slate-800 border-slate-600 text-white mt-1"
            placeholder="例如：订单状态更新"
          />
        </div>

        <div>
          <Label className="text-slate-300">通知内容 *</Label>
          <Textarea
            value={formData.content}
            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
            className="bg-slate-800 border-slate-600 text-white mt-1 min-h-[100px]"
            placeholder="输入通知详细内容..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-slate-300">通知类型</Label>
            <Select
              value={formData.type}
              onValueChange={(value) => setFormData({ ...formData, type: value })}
            >
              <SelectTrigger className="bg-slate-800 border-slate-600 text-white mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600">
                <SelectItem value="announcement">公告</SelectItem>
                <SelectItem value="alert">提醒</SelectItem>
                <SelectItem value="system">系统</SelectItem>
                <SelectItem value="order">订单</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-slate-300">优先级</Label>
            <Select
              value={formData.priority}
              onValueChange={(value) => setFormData({ ...formData, priority: value })}
            >
              <SelectTrigger className="bg-slate-800 border-slate-600 text-white mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600">
                <SelectItem value="low">低</SelectItem>
                <SelectItem value="normal">普通</SelectItem>
                <SelectItem value="high">高</SelectItem>
                <SelectItem value="urgent">紧急</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label className="text-slate-300">跳转链接（可选）</Label>
          <Input
            value={formData.action_url}
            onChange={(e) => setFormData({ ...formData, action_url: e.target.value })}
            className="bg-slate-800 border-slate-600 text-white mt-1"
            placeholder="例如：/orders?id=123"
          />
        </div>

        <div>
          <Label className="text-slate-300">操作按钮文字（可选）</Label>
          <Input
            value={formData.action_label}
            onChange={(e) => setFormData({ ...formData, action_label: e.target.value })}
            className="bg-slate-800 border-slate-600 text-white mt-1"
            placeholder="例如：查看订单"
          />
        </div>

        {success && (
          <div className="bg-green-500/20 text-green-400 border border-green-500/30 rounded-lg p-3 text-sm">
            通知发送成功！
          </div>
        )}

        <Button
          onClick={handleSend}
          disabled={isSending}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
        >
          {isSending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              发送中...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              发送通知
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
