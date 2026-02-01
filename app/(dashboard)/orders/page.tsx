"use client"

import { useState, useEffect } from "react"
import { fetchWithAuth } from "@/lib/auth/fetch-with-auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Fuel, Package, Loader2, RefreshCw, AlertCircle, Building2, ArrowLeft, FileText } from "lucide-react"
import Link from "next/link"

interface OrderMain {
  id: string
  order_number: string
  order_type: "fuel" | "rental"
  company_id?: string
  status: string
  total_amount: number
  created_at: string
  restaurant_id?: string
  payment_method?: string | null
  corporate_company_name?: string | null
  corporate_tax_id?: string | null
  invoiced?: boolean
  restaurants?: {
    id: string
    name: string
    contact_name?: string
    contact_phone?: string
  }
}

interface Pagination {
  page: number
  page_size: number
  total: number
  total_pages: number
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderMain[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [orderTypeFilter, setOrderTypeFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    page_size: 20,
    total: 0,
    total_pages: 0,
  })
  const [selectedOrder, setSelectedOrder] = useState<OrderMain | null>(null)
  const [orderDetailOpen, setOrderDetailOpen] = useState(false)

  const loadOrders = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (orderTypeFilter !== "all") {
        params.append("order_type", orderTypeFilter)
      }
      if (statusFilter !== "all") {
        params.append("status", statusFilter)
      }
      params.append("page", pagination.page.toString())
      params.append("page_size", pagination.page_size.toString())

      console.log(`[订单列表] 🔄 开始加载订单，筛选条件:`, {
        orderType: orderTypeFilter,
        status: statusFilter,
        page: pagination.page
      })

      // 获取客户端用户的 restaurantId（如果存在）
      const restaurantId = typeof window !== "undefined" 
        ? localStorage.getItem("restaurantId") 
        : null

      const headers: HeadersInit = {
        "Content-Type": "application/json",
      }
      
      // 如果是客户端用户（通过手机号登录），传递 restaurantId 请求头
      if (restaurantId) {
        headers["x-restaurant-id"] = restaurantId
      }

      const response = await fetchWithAuth(`/api/orders/main/list?${params.toString()}`, {
        credentials: "include",
        headers,
      })

      console.log(`[订单列表] 📡 API响应状态:`, response.status)

      if (!response.ok) {
        let errorMessage = `请求失败 (${response.status})`
        let isSystemConfigError = false
        
        try {
          const errorData = await response.json()
          console.error(`[订单列表] API错误详情:`, errorData)
          
          errorMessage = errorData.error || errorData.details || errorMessage
          
          // 检查是否是系统配置问题
          if (errorData.error === "系统配置不完整" || errorData.details?.includes("用户权限系统")) {
            isSystemConfigError = true
            errorMessage = `🔧 系统配置不完整\n\n${errorData.details || "用户权限系统尚未完全配置"}\n\n可能的解决方案：\n• 刷新页面重新登录\n• 联系管理员初始化用户数据\n• 检查是否在无痕模式下访问`
          } else {
            // 提供更友好的错误提示
            if (response.status === 401) {
              errorMessage = "🔑 登录状态异常\n\n您的登录会话已过期，请重新登录后重试"
            } else if (response.status === 403) {
              errorMessage = "🚫 权限不足\n\n没有查看订单的权限，请联系管理员分配相应角色"
            } else if (response.status === 500) {
              errorMessage = "🔧 服务器错误\n\n服务器暂时繁忙，请稍后重试"
            }
          }
        } catch (parseError) {
          console.error(`[订单列表] 解析错误响应失败:`, parseError)
          errorMessage = `网络错误 (${response.status})\n\n无法解析服务器响应，请检查网络连接或联系管理员`
        }
        
        throw new Error(errorMessage)
      }

      const result = await response.json()
      console.log(`[订单列表] 📝 API返回数据:`, {
        success: result.success,
        dataLength: result.data?.length || 0,
        pagination: result.pagination
      })

