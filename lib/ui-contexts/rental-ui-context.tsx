/**
 * 租赁 UI Context
 * 
 * 职责：
 * - 为设备租赁相关页面提供独立的 UI 上下文
 * - 禁止使用 Facts 页面卡片样式
 * - 禁止使用事实时间线组件
 * 
 * 使用场景：
 * - /equipment-rental
 * - /admin/rental/contracts
 * - /admin/rental/usage-snapshots
 */

"use client"

import { createContext, useContext, ReactNode } from "react"

export interface RentalUIContextValue {
  /**
   * 是否在租赁 UI 上下文中
   */
  isRentalContext: true
  
  /**
   * 禁止使用 Facts 页面卡片样式
   */
  disableFactsCardStyle: true
  
  /**
   * 禁止使用事实时间线组件
   */
  disableFactsTimeline: true
}

const RentalUIContext = createContext<RentalUIContextValue | null>(null)

export interface RentalUIProviderProps {
  children: ReactNode
}

/**
 * 租赁 UI Provider
 * 
 * 为租赁相关页面提供独立的 UI 上下文
 */
export function RentalUIProvider({ children }: RentalUIProviderProps) {
  const value: RentalUIContextValue = {
    isRentalContext: true,
    disableFactsCardStyle: true,
    disableFactsTimeline: true,
  }
  
  return (
    <div data-rental-context="true">
      <RentalUIContext.Provider value={value}>
        {children}
      </RentalUIContext.Provider>
    </div>
  )
}

/**
 * 使用租赁 UI Context
 * 
 * 必须在 RentalUIProvider 内部使用
 */
export function useRentalUI(): RentalUIContextValue {
  const context = useContext(RentalUIContext)
  
  if (!context) {
    throw new Error("useRentalUI must be used within RentalUIProvider")
  }
  
  return context
}

/**
 * 检查是否在租赁 UI 上下文中
 * 
 * 不会抛出错误，如果不在上下文中返回 false
 */
export function useRentalUICheck(): boolean {
  const context = useContext(RentalUIContext)
  return context !== null
}
