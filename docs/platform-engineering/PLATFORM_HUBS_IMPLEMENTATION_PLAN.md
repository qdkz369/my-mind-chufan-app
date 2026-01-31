# 平台五大中枢补齐计划

**版本**: v1.0  
**目标**: 从「API 层平台化」升级为「能力 × 决策 × 演化 × 治理」的真正平台工程

---

## 一、问题诊断

| 现状 | 目标 |
|------|------|
| 决策分散在 match/evaluate/allocate 中 | Decision Engine 独立、可编排 |
| 能力静态引用 | Capability Registry 可注册/发现/替换 |
| API 点对点调用 Capability | Orchestration Engine 统一编排 |
| Learning 仅写 audit_logs | DecisionSample 可训练数据结构 |
| 无版本/灰度/回滚 | Platform Governance 治理定义 |
| Task 仅 CRUD | freezeContext / snapshot / mutateWithDecision |

---

## 二、实施计划（优先级顺序）

### Phase PX-2.5：Decision Engine 独立模块（最高优先级）

**交付物**:
- `lib/platform/decision/decision-engine.ts`
- `lib/platform/decision/decision-context.ts`
- `lib/platform/decision/decision-trace.ts`

**核心接口**:
```ts
DecisionEngine {
  input(models, context)
  applyStrategies()
  resolveConflicts()
  produceDecision()
  emitDecisionTrace()
}
```

---

### Phase PX-6：Capability Registry

**交付物**:
- `lib/platform/registry/capability-registry.ts`
- `lib/platform/registry/types.ts`

**核心接口**:
```ts
CapabilityRegistry {
  register(capabilityType, implementation, meta)
  resolve(capabilityType, version, tenant)
}
```

---

### Phase PX-7：Orchestration Engine

**交付物**:
- `lib/platform/orchestration/orchestration-engine.ts`
- `lib/platform/orchestration/dispatch-flow.ts`

**核心接口**:
```ts
OrchestrationEngine {
  onEvent()
  invokeCapabilities()
  manageState()
  handleRetry()
  handleTimeout()
}
```

---

### Phase PX-8：DecisionSample 可训练数据模型

**交付物**:
- `lib/platform/models/decision-sample.ts`
- 扩展 learning/record 写入 DecisionSample 结构

**结构**:
```ts
DecisionSample {
  task_snapshot
  worker_snapshot
  strategy_version
  decision
  outcome
  metrics
}
```

---

### Phase PX-9：Platform Governance

**交付物**:
- `docs/platform-engineering/GOVERNANCE.md`

**内容**:
- Capability Versioning 规则
- Strategy 生效范围（tenant / region / time）
- 决策失败兜底策略
- 强制回退机制

---

### Phase PX-10：Task Capability 扩展

**交付物**:
- 扩展 `lib/platform/capabilities/task.ts`
- `freezeContext` / `snapshot` / `mutateWithDecision`

---

## 三、依赖关系

```
PX-2.5 Decision Engine ──┬──→ PX-7 Orchestration（编排调用 Decision）
                         └──→ PX-8 DecisionSample（Decision 产出可训练样本）

PX-6 Registry ──────────────→ 所有 Capability 通过 Registry 解析

PX-9 Governance ────────────→ 约束 Registry / Decision / Orchestration
```

---

## 四、已完成（2026-01-31）

| Phase | 交付物 |
|-------|--------|
| PX-2.5 | lib/platform/decision/* |
| PX-6 | lib/platform/registry/*, bootstrap |
| PX-7 | lib/platform/orchestration/*, POST /api/platform/orchestration/dispatch |
| PX-8 | lib/platform/models/decision-sample.ts, learning-record 扩展 |
| PX-9 | docs/platform-engineering/GOVERNANCE.md |
| PX-10 | TaskCapability 扩展, task-capability-impl.ts |
