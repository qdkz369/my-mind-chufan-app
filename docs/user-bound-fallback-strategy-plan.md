# User-bound 页面首屏降级策略规划

## 📋 当前状态

### 现有逻辑

```typescript
// app/user-bound/page.tsx (第 87-91 行)
if (!savedRestaurantId) {
  console.warn('[User Bound Page] 未找到 restaurantId，无法加载事实数据')
  setIsLoading(false)
  return
}
```

**问题**：
- ✅ 数据失败 ≠ 页面失败（正确）
- ❌ 缺少视觉级兜底
- ❌ 用户看到空白页面，不知道发生了什么

---

## 🎯 降级策略规划

### 策略 1：无 restaurantId 时显示降级页面

**触发条件**：
- `localStorage` 中没有 `restaurantId`
- 用户首次访问或数据被清除

**降级方案**：
```typescript
if (!savedRestaurantId) {
  return <UserUnboundFallback />
}
```

**组件设计**：
```typescript
function UserUnboundFallback() {
  return (
    <main className="min-h-screen bg-background pb-20">
      <Header />
      <div className="container mx-auto px-4 py-6">
        <Card className="theme-card p-6">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold">未找到餐厅信息</h2>
            <p className="text-sm text-muted-foreground">
              请先完成餐厅注册或登录
            </p>
            <Button asChild>
              <Link href="/login">前往登录</Link>
            </Button>
          </div>
        </Card>
      </div>
      <BottomNavigation />
    </main>
  )
}
```

---

### 策略 2：数据加载失败时显示降级页面

**触发条件**：
- API 请求全部失败
- 网络连接失败
- 权限验证失败（401/403）

**降级方案**：
```typescript
const [hasDataError, setHasDataError] = useState(false)

// 在所有 API 请求失败时
if (allRequestsFailed) {
  setHasDataError(true)
}

// 渲染时
if (hasDataError && !isLoading) {
  return <DataLoadErrorFallback onRetry={loadFactData} />
}
```

**组件设计**：
```typescript
function DataLoadErrorFallback({ onRetry }: { onRetry: () => void }) {
  return (
    <main className="min-h-screen bg-background pb-20">
      <Header />
      <div className="container mx-auto px-4 py-6">
        <Card className="theme-card p-6">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center">
              <WifiOff className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold">数据加载失败</h2>
            <p className="text-sm text-muted-foreground">
              无法连接到服务器，请检查网络连接
            </p>
            <Button onClick={onRetry}>
              <RefreshCw className="w-4 h-4 mr-2" />
              重试
            </Button>
          </div>
        </Card>
      </div>
      <BottomNavigation />
    </main>
  )
}
```

---

### 策略 3：部分数据加载成功时显示部分内容

**触发条件**：
- 部分 API 请求成功
- 部分 API 请求失败
- ViewModel 转换部分失败

**降级方案**：
```typescript
// 只显示成功加载的数据
{restaurantOverview && (
  <Card>显示订单统计</Card>
)}

{latestOrderTimeline ? (
  <OrderTimeline viewModel={latestOrderTimeline} />
) : (
  <Card className="theme-card p-6">
    <div className="text-center text-muted-foreground text-sm">
      暂无配送记录
    </div>
  </Card>
)}

{assetsList.length > 0 ? (
  <AssetList assets={assetsList} />
) : (
  <Card className="theme-card p-6">
    <div className="text-center text-muted-foreground text-sm">
      暂无关联资产
    </div>
  </Card>
)}
```

---

## 📊 降级策略决策树

```
用户访问 /user-bound
  │
  ├─ 是否有 restaurantId？
  │   ├─ 否 → 显示 <UserUnboundFallback />
  │   └─ 是 → 继续
  │
  ├─ 是否所有 API 请求都失败？
  │   ├─ 是 → 显示 <DataLoadErrorFallback />
  │   └─ 否 → 继续
  │
  ├─ 是否有部分数据加载成功？
  │   ├─ 是 → 显示成功的数据 + 空状态提示
  │   └─ 否 → 显示 <DataLoadErrorFallback />
  │
  └─ 所有数据加载成功 → 正常显示
```

