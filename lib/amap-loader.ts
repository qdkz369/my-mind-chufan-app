/**
 * 高德地图全局加载器
 * 确保 AMap 只加载一次，避免重复调用 API
 */

let amapLoaderPromise: Promise<any> | null = null
let amapInstance: any = null
let isAMapLoaded = false

/**
 * 全局加载高德地图（单例模式）
 * 确保在整个应用中只加载一次
 */
export async function loadAMapOnce(): Promise<any> {
  // 如果已经加载，直接返回
  if (typeof window !== 'undefined' && (window as any).AMap && isAMapLoaded) {
    return (window as any).AMap
  }

  // 如果正在加载，返回现有的 Promise
  if (amapLoaderPromise) {
    return amapLoaderPromise
  }

  // 开始加载
  amapLoaderPromise = (async () => {
    try {
      // 检查是否已经加载
      if (typeof window !== 'undefined' && (window as any).AMap) {
        amapInstance = (window as any).AMap
        isAMapLoaded = true
        return amapInstance
      }

      const amapKey = process.env.NEXT_PUBLIC_AMAP_KEY || '21556e22648ec56beda3e6148a22937c'
      if (!amapKey) {
        throw new Error('AMAP_KEY未配置')
      }

      // 确保安全密钥已配置
      if (typeof window !== 'undefined' && !(window as any)._AMapSecurityConfig) {
        (window as any)._AMapSecurityConfig = {
          securityJsCode: 'ce1bde649b433cf6dbd4343190a6009a'
        }
      }

      // 动态导入 AMapLoader
      const AMapLoader = (await import('@amap/amap-jsapi-loader')).default
      amapInstance = await AMapLoader.load({
        key: amapKey,
        version: '2.0',
        plugins: ['AMap.Geolocation', 'AMap.Geocoder'],
      })

      isAMapLoaded = true
      console.log('[AMap Loader] 高德地图全局加载成功（单例模式）')
      return amapInstance
    } catch (error) {
      console.error('[AMap Loader] 加载高德地图失败:', error)
      amapLoaderPromise = null // 重置，允许重试
      throw error
    }
  })()

  return amapLoaderPromise
}

/**
 * 检查 AMap 是否已加载
 */
export function isAMapAvailable(): boolean {
  return typeof window !== 'undefined' && !!(window as any).AMap && isAMapLoaded
}

/**
 * 获取已加载的 AMap 实例
 */
export function getAMapInstance(): any {
  if (typeof window !== 'undefined' && (window as any).AMap) {
    return (window as any).AMap
  }
  return null
}
