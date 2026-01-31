/**
 * 平台能力实现
 */

export { dispatchMatch } from "./dispatch-match"
export type { DispatchMatchInput } from "./dispatch-match"

export { dispatchAllocate } from "./dispatch-allocate"
export type { DispatchAllocateInput, DispatchAllocateResult } from "./dispatch-allocate"

export { strategyEvaluate } from "./strategy-evaluate"
export type { StrategyEvaluateInput } from "./strategy-evaluate"

export { learningRecord } from "./learning-record"
export type { LearningRecordInput } from "./learning-record"

export { feedbackCollect } from "./feedback-collect"
export type { FeedbackCollectInput } from "./feedback-collect"

export {
  taskFreezeContext,
  taskSnapshot,
  taskMutateWithDecision,
} from "./task-capability-impl"
