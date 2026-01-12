# API 治理层与 Fact 挂载现状文档

## 📋 文档说明
本文档详细描述了系统的 API 治理层（Fact Governance Layer）调用分布、数据加载状态、错误边界机制和实时性实现现状，用于指导后续的"全站 UI 自愈与启动动画注入"工作。

**生成时间**：2025-01-20  
**扫描范围**：`app/`、`components/`、`lib/facts/`、所有 API 路由

---

## 一、Fact 治理层的调用分布

### 1.1 API 端点清单

**Fact API 端点**（5 个）：

| 端点 | 文件路径 | 返回结构 | 是否包含 `fact_warnings` |
|------|---------|---------|------------------------|
| `GET /api/facts/orders/:order_id` | `app/api/facts/orders/[order_id]/route.ts` | `{ order, assets, traces, fact_warnings? }` | ✅ 是 |
| `GET /api/facts/restaurant/:restaurant_id/overview` | `app/api/facts/restaurant/[restaurant_id]/overview/route.ts` | `{ active_orders, completed_orders, active_assets, last_delivery_at }` | ❌ 否 |
| `GET /api/facts/restaurant/:restaurant_id/latest-order` | `app/api/facts/restaurant/[restaurant_id]/latest-order/route.ts` | `{ order_id }` | ❌ 否 |
| `GET /api/facts/restaurant/:restaurant_id/assets` | `app/api/facts/restaurant/[restaurant_id]/assets/route.ts` | `{ assets }` | ❌ 否 |

**Fact Governance Layer 实现**：
- **文件**：`lib/facts/governance/order.fact.guard.ts`
- **函数**：`OrderFactGuard(context: OrderFactGovernanceContext)`
- **返回**：`{ fact_warnings: string[] }`

### 1.2 前端调用分布

**使用 Fact API 的页面组件**（1 个）：

| 页面/组件 | 文件路径 | 调用的 API | 是否处理 `fact_warnings` |
|----------|---------|-----------|------------------------|
| `UserBoundPage` | `app/user-bound/page.tsx` | `/api/facts/restaurant/:id/overview`<br>`/api/facts/restaurant/:id/latest-order`<br>`/api/facts/orders/:order_id`<br>`/api/facts/restaurant/:id/assets` | ❌ **静默忽略** |

**关键发现**：

1. **`fact_warnings` 未被处理**：
   - `app/user-bound/page.tsx` 第 144-162 行：调用 `/api/facts/orders/:order_id` 后，只提取 `order`、`assets`、`traces`
   - **未提取 `fact_warnings` 字段**
   - **未显示警告提示**（弹窗或 Toast）

2. **没有使用 `useFactStore`**：
   - 搜索整个代码库，未发现 `useFactStore` 或类似的状态管理 hook
   - 所有 Fact 数据通过 `useState` 直接管理

3. **调用流程**：
   ```
   UserBoundPage 加载
     └─ 1. 获取餐厅事实总览 (overview)
     └─ 2. 获取关联资产列表 (assets)
     └─ 3. 获取最近一次订单 ID (latest-order)
         └─ 4. 获取订单事实详情 (orders/:order_id)
             └─ 返回 fact_warnings（但被忽略）
   ```

### 1.3 Fact Governance Layer 集成状态

**已集成**：
- ✅ `app/api/facts/orders/[order_id]/route.ts` 已调用 `OrderFactGuard`
- ✅ API 返回结构包含 `fact_warnings` 字段

**未集成**：
- ❌ 前端未提取 `fact_warnings`
- ❌ 前端未显示警告提示
- ❌ 没有统一的警告处理机制

**建议**：
- 在 `app/user-bound/page.tsx` 中提取 `fact_warnings`
- 使用 `Toast` 或 `Alert` 组件显示警告（非阻塞式）
- 考虑创建 `useFactWarnings` hook 统一处理

---

## 二、数据加载状态 (Loading States)

### 2.1 统一的加载样式

**当前状态**：❌ **没有统一的加载样式**

