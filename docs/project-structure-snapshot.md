# 项目整体结构快照

## 目录结构（3层）

```
my-mind-chufan-app/
├── app/                          # Next.js App Router
│   ├── (admin)/                  # 管理端路由组
│   │   └── dashboard/
│   ├── api/                      # API 路由层
│   │   ├── admin/                # 管理员 API
│   │   │   ├── create-company/
│   │   │   └── find-user/
│   │   ├── facts/                # Facts API（只读）
│   │   │   ├── orders/[order_id]/
│   │   │   ├── restaurant/[restaurant_id]/
│   │   │   └── fuel/[device_id]/stats/
│   │   ├── orders/               # 订单业务 API（可写）
│   │   │   ├── accept/
│   │   │   ├── complete/
│   │   │   ├── create/
│   │   │   ├── dispatch/
│   │   │   ├── exception/
│   │   │   ├── pending/
│   │   │   └── reject/
│   │   ├── repair/               # 报修业务 API（可写）
│   │   │   ├── create/
│   │   │   ├── list/
│   │   │   ├── update/
│   │   │   └── upload-audio/
│   │   ├── worker/               # 工人端 API
│   │   │   ├── check-table/
│   │   │   └── login/
│   │   ├── equipment/            # 设备租赁 API
│   │   ├── payment/              # 支付 API
│   │   ├── restaurant/           # 餐厅 API
│   │   └── ...
│   ├── guest/                    # 游客页面
│   ├── user-bound/               # 已绑定用户页面
│   ├── user-unbound/             # 未绑定用户页面
│   ├── admin/                    # 管理端页面
│   ├── worker/                   # 工人端页面
│   ├── customer/                 # 客户页面
│   ├── supplier/                # 供应商页面
│   └── ...
├── components/                   # UI 组件层
│   ├── facts/                    # 事实组件（只读展示）
│   │   ├── AssetFactCard.tsx
│   │   └── OrderTimeline.tsx
│   ├── worker/                   # 工人端组件
│   │   ├── image-uploader.tsx
│   │   ├── order-list.tsx
│   │   ├── qr-scanner.tsx
│   │   └── repair-list.tsx
│   ├── ui/                       # 通用 UI 组件库（57个文件）
│   └── ...                       # 其他业务组件
├── lib/                          # 业务逻辑层
│   ├── facts/                    # 事实系统（只读）
│   │   ├── contracts/            # 事实契约
│   │   │   └── order.fact.ts
│   │   ├── governance/           # 事实治理层
│   │   │   └── order.fact.guard.ts
│   │   ├── health/               # 健康度计算
│   │   ├── types.ts
│   │   └── README.md
│   ├── auth/                     # 权限认证层
│   │   ├── facts-auth.ts         # Facts API 权限
│   │   ├── worker-auth.ts        # 工人端权限
│   │   ├── requireCapability.ts
│   │   └── user-context.ts
│   ├── styles/                   # 主题系统
│   │   ├── theme-context.tsx
│   │   └── themes.ts
│   ├── ops/                      # 运营系统
│   │   ├── health.ts
│   │   └── metrics.ts
│   └── ...
├── docs/                         # 文档
├── scripts/                      # 脚本
└── ...                           # 其他文件（100+ 个 .md 和 .sql 文件在根目录）
```

---

## 关键判断

### 1. 前端 / 管理端 / 工人端：同一应用多角色

**结论**：**同一 Next.js 应用，通过路由和权限区分角色**

**证据**：
- ✅ 所有页面都在 `app/` 目录下（Next.js App Router）
- ✅ 通过路由组 `(admin)/` 区分管理端
- ✅ 通过 `app/worker/` 区分工人端
- ✅ 通过 `app/guest/`, `app/user-bound/`, `app/user-unbound/` 区分用户状态
- ✅ 共享同一套 `components/` 和 `lib/` 代码库

**架构模式**：
- **单应用多角色架构**
- 通过路由权限控制访问
- 通过组件条件渲染区分角色 UI

---

### 2. UI / 事实 / API / 权限：已物理隔离

**结论**：**已实现物理隔离，但存在部分混合**

#### ✅ 已隔离的部分

**Facts 系统（完全隔离）**：
```
lib/facts/                        # 事实系统独立目录
├── contracts/                    # 事实契约（类型定义）
├── governance/                   # 事实治理层（只读检查）
├── health/                       # 健康度计算
└── types.ts                      # 事实类型定义

app/api/facts/                    # Facts API 独立路由
├── orders/[order_id]/route.ts
├── restaurant/[restaurant_id]/
└── fuel/[device_id]/stats/

components/facts/                 # 事实组件独立目录
├── AssetFactCard.tsx
└── OrderTimeline.tsx
```

**权限系统（部分隔离）**：
```
lib/auth/                         # 权限认证独立目录
├── facts-auth.ts                 # Facts API 权限验证
├── worker-auth.ts                # 工人端权限验证
└── user-context.ts              # 用户上下文
```

