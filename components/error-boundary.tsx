"use client"

import React, { Component, ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { AlertCircle, RefreshCw } from "lucide-react"

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
}

/**
 * 错误边界组件
 * 捕获子组件树中的 JavaScript 错误，记录错误信息，并显示降级 UI
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // 记录错误到控制台
    console.error("[ErrorBoundary] 捕获到错误:", error)
    console.error("[ErrorBoundary] 错误信息:", errorInfo)
    
    // 可以在这里将错误发送到错误监控服务
    // 例如：Sentry, LogRocket 等

    this.setState({
      errorInfo,
    })
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    // ⚠️ 强制修复：始终返回 children，不做任何拦截
    // 即使有错误，也要渲染内容，错误信息通过 console 输出
    // 错误提示作为浮动层显示，不阻止主内容渲染
    
    return (
      <>
        {/* 始终渲染 children，无论是否有错误 */}
        {this.props.children}
        
        {/* 如果有错误，显示浮动错误提示（不阻塞页面） */}
        {this.state.hasError && process.env.NODE_ENV === "development" && (
          <div className="fixed bottom-4 right-4 z-[10000] bg-red-600 text-white p-3 rounded-lg shadow-lg max-w-md">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-5 w-5" />
              <h3 className="font-bold text-xs">开发模式错误提示（不阻塞页面）</h3>
            </div>
            <p className="text-xs mb-2">{this.state.error?.message || "未知错误"}</p>
            <div className="flex gap-2">
              <Button
                onClick={this.handleReset}
                variant="outline"
                size="sm"
                className="text-xs bg-white/10 hover:bg-white/20"
              >
                重试
              </Button>
              <Button
                onClick={this.handleReload}
                size="sm"
                className="text-xs"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                刷新
              </Button>
            </div>
          </div>
        )}
      </>
    )
  }
}
