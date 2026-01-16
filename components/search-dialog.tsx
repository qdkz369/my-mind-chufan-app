"use client"

import { useState, useEffect, useRef } from "react"
import { Search, Loader2, Package, Wrench, Zap, ArrowRight } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { useRouter } from "next/navigation"

interface SearchResult {
  id: string
  type: "order" | "device" | "repair"
  title: string
  description: string
  status?: string
  amount?: number
  created_at: string
  url: string
}

interface SearchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  restaurantId: string | null
}

export function SearchDialog({ open, onOpenChange, restaurantId }: SearchDialogProps) {
  const router = useRouter()
  const [keyword, setKeyword] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [results, setResults] = useState<{
    orders: SearchResult[]
    devices: SearchResult[]
    repairs: SearchResult[]
  }>({
    orders: [],
    devices: [],
    repairs: [],
  })
  const [hasSearched, setHasSearched] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // 聚焦输入框
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
    }
  }, [open])

  // 搜索
  const handleSearch = async () => {
    if (!keyword.trim() || !restaurantId) {
      return
    }

    setIsSearching(true)
    setHasSearched(true)

    try {
      const response = await fetch(
        `/api/search?keyword=${encodeURIComponent(keyword)}&restaurant_id=${restaurantId}`
      )
      const result = await response.json()

      if (result.success) {
        setResults(result.data || { orders: [], devices: [], repairs: [] })
      } else {
        setResults({ orders: [], devices: [], repairs: [] })
      }
    } catch (error) {
      console.error("[搜索] 搜索失败:", error)
      setResults({ orders: [], devices: [], repairs: [] })
    } finally {
      setIsSearching(false)
    }
  }

  // 回车搜索
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch()
    }
  }

  // 点击结果项
  const handleResultClick = (url: string) => {
    onOpenChange(false)
    router.push(url)
  }

  // 获取类型图标
  const getTypeIcon = (type: string) => {
    switch (type) {
      case "order":
        return <Package className="h-4 w-4" />
      case "device":
        return <Zap className="h-4 w-4" />
      case "repair":
        return <Wrench className="h-4 w-4" />
      default:
        return <Package className="h-4 w-4" />
    }
  }

  // 获取类型标签
  const getTypeLabel = (type: string) => {
    switch (type) {
      case "order":
        return "订单"
      case "device":
        return "设备"
      case "repair":
        return "报修"
      default:
        return type
    }
  }

  const totalResults = results.orders.length + results.devices.length + results.repairs.length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white">搜索</DialogTitle>
          <DialogDescription className="text-slate-400">
            搜索订单、设备、报修等信息
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              ref={inputRef}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入关键词搜索..."
              className="bg-slate-800 border-slate-600 text-white pl-10"
            />
          </div>
          <Button
            onClick={handleSearch}
            disabled={isSearching || !keyword.trim()}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isSearching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isSearching ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
              <span className="ml-2 text-slate-400">搜索中...</span>
            </div>
          ) : hasSearched ? (
            totalResults === 0 ? (
              <div className="text-center py-12 text-slate-400">
                未找到相关结果
              </div>
            ) : (
              <div className="space-y-4">
                {/* 订单结果 */}
                {results.orders.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-400 mb-2">订单</h3>
                    <div className="space-y-2">
                      {results.orders.map((item) => (
                        <Card
                          key={item.id}
                          className="bg-slate-800/50 border-slate-700 p-3 hover:border-blue-500/50 cursor-pointer transition-colors"
                          onClick={() => handleResultClick(item.url)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3 flex-1">
                              <div className="mt-0.5">{getTypeIcon(item.type)}</div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-white font-medium">{item.title}</span>
                                  <Badge variant="outline" className="text-xs">
                                    {getTypeLabel(item.type)}
                                  </Badge>
                                </div>
                                <p className="text-sm text-slate-400">{item.description}</p>
                                {item.amount && (
                                  <p className="text-xs text-slate-500 mt-1">
                                    ¥{item.amount.toFixed(2)}
                                  </p>
                                )}
                              </div>
                            </div>
                            <ArrowRight className="h-4 w-4 text-slate-500" />
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* 设备结果 */}
                {results.devices.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-400 mb-2">设备</h3>
                    <div className="space-y-2">
                      {results.devices.map((item) => (
                        <Card
                          key={item.id}
                          className="bg-slate-800/50 border-slate-700 p-3 hover:border-blue-500/50 cursor-pointer transition-colors"
                          onClick={() => handleResultClick(item.url)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3 flex-1">
                              <div className="mt-0.5">{getTypeIcon(item.type)}</div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-white font-medium">{item.title}</span>
                                  <Badge variant="outline" className="text-xs">
                                    {getTypeLabel(item.type)}
                                  </Badge>
                                </div>
                                <p className="text-sm text-slate-400">{item.description}</p>
                              </div>
                            </div>
                            <ArrowRight className="h-4 w-4 text-slate-500" />
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* 报修结果 */}
                {results.repairs.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-400 mb-2">报修</h3>
                    <div className="space-y-2">
                      {results.repairs.map((item) => (
                        <Card
                          key={item.id}
                          className="bg-slate-800/50 border-slate-700 p-3 hover:border-blue-500/50 cursor-pointer transition-colors"
                          onClick={() => handleResultClick(item.url)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3 flex-1">
                              <div className="mt-0.5">{getTypeIcon(item.type)}</div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-white font-medium">{item.title}</span>
                                  <Badge variant="outline" className="text-xs">
                                    {getTypeLabel(item.type)}
                                  </Badge>
                                </div>
                                <p className="text-sm text-slate-400">{item.description}</p>
                                {item.status && (
                                  <p className="text-xs text-slate-500 mt-1">状态: {item.status}</p>
                                )}
                              </div>
                            </div>
                            <ArrowRight className="h-4 w-4 text-slate-500" />
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          ) : (
            <div className="text-center py-12 text-slate-400">
              输入关键词开始搜索
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
