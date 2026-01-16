# User-bound 页面错误输出策略替换示例

## 完整修改后的代码示例

### 1. 新建文件：`lib/utils/logger.ts`

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

---

### 2. 修改文件：`app/user-bound/page.tsx`

#### 2.1 添加导入（在文件顶部）

```typescript
import { logBusinessWarning } from "@/lib/utils/logger"
```

#### 2.2 修改后的错误处理代码片段

**位置 1：获取餐厅事实总览（第 112-117 行）**

```typescript
// 修改前：
} else if (overviewResponse.status === 401 || overviewResponse.status === 403) {
  console.error('[User Bound Page] 权限验证失败，请确保已登录')
}
} catch (error) {
  console.error('[User Bound Page] 获取餐厅事实总览失败:', error)
}

// 修改后：
} else if (overviewResponse.status === 401 || overviewResponse.status === 403) {
  logBusinessWarning('User Bound Page', '权限验证失败，请确保已登录')
}
} catch (error) {
  logBusinessWarning('User Bound Page', '获取餐厅事实总览失败', error)
}
```

**位置 2：获取关联资产列表（第 137-146 行）**

```typescript
// 修改前：
} catch (error) {
  console.error('[User Bound Page] 转换资产卡片 ViewModel 失败:', error)
}
// ...
} else if (assetsResponse.status === 401 || assetsResponse.status === 403) {
  console.error('[User Bound Page] 权限验证失败，请确保已登录')
}
} catch (error) {
  console.error('[User Bound Page] 获取关联资产列表失败:', error)
}

// 修改后：
} catch (error) {
  console.warn('[User Bound Page] 转换资产卡片 ViewModel 失败:', error)
}
// ...
} else if (assetsResponse.status === 401 || assetsResponse.status === 403) {
  logBusinessWarning('User Bound Page', '权限验证失败，请确保已登录')
}
} catch (error) {
  logBusinessWarning('User Bound Page', '获取关联资产列表失败', error)
}
```

**位置 3：转换订单时间线 ViewModel（第 206-208 行）**

```typescript
// 修改前：
} catch (error) {
  console.error('[User Bound Page] 转换订单时间线 ViewModel 失败:', error)
}

// 修改后：
} catch (error) {
  console.warn('[User Bound Page] 转换订单时间线 ViewModel 失败:', error)
}
```

**位置 4：转换订单关联资产 ViewModel（第 226-228 行）**

```typescript
// 修改前：
} catch (error) {
  console.error('[User Bound Page] 转换订单关联资产 ViewModel 失败:', error)
}

// 修改后：
} catch (error) {
  console.warn('[User Bound Page] 转换订单关联资产 ViewModel 失败:', error)
}
```

**位置 5：订单事实 API 权限验证（第 231-233 行）**

```typescript
// 修改前：
} else if (orderFactResponse.status === 401 || orderFactResponse.status === 403) {
  console.error('[User Bound Page] 权限验证失败，请确保已登录')
}

// 修改后：
} else if (orderFactResponse.status === 401 || orderFactResponse.status === 403) {
  logBusinessWarning('User Bound Page', '权限验证失败，请确保已登录')
}
```

**位置 6：最近订单 API 权限验证（第 235-237 行）**

```typescript
// 修改前：
} else if (latestOrderResponse.status === 401 || latestOrderResponse.status === 403) {
  console.error('[User Bound Page] 权限验证失败，请确保已登录')
}

// 修改后：
} else if (latestOrderResponse.status === 401 || latestOrderResponse.status === 403) {
  logBusinessWarning('User Bound Page', '权限验证失败，请确保已登录')
}
```

**位置 7：获取最近一次配送失败（第 238-240 行）**

```typescript
// 修改前：
} catch (error) {
  console.error('[User Bound Page] 获取最近一次配送失败:', error)
}

// 修改后：
} catch (error) {
  logBusinessWarning('User Bound Page', '获取最近一次配送失败', error)
}
```

**位置 8：加载事实数据失败（第 242-244 行）**

```typescript
// 修改前：
} catch (error) {
  console.error('[User Bound Page] 加载事实数据失败:', error)
}

// 修改后：
} catch (error) {
  logBusinessWarning('User Bound Page', '加载事实数据失败', error)
}
```

---

## 完整修改后的关键代码段

### 完整的 `loadFactData` 函数（修改后）

```typescript
useEffect(() => {
  const loadFactData = async () => {
    try {
      const savedRestaurantId = typeof window !== "undefined" 
        ? localStorage.getItem("restaurantId") 
        : null

      if (!savedRestaurantId) {
        console.warn('[User Bound Page] 未找到 restaurantId，无法加载事实数据')
        setIsLoading(false)
        return
      }

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
          logBusinessWarning('User Bound Page', '权限验证失败，请确保已登录')
        }
      } catch (error) {
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
              console.warn('[User Bound Page] 转换资产卡片 ViewModel 失败:', error)
            }
          }
        } else if (assetsResponse.status === 401 || assetsResponse.status === 403) {
          logBusinessWarning('User Bound Page', '权限验证失败，请确保已登录')
        }
      } catch (error) {
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
                // ... 处理 fact_warnings ...

                if (orderFactData.order && typeof orderFactData.order === 'object') {
                  try {
                    const timelineViewModel = convertOrderFactsToTimelineViewModel(
                      orderFactData.order,
                      Array.isArray(orderFactData.traces) ? orderFactData.traces : []
                    )
                    setLatestOrderTimeline(timelineViewModel)
                  } catch (error) {
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
                    console.warn('[User Bound Page] 转换订单关联资产 ViewModel 失败:', error)
                  }
                }
              }
            } else if (orderFactResponse.status === 401 || orderFactResponse.status === 403) {
              logBusinessWarning('User Bound Page', '权限验证失败，请确保已登录')
            }
          }
        } else if (latestOrderResponse.status === 401 || latestOrderResponse.status === 403) {
          logBusinessWarning('User Bound Page', '权限验证失败，请确保已登录')
        }
      } catch (error) {
        logBusinessWarning('User Bound Page', '获取最近一次配送失败', error)
      }

    } catch (error) {
      logBusinessWarning('User Bound Page', '加载事实数据失败', error)
    } finally {
      setIsLoading(false)
    }
  }

  loadFactData()
}, [])
```

---

## 修改总结

### 修改统计

- **B类错误（8处）**：`console.error` → `logBusinessWarning` → `console.warn`
  - 权限验证失败（4处）
  - 网络请求失败（4处）

- **C类错误（3处）**：`console.error` → `console.warn`
  - ViewModel 转换失败（3处）

- **A类错误（0处）**：无

### 效果

修改后，所有可预期的业务失败和 ViewModel 转换失败都不会触发 Cursor 的错误监控弹窗，只有真正的系统错误（如果有）才会显示弹窗。
