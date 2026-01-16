# app/user-bound/page.tsx Console.error 替换检查报告

## ❌ 检查结果：未完成替换

### 当前状态

- **文件路径**：`app/user-bound/page.tsx`
- **检查时间**：当前
- **替换状态**：❌ **未完成**

---

## 📊 详细统计

### Console.error 剩余数量：11 处

| 行号 | 代码 | 错误类型 | 应替换为 | 当前状态 |
|------|------|---------|---------|---------|
| 113 | `console.error('[User Bound Page] 权限验证失败，请确保已登录')` | **B类** | `logBusinessWarning` | ❌ 未替换 |
| 116 | `console.error('[User Bound Page] 获取餐厅事实总览失败:', error)` | **B类** | `logBusinessWarning` | ❌ 未替换 |
| 138 | `console.error('[User Bound Page] 转换资产卡片 ViewModel 失败:', error)` | **C类** | `console.warn` | ❌ 未替换 |
| 142 | `console.error('[User Bound Page] 权限验证失败，请确保已登录')` | **B类** | `logBusinessWarning` | ❌ 未替换 |
| 145 | `console.error('[User Bound Page] 获取关联资产列表失败:', error)` | **B类** | `logBusinessWarning` | ❌ 未替换 |
| 207 | `console.error('[User Bound Page] 转换订单时间线 ViewModel 失败:', error)` | **C类** | `console.warn` | ❌ 未替换 |
| 227 | `console.error('[User Bound Page] 转换订单关联资产 ViewModel 失败:', error)` | **C类** | `console.warn` | ❌ 未替换 |
| 232 | `console.error('[User Bound Page] 权限验证失败，请确保已登录')` | **B类** | `logBusinessWarning` | ❌ 未替换 |
| 236 | `console.error('[User Bound Page] 权限验证失败，请确保已登录')` | **B类** | `logBusinessWarning` | ❌ 未替换 |
| 239 | `console.error('[User Bound Page] 获取最近一次配送失败:', error)` | **B类** | `logBusinessWarning` | ❌ 未替换 |
| 243 | `console.error('[User Bound Page] 加载事实数据失败:', error)` | **B类** | `logBusinessWarning` | ❌ 未替换 |

### 错误类型分布

- **B类错误（可预期业务失败）**：8 处
  - 权限验证失败：4 处（行 113, 142, 232, 236）
  - 获取数据失败：3 处（行 116, 145, 239）
  - 加载数据失败：1 处（行 243）

- **C类错误（数据适配/ViewModel转换失败）**：3 处
  - 转换资产卡片 ViewModel 失败：1 处（行 138）
  - 转换订单时间线 ViewModel 失败：1 处（行 207）
  - 转换订单关联资产 ViewModel 失败：1 处（行 227）

---

## 🔍 导入检查

### ❌ 未导入 logBusinessWarning

**当前导入语句**（第 1-38 行）：
```typescript
import { useEffect, useState } from "react"
import { useTheme } from "@/lib/styles/theme-context"
import { Header } from "@/components/header"
import { IoTDashboard } from "@/components/iot-dashboard"
import { BottomNavigation } from "@/components/bottom-navigation"
import { OrderTimeline } from "@/components/facts/OrderTimeline"
import { AssetFactCard } from "@/components/facts/AssetFactCard"
import { convertOrderFactsToTimelineViewModel, OrderTimelineViewModel } from "@/lib/facts-ui/orderTimeline.viewmodel"
import { convertAssetFactToCardViewModel, AssetCardViewModel } from "@/lib/facts-ui/assetCard.viewmodel"
import { Package, Clock, Activity, Truck } from "lucide-react"
import { Card } from "@/components/ui/card"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
```

**缺少**：
```typescript
import { logBusinessWarning } from "@/lib/utils/logger"
```

---

## ✅ 已存在的 console.warn

文件中已有 2 处 `console.warn`，这些是原本就有的，不是替换后的：

1. **第 88 行**：
   ```typescript
   console.warn('[User Bound Page] 未找到 restaurantId，无法加载事实数据')
   ```
   - 类型：B类（可预期业务失败）
   - 状态：✅ 已使用 `console.warn`（正确）

2. **第 185 行**：
   ```typescript
   console.warn('[User Bound Page] 发现事实不一致警告:', orderFactData.fact_warnings)
   ```
   - 类型：C类（数据适配/ViewModel转换失败）
   - 状态：✅ 已使用 `console.warn`（正确）

---

## 📝 需要执行的替换操作

### 1. 创建 logger.ts（如果不存在）

