import type React from "react"
import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Toaster } from "@/components/ui/toaster"
import { ThemeProvider } from "@/lib/styles/theme-context"
import { ErrorBoundary } from "@/components/error-boundary"
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
                  var theme = localStorage.getItem('ios-theme-preference') || 'industrial-blue';
                  var root = document.documentElement;
                  if (theme === 'industrial-blue') {
                    root.setAttribute('data-theme', 'industrial-blue');
                    root.style.setProperty('--background', '#0A1628');
                    root.style.setProperty('--background-secondary', '#0F1B2E');
                    root.style.setProperty('--foreground', '#E5E8ED');
                  } else if (theme === 'apple-white') {
                    root.setAttribute('data-theme', 'apple-white');
                    root.style.setProperty('--background', '#F2F2F7');
                    root.style.setProperty('--background-secondary', '#FFFFFF');
                    root.style.setProperty('--foreground', '#1D1D1F');
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
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}