**各页面加载状态实现**：

| 页面/组件 | 文件路径 | 加载状态实现 | 样式 |
|----------|---------|------------|------|
| `HomePage` (身份验证) | `app/page.tsx` | 第 262-270 行 | 自定义：`border-primary border-t-transparent animate-spin` + "正在验证身份..." |
| `UserBoundPage` | `app/user-bound/page.tsx` | 第 217-221 行 | 自定义：`Clock animate-spin` + "加载中..." |
| `IoTDashboard` | `components/iot-dashboard.tsx` | 无 | 无加载状态（直接显示模拟数据） |

**问题**：
- 每个页面使用不同的加载样式
- 没有统一的 `LoadingSpinner` 组件
- 加载文案不统一（"正在验证身份..." vs "加载中..."）

### 2.2 身份重定向加载时长

**`app/page.tsx` 身份验证流程**：

1. **启动动画**（如果启用）：
   - 总时长：`0.5s (显现) + 1.2s (波纹) + 0.2s (延迟) + 0.3s (淡出) = 2.2s`
   - 文件：`components/splash-screen.tsx`

2. **身份验证加载**：
   - **超时机制**：10 秒（第 75 行）
   - **实际时长**：取决于网络请求速度（通常 1-3 秒）
   - **加载 UI**：第 262-270 行
     ```tsx
     <div className="min-h-screen bg-background flex items-center justify-center">
       <div className="text-center space-y-4">
         <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
         <p className="text-muted-foreground text-sm">正在验证身份...</p>
       </div>
     </div>
     ```

3. **用户看到的空白页时长**：
   - **如果启动动画启用**：`2.2s (启动动画) + 1-3s (身份验证) = 3.2-5.2s`
   - **如果启动动画禁用**：`1-3s (身份验证)`
   - **超时情况**：最多 10 秒

**关键发现**：
- ✅ 启动动画时长（2.2s）与身份验证时长（1-3s）基本匹配
- ⚠️ 如果身份验证超过 3 秒，用户会看到"正在验证身份..."加载状态
- ✅ 有超时保护机制（10 秒后强制停止）

### 2.3 UserBoundPage 数据加载

**加载流程**（`app/user-bound/page.tsx`）：

1. **初始状态**：`isLoading = true`（第 56 行）
2. **并行请求**（第 70-194 行）：
   - 获取餐厅事实总览
   - 获取关联资产列表
   - 获取最近一次订单 ID
   - 获取订单事实详情
3. **完成状态**：`isLoading = false`（第 189 行）

**加载 UI**（第 217-221 行）：
```tsx
{isLoading ? (
  <div className="flex items-center justify-center py-8 text-muted-foreground">
    <Clock className="w-5 h-5 mr-2 animate-spin" />
    <span className="text-sm">加载中...</span>
  </div>
) : ...}
```

**问题**：
- 没有统一的加载组件
- 加载文案不统一
- 没有加载失败的错误提示

---

## 三、错误边界 (Error Boundaries)

### 3.1 ErrorBoundary 组件检查

**搜索结果**：❌ **未发现 ErrorBoundary 组件**

**检查范围**：
- `app/` 目录：无 `ErrorBoundary`、`componentDidCatch`、`getDerivedStateFromError`
- `components/` 目录：无 `ErrorBoundary` 相关代码

**结论**：
- 系统**没有实现错误边界**
- API 请求失败可能导致组件崩溃
- React 树崩溃时，用户会看到白屏

### 3.2 ThemeProvider 嵌套位置

**`app/layout.tsx` 结构**（第 40-50 行）：

```tsx
<html lang="zh-CN" suppressHydrationWarning>
  <body className={`${inter.className} antialiased`}>
    <ThemeProvider>
      {children}
      <Toaster />
      <Analytics />
    </ThemeProvider>
  </body>
</html>
```

**分析**：
- ✅ `ThemeProvider` 正确嵌套在 `<body>` 内
- ✅ 包裹所有 `children`（所有页面）
- ✅ 包含 `Toaster`（用于显示 Toast 提示）

