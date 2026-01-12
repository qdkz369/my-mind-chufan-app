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
    if (this.state.hasError) {
      // 如果提供了自定义 fallback，使用它
      if (this.props.fallback) {
        return this.props.fallback
      }

      // 默认错误 UI
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="max-w-md w-full theme-card p-6 space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">出错了</h2>
                <p className="text-sm text-muted-foreground">应用遇到了一个错误</p>
              </div>
            </div>

            {this.state.error && (
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium text-foreground">错误信息：</p>
                <p className="text-xs text-muted-foreground font-mono break-all">
                  {this.state.error.message || "未知错误"}
                </p>
                {process.env.NODE_ENV === "development" && this.state.errorInfo && (
                  <details className="mt-2">
                    <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                      查看详细错误信息
                    </summary>
                    <pre className="mt-2 text-xs text-muted-foreground overflow-auto max-h-40">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button
                onClick={this.handleReset}
                variant="outline"
                className="flex-1 theme-button"
              >
                重试
              </Button>
              <Button
                onClick={this.handleReload}
                className="flex-1 theme-button"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                重新加载
              </Button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
