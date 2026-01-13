"use client"

import { useEffect, useRef, useState } from 'react'
import { useTheme } from '@/lib/styles/theme-context'
import { Card } from '@/components/ui/card'
import { BASE_THEME_NAME, DEFAULT_THEME_NAME } from '@/lib/styles/themes'

/**
 * 主题调试组件
 * 
 * 在运行时打印：
 * 1. 当前激活的 theme 名称
 * 2. defaultTheme 的某个 token 当前值
 * 3. Card 实际渲染后的 computed style（背景色、阴影）
 */
export function ThemeDebug() {
  const { theme } = useTheme()
  const cardRef = useRef<HTMLDivElement>(null)
  const [computedStyles, setComputedStyles] = useState<{
    backgroundColor: string
    boxShadow: string
    borderRadius: string
    border: string
  } | null>(null)

  // 获取 CSS 变量值
  const getCSSVariable = (varName: string): string => {
    if (typeof window === 'undefined') return ''
    return getComputedStyle(document.documentElement).getPropertyValue(varName).trim()
  }

  // 获取 Card 的 computed style
  useEffect(() => {
    if (cardRef.current) {
      const styles = window.getComputedStyle(cardRef.current)
      setComputedStyles({
        backgroundColor: styles.backgroundColor,
        boxShadow: styles.boxShadow,
        borderRadius: styles.borderRadius,
        border: styles.border,
      })
    }
  }, [theme]) // 当主题改变时重新获取

  // 打印调试信息
  useEffect(() => {
    console.group('🎨 Theme Debug Info')
    
    // 1. 当前激活的 theme 名称
    console.log('1. 当前激活的 theme 名称:', theme)
    console.log('   - BASE_THEME_NAME:', BASE_THEME_NAME)
    console.log('   - DEFAULT_THEME_NAME:', DEFAULT_THEME_NAME)
    console.log('   - 是否为默认主题:', theme === BASE_THEME_NAME || theme === DEFAULT_THEME_NAME)
    
    // 2. defaultTheme 的某个 token 当前值
    console.log('2. DefaultTheme Token 当前值:')
    console.log('   - --card:', getCSSVariable('--card'))
    console.log('   - --card-foreground:', getCSSVariable('--card-foreground'))
    console.log('   - --background:', getCSSVariable('--background'))
    console.log('   - --foreground:', getCSSVariable('--foreground'))
    console.log('   - --radius-card:', getCSSVariable('--radius-card'))
    console.log('   - --border:', getCSSVariable('--border'))
    console.log('   - --theme-shadow:', getCSSVariable('--theme-shadow'))
    
    // 3. Card 实际渲染后的 computed style
    if (computedStyles) {
      console.log('3. Card 实际渲染后的 computed style:')
      console.log('   - backgroundColor:', computedStyles.backgroundColor)
      console.log('   - boxShadow:', computedStyles.boxShadow)
      console.log('   - borderRadius:', computedStyles.borderRadius)
      console.log('   - border:', computedStyles.border)
    } else {
      console.log('3. Card computed style: 等待渲染...')
    }
    
    // 4. 检查值是否随主题切换发生变化
    console.log('4. 值变化说明:')
    console.log('   - theme 名称: 会随主题切换变化（base / apple-white / industrial-dark）')
    console.log('   - CSS 变量值: 会随主题切换变化（通过 [data-theme] 选择器覆盖）')
    console.log('   - Card computed style: 会随主题切换变化（因为 CSS 变量变化）')
    
    console.groupEnd()
  }, [theme, computedStyles])

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md">
      <Card ref={cardRef} className="theme-card p-4">
        <div className="space-y-2 text-xs">
          <div className="font-semibold text-sm mb-2">🎨 Theme Debug</div>
          
          <div>
            <span className="text-muted-foreground">当前主题:</span>
            <span className="ml-2 font-mono">{theme}</span>
          </div>
          
          <div>
            <span className="text-muted-foreground">--card:</span>
            <span className="ml-2 font-mono text-xs break-all">{getCSSVariable('--card')}</span>
          </div>
          
          {computedStyles && (
            <>
              <div>
                <span className="text-muted-foreground">背景色:</span>
                <span className="ml-2 font-mono text-xs">{computedStyles.backgroundColor}</span>
              </div>
              <div>
                <span className="text-muted-foreground">阴影:</span>
                <span className="ml-2 font-mono text-xs break-all">{computedStyles.boxShadow || 'none'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">圆角:</span>
                <span className="ml-2 font-mono text-xs">{computedStyles.borderRadius}</span>
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  )
}
