/**
 * 默认能力注册
 * 将现有 impl 注册到 Registry
 */

import { defaultRegistry } from "./capability-registry"
import { dispatchMatch } from "../impl/dispatch-match"
import { dispatchAllocate } from "../impl/dispatch-allocate"
import { strategyEvaluate } from "../impl/strategy-evaluate"

export function bootstrapCapabilities(): void {
  defaultRegistry.register(
    "dispatch.match",
    {
      id: "simple-rule-v1",
      version: "1.0.0",
      tenantScope: "global",
      description: "按任务类型+公司+技能匹配工人",
    },
    (params: unknown) => dispatchMatch(params as any)
  )

  defaultRegistry.register(
    "dispatch.allocate",
    {
      id: "default-v1",
      version: "1.0.0",
      tenantScope: "global",
      description: "分配任务到工人，更新订单表",
    },
    (params: unknown) => dispatchAllocate(params as any)
  )

  defaultRegistry.register(
    "strategy.evaluate",
    {
      id: "placeholder-equal-v1",
      version: "1.0.0",
      tenantScope: "global",
      description: "占位：均分规则",
    },
    (params: unknown) => strategyEvaluate(params as any)
  )
}
