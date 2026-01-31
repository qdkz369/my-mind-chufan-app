/**
 * Capability Registry 类型定义
 */

export interface CapabilityMeta {
  id: string
  version: string
  tenantScope?: "global" | string
  description?: string
  [key: string]: unknown
}

export type CapabilityHandler = (...args: unknown[]) => Promise<unknown> | unknown

export interface CapabilityRegistration {
  capabilityType: string
  meta: CapabilityMeta
  handler: CapabilityHandler
}
