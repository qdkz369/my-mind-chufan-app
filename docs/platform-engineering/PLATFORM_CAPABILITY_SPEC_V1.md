# Platform Capability API 规范 v1

**版本**: v1.0  
**原则**: 不暴露表、不暴露业务逻辑、不暴露策略细节，只暴露能力接口

---

## Dispatch Capability

### POST /api/platform/dispatch/match

**请求体**:
```json
{
  "task_id": "uuid",
  "strategy_id": "optional",
  "constraints": {},
  "context": {}
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "candidates": [
      { "worker_id": "uuid", "score": 0.9, "reason": "optional" }
    ]
  }
}
```

---

### POST /api/platform/dispatch/allocate

**请求体**:
```json
{
  "task_id": "uuid",
  "worker_id": "uuid",
  "decision_trace": {}
}
```

**响应**:
```json
{
  "success": true,
  "data": { "allocated": true }
}
```

---

### POST /api/platform/dispatch/rebalance

**请求体**:
```json
{
  "region_id": "string",
  "trigger": "string",
  "strategy_id": "optional"
}
```

**响应**:
```json
{
  "success": true,
  "data": { "rebalanced_count": 0 }
}
```

---

## Strategy Capability

### POST /api/platform/strategy/evaluate

**请求体**:
```json
{
  "task_context": {},
  "workers_context": [],
  "model_version": "optional"
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "scores": [
      { "worker_id": "uuid", "score": 0.8, "factors": {} }
    ]
  }
}
```

---

### POST /api/platform/strategy/select

**请求体**:
```json
{
  "scores": [{ "worker_id": "uuid", "score": 0.8 }],
  "policy": "optional"
}
```

**响应**:
```json
{
  "success": true,
  "data": { "worker_id": "uuid" }
}
```

---

## Learning Capability

### POST /api/platform/learning/record

**请求体**:
```json
{
  "task_id": "uuid",
  "worker_id": "uuid",
  "outcome": "success|failure|exception",
  "metrics": {}
}
```

**响应**:
```json
{
  "success": true
}
```

---

### POST /api/platform/learning/train

**请求体**:
```json
{
  "dataset_range": { "start": "ISO8601", "end": "ISO8601" },
  "model_type": "optional"
}
```

**响应**:
```json
{
  "success": true,
  "data": { "model_version": "v1" }
}
```

---

## Feedback Capability

### POST /api/platform/feedback/collect

**请求体**:
```json
{
  "trigger": "optional",
  "time_range": { "start": "ISO8601", "end": "ISO8601" }
}
```

**响应**:
```json
{
  "success": true,
  "data": { "events": [] }
}
```

---

### POST /api/platform/feedback/aggregate

**请求体**:
```json
{
  "events": [],
  "aggregation_type": "optional"
}
```

**响应**:
```json
{
  "success": true,
  "data": { "metrics": {} }
}
```

---

### POST /api/platform/feedback/loop

**请求体**:
```json
{
  "metrics": {},
  "target": "strategy|learning"
}
```

**响应**:
```json
{
  "success": true
}
```
