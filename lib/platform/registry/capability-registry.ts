/**
 * Capability Registry - 能力注册表
 * 能力可注册、可替换、可组合
 * 支持多版本、多租户策略
 */

import type { CapabilityMeta, CapabilityHandler } from "./types"


const store = new Map<string, Map<string, { meta: CapabilityMeta; handler: CapabilityHandler }>>()
let bootstrapped = false

function ensureBootstrap(): void {
  if (bootstrapped) return
  try {
    require("./bootstrap").bootstrapCapabilities()
    bootstrapped = true
  } catch {
    bootstrapped = true
  }
}

/**
 * Capability Registry
 */
export class CapabilityRegistry {
  /**
   * 注册能力
   */
  register(
    capabilityType: string,
    meta: CapabilityMeta,
    handler: CapabilityHandler
  ): void {
    const key = `${meta.id}@${meta.version}`
    if (!store.has(capabilityType)) {
      store.set(capabilityType, new Map())
    }
    store.get(capabilityType)!.set(key, { meta, handler })
  }

  /**
   * 解析能力：按 type、version、tenant 返回实现
   */
  resolve(
    capabilityType: string,
    options: { version?: string; tenant?: string; prefer?: string } = {}
  ): { meta: CapabilityMeta; handler: CapabilityHandler } | null {
    ensureBootstrap()
    const { version, tenant, prefer } = options
    const byType = store.get(capabilityType)
    if (!byType || byType.size === 0) return null

    const entries = Array.from(byType.entries())

    if (prefer) {
      const preferred = entries.find(([k]) => k.startsWith(`${prefer}@`))
      if (preferred) return preferred[1]
    }

    if (version) {
      const byVersion = entries.find(([k]) => k.endsWith(`@${version}`))
      if (byVersion) return byVersion[1]
    }

    if (tenant && tenant !== "global") {
      const byTenant = entries.find(
        ([, v]) => v.meta.tenantScope === tenant || v.meta.tenantScope === "global"
      )
      if (byTenant) return byTenant[1]
    }

    return entries[0]?.[1] ?? null
  }

  /**
   * 列出某类型下所有已注册能力
   */
  list(capabilityType: string): CapabilityMeta[] {
    const byType = store.get(capabilityType)
    if (!byType) return []
    return Array.from(byType.values()).map((v) => v.meta)
  }

  /**
   * 取消注册
   */
  unregister(capabilityType: string, id: string, version: string): boolean {
    const byType = store.get(capabilityType)
    if (!byType) return false
    return byType.delete(`${id}@${version}`)
  }
}

export const defaultRegistry = new CapabilityRegistry()