**潜在问题**：
- ❌ 如果 `ThemeProvider` 内部组件抛出错误，可能导致整个 React 树崩溃
- ❌ 没有错误边界保护 `ThemeProvider`

### 3.3 "useTheme must be used within a ThemeProvider" 报错分析

**可能原因**：

1. **API 请求失败导致组件提前卸载**：
   - 如果 `app/user-bound/page.tsx` 中的 API 请求失败
   - 可能导致组件提前卸载
   - 但 `useTheme` hook 仍在执行
   - 导致报错

2. **ThemeProvider 未正确初始化**：
   - `lib/styles/theme-context.tsx` 第 65-67 行：
     ```tsx
     if (!mounted) {
       return <>{children}</>
     }
     ```
   - 在 `mounted` 之前，`ThemeContext` 可能未正确提供
   - 如果子组件在此时调用 `useTheme`，会报错

3. **服务端渲染（SSR）问题**：
   - Next.js 在服务端渲染时，`localStorage` 不可用
   - `ThemeProvider` 的 `mounted` 状态在客户端才为 `true`
   - 如果服务端组件调用 `useTheme`，会报错

**建议**：
- 添加 `ErrorBoundary` 组件包裹 `ThemeProvider`
- 确保所有使用 `useTheme` 的组件都是客户端组件（`"use client"`）
- 在 API 请求失败时，使用 `try-catch` 捕获错误，避免组件崩溃

---

## 四、实时性实现

### 4.1 Supabase Realtime 使用情况

**已使用 Realtime 的组件**（2 个）：

| 组件 | 文件路径 | 订阅的表/频道 | 用途 |
|------|---------|--------------|------|
| `AdminDashboard` | `app/(admin)/dashboard/page.tsx` | `repairs-realtime-admin` | 监听维修工单变化 |
| `WorkerRepairList` | `components/worker/repair-list.tsx` | `repairs-realtime-worker-{workerId}` | 监听维修工单变化（按工人ID过滤） |

**实现方式**：
```typescript
const channel = supabase
  .channel("repairs-realtime-admin")
  .on(
    "postgres_changes",
    {
      event: "*",
      schema: "public",
      table: "repair_orders",
      filter: "status=eq.pending",
    },
    (payload) => {
      // 处理实时更新
    }
  )
  .subscribe()
```

### 4.2 燃料数据实时性

**`components/iot-dashboard.tsx` 实现**（第 22-29 行）：

```typescript
// 模拟实时数据更新
useEffect(() => {
  const interval = setInterval(() => {
    setFuelLevel((prev) => prev - 0.1)
    setConsumption((prev) => 12 + Math.random() * 2)
  }, 3000)
  return () => clearInterval(interval)
}, [])
```

**关键发现**：
- ❌ **没有使用 Supabase Realtime**
- ❌ **使用 `setInterval` 模拟数据**（每 3 秒更新一次）
- ❌ **数据是硬编码的模拟值**（`fuelLevel = 68`，`consumption = 12.5`）

**结论**：
- 燃料数据**不是实时订阅**
- 目前**全靠页面刷新**（或 `setInterval` 模拟）
- 没有从数据库读取真实的 `fuel_level` 表数据

### 4.3 其他实时数据

**配送员位置更新**（`app/payment/page.tsx` 第 332-347 行）：

```typescript
// 定期更新配送员位置（每30秒）
const interval = setInterval(() => {
  fetch("/api/delivery/location?deliveryId=default")
    .then((res) => res.json())
    .then((data) => {
      // 更新位置
    })
}, 30000)
```

**分析**：
- ❌ 使用 `setInterval` 轮询（每 30 秒）
- ❌ 不是 Supabase Realtime 订阅
- ⚠️ 可能造成不必要的 API 请求

---

## 五、关键问题总结

### 5.1 Fact 治理层问题