**文件路径**：`lib/utils/logger.ts`

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

### 2. 添加导入语句

在 `app/user-bound/page.tsx` 文件顶部（第 38 行后）添加：

```typescript
import { logBusinessWarning } from "@/lib/utils/logger"
```

### 3. 替换 B 类错误（8 处）

#### 位置 1：第 113 行
```typescript
// ❌ 原代码
console.error('[User Bound Page] 权限验证失败，请确保已登录')

// ✅ 替换为
logBusinessWarning('User Bound Page', '权限验证失败，请确保已登录')
```

#### 位置 2：第 116 行
```typescript
// ❌ 原代码
console.error('[User Bound Page] 获取餐厅事实总览失败:', error)

// ✅ 替换为
logBusinessWarning('User Bound Page', '获取餐厅事实总览失败', error)
```

#### 位置 3：第 142 行
```typescript
// ❌ 原代码
console.error('[User Bound Page] 权限验证失败，请确保已登录')

// ✅ 替换为
logBusinessWarning('User Bound Page', '权限验证失败，请确保已登录')
```

#### 位置 4：第 145 行
```typescript
// ❌ 原代码
console.error('[User Bound Page] 获取关联资产列表失败:', error)

// ✅ 替换为
logBusinessWarning('User Bound Page', '获取关联资产列表失败', error)
```

#### 位置 5：第 232 行
```typescript
// ❌ 原代码
console.error('[User Bound Page] 权限验证失败，请确保已登录')

// ✅ 替换为
logBusinessWarning('User Bound Page', '权限验证失败，请确保已登录')
```

#### 位置 6：第 236 行
```typescript
// ❌ 原代码
console.error('[User Bound Page] 权限验证失败，请确保已登录')

// ✅ 替换为
logBusinessWarning('User Bound Page', '权限验证失败，请确保已登录')
```

#### 位置 7：第 239 行
```typescript
// ❌ 原代码
console.error('[User Bound Page] 获取最近一次配送失败:', error)

// ✅ 替换为
logBusinessWarning('User Bound Page', '获取最近一次配送失败', error)
```

#### 位置 8：第 243 行
```typescript
// ❌ 原代码
console.error('[User Bound Page] 加载事实数据失败:', error)

// ✅ 替换为
logBusinessWarning('User Bound Page', '加载事实数据失败', error)
```

### 4. 替换 C 类错误（3 处）

#### 位置 1：第 138 行
```typescript
// ❌ 原代码
console.error('[User Bound Page] 转换资产卡片 ViewModel 失败:', error)

// ✅ 替换为
console.warn('[User Bound Page] 转换资产卡片 ViewModel 失败:', error)
```

#### 位置 2：第 207 行
```typescript
// ❌ 原代码
console.error('[User Bound Page] 转换订单时间线 ViewModel 失败:', error)

// ✅ 替换为
console.warn('[User Bound Page] 转换订单时间线 ViewModel 失败:', error)
```

#### 位置 3：第 227 行
```typescript
// ❌ 原代码
console.error('[User Bound Page] 转换订单关联资产 ViewModel 失败:', error)

// ✅ 替换为
console.warn('[User Bound Page] 转换订单关联资产 ViewModel 失败:', error)
```

---

## ✅ 验证清单

完成替换后，请确认：

- [ ] `lib/utils/logger.ts` 文件已创建
- [ ] `logBusinessWarning` 函数已实现
- [ ] `app/user-bound/page.tsx` 已导入 `logBusinessWarning`
- [ ] 所有 8 处 B 类错误已替换为 `logBusinessWarning`
- [ ] 所有 3 处 C 类错误已替换为 `console.warn`
- [ ] 文件中不再存在 `console.error`（除了可能的新增 A 类错误）
- [ ] 代码可以正常编译和运行

---

## 📊 替换前后对比

### 替换前
- `console.error`：11 处
- `console.warn`：2 处（原本就有）
- `logBusinessWarning`：0 处

### 替换后（预期）
- `console.error`：0 处
- `console.warn`：5 处（2 处原本 + 3 处 C 类替换）
- `logBusinessWarning`：8 处（B 类替换）

---

## 🎯 总结

**当前状态**：❌ **未完成替换**

**需要执行的操作**：
1. 创建 `lib/utils/logger.ts` 文件
2. 在 `app/user-bound/page.tsx` 中导入 `logBusinessWarning`
3. 替换 8 处 B 类错误为 `logBusinessWarning`
4. 替换 3 处 C 类错误为 `console.warn`

**预计工作量**：中等（需要修改 12 处代码 + 创建 1 个新文件）
