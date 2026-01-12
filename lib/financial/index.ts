/**
 * 金融参与方接口模型（可插拔设计）
 * 
 * ⚠️ 重要：此层允许被替换或移除
 * - 如果不需要金融功能，可以完全移除此层
 * - 如果更换金融机构，只需替换 FinancialProvider 实现
 * - 不影响任何事实 API 或事实表结构
 * 
 * 核心原则：
 * - FinancialView 严禁写入 facts 表或结构
 * - FinancialView 不参与事实计算
 * - FinancialView 不影响事实 API 返回
 * - 换金融机构不影响任何事实
 * - UI 只是"换一个卡片"
 */

export * from './types'
