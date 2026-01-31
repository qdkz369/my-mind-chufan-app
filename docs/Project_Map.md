# Project_Map.md

**项目**: 商业厨房服务 APP（my-mind-chufan-app）  
**更新日期**: 2026-01-31  
**用途**: 目录树与模块状态，供协作伙伴快速了解项目结构

---

## 一、根目录概览

```
my-mind-chufan-app/
├── app/                    # Next.js 应用（页面 + API）
├── components/             # 通用 UI 组件
├── hooks/                  # 自定义 React Hooks
├── lib/                    # 核心库（auth、platform、facts 等）
├── migrations/             # 数据库迁移脚本（44 个 SQL）
├── public/                 # 静态资源
├── scripts/                # 工具脚本（SQL、验证等）
├── styles/                 # 全局样式
├── docs/                   # 文档（含 platform-engineering）
└── [根目录 SQL/MD]         # 各类修复脚本、说明文档
```

---

## 二、app/ 目录结构

### 2.1 路由分组

| 分组 | 路径 | 说明 |
|------|------|------|
| **(admin)** | `app/(admin)/dashboard/` | 管理后台（需管理员角色） |
| **(admin)** | `app/(admin)/rental/` | 租赁合同、用量快照等 |
| **(dashboard)** | `app/(dashboard)/orders/` | 商户端订单 |
| **无分组** | `app/login/`, `app/register/` | 登录、注册 |
| **无分组** | `app/devices/`, `app/repair/` | 设备、报修页面 |
| **无分组** | `app/worker/`, `app/customer/` | 工人端、客户端 |

### 2.2 管理后台 (admin/dashboard)

```
app/(admin)/dashboard/
├── page.tsx                      # 主页面（约 1,500 行，侧栏 + 内容区）
├── agreement-management.tsx      # 协议管理
├── product-approval.tsx          # 产品审核
├── send-notification.tsx         # 发送通知
├── supplier-management.tsx       # 供应商管理
├── components/                   # 功能模块组件（已拆分）
│   ├── dashboard-overview.tsx
│   ├── dashboard-tab-with-data.tsx
│   ├── map-dashboard.tsx
│   ├── restaurants-management.tsx
│   ├── orders-management.tsx
│   ├── repairs-management.tsx
│   ├── workers-management.tsx
│   ├── equipment-rental.tsx
│   ├── equipment-rental-with-dialogs.tsx
│   ├── rentals-dashboard.tsx
│   ├── rentals-dashboard-with-dialogs.tsx
│   ├── agreements-section.tsx
│   ├── exception-handling.tsx
│   ├── exception-handling-with-data.tsx
│   ├── analytics.tsx
│   ├── analytics-with-data.tsx
│   ├── finance-report.tsx
│   ├── finance-report-with-data.tsx
│   ├── fuel-pricing.tsx
│   ├── fuel-pricing-with-data.tsx
│   ├── devices-monitoring.tsx
│   ├── devices-with-data.tsx
│   ├── api-config.tsx
│   ├── api-config-with-data.tsx
│   ├── settings.tsx
│   ├── settings-with-dialogs.tsx
│   ├── supplier-search-filter.tsx
│   ├── supplier-company-card.tsx
│   ├── supplier-create-company-dialog.tsx
│   ├── supplier-assign-user-dialog.tsx
│   ├── supplier-permissions-dialog.tsx
│   ├── supplier-status-badge.tsx
│   ├── supplier-management-types.ts
│   └── [*-with-dialogs]          # 带弹窗、自管数据的封装
├── lib/dashboard-utils.ts
└── types/dashboard-types.ts
```

### 2.3 API 路由 (app/api/)

```
api/
├── admin/                    # 管理端（公司、用户、权限）
│   ├── create-company/
│   ├── create-user/
│   ├── get-company-permissions/
│   ├── update-company-permissions/
│   └── rental/contracts|usage-snapshots
├── agreements/               # 协议 CRUD
├── cron/                     # 定时任务（逾期检测）
│   ├── check-overdue-billing/
│   └── check-overdue-rentals/
├── device-rentals/           # 设备租赁记录
├── equipment/                # 设备分类、目录、租赁
│   ├── catalog/
│   ├── categories/
│   └── rental/               # admin/list, create, update, ...
├── facts/                    # 事实聚合（只读）
│   ├── orders/[order_id]/
│   ├── restaurant/[restaurant_id]/
│   └── equipment-rental-stats/
├── finance/                  # 财务（账期、对账、催收）
├── orders/                   # 订单（create, accept, dispatch, complete, ...）
├── repair/                   # 报修
├── platform/                 # 平台能力 API（新增）
│   ├── task/create|update|context
│   ├── dispatch/match|allocate|rebalance
│   ├── strategy/evaluate|select
│   ├── learning/record|train
│   ├── feedback/collect|aggregate|loop
│   └── orchestration/dispatch
├── user/context/             # 用户上下文（role, companyId）
├── ops/                      # 运营（overview, exceptions）
└── [delivery, filling, notifications, payment, ...]
```

---

## 三、lib/ 目录结构

```
lib/
├── auth/                     # 认证与权限
│   ├── user-context.ts       # 统一用户上下文（userId, role, companyId）
│   ├── fetch-with-auth.ts    # 带 Bearer 的 fetch
│   ├── requireCapability.ts  # 能力校验
│   └── worker-auth.ts        # 工人端鉴权
├── platform/                 # 平台工程（新增）
│   ├── capabilities/         # 能力接口定义
│   ├── models/               # TaskModel, WorkerModel, DecisionSample
│   ├── adapters/             # 业务表 → 平台模型适配
│   ├── decision/             # Decision Engine
│   ├── registry/             # Capability Registry
│   ├── orchestration/        # Orchestration Engine
│   └── impl/                 # 能力实现
├── facts/                    # 事实驱动架构
│   ├── adapters/
│   ├── contracts/
│   └── governance/
├── multi-tenant.ts           # 多租户过滤（enforceCompanyFilter）
├── audit.ts                  # 审计日志
├── capabilities.ts           # 能力枚举
├── supabase.ts / supabase/   # Supabase 客户端
└── [financial, rental, notifications, ...]
```

---

## 四、模块状态总览

| 模块 | 状态 | 说明 |
|------|------|------|
| Dashboard 拆分 | ✅ 完成 | 31 个子组件，page.tsx 约 1,500 行 |
| 多租户数据隔离 | ✅ 完成 | 供应商按 companyId 过滤 |
| 平台工程 | ✅ 骨架完成 | Decision/Registry/Orchestration/DecisionSample |
| 供应商导航 | ✅ 完成 | 依赖 user_companies + company_permissions |
| 事实聚合 API | ✅ 已有 | /api/facts/* 只读 |
| 设备租赁 | ⚠️ 双表 | rental_orders + rentals，部分 API 有降级 |

---

## 五、关键入口

| 入口 | 路径 | 角色要求 |
|------|------|----------|
| 管理后台 | `/dashboard` | super_admin, platform_admin, company_admin, admin |
| 登录页 | `/login` | - |
| 工人端 | `/worker` | 工人（staff） |
| 客户端 | `/customer/*`, `/mall` | 客户 |
| 用户上下文 | `GET /api/user/context` | 已登录 |
