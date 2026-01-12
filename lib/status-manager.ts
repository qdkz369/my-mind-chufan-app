/**
 * 统一状态流管理
 * 定义状态流转规则、验证状态变更、记录变更历史
 */

/**
 * 状态流转规则定义
 */
export const STATUS_TRANSITIONS: Record<string, Record<string, string[]>> = {
  rental_orders: {
    pending: ["confirmed", "cancelled"],
    confirmed: ["active", "cancelled"],
    active: ["completed", "cancelled"],
    completed: [], // 终态，不允许再变更
    cancelled: [], // 终态，不允许再变更
  },
  repairs: {
    pending: ["processing", "cancelled"],
    processing: ["completed", "cancelled"],
    completed: [], // 终态
    cancelled: [], // 终态
  },
  equipment_catalog: {
    pending: ["approved", "rejected"],
    approved: ["active", "inactive"],
    rejected: ["pending"], // 可以重新提交
    active: ["inactive"],
    inactive: ["active"],
  },
}

/**
 * 验证状态流转是否合法
 * @param table 表名
 * @param currentStatus 当前状态
 * @param newStatus 新状态
 * @returns 是否允许此状态变更
 */
export function validateStatusTransition(
  table: string,
  currentStatus: string,
  newStatus: string
): { valid: boolean; reason?: string } {
  const transitions = STATUS_TRANSITIONS[table]

  if (!transitions) {
    return {
      valid: false,
      reason: `表 ${table} 没有定义状态流转规则`,
    }
  }

  if (currentStatus === newStatus) {
    return {
      valid: true, // 允许保持相同状态
    }
  }

  const allowedStatuses = transitions[currentStatus]

  if (!allowedStatuses) {
    return {
      valid: false,
      reason: `当前状态 ${currentStatus} 没有定义允许的流转状态`,
    }
  }

  if (!allowedStatuses.includes(newStatus)) {
    return {
      valid: false,
      reason: `不允许从 ${currentStatus} 直接变更为 ${newStatus}。允许的状态：${allowedStatuses.join(", ")}`,
    }
  }

  return {
    valid: true,
  }
}

/**
 * 获取状态的所有可能的下一个状态
 */
export function getNextPossibleStatuses(
  table: string,
  currentStatus: string
): string[] {
  const transitions = STATUS_TRANSITIONS[table]
  if (!transitions) return []
  return transitions[currentStatus] || []
}

/**
 * 检查状态是否为终态（不允许再变更）
 */
export function isTerminalStatus(table: string, status: string): boolean {
  const transitions = STATUS_TRANSITIONS[table]
  if (!transitions) return false
  const allowedStatuses = transitions[status]
  return allowedStatuses?.length === 0
}

/**
 * 状态变更日志接口
 */
export interface StatusChangeLog {
  id?: string
  table_name: string
  record_id: string
  old_status: string
  new_status: string
  changed_by: string
  changed_at: Date
  reason?: string
  metadata?: Record<string, any>
}

/**
 * 记录状态变更日志
 */
export async function logStatusChange(
  log: Omit<StatusChangeLog, "id" | "changed_at">
): Promise<void> {
  try {
    const { createClient } = await import("@supabase/supabase-js")
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || (!serviceRoleKey && !anonKey)) {
      console.warn("[状态管理] Supabase URL 或密钥未配置，跳过日志记录")
      return
    }

    const supabaseClient = createClient(
      supabaseUrl,
      serviceRoleKey || anonKey!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    )

    // 插入状态变更日志
    const { error } = await supabaseClient
      .from("status_change_logs")
      .insert({
        table_name: log.table_name,
        record_id: log.record_id,
        old_status: log.old_status,
        new_status: log.new_status,
        changed_by: log.changed_by,
        reason: log.reason || null,
        metadata: log.metadata || null,
      })

    if (error) {
      console.error("[状态管理] 记录状态变更日志失败:", error)
    } else {
      console.log("[状态管理] 状态变更日志已记录:", {
        table: log.table_name,
        record_id: log.record_id,
        from: log.old_status,
        to: log.new_status,
      })
    }
  } catch (error) {
    console.error("[状态管理] 记录状态变更日志异常:", error)
  }
}

