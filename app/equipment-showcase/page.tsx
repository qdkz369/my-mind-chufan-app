"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Package, DollarSign, Calendar, CheckCircle2 } from "lucide-react"
import Image from "next/image"
import { logBusinessWarning } from "@/lib/utils/logger"

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
  companies?: {
    id: string
    name: string
  }
  equipment_categories?: {
    id: string
    name: string
    icon?: string
  }
}

export default function EquipmentShowcasePage() {
  const [equipment, setEquipment] = useState<EquipmentCatalog[]>([])
  const [filteredEquipment, setFilteredEquipment] = useState<EquipmentCatalog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [categories, setCategories] = useState<any[]>([])

  // 加载产品列表
  useEffect(() => {
    const loadEquipment = async () => {
      setIsLoading(true)
      try {
        const response = await fetch("/api/equipment/catalog/list?is_approved=true")
        const result = await response.json()
        
        if (result.success && result.data) {
          setEquipment(result.data)
          setFilteredEquipment(result.data)
        }
      } catch (error) {
        logBusinessWarning('设备展示墙', '加载失败', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadEquipment()
  }, [])

  // 加载分类列表
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await fetch("/api/equipment/categories")
        const result = await response.json()
        if (result.success && result.data) {
          setCategories(result.data)
        }
      } catch (error) {
        logBusinessWarning('设备展示墙', '加载分类失败', error)
      }
    }
    loadCategories()
  }, [])

  // 搜索和筛选
  useEffect(() => {
    let filtered = [...equipment]

    // 搜索过滤
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter((item) => {
        return (
          item.name.toLowerCase().includes(query) ||
          item.brand?.toLowerCase().includes(query) ||
          item.model?.toLowerCase().includes(query) ||
          item.description?.toLowerCase().includes(query)
        )
      })
    }

    // 分类过滤
    if (selectedCategory) {
      filtered = filtered.filter((item) => item.equipment_categories?.id === selectedCategory)
    }

    setFilteredEquipment(filtered)
  }, [searchQuery, selectedCategory, equipment])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
      {/* 头部 */}
      <div className="bg-slate-900/80 backdrop-blur-lg border-b border-slate-800 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">设备展示墙</h1>
              <p className="text-slate-400">浏览所有可租赁的设备</p>
            </div>
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              已审核
            </Badge>
          </div>

          {/* 搜索栏 */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
            <Input
              placeholder="搜索设备名称、品牌、型号..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
            />
          </div>

          {/* 分类筛选 */}
          {categories.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedCategory === null ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(null)}
                className={selectedCategory === null ? "bg-blue-600 text-white" : "bg-slate-800/50 border-slate-700 text-slate-300"}
              >
                全部
              </Button>
              {categories.map((category) => (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category.id)}
                  className={selectedCategory === category.id ? "bg-blue-600 text-white" : "bg-slate-800/50 border-slate-700 text-slate-300"}
                >
                  {category.name}
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 内容区域 */}
      <div className="container mx-auto px-4 py-8">
        {isLoading ? (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            <p className="text-slate-400 mt-4">加载中...</p>
          </div>
        ) : filteredEquipment.length === 0 ? (
          <div className="text-center py-20">
            <Package className="h-16 w-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 text-lg">暂无设备</p>
            <p className="text-slate-500 text-sm mt-2">
              {searchQuery || selectedCategory ? "没有找到匹配的设备" : "还没有设备上架"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredEquipment.map((item) => (
              <Card
                key={item.id}
                className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm hover:border-blue-500/50 transition-all duration-300 overflow-hidden group"
              >
                {/* 图片 */}
                <div className="relative w-full h-48 bg-slate-900 overflow-hidden">
                  {item.images && item.images.length > 0 ? (
                    <Image
                      src={item.images[0]}
                      alt={item.name}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
                      <Package className="h-16 w-16 text-slate-600" />
                    </div>
                  )}
                  {item.companies && (
                    <Badge className="absolute top-2 right-2 bg-blue-500/20 text-blue-400 border-blue-500/30">
                      {item.companies.name}
                    </Badge>
                  )}
                </div>

                {/* 内容 */}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-white mb-1 line-clamp-1">
                        {item.name}
                      </h3>
                      {(item.brand || item.model) && (
                        <p className="text-sm text-slate-400">
                          {item.brand} {item.model}
                        </p>
                      )}
                    </div>
                  </div>

                  {item.description && (
                    <p className="text-sm text-slate-300 mb-4 line-clamp-2">
                      {item.description}
                    </p>
                  )}

                  {/* 价格信息 */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-400">月租金</span>
                      <span className="text-lg font-bold text-white">
                        ¥{item.monthly_rental_price.toFixed(2)}
                      </span>
                    </div>
                    {item.daily_rental_price && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-400">日租金</span>
                        <span className="text-sm text-slate-300">
                          ¥{item.daily_rental_price.toFixed(2)}
                        </span>
                      </div>
                    )}
                    {item.deposit_amount > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-400">押金</span>
                        <span className="text-sm text-slate-300">
                          ¥{item.deposit_amount.toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* 租期信息 */}
                  <div className="flex items-center gap-4 text-xs text-slate-400 mb-4">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>最短{item.min_rental_period}个月</span>
                    </div>
                    {item.max_rental_period && (
                      <span>最长{item.max_rental_period}个月</span>
                    )}
                  </div>

                  {/* 服务标签 */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {item.maintenance_included && (
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                        含维护
                      </Badge>
                    )}
                    {item.delivery_included && (
                      <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">
                        含配送
                      </Badge>
                    )}
                  </div>

                  {/* 操作按钮 */}
                  <Button
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white"
                    onClick={() => {
                      // TODO: 跳转到租赁页面或打开详情对话框
                      alert(`准备租赁：${item.name}`)
                    }}
                  >
                    <DollarSign className="h-4 w-4 mr-2" />
                    立即租赁
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* 统计信息 */}
        {!isLoading && filteredEquipment.length > 0 && (
          <div className="mt-8 text-center text-slate-400 text-sm">
            共找到 {filteredEquipment.length} 个设备
          </div>
        )}
      </div>
    </div>
  )
}


