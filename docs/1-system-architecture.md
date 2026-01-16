# 1. 全端架构蓝图 (System Architecture)

**生成时间**：2025-01-20  
**文档版本**：v1.0

---

## 一、端口分布与路由架构

### 1.1 客户端端口（Client）

**入口文件**：`app/page.tsx`（身份调度层）

**路由结构**：

| 路由路径 | 文件路径 | 面向角色 | 核心功能 | 状态 |
|---------|---------|---------|---------|------|
| `/` | `app/page.tsx` | 所有用户（调度器） | 身份判断与路由分发 | ✅ 完成 |
| `/guest` | `app/guest/page.tsx` | 游客（未登录） | 营销门户、服务介绍 | ✅ 完成 |
| `/user-bound` | `app/user-bound/page.tsx` | 已绑定用户 | 正式用户事实看板（Facts API） | ✅ 完成 |
| `/user-unbound` | `app/user-unbound/page.tsx` | 已注册未绑定 | 离线态看板、引导绑定 | ✅ 完成 |
| `/login` | `app/login/page.tsx` | 管理员 | 管理员登录（Supabase Auth） | ✅ 完成 |
| `/register` | `app/register/page.tsx` | 所有用户 | 用户注册（餐厅/商户） | ✅ 完成 |
| `/profile` | `app/profile/page.tsx` | 已登录用户 | 个人资料管理 | ✅ 完成 |
| `/devices` | `app/devices/page.tsx` | 已绑定用户 | 设备管理、金融视图（权限控制） | ✅ 完成 |
| `/payment` | `app/payment/page.tsx` | 已绑定用户 | 燃料订购、支付处理 | ✅ 完成 |
| `/orders` | `app/orders/page.tsx` | 已绑定用户 | 订单列表查询 | ✅ 完成 |
| `/addresses` | `app/addresses/page.tsx` | 已绑定用户 | 地址管理（高德地图集成） | ✅ 完成 |
| `/equipment-rental` | `app/equipment-rental/page.tsx` | 已绑定用户 | 设备租赁下单 | ✅ 完成 |
| `/equipment-showcase` | `app/equipment-showcase/page.tsx` | 公开 | 设备展示墙 | ✅ 完成 |
| `/repair/create` | `app/repair/create/page.tsx` | 已绑定用户 | 一键报修（语音录制） | ✅ 完成 |
| `/customer/confirm` | `app/customer/confirm/page.tsx` | 客户 | 订单确认验收 | ✅ 完成 |
| `/customer/order` | `app/customer/order/page.tsx` | 客户 | 客户下单页面 | ✅ 完成 |
| `/settings` | `app/settings/page.tsx` | 已登录用户 | 系统设置、主题切换 | ✅ 完成 |
| `/themes` | `app/themes/page.tsx` | 已登录用户 | 主题选择页面 | ✅ 完成 |

**身份判断流程**（`app/page.tsx`）：

```
1. 是否已登录？
   ├─ Supabase Auth user（管理员）
   ├─ localStorage.restaurantId（客户端用户）
   └─ 否 → /guest

2. 是否管理员角色？
   ├─ 查询 user_roles 表
   └─ 是（super_admin/admin） → /dashboard

3. 是否已绑定业务主体？
   ├─ 检查 restaurantId
   └─ 否 → /user-unbound

4. 是否已绑定设备/资产？
   ├─ 查询 devices 表
   └─ 否 → /user-unbound

5. 默认 → /user-bound
```

### 1.2 管理端端口（Admin）

**路由结构**：

| 路由路径 | 文件路径 | 权限要求 | 核心功能 | 状态 |
|---------|---------|---------|---------|------|
| `/dashboard` | `app/(admin)/dashboard/page.tsx` | super_admin / admin | 管理看板、订单管理、供应商管理 | ✅ 完成 |
| `/admin` | `app/admin/page.tsx` | super_admin / admin | 管理端入口（重定向） | ✅ 完成 |
| `/admin/rental/contracts` | `app/(admin)/rental/contracts/page.tsx` | admin | 租赁合同管理 | ✅ 完成 |
| `/admin/rental/usage-snapshots` | `app/(admin)/rental/usage-snapshots/page.tsx` | admin | 使用快照查看（只读） | ✅ 完成 |

