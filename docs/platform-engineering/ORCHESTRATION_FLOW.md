# 平台编排流程

**版本**: v1.0  
**说明**: 事件 → 能力编排 → 决策 → 执行 → 反馈 的调用顺序

---

## 一、完整调用链

```
业务事件（如：新订单待分配）
        │
        ▼
┌───────────────────────────────────────┐
│ 1. Dispatch Match                     │
│    POST /api/platform/dispatch/match  │
│    输入: task_id                       │
│    输出: candidates[]                  │
└───────────────────────┬───────────────┘
                        │
        ┌───────────────┴───────────────┐
        │ 可选：Strategy Evaluate       │
        │ POST /api/platform/strategy/  │
        │       evaluate                │
        │ 输入: task_context, workers   │
        │ 输出: scores[]                │
        └───────────────┬───────────────┘
                        │
        ┌───────────────┴───────────────┐
        │ 可选：Strategy Select         │
        │ POST /api/platform/strategy/  │
        │       select                  │
        │ 输入: scores, policy          │
        │ 输出: worker_id               │
        └───────────────┬───────────────┘
                        │
        ▼
┌───────────────────────────────────────┐
│ 2. Dispatch Allocate                  │
│    POST /api/platform/dispatch/       │
│         allocate                      │
│    输入: task_id, worker_id           │
│    输出: allocated                    │
│    副作用: 更新 delivery_orders /     │
│            repair_orders              │
│            写入 audit_logs            │
└───────────────────────┬───────────────┘
                        │
        ▼
┌───────────────────────────────────────┐
│ 3. Learning Record（结果反馈）        │
│    POST /api/platform/learning/record │
│    输入: task_id, worker_id, outcome  │
│    副作用: 写入 audit_logs            │
└───────────────────────┬───────────────┘
                        │
        ▼
┌───────────────────────────────────────┐
│ 4. Feedback Collect                   │
│    POST /api/platform/feedback/collect│
│    输入: time_range                   │
│    输出: events[]                     │
│    数据源: audit_logs                 │
└───────────────────────┬───────────────┘
                        │
        ▼
┌───────────────────────────────────────┐
│ 5. Feedback Aggregate / Loop          │
│    聚合成指标，反馈给 Strategy         │
└───────────────────────────────────────┘
```

---

## 二、当前实现状态

| 能力 | 实现状态 | 说明 |
|------|----------|------|
| dispatch/match | ✅ 已实现 | 按任务类型+公司+技能匹配工人 |
| dispatch/allocate | ✅ 已实现 | 更新订单表，写入审计 |
| strategy/evaluate | ✅ 占位 | 固定规则，均分 1 |
| strategy/select | ✅ 占位 | 取最高分 |
| learning/record | ✅ 已实现 | 写入 audit_logs |
| feedback/collect | ✅ 已实现 | 从 audit_logs 查询 |
| feedback/aggregate | ⏳ 占位 | 返回空 metrics |
| feedback/loop | ⏳ 占位 | 无副作用 |

---

## 三、业务桥接（可选）

现有业务 API 可调用平台层：

| 业务 API | 可桥接平台能力 |
|----------|----------------|
| POST /api/orders/accept | platform dispatch/allocate |
| PATCH /api/repair/update（指派） | platform dispatch/allocate |

桥接方式：在业务 API 内判断环境变量或配置，若启用则转发到平台 API。
