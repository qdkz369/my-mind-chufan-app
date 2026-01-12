/**
 * 资产溯源配置模块
 * 阶段 2B-3.5：资产溯源地基扩展
 * 
 * 设计策略：地基刚性、规则弹性
 * - 默认 CONFIG_REQUIRE_ASSET_TRACE = false，确保现有 2B-3 测试脚本无需修改即可通过
 * - 当需要启用严格校验时，设置为 true
 */

/**
 * 是否要求资产溯源
 * 
 * - false: 即使没有 asset_ids，也允许完成订单（默认，保持向后兼容）
 * - true: 必须校验 asset_ids 存在，并验证对应 gas_cylinders 状态合法
 */
export const CONFIG_REQUIRE_ASSET_TRACE = false
