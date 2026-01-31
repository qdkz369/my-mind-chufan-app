# 现有可复用能力清单

**版本**: v1.0  
**目的**: 盘点可被平台层复用的基础设施，避免重复建设。

---

## 1. 权限与能力（Capability）

| 模块 | 路径 | 说明 |
|------|------|------|
| Capability 枚举 | `lib/capabilities.ts` | ORDER_ACCEPT, ORDER_DISPATCH, ORDER_COMPLETE, ORDER_REJECT, ORDER_EXCEPTION |
| requireCapability | `lib/auth/requireCapability.ts` | 统一能力校验，当前阶段默认放行 |
| getUserContext | `lib/auth/user-context.ts` | userId, role, companyId，多租户必备 |
| verifyWorkerPermission | `lib/auth/worker-auth.ts` | 工人端权限校验 |

**平台复用**: 平台 API 需调用 `getUserContext` 做多租户隔离，可扩展 Capability 枚举增加平台能力（如 PLATFORM_DISPATCH_MATCH）。

---

## 2. 审计与事实

| 模块 | 路径 | 说明 |
|------|------|------|
| writeAuditLog | `lib/audit.ts` | 写入 audit_logs，action/target_type/target_id/metadata |
| audit_logs 表 | 数据库 | 操作事实，可用于 Learning、Feedback |
| trace_logs 表 | 数据库 | 资产轨迹 |

**平台复用**: 所有平台决策（match、allocate、select）应写 audit_logs，metadata 含 decision_trace。

---

## 3. 通知

| 模块 | 路径 | 说明 |
|------|------|------|
| createOrderStatusNotification | `lib/notifications/create-notification.ts` | 订单状态变更通知 |

**平台复用**: allocate 成功后可选调用，保持业务体验一致。

---

## 4. 多租户

| 模块 | 路径 | 说明 |
|------|------|------|
| enforceCompanyFilter | `lib/multi-tenant.ts` | 按 company_id/provider_id 过滤查询 |
| user_companies | 数据库 | 用户-公司关联 |

**平台复用**: 平台 match/allocate 必须按 companyId 过滤 workers 与 tasks。

---

## 5. 类型与状态

| 模块 | 路径 | 说明 |
|------|------|------|
| canTransitionDeliveryOrderStatus | `lib/types/order.ts` | 订单状态流转白名单 |
| 状态枚举 | 各业务模块 | pending, accepted, delivering, completed, exception 等 |

**平台复用**: TaskModel.status 可映射现有枚举，平台不新增业务语义。

---

## 6. 数据库客户端

| 模块 | 路径 | 说明 |
|------|------|------|
| supabase | `lib/supabase` | 客户端（RLS 生效） |
| createClient(serviceRoleKey) | 各 API | 管理端绕过 RLS |

**平台复用**: 平台实现层可用 createClient，但需通过适配器访问表，不直接暴露表名。
