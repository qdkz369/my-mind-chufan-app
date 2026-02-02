# API 拦截器疏通完成总结

## 📋 修改内容

### 1. ✅ 移除状态流转拦截

**已修改文件：**
- `app/api/orders/accept/route.ts` - 注释掉状态流转检查
- `app/api/orders/complete/route.ts` - 注释掉状态流转检查
- `app/api/orders/dispatch/route.ts` - 注释掉状态流转检查
- `app/api/orders/exception/route.ts` - 注释掉状态流转检查
- `app/api/orders/reject/route.ts` - 注释掉状态流转检查

**修改方式：**
- 将所有 `canTransitionDeliveryOrderStatus` 检查注释掉
- 添加 `⚠️ 临时注释` 标记，说明这是临时措施

### 2. ✅ 移除字段强制校验

**已修改文件：**
- `app/api/orders/complete/route.ts` - 将 `tracking_code` 和 `proof_image` 改为可选

**修改方式：**
```typescript
// 之前：
if (!tracking_code || !proof_image) {
  return NextResponse.json({ error: "完成配送必须提供 tracking_code 和 proof_image" }, { status: 400 })
}

// 现在：
// ⚠️ 临时注释：暂时注释掉字段强制校验，改为可选
// if (!tracking_code || !proof_image) { ... }

// 更新时：
tracking_code: tracking_code || null, // ⚠️ 临时：改为可选
proof_image: proof_image || null, // ⚠️ 临时：改为可选
```

### 3. ✅ 统一 company_id 来源（部分完成）

**已修改文件：**
- `app/api/equipment/rental/admin/list/route.ts` - 使用 `getUserContext` 替代 `getCurrentCompanyId`
- `app/api/equipment/rental/create/route.ts` - 使用 `getUserContext` 替代 `getCurrentCompanyId` 和 `getCurrentUserId`

**待修改文件（需要统一修改）：**
- `app/api/equipment/rental/deposit/refund/route.ts`
- `app/api/finance/report/route.ts`
- `app/api/equipment/rental/collection/return-notice/route.ts`
- `app/api/equipment/rental/mark-unreturned/route.ts`
- `app/api/finance/reconciliation/route.ts`
- `app/api/finance/collection/notify/route.ts`
- `app/api/finance/billing/statistics/route.ts`
- `app/api/finance/billing/overdue/route.ts`
- `app/api/equipment/rental/return/check/route.ts`
- `app/api/equipment/rental/damage/report/route.ts`
- `app/api/equipment/rental/payment/monthly/route.ts`
- `app/api/equipment/rental/update/route.ts`
- `app/api/status/transition/route.ts`
- `app/api/equipment/catalog/list/route.ts`

**修改模板：**
```typescript
// 之前：
import { getCurrentCompanyId, getCurrentUserId } from "@/lib/multi-tenant"
const companyId = await getCurrentCompanyId(request)
const userId = await getCurrentUserId(request)

// 现在：
import { NextRequest } from "next/server"
import { getUserContext } from "@/lib/auth/user-context"

export async function GET(request: NextRequest) {
  // 🔓 放行 Super Admin
  let userContext
  try {
    userContext = await getUserContext(request)
    if (userContext.role === "super_admin") {
      console.log("[API名称] Super Admin 访问，跳过多租户过滤")
    }
  } catch (error) {
    console.warn("[API名称] 获取用户上下文失败，继续执行:", error)
  }
  
  const companyId = userContext?.companyId
  const userId = userContext?.userId
}
```

### 4. ✅ 放行 Super Admin（部分完成）

**已修改文件：**
- `app/api/equipment/rental/admin/list/route.ts` - 添加 Super Admin 放行逻辑
- `app/api/equipment/rental/create/route.ts` - 添加 Super Admin 放行逻辑

**修改方式：**
```typescript
// 在所有 API 的最顶部添加：
// 🔓 放行 Super Admin：如果用户是 super_admin，跳过所有多租户过滤逻辑
let userContext
try {
  userContext = await getUserContext(request)
  if (userContext.role === "super_admin") {
    console.log("[API名称] Super Admin 访问，跳过多租户过滤")
  }
} catch (error) {
  // 如果获取用户上下文失败，继续执行（向后兼容）
  console.warn("[API名称] 获取用户上下文失败，继续执行:", error)
}

// 在多租户过滤处添加判断：
if (companyId && userContext?.role !== "super_admin") {
  // 应用多租户过滤
} else if (userContext?.role === "super_admin") {
  console.log("[API名称] Super Admin 访问，不应用多租户过滤")
}
```

---

## 🔍 修改详情

### 状态流转拦截移除

**文件：** `app/api/orders/accept/route.ts`
```typescript
// ⚠️ 临时注释：暂时注释掉状态流转拦截，避免阻碍项目启动
// if (!canTransitionDeliveryOrderStatus(currentStatus, "accepted")) {
//   return NextResponse.json({ error: ... }, { status: 400 })
// }
```

**文件：** `app/api/orders/complete/route.ts`
```typescript
// ⚠️ 临时注释：暂时注释掉状态流转拦截，避免阻碍项目启动
// if (!canTransitionDeliveryOrderStatus(currentStatus, "completed")) {
//   return NextResponse.json({ error: ... }, { status: 400 })
// }
```

**文件：** `app/api/orders/dispatch/route.ts`
```typescript
// ⚠️ 临时注释：暂时注释掉状态流转拦截，避免阻碍项目启动
// if (!canTransitionDeliveryOrderStatus(currentStatus, "delivering")) {
//   return NextResponse.json({ error: ... }, { status: 400 })
// }
```

