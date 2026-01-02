/**
 * API客户端工具
 * 支持离线暂存和Toast提示
 */

import { addPendingOperation, isOnline } from '@/lib/offline-storage'
import { toast } from '@/hooks/use-toast'

export interface ApiRequestOptions {
  endpoint: string
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: any
  headers?: Record<string, string>
  showToast?: boolean // 是否显示Toast提示
  successMessage?: string // 成功提示消息
  errorMessage?: string // 错误提示消息
  operationType?: 'repair' | 'install' | 'delivery' | 'order' // 操作类型（用于离线暂存）
  enableOfflineStorage?: boolean // 是否启用离线暂存
}

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  fromCache?: boolean // 是否来自缓存
}

/**
 * 发送API请求（支持离线暂存）
 */
export async function apiRequest<T = any>(options: ApiRequestOptions): Promise<ApiResponse<T>> {
  const {
    endpoint,
    method = 'POST',
    body,
    headers = {},
    showToast = true,
    successMessage,
    errorMessage,
    operationType,
    enableOfflineStorage = true,
  } = options

  // 检查网络状态
  const online = isOnline()

  // 如果离线且启用了离线暂存，保存到本地
  if (!online && enableOfflineStorage && operationType && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    const pendingId = addPendingOperation({
      type: operationType,
      endpoint,
      method,
      body,
      headers,
    })

    if (showToast) {
      toast({
        title: '操作已暂存',
        description: '网络连接已断开，操作已保存到本地，网络恢复后将自动提交',
        variant: 'default',
      })
    }

    return {
      success: false,
      error: '网络连接已断开，操作已暂存',
      fromCache: true,
    }
  }

  // 在线状态，直接发送请求
  try {
    const response = await fetch(endpoint, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    const result = await response.json()

    if (!response.ok || result.error) {
      const errorMsg = result.error || errorMessage || '操作失败'
      
      if (showToast) {
        toast({
          title: '操作失败',
          description: errorMsg,
          variant: 'destructive',
        })
      }

      return {
        success: false,
        error: errorMsg,
      }
    }

    const successMsg = successMessage || result.message || '操作成功'
    
    if (showToast) {
      toast({
        title: '操作成功',
        description: successMsg,
        variant: 'default',
      })
    }

    return {
      success: true,
      data: result.data || result,
    }
  } catch (error: any) {
    const errorMsg = error.message || errorMessage || '网络错误，请检查连接'
    
    // 如果请求失败且启用了离线暂存，尝试保存到本地
    if (enableOfflineStorage && operationType && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      const pendingId = addPendingOperation({
        type: operationType,
        endpoint,
        method,
        body,
        headers,
      })

      if (showToast) {
        toast({
          title: '操作已暂存',
          description: '网络请求失败，操作已保存到本地，网络恢复后将自动提交',
          variant: 'default',
        })
      }

      return {
        success: false,
        error: '网络请求失败，操作已暂存',
        fromCache: true,
      }
    }

    if (showToast) {
      toast({
        title: '操作失败',
        description: errorMsg,
        variant: 'destructive',
      })
    }

    return {
      success: false,
      error: errorMsg,
    }
  }
}

