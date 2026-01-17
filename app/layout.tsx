import type React from "react"
import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Toaster } from "@/components/ui/toaster"
// THEME_SYSTEM_DISABLED: 主题系统已禁用，当前阶段 UI 只允许使用 CSS 旁路画布方式
// import { ThemeProvider } from "@/lib/styles/theme-context"
import { ErrorBoundary } from "@/components/error-boundary"
// import { ThemeDebug } from "@/components/theme-debug"
import { ForceVisibleWrapper } from "@/components/force-visible-wrapper"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "我的智能餐厅 - 专业餐饮后市场服务平台",
  description: "提供燃料配送、设备租赁、维修服务、供应链管理和金融服务的一站式餐饮后市场解决方案",
  generator: "v0.app",
  applicationName: "我的智能餐厅",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "我的智能餐厅",
  },
  formatDetection: {
    telephone: false,
  },
  manifest: "/manifest.json",
}

export const viewport: Viewport = {
  themeColor: "#1e3a8a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        {/* THEME_SSR_DISABLED: 主题 SSR 脚本已禁用，主题完全由 ThemeProvider 在客户端控制 */}
        {/* 
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var root = document.documentElement;
                  
                  // 规则：
                  // - 从 localStorage 读取保存的主题
                  // - 如果存在，直接写入 html[data-theme]
                  // - 如果不存在，不设置 data-theme，交由 ThemeProvider 在 CSR 阶段处理
                  
                  // 检查是否有保存的主题
                  var savedTheme = localStorage.getItem('ios-theme-preference');
                  
                  if (savedTheme) {
                    // 如果 localStorage 中有保存的主题，直接应用
                    root.setAttribute('data-theme', savedTheme);
                    // CSS 变量由 globals.css 的 [data-theme="..."] 选择器定义
                  }
                  // 如果 localStorage 为空，不设置 data-theme，交由 ThemeProvider 处理
                } catch (e) {}
              })();
            `,
          }}
        />
        */}
      </head>
      <body 
        data-ui="midnight"
        className={`${inter.className} antialiased`}
        style={{ 
          // 使用 CSS radial-gradient 确保移动端背景不变形，使用 bg-cover 行为
          background: 'radial-gradient(ellipse at 50% -20%, oklch(0.3 0.15 250), oklch(0.1 0.05 255) 75%) fixed',
          backgroundSize: 'cover',
          minHeight: '100vh',
          color: 'white'
        }}
      >
        <ForceVisibleWrapper>
          <ErrorBoundary>
            {/* THEME_SYSTEM_DISABLED: 主题系统已禁用，当前阶段 UI 只允许使用 CSS 旁路画布方式 */}
            {/* <ThemeProvider> */}
              {children}
              <Toaster />
              <Analytics />
              {/* <ThemeDebug /> */}
            {/* </ThemeProvider> */}
          </ErrorBoundary>
        </ForceVisibleWrapper>
      </body>
    </html>
  )
}
