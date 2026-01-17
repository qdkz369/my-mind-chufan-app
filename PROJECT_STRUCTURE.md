# 项目整体结构信息 - 上线前架构审查

## 1. 项目目录树（tree -L 4，排除 node_modules）

```
my-mind-chufan-app/
├── .backup/                          # 备份目录
│   └── constraints/                  # 约束备份
├── app/                              # Next.js App Router 主目录
│   ├── (admin)/                      # 管理端路由组
│   │   ├── dashboard/                # 管理后台仪表盘
│   │   │   ├── page.tsx              # 主仪表盘页面（10588行）
│   │   │   ├── agreement-management.tsx
│   │   │   ├── product-approval.tsx
│   │   │   ├── send-notification.tsx
│   │   │   └── supplier-management.tsx
│   │   └── rental/                   # 租赁管理
│   │       ├── contracts/
│   │       └── usage-snapshots/
│   ├── (guest)/                      # 访客路由组
│   ├── api/                          # API 路由（Next.js API Routes）
│   │   ├── admin/                    # 管理员API
│   │   │   ├── create-company/
│   │   │   ├── create-user/
│   │   │   ├── find-user/
│   │   │   ├── get-company-permissions/
│   │   │   ├── get-users-info/
│   │   │   ├── update-company-permissions/
│   │   │   └── rental/
│   │   ├── agreements/               # 协议管理API
│   │   ├── delivery/                 # 配送API
│   │   ├── device-rentals/            # 设备租赁API
│   │   ├── equipment/                # 设备管理API
│   │   │   ├── catalog/              # 产品目录
│   │   │   ├── categories/
│   │   │   ├── list/
│   │   │   └── rental/               # 租赁相关
│   │   │       ├── admin/
│   │   │       ├── create/
│   │   │       ├── finance/
│   │   │       ├── list/
│   │   │       ├── payment/
│   │   │       ├── update/
│   │   │       └── worker/
│   │   ├── facts/                    # 事实驱动API
│   │   ├── filling/                  # 充装API
│   │   ├── notifications/            # 通知API
│   │   ├── orders/                   # 订单API
│   │   ├── repair/                   # 报修API
│   │   ├── restaurant/               # 餐厅API
│   │   ├── status/                   # 状态管理API
│   │   ├── storage/                  # 存储API
│   │   └── worker/                   # 工人API
│   ├── addresses/
│   ├── admin/
│   ├── community/
│   ├── course/
│   ├── customer/
│   ├── devices/
│   ├── equipment-rental/
│   ├── equipment-showcase/
│   ├── guest/
│   ├── login/
│   ├── mall/
│   ├── orders/
│   ├── payment/
│   ├── profile/
│   ├── register/
│   ├── repair/
│   ├── services/
│   ├── settings/
│   ├── supplier/
│   ├── themes/
│   ├── user-bound/
│   ├── user-unbound/
│   ├── worker/
│   ├── globals.css
│   ├── layout.tsx                    # 根布局
│   ├── loading.tsx
│   └── page.tsx                      # 根页面（路由调度器）
├── components/                       # React 组件
│   ├── facts/                        # 事实驱动组件
│   ├── finance/                      # 金融视图组件
│   ├── layout/                       # 布局组件
│   ├── ui/                           # Shadcn UI 组件（60个文件）
│   └── worker/                       # 工人端组件
├── lib/                              # 工具库和业务逻辑
│   ├── auth/                         # 认证相关
│   │   ├── facts-auth.ts
│   │   ├── requireCapability.ts
│   │   ├── user-context.ts           # 统一用户上下文（核心权限入口）
│   │   └── worker-auth.ts
│   ├── config/                       # 配置
│   ├── facts/                        # 事实驱动架构
│   │   ├── adapters/
│   │   ├── contracts/
│   │   ├── governance/
│   │   └── health/
│   ├── notifications/                # 通知系统
│   ├── ops/                          # 运营监控
│   ├── rental/                       # 租赁业务逻辑
│   ├── styles/                       # 样式系统
│   ├── supabase/                     # Supabase 客户端
│   ├── types/                        # TypeScript 类型定义
│   ├── ui-contexts/                  # UI 上下文
│   ├── ui-semantic/                  # 语义化UI
│   ├── utils/                        # 工具函数
│   ├── multi-tenant.ts               # 多租户工具
│   ├── status-manager.ts             # 状态管理
│   └── supabase.ts                   # Supabase 客户端初始化
├── migrations/                       # 数据库迁移脚本
│   ├── 20250120_*.sql                # 2025-01-20 迁移
│   ├── 20250121_*.sql                # 2025-01-21 迁移
│   ├── 20250122_*.sql                # 2025-01-22 迁移
│   ├── 20250123_*.sql                # 2025-01-23 迁移
│   └── 20250125_*.sql                # 2025-01-25 迁移（最新）
├── scripts/                         # 脚本工具
├── sql/                             # SQL 脚本（空目录）
├── public/                           # 静态资源
│   └── assets/
├── styles/                           # 全局样式
├── supabase/                         # Supabase 配置
│   └── migrations/
├── hooks/                            # React Hooks
├── docs/                             # 文档
├── .gitignore
├── components.json                   # Shadcn UI 配置
├── next.config.mjs                   # Next.js 配置
├── package.json                      # 项目依赖
├── postcss.config.mjs                # PostCSS 配置
├── tailwind.config.ts                # Tailwind CSS 配置
├── tsconfig.json                     # TypeScript 配置
└── [大量 SQL 和 Markdown 文档文件]   # 项目文档和SQL脚本
```

