/**
 * 离线同步 Hook
 * 监听网络状态，自动提交暂存的操作
 */

import { useEffect, useState, useCallback } from 'react'
import {
  getPendingOperations,
  submitAllPendingOperations,
  isOnline,
  getPendingOperationsCount,
} from '@/lib/offline-storage'
import { useToast } from '@/hooks/use-toast'

export function useOfflineSync() {
  const [isOnlineState, setIsOnlineState] = useState(true)
  const [pendingCount, setPendingCount] = useState(0)
  const [isSyncing, setIsSyncing] = useState(false)
  const { toast } = useToast()

  // 检查网络状态
  const checkNetworkStatus = useCallback(() => {
    const online = isOnline()
    setIsOnlineState(online)
    setPendingCount(getPendingOperationsCount())
    
    // 如果网络恢复且有暂存操作，自动提交
    if (online && getPendingOperationsCount() > 0 && !isSyncing) {
      handleSync()
    }
  }, [isSyncing])

  // 提交所有暂存操作
  const handleSync = useCallback(async () => {
    if (isSyncing) return
    
    setIsSyncing(true)
    const count = getPendingOperationsCount()
    
    if (count === 0) {
      setIsSyncing(false)
      return
    }

    // 显示同步开始提示
    const syncToast = toast({
      title: '正在同步暂存操作',
      description: `发现 ${count} 个暂存操作，正在提交...`,
      duration: 0, // 不自动关闭
    })

    try {
      const result = await submitAllPendingOperations((completed, total, current) => {
        // 更新进度
        syncToast.update({
          id: syncToast.id,
          title: '正在同步暂存操作',
          description: `进度: ${completed + 1}/${total}${current ? ` (${current.type})` : ''}`,
        })
      })

      // 关闭进度提示
      syncToast.dismiss()

      if (result.success > 0) {
        toast({
          title: '同步成功',
          description: `成功提交 ${result.success} 个操作${result.failed > 0 ? `，${result.failed} 个失败` : ''}`,
          variant: result.failed > 0 ? 'default' : 'default',
        })
      }

      if (result.failed > 0 && result.success === 0) {
        toast({
          title: '同步失败',
          description: `${result.failed} 个操作提交失败，请检查网络连接后重试`,
          variant: 'destructive',
        })
      }

      setPendingCount(getPendingOperationsCount())
    } catch (error: any) {
      syncToast.dismiss()
      toast({
        title: '同步出错',
        description: error.message || '同步过程中发生错误',
        variant: 'destructive',
      })
    } finally {
      setIsSyncing(false)
    }
  }, [isSyncing, toast])

  // 监听网络状态变化
  useEffect(() => {
    // 初始检查
    checkNetworkStatus()

    // 监听在线事件
    const handleOnline = () => {
      console.log('[离线同步] 网络已恢复')
      checkNetworkStatus()
    }

    // 监听离线事件
    const handleOffline = () => {
      console.log('[离线同步] 网络已断开')
      setIsOnlineState(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // 定期检查暂存操作数量（每30秒）
    const interval = setInterval(() => {
      setPendingCount(getPendingOperationsCount())
    }, 30000)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      clearInterval(interval)
    }
  }, [checkNetworkStatus])

  return {
    isOnline: isOnlineState,
    pendingCount,
    isSyncing,
    sync: handleSync,
    checkNetworkStatus,
  }
}

