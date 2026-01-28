"use client"

import { useState, useEffect } from "react"
import { Bell, Check, CheckCheck, Trash2, ExternalLink, Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { useRouter } from "next/navigation"
import { formatDistanceToNow } from "date-fns"

interface Notification {
  id: string
  title: string
  content: string
  type: string
  category: string
  is_read: boolean
  priority: string
  action_url?: string
  action_label?: string
  created_at: string
  related_order_id?: string
}

interface NotificationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  restaurantId: string | null
}

export function NotificationDialog({
  open,
  onOpenChange,
  restaurantId,
}: NotificationDialogProps) {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isMarkingRead, setIsMarkingRead] = useState(false)

  // 加载通知（容错处理，失败不影响页面）
  const loadNotifications = async () => {
    if (!restaurantId) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(
        `/api/notifications?restaurant_id=${restaurantId}&limit=50`
      )
      
      // 容错处理：即使响应不是 200，也尝试解析 JSON
      let result
      try {
        result = await response.json()
      } catch (parseError) {
        console.warn("[通知] 解析响应失败（容错处理）:", parseError)
        setNotifications([])
        setUnreadCount(0)
        setIsLoading(false)
        return
      }

      if (result.success) {
        setNotifications(result.data || [])
        setUnreadCount(result.unread_count || 0)
      } else {
        // 如果返回错误，设置为空数组，不阻断页面
        setNotifications([])
        setUnreadCount(0)
      }
    } catch (error) {
      // 容错处理：任何错误都不影响页面，只记录警告
      console.warn("[通知] 加载失败（容错处理，不影响页面）:", error)
      setNotifications([])
      setUnreadCount(0)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (open && restaurantId) {
      loadNotifications()
    }
  }, [open, restaurantId])

  // 定期刷新未读数量
  useEffect(() => {
    if (!restaurantId) return

    const interval = setInterval(() => {
      fetch(`/api/notifications?restaurant_id=${restaurantId}&unread_only=true&limit=1`)
        .then((res) => {
          // 容错处理：即使响应不是 200，也尝试解析
          return res.json().catch(() => ({ success: false, unread_count: 0 }))
        })
        .then((result) => {
          if (result.success) {
            setUnreadCount(result.unread_count || 0)
          }
        })
        .catch((error) => {
          // 容错处理：任何错误都不影响页面
          console.warn("[通知] 刷新未读数量失败（容错处理）:", error)
        })
    }, 30000) // 每30秒刷新一次

    return () => clearInterval(interval)
  }, [restaurantId])

  // 标记为已读
  const handleMarkAsRead = async (id: string) => {
    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_read: true }),
      })

      if (response.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
        )
        setUnreadCount((prev) => Math.max(0, prev - 1))
      }
    } catch (error) {
      console.error("[通知] 标记已读失败:", error)
    }
  }

  // 全部标记为已读
  const handleMarkAllAsRead = async () => {
    if (!restaurantId) return

    setIsMarkingRead(true)
    try {
      const response = await fetch("/api/notifications/mark-all-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurant_id: restaurantId }),
      })

      if (response.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
        setUnreadCount(0)
      }
    } catch (error) {
      console.error("[通知] 全部标记已读失败:", error)
    } finally {
      setIsMarkingRead(false)
    }
  }

  // 删除通知
  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setNotifications((prev) => prev.filter((n) => n.id !== id))
        // 如果删除的是未读通知，更新未读数量
        const deleted = notifications.find((n) => n.id === id)
        if (deleted && !deleted.is_read) {
          setUnreadCount((prev) => Math.max(0, prev - 1))
        }
      }
    } catch (error) {
      console.error("[通知] 删除失败:", error)
    }
  }

  // 点击通知
  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      handleMarkAsRead(notification.id)
    }

    if (notification.action_url) {
      onOpenChange(false)
      router.push(notification.action_url)
    }
  }

  // 获取优先级颜色
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-500/20 text-red-400 border-red-500/30"
      case "high":
        return "bg-orange-500/20 text-orange-400 border-orange-500/30"
      case "normal":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30"
      case "low":
        return "bg-slate-500/20 text-slate-400 border-slate-500/30"
      default:
        return "bg-blue-500/20 text-blue-400 border-blue-500/30"
    }
  }

  // 获取类型图标
  const getTypeIcon = (type: string) => {
    switch (type) {
      case "order":
        return "📦"
      case "system":
        return "⚙️"
      case "alert":
        return "⚠️"
      case "announcement":
        return "📢"
      default:
        return "🔔"
    }
  }

  const unreadNotifications = notifications.filter((n) => !n.is_read)
  const readNotifications = notifications.filter((n) => n.is_read)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-bold text-white">通知</DialogTitle>
              <DialogDescription className="text-slate-400">
                {unreadCount > 0 ? `${unreadCount} 条未读消息` : "暂无未读消息"}
              </DialogDescription>
            </div>
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkAllAsRead}
                disabled={isMarkingRead}
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                {isMarkingRead ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <CheckCheck className="h-4 w-4 mr-2" />
                )}
                全部已读
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
              <span className="ml-2 text-slate-400">加载中...</span>
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>暂无通知</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* 未读通知 */}
              {unreadNotifications.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-400 mb-2">未读</h3>
                  <div className="space-y-2">
                    {unreadNotifications.map((notification) => (
                      <Card
                        key={notification.id}
                        semanticLevel="action"
                        className={`bg-slate-800/50 border-slate-700 p-4 hover:border-blue-500/50 cursor-pointer transition-colors ${
                          notification.priority === "urgent" ? "border-red-500/50" : ""
                        }`}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1">
                            <div className="text-2xl">{getTypeIcon(notification.type)}</div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-white font-medium">{notification.title}</span>
                                {notification.priority && (
                                  <Badge className={getPriorityColor(notification.priority)}>
                                    {notification.priority}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-slate-400 mb-2">{notification.content}</p>
                              <div className="flex items-center gap-4 text-xs text-slate-500">
                                <span>
                                  {formatDistanceToNow(new Date(notification.created_at), {
                                    addSuffix: true,
                                  })}
                                </span>
                                {notification.action_url && (
                                  <span className="flex items-center gap-1 text-blue-400">
                                    <ExternalLink className="h-3 w-3" />
                                    查看详情
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleMarkAsRead(notification.id)
                              }}
                              className="h-8 w-8 p-0 text-slate-400 hover:text-white"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDelete(notification.id)
                              }}
                              className="h-8 w-8 p-0 text-slate-400 hover:text-red-400"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* 已读通知 */}
              {readNotifications.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-400 mb-2">已读</h3>
                  <div className="space-y-2">
                    {readNotifications.map((notification) => (
                      <Card
                        key={notification.id}
                        semanticLevel="action"
                        className="bg-slate-800/30 border-slate-700/50 p-4 hover:border-slate-600 cursor-pointer transition-colors opacity-70"
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1">
                            <div className="text-2xl opacity-50">
                              {getTypeIcon(notification.type)}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-white font-medium">{notification.title}</span>
                              </div>
                              <p className="text-sm text-slate-500 mb-2">{notification.content}</p>
                              <div className="flex items-center gap-4 text-xs text-slate-600">
                                <span>
                                  {formatDistanceToNow(new Date(notification.created_at), {
                                    addSuffix: true,
                                  })}
                                </span>
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDelete(notification.id)
                            }}
                            className="h-8 w-8 p-0 text-slate-500 hover:text-red-400"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
