# User-bound 页面 console.error 分析报告

## 指令 1：列出所有 console.error

### 文件：`app/user-bound/page.tsx`

| 行号 | 错误信息 | 触发条件 | 错误语义 |
|------|---------|---------|---------|
| 113 | `[User Bound Page] 权限验证失败，请确保已登录` | `overviewResponse.status === 401 || overviewResponse.status === 403` | 权限验证失败（401/403） |
| 116 | `[User Bound Page] 获取餐厅事实总览失败:` | `catch (error)` 在获取 overview API 时 | 网络请求异常或 API 错误 |
| 138 | `[User Bound Page] 转换资产卡片 ViewModel 失败:` | `catch (error)` 在 `convertAssetFactToCardViewModel` 转换时 | ViewModel 转换失败 |
| 142 | `[User Bound Page] 权限验证失败，请确保已登录` | `assetsResponse.status === 401 || assetsResponse.status === 403` | 权限验证失败（401/403） |
| 145 | `[User Bound Page] 获取关联资产列表失败:` | `catch (error)` 在获取 assets API 时 | 网络请求异常或 API 错误 |
| 207 | `[User Bound Page] 转换订单时间线 ViewModel 失败:` | `catch (error)` 在 `convertOrderFactsToTimelineViewModel` 转换时 | ViewModel 转换失败 |
| 227 | `[User Bound Page] 转换订单关联资产 ViewModel 失败:` | `catch (error)` 在 `convertAssetFactToCardViewModel` 转换时 | ViewModel 转换失败 |
| 232 | `[User Bound Page] 权限验证失败，请确保已登录` | `orderFactResponse.status === 401 || orderFactResponse.status === 403` | 权限验证失败（401/403） |
| 236 | `[User Bound Page] 权限验证失败，请确保已登录` | `latestOrderResponse.status === 401 || latestOrderResponse.status === 403` | 权限验证失败（401/403） |
| 239 | `[User Bound Page] 获取最近一次配送失败:` | `catch (error)` 在获取 latest-order API 时 | 网络请求异常或 API 错误 |
| 243 | `[User Bound Page] 加载事实数据失败:` | `catch (error)` 在最外层 try-catch 时 | 整体数据加载失败 |

---

## 指令 2：语义分级

### A. 系统不可恢复错误（真正的 bug / crash）

**无** - 所有错误都有降级处理，不会导致页面崩溃。

---

### B. 可预期业务失败（未登录、无权限、无数据）

| 行号 | 错误信息 | 分级 | 说明 |
|------|---------|------|------|
| 113 | `权限验证失败，请确保已登录` | **B** | 401/403 是预期的权限验证失败，用户未登录或无权访问 |
| 142 | `权限验证失败，请确保已登录` | **B** | 同上 |
| 232 | `权限验证失败，请确保已登录` | **B** | 同上 |
| 236 | `权限验证失败，请确保已登录` | **B** | 同上 |
| 116 | `获取餐厅事实总览失败:` | **B** | 网络请求失败是常见的业务场景（网络问题、服务不可用） |
| 145 | `获取关联资产列表失败:` | **B** | 同上 |
| 239 | `获取最近一次配送失败:` | **B** | 同上 |
| 243 | `加载事实数据失败:` | **B** | 整体数据加载失败，但页面仍可正常显示（显示空状态） |

---

### C. 数据适配 / ViewModel 转换失败（非致命）

| 行号 | 错误信息 | 分级 | 说明 |
|------|---------|------|------|
| 138 | `转换资产卡片 ViewModel 失败:` | **C** | ViewModel 转换失败不影响页面其他功能，只是该资产不显示 |
| 207 | `转换订单时间线 ViewModel 失败:` | **C** | ViewModel 转换失败不影响页面其他功能，只是时间线不显示 |
| 227 | `转换订单关联资产 ViewModel 失败:` | **C** | ViewModel 转换失败不影响页面其他功能，只是该资产不显示 |

---

## 指令 3：替换错误输出策略

### 修改方案

#### 1. 创建业务警告日志工具函数

