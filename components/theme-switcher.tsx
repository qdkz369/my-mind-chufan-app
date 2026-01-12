"use client"

import { useTheme } from "@/lib/styles/theme-context"
import { Moon, Sun } from "lucide-react"

/**
 * 主题切换器组件
 * 
 * 胶囊形切换开关，用于在 Industrial Blue 和 Apple White 之间切换
 * 切换时提供平滑的过渡动画（像 iOS 切换深色模式一样）
 */
export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme()

  const toggleTheme = () => {
    const newTheme = theme === 'industrial-blue' ? 'apple-white' : 'industrial-blue'
    setTheme(newTheme)
  }

  const isAppleWhite = theme === 'apple-white'

  return (
    <button
      onClick={toggleTheme}
      className={`
        relative flex items-center gap-2 px-4 py-2 rounded-full
        transition-all duration-400 ease-in-out
        ${isAppleWhite 
          ? 'bg-white shadow-[0_2px_8px_rgba(0,0,0,0.08)]' 
          : 'bg-slate-800/90 border border-slate-700/50'
        }
        hover:scale-105 active:scale-95
      `}
      aria-label={`切换到${isAppleWhite ? '工业蓝' : '苹果白'}主题`}
    >
      {/* 图标 */}
      <div className="flex items-center gap-2">
        {isAppleWhite ? (
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
        ${isAppleWhite 
          ? 'bg-blue-500 translate-x-0' 
          : 'bg-slate-600 -translate-x-8'
        }
      `} />
    </button>
  )
}