## 2. 当前使用的运行环境说明

### Next.js 版本
- **版本**: 16.0.10
- **框架**: Next.js App Router（App Router 架构）
- **React 版本**: 19.2.0
- **TypeScript**: 5.x

### 架构类型
- **单体应用**: ✅ 是
- **架构模式**: Next.js 全栈应用（前端 + API Routes）
- **部署方式**: 单仓库部署（Monorepo 风格，但实际为单体）

### 技术栈
- **前端框架**: Next.js 16 (App Router)
- **UI 库**: Shadcn UI (基于 Radix UI)
- **样式**: Tailwind CSS 4.1.9
- **状态管理**: React Hooks (useState, useEffect, useCallback)
- **数据库**: Supabase (PostgreSQL)
- **认证**: Supabase Auth
- **实时通信**: Supabase Realtime
- **地图服务**: 高德地图 (@amap/amap-jsapi-loader)

## 3. .env.example 内容（隐藏真实 key）

```env
# ============================================
# Supabase 配置（必需）
# ============================================
# Supabase 项目 URL
# 获取方式：Supabase Dashboard -> Settings -> API -> Project URL
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co

# Supabase Anon Key（公开密钥，用于客户端）
# 获取方式：Supabase Dashboard -> Settings -> API -> anon public key
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Supabase Service Role Key（服务端密钥，敏感信息）
# 获取方式：Supabase Dashboard -> Settings -> API -> service_role key
# ⚠️ 警告：此密钥仅在服务端使用，不要暴露到客户端
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# ============================================
# 高德地图配置（可选）
# ============================================
# 高德地图安全密钥
# 用于高德地图 API 调用
NEXT_PUBLIC_AMAP_KEY=your-amap-key-here

# ============================================
# 环境标识（可选）
# ============================================
# 当前环境：development | staging | production
# 默认：development
NODE_ENV=development
```

### 环境变量说明

| 变量名 | 类型 | 必需 | 说明 | 暴露范围 |
|--------|------|------|------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | 公开 | ✅ | Supabase 项目 URL | 客户端 + 服务端 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 公开 | ✅ | Supabase 匿名密钥 | 客户端 + 服务端 |
| `SUPABASE_SERVICE_ROLE_KEY` | 敏感 | ✅ | Supabase 服务角色密钥 | 仅服务端 |
| `NEXT_PUBLIC_AMAP_KEY` | 公开 | ❌ | 高德地图 API 密钥 | 客户端 + 服务端 |
| `NODE_ENV` | 系统 | ❌ | Node.js 环境标识 | 服务端 |