在 `lib/utils/logger.ts` 中创建：

```typescript
/**
 * 业务警告日志工具
 * 
 * 用于记录可预期的业务失败（B类错误）
 * 不会触发 Cursor 的错误监控弹窗
 */
export function logBusinessWarning(context: string, message: string, details?: any) {
  console.warn(`[${context}] ${message}`, details || '')
}
```

#### 2. 修改后的代码示例

### 文件：`app/user-bound/page.tsx`

```typescript
// 在文件顶部添加导入
import { logBusinessWarning } from "@/lib/utils/logger"

// ... 其他导入 ...

export default function UserBoundPage() {
  // ... 现有代码 ...

  useEffect(() => {
    const loadFactData = async () => {
      try {
        // ... 现有代码 ...

        // 2. 获取餐厅事实总览
        try {
          const overviewResponse = await fetch(`/api/facts/restaurant/${savedRestaurantId}/overview`, {
            headers: {
              "x-restaurant-id": savedRestaurantId,
            },
          })
          if (overviewResponse.ok) {
            const overviewData = await overviewResponse.json()
            if (overviewData.success) {
              setRestaurantOverview({
                active_orders: overviewData.active_orders ?? 0,
                completed_orders: overviewData.completed_orders ?? 0,
                active_assets: overviewData.active_assets ?? 0,
                last_delivery_at: overviewData.last_delivery_at ?? null,
              })
            }
          } else if (overviewResponse.status === 401 || overviewResponse.status === 403) {
            // B类错误：改为 logBusinessWarning
            logBusinessWarning('User Bound Page', '权限验证失败，请确保已登录')
          }
        } catch (error) {
          // B类错误：改为 logBusinessWarning
          logBusinessWarning('User Bound Page', '获取餐厅事实总览失败', error)
        }

        // 3. 获取关联资产列表
        try {
          const assetsResponse = await fetch(`/api/facts/restaurant/${savedRestaurantId}/assets`, {
            headers: {
              "x-restaurant-id": savedRestaurantId,
            },
          })
          if (assetsResponse.ok) {
            const assetsData = await assetsResponse.json()
            if (assetsData.success && assetsData.assets && Array.isArray(assetsData.assets)) {
              try {
                const assetViewModels = assetsData.assets
                  .filter((asset: any) => asset && typeof asset === 'object' && asset.asset_id)
                  .map(convertAssetFactToCardViewModel)
                setAssetsList(assetViewModels)
              } catch (error) {
                // C类错误：改为 console.warn
                console.warn('[User Bound Page] 转换资产卡片 ViewModel 失败:', error)
              }
            }
          } else if (assetsResponse.status === 401 || assetsResponse.status === 403) {
            // B类错误：改为 logBusinessWarning
            logBusinessWarning('User Bound Page', '权限验证失败，请确保已登录')
          }
        } catch (error) {
          // B类错误：改为 logBusinessWarning
          logBusinessWarning('User Bound Page', '获取关联资产列表失败', error)
        }

        // 4. 获取最近一次配送订单的事实数据
        try {
          const latestOrderResponse = await fetch(`/api/facts/restaurant/${savedRestaurantId}/latest-order`, {
            headers: {
              "x-restaurant-id": savedRestaurantId,
            },
          })
          if (latestOrderResponse.ok) {
            const latestOrderData = await latestOrderResponse.json()
            if (latestOrderData.success && latestOrderData.order_id) {
              const orderFactResponse = await fetch(`/api/facts/orders/${latestOrderData.order_id}`, {
                headers: {
                  "x-restaurant-id": savedRestaurantId,
                },
              })
              if (orderFactResponse.ok) {
                const orderFactData = await orderFactResponse.json()
                if (orderFactData.success && orderFactData.order) {
                  // ... 现有代码 ...

                  if (orderFactData.order && typeof orderFactData.order === 'object') {
                    try {
                      const timelineViewModel = convertOrderFactsToTimelineViewModel(
                        orderFactData.order,
                        Array.isArray(orderFactData.traces) ? orderFactData.traces : []
                      )
                      setLatestOrderTimeline(timelineViewModel)
                    } catch (error) {
                      // C类错误：改为 console.warn
                      console.warn('[User Bound Page] 转换订单时间线 ViewModel 失败:', error)
                    }
                  }
                  
                  if (orderFactData.assets && Array.isArray(orderFactData.assets) && orderFactData.assets.length > 0) {
                    try {
                      const newAssetViewModels = orderFactData.assets
                        .filter((asset: any) => asset && typeof asset === 'object' && asset.asset_id)
                        .map(convertAssetFactToCardViewModel)
                      setAssetsList((prev) => {
                        const existingIds = new Set(prev.map((a) => a.assetId))
                        const newAssets = newAssetViewModels.filter(
                          (a) => !existingIds.has(a.assetId)
                        )
                        return [...prev, ...newAssets]
                      })
                    } catch (error) {
                      // C类错误：改为 console.warn
                      console.warn('[User Bound Page] 转换订单关联资产 ViewModel 失败:', error)
                    }
                  }
                }
              } else if (orderFactResponse.status === 401 || orderFactResponse.status === 403) {
                // B类错误：改为 logBusinessWarning
                logBusinessWarning('User Bound Page', '权限验证失败，请确保已登录')
              }
            }
          } else if (latestOrderResponse.status === 401 || latestOrderResponse.status === 403) {
            // B类错误：改为 logBusinessWarning
            logBusinessWarning('User Bound Page', '权限验证失败，请确保已登录')
          }
        } catch (error) {
          // B类错误：改为 logBusinessWarning
          logBusinessWarning('User Bound Page', '获取最近一次配送失败', error)
        }

      } catch (error) {
        // B类错误：改为 logBusinessWarning
        logBusinessWarning('User Bound Page', '加载事实数据失败', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadFactData()
  }, [])

  // ... 其余代码保持不变 ...
}
```

