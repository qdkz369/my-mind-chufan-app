"use client"

import { useState } from "react"
import { Search, Filter, TrendingUp, Package, ShoppingCart } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const categories = [
  { id: "fresh", name: "生鲜食材", count: 1280 },
  { id: "seasoning", name: "调味品", count: 560 },
  { id: "frozen", name: "速冻食品", count: 420 },
  { id: "drinks", name: "酒水饮料", count: 380 },
  { id: "grain", name: "粮油米面", count: 320 },
  { id: "packaging", name: "包装耗材", count: 280 },
]

const products = [
  {
    id: 1,
    name: "精选猪五花肉",
    spec: "5kg/件",
    price: 138,
    originalPrice: 168,
    unit: "件",
    sales: 1280,
    tag: "爆款",
    image: "/grilled-pork-chop.png",
    category: "fresh",
  },
  {
    id: 2,
    name: "AA级鸡蛋",
    spec: "30枚/箱",
    price: 45,
    originalPrice: 52,
    unit: "箱",
    sales: 980,
    tag: "新品",
    image: "/assorted-eggs.png",
    category: "fresh",
  },
  {
    id: 3,
    name: "海天生抽酱油",
    spec: "1.9L×6瓶",
    price: 85,
    originalPrice: 98,
    unit: "箱",
    sales: 2150,
    tag: "热销",
    image: "/soy-sauce.jpg",
    category: "seasoning",
  },
  {
    id: 4,
    name: "金龙鱼调和油",
    spec: "5L×4桶",
    price: 235,
    originalPrice: 268,
    unit: "箱",
    sales: 1560,
    tag: "品牌",
    image: "/cooking-oil.jpg",
    category: "grain",
  },
  {
    id: 5,
    name: "速冻水饺",
    spec: "1kg×10袋",
    price: 168,
    originalPrice: 198,
    unit: "箱",
    sales: 890,
    tag: "优选",
    image: "/assorted-dumplings.png",
    category: "frozen",
  },
  {
    id: 6,
    name: "可口可乐",
    spec: "330ml×24罐",
    price: 56,
    originalPrice: 68,
    unit: "箱",
    sales: 3200,
    tag: "爆款",
    image: "/classic-coca-cola.png",
    category: "drinks",
  },
]

const hotKeywords = ["猪肉", "牛肉", "鸡蛋", "调和油", "酱油", "可乐"]

export function MallContent() {
  const [cartCount, setCartCount] = useState(3)

  return (
    <div className="container mx-auto px-4 py-6">
      {/* 搜索栏 */}
      <div className="mb-6">
        <div className="flex gap-3 mb-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索商品、品牌、分类..."
              className="pl-10 theme-input text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <Button variant="outline" size="icon" className="theme-button">
            <Filter className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="theme-button relative">
            <ShoppingCart className="h-4 w-4" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </Button>
        </div>

        {/* 热门搜索 */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">热门：</span>
          {hotKeywords.map((keyword) => (
            <Badge key={keyword} variant="secondary" className="bg-secondary text-secondary-foreground hover:bg-secondary/80">
              {keyword}
            </Badge>
          ))}
        </div>
      </div>

      {/* 数据看板 */}
      <Card className="theme-card bg-gradient-to-br from-primary to-accent border-0 p-4 mb-6 text-primary-foreground">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="text-xs opacity-90 mb-1">本月采购</div>
            <div className="text-2xl font-bold">¥42,680</div>
            <div className="text-xs opacity-75 flex items-center gap-1 mt-1">
              <TrendingUp className="h-3 w-3" />
              节省18%
            </div>
          </div>
          <div>
            <div className="text-xs opacity-90 mb-1">本周订单</div>
            <div className="text-2xl font-bold">23单</div>
            <div className="text-xs opacity-75 mt-1">平均满意度98%</div>
          </div>
          <div>
            <div className="text-xs opacity-90 mb-1">配送准时率</div>
            <div className="text-2xl font-bold">99.2%</div>
            <div className="text-xs opacity-75 mt-1">24小时送达</div>
          </div>
        </div>
      </Card>

      {/* 分类和商品 */}
      <Tabs defaultValue="fresh" className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto theme-card mb-4 flex-nowrap">
          {categories.map((cat) => (
            <TabsTrigger
              key={cat.id}
              value={cat.id}
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground whitespace-nowrap"
            >
              {cat.name}
              <Badge variant="secondary" className="ml-2 bg-secondary text-secondary-foreground text-xs">
                {cat.count}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>

        {categories.map((cat) => (
          <TabsContent key={cat.id} value={cat.id} className="mt-0">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {products
                .filter((p) => p.category === cat.id)
                .map((product) => (
                  <Card
                    key={product.id}
                    className="theme-card overflow-hidden hover:border-primary/50 transition-all cursor-pointer group"
                  >
                    <div className="relative">
                      <img
                        src={product.image || "/placeholder.svg"}
                        alt={product.name}
                        className="w-full h-40 object-cover group-hover:scale-105 transition-transform"
                      />
                      {product.tag && (
                        <Badge className="absolute top-2 left-2 bg-destructive text-destructive-foreground border-0">{product.tag}</Badge>
                      )}
                    </div>
                    <div className="p-3">
                      <h3 className="font-semibold text-foreground text-sm mb-1 line-clamp-1">{product.name}</h3>
                      <p className="text-xs text-muted-foreground mb-2">{product.spec}</p>
                      <div className="flex items-end justify-between mb-3">
                        <div>
                          <div className="text-red-500 font-bold text-lg">
                            ¥{product.price}
                            <span className="text-xs font-normal">/{product.unit}</span>
                          </div>
                          <div className="text-xs text-muted-foreground line-through">¥{product.originalPrice}</div>
                        </div>
                        <div className="text-xs text-muted-foreground">已售{product.sales}</div>
                      </div>
                      <Button
                        size="sm"
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground theme-button"
                        onClick={() => setCartCount(cartCount + 1)}
                      >
                        <Package className="h-4 w-4 mr-1" />
                        加入购物车
                      </Button>
                    </div>
                  </Card>
                ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
