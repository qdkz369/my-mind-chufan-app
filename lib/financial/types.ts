/**
 * 金融参与方接口模型（可插拔设计）
 * 
 * ========================================
 * 核心原则
 * ========================================
 * 
 * 1. 可插拔性
 *    - 此层允许被替换或移除
 *    - 换金融机构不影响任何事实
 *    - UI 只是"换一个卡片"
 * 
 * 2. 禁止写入事实层
 *    - FinancialView 严禁写入 facts 表或结构
 *    - FinancialView 不参与事实计算
 *    - FinancialView 不影响事实 API 返回
 * 
 * 3. 独立设计
 *    - FinancialProvider 和 FinancialView 是独立的接口模型
 *    - 不绑定到任何事实表结构
 *    - 不依赖 facts API
 * 
 * ========================================
 * 使用场景
 * ========================================
 * 
 * - 展示金融信息（金额、费率、还款计划等）
 * - 支持多个金融机构（manufacturer / leasing_company / bank）
 * - 允许动态切换金融机构
 * - 不影响事实层的数据完整性
 * 
 * ========================================
 * 设计约束
 * ========================================
 * 
 * ⚠️ 重要：此层允许被替换或移除
 * - 如果不需要金融功能，可以完全移除此层
 * - 如果更换金融机构，只需替换 FinancialProvider 实现
 * - 不影响任何事实 API 或事实表结构
 */

/**
 * 金融参与方类型
 */
export type FinancialProviderType = 'manufacturer' | 'leasing_company' | 'bank'

/**
 * 金融参与方接口
 * 
 * 说明：
 * - 定义金融参与方的基本信息
 * - 不包含任何业务逻辑或计算
 * - 仅用于标识和展示
 * 
 * 使用场景：
 * - UI 展示金融机构名称
 * - 区分不同的金融参与方
 * - 支持多金融机构切换
 */
export interface FinancialProvider {
  /**
   * 金融参与方唯一标识
   */
  provider_id: string

  /**
   * 金融参与方类型
   * - manufacturer: 厂家
   * - leasing_company: 租赁公司
   * - bank: 银行
   */
  provider_type: FinancialProviderType

  /**
   * 显示名称（人类可读）
   * 例如："XX 银行"、"XX 租赁公司"、"XX 厂家"
   */
  display_name: string
}

/**
 * 金融视图数据结构
 * 
 * 说明：
 * - 用于展示金融信息（金额、费率、还款计划等）
 * - 不写入事实层
 * - 不参与事实计算
 * - 允许被替换或移除
 * 
 * ⚠️ 禁止事项：
 * - 禁止写入 facts 表或结构
 * - 禁止影响事实 API 返回
 * - 禁止参与事实计算
 * 
 * 使用场景：
 * - UI 展示金融信息卡片
 * - 支持多个金融机构的金融视图
 * - 允许动态切换金融机构
 */
export interface FinancialView {
  /**
   * 金融参与方 ID
   * 关联到 FinancialProvider.provider_id
   */
  provider_id: string

  /**
   * 租赁 ID（关联到租赁合同或租赁记录）
   * 注意：这是业务关联，不是事实关联
   */
  lease_id: string

  /**
   * 人类可读的金融信息摘要
   * 例如："月租金 ¥1000，租期 12 个月，总金额 ¥12000"
   * 注意：这只是展示文本，不参与任何计算或业务逻辑
   */
  summary_text: string

  /**
   * 金融视图计算时间（ISO 8601 格式）
   * 用于标识金融视图的生成时间
   * 注意：这是视图生成时间，不是事实时间
   */
  calculated_at: string
}

/**
 * 金融视图查询参数
 * 
 * 用于查询金融视图的输入参数
 */
export interface FinancialViewQuery {
  /**
   * 租赁 ID（关联到租赁合同或租赁记录）
   */
  lease_id: string

  /**
   * 金融参与方 ID（可选）
   * 如果不提供，则使用默认的金融参与方
   */
  provider_id?: string
}
