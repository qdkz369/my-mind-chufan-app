import type React from "react"
import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Toaster } from "@/components/ui/toaster"
import { ThemeProvider } from "@/lib/styles/theme-context"
import { ErrorBoundary } from "@/components/error-boundary"
import { ThemeDebug } from "@/components/theme-debug"
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
  maximumScale: 5,
  userScalable: true,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        {/* 防止主题闪烁：在服务端渲染时立即设置默认主题 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var root = document.documentElement;
                  
                  // 规则：
                  // - DefaultTheme（Base Theme）不设置 data-theme 属性，完全使用 globals.css 的 :root 样式
                  // - 仅当有可切换主题时，才设置 data-theme 和 CSS 变量
                  // - 首次进入系统时，强制使用 DefaultTheme（不设置 data-theme）
                  
                  // 检查是否有可切换的 Visual Theme（仅非 DefaultTheme）
                  var savedTheme = localStorage.getItem('ios-theme-preference');
                  var isFirstVisit = savedTheme === null;
                  
                  if (isFirstVisit) {
                    // 首次进入系统：强制使用 DefaultTheme（不设置 data-theme，完全依赖 globals.css 的 :root）
                    root.removeAttribute('data-theme');
                    root.removeAttribute('style');
                  } else if (savedTheme === 'apple-white') {
                    // 如果保存的是 Apple White 主题，则应用它（设置 data-theme 和 CSS 变量）
                    root.setAttribute('data-theme', 'apple-white');
                    root.style.setProperty('--background', '#F2F2F7');
                    root.style.setProperty('--background-secondary', '#FFFFFF');
                    root.style.setProperty('--foreground', '#1D1D1F');
                  } else if (savedTheme === 'industrial-dark') {
                    // 如果保存的是 Industrial Dark 主题，则应用它（设置 data-theme）
                    root.setAttribute('data-theme', 'industrial-dark');
                    // CSS 变量由 globals.css 的 [data-theme="industrial-dark"] 选择器定义
                  } else {
                    // 否则使用 DefaultTheme（不设置 data-theme，完全依赖 globals.css 的 :root）
                    root.removeAttribute('data-theme');
                    root.removeAttribute('style');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className={`${inter.className} antialiased`}>
        <ErrorBoundary>
          <ThemeProvider>
            {children}
            <Toaster />
            <Analytics />
            <ThemeDebug />
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}
