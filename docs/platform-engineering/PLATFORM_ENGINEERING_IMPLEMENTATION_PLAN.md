# Platform Engineering 实施计划

**文档版本**: v1.0  
**创建日期**: 2026-01-31  
**原则**: 能力抽象 + 接口标准化 + 模块解耦 | 平台不理解业务，只处理模型与能力

---

## 一、架构蓝图回顾

```
Capability API（对外平台接口层）
        ↓
Decision Engine（决策引擎）
        ↓
Strategy Engine（策略引擎）
        ↓
Learning Engine（学习引擎）
        ↓
Feedback Engine（反馈引擎）
```

**铁律**: 平台不暴露表、不暴露业务逻辑、不暴露策略细节，只暴露能力接口。业务/策略/AI 是插件。

---

## 二、现有系统与平台域映射

| 平台域 | 现有实现 | 当前形态 | 目标形态 |
|--------|----------|----------|----------|
| **Task** | delivery_orders, repair_orders, rental_orders | 表直接暴露 | TaskModel + createTask/updateTaskStatus/getTaskContext |
| **Dispatch** | /api/orders/accept, /api/orders/dispatch, repair/update 指派 | 业务 API 硬编码 | match/allocate/rebalance 能力接口 |
| **Strategy** | 无 | 隐式 if-else | evaluate/score/select 接口 |
| **Learning** | 无 | 无 | record/train/updateWeights 接口 |
| **Feedback** | audit_logs, ops/overview, ops/exceptions | 事实层直接查询 | collect/aggregate/feedbackLoop 接口 |

---

## 三、分阶段实施步骤

### Phase PX-0：能力域拆解与现状映射（1 天）

**目标**: 明确五域边界，完成与现有表/API 的映射文档。

| 步骤 | 交付物 | 说明 |
|------|--------|------|
| PX-0.1 | `docs/platform-engineering/DOMAIN_MAPPING.md` | Task/Dispatch/Strategy/Learning/Feedback 与现有表、API、字段的对应关系 |
| PX-0.2 | `docs/platform-engineering/CURRENT_CAPABILITIES.md` | 现有可复用的能力清单（如 Capability 枚举、requireCapability、audit_logs） |

**验收**: 任一域可追溯到具体表/API，无遗漏。

---

### Phase PX-1：能力抽象模型（2 天）

**目标**: 定义平台统一能力接口（TypeScript），不依赖具体表结构。

| 步骤 | 交付物 | 说明 |
|------|--------|------|
| PX-1.1 | `lib/platform/capabilities/task.ts` | TaskCapability 接口：createTask, updateTaskStatus, getTaskContext |
| PX-1.2 | `lib/platform/capabilities/dispatch.ts` | DispatchCapability 接口：matchWorker, allocateTask, rebalance |
| PX-1.3 | `lib/platform/capabilities/strategy.ts` | StrategyCapability 接口：evaluate, score, select |
| PX-1.4 | `lib/platform/capabilities/learning.ts` | LearningCapability 接口：record, train, updateWeights |
| PX-1.5 | `lib/platform/capabilities/feedback.ts` | FeedbackCapability 接口：collect, aggregate, feedbackLoop |
| PX-1.6 | `lib/platform/models/index.ts` | 平台模型占位：TaskModel, WorkerModel, RegionModel 等 |

**验收**: 接口定义完整，可被 API 层引用，暂无实现（返回占位或透传）。

---

### Phase PX-2：Capability API 层骨架（2 天）

**目标**: 建立 `/api/platform/*` 标准路由，仅做请求/响应规范，内部调用占位实现。

| 步骤 | 交付物 | 说明 |
|------|--------|------|
| PX-2.1 | `app/api/platform/dispatch/match/route.ts` | POST，请求体规范，返回 match 结果占位 |
| PX-2.2 | `app/api/platform/dispatch/allocate/route.ts` | POST，请求体规范 |
| PX-2.3 | `app/api/platform/dispatch/rebalance/route.ts` | POST，请求体规范 |
| PX-2.4 | `app/api/platform/strategy/evaluate/route.ts` | POST |
| PX-2.5 | `app/api/platform/strategy/select/route.ts` | POST |
| PX-2.6 | `app/api/platform/learning/record/route.ts` | POST |
| PX-2.7 | `app/api/platform/learning/train/route.ts` | POST |
| PX-2.8 | `app/api/platform/feedback/collect/route.ts` | POST |
| PX-2.9 | `app/api/platform/feedback/aggregate/route.ts` | POST |
| PX-2.10 | `docs/platform-engineering/PLATFORM_CAPABILITY_SPEC_V1.md` | 平台能力规范 v1（请求/响应 JSON Schema） |

**验收**: 所有路由可调用，返回符合规范的占位数据，不依赖业务表。

---

### Phase PX-3：平台内核模型化（3 天）

**目标**: 定义 TaskModel、WorkerModel、RegionModel 等，使调度从 if-else 变为「模型输入 → 策略评估 → 决策输出」。

