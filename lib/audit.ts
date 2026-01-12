/**
 * 审计日志写入函数
 * 阶段 2B-4：权限与审计正式收口
 * 
 * 核心原则：所有关键状态变更必须有审计日志
 */

import { supabaseServer } from '@/lib/supabase/server'

export interface AuditLogParams {
  actor_id: string | null // 操作者ID（用户ID或工人ID，可为null）
  action: string // 操作类型（如 ORDER_ACCEPT, ORDER_DISPATCH, ORDER_COMPLETE）
  target_type?: string // 目标类型（如 delivery_order, repair_order）
  target_id?: string | null // 目标ID（如订单ID，可为null）
  metadata?: any // 额外元数据（JSON格式，可存储任意结构化数据）
}

/**
 * 写入审计日志
 * 
 * @param params 审计日志参数
 * @returns Promise<void>
 * 
 * @throws 如果写入失败会记录错误日志，但不抛出异常（避免影响主流程）
 */
export async function writeAuditLog(params: AuditLogParams): Promise<void> {
  try {
    const supabase = await supabaseServer()

    const { error } = await supabase.from('audit_logs').insert({
      actor_id: params.actor_id || null,
      action: params.action,
      target_type: params.target_type || null,
      target_id: params.target_id || null,
      metadata: params.metadata || null,
      created_at: new Date().toISOString(),
    })

    if (error) {
      // 审计日志写入失败不影响主流程，只记录错误日志
      console.error('[writeAuditLog] 写入审计日志失败:', error)
      console.error('[writeAuditLog] 审计日志参数:', params)
    } else {
      console.log(`[writeAuditLog] 审计日志已写入: ${params.action} -> ${params.target_type}:${params.target_id}`)
    }
  } catch (error) {
    // 捕获所有异常，不影响主流程
    console.error('[writeAuditLog] 写入审计日志异常:', error)
    console.error('[writeAuditLog] 审计日志参数:', params)
  }
}
