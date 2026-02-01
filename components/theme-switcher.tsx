"use client"

import { useTheme } from "@/lib/styles/theme-context"
import { SWITCHABLE_VISUAL_THEMES, VISUAL_THEMES, VisualThemeName } from "@/lib/styles/themes"
import { Palette, ChevronRight } from "lucide-react"
import Link from "next/link"

/**
 * 更多主题按钮组件
 * 
 * 点击后跳转到主题选择页面，用户可以在那里选择所有可用的主题
 */
export function ThemeSwitcher() {
  const { theme } = useTheme()

  const getCurrentThemeName = () => {
    if (SWITCHABLE_VISUAL_THEMES.includes(theme as VisualThemeName)) {
      const themeConfig = VISUAL_THEMES[theme as VisualThemeName]
      return themeConfig?.displayName || theme
    }
    return '默认主题'
  }

  return (
    <Link href="/themes">
      <button
        className="
          w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg
          bg-secondary/50 hover:bg-secondary transition-colors
          border border-border
        "
        aria-label="更多主题"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
            <Palette className="w-4 h-4 text-primary" />
          </div>
          <div className="text-left">
            <div className="text-sm font-medium text-foreground">更多主题</div>
            <div className="text-xs text-muted-foreground">当前：{getCurrentThemeName()}</div>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-muted-foreground" />
      </button>
    </Link>
  )
}
