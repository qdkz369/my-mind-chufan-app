/**
 * Orchestration Engine - 能力编排引擎
 * 平台中枢：统一编排能力调用，管理状态、重试、超时
 */

export interface OrchestrationEvent {
  type: string
  payload: Record<string, unknown>
  timestamp?: string
}

export interface OrchestrationState {
  event_id: string
  step: string
  data?: Record<string, unknown>
  error?: string
}

export interface OrchestrationConfig {
  timeout_ms?: number
  max_retries?: number
  onStateChange?: (state: OrchestrationState) => void
}

type CapabilityInvoker = (
  event: OrchestrationEvent,
  state: OrchestrationState
) => Promise<OrchestrationState>

/**
 * Orchestration Engine
 */
export class OrchestrationEngine {
  private config: OrchestrationConfig
  private flows: Map<string, CapabilityInvoker[]> = new Map()

  constructor(config: OrchestrationConfig = {}) {
    this.config = {
      timeout_ms: 30000,
      max_retries: 1,
      ...config,
    }
  }

  /** 注册流程 */
  registerFlow(flowId: string, steps: CapabilityInvoker[]): void {
    this.flows.set(flowId, steps)
  }

  /** 触发事件 */
  async onEvent(flowId: string, event: OrchestrationEvent): Promise<OrchestrationState> {
    const steps = this.flows.get(flowId)
    if (!steps || steps.length === 0) {
      throw new Error(`Flow ${flowId} not registered`)
    }

    const eventId = `evt-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    let state: OrchestrationState = {
      event_id: eventId,
      step: "start",
      data: event.payload as Record<string, unknown>,
    }

    this.config.onStateChange?.(state)

    const timeout = this.config.timeout_ms
    const maxRetries = this.config.max_retries ?? 1

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i]
      let lastError: Error | null = null

      for (let retry = 0; retry <= maxRetries; retry++) {
        try {
          state = await Promise.race([
            step(event, state),
            new Promise<never>((_, rej) =>
              setTimeout(() => rej(new Error("Orchestration timeout")), timeout)
            ),
          ])
          state.step = `step_${i}`
          this.config.onStateChange?.(state)
          break
        } catch (err) {
          lastError = err as Error
          if (retry === maxRetries) {
            state.error = lastError.message
            state.step = `step_${i}_failed`
            this.config.onStateChange?.(state)
            return state
          }
        }
      }
    }

    state.step = "completed"
    this.config.onStateChange?.(state)
    return state
  }

  /** 便捷：invokeCapabilities（同步执行步骤链） */
  async invokeCapabilities(
    flowId: string,
    event: OrchestrationEvent
  ): Promise<OrchestrationState> {
    return this.onEvent(flowId, event)
  }
}
