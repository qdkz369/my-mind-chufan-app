/**
 * Facts Adapter 统一导出
 * 
 * 所有 Facts API 响应都必须先通过 Adapter 处理
 * ViewModel 不允许再直接读取 API response
 */

export {
  adaptRestaurantOverview,
  type AdaptedRestaurantOverview,
  type RestaurantOverviewApiResponse,
} from './restaurant-overview.adapter'

export {
  adaptAssets,
  type AdaptedAssetFact,
  type AssetsApiResponse,
} from './assets.adapter'

export {
  adaptOrderDetails,
  type AdaptedOrderDetails,
  type OrderDetailsApiResponse,
} from './order-details.adapter'
