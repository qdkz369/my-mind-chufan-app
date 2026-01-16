"use client"

// THEME_SYSTEM_DISABLED: 主题系统已禁用，当前阶段 UI 只允许使用 CSS 旁路画布方式
// import { useTheme } from "@/lib/styles/theme-context"
// import { VISUAL_THEMES, SWITCHABLE_VISUAL_THEMES, VisualThemeName } from "@/lib/styles/themes"
import { Header } from "@/components/header"
import { BottomNavigation } from "@/components/bottom-navigation"
import { Card } from "@/components/ui/card"
import { ArrowLeft, Check, Moon, Palette } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function ThemesPage() {
  // THEME_SYSTEM_DISABLED: 主题系统已禁用，当前阶段 UI 只允许使用 CSS 旁路画布方式
  // const { theme, setTheme } = useTheme()
  const router = useRouter()

  const handleThemeSelect = (themeName: any) => {
    // 主题系统已禁用，不执行任何操作
    console.warn('[ThemesPage] 主题系统已禁用，当前阶段 UI 只允许使用 CSS 旁路画布方式')
    // setTheme(themeName)
    // 延迟一下让用户看到选中效果，然后返回
    setTimeout(() => {
      router.back()
    }, 300)
  }

  // 判断当前主题
  const isCurrentTheme = (themeName: string) => {
    // 主题系统已禁用，始终返回 false
    return false
    // return theme === themeName
  }

  return (
    <main className="min-h-screen bg-background pb-20 transition-colors duration-300">
      <Header />
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* 返回按钮 */}
        <Link href="/settings">
          <div className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer mb-4">
            <ArrowLeft className="h-5 w-5" />
            <span className="text-sm">返回</span>
          </div>
        </Link>

        {/* 页面标题 */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground mb-2">选择主题</h1>
          <p className="text-sm text-muted-foreground">选择您喜欢的界面风格</p>
        </div>

        {/* 可切换的视觉主题 */}
        {/* THEME_SYSTEM_DISABLED: 主题系统已禁用，当前阶段 UI 只允许使用 CSS 旁路画布方式 */}
        {/* {SWITCHABLE_VISUAL_THEMES.map((themeName) => {
          const themeConfig = VISUAL_THEMES[themeName]
          if (!themeConfig) return null */}
        {/* 主题列表已禁用 */}
        {/* {[].map((themeName: any) => {
          // const themeConfig = VISUAL_THEMES[themeName]
          // if (!themeConfig) return null
          return null

          return (
            <Card
              key={themeName}
              className={`glass-breath p-6 cursor-pointer transition-all hover:scale-[1.02] ${
                isCurrentTheme(themeName) ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => handleThemeSelect(themeName)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
                    {themeName === 'industrial-dark' ? (
                      <Moon className="w-6 h-6 text-blue-400" />
                    ) : (
                      <Palette className="w-6 h-6 text-primary" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-semibold text-foreground">
                        {themeConfig.displayName}
                      </h3>
                      {isCurrentTheme(themeName) && (
                        <Check className="w-5 h-5 text-primary" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {themeConfig.description}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          )
        })} */}
      </div>
      <BottomNavigation />
    </main>
  )
}