### 环境变量使用位置

- **`lib/supabase.ts`**: 客户端 Supabase 初始化
- **`lib/supabase/server.ts`**: 服务端 Supabase 初始化
- **`lib/auth/user-context.ts`**: 用户上下文获取（使用 Service Role Key）
- **`lib/multi-tenant.ts`**: 多租户数据隔离
- **`app/api/**/*.ts`**: 所有 API 路由
- **`next.config.mjs`**: Next.js 配置（仅 Service Role Key）

## 4. 环境区分（dev / staging / prod）

### 当前状态
- ❌ **未明确区分**: 项目目前**没有**明确的 dev / staging / prod 环境配置
- ✅ **使用 NODE_ENV**: 代码中通过 `process.env.NODE_ENV` 判断环境
- ⚠️ **环境变量统一**: 所有环境使用相同的环境变量名称

### 环境变量管理方式

#### 开发环境（Development）
- **文件**: `.env.local`（本地开发，已加入 `.gitignore`）
- **配置方式**: 本地文件
- **NODE_ENV**: `development`

#### 生产环境（Production）
- **配置方式**: 部署平台环境变量（如 Vercel、Netlify）
- **NODE_ENV**: `production`
- **建议**: 在部署平台配置所有必需的环境变量

#### 预发布环境（Staging）
- ❌ **未配置**: 目前没有独立的 staging 环境
- **建议**: 如需 staging，可在部署平台创建独立项目并配置环境变量

### 环境区分建议

#### 方案 1：使用环境变量前缀（推荐）
```env
# .env.development.local
NEXT_PUBLIC_SUPABASE_URL=https://dev-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=dev-anon-key
SUPABASE_SERVICE_ROLE_KEY=dev-service-key

# .env.staging.local
NEXT_PUBLIC_SUPABASE_URL=https://staging-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=staging-anon-key
SUPABASE_SERVICE_ROLE_KEY=staging-service-key

# .env.production.local
NEXT_PUBLIC_SUPABASE_URL=https://prod-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=prod-anon-key
SUPABASE_SERVICE_ROLE_KEY=prod-service-key
```

#### 方案 2：使用部署平台环境变量（当前方式）
- **Vercel**: 在项目设置中为不同环境（Production / Preview / Development）配置不同的环境变量
- **Netlify**: 在站点设置中为不同分支配置环境变量

### 代码中的环境判断

```typescript
// 当前代码中的环境判断示例
if (process.env.NODE_ENV === 'development') {
  // 开发环境逻辑
}

if (process.env.NODE_ENV === 'production') {
  // 生产环境逻辑
}
```

## 5. 项目规模统计

### 代码文件统计
- **API 路由**: ~80+ 个 API 端点
- **页面组件**: ~30+ 个页面
- **React 组件**: ~100+ 个组件
- **数据库迁移**: 18 个迁移脚本
- **工具库**: ~50+ 个工具函数/模块

### 主要业务模块
1. **用户认证与权限管理**
2. **多租户数据隔离**
3. **餐厅管理**
4. **订单管理（配送/报修）**
5. **设备租赁管理**
6. **设备监控**
7. **工人管理**
8. **燃料价格监控**
9. **协议管理**
10. **通知系统**

## 6. 上线前检查清单

### ✅ 已完成
- [x] Next.js 16 App Router 架构
- [x] TypeScript 配置
- [x] 环境变量配置说明
- [x] 数据库迁移脚本
- [x] 多租户数据隔离
- [x] 权限验证系统

### ⚠️ 需要完善
- [ ] 创建 `.env.example` 文件（当前缺失）
- [ ] 明确区分 dev / staging / prod 环境
- [ ] 生产环境环境变量配置文档
- [ ] 部署配置文档（Vercel/Netlify 等）
- [ ] 数据库备份策略
- [ ] 监控和日志系统配置

---

**生成时间**: 2025-01-25
**项目名称**: my-mind-chufan-app
**项目类型**: Next.js 全栈应用（单体架构）