**主题系统（已隔离）**：
```
lib/styles/                      # 主题系统独立目录
├── theme-context.tsx
└── themes.ts
```

#### ⚠️ 混合的部分

**业务 API 与 Facts API 混合**：
```
app/api/
├── facts/                        # Facts API（只读）
│   └── ...
├── orders/                       # 业务 API（可写）
│   └── ...
├── repair/                       # 业务 API（可写）
│   └── ...
└── worker/                       # 业务 API（可写）
    └── ...
```
- ✅ 物理路径已分离（`facts/` vs `orders/`）
- ⚠️ 但都在 `app/api/` 下，共享中间件和基础设施

**UI 组件混合**：
```
components/
├── facts/                        # 事实组件（只读展示）
│   └── ...
├── worker/                       # 工人端组件（业务逻辑）
│   └── ...
└── ...                           # 其他业务组件
```
- ✅ 事实组件已独立目录
- ⚠️ 但与其他业务组件在同一层级

---

### 3. 项目"复杂"的真实来源

#### 来源 1：多角色单应用架构

**表现**：
- 同一代码库需要支持：游客、用户、管理员、工人、供应商等多种角色
- 通过路由权限和条件渲染区分，但代码逻辑交织

**复杂度**：
- 权限判断逻辑分散在多个文件
- 同一组件需要适配多种角色状态
- 路由守卫和权限检查需要覆盖所有路径

#### 来源 2：业务 API 与 Facts API 并存

**表现**：
- `app/api/orders/`：业务 API（创建、接受、完成订单等，可写）
- `app/api/facts/`：Facts API（只读事实聚合）
- 两者都需要处理订单数据，但职责不同

**复杂度**：
- 需要明确区分"业务操作"和"事实查询"
- 权限验证逻辑需要区分两种 API
- 数据流需要区分"写操作"和"读操作"

#### 来源 3：事实系统分层架构

**表现**：
- `lib/facts/contracts/`：事实契约（类型定义）
- `lib/facts/governance/`：事实治理层（异常检测）
- `lib/facts/health/`：健康度计算
- `app/api/facts/`：Facts API（事实聚合）
- `components/facts/`：事实组件（只读展示）

**复杂度**：
- 多层抽象，每层职责明确但需要协调
- 事实契约、治理、健康度、API、UI 五层联动
- 需要保证"只读"原则贯穿所有层

#### 来源 4：大量遗留文档和 SQL 文件

**表现**：
- 根目录下有 100+ 个 `.md` 和 `.sql` 文件
- 包括：迁移脚本、修复脚本、验证脚本、报告文档等

**复杂度**：
- 文档分散，难以快速定位
- SQL 脚本版本混乱，难以判断当前状态
- 历史问题记录分散，难以追溯

#### 来源 5：主题系统与 UI 组件耦合

**表现**：
- `lib/styles/`：主题系统（CSS 变量、主题切换）
- `components/`：UI 组件（使用主题变量）
- 需要确保所有组件都使用主题变量，而非硬编码

**复杂度**：
- 主题变量需要覆盖所有组件
- 硬编码色值需要逐步替换
- 主题切换需要全局生效

---

## 架构建议

### 1. 前端/管理端/工人端：保持现状

**理由**：
- ✅ 单应用多角色架构适合当前规模
- ✅ 代码复用率高
- ✅ 部署和维护成本低

**优化方向**：
- 通过路由组和权限中间件进一步隔离
- 考虑使用 Next.js 的 Route Groups 更清晰地组织

### 2. UI/事实/API/权限：继续强化隔离

**建议**：
- ✅ Facts 系统已完全隔离，保持现状
- ⚠️ 考虑将业务 API 和 Facts API 在文档中明确区分
- ⚠️ 考虑在 `lib/` 下创建 `business/` 目录，与 `facts/` 并列

### 3. 降低复杂度：文档整理

**建议**：
- 将根目录下的 `.md` 和 `.sql` 文件迁移到 `docs/` 和 `sql/` 目录
- 创建 `docs/archive/` 存放历史文档
- 创建 `sql/migrations/` 统一管理迁移脚本

---

## 总结

### 架构模式
- **单应用多角色**：通过路由和权限区分
- **Facts 系统已物理隔离**：独立的目录、API、组件
- **业务 API 与 Facts API 并存**：路径分离，但共享基础设施

### 复杂度来源
1. **多角色单应用**：权限和路由逻辑交织
2. **业务与事实并存**：需要明确区分职责
3. **事实系统分层**：多层抽象需要协调
4. **文档分散**：大量遗留文档和 SQL 文件
5. **主题系统耦合**：需要全局适配

### 当前状态
- ✅ Facts 系统架构清晰，已实现物理隔离
- ✅ 权限系统有独立目录，但逻辑分散
- ⚠️ 业务 API 与 Facts API 路径分离，但共享中间件
- ⚠️ 文档和 SQL 文件需要整理