| 问题 | 严重程度 | 影响 |
|------|---------|------|
| `fact_warnings` 未被处理 | ⚠️ 中等 | 用户无法看到事实不一致警告 |
| 没有统一的警告处理机制 | ⚠️ 中等 | 未来扩展困难 |
| 没有 `useFactStore` | ℹ️ 低 | 状态管理分散 |

### 5.2 数据加载问题

| 问题 | 严重程度 | 影响 |
|------|---------|------|
| 没有统一的加载样式 | ⚠️ 中等 | UI 不一致 |
| 加载文案不统一 | ℹ️ 低 | 用户体验不一致 |
| 没有加载失败的错误提示 | ⚠️ 中等 | 用户不知道加载失败 |

### 5.3 错误边界问题

| 问题 | 严重程度 | 影响 |
|------|---------|------|
| 没有 ErrorBoundary | 🔴 **高** | API 请求失败可能导致白屏 |
| ThemeProvider 未受保护 | ⚠️ 中等 | 可能导致主题系统崩溃 |

### 5.4 实时性问题

| 问题 | 严重程度 | 影响 |
|------|---------|------|
| 燃料数据使用模拟值 | 🔴 **高** | 无法显示真实数据 |
| 燃料数据未使用 Realtime | ⚠️ 中等 | 需要手动刷新 |
| 配送员位置使用轮询 | ⚠️ 中等 | 可能造成不必要的请求 |

---

## 六、启动动画时长分析

### 6.1 当前启动动画时长

**`components/splash-screen.tsx` 动画序列**：

1. **灶小蜂显现**：`0.5s`
2. **能量波纹**：`1.2s`（最后一道波纹）+ `0.2s`（延迟）= `1.4s`
3. **背景过渡**：`0.3s`（淡出）

**总时长**：`0.5s + 1.4s + 0.3s = 2.2s`

### 6.2 身份验证时长

**`app/page.tsx` 身份验证流程**：

- **最快**：`0.5-1s`（本地缓存 + 快速网络）
- **正常**：`1-3s`（网络请求 + 数据库查询）
- **最慢**：`10s`（超时保护）

### 6.3 用户看到的空白页时长

**场景 1：启动动画启用 + 快速身份验证**
- 启动动画：`2.2s`
- 身份验证：`0.5-1s`
- **总时长**：`2.7-3.2s`

**场景 2：启动动画启用 + 正常身份验证**
- 启动动画：`2.2s`
- 身份验证：`1-3s`
- **总时长**：`3.2-5.2s`

**场景 3：启动动画禁用 + 正常身份验证**
- 启动动画：`0s`
- 身份验证：`1-3s`
- **总时长**：`1-3s`（用户看到"正在验证身份..."加载状态）

**结论**：
- ✅ 启动动画时长（2.2s）与身份验证时长（1-3s）**基本匹配**
- ⚠️ 如果身份验证超过 3 秒，用户会看到"正在验证身份..."加载状态
- ✅ 有超时保护机制（10 秒后强制停止）

---

## 七、建议与改进方案

### 7.1 Fact 治理层改进

**建议 1：提取并显示 `fact_warnings`**

在 `app/user-bound/page.tsx` 中：

```typescript
const [factWarnings, setFactWarnings] = useState<string[]>([])

// 在 API 响应中提取
if (orderFactData.success) {
  setLatestOrder({ ... })
  if (orderFactData.fact_warnings && orderFactData.fact_warnings.length > 0) {
    setFactWarnings(orderFactData.fact_warnings)
    // 使用 Toast 显示警告
    toast({
      title: "事实不一致警告",
      description: orderFactData.fact_warnings.join(", "),
      variant: "warning",
    })
  }
}
```

**建议 2：创建统一的警告处理 Hook**

```typescript
// hooks/use-fact-warnings.ts
export function useFactWarnings() {
  const { toast } = useToast()
  
  const handleFactWarnings = (warnings: string[]) => {
    if (warnings.length > 0) {
      warnings.forEach((warning) => {
        toast({
          title: "事实不一致",
          description: warning,
          variant: "warning",
        })
      })
    }
  }
  
  return { handleFactWarnings }
}
```

