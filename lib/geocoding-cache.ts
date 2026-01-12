/**
 * 地理编码缓存管理器
 * 避免重复调用高德地图 API
 */

interface GeocodeCacheItem {
  address: string
  timestamp: number
}

// 内存缓存（坐标 -> 地址）
const geocodeCache = new Map<string, GeocodeCacheItem>()

// 缓存有效期（毫秒）：24小时
const CACHE_EXPIRY = 24 * 60 * 60 * 1000

/**
 * 生成缓存键（基于坐标，精度到小数点后4位）
 */
function getCacheKey(latitude: number, longitude: number): string {
  // 精度到小数点后4位（约11米精度），减少缓存键数量
  const lat = latitude.toFixed(4)
  const lng = longitude.toFixed(4)
  return `${lat},${lng}`
}

/**
 * 从缓存获取地址
 */
export function getCachedAddress(latitude: number, longitude: number): string | null {
  const key = getCacheKey(latitude, longitude)
  const cached = geocodeCache.get(key)

  if (!cached) {
    return null
  }

  // 检查缓存是否过期
  const now = Date.now()
  if (now - cached.timestamp > CACHE_EXPIRY) {
    geocodeCache.delete(key)
    return null
  }

  return cached.address
}

/**
 * 缓存地址
 */
export function cacheAddress(latitude: number, longitude: number, address: string): void {
  const key = getCacheKey(latitude, longitude)
  geocodeCache.set(key, {
    address,
    timestamp: Date.now(),
  })

  // 限制缓存大小（最多保存1000个条目）
  if (geocodeCache.size > 1000) {
    // 删除最旧的条目
    const entries = Array.from(geocodeCache.entries())
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp)
    const toDelete = entries.slice(0, entries.length - 1000)
    toDelete.forEach(([key]) => geocodeCache.delete(key))
  }
}

/**
 * 清除所有缓存
 */
export function clearGeocodeCache(): void {
  geocodeCache.clear()
}
