"use client"

import { useTheme } from "@/lib/styles/theme-context"
import { BASE_THEME_NAME, SWITCHABLE_VISUAL_THEMES, VisualThemeName } from "@/lib/styles/themes"
import { Moon, Sun } from "lucide-react"

/**
 * 主题切换器组件
 * 
 * 胶囊形切换开关，用于在 Base Theme 和 Visual Themes 之间切换
 * 
 * 核心原则：
 * - Base Theme 不受切换器控制（始终作为基础，不允许被切换）
 * - 只能在 Base Theme 和 Visual Themes 之间切换
 * - 切换到 Base Theme 时，从 localStorage 删除保存的主题
 * 
 * ⛔ 严格禁止：
 * - Visual Themes 严禁修改 spacing、layout、组件结构
 * - Visual Themes 只能覆盖颜色、圆角、阴影、字体
 */
export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme()

  const toggleTheme = () => {
    // 如果当前是 Base Theme，切换到第一个 Visual Theme
    // 如果当前是 Visual Theme，切换回 Base Theme
    const newTheme = theme === BASE_THEME_NAME 
      ? SWITCHABLE_VISUAL_THEMES[0]
      : BASE_THEME_NAME
    setTheme(newTheme)
  }

  // 判断当前是否是可切换的 Visual Theme（非 Base Theme）
  const isSwitchableTheme = theme !== BASE_THEME_NAME && SWITCHABLE_VISUAL_THEMES.includes(theme as VisualThemeName)

  return (
    <button
      onClick={toggleTheme}
      className={`
        relative flex items-center gap-2 px-4 py-2 rounded-full
        transition-all duration-400 ease-in-out
        ${isSwitchableTheme 
          ? 'bg-white shadow-[0_2px_8px_rgba(0,0,0,0.08)]' 
          : 'bg-slate-800/90 border border-slate-700/50'
        }
        hover:scale-105 active:scale-95
      `}
      aria-label={`切换到${isSwitchableTheme ? '基础主题' : '可切换主题'}`}
    >
      {/* 图标 */}
      <div className="flex items-center gap-2">
        {isSwitchableTheme ? (
          <>
            <Sun className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-medium text-gray-900">Apple</span>
          </>
        ) : (
          <>
            <Moon className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-medium text-slate-200">Industrial</span>
          </>
        )}
      </div>
      
      {/* 切换指示器 */}
      <div className={`
        absolute right-1 top-1/2 -translate-y-1/2
        w-6 h-6 rounded-full
        transition-all duration-400 ease-in-out
        ${isSwitchableTheme 
          ? 'bg-blue-500 translate-x-0' 
          : 'bg-slate-600 -translate-x-8'
        }
      `} />
    </button>
  )
}
