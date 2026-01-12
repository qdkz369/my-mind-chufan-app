"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  CheckCircle2,
  XCircle,
  Eye,
  Search,
  Package,
  Loader2,
  Image as ImageIcon,
} from "lucide-react"
import Image from "next/image"

interface EquipmentCatalog {
  id: string
  name: string
  brand?: string
  model?: string
  description?: string
  images: string[]
  monthly_rental_price: number
  daily_rental_price?: number
  deposit_amount: number
  min_rental_period: number
  max_rental_period?: number
  maintenance_included: boolean
  delivery_included: boolean
  is_approved: boolean
  status: string
  rejection_reason?: string
  companies?: {
    id: string
    name: string
  }
  equipment_categories?: {
    id: string
    name: string
  }
  created_at: string
}

export function ProductApproval() {
  const [products, setProducts] = useState<EquipmentCatalog[]>([])
  const [filteredProducts, setFilteredProducts] = useState<EquipmentCatalog[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("pending")
  const [selectedProduct, setSelectedProduct] = useState<EquipmentCatalog | null>(null)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const [isApproving, setIsApproving] = useState(false)
  const [rejectionReason, setRejectionReason] = useState("")

  // 加载产品列表
  const loadProducts = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/equipment/catalog/list?is_approved=false")
      const result = await response.json()

      if (result.success && result.data) {
        setProducts(result.data)
        setFilteredProducts(result.data)
      }
    } catch (error) {
      console.error("[产品审核] 加载失败:", error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  // 搜索和筛选
  useEffect(() => {
    let filtered = [...products]

    // 状态筛选
    if (statusFilter === "pending") {
      filtered = filtered.filter((p) => p.status === "pending" && !p.is_approved)
    } else if (statusFilter === "approved") {
      filtered = filtered.filter((p) => p.is_approved && p.status === "active")
    } else if (statusFilter === "rejected") {
      filtered = filtered.filter((p) => p.status === "rejected")
    }

    // 搜索过滤
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter((item) => {
        return (
          item.name.toLowerCase().includes(query) ||
          item.brand?.toLowerCase().includes(query) ||
          item.companies?.name.toLowerCase().includes(query)
        )
      })
    }

    setFilteredProducts(filtered)
  }, [searchQuery, statusFilter, products])

  // 审核产品
  const handleApprove = async (productId: string, approved: boolean) => {
    setIsApproving(true)
    try {
      const response = await fetch("/api/equipment/catalog/approve", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: productId,
          is_approved: approved,
          rejection_reason: approved ? null : rejectionReason,
        }),
      })

      const result = await response.json()

      if (result.success) {
        alert(approved ? "产品已批准" : "产品已拒绝")
        setIsDetailDialogOpen(false)
        setSelectedProduct(null)
        setRejectionReason("")
        await loadProducts()
      } else {
        alert(`操作失败: ${result.error}`)
      }
    } catch (error: any) {
      console.error("[产品审核] 审核失败:", error)
      alert(`审核失败: ${error.message}`)
    } finally {
      setIsApproving(false)
    }
  }

  const getStatusBadge = (product: EquipmentCatalog) => {
    if (product.is_approved && product.status === "active") {
      return (
        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          已批准
        </Badge>
      )
    } else if (product.status === "rejected") {
      return (
        <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
          <XCircle className="h-3 w-3 mr-1" />
          已拒绝
        </Badge>
      )
    } else {
      return (
        <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
          待审核
        </Badge>
      )
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">产品审核</h1>
          <p className="text-slate-400">审核供应商上传的设备产品</p>
        </div>
      </div>

      {/* 搜索和筛选 */}
      <Card className="bg-slate-800/50 border-slate-700/50">
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
              <Input
                placeholder="搜索产品名称、品牌、供应商..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-slate-700 border-slate-600 text-white"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48 bg-slate-700 border-slate-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">待审核</SelectItem>
                <SelectItem value="approved">已批准</SelectItem>
                <SelectItem value="rejected">已拒绝</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 产品列表 */}
      {isLoading ? (
        <div className="text-center py-20">
          <Loader2 className="h-12 w-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">加载中...</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardContent className="p-12 text-center">
            <Package className="h-16 w-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 text-lg">暂无产品</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map((product) => (
            <Card
              key={product.id}
              className="bg-slate-800/50 border-slate-700/50 hover:border-blue-500/50 transition-all cursor-pointer"
              onClick={() => {
                setSelectedProduct(product)
                setIsDetailDialogOpen(true)
              }}
            >
              <CardContent className="p-4">
                {/* 图片 */}
                <div className="relative w-full h-32 bg-slate-900 rounded-lg mb-3 overflow-hidden">
                  {product.images && product.images.length > 0 ? (
                    <Image
                      src={product.images[0]}
                      alt={product.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="h-8 w-8 text-slate-600" />
                    </div>
                  )}
                </div>

                {/* 信息 */}
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <h3 className="text-lg font-bold text-white line-clamp-1">
                      {product.name}
                    </h3>
                    {getStatusBadge(product)}
                  </div>

                  {(product.brand || product.model) && (
                    <p className="text-sm text-slate-400">
                      {product.brand} {product.model}
                    </p>
                  )}

                  {product.companies && (
                    <p className="text-xs text-slate-500">供应商：{product.companies.name}</p>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-slate-700">
                    <span className="text-sm text-slate-400">月租金</span>
                    <span className="text-lg font-bold text-white">
                      ¥{product.monthly_rental_price.toFixed(2)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 详情对话框 */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white text-2xl">{selectedProduct?.name}</DialogTitle>
            <DialogDescription className="text-slate-400">
              {selectedProduct?.companies?.name && `供应商：${selectedProduct.companies.name}`}
            </DialogDescription>
          </DialogHeader>

          {selectedProduct && (
            <div className="space-y-6 mt-4">
              {/* 图片展示 */}
              {selectedProduct.images && selectedProduct.images.length > 0 && (
                <div>
                  <Label className="text-slate-300 mb-2 block">产品图片</Label>
                  <div className="grid grid-cols-3 gap-4">
                    {selectedProduct.images.map((url, index) => (
                      <div key={index} className="relative w-full h-32 bg-slate-800 rounded-lg overflow-hidden">
                        <Image src={url} alt={`产品图片 ${index + 1}`} fill className="object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 基本信息 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-300 mb-1 block">品牌</Label>
                  <p className="text-white">{selectedProduct.brand || "未填写"}</p>
                </div>
                <div>
                  <Label className="text-slate-300 mb-1 block">型号</Label>
                  <p className="text-white">{selectedProduct.model || "未填写"}</p>
                </div>
                <div>
                  <Label className="text-slate-300 mb-1 block">分类</Label>
                  <p className="text-white">
                    {selectedProduct.equipment_categories?.name || "未分类"}
                  </p>
                </div>
                <div>
                  <Label className="text-slate-300 mb-1 block">状态</Label>
                  {getStatusBadge(selectedProduct)}
                </div>
              </div>

              {/* 描述 */}
              {selectedProduct.description && (
                <div>
                  <Label className="text-slate-300 mb-1 block">描述</Label>
                  <p className="text-white bg-slate-800/50 p-3 rounded-lg">
                    {selectedProduct.description}
                  </p>
                </div>
              )}

              {/* 价格信息 */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-slate-300 mb-1 block">月租金</Label>
                  <p className="text-white text-lg font-bold">
                    ¥{selectedProduct.monthly_rental_price.toFixed(2)}
                  </p>
                </div>
                {selectedProduct.daily_rental_price && (
                  <div>
                    <Label className="text-slate-300 mb-1 block">日租金</Label>
                    <p className="text-white">
                      ¥{selectedProduct.daily_rental_price.toFixed(2)}
                    </p>
                  </div>
                )}
                <div>
                  <Label className="text-slate-300 mb-1 block">押金</Label>
                  <p className="text-white">¥{selectedProduct.deposit_amount.toFixed(2)}</p>
                </div>
              </div>

              {/* 租期和服务 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-300 mb-1 block">租期</Label>
                  <p className="text-white">
                    最短 {selectedProduct.min_rental_period} 个月
                    {selectedProduct.max_rental_period &&
                      `，最长 ${selectedProduct.max_rental_period} 个月`}
                  </p>
                </div>
                <div>
                  <Label className="text-slate-300 mb-1 block">服务</Label>
                  <div className="flex gap-2">
                    {selectedProduct.maintenance_included && (
                      <Badge className="bg-green-500/20 text-green-400">含维护</Badge>
                    )}
                    {selectedProduct.delivery_included && (
                      <Badge className="bg-blue-500/20 text-blue-400">含配送</Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* 拒绝原因（如果已拒绝） */}
              {selectedProduct.status === "rejected" && selectedProduct.rejection_reason && (
                <div>
                  <Label className="text-slate-300 mb-1 block">拒绝原因</Label>
                  <p className="text-red-400 bg-red-500/10 p-3 rounded-lg border border-red-500/30">
                    {selectedProduct.rejection_reason}
                  </p>
                </div>
              )}

              {/* 操作按钮 */}
              {selectedProduct.status === "pending" && (
                <div className="space-y-4 pt-4 border-t border-slate-700">
                  <div>
                    <Label className="text-slate-300 mb-2 block">拒绝原因（如果拒绝）</Label>
                    <Textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="请输入拒绝原因..."
                      className="bg-slate-800 border-slate-600 text-white min-h-[80px]"
                    />
                  </div>
                  <div className="flex gap-4">
                    <Button
                      onClick={() => handleApprove(selectedProduct.id, true)}
                      disabled={isApproving}
                      className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
                    >
                      {isApproving ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          处理中...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          批准
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={() => handleApprove(selectedProduct.id, false)}
                      disabled={isApproving || !rejectionReason.trim()}
                      variant="destructive"
                      className="flex-1"
                    >
                      {isApproving ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          处理中...
                        </>
                      ) : (
                        <>
                          <XCircle className="h-4 w-4 mr-2" />
                          拒绝
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}


