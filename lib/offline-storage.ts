/**
 * 离线暂存工具
 * 用于在网络断开时暂存操作，网络恢复后自动提交
 */

export interface PendingOperation {
  id: string // 唯一ID
  type: 'repair' | 'install' | 'delivery' | 'order' // 操作类型
  endpoint: string // API端点
  method: 'POST' | 'PUT' | 'PATCH' // HTTP方法
  body: any // 请求体
  headers?: Record<string, string> // 请求头
  timestamp: number // 创建时间
  retryCount: number // 重试次数
  lastError?: string // 最后一次错误信息
}

const STORAGE_KEY = 'worker_pending_operations'
const MAX_RETRY_COUNT = 3 // 最大重试次数

/**
 * 获取所有暂存的操作
 */
export function getPendingOperations(): PendingOperation[] {
  if (typeof window === 'undefined') return []
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return []
    return JSON.parse(stored) as PendingOperation[]
  } catch (error) {
    console.error('[离线暂存] 读取失败:', error)
    return []
  }
}

/**
 * 添加暂存操作
 */
export function addPendingOperation(operation: Omit<PendingOperation, 'id' | 'timestamp' | 'retryCount'>): string {
  if (typeof window === 'undefined') return ''
  
  const id = `pending_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  const pendingOperation: PendingOperation = {
    ...operation,
    id,
    timestamp: Date.now(),
    retryCount: 0,
  }
  
  const operations = getPendingOperations()
  operations.push(pendingOperation)
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(operations))
    console.log('[离线暂存] 已暂存操作:', id, operation.type)
    return id
  } catch (error) {
    console.error('[离线暂存] 保存失败:', error)
    return ''
  }
}

/**
 * 移除暂存操作
 */
export function removePendingOperation(id: string): void {
  if (typeof window === 'undefined') return
  
  const operations = getPendingOperations()
  const filtered = operations.filter(op => op.id !== id)
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
    console.log('[离线暂存] 已移除操作:', id)
  } catch (error) {
    console.error('[离线暂存] 移除失败:', error)
  }
}

/**
 * 更新暂存操作（增加重试次数，记录错误）
 */
export function updatePendingOperation(id: string, updates: Partial<PendingOperation>): void {
  if (typeof window === 'undefined') return
  
  const operations = getPendingOperations()
  const index = operations.findIndex(op => op.id === id)
  
  if (index === -1) return
  
  operations[index] = {
    ...operations[index],
    ...updates,
  }
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(operations))
  } catch (error) {
    console.error('[离线暂存] 更新失败:', error)
  }
}

/**
 * 检查网络状态
 */
export function isOnline(): boolean {
  if (typeof window === 'undefined') return true
  return navigator.onLine
}

/**
 * 提交暂存的操作
 */
export async function submitPendingOperation(operation: PendingOperation): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(operation.endpoint, {
      method: operation.method,
      headers: {
        'Content-Type': 'application/json',
        ...operation.headers,
      },
      body: JSON.stringify(operation.body),
    })
    
    const result = await response.json()
    
    if (!response.ok || result.error) {
      throw new Error(result.error || `HTTP ${response.status}`)
    }
    
    // 提交成功，移除暂存
    removePendingOperation(operation.id)
    return { success: true }
  } catch (error: any) {
    const errorMessage = error.message || '提交失败'
    
    // 更新重试次数和错误信息
    updatePendingOperation(operation.id, {
      retryCount: operation.retryCount + 1,
      lastError: errorMessage,
    })
    
    // 如果超过最大重试次数，移除该操作
    if (operation.retryCount + 1 >= MAX_RETRY_COUNT) {
      removePendingOperation(operation.id)
      console.warn('[离线暂存] 操作超过最大重试次数，已移除:', operation.id)
    }
    
    return { success: false, error: errorMessage }
  }
}

/**
 * 提交所有暂存的操作
 */
export async function submitAllPendingOperations(
  onProgress?: (completed: number, total: number, current?: PendingOperation) => void
): Promise<{ success: number; failed: number; total: number }> {
  const operations = getPendingOperations()
  if (operations.length === 0) {
    return { success: 0, failed: 0, total: 0 }
  }
  
  let successCount = 0
  let failedCount = 0
  
  // 按时间顺序提交（先提交最早的操作）
  const sortedOperations = [...operations].sort((a, b) => a.timestamp - b.timestamp)
  
  for (let i = 0; i < sortedOperations.length; i++) {
    const operation = sortedOperations[i]
    
    if (onProgress) {
      onProgress(i, sortedOperations.length, operation)
    }
    
    const result = await submitPendingOperation(operation)
    
    if (result.success) {
      successCount++
    } else {
      failedCount++
    }
    
    // 避免请求过快，添加小延迟
    if (i < sortedOperations.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }
  
  return {
    success: successCount,
    failed: failedCount,
    total: sortedOperations.length,
  }
}

/**
 * 清除所有暂存的操作
 */
export function clearAllPendingOperations(): void {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.removeItem(STORAGE_KEY)
    console.log('[离线暂存] 已清除所有暂存操作')
  } catch (error) {
    console.error('[离线暂存] 清除失败:', error)
  }
}

/**
 * 获取暂存操作数量
 */
export function getPendingOperationsCount(): number {
  return getPendingOperations().length
}

