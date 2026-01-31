# 平台能力域与现有系统映射

**版本**: v1.0  
**目的**: 明确五大能力域与现有表、API、字段的对应关系，支撑平台抽象。

---

## 1. Task Domain（任务域）

### 现有表

| 表名 | 平台映射 | 关键字段 |
|------|----------|----------|
| `delivery_orders` | TaskModel（type=delivery） | id, restaurant_id, status, worker_id, assigned_to, created_at |
| `repair_orders` | TaskModel（type=repair） | id, restaurant_id, status, assigned_to, created_at |
| `rental_orders` | TaskModel（type=rental） | id, restaurant_id, status, provider_id, created_at |

### 状态流转（平台 task_status）

| 表 | 状态枚举 | 平台映射 |
|----|----------|----------|
| delivery_orders | pending, accepted, delivering, completed, exception, rejected, cancelled | task_status |
| repair_orders | pending, assigned, in_progress, completed, cancelled | task_status |
| rental_orders | active, completed, overdue, ... | task_status |

### 现有 API（业务层，非平台层）

| API | 功能 | 平台能力映射 |
|-----|------|--------------|
| POST /api/orders/create | 创建配送订单 | TaskCapability.createTask |
| POST /api/repair/create | 创建报修工单 | TaskCapability.createTask |
| POST /api/orders/accept | 接单 | DispatchCapability.allocateTask |
| POST /api/orders/dispatch | 开始配送 | 状态流转 + 指派 |
| PATCH /api/repair/update | 更新报修（含指派） | DispatchCapability.allocateTask |

### 平台抽象

- `createTask()`: 入参 task_context，出参 task_id
- `updateTaskStatus()`: 入参 task_id, from_status, to_status
- `getTaskContext()`: 入参 task_id，出参 TaskModel

---

## 2. Dispatch Domain（调度域）

### 现有逻辑（分散在业务 API 中）

| 位置 | 逻辑 | 平台能力映射 |
|------|------|--------------|
| /api/orders/accept | 工人主动接单（pending→accepted） | allocateTask |
| /api/orders/dispatch | 工人开始配送（accepted→delivering） | 状态更新 |
| PATCH /api/repair/update | 管理员指派工人 | allocateTask |
| 无 | 工人匹配（当前为工人抢单，无系统派单） | matchWorker |
| 无 | 区域再平衡 | rebalance |

### 现有数据支持匹配

| 表/字段 | 用途 |
|---------|------|
| workers.company_id | 公司维度隔离 |
| workers.product_types | 技能（delivery/repair/install） |
| workers.status | 可用性 |
| delivery_orders.restaurant_id | 餐厅位置（可推导 region） |
| restaurants.latitude, longitude | 地理位置 |

### 平台抽象

- `matchWorker()`: 入参 task_id, strategy_id, constraints, context → 出参 候选工人列表
- `allocateTask()`: 入参 task_id, worker_id, decision_trace
- `rebalance()`: 入参 region_id, trigger, strategy_id

---

## 3. Strategy Domain（策略域）

### 现状

- 无显式策略层，决策逻辑散落在 if-else 和业务 API 中
- 无权重、规则、条件、实验策略的抽象

### 平台抽象

- `evaluate()`: 入参 task_context, workers_context, model_version → 出参 scores
- `score()`: 对单个 worker 打分
- `select()`: 入参 scores, policy → 出参 选定 worker_id

### 预留扩展

- 权重策略、规则策略、条件策略、实验策略（A/B）作为插件接入

---

## 4. Learning Domain（学习域）

### 现有数据源

| 表 | 用途 |
|----|------|
| audit_logs | 操作记录（ORDER_ACCEPTED, ORDER_COMPLETED 等） |
| trace_logs | 资产操作轨迹 |
| delivery_orders, repair_orders | 订单结果（完成/异常/拒绝） |

### 平台抽象

- `record()`: 入参 task_id, worker_id, outcome, metrics → 写入行为记录
- `train()`: 入参 dataset_range, model_type → 产出/更新模型
- `updateWeights()`: 根据反馈修正策略权重

### 现状

- 无显式学习流水线，audit_logs 可作训练数据来源

---

## 5. Feedback Domain（反馈域）

### 现有接口

| API | 用途 | 平台映射 |
|-----|------|----------|
| GET /api/ops/overview | 运营总览 | collect + aggregate |
| GET /api/ops/exceptions | 异常订单 | collect |
| audit_logs | 审计事实 | 触发器采集 |

### 平台抽象

- `collect()`: 从触发器采集原始事件
- `aggregate()`: 聚合为指标
- `feedbackLoop()`: 将指标反馈给 Strategy / Learning

---

## 6. 交叉引用速查

| 平台能力 | 首要数据来源 | 次要来源 |
|----------|--------------|----------|
| Task | delivery_orders, repair_orders | rental_orders |
| Dispatch | workers, restaurants | audit_logs |
| Strategy | 无（新建） | - |
| Learning | audit_logs | delivery_orders 结果 |
| Feedback | audit_logs | ops APIs |
