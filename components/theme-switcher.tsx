"use client"

// THEME_SYSTEM_DISABLED: 主题系统已禁用，当前阶段 UI 只允许使用 CSS 旁路画布方式
// import { useTheme } from "@/lib/styles/theme-context"
// import { BASE_THEME_NAME, SWITCHABLE_VISUAL_THEMES, VISUAL_THEMES, VisualThemeName } from "@/lib/styles/themes"
import { Palette, ChevronRight } from "lucide-react"
import Link from "next/link"

/**
 * 更多主题按钮组件
 * 
 * 点击后跳转到主题选择页面，用户可以在那里选择所有可用的主题
 */
export function ThemeSwitcher() {
  // THEME_SYSTEM_DISABLED: 主题系统已禁用，当前阶段 UI 只允许使用 CSS 旁路画布方式
  // const { theme } = useTheme()

  // 判断当前是否是可切换的 Visual Theme（非 Base Theme）
  // const isSwitchableTheme = theme !== BASE_THEME_NAME && SWITCHABLE_VISUAL_THEMES.includes(theme as VisualThemeName)

  // 获取当前主题显示名称
  const getCurrentThemeName = () => {
    // 主题系统已禁用，返回固定值
    return '默认主题'
    /* if (theme === BASE_THEME_NAME) {
      return '默认主题'
    }
    // 从 VISUAL_THEMES 获取主题显示名称
    if (SWITCHABLE_VISUAL_THEMES.includes(theme as VisualThemeName)) {
      const themeConfig = VISUAL_THEMES[theme as VisualThemeName]
      return themeConfig?.displayName || theme
    }
    return '默认主题' */
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
