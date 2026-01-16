/**
 * Behavior Timeline（行为时间线）系统
 * 
 * 核心原则：
 * 1. 每个 Fact 包含三个状态字段：
 *    - previous_state（前一个状态）
 *    - current_state（当前状态）
 *    - next_expected_state（下一个预期状态）
 * 2. ViewModel 不再判断"是否异常"
 * 3. 只判断：是否偏离预期轨迹
 * 
 * ⚠️ 重要：
 * - 不判断"异常"，只判断"偏离预期"
 * - 预期轨迹由业务规则定义
 * - 偏离预期 ≠ 异常，可能是正常的业务变体
 */

/**
 * 行为时间线状态
 */
export type BehaviorTimelineState = {
  /**
   * 前一个状态（可选）
   * 空值含义：初始状态（无前一个状态）
   */
  previous_state: string | null

  /**
   * 当前状态（必填）
   */
  current_state: string

  /**
   * 下一个预期状态（可选）
   * 空值含义：无预期状态（可能是终态，或尚未定义预期）
   */
  next_expected_state: string | null
}

/**
 * 判断是否偏离预期轨迹
 * 
 * @param timeline - 行为时间线状态
 * @param actual_next_state - 实际的下一个状态（如果存在）
 * @returns 是否偏离预期轨迹
 */
export function isDeviatedFromExpected(
  timeline: BehaviorTimelineState,
  actual_next_state: string | null
): boolean {
  // 如果无预期状态，无法判断偏离（返回 false）
  if (!timeline.next_expected_state) {
    return false
  }

  // 如果实际下一个状态不存在，无法判断偏离（返回 false）
  if (!actual_next_state) {
    return false
  }

  // 判断实际状态是否与预期状态不同
  return actual_next_state !== timeline.next_expected_state
}

/**
 * 获取轨迹偏离信息
 * 
 * @param timeline - 行为时间线状态
 * @param actual_next_state - 实际的下一个状态（如果存在）
 * @returns 轨迹偏离信息（如果偏离）或 null（如果未偏离或无法判断）
 */
export function getTrajectoryDeviation(
  timeline: BehaviorTimelineState,
  actual_next_state: string | null
): {
  expected: string
  actual: string
  previous: string | null
  current: string
} | null {
  if (!isDeviatedFromExpected(timeline, actual_next_state)) {
    return null
  }

  return {
    expected: timeline.next_expected_state!,
    actual: actual_next_state!,
    previous: timeline.previous_state,
    current: timeline.current_state,
  }
}
