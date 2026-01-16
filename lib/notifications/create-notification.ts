/**
 * 通知创建工具函数
 * 用于在订单状态变更等场景自动创建通知
 */

import { createClient } from "@supabase/supabase-js"

interface CreateNotificationParams {
  restaurant_id: string
  user_id?: string
  title: string
  content: string
  type?: string
  category?: string
  related_order_id?: string
  related_entity_type?: string
  related_entity_id?: string
  priority?: string
  action_url?: string
  action_label?: string
  sender_type?: string
  sender_id?: string
  sender_name?: string
}

/**
 * 创建通知（非阻断，失败不影响主流程）
 */
export async function createNotification(
  params: CreateNotificationParams
): Promise<void> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    const keyToUse = serviceRoleKey || anonKey
    
    if (!supabaseUrl || !keyToUse) {
      console.warn("[通知创建] Supabase配置缺失，跳过通知创建")
      return
    }

    const supabaseClient = createClient(supabaseUrl, keyToUse, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })

    const {
      restaurant_id,
      user_id,
      title,
      content,
      type = "system",
      category,
      related_order_id,
      related_entity_type,
      related_entity_id,
      priority = "normal",
      action_url,
      action_label,
      sender_type = "system",
      sender_id,
      sender_name,
    } = params

    if (!restaurant_id || !title || !content) {
      console.warn("[通知创建] 缺少必需参数，跳过通知创建")
      return
    }

    const { error } = await supabaseClient.from("notifications").insert({
      restaurant_id,
      user_id,
      title,
      content,
      type,
      category,
      related_order_id,
      related_entity_type,
      related_entity_id,
      priority,
      action_url,
      action_label,
      sender_type,
      sender_id,
      sender_name,
    })

    if (error) {
      console.error("[通知创建] 创建通知失败:", error)
      // 不抛出错误，避免影响主流程
    } else {
      console.log("[通知创建] 通知创建成功:", title)
    }
  } catch (error) {
    console.error("[通知创建] 创建通知异常:", error)
    // 不抛出错误，避免影响主流程
  }
}

/**
 * 创建订单状态变更通知
 */
export async function createOrderStatusNotification(
  restaurantId: string,
  orderId: string,
  orderNumber: string,
  oldStatus: string,
  newStatus: string,
  orderType: "delivery" | "repair" | "rental" = "delivery"
): Promise<void> {
  const statusLabels: Record<string, string> = {
    pending: "待处理",
    accepted: "已接单",
    processing: "处理中",
    delivering: "配送中",
    completed: "已完成",
    cancelled: "已取消",
  }

  const oldLabel = statusLabels[oldStatus] || oldStatus
  const newLabel = statusLabels[newStatus] || newStatus

  const orderTypeLabels: Record<string, string> = {
    delivery: "配送订单",
    repair: "报修订单",
    rental: "租赁订单",
  }

  const orderTypeLabel = orderTypeLabels[orderType] || "订单"

  await createNotification({
    restaurant_id: restaurantId,
    title: `${orderTypeLabel}状态更新`,
    content: `您的${orderTypeLabel} ${orderNumber} 状态已从"${oldLabel}"变更为"${newLabel}"`,
    type: "order",
    category: "order_status",
    related_order_id: orderId,
    related_entity_type: orderType === "delivery" ? "delivery_order" : orderType === "repair" ? "repair_order" : "rental_order",
    related_entity_id: orderId,
    priority: newStatus === "completed" ? "high" : "normal",
    action_url: `/orders?id=${orderId}`,
    action_label: "查看订单",
  })
}