### 7.2 数据加载改进

**建议 1：创建统一的加载组件**

```typescript
// components/ui/loading-spinner.tsx
export function LoadingSpinner({ message = "加载中..." }: { message?: string }) {
  return (
    <div className="flex items-center justify-center py-8 text-muted-foreground">
      <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2" />
      <span className="text-sm">{message}</span>
    </div>
  )
}
```

**建议 2：添加加载失败提示**

```typescript
const [error, setError] = useState<string | null>(null)

try {
  // API 请求
} catch (error) {
  setError("加载失败，请重试")
  toast({
    title: "加载失败",
    description: error.message,
    variant: "destructive",
  })
}
```

### 7.3 错误边界改进

**建议 1：添加 ErrorBoundary 组件**

```typescript
// components/error-boundary.tsx
"use client"

import { Component, ReactNode } from "react"

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error("ErrorBoundary caught an error:", error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-bold text-foreground">出错了</h2>
            <p className="text-muted-foreground">{this.state.error?.message}</p>
            <Button onClick={() => window.location.reload()}>重新加载</Button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
```

**建议 2：在 `app/layout.tsx` 中包裹 ThemeProvider**

```tsx
<ErrorBoundary>
  <ThemeProvider>
    {children}
    <Toaster />
    <Analytics />
  </ThemeProvider>
</ErrorBoundary>
```

### 7.4 实时性改进

**建议 1：使用 Supabase Realtime 订阅燃料数据**

```typescript
// components/iot-dashboard.tsx
useEffect(() => {
  const restaurantId = localStorage.getItem("restaurantId")
  if (!restaurantId) return

  const channel = supabase
    .channel(`fuel-level-${restaurantId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "fuel_level",
        filter: `restaurant_id=eq.${restaurantId}`,
      },
      (payload) => {
        if (payload.new) {
          setFuelLevel(payload.new.level)
          setConsumption(payload.new.consumption)
        }
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}, [])
```

**建议 2：移除模拟数据，从数据库读取**

```typescript
useEffect(() => {
  const loadFuelData = async () => {
    const restaurantId = localStorage.getItem("restaurantId")
    if (!restaurantId) return

    const { data, error } = await supabase
      .from("fuel_level")
      .select("level, consumption")
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    if (!error && data) {
      setFuelLevel(data.level)
      setConsumption(data.consumption)
    }
  }

  loadFuelData()
}, [])
```

---

## 八、总结

### 8.1 当前状态

**✅ 已完成**：
- Fact Governance Layer 已实现并集成到 API
- 启动动画已实现（2.2s 时长）
- ThemeProvider 正确嵌套
- 身份验证有超时保护机制

**⚠️ 待改进**：
- `fact_warnings` 未被前端处理
- 没有统一的加载样式
- 没有 ErrorBoundary 保护
- 燃料数据使用模拟值，未使用 Realtime

### 8.2 关键指标

| 指标 | 当前值 | 目标值 |
|------|--------|--------|
| 启动动画时长 | 2.2s | 2.2s（已优化） |
| 身份验证时长 | 1-3s | < 3s |
| 用户空白页时长 | 3.2-5.2s | < 5s |
| Fact 警告处理 | ❌ 未处理 | ✅ 应处理 |
| 错误边界 | ❌ 无 | ✅ 应添加 |
| 实时数据订阅 | ❌ 仅模拟 | ✅ 应使用 Realtime |

### 8.3 下一步行动

**优先级 1（高）**：
1. 添加 ErrorBoundary 组件
2. 提取并显示 `fact_warnings`
3. 使用 Supabase Realtime 订阅燃料数据

**优先级 2（中）**：
4. 创建统一的加载组件
5. 添加加载失败提示
6. 创建统一的警告处理 Hook

**优先级 3（低）**：
7. 优化配送员位置更新（使用 Realtime 替代轮询）
8. 统一加载文案

---

**文档版本**：v1.0  
**最后更新**：2025-01-20  
**维护者**：Cursor AI Assistant
