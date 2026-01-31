# 平台治理（Platform Governance）

**版本**: v1.0  
**原则**: 能力版本化、策略可控、决策可回滚

---

## 一、Capability Versioning 规则

| 规则 | 说明 |
|------|------|
| 语义化版本 | 能力版本采用 `major.minor.patch` |
| 兼容性 | 同 major 内 minor/patch 变更需向后兼容 |
| 弃用周期 | 旧版本弃用前至少保留 2 个 minor 周期 |
| 注册格式 | `{id}@{version}`，如 `simple-rule-v1@1.0.0` |

---

## 二、Strategy 生效范围

| 维度 | 说明 |
|------|------|
| **tenant** | `global` 全租户；指定 `company_id` 仅该租户 |
| **region** | 可选，未来支持按区域切换策略 |
| **time** | 可选，支持按时段生效（如 A/B 实验窗口） |

---

## 三、决策失败兜底策略

| 场景 | 兜底行为 |
|------|----------|
| match 无候选 | 返回空列表，不抛错 |
| allocate 验证失败 | 返回 400，保留 audit_logs |
| Registry 解析失败 | 回退到默认实现（如有） |
| Orchestration 超时 | 中止流程，记录 state.error |

---

## 四、强制回退机制

| 触发条件 | 回退动作 |
|----------|----------|
| 策略错误率 > 阈值 | 自动切换至 `fallback` 版本 |
| 人工熔断 | 通过配置标记，Registry 解析时跳过故障版本 |
| 降级开关 | 环境变量 `PLATFORM_DEGRADE=true` 时跳过平台层，走业务直连 |

---

## 五、平台 SLA（建议）

| 指标 | 目标 |
|------|------|
| 决策延迟 | P99 < 500ms |
| 编排超时 | 单步 30s，总流程 60s |
| 审计写入 | 同步，失败仅日志不阻断 |

---

## 六、变更流程

1. 新能力实现 → 注册到 Registry（新 version）
2. 灰度：指定 tenant 先行
3. 全量：调整 tenantScope 为 global
4. 旧版本：标记 deprecated，保留至弃用周期结束