---

## 完整修改清单

### 需要创建的文件

**`lib/utils/logger.ts`** (新建)

```typescript
/**
 * 业务警告日志工具
 * 
 * 用于记录可预期的业务失败（B类错误）
 * 不会触发 Cursor 的错误监控弹窗
 */
export function logBusinessWarning(context: string, message: string, details?: any) {
  console.warn(`[${context}] ${message}`, details || '')
}
```

### 需要修改的文件

**`app/user-bound/page.tsx`**

- 第 113 行：`console.error` → `logBusinessWarning` (B类)
- 第 116 行：`console.error` → `logBusinessWarning` (B类)
- 第 138 行：`console.error` → `console.warn` (C类)
- 第 142 行：`console.error` → `logBusinessWarning` (B类)
- 第 145 行：`console.error` → `logBusinessWarning` (B类)
- 第 207 行：`console.error` → `console.warn` (C类)
- 第 227 行：`console.error` → `console.warn` (C类)
- 第 232 行：`console.error` → `logBusinessWarning` (B类)
- 第 236 行：`console.error` → `logBusinessWarning` (B类)
- 第 239 行：`console.error` → `logBusinessWarning` (B类)
- 第 243 行：`console.error` → `logBusinessWarning` (B类)

---

## 修改效果

### 修改前
- 所有错误都使用 `console.error`
- Cursor 会捕获所有 `console.error` 并显示弹窗
- 即使是可预期的业务失败也会触发弹窗

### 修改后
- B类错误（可预期业务失败）使用 `logBusinessWarning` → `console.warn`
- C类错误（ViewModel 转换失败）使用 `console.warn`
- A类错误（系统不可恢复错误）保留 `console.error`（当前无）
- Cursor 只会在真正的系统错误时显示弹窗

---

## 总结

- **B类错误（8个）**：改为 `logBusinessWarning` → `console.warn`
- **C类错误（3个）**：改为 `console.warn`
- **A类错误（0个）**：无

修改后，Cursor 不会再因为可预期的业务失败（权限验证、网络请求失败、ViewModel 转换失败）而显示错误弹窗。