| 步骤 | 交付物 | 说明 |
|------|--------|------|
| PX-3.1 | `lib/platform/models/task-model.ts` | TaskModel 结构（id, type, status, context, constraints） |
| PX-3.2 | `lib/platform/models/worker-model.ts` | WorkerModel 结构（id, skills, location, load） |
| PX-3.3 | `lib/platform/models/region-model.ts` | RegionModel 占位 |
| PX-3.4 | `lib/platform/models/time-model.ts` | TimeModel 占位 |
| PX-3.5 | 适配器 | 从 delivery_orders/repair_orders 映射到 TaskModel 的适配函数 |

**验收**: 现有订单可转换为 TaskModel，工人可转换为 WorkerModel。

---

### Phase PX-4：Dispatch 能力首通（3 天）

**目标**: `/api/platform/dispatch/match` 与 `allocate` 接入真实逻辑，业务 API 可可选调用平台层。

| 步骤 | 交付物 | 说明 |
|------|--------|------|
| PX-4.1 | `lib/platform/impl/dispatch-match.ts` | match 实现：输入 task+workers，输出候选工人列表（可先基于简单规则） |
| PX-4.2 | `lib/platform/impl/dispatch-allocate.ts` | allocate 实现：将 task 分配给 worker，写回 assigned_to |
| PX-4.3 | 桥接 | /api/orders/accept 或 repair/update 可调用 platform dispatch（可选，不破坏现有流） |
| PX-4.4 | 决策追溯 | decision_trace 写入 audit_logs，便于后续 Learning 使用 |

**验收**: 平台 dispatch 能力可独立测试，业务接单流程可切换至平台层（可配置）。

---

### Phase PX-5：Strategy / Learning / Feedback 占位闭环（2 天）

**目标**: 三个引擎具备占位实现，形成「事件→能力编排→决策→执行→反馈」的最小闭环。

| 步骤 | 交付物 | 说明 |
|------|--------|------|
| PX-5.1 | strategy/evaluate 占位实现 | 输入 task+workers，输出 scores（可固定规则） |
| PX-5.2 | learning/record 占位实现 | 将 outcome 写入扩展表或 audit_logs |
| PX-5.3 | feedback/collect 占位实现 | 从 audit_logs 聚合，输出基础指标 |
| PX-5.4 | 编排文档 | 事件→能力编排→决策→执行→反馈 流程图与调用顺序 |

**验收**: 完整调用链可跑通，无业务逻辑依赖，仅为占位。

---

## 四、目录结构（目标）

```
app/api/platform/
  ├── task/
  │   ├── create/route.ts
  │   ├── update/route.ts
  │   └── context/route.ts
  ├── dispatch/
  │   ├── match/route.ts
  │   ├── allocate/route.ts
  │   └── rebalance/route.ts
  ├── strategy/
  │   ├── evaluate/route.ts
  │   ├── select/route.ts
  │   └── experiment/route.ts
  ├── learning/
  │   ├── record/route.ts
  │   ├── train/route.ts
  │   └── adapt/route.ts
  └── feedback/
      ├── collect/route.ts
      ├── aggregate/route.ts
      └── loop/route.ts

lib/platform/
  ├── capabilities/     # 能力接口定义
  ├── models/           # 平台模型
  └── impl/             # 各能力实现（可插拔）
```

---

## 五、执行顺序与依赖

```
PX-0 ──→ PX-1 ──→ PX-2 ──→ PX-3 ──→ PX-4 ──→ PX-5
         │         │         │
         │         │         └─ 模型与适配器
         │         └─ API 骨架
         └─ 接口定义
```

**建议**: 先完成 PX-0、PX-1、PX-2，形成「规范+接口+路由骨架」，再逐步填充 PX-3～PX-5 实现。

---

## 七、已完成步骤（2026-01-31）

| Phase | 状态 | 交付物 |
|-------|------|--------|
| PX-0 | ✅ | DOMAIN_MAPPING.md, CURRENT_CAPABILITIES.md |
| PX-1 | ✅ | lib/platform/capabilities/*, lib/platform/models/* |
| PX-2 | ✅ | app/api/platform/* 路由骨架, PLATFORM_CAPABILITY_SPEC_V1.md |
| PX-2.5 | ✅ | Decision Engine: decision-engine.ts, decision-context.ts, decision-trace.ts |
| PX-3 | ✅ | lib/platform/adapters/* 任务/工人适配器 |
| PX-4 | ✅ | dispatch/match、allocate 真实实现 |
| PX-5 | ✅ | strategy/learning/feedback 占位闭环, ORCHESTRATION_FLOW.md |
| PX-6 | ✅ | Capability Registry: capability-registry.ts, bootstrap.ts |
| PX-7 | ✅ | Orchestration Engine: orchestration-engine.ts, dispatch-flow.ts |
| PX-8 | ✅ | DecisionSample 可训练数据模型 |
| PX-9 | ✅ | Platform Governance: GOVERNANCE.md |
| PX-10 | ✅ | Task Capability 扩展 freezeContext/snapshot/mutateWithDecision |

---

## 六、风险与约束

1. **不破坏现有业务**: 平台层为新增，现有 `/api/orders/*`、`/api/repair/*` 保持不变，桥接为可选。
2. **多租户**: 平台 API 需继承现有 getUserContext / companyId 校验，不绕过。
3. **审计**: 所有平台决策写 audit_logs，便于追溯与 Learning。
