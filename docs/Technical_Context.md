# Technical_Context.md

**项目**: 商业厨房服务 APP  
**更新日期**: 2026-01-31  
**用途**: 重构进展、待解决 Bug、多租户逻辑说明，供协作伙伴同步

---

## 一、重构进展

### 1.1 Dashboard 组件拆分 ✅

- **原状**: `page.tsx` 超过 10,000 行  
- **现状**: 拆分为 30+ 子组件，主文件约 1,500 行  
- **模块**: 工作台、餐厅、订单、报修、工人、设备、租赁、协议、异常处理、数据统计、财务报表、燃料价格、设置等  
- **结构**: `components/*.tsx` + `components/*-with-data.tsx`（自管数据）  
- **参考**: `app/(admin)/dashboard/SPLIT_PROGRESS.md`

### 1.2 平台工程 (Platform Engineering) ✅

- **Decision Engine**: `lib/platform/decision/`  
- **Capability Registry**: `lib/platform/registry/`  
- **Orchestration Engine**: `lib/platform/orchestration/`  
- **DecisionSample**: `lib/platform/models/decision-sample.ts`  
- **Task Capability 扩展**: freezeContext, snapshot, mutateWithDecision  
- **Governance**: `docs/platform-engineering/GOVERNANCE.md`  
- **参考**: `docs/platform-engineering/PLATFORM_ENGINEERING_IMPLEMENTATION_PLAN.md`

### 1.3 多租户与供应商能力 ✅

- 供应商导航：依赖 `user_companies` + `company_permissions`  
- 数据隔离：各 API 按 `companyId` / `provider_id` 过滤  
- 逾期设备未归还：`/api/cron/check-overdue-rentals` 已按 `provider_id` 隔离  

### 1.4 供应商管理拆分 ✅（2026-01-31）

- `supplier-management.tsx` 已拆分为多个 UI 组件：`supplier-search-filter`、`supplier-company-card`、`supplier-create-company-dialog`、`supplier-assign-user-dialog`、`supplier-permissions-dialog`
- 所有 API 调用已统一为 `fetchWithAuth`，新增 `GET /api/admin/companies` 支持多租户隔离

### 1.5 待完善项

- `SPLIT_CHECK_REPORT.md` 可能与当前代码不同步  
- 平台层与业务 API 的桥接（可选）尚未全面接入  

---

## 二、待解决的 Bug / 已知问题

### 2.1 已修复（近期）

| 问题 | 修复 |
|------|------|
| `loadRecentOrdersCount is not defined` | 迁移到 `DashboardTabWithData`，移除错误依赖 |
| 协议管理 401 | 使用 `fetchWithAuth` 传递 Bearer Token |
| 供应商登录后仅见「工作台」 | 确保 `user_companies` 有 `is_primary=true`，并配置 `company_permissions` |
| 逾期设备未归还数据未隔离 | `/api/cron/check-overdue-rentals` 增加 `provider_id` 过滤 |
| `[Workers]/[Orders] 角色 null 缺少公司 ID` | 补充 `useCallback` 依赖数组，`userRole===null` 时静默返回 |

### 2.2 需关注

| 问题 | 说明 |
|------|------|
| Canvas getImageData 警告 | 高德地图 SDK 内部行为，可忽略 |
| rental_orders 与 rentals 双表 | 部分 API 有降级逻辑，需确认业务预期 |
| 地图热力图 | 如有问题需单独排查 |

### 2.3 新供应商配置

新供应商需在 Supabase 中执行 `scripts/为供应商添加导航权限.sql`，并修改脚本内邮箱。  
验证脚本：`scripts/配置供应商权限与数据隔离验证.sql`。

---

## 三、多租户逻辑说明

### 3.1 用户上下文 (User Context)

- **入口**: `lib/auth/user-context.ts` 的 `getUserContext(request)`  
- **输出**: `{ userId, role, companyId? }`  
- **规则**:
  - `super_admin`: `companyId` 可为空，可访问全量数据  
  - `platform_admin` / `company_admin`: `companyId` 仅从 `user_companies`（`is_primary=true`）获取  
  - 无 `companyId` 时：非 super_admin 不加载业务数据，仅显示工作台  

### 3.2 数据隔离规则

| 角色 | 数据范围 |
|------|----------|
| super_admin | 全部 |
| platform_admin / company_admin | 仅 `user_companies` 中 `company_id` 关联的数据 |
| admin / staff | 同平台/公司管理员，需有 `companyId` |

### 3.3 隔离实现方式

1. **restaurants**: `company_id = userCompanyId`  
2. **delivery_orders / repair_orders**: 通过 `restaurant_id IN (公司餐厅ID列表)`  
3. **workers**: `company_id = userCompanyId`  
4. **rental_orders**: `provider_id = userCompanyId`  
5. **device_rentals**: `company_id = userCompanyId`  
6. **agreements**: `company_id = userCompanyId` 或 `company_id IS NULL`（平台通用）  
7. **equipment_catalog**: `provider_id = userCompanyId`  

### 3.4 API 调用约定

- 管理端请求需带认证：使用 `fetchWithAuth` 或 `credentials: "include"` + Bearer  
- Supabase 客户端会话可能在 localStorage，Cookie 可能为空，故需 Bearer  
- 所有需鉴权的 API 应通过 `getUserContext` 获取身份，再按上述规则过滤  

---

## 四、关键依赖与入口

| 模块 | 路径 | 说明 |
|------|------|------|
| 用户上下文 | `lib/auth/user-context.ts` | 唯一权限入口 |
| 多租户过滤 | `lib/multi-tenant.ts` | enforceCompanyFilter |
| 能力校验 | `lib/auth/requireCapability.ts` | ORDER_ACCEPT 等 |
| 审计日志 | `lib/audit.ts` | writeAuditLog |
| 带鉴权请求 | `lib/auth/fetch-with-auth.ts` | 自动附加 Bearer |

---

## 五、环境与配置

- **框架**: Next.js 16  
- **数据库**: Supabase (PostgreSQL)  
- **认证**: Supabase Auth（支持 Cookie 与 Bearer）  
- **环境变量**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`  
- **参考**: `环境变量配置说明.md`, `检查环境变量.md`

---

## 六、相关文档索引

| 文档 | 用途 |
|------|------|
| `Project_Map.md` | 目录树与模块状态 |
| `Data_Schema.md` | 表结构与 RLS |
| `核心数据模型与业务逻辑文档.md` | 数据模型与业务规则 |
| `多租户与多角色数据隔离架构报告.md` | 多租户架构 |
| `docs/platform-engineering/` | 平台工程文档 |
