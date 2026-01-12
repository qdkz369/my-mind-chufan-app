/**
 * 租赁领域类型定义
 * 
 * 说明：
 * - 仅包含 interface/type 定义，不包含业务逻辑
 * - 不引用 orders、facts、payment 等其他领域
 * - 对应数据库表结构，用于类型安全
 */

/**
 * 设备所有权/出资结构
 * 对应表：device_ownerships
 */
export interface DeviceOwnership {
  id: string
  device_id: string
  owner_type: 'platform' | 'manufacturer' | 'leasing_company' | 'finance_partner'
  owner_id: string
  start_at: string // ISO 8601 timestamp
  end_at: string | null // ISO 8601 timestamp, nullable
  created_at: string // ISO 8601 timestamp
  updated_at: string // ISO 8601 timestamp
}

/**
 * 租赁合同主表
 * 对应表：rental_contracts
 */
export interface RentalContract {
  id: string
  contract_no: string
  lessee_restaurant_id: string
  lessor_type: 'platform' | 'manufacturer' | 'leasing_company' | 'finance_partner'
  lessor_id: string
  start_at: string // ISO 8601 date (YYYY-MM-DD)
  end_at: string // ISO 8601 date (YYYY-MM-DD)
  billing_model: 'fixed' | 'usage_based' | 'hybrid'
  status: 'draft' | 'active' | 'ended' | 'breached'
  remark: string | null
  created_at: string // ISO 8601 timestamp
  updated_at: string // ISO 8601 timestamp
}

/**
 * 合同-设备关系表
 * 对应表：rental_contract_devices
 */
export interface RentalContractDevice {
  id: string
  rental_contract_id: string
  device_id: string
  agreed_daily_fee: number | null // DECIMAL(10, 2)
  agreed_monthly_fee: number | null // DECIMAL(10, 2)
  agreed_usage_metric: 'hours' | 'orders' | 'energy' | null
  created_at: string // ISO 8601 timestamp
  updated_at: string // ISO 8601 timestamp
}
