/**
 * 金融视图组件统一导出
 * 
 * ⚠️ 重要：这些组件只能在 FinanceUIProvider 内使用
 */

export {
  ContractBlock,
  type ContractBlockProps,
} from './contract-block'

export {
  ResponsibilityLabel,
  type ResponsibilityLabelProps,
  type ResponsibilityType,
} from './responsibility-label'

export {
  FinanceTable,
  type FinanceTableProps,
  type FinanceTableColumn,
} from './finance-table'

export {
  AmountDisplay,
  type AmountDisplayProps,
  type AmountUnit,
} from './amount-display'