**文件：** `app/api/orders/exception/route.ts`
```typescript
// ⚠️ 临时注释：暂时注释掉状态流转拦截，避免阻碍项目启动
// if (!canTransitionDeliveryOrderStatus(currentStatus, "exception")) {
//   return NextResponse.json({ error: ... }, { status: 400 })
// }
```

**文件：** `app/api/orders/reject/route.ts`
```typescript
// ⚠️ 临时注释：暂时注释掉状态流转拦截，避免阻碍项目启动
// if (!canTransitionDeliveryOrderStatus(currentStatus, "rejected")) {
//   return NextResponse.json({ error: ... }, { status: 400 })
// }
```

### 字段强制校验移除

**文件：** `app/api/orders/complete/route.ts`
```typescript
// ⚠️ 临时注释：暂时注释掉字段强制校验，改为可选
// if (!tracking_code || !proof_image) {
//   return NextResponse.json({ error: "完成配送必须提供 tracking_code 和 proof_image" }, { status: 400 })
// }

// 更新时：
tracking_code: tracking_code || null, // ⚠️ 临时：改为可选
proof_image: proof_image || null, // ⚠️ 临时：改为可选
```

### Super Admin 放行逻辑

**文件：** `app/api/equipment/rental/admin/list/route.ts`
```typescript
// 🔓 放行 Super Admin：如果用户是 super_admin，跳过所有多租户过滤逻辑
let userContext
try {
  userContext = await getUserContext(request)
  if (userContext.role === "super_admin") {
    console.log("[设备租赁管理API] Super Admin 访问，跳过多租户过滤")
  }
} catch (error) {
  console.warn("[设备租赁管理API] 获取用户上下文失败，继续执行:", error)
}

// 多租户过滤处：
if (companyId && userContext?.role !== "super_admin") {
  query = enforceCompanyFilter(query, companyId, "provider_id")
} else if (userContext?.role === "super_admin") {
  console.log("[设备租赁管理API] Super Admin 访问，不应用多租户过滤")
}
```

---

## 📝 待完成工作

### 需要统一 company_id 来源的文件

以下文件仍在使用 `getCurrentCompanyId` 或 `getCurrentUserId`，需要改为使用 `getUserContext`：

1. `app/api/equipment/rental/deposit/refund/route.ts`
2. `app/api/finance/report/route.ts`
3. `app/api/equipment/rental/collection/return-notice/route.ts`
4. `app/api/equipment/rental/mark-unreturned/route.ts`
5. `app/api/finance/reconciliation/route.ts`
6. `app/api/finance/collection/notify/route.ts`
7. `app/api/finance/billing/statistics/route.ts`
8. `app/api/finance/billing/overdue/route.ts`
9. `app/api/equipment/rental/return/check/route.ts`
10. `app/api/equipment/rental/damage/report/route.ts`
11. `app/api/equipment/rental/payment/monthly/route.ts`
12. `app/api/equipment/rental/update/route.ts`
13. `app/api/status/transition/route.ts`
14. `app/api/equipment/catalog/list/route.ts`

**修改步骤：**
1. 将 `Request` 改为 `NextRequest`
2. 导入 `getUserContext` 替代 `getCurrentCompanyId` 和 `getCurrentUserId`
3. 在函数顶部添加 Super Admin 放行逻辑
4. 使用 `userContext.companyId` 和 `userContext.userId` 替代原来的获取方式
5. 在多租户过滤处添加 `userContext?.role !== "super_admin"` 判断

---

## ⚠️ 注意事项

### 1. 临时修改说明

**状态流转拦截：**
- ⚠️ 所有状态流转检查都已注释，这是**临时措施**
- 项目启动后，建议逐步恢复状态流转检查
- 恢复时，建议先恢复关键状态流转（如 completed），再恢复其他状态

**字段强制校验：**
- ⚠️ `tracking_code` 和 `proof_image` 已改为可选，这是**临时措施**
- 项目启动后，建议恢复这些字段的强制校验
- 恢复时，建议先恢复 `proof_image`（更关键），再恢复 `tracking_code`

### 2. Super Admin 放行逻辑

**行为变更：**
- Super Admin 现在可以访问所有数据，不受多租户过滤限制
- 这可能会影响数据安全性，需要确保 Super Admin 权限管理正确

**建议：**
- 在生产环境中，确保只有可信用户才能获得 Super Admin 角色
- 考虑添加 Super Admin 操作审计日志

### 3. company_id 统一来源

**行为变更：**
- 所有 API 现在统一使用 `getUserContext` 获取 `companyId`
- 如果 `getUserContext` 返回 `companyId: undefined`，API 将不应用多租户过滤

**建议：**
- 确保 `restaurants` 表有正确的 `user_id` 和 `company_id` 数据
- 如果用户没有关联公司，API 行为可能不符合预期

---

## 🚀 下一步操作

1. **完成剩余文件的修改**
   - 统一所有 API 的 `company_id` 来源
   - 为所有 API 添加 Super Admin 放行逻辑

2. **测试验证**
   - 验证状态流转不再被拦截
   - 验证 `tracking_code` 和 `proof_image` 可以为空
   - 验证 Super Admin 可以访问所有数据
   - 验证普通用户仍然受多租户过滤限制

3. **逐步恢复约束**
   - 项目启动后，逐步恢复状态流转检查
   - 逐步恢复字段强制校验
   - 确保恢复过程中不影响系统稳定性

---

**修改完成时间：** 2025-01-25  
**版本：** 1.0
