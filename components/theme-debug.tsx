"use client"

import { useEffect, useRef, useState, useMemo } from 'react'
import { useTheme } from '@/lib/styles/theme-context'
import { Card } from '@/components/ui/card'
import { BASE_THEME_NAME, SWITCHABLE_VISUAL_THEMES, VisualThemeName } from '@/lib/styles/themes'
import { calculateThemeDiff, formatDiffList } from '@/lib/styles/theme-diff-utils'
import { shouldRenderDebug, markDebugClosedInSession } from '@/lib/utils/debug-env'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'

/**
 * 主题调试组件
 * 
 * 在运行时打印：
 * 1. 当前激活的 theme 名称
 * 2. defaultTheme 的某个 token 当前值
 * 3. Card 实际渲染后的 computed style（背景色、阴影）
 * 
 * 渲染条件（环境隔离）：
 * - NODE_ENV === 'development' 或 localStorage.debug === 'true'
 * - 生产环境强制移除
 * 
 * ⚠️ 重要：
 * - 禁止使用 fixed / overlay 默认渲染
 * - 组件应在父容器中通过条件渲染控制显示
 * - 100% 防御式渲染：任何字段为 undefined 时只显示占位符
 * - 禁止在 Debug 中对任何 theme / state 字段直接调用 string 方法（如 replace、toUpperCase）
 */

/**
 * 防御式渲染：安全获取字符串值
 * 
 * ⚠️ 禁止直接调用 string 方法（如 replace、toUpperCase）
 * 如果值为 undefined/null，返回占位符
 */
function safeString(value: unknown): string {
  if (value === null || value === undefined) {
    return '[未定义]'
  }
  if (typeof value === 'string') {
    return value
  }
  return String(value)
}

/**
 * 防御式渲染：安全获取数组长度
 */
function safeArrayLength(value: unknown[] | null | undefined): number {
  if (!value || !Array.isArray(value)) {
    return 0
  }
  return value.length
}

