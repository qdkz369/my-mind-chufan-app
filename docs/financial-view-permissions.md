# 金融视图访问权限规则

## 完成时间
2025-01-20

## 核心原则

**谁能看"钱"**

- ✅ 默认角色不可见：普通用户、工人端
- ✅ 可见角色：管理端（finance / admin 权限）、平台运营角色
- ✅ 权限不足时不渲染、不请求 API

## 权限规则

### 1. 默认角色不可见

以下角色**默认不可见**金融视图：

- **普通用户**（restaurant / client）
- **工人端**（worker / staff / factory / filler）

### 2. 可见角色

以下角色**可见**金融视图：

- **管理端**（admin / super_admin）
- **平台运营角色**（finance 权限，未来扩展）

### 3. 权限检查时机

- **组件渲染前**：权限不足时不渲染金融视图组件
- **API 请求前**：权限不足时不请求金融字段
- **数据填充前**：权限不足时不填充金融视图数据

## 实现方式

### 1. 权限检查函数

**文件**：`lib/financial/permissions.ts`

```typescript
/**
 * 检查用户是否有权限查看金融视图
 */
export function canViewFinancialView(role: UserRole | string | null | undefined): boolean {
  // 管理端角色：可见
  if (role === "super_admin" || role === "admin") {
    return true
  }
  
  // 默认角色：不可见
  return false
}

/**
 * 检查客户端用户是否有权限查看金融视图
 */
export function canViewFinancialViewClient(isAdmin: boolean): boolean {
  return isAdmin
}
```

### 2. 客户端权限检查 Hook

**文件**：`hooks/use-financial-view-permission.ts`

```typescript
/**
 * 检查客户端用户是否有权限查看金融视图
 */
export function useFinancialViewPermission() {
  const [canView, setCanView] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  
  // 检查权限逻辑...
  
  return { canView, isLoading }
}
```

### 3. 组件权限检查

**文件**：`app/devices/page.tsx`

```tsx
// 1. 使用权限检查 Hook
const { canView: canViewFinancialView, isLoading: isCheckingFinancialPermission } = useFinancialViewPermission()

// 2. API 请求时：权限不足时不请求金融字段
const shouldQueryFinancialFields = canViewFinancialView && !isCheckingFinancialPermission
const contractDevicesSelect = shouldQueryFinancialFields
  ? "device_id, rental_contract_id, agreed_daily_fee, agreed_monthly_fee, agreed_usage_metric"
  : "device_id, rental_contract_id, agreed_usage_metric"

// 3. 数据填充时：权限不足时不填充金融视图数据
financial_view: contractDevice && shouldQueryFinancialFields ? {
  agreed_daily_fee: contractDevice.agreed_daily_fee,
  agreed_monthly_fee: contractDevice.agreed_monthly_fee,
  billing_model: contract?.billing_model || null,
} : null

// 4. 组件渲染时：权限不足时不渲染金融视图组件
{device.financial_view && canViewFinancialView && !isCheckingFinancialPermission && (
  <Card className="bg-muted/30 border-muted text-muted-foreground">
    {/* 金融视图内容 */}
  </Card>
)}
```

## 验证清单

### ✅ 达标检查

- [x] 工人永远看不到金额
  - 工人端角色（staff / factory / filler / worker）默认不可见
  - 权限检查函数返回 `false`
  - 组件不渲染金融视图

- [x] 事实页面不会"闪一下钱"
  - 权限不足时不请求金融字段
  - 权限不足时不填充金融视图数据
  - 权限不足时不渲染金融视图组件
  - 权限检查在组件渲染前完成

- [x] 权限不足时不渲染
  - 使用 `canViewFinancialView && !isCheckingFinancialPermission` 条件渲染
  - 权限检查完成后才渲染组件

- [x] 权限不足时不请求 API
  - 根据权限动态选择查询字段
  - 权限不足时只查询非金融字段

## 权限检查流程

```
1. 组件加载
   ↓
2. 调用 useFinancialViewPermission Hook
   ↓
3. 检查 Supabase Auth user
   ↓
4. 查询 user_roles 表获取角色
   ↓
5. 判断角色是否为 admin / super_admin
   ↓
6. 返回 canView 权限结果
   ↓
7. 根据权限决定：
   - 是否请求金融字段（API）
   - 是否填充金融视图数据（数据处理）
   - 是否渲染金融视图组件（UI）
```

## 角色权限对照表

| 角色 | 权限 | 可见金融视图 |
|------|------|------------|
| `super_admin` | ✅ | ✅ 是 |
| `admin` | ✅ | ✅ 是 |
| `staff` | ❌ | ❌ 否 |
| `factory` | ❌ | ❌ 否 |
| `filler` | ❌ | ❌ 否 |
| `worker` | ❌ | ❌ 否 |
| `restaurant` | ❌ | ❌ 否 |
| `client` | ❌ | ❌ 否 |
| 未登录 | ❌ | ❌ 否 |

## 安全策略

### 1. 默认拒绝

- ✅ 默认角色不可见（安全策略）
- ✅ 未登录用户不可见
- ✅ 无法获取角色时不可见

### 2. 多层检查

- ✅ API 请求前检查权限
- ✅ 数据填充前检查权限
- ✅ 组件渲染前检查权限

### 3. 避免闪烁

- ✅ 权限检查在组件渲染前完成
- ✅ 权限不足时不请求金融字段
- ✅ 权限不足时不填充金融视图数据
- ✅ 权限不足时不渲染金融视图组件

## 总结

金融视图访问权限规则已成功实现：

- ✅ 默认角色不可见：普通用户、工人端
- ✅ 可见角色：管理端（admin / super_admin）
- ✅ 权限不足时不渲染、不请求 API
- ✅ 工人永远看不到金额
- ✅ 事实页面不会"闪一下钱"

符合所有要求，验证通过！