      if (result.success) {
        const orders = result.data || []
        setOrders(orders)
        setPagination(result.pagination || pagination)
        
        console.log(`[订单列表] ✅ 加载成功，共 ${orders.length} 条订单`)
      } else {
        throw new Error(result.error || result.details || "加载订单失败")
      }
    } catch (err: any) {
      console.error("[订单列表] ❌ 加载失败:", err)
      
      let userFriendlyError = err.message || "加载订单失败"
      
      // 网络错误处理
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        userFriendlyError = "网络连接异常，请检查网络连接后重试"
      }
      
      setError(userFriendlyError)
      setOrders([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadOrders()
  }, [orderTypeFilter, statusFilter, pagination.page])

  const getOrderTypeLabel = (type: string) => {
    switch (type) {
      case "fuel":
        return "燃料订单"
      case "rental":
        return "租赁订单"
      default:
        return type
    }
  }

  const getOrderTypeIcon = (type: string) => {
    switch (type) {
      case "fuel":
        return <Fuel className="h-4 w-4" />
      case "rental":
        return <Package className="h-4 w-4" />
      default:
        return null
    }
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case "pending":
        return "secondary"
      case "completed":
        return "default"
      case "cancelled":
        return "destructive"
      default:
        return "outline"
    }
  }

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat("zh-CN", {
      style: "currency",
      currency: "CNY",
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-border shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/">
                <Button variant="ghost" size="icon" className="hover:bg-muted">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-lg font-bold text-foreground">订单管理</h1>
                <p className="text-xs text-muted-foreground">统一查看燃料订单和租赁订单</p>
              </div>
            </div>
            
            {/* 导航按钮组 */}
            <div className="flex items-center gap-2">
              <Link href="/">
                <Button variant="ghost" size="sm" className="hover:bg-muted">
                  <Building2 className="h-4 w-4 mr-2" />
                  返回首页
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto p-6 space-y-6">
        {/* 面包屑导航 */}
        <nav className="flex items-center text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground transition-colors">
            首页
          </Link>
          <span className="mx-2">/</span>
          <span className="text-foreground">订单管理</span>
        </nav>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">订单列表</h1>
            <p className="text-muted-foreground mt-1">统一查看燃料订单和租赁订单</p>
          </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => window.location.href = '/orders/create'} 
            className="bg-primary hover:bg-primary/90 text-primary-foreground" 
            size="sm"
          >
            <Package className="h-4 w-4 mr-2" />
            创建订单
          </Button>
          <Button onClick={loadOrders} variant="outline" size="sm" disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            刷新
          </Button>
        </div>
      </div>

      {/* 筛选器 */}
      <Card semanticLevel="action">
        <CardHeader>
          <CardTitle>筛选条件</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">订单类型</label>
              <Select value={orderTypeFilter} onValueChange={setOrderTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="选择订单类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  <SelectItem value="fuel">燃料订单</SelectItem>
                  <SelectItem value="rental">租赁订单</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">订单状态</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="选择订单状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  <SelectItem value="pending">待处理</SelectItem>
                  <SelectItem value="completed">已完成</SelectItem>
                  <SelectItem value="cancelled">已取消</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 订单列表 */}
      {isLoading ? (
        <Card semanticLevel="system_hint">
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">加载中...</span>
          </CardContent>
        </Card>
      ) : error ? (
        <Card semanticLevel="system_hint" className="border-destructive/50 bg-destructive/10">
          <CardContent className="py-12">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h3 className="font-medium text-destructive mb-4">订单列表加载失败</h3>
              <div className="text-sm text-foreground mb-6 max-w-2xl mx-auto bg-card/50 p-4 rounded-lg border">
                <pre className="whitespace-pre-wrap text-left font-mono text-xs overflow-x-auto">
                  {error}
                </pre>
              </div>
              
              {/* 系统配置问题的特殊提示 */}
              {error.includes('系统配置不完整') && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 mb-4 max-w-2xl mx-auto">
                  <h4 className="font-medium text-amber-400 mb-2">💡 常见解决方案</h4>
                  <ul className="text-sm text-amber-200 text-left space-y-1">
                    <li>• 刷新浏览器页面重新登录</li>
                    <li>• 检查是否使用无痕模式（无痕模式会阻止登录状态保存）</li>
                    <li>• 联系系统管理员执行数据库初始化脚本</li>
                    <li>• 清除浏览器缓存和Cookie后重新登录</li>
                    <li>• 确认测试账号已正确配置角色和餐厅关联</li>
                  </ul>
                </div>
              )}
              
              <div className="flex justify-center gap-2 flex-wrap">
                {/* 如果是401错误，优先显示"前往登录"按钮 */}
                {error.includes('登录状态异常') || error.includes('未授权') ? (
                  <Button 
                    onClick={() => window.location.href = '/login'} 
                    variant="default" 
                    size="sm"
                    className="bg-primary hover:bg-primary/90"
                  >
                    <AlertCircle className="h-4 w-4 mr-2" />
                    前往登录
                  </Button>
                ) : null}
                <Button 
                  onClick={() => window.location.reload()} 
                  variant="outline" 
                  size="sm"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  刷新页面
                </Button>
                <Button 
                  onClick={loadOrders} 
                  variant="outline" 
                  size="sm"
                  disabled={isLoading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
                  重新加载
                </Button>
                <Button 
                  onClick={() => window.location.href = '/'} 
                  variant="outline" 
                  size="sm"
                >
                  <Building2 className="h-4 w-4 mr-2" />
                  返回首页
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : orders.length === 0 ? (
        <Card semanticLevel="system_hint">
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <p>暂无订单数据</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4">
            {orders.map((order) => (
              <Card
                key={order.id}
                semanticLevel="secondary_fact"
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => {
                  setSelectedOrder(order)
                  setOrderDetailOpen(true)
                }}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        {getOrderTypeIcon(order.order_type)}
                      </div>
                      <div>
                        <CardTitle className="text-lg">{order.order_number}</CardTitle>
                        <CardDescription className="mt-1">
                          {getOrderTypeLabel(order.order_type)}
                          {order.restaurants && ` · ${order.restaurants.name}`}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge variant={getStatusBadgeVariant(order.status)}>{order.status}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">订单金额：</span>
                      <span className="font-semibold ml-2 text-foreground">{formatAmount(order.total_amount)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">创建时间：</span>
                      <span className="ml-2 text-foreground">{formatDate(order.created_at)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">订单ID：</span>
                      <span className="ml-2 font-mono text-xs text-foreground">{order.id.substring(0, 8)}...</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* 订单详情弹窗 */}
          <Dialog open={orderDetailOpen} onOpenChange={setOrderDetailOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>订单详情</DialogTitle>
                <DialogDescription>
                  {selectedOrder && getOrderTypeLabel(selectedOrder.order_type)} · {selectedOrder?.order_number}
                </DialogDescription>
              </DialogHeader>
              {selectedOrder && (
                <div className="space-y-4">
                  <div className="grid gap-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">订单号</span>
                      <span>{selectedOrder.order_number}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">金额</span>
                      <span>{formatAmount(selectedOrder.total_amount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">状态</span>
                      <Badge variant={getStatusBadgeVariant(selectedOrder.status)}>{selectedOrder.status}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">创建时间</span>
                      <span>{formatDate(selectedOrder.created_at)}</span>
                    </div>
                    {selectedOrder.payment_method === "corporate" && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">支付方式</span>
                        <span>对公支付</span>
                      </div>
                    )}
                  </div>
                  {selectedOrder.payment_method === "corporate" &&
                    (selectedOrder.status === "completed" || selectedOrder.status === "paid") &&
                    !selectedOrder.invoiced && (
                      <Link href={`/invoices?orderId=${selectedOrder.id}`}>
                        <Button className="w-full" onClick={() => setOrderDetailOpen(false)}>
                          <FileText className="h-4 w-4 mr-2" />
                          申请开票
                        </Button>
                      </Link>
                    )}
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* 分页 */}
          {pagination.total_pages > 1 && (
            <Card semanticLevel="action">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    共 {pagination.total} 条订单，第 {pagination.page} / {pagination.total_pages} 页
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                      disabled={pagination.page <= 1}
                    >
                      上一页
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                      disabled={pagination.page >= pagination.total_pages}
                    >
                      下一页
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
      </div>
    </div>
  )
}
