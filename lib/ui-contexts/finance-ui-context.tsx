/**
 * 金融 UI Context
 * 
 * 职责：
 * - 为金融相关页面提供独立的 UI 上下文
 * - 禁止使用 Facts 页面卡片样式
 * - 禁止使用事实时间线组件
 * - 提供金融视图专用组件（合同区块、表格化结构、责任主体标签）
 * 
 * 使用场景：
 * - 金融视图页面
 * - 租赁合同金融信息展示
 * - 账单、发票、应收应付等金融数据展示
 */

"use client"

import { createContext, useContext, ReactNode } from "react"

export interface FinanceUIContextValue {
  /**
   * 是否在金融 UI 上下文中
   */
  isFinanceContext: true
  
  /**
   * 禁止使用 Facts 页面卡片样式
   */
  disableFactsCardStyle: true
  
  /**
   * 禁止使用事实时间线组件
   */
  disableFactsTimeline: true
  
  /**
   * 使用金融视图专用组件
   */
  useFinanceComponents: true
}

const FinanceUIContext = createContext<FinanceUIContextValue | null>(null)

export interface FinanceUIProviderProps {
  children: ReactNode
}

/**
 * 金融 UI Provider
 * 
 * 为金融相关页面提供独立的 UI 上下文
 */
export function FinanceUIProvider({ children }: FinanceUIProviderProps) {
  const value: FinanceUIContextValue = {
    isFinanceContext: true,
    disableFactsCardStyle: true,
    disableFactsTimeline: true,
    useFinanceComponents: true,
  }
  
  return (
    <div data-finance-context="true">
      <FinanceUIContext.Provider value={value}>
        {children}
      </FinanceUIContext.Provider>
    </div>
  )
}

/**
 * 使用金融 UI Context
 * 
 * 必须在 FinanceUIProvider 内部使用
 */
export function useFinanceUI(): FinanceUIContextValue {
  const context = useContext(FinanceUIContext)
  
  if (!context) {
    throw new Error("useFinanceUI must be used within FinanceUIProvider")
  }
  
  return context
}

/**
 * 检查是否在金融 UI 上下文中
 * 
 * 不会抛出错误，如果不在上下文中返回 false
 */
export function useFinanceUICheck(): boolean {
  const context = useContext(FinanceUIContext)
  return context !== null
}