**权限验证**：
- 基于 `user_roles` 表查询角色
- `super_admin`：可访问所有租户数据
- `admin`：仅可访问本租户（`company_id`）数据

### 1.3 工人端端口（Worker）

**路由结构**：

| 路由路径 | 文件路径 | 权限要求 | 核心功能 | 状态 |
|---------|---------|---------|---------|------|
| `/worker` | `app/worker/page.tsx` | staff（通过 workers 表验证） | 工作台、订单接单、配送、报修处理 | ✅ 完成 |

**登录方式**：
- 通过 `/api/worker/login` 登录
- 支持 `worker_id` 或 `phone` 登录
- 返回工人信息和权限

### 1.4 供应商端端口（Supplier）

**路由结构**：

| 路由路径 | 文件路径 | 权限要求 | 核心功能 | 状态 |
|---------|---------|---------|---------|------|
| `/supplier/upload` | `app/supplier/upload/page.tsx` | 供应商用户（通过 user_companies 关联） | 设备产品信息上传、图片上传、提交审核 | ✅ 完成 |

---

## 二、核心技术栈

### 2.1 前端框架

**Next.js 16.0.10**
- **框架类型**：React 全栈框架
- **渲染模式**：服务端渲染（SSR）+ 客户端渲染（CSR）
- **路由系统**：App Router（基于文件系统）
- **API 路由**：`app/api/**` 目录下的 Route Handlers

**React 19.2.0**
- **状态管理**：React Hooks（useState, useEffect, useContext）
- **组件模式**：函数式组件 + Hooks
- **服务端组件**：支持 React Server Components（部分页面）

### 2.2 UI 组件库

**Radix UI**（无样式组件库）
- **版本**：最新稳定版
- **组件数量**：50+ 组件
- **位置**：`components/ui/` 目录
- **特点**：完全可访问性（a11y）、无样式、可定制

**Tailwind CSS 4.1.9**
- **配置方式**：`tailwind.config.js` + CSS 变量
- **主题集成**：通过 CSS 变量与主题系统集成
- **工具类**：Utility-first CSS 框架

**Lucide React 0.454.0**
- **图标库**：图标组件库
- **使用方式**：按需导入图标组件

### 2.3 后端服务

**Supabase 2.89.0**
- **服务类型**：Backend-as-a-Service (BaaS)
- **核心功能**：
  - **数据库**：PostgreSQL（托管）
  - **认证**：Supabase Auth（JWT 基于）
  - **实时通信**：Supabase Realtime（WebSocket）
  - **存储**：Supabase Storage（文件存储）
  - **RLS**：Row Level Security（行级安全）

**Supabase 客户端配置**（`lib/supabase.ts`）：
```typescript
{
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10, // 限制每秒事件数
    },
  },
}
```

**环境变量**：
- `NEXT_PUBLIC_SUPABASE_URL`：Supabase 项目 URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`：匿名密钥（客户端）
- `SUPABASE_SERVICE_ROLE_KEY`：服务角色密钥（服务端，仅系统级 API）

### 2.4 实时通信

**Supabase Realtime**
- **协议**：WebSocket
- **使用场景**：
  1. **IoT 设备监控**（`components/iot-dashboard.tsx`）
     - 订阅 `fuel_level` 表变化
     - 实时更新燃料剩余量
  2. **维修工单推送**（`components/worker/repair-list.tsx`）
     - 订阅 `repair_orders` 表变化
     - 实时推送新工单给工人
  3. **管理端订单更新**（`app/(admin)/dashboard/page.tsx`）
     - 订阅 `orders` 表变化
     - 实时刷新订单列表

**实现方式**：
```typescript
const channel = supabase
  .channel(`channel-name`)
  .on(
    "postgres_changes",
    {
      event: "*", // INSERT, UPDATE, DELETE
      schema: "public",
      table: "table_name",
      filter: "column=eq.value", // 可选过滤
    },
    (payload) => {
      // 处理实时更新
    }
  )
  .subscribe()
