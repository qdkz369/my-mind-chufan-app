/**
 * 供应商管理相关类型定义
 */

export interface Company {
  id: string
  name: string
  contact_name?: string
  contact_phone?: string
  contact_email?: string
  address?: string
  business_license?: string
  status: string
  created_at: string
  user_count?: number
  permissions_count?: number
  fuel_types_count?: number
}

export interface UserCompany {
  id: string
  user_id: string
  company_id: string
  role: string
  is_primary: boolean
  users?: {
    id: string
    email?: string
    phone?: string
  }
}

export const AVAILABLE_PERMISSIONS = [
  { key: "dashboard", label: "工作台" },
  { key: "restaurants", label: "餐厅管理" },
  { key: "orders", label: "订单管理" },
  { key: "repairs", label: "报修管理" },
  { key: "equipmentRental", label: "设备租赁管理" },
  { key: "rentals", label: "租赁工作台" },
  { key: "productApproval", label: "产品审核" },
  { key: "devices", label: "设备监控" },
  { key: "workers", label: "工人管理" },
  { key: "fuelPricing", label: "燃料实时价格监控" },
  { key: "agreements", label: "协议管理" },
  { key: "api", label: "API配置" },
  { key: "analytics", label: "数据统计" },
  { key: "settings", label: "系统设置" },
] as const

export const AVAILABLE_FUEL_TYPES = [
  { key: "lpg", label: "液化气" },
  { key: "clean", label: "热能清洁燃料" },
  { key: "alcohol", label: "醇基燃料" },
  { key: "outdoor", label: "户外环保燃料" },
] as const
