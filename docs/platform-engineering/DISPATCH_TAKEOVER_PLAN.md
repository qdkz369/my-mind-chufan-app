# Dispatch 决策接管实施计划

**版本**: v1.0  
**日期**: 2026-01-31  
**范围**: 仅 Dispatch（配送/报修）链路，不涉及租赁、财务、Dashboard

---

## 一、接管级别定义

| 级别 | 名称 | 含义 |
|------|------|------|
| L0 | Observe | 平台只记录，不影响结果 |
| L1 | Shadow | 平台算决策，但不执行（记录差异） |
| L2 | Suggest | 平台给建议，业务可拒绝（须写 reason） |
| L3 | Enforced | 平台是唯一决策源 |
| L4 | Locked | 业务绕过即报错 |

**当前目标**: 先达到 L1 Shadow，可回放任意派单决策。

---

## 二、当前状态诊断

### 2.1 业务 API 现状

| API | 当前行为 | 问题 |
|-----|----------|------|
| POST /api/orders/dispatch | 直接使用请求体 worker_id，写 assigned_to | 决策不可追溯 |
| POST /api/orders/accept | 工人自选接单，直接写 assigned_to | 工人驱动，暂不接管 |
| POST /api/repair/update (assigned_to) | 直接使用请求体 assigned_to | 决策不可追溯 |

### 2.2 平台组件现状

| 组件 | 状态 |
|------|------|
| orchestration/dispatch | 存在，但需传入 worker_id，不做决策 |
| dispatch-match | 存在，返回候选工人 |
| dispatch-allocate | 存在，写 DB + 审计 |
| Decision Engine | 存在，未与业务 API 桥接 |
| DecisionSample | 结构已有，learning-record 可写 audit_logs |

---

## 三、实施步骤（分阶段）

### Phase A：Shadow 接管（最低风险）

**目标**: 平台算完整决策并记录，不影响现有 assigned_to 行为。

#### Step A1：创建 Dispatch Gateway 服务

- **路径**: `lib/platform/dispatch-gateway.ts`
- **职责**:
  - 输入: `task_id`, `task_type`, `business_provided_worker_id?`
  - 执行: match → strategy.evaluate → 产出 platform_selected_worker
  - 输出: `{ decision_id, platform_selected_worker, candidates, trace, business_override }`
  - 写入: DecisionTrace (audit_logs), DecisionSample (PLATFORM_LEARNING_RECORD)
  - Shadow 模式: 返回 platform 决策，但业务 API 仍用 business_provided_worker 执行

#### Step A2：修改 POST /api/orders/dispatch

- 在更新 assigned_to 之前，调用 Dispatch Gateway
- 传入: task_id=order_id, task_type=delivery, business_provided_worker_id=worker_id
- 接收: decision_id, trace
- 行为: 继续用 worker_id 写 assigned_to（Shadow）
- 在 audit_logs 中写入 decision_id 关联

#### Step A3：修改 POST /api/repair/update（仅当 assigned_to 有值时）

- 在更新 assigned_to 之前，调用 Dispatch Gateway
- 传入: task_id=repair_id, task_type=repair, business_provided_worker_id=assigned_to
- 接收: decision_id, trace
- 行为: 继续用 assigned_to 写（Shadow）

#### Step A4：PLATFORM_BYPASS_ATTEMPT 与断言（为 Phase C 预留）

- 在 dispatch-gateway 或 allocate 前：若无 decision_id 且模式为 Enforced → reject
- 新增 audit action: `PLATFORM_BYPASS_ATTEMPT`（当检测到旁路尝试时记录）
- Shadow 阶段：不阻断，仅记录

#### 验收标准（Phase A）✅ 2026-01-31

- [x] 任意一次 dispatch 可回放：`GET /api/platform/dispatch/replay?task_id=xxx`
- [x] DecisionTrace 含 candidates、scores、platform_selected、business_override
- [x] 业务行为不变（仍使用业务传入的 worker）
- [x] `lib/platform/dispatch-gateway.ts`：match → evaluate → 写 trace + learning
- [x] 环境变量 `PLATFORM_DISPATCH_TAKEOVER_MODE`：shadow | suggest | enforced（默认 shadow）

---

### Phase B：Suggest 接管 ✅ 2026-01-31

- [x] 前端/业务 API 展示：推荐工人、推荐理由
  - `GET /api/platform/dispatch/recommend` 获取推荐
  - 报修分配对话框展示「平台推荐: X (理由)」
- [x] 若业务拒绝平台建议，必须选 `rejected_category` + 可填 `rejected_text`
  - `RejectReasonCategory`: CUSTOMER_SPECIFIED | URGENT_OVERRIDE | EXPERIENCE_PREFERENCE | PLATFORM_MISMATCH | OTHER
  - Learning 同时存 `rejected_category`、`rejected_text`
- [x] 结构化推荐（平台消费）
  - `platform_recommendation`: { primary_reason, secondary_factors, confidence_score }
  - UI 用 `formatRecommendationForUI()` 展示

### Phase C：正确打开方式（⚠️ 禁止直接切 enforced）

**目标**: 让「不采用平台决策」成为异常事件，而非常态。

#### C1. Override 比例阈值化（只读指标，不改业务逻辑）

- 引入只读指标：
  - `override_rate_by_task_type`
  - `override_rate_by_operator`
  - `override_rate_by_reason`
- 软阈值：30% 黄色 / 50% 红色（review）
- **交付**: metrics + dashboard

#### C2. Enforced-on-Subset（局部收紧）

- 不是全局 enforced，而是按 scope：
  - `PLATFORM_ENFORCED_SCOPE=repair@region=HZ`
  - 某 task_type / 某 region / 某时间段
- 平台工程永远局部收紧，不是全面上锁

#### C3. 决策失败兜底

- Decision timeout → fallback strategy
- Capability unavailable → default policy
- 否则 enforced 一定失败

---

## 四、必须禁止的平台旁路点（红线）

| 行为 | 状态 |
|------|------|
| 业务层直接写 assigned_to（不经 platform） | ❌ 禁止（Enforced 后） |
| 前端指定 worker_id 并直写 | ❌ 禁止（Enforced 后） |
| 无 DecisionTrace 的派单 | ❌ 禁止 |

---

## 五、平台生效证明（需能回答）

1. 过去 7 天有多少派单是平台决策？
2. 其中多少次业务拒绝了平台？
3. 拒绝的理由是什么？

**实现**: 通过 audit_logs 中 `PLATFORM_LEARNING_RECORD`、`PLATFORM_DISPATCH_ALLOCATE` 及 metadata 统计。

---

## 六、接管完成验收标准

| 条件 | 状态 |
|------|------|
| Dispatch 100% 经过 Orchestration | ☐ |
| 每次派单有 DecisionTrace | ☐ |
| DecisionSample 可回放 | ☐ |
| 可统计「如果不用平台会怎样」 | ☐ |

全部勾上方可进入下一阶段。