```

### 2.5 外部集成 API

**高德地图（AMap）**
- **SDK**：`@amap/amap-jsapi-loader` 1.0.1
- **使用场景**：
  - 地址管理（`app/addresses/page.tsx`）
  - GPS 定位
  - 逆地理编码（坐标转地址）
- **加载方式**：动态加载（`lib/amap-loader.ts`）
- **缓存机制**：地址缓存（`lib/geocoding-cache.ts`）

**支付宝支付**
- **API 路由**：
  - `/api/payment/alipay/create`：创建支付订单
  - `/api/payment/alipay/notify`：支付回调处理
- **集成方式**：服务端 API 调用支付宝接口

**二维码扫描**
- **库**：`html5-qrcode` 2.3.8
- **使用场景**：
  - 工人端扫码接单（`components/worker/qr-scanner.tsx`）
  - 设备绑定
- **实现方式**：浏览器摄像头 API

### 2.6 状态管理与数据流

**React Context**
- **主题管理**：`lib/styles/theme-context.tsx`
- **用户上下文**：`lib/auth/user-context.ts`（服务端）

**数据获取方式**：
1. **客户端组件**：直接调用 Supabase 客户端
2. **服务端 API**：通过 `/api/**` 路由
3. **Facts API**：只读事实数据 API（`app/api/facts/**`）

**错误处理策略**：
- **A 类错误**（系统不可恢复）：使用 `console.error`
- **B 类错误**（可预期业务失败）：使用 `logBusinessWarning`（`lib/utils/logger.ts`）
- **C 类错误**（数据适配失败）：使用 `console.warn`

---

## 三、API 路由架构

### 3.1 API 权限级别分类

**系统级 API (SYSTEM_LEVEL)**
- **权限要求**：`super_admin`
- **密钥类型**：Service Role Key
- **API 列表**：
  - `POST /api/admin/create-company`：创建供应商公司
  - `POST /api/admin/find-user`：查找用户（按邮箱）

**租户级 API (COMPANY_LEVEL)**
- **权限要求**：`admin` / `staff`
- **密钥类型**：Anon Key + RLS
- **数据隔离**：通过 `company_id` 过滤
- **API 列表**：
  - `POST /api/orders/create`：创建订单
  - `GET /api/equipment/rental/list`：设备租赁列表

**员工级 API (STAFF_LEVEL)**
- **权限要求**：`staff`（通过 `workers` 表验证）
- **密钥类型**：Anon Key + RLS
- **数据隔离**：通过 `worker_id` / `assigned_to` 过滤
- **API 列表**：
  - `POST /api/orders/accept`：接单
  - `POST /api/orders/complete`：完成配送
  - `POST /api/delivery`：处理燃料配送

**公开 API (PUBLIC)**
- **权限要求**：无（但受 RLS 策略限制）
- **密钥类型**：Anon Key
- **API 列表**：
  - `POST /api/restaurant/login`：餐厅登录
  - `POST /api/worker/login`：工人登录
  - `POST /api/fuel-sensor`：传感器数据接收

**事实 API (FACTS)**
- **权限要求**：已登录用户（客户端用户或管理员）
- **密钥类型**：Anon Key + RLS
- **特点**：只读、不可修改
- **API 列表**：
  - `GET /api/facts/restaurant/[restaurant_id]/overview`：餐厅总览
  - `GET /api/facts/restaurant/[restaurant_id]/assets`：关联资产
  - `GET /api/facts/orders/[order_id]`：订单详情

### 3.2 API 路由目录结构

```
app/api/
├── admin/                    # 管理端 API
│   ├── create-company/      # 创建供应商公司
│   ├── find-user/           # 查找用户
│   └── rental/              # 租赁管理
├── delivery/                 # 配送相关
│   ├── location/            # GPS 位置
│   └── route.ts             # 配送处理
├── equipment/                # 设备相关
│   ├── catalog/             # 设备目录
│   ├── categories/          # 设备分类
│   ├── list/                # 设备列表
│   └── rental/              # 设备租赁
├── facts/                    # 事实 API（只读）
│   ├── restaurant/          # 餐厅事实
│   ├── orders/              # 订单事实
│   └── fuel/                # 燃料事实
├── orders/                   # 订单管理
│   ├── create/              # 创建订单
│   ├── accept/              # 接单
│   ├── complete/            # 完成配送
│   ├── dispatch/            # 派单
│   └── pending/             # 待接单列表
├── repair/                   # 报修相关
│   ├── create/              # 创建报修
│   ├── list/                # 报修列表
│   └── update/              # 更新报修
├── restaurant/               # 餐厅相关
│   ├── login/               # 餐厅登录
│   ├── register/            # 餐厅注册
│   └── generate-token/      # 生成令牌
├── worker/                   # 工人相关
│   └── login/               # 工人登录
└── storage/                  # 文件存储
    └── upload/               # 图片上传
```

---

## 四、部署与构建

### 4.1 构建配置

**Next.js 配置**（`next.config.mjs`）：
```javascript
{
  typescript: {
    ignoreBuildErrors: true, // 构建时忽略 TypeScript 错误
  },
  images: {
    unoptimized: true, // 图片不优化（适用于某些部署环境）
  },
  env: {
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },
}
```

### 4.2 环境变量

**必需环境变量**：
- `NEXT_PUBLIC_SUPABASE_URL`：Supabase 项目 URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`：Supabase 匿名密钥
- `SUPABASE_SERVICE_ROLE_KEY`：Supabase 服务角色密钥（仅服务端）

**可选环境变量**：
- `NODE_ENV`：环境模式（development / production）

### 4.3 构建命令

```bash
# 开发模式
npm run dev

# 生产构建
npm run build

# 生产启动
npm run start

# 代码检查
npm run lint
```

---

## 五、项目目录结构

```
my-mind-chufan-app/
├── app/                      # Next.js App Router
│   ├── (admin)/             # 管理端路由组
│   ├── (guest)/             # 游客路由组
│   ├── api/                 # API 路由
│   ├── globals.css          # 全局样式
│   ├── layout.tsx           # 根布局
│   └── page.tsx             # 入口调度器
├── components/              # React 组件
│   ├── ui/                 # UI 组件库
│   ├── worker/             # 工人端组件
│   └── layout/             # 布局组件
├── lib/                     # 工具库
│   ├── styles/             # 主题系统
│   ├── auth/               # 认证模块
│   ├── facts/              # 事实治理层
│   ├── supabase.ts         # Supabase 客户端
│   └── utils/              # 工具函数
├── hooks/                   # React Hooks
├── public/                  # 静态资源
├── docs/                    # 文档
├── scripts/                 # 工具脚本
├── migrations/              # 数据库迁移
├── package.json             # 依赖配置
├── tsconfig.json            # TypeScript 配置
├── tailwind.config.js       # Tailwind 配置
└── next.config.mjs          # Next.js 配置
```

---

## 六、技术栈版本汇总

| 技术 | 版本 | 用途 |
|------|------|------|
| Next.js | 16.0.10 | React 全栈框架 |
| React | 19.2.0 | UI 框架 |
| TypeScript | 5.x | 类型系统 |
| Supabase | 2.89.0 | 后端服务 |
| Tailwind CSS | 4.1.9 | CSS 框架 |
| Radix UI | 最新 | UI 组件库 |
| Lucide React | 0.454.0 | 图标库 |
| Framer Motion | 12.23.26 | 动画库 |
| html5-qrcode | 2.3.8 | 二维码扫描 |
| @amap/amap-jsapi-loader | 1.0.1 | 高德地图 SDK |

---

**文档结束**