---

## 🎨 降级组件设计

### 1. UserUnboundFallback

**用途**：用户未绑定餐厅时显示

**设计要点**：
- 清晰的图标（AlertCircle）
- 明确的提示文字
- 操作按钮（前往登录/注册）

**视觉层级**：
- 使用 `theme-card` 保持主题一致性
- 使用 `text-muted-foreground` 表示次要信息
- 使用 `Button` 提供明确的操作入口

---

### 2. DataLoadErrorFallback

**用途**：数据加载失败时显示

**设计要点**：
- 清晰的图标（WifiOff / AlertCircle）
- 明确的错误提示
- 重试按钮

**视觉层级**：
- 使用 `theme-card` 保持主题一致性
- 使用 `text-muted-foreground` 表示次要信息
- 使用 `Button` 提供重试操作

---

### 3. PartialDataFallback

**用途**：部分数据加载成功时显示空状态

**设计要点**：
- 不显示错误信息（因为部分数据已成功）
- 只显示空状态提示
- 保持页面结构完整

**视觉层级**：
- 使用 `theme-card` 保持主题一致性
- 使用 `text-muted-foreground` 表示空状态
- 不显示错误图标（避免误导用户）

---

## 🔄 实现优先级

### 优先级 1：UserUnboundFallback（必须）

**原因**：
- 用户首次访问时最常见的情况
- 需要明确的引导（前往登录/注册）
- 避免用户看到空白页面

**实现位置**：
```typescript
// app/user-bound/page.tsx
if (!savedRestaurantId) {
  return <UserUnboundFallback />
}
```

---

### 优先级 2：DataLoadErrorFallback（强烈建议）

**原因**：
- 网络问题或服务器错误时提供重试机制
- 避免用户看到空白页面
- 提升用户体验

**实现位置**：
```typescript
// app/user-bound/page.tsx
const [hasDataError, setHasDataError] = useState(false)

// 在所有 API 请求失败时
if (allRequestsFailed && !isLoading) {
  return <DataLoadErrorFallback onRetry={loadFactData} />
}
```

---

### 优先级 3：PartialDataFallback（建议）

**原因**：
- 部分数据加载成功时，仍可显示部分内容
- 避免完全空白页面
- 提升用户体验

**实现位置**：
```typescript
// app/user-bound/page.tsx
// 在渲染时，对每个数据块进行条件渲染
{restaurantOverview ? (
  <Card>显示订单统计</Card>
) : (
  <Card className="theme-card p-6">
    <div className="text-center text-muted-foreground text-sm">
      暂无订单数据
    </div>
  </Card>
)}
```

---

## 📝 实现检查清单

### UserUnboundFallback
- [ ] 创建 `components/user-unbound-fallback.tsx`
- [ ] 在 `app/user-bound/page.tsx` 中导入并使用
- [ ] 检查 `restaurantId` 是否存在
- [ ] 提供明确的引导（前往登录/注册）

### DataLoadErrorFallback
- [ ] 创建 `components/data-load-error-fallback.tsx`
- [ ] 在 `app/user-bound/page.tsx` 中导入并使用
- [ ] 跟踪所有 API 请求的状态
- [ ] 提供重试机制

### PartialDataFallback
- [ ] 对每个数据块进行条件渲染
- [ ] 显示空状态提示
- [ ] 保持页面结构完整

---

## 🎯 最终目标

**用户体验**：
- ✅ 用户永远不会看到空白页面
- ✅ 所有错误情况都有明确的视觉反馈
- ✅ 提供明确的操作指引（登录、重试等）

**开发体验**：
- ✅ 清晰的降级策略
- ✅ 可复用的降级组件
- ✅ 易于维护和扩展

---

## 📚 相关文档

- `docs/error-policy.md` - 错误输出规范
- `docs/user-bound-console-error-analysis.md` - user-bound 页面错误分析
- `docs/user-bound-error-strategy-replacement-example.md` - 错误策略替换示例
