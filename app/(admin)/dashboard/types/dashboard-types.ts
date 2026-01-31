// Dashboard 类型定义
// 从 page.tsx 提取，用于模块化重构

export interface Restaurant {
  id: string
  name: string
  contact_name: string | null
  contact_phone: string | null
  total_refilled: number
  status: string
  created_at: string
  latitude: number | null
  longitude: number | null
  address: string | null
  qr_token: string | null
}

export interface Order {
  id: string
  restaurant_id: string
  restaurant_name?: string
  service_type: string
  status: string
  amount: number
  created_at: string
  updated_at: string
  worker_id?: string | null
}

export interface Worker {
  id: string
  name: string
  phone: string | null
  worker_type?: "delivery" | "repair" | "install" | string[] | null // 工人类型：配送员、维修工、安装工（支持多选）
  product_types?: string[] | null // 产品类型（仅配送员）：lpg, clean, alcohol, outdoor
  status?: "active" | "inactive" | null // 状态：在职、离职
  created_at?: string
  updated_at?: string
}

export interface Device {
  device_id: string
  restaurant_id: string | null
  model: string | null
  address: string | null
  installer: string | null
  install_date: string | null
  status: string
}

export interface ApiConfig {
  id?: string
  name: string
  endpoint: string
  method: string
  description: string
  is_active: boolean
}

export interface ServicePoint {
  id: string
  name: string
  township: string
  latitude: number
  longitude: number
  service_radius: number // 服务半径（公里）
  legal_entity: string // 法人主体
  status: string
  created_at: string
  workers?: string[] // 绑定的工人ID列表
}

export interface Repair {
  id: string
  restaurant_id: string
  service_type?: string
  status: string
  amount?: number
  created_at: string
  updated_at: string
  description?: string | null
  audio_url?: string | null
  urgency?: string
  assigned_to?: string | null
  worker_id?: string | null
  device_id?: string | null
}

export interface FuelPrice {
  id: string
  name: string
  unit: string
  unitLabel: string
  basePrice: number
  marketPrice?: number
  lastUpdated?: string
  autoSync: boolean
}

// Dashboard 组件 Props 接口
export interface DashboardComponentProps {
  // 用户和权限信息
  userRole: string | null
  userCompanyId: string | null
  companyPermissions: string[]
  companyFuelTypes: string[]
  
  // 数据状态
  restaurants: Restaurant[]
  orders: Order[]
  workers: Worker[]
  devices: Device[]
  apiConfigs: ApiConfig[]
  servicePoints: ServicePoint[]
  
  // 加载状态
  isLoading?: boolean
  
  // 回调函数（根据具体模块需要）
  onRefresh?: () => void
  onUpdate?: () => void
}
