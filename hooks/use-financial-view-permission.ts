/**
 * 金融视图权限检查 Hook（客户端）
 * 
 * 核心原则：
 * - 权限不足时不渲染、不请求 API
 * - 工人永远看不到金额
 * - 事实页面不会"闪一下钱"
 */

"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { canViewFinancialViewClient } from "@/lib/financial/permissions"

/**
 * 检查客户端用户是否有权限查看金融视图
 * 
 * 使用场景：
 * - 客户端页面（如设备页面）
 * - 通过 restaurantId 登录的用户
 * 
 * 返回：
 * - canView: 是否有权限查看金融视图
 * - isLoading: 是否正在检查权限
 */
export function useFinancialViewPermission() {
  const [canView, setCanView] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkPermission = async () => {
      try {
        setIsLoading(true)

        // 检查是否是管理员（通过 Supabase Auth）
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
          // 客户端用户（非管理员）默认不可见
          setCanView(false)
          setIsLoading(false)
          return
        }

        // 查询用户角色
        const { data: roleData, error: roleError } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .maybeSingle()

        if (roleError || !roleData) {
          // 无法获取角色，默认不可见
          setCanView(false)
          setIsLoading(false)
          return
        }

        const role = roleData.role

        // 检查权限
        const hasPermission = canViewFinancialViewClient(
          role === "super_admin" || role === "admin"
        )

        setCanView(hasPermission)
      } catch (error) {
        console.error("[金融视图权限检查] 错误:", error)
        // 出错时默认不可见（安全策略）
        setCanView(false)
      } finally {
        setIsLoading(false)
      }
    }

    checkPermission()
  }, [])

  return { canView, isLoading }
}
