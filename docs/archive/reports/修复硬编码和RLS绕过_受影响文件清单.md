# 修复硬编码和RLS绕过 - 受影响文件清单

## 一、硬编码 Supabase 配置的文件

### 1. 核心配置文件（必须修复）
- ✅ `lib/supabase.ts` - 硬编码 URL 和 Anon Key
- ✅ `proxy.ts` - 硬编码 URL 和 Anon Key
- ✅ `lib/multi-tenant.ts` - 硬编码 URL 和 Anon Key
- ✅ `app/login/page.tsx` - 硬编码 URL 和 Anon Key

### 2. API 路由文件（必须修复）
- ✅ `app/api/admin/create-company/route.ts` - 硬编码 URL、Anon Key、Service Role Key
- ✅ `app/api/admin/find-user/route.ts` - 硬编码 URL 和 Anon Key
- ✅ `app/api/equipment/catalog/list/route.ts` - 硬编码 URL 和 Anon Key
- ✅ `app/api/equipment/catalog/create/route.ts` - 硬编码 URL 和 Anon Key
- ✅ `app/api/equipment/catalog/approve/route.ts` - 硬编码 URL 和 Anon Key
- ✅ `app/api/equipment/categories/route.ts` - 硬编码 URL 和 Anon Key
- ✅ `app/api/equipment/list/route.ts` - 硬编码 URL 和 Anon Key
- ✅ `app/api/equipment/rental/create/route.ts` - 硬编码 URL 和 Anon Key
- ✅ `app/api/equipment/rental/list/route.ts` - 硬编码 URL 和 Anon Key
- ✅ `app/api/equipment/rental/admin/list/route.ts` - 硬编码 URL 和 Anon Key
- ✅ `app/api/equipment/rental/update/route.ts` - 硬编码 URL 和 Anon Key
- ✅ `app/api/repair/create/route.ts` - 硬编码 URL 和 Anon Key
- ✅ `app/api/status/transition/route.ts` - 硬编码 URL 和 Anon Key

### 3. 其他文件
- ✅ `lib/status-manager.ts` - 硬编码 URL 和 Anon Key
- ✅ `app/worker/page.tsx` - 硬编码 URL（仅一处）

## 二、绕过 RLS 的文件（需要优化）

### 1. 使用 Service Role Key 绕过 RLS
- ⚠️ `app/api/admin/create-company/route.ts` - 使用 Service Role Key 绕过 RLS，需要改为使用 enforceCompanyFilter
- ⚠️ `app/api/admin/find-user/route.ts` - 使用 Service Role Key 访问 auth.users（可能需要保留，但需要验证）
- ⚠️ `app/api/equipment/catalog/list/route.ts` - 优先使用 Service Role Key
- ⚠️ `app/api/equipment/catalog/create/route.ts` - 优先使用 Service Role Key
- ⚠️ `app/api/equipment/catalog/approve/route.ts` - 优先使用 Service Role Key
- ⚠️ `app/api/equipment/categories/route.ts` - 优先使用 Service Role Key
- ⚠️ `app/api/equipment/list/route.ts` - 优先使用 Service Role Key
- ⚠️ `app/api/equipment/rental/admin/list/route.ts` - 使用 Service Role Key 绕过 RLS
- ⚠️ `app/api/equipment/rental/list/route.ts` - 优先使用 Service Role Key
- ⚠️ `app/api/equipment/rental/update/route.ts` - 优先使用 Service Role Key
- ⚠️ `app/api/status/transition/route.ts` - 优先使用 Service Role Key
- ⚠️ `app/api/repair/create/route.ts` - 使用 Service Role Key 作为后备方案

### 2. 权限验证被注释
- ⚠️ `app/api/repair/list/route.ts` - 权限验证被注释，需要恢复

## 三、修复策略

### 策略1：移除硬编码值
- 所有 FALLBACK 常量改为从环境变量读取
- 如果环境变量不存在，抛出错误而不是使用硬编码值
- 在开发环境提供清晰的错误提示

### 策略2：优化 RLS 绕过
- 对于需要管理员权限的操作，先验证用户角色
- 使用 enforceCompanyFilter 确保多租户隔离
- 只有在确实需要绕过 RLS 的场景（如访问 auth.users）才使用 Service Role Key
- 所有使用 Service Role Key 的地方添加注释说明原因

### 策略3：恢复权限验证
- 恢复 `app/api/repair/list/route.ts` 中被注释的权限验证
- 确保所有 API 都有适当的权限检查

## 四、修复优先级

### 高优先级（安全风险）
1. `app/api/admin/create-company/route.ts` - 硬编码 Service Role Key
2. `lib/supabase.ts` - 硬编码 URL 和 Key
3. `proxy.ts` - 硬编码 URL 和 Key
4. `app/api/repair/list/route.ts` - 权限验证被注释

### 中优先级（多租户隔离）
5. `app/api/equipment/rental/admin/list/route.ts` - 绕过 RLS
6. `app/api/equipment/catalog/*` - 绕过 RLS
7. `app/api/equipment/rental/*` - 绕过 RLS

### 低优先级（代码清理）
8. 其他 API 路由中的硬编码值
9. `lib/multi-tenant.ts` - 硬编码值
10. `lib/status-manager.ts` - 硬编码值

## 五、注意事项

1. **环境变量检查**：移除硬编码后，需要确保 `.env.local` 文件正确配置
2. **向后兼容**：某些 API 可能依赖 Service Role Key，需要评估是否可以改为使用 RLS
3. **测试**：修复后需要测试所有受影响的功能
4. **文档**：更新环境变量配置文档