export function ThemeDebug() {
  const { theme, themeConfig } = useTheme()
  const cardRef = useRef<HTMLDivElement>(null)
  const [shouldRender, setShouldRender] = useState(false)
  const [computedStyles, setComputedStyles] = useState<{
    backgroundColor: string
    boxShadow: string
    borderRadius: string
    border: string
  } | null>(null)

  // 防御式获取 theme 值
  const safeTheme = theme ?? '[未定义]'
  
  // 判断是否为基于 Design Baseline 的主题（防御式）
  const isBaseDerived = safeTheme !== BASE_THEME_NAME && 
    typeof safeTheme === 'string' &&
    SWITCHABLE_VISUAL_THEMES.includes(safeTheme as VisualThemeName)

  // 计算与 Design Baseline 的差异（防御式）
  const themeDiff = useMemo(() => {
    if (!isBaseDerived || !themeConfig) {
      return null
    }
    try {
      if (!themeConfig.tokens) {
        return null
      }
      return calculateThemeDiff(themeConfig.tokens)
    } catch (error) {
      console.warn('[ThemeDebug] 计算主题差异失败:', error)
      return null
    }
  }, [isBaseDerived, themeConfig])

  // 格式化差异列表（防御式）
  const diffList = useMemo(() => {
    if (!themeDiff) {
      return []
    }
    try {
      const list = formatDiffList(themeDiff)
      return Array.isArray(list) ? list : []
    } catch (error) {
      console.warn('[ThemeDebug] 格式化差异列表失败:', error)
      return []
    }
  }, [themeDiff])

  // 检查是否应该渲染（使用统一的环境检查）
  useEffect(() => {
    if (typeof window === 'undefined') {
      setShouldRender(false)
      return
    }
    
    const checkShouldRender = () => {
      try {
        setShouldRender(shouldRenderDebug())
      } catch (error) {
        console.warn('[ThemeDebug] 检查渲染条件失败:', error)
        setShouldRender(false)
      }
    }
    
    // 初始检查
    checkShouldRender()
    
    // 监听 localStorage 变化（用于 debug 标志）
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'debug') {
        checkShouldRender()
      }
    }
    
    window.addEventListener('storage', handleStorageChange)
    
    // 监听自定义事件（用于动态启用）
    const handleDebugEnabled = () => {
      checkShouldRender()
    }
    
    window.addEventListener('debug_enabled', handleDebugEnabled)
    
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('debug_enabled', handleDebugEnabled)
    }
  }, [])

  // 处理关闭按钮点击
  const handleClose = () => {
    try {
      markDebugClosedInSession()
      setShouldRender(false)
    } catch (error) {
      console.warn('[ThemeDebug] 关闭失败:', error)
      setShouldRender(false)
    }
  }

  // 获取 CSS 变量值（防御式）
  const getCSSVariable = (varName: string): string => {
    if (typeof window === 'undefined') return '[服务器端]'
    try {
      const value = getComputedStyle(document.documentElement).getPropertyValue(varName).trim()
      return value || '[未定义]'
    } catch (error) {
      console.warn('[ThemeDebug] 获取 CSS 变量失败:', varName, error)
      return '[获取失败]'
    }
  }

  // 获取 Card 的 computed style（防御式）
  useEffect(() => {
    if (!cardRef.current) {
      return
    }
    
    try {
      const styles = window.getComputedStyle(cardRef.current)
      setComputedStyles({
        backgroundColor: styles.backgroundColor || '[未定义]',
        boxShadow: styles.boxShadow || '[未定义]',
        borderRadius: styles.borderRadius || '[未定义]',
        border: styles.border || '[未定义]',
      })
    } catch (error) {
      console.warn('[ThemeDebug] 获取 computed style 失败:', error)
      setComputedStyles({
        backgroundColor: '[获取失败]',
        boxShadow: '[获取失败]',
        borderRadius: '[获取失败]',
        border: '[获取失败]',
      })
    }
  }, [safeTheme]) // 使用 safeTheme 而非 theme

  // 打印调试信息（仅在开发环境且已启用 Debug）
  useEffect(() => {
    if (!shouldRender) {
      return
    }

    try {
      console.group('🎨 Theme Debug Info')
      
      // 1. 当前激活的 theme 名称（防御式）
      console.log('1. 当前激活的 theme 名称:', safeTheme)
      console.log('   - BASE_THEME_NAME:', BASE_THEME_NAME)
      console.log('   - 是否为默认主题:', safeTheme === BASE_THEME_NAME)
      console.log('   - 是否为 base-derived:', isBaseDerived)
      
      // 2. defaultTheme 的某个 token 当前值（防御式）
      console.log('2. DefaultTheme Token 当前值:')
      console.log('   - --card:', getCSSVariable('--card'))
      console.log('   - --card-foreground:', getCSSVariable('--card-foreground'))
      console.log('   - --background:', getCSSVariable('--background'))
      console.log('   - --foreground:', getCSSVariable('--foreground'))
      console.log('   - --radius-card:', getCSSVariable('--radius-card'))
      console.log('   - --border:', getCSSVariable('--border'))
      
      // 3. Card 实际渲染后的 computed style（防御式）
      if (computedStyles) {
        console.log('3. Card 实际渲染后的 computed style:')
        console.log('   - backgroundColor:', computedStyles.backgroundColor)
        console.log('   - boxShadow:', computedStyles.boxShadow)
        console.log('   - borderRadius:', computedStyles.borderRadius)
        console.log('   - border:', computedStyles.border)
      } else {
        console.log('3. Card computed style: 等待渲染...')
      }

      // 4. 与 Design Baseline 的差异（防御式）
      if (isBaseDerived && themeDiff) {
        console.log('4. 与 Design Baseline 的差异:')
        const list = formatDiffList(themeDiff)
        if (Array.isArray(list)) {
          list.forEach((diff) => {
            console.log(`   - ${safeString(diff)}`)
          })
        }
      }
      
      console.groupEnd()
    } catch (error) {
      console.warn('[ThemeDebug] 打印调试信息失败:', error)
    }
  }, [safeTheme, computedStyles, shouldRender, isBaseDerived, themeDiff])

  // 只在满足条件时显示调试面板（生产环境强制移除）
  if (!shouldRender) {
    return null
  }

  // ⚠️ 禁止使用 fixed / overlay 默认渲染
  // 组件应在父容器中通过条件渲染控制显示
  return (
    <div 
      data-theme-debug="enabled"
      className="max-w-md"
    >
      <Card ref={cardRef} className="theme-card p-4 relative" semanticLevel="system_hint">
        {/* 关闭按钮 */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 h-6 w-6"
          onClick={handleClose}
        >
          <X className="h-4 w-4" />
        </Button>

        <div className="space-y-2 text-xs pr-8">
          <div className="font-semibold text-sm mb-2">🎨 Theme Debug</div>
          
          {/* 当前主题（防御式） */}
          <div>
            <span className="text-muted-foreground">当前主题:</span>
            <span className="ml-2 font-mono">{safeString(safeTheme)}</span>
            {isBaseDerived && (
              <span className="ml-2 px-1.5 py-0.5 text-xs bg-primary/10 text-primary rounded border border-primary/20">
                base-derived
              </span>
            )}
          </div>

          {/* 与 Design Baseline 的差异（防御式） */}
          {isBaseDerived && safeArrayLength(diffList) > 0 && (
            <div className="mt-3 pt-3 border-t border-border">
              <div className="text-muted-foreground mb-1.5 font-medium">与 Design Baseline 的差异:</div>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {diffList.map((diff, index) => (
                  <div key={index} className="font-mono text-xs text-foreground-secondary break-all">
                    {safeString(diff)}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* CSS 变量值（防御式） */}
          <div>
            <span className="text-muted-foreground">--card:</span>
            <span className="ml-2 font-mono text-xs break-all">{getCSSVariable('--card')}</span>
          </div>
          
          {/* Computed Styles（防御式） */}
          {computedStyles ? (
            <>
              <div>
                <span className="text-muted-foreground">背景色:</span>
                <span className="ml-2 font-mono text-xs">{safeString(computedStyles.backgroundColor)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">阴影:</span>
                <span className="ml-2 font-mono text-xs break-all">{safeString(computedStyles.boxShadow)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">圆角:</span>
                <span className="ml-2 font-mono text-xs">{safeString(computedStyles.borderRadius)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">边框:</span>
                <span className="ml-2 font-mono text-xs break-all">{safeString(computedStyles.border)}</span>
              </div>
            </>
          ) : (
            <div className="text-muted-foreground text-xs">等待渲染...</div>
          )}
        </div>
      </Card>
    </div>
  )
}
