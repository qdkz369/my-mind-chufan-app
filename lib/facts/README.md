# Fact Path MVP – Completion Record

## Scope

This module implements the minimal viable Fact Governance Path.

It guarantees:

- Facts are validated against raw audit_logs, not derived order fields
- Time anomalies are detected even if later normal events exist
- No anomaly can be overridden by state aggregation
- Fact warnings are returned in structured, machine-readable form
- Fact health score is a pure read-only aggregation
- No database writes, no UI, no side effects

## Verified By

- Read-only verification script
- Controlled audit_logs time inversion tests
- Deterministic health score calculation

## Status

✅ Fact Path MVP COMPLETE  
⛔ Do not extend rules or introduce auto-fix here without a new design phase

## Directory Structure

```
lib/facts/
├── contracts/          # 事实契约定义
│   └── order.fact.ts   # 订单事实契约
├── governance/         # 事实治理层
│   └── order.fact.guard.ts  # 订单事实治理器（包含健康度计算）
├── health/             # 事实健康度计算（预留目录）
│   └── (待重构)
└── types.ts            # 事实对象类型定义
```

## Core Concepts

### Fact (事实)

Facts are "what actually happened" in the system, without business interpretation.

- **OrderFact**: Order facts (from delivery_orders table)
- **AssetFact**: Asset facts (from gas_cylinders / devices table)
- **TraceFact**: Trace facts (from trace_logs table)

### Fact Contract (事实契约)

Defines the structure and constraints that fact objects must satisfy.

- Ensures fact objects conform to expected format
- Validates before API returns

### Fact Governance (事实治理)

Checks fact consistency before data is returned, exposing data quality issues.

- **Does not fix data**: Only exposes problems, does not modify
- **Does not block responses**: Returns data even if problems exist
- **Explicit warnings**: Exposes all problems via `fact_warnings_structured`

### Fact Health (事实健康度)

Calculates health score based on fact warnings, used for:

- Admin governance lists
- Auto-fix task prioritization
- Fact health visualization

## Key Principles

### 1. Read-Only Principle
- Fact APIs only SELECT, no writes
- Do not modify database
- Do not infer missing data

### 2. Non-Blocking Principle
- Even if data problems are found, return data
- Expose problems through warnings, but do not block access

### 3. Explicit Principle
- All data quality issues must be explicitly exposed via `fact_warnings_structured`
- No silent ignoring of problems

### 4. No-Fix Principle
- Governance layer only exposes problems, does not fix
- UI layer can only display facts, cannot fix or infer

## Related Documentation

- [事实契约系统说明](./事实契约系统说明.md)
- [事实治理层可用性验证报告](./事实治理层可用性验证报告.md)
- [事实健康度汇总示例](./事实健康度汇总示例.md)
- [事实治理输出标准化示例](./事实治理输出标准化示例.md)
- [事实校验逻辑检查报告](./事实校验逻辑检查报告.md)
- [事实路径最小可用性验证说明](./事实路径最小可用性验证说明.md)
