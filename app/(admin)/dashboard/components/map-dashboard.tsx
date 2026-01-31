"use client"

/**
 * 实时地图看板 - UI + 地图逻辑
 * 从 page.tsx 提取：高德地图初始化、餐厅标记、服务点圆圈、地理编码、定位等。
 */

import { useState, useEffect, useCallback, useRef, forwardRef, useImperativeHandle } from "react"
import { MapPin, Activity } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"
import { logBusinessWarning } from "@/lib/utils/logger"
import type { Restaurant, Order } from "../types/dashboard-types"

export interface ServicePointMap {
  id: string
  name?: string
  latitude?: number | null
  longitude?: number | null
  service_radius?: number | null
  [k: string]: any
}

export interface MapDashboardProps {
  restaurants: Restaurant[]
  orders: Order[]
  servicePoints: ServicePointMap[]
  setRestaurants: React.Dispatch<React.SetStateAction<Restaurant[]>>
  supabase: typeof supabase
}

export interface MapDashboardHandle {
  locateToRestaurant: (restaurant: Restaurant) => void
}

const AMAP_SECURITY_CODE = "ce1bde649b433cf6dbd4343190a6009a"
const CACHE_KEY = "restaurant_geocode_last_update"
const CACHE_DURATION = 24 * 60 * 60 * 1000

/** 中国境内经度约 73–135、纬度约 18–54；若两数落在对方区间则视为库内存反，自动纠正为 [lat, lng] */
function normalizeLatLng(latitude: number, longitude: number): { lat: number; lng: number } {
  const inChinaLng = (x: number) => x >= 73 && x <= 135
  const inChinaLat = (x: number) => x >= 18 && x <= 54
  if (inChinaLat(latitude) && inChinaLng(longitude)) return { lat: latitude, lng: longitude }
  if (inChinaLng(latitude) && inChinaLat(longitude)) return { lat: longitude, lng: latitude }
  return { lat: latitude, lng: longitude }
}

function generateAddressFallbacks(address: string): string[] {
  const fallbacks: string[] = [address]
  const withoutNumber = address.replace(/\d+号?$/, "").trim()
  if (withoutNumber && withoutNumber !== address) fallbacks.push(withoutNumber)
  const keyPlaceMatch = address.match(/([^省市区县镇乡街道]+(?:村|庄|社区|小区|路|街|巷|弄|公交站|站))/)
  if (keyPlaceMatch?.[1]) {
    const keyPlace = keyPlaceMatch[1]
    if (!fallbacks.includes(keyPlace)) fallbacks.push(keyPlace)
    if (!keyPlace.includes("公交站") && !keyPlace.includes("站")) {
      const busStop = `${keyPlace}（公交站）`
      if (!fallbacks.includes(busStop)) fallbacks.push(busStop)
      const busStop2 = `${keyPlace}公交站`
      if (!fallbacks.includes(busStop2)) fallbacks.push(busStop2)
    }
  }
  const mainAreaMatch = address.match(/^([^省]*省?[^市]*市[^区]*区?[^县]*县?[^镇]*镇?[^乡]*乡?[^街道]*街道?[^村]*村?)/)
  if (mainAreaMatch?.[1]) {
    const mainArea = mainAreaMatch[1].replace(/\d+号?$/, "").trim()
    if (mainArea && mainArea !== address && !fallbacks.includes(mainArea)) fallbacks.push(mainArea)
  }
  const districtMatch = address.match(/^([^省]*省?[^市]*市[^区]*区?[^县]*县?)/)
  if (districtMatch?.[1]) {
    const d = districtMatch[1]
    if (d && d !== address && !fallbacks.includes(d)) fallbacks.push(d)
  }
  if (keyPlaceMatch?.[1]) {
    const cityMatch = address.match(/^([^省]*省?[^市]*市)/)
    if (cityMatch?.[1]) {
      const cityKey = `${cityMatch[1]}${keyPlaceMatch[1]}`
      if (!fallbacks.includes(cityKey)) fallbacks.push(cityKey)
    }
  }
  return [...new Set(fallbacks)]
}

function createMarkerHTML(_restaurant: Restaurant, _hasActiveOrders: boolean): string {
  return `
    <div class="marker-pulse" style="
      width: 20px; height: 20px; border-radius: 50%;
      background: white; border: 2px solid #3b82f6;
      box-shadow: 0 0 10px rgba(59, 130, 246, 0.5);
      cursor: pointer; display: block; position: relative;
    "></div>
  `
}

export const MapDashboard = forwardRef<MapDashboardHandle, MapDashboardProps>(function MapDashboard(
  { restaurants, orders, servicePoints, setRestaurants, supabase },
  ref
) {
  const [mapLoaded, setMapLoaded] = useState(false)
  const [showServicePoints, setShowServicePoints] = useState(false)
  const showHeatmap = false

  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const infoWindowsRef = useRef<any[]>([])
  const serviceCirclesRef = useRef<any[]>([])
  const markerMapRef = useRef<Map<string, { marker: any; infoWindow: any }>>(new Map())
  const heatmapRef = useRef<any>(null)
  const markerClickTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map())
  const markerDoubleClickFlagsRef = useRef<Map<string, boolean>>(new Map())
  const updateMarkersTimerRef = useRef<NodeJS.Timeout | null>(null)
  const mapBoundsAdjustedRef = useRef(false)
  const geocodingInProgressRef = useRef<Set<string>>(new Set())
  const lastUpdateMarkersTimeRef = useRef(0)
  const isUpdatingMarkersRef = useRef(false)
  const geocodingEffectInProgressRef = useRef(false)
  const geocodingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastMapDataKeyRef = useRef<string>("")
  const mapDataSettleTimerRef = useRef<NodeJS.Timeout | null>(null)
  const pendingDataKeyRef = useRef<string>("")

  const safeInfoWindowClose = useCallback((iw: any) => {
    try {
      if (iw && typeof iw.close === "function") iw.close()
    } catch (_) { /* 高德 SDK 可能抛出 removeChild，忽略 */ }
  }, [])
  const safeMarkerSetMapNull = useCallback((m: any) => {
    try {
      if (m && typeof m.setMap === "function") m.setMap(null)
    } catch (_) { /* 同上 */ }
  }, [])

  const geocodeAddress = useCallback(async (address: string): Promise<{ latitude: number; longitude: number } | null> => {
    return new Promise((resolve) => {
      if (typeof window === "undefined" || !(window as any).AMap) {
        resolve(null)
        return
      }
      const AMap = (window as any).AMap
      if (!AMap.Geocoder || typeof AMap.Geocoder !== "function") {
        if (AMap.plugin) {
          AMap.plugin("AMap.Geocoder", () => {
            if (AMap.Geocoder) runGeocode()
            else resolve(null)
          })
        } else resolve(null)
        return
      }
      runGeocode()

      function runGeocode() {
        const geocoder = new AMap.Geocoder({ city: "昆明" })
        const fallbacks = generateAddressFallbacks(address)
        let idx = 0
        function tryNext() {
          if (idx >= fallbacks.length) {
            resolve(null)
            return
          }
          const addr = fallbacks[idx++]
          geocoder.getLocation(addr, (status: string, result: any) => {
            if (status === "complete" && result?.info === "OK" && result?.geocodes?.[0]) {
              const lng = result.geocodes[0].location?.lng
              const lat = result.geocodes[0].location?.lat
              if (typeof lng === "number" && typeof lat === "number") {
                resolve({ longitude: lng, latitude: lat })
                return
              }
            }
            tryNext()
          })
        }
        tryNext()
      }
    })
  }, [])

  const updateRestaurantCoordinates = useCallback(
    async (list: Restaurant[]) => {
      if (destroyedRef.current || !supabase || typeof window === "undefined" || !(window as any).AMap) return
      const toGeocode = list.filter(
        (r) =>
          r.address &&
          r.address.trim() !== "" &&
          r.address !== "地址待完善" &&
          (!r.latitude || !r.longitude || isNaN(r.latitude) || isNaN(r.longitude))
      )
      if (toGeocode.length === 0) return
      const batchSize = 3
      let updatedCount = 0
      for (let i = 0; i < toGeocode.length; i += batchSize) {
        const batch = toGeocode.slice(i, i + batchSize)
        await Promise.all(
          batch.map(async (restaurant) => {
            if (!restaurant.address || destroyedRef.current) return
            const location = await geocodeAddress(restaurant.address)
            if (!location || !supabase || destroyedRef.current) return
            const { lat: locLat, lng: locLng } = normalizeLatLng(location.latitude, location.longitude)
            const { error } = await supabase
              .from("restaurants")
              .update({
                latitude: locLat,
                longitude: locLng,
                location: `${locLat},${locLng}`,
              })
              .eq("id", restaurant.id)
            if (!error && !destroyedRef.current) {
              updatedCount++
              setRestaurants((prev) =>
                prev.map((r) =>
                  r.id === restaurant.id ? { ...r, latitude: locLat, longitude: locLng } : r
                )
              )
            }
          })
        )
        if (destroyedRef.current) return
        if (i + batchSize < toGeocode.length) await new Promise((r) => setTimeout(r, 500))
      }
      if (typeof window !== "undefined") {
        localStorage.setItem(CACHE_KEY, Date.now().toString())
      }
    },
    [supabase, geocodeAddress, setRestaurants]
  )

  const calculateMapCenterAndZoom = useCallback((): { center: [number, number]; zoom: number } => {
    const withLoc = restaurants.filter(
      (r) =>
        r.latitude != null &&
        r.longitude != null &&
        typeof r.latitude === "number" &&
        typeof r.longitude === "number" &&
        !isNaN(r.latitude) &&
        !isNaN(r.longitude)
    )
    const valid = withLoc.filter((r) => {
      const { lat, lng } = normalizeLatLng(r.latitude!, r.longitude!)
      return lng >= 102 && lng <= 103 && lat >= 24 && lat <= 26
    })
    if (valid.length === 0) {
      return { center: [102.7183, 25.0389], zoom: 12 }
    }
    const sorted = [...valid].sort((a, b) => {
      const ta = (a as any).created_at ? new Date((a as any).created_at).getTime() : 0
      const tb = (b as any).created_at ? new Date((b as any).created_at).getTime() : 0
      return tb - ta
    })
    const last = sorted[0]
    const { lat: lastLat, lng: lastLng } = normalizeLatLng(last.latitude!, last.longitude!)
    const center: [number, number] = [lastLng, lastLat]
    if (center[0] < 102 || center[0] > 103 || center[1] < 24 || center[1] > 26) {
      return { center: [102.7183, 25.0389], zoom: 13 }
    }
    return { center, zoom: 13 }
  }, [restaurants])

  const destroyedRef = useRef(false)

  const destroyMap = useCallback(() => {
    if (typeof window === "undefined") return
    destroyedRef.current = true
    const map = mapInstanceRef.current
    if (!map) {
      setMapLoaded(false)
      return
    }
    const markers = [...markersRef.current]
    const infoWindows = [...infoWindowsRef.current]
    const circles = [...serviceCirclesRef.current]
    markersRef.current = []
    infoWindowsRef.current = []
    serviceCirclesRef.current = []
    markerMapRef.current.clear()
    markerClickTimersRef.current.forEach((t) => clearTimeout(t))
    markerClickTimersRef.current.clear()
    markerDoubleClickFlagsRef.current.clear()
    markers.forEach((m) => safeMarkerSetMapNull(m))
    infoWindows.forEach((iw) => safeInfoWindowClose(iw))
    circles.forEach((c) => safeMarkerSetMapNull(c))
    try {
      map.destroy()
    } catch (e) {
      logBusinessWarning("Map", "销毁地图失败", e)
    }
    mapInstanceRef.current = null
    setMapLoaded(false)
  }, [safeInfoWindowClose, safeMarkerSetMapNull])

  const updateMarkers = useCallback(
    (restaurantsToUse?: Restaurant[]) => {
      if (destroyedRef.current) return
      const now = Date.now()
      if (isUpdatingMarkersRef.current || now - lastUpdateMarkersTimeRef.current < 500) return
      const current = restaurantsToUse ?? restaurants
      const map = mapInstanceRef.current
      const AMap = (window as any).AMap
      if (!map || !AMap) return

      isUpdatingMarkersRef.current = true
      lastUpdateMarkersTimeRef.current = now

      const activeIds = new Set(
        orders
          .filter((o) => o.status === "pending" || o.status === "待处理" || o.status === "delivering" || o.status === "配送中")
          .map((o) => o.restaurant_id)
      )

      const newIds = new Set(current.map((r) => r.id))
      const existingIds = new Set(markerMapRef.current.keys())
      const hasIdChange =
        current.length !== existingIds.size ||
        current.some((r) => !existingIds.has(r.id)) ||
        [...existingIds].some((id) => !newIds.has(id))

      if (markersRef.current.length > 0 && !hasIdChange) {
        current.forEach((r) => {
          const rawLat = typeof r.latitude === "number" ? r.latitude : parseFloat(String(r.latitude || ""))
          const rawLng = typeof r.longitude === "number" ? r.longitude : parseFloat(String(r.longitude || ""))
          if (isNaN(rawLat) || !isFinite(rawLat) || isNaN(rawLng) || !isFinite(rawLng)) return
          const { lat, lng } = normalizeLatLng(rawLat, rawLng)
          const entry = markerMapRef.current.get(r.id)
          if (!entry?.marker) return
          const p = entry.marker.getPosition?.()
          const curLng = p?.getLng?.() ?? p?.lng
          const curLat = p?.getLat?.() ?? p?.lat
          if (typeof curLng !== "number" || typeof curLat !== "number" || Math.abs(curLng - lng) > 1e-6 || Math.abs(curLat - lat) > 1e-6) {
            try {
              entry.marker.setPosition([lng, lat])
            } catch (_) {}
          }
        })
        const needNewMarkers = current.filter((r) => {
          const rawLat = typeof r.latitude === "number" ? r.latitude : parseFloat(String(r.latitude || ""))
          const rawLng = typeof r.longitude === "number" ? r.longitude : parseFloat(String(r.longitude || ""))
          const valid = !isNaN(rawLat) && isFinite(rawLat) && rawLat >= -90 && rawLat <= 90 && !isNaN(rawLng) && isFinite(rawLng) && rawLng >= -180 && rawLng <= 180
          return valid && !markerMapRef.current.has(r.id)
        })
        if (needNewMarkers.length > 0) {
          needNewMarkers.forEach((restaurant) => {
            const rawLat = typeof restaurant.latitude === "number" ? restaurant.latitude : parseFloat(String(restaurant.latitude || ""))
            const rawLng = typeof restaurant.longitude === "number" ? restaurant.longitude : parseFloat(String(restaurant.longitude || ""))
            const { lat, lng } = normalizeLatLng(rawLat, rawLng)
            const pos: [number, number] = [lng, lat]
            const hasActive = activeIds.has(restaurant.id)
            const markerHTML = createMarkerHTML(restaurant, hasActive)
            let marker: any
            try {
              marker = new AMap.Marker({ position: pos, content: markerHTML, offset: new AMap.Pixel(-20, -20), zIndex: 100, visible: true, cursor: "pointer", title: restaurant.name })
            } catch {
              return
            }
            const infoContent = `
          <div style="background:linear-gradient(135deg,rgba(15,23,42,0.95),rgba(30,58,138,0.95));border:1px solid rgba(59,130,246,0.5);border-radius:12px;padding:16px;min-width:250px;color:white;font-family:system-ui,sans-serif;">
            <div style="font-size:18px;font-weight:600;margin-bottom:12px;color:#60a5fa;">${restaurant.name}</div>
            <div style="font-size:12px;color:#94a3b8;"><strong>QR Token:</strong> <span style="color:#cbd5e1;">${(restaurant as any).qr_token || "未设置"}</span></div>
            <div style="font-size:12px;color:#94a3b8;"><strong>累计加注量:</strong> <span style="color:#34d399;">${(restaurant as any).total_refilled ?? 0}L</span></div>
            <div style="font-size:12px;color:#94a3b8;"><strong>状态:</strong> <span style="color:${restaurant.status === "activated" || restaurant.status === "已激活" ? "#34d399" : "#fbbf24"};">${restaurant.status === "activated" || restaurant.status === "已激活" ? "已激活" : "待激活"}</span></div>
          </div>
        `
            const infoWindow = new AMap.InfoWindow({ content: infoContent, offset: new AMap.Pixel(0, -30), closeWhenClickMap: true })
            const rid = restaurant.id
            marker.on("click", () => {
              const existing = markerClickTimersRef.current.get(rid)
              if (existing) clearTimeout(existing)
              const t = setTimeout(() => {
                const isDbl = markerDoubleClickFlagsRef.current.get(rid) || false
                if (!isDbl) {
                  infoWindowsRef.current.forEach((iw) => safeInfoWindowClose(iw))
                  const p = marker.getPosition()
                  if (p) {
                    const plng = p.getLng?.() ?? p.lng
                    const plat = p.getLat?.() ?? p.lat
                    if (typeof plng === "number" && typeof plat === "number" && !isNaN(plng) && !isNaN(plat)) {
                      infoWindow.open(map, p)
                    }
                  }
                }
                markerDoubleClickFlagsRef.current.set(rid, false)
                markerClickTimersRef.current.delete(rid)
              }, 300)
              markerClickTimersRef.current.set(rid, t)
            })
            marker.on("dblclick", (e: any) => {
              if (e?.domEvent) {
                e.domEvent.stopPropagation()
                e.domEvent.preventDefault()
              }
              markerDoubleClickFlagsRef.current.set(rid, true)
              const existing = markerClickTimersRef.current.get(rid)
              if (existing) {
                clearTimeout(existing)
                markerClickTimersRef.current.delete(rid)
              }
              infoWindowsRef.current.forEach((iw) => safeInfoWindowClose(iw))
              const p = marker.getPosition()
              if (p) {
                const plng = p.getLng?.() ?? p.lng
                const plat = p.getLat?.() ?? p.lat
                if (typeof plng === "number" && typeof plat === "number" && !isNaN(plng) && !isNaN(plat)) {
                  map.setZoomAndCenter(18, p, false)
                  setTimeout(() => {
                    if (markerDoubleClickFlagsRef.current.get(rid)) {
                      infoWindow.open(map, p)
                      markerDoubleClickFlagsRef.current.set(rid, false)
                    }
                  }, 1000)
                }
              }
            })
            map.add(marker)
            if (marker.show) marker.show()
            if (marker.setVisible) marker.setVisible(true)
            markersRef.current.push(marker)
            infoWindowsRef.current.push(infoWindow)
            markerMapRef.current.set(restaurant.id, { marker, infoWindow })
          })
        }
        isUpdatingMarkersRef.current = false
        return
      }

      const removedIds = new Set([...existingIds].filter((id) => !newIds.has(id)))
      const addedIds = new Set([...newIds].filter((id) => !existingIds.has(id)))
      const onlyAdditions = hasIdChange && addedIds.size > 0 && removedIds.size === 0

      if (onlyAdditions && markersRef.current.length > 0) {
        current.forEach((restaurant) => {
          if (!addedIds.has(restaurant.id)) return
          const rawLat = typeof restaurant.latitude === "number" ? restaurant.latitude : parseFloat(String(restaurant.latitude || ""))
          const rawLng = typeof restaurant.longitude === "number" ? restaurant.longitude : parseFloat(String(restaurant.longitude || ""))
          const validLat = !isNaN(rawLat) && isFinite(rawLat) && rawLat >= -90 && rawLat <= 90
          const validLng = !isNaN(rawLng) && isFinite(rawLng) && rawLng >= -180 && rawLng <= 180
          if (!validLat || !validLng) return
          const { lat, lng } = normalizeLatLng(rawLat, rawLng)
          const pos: [number, number] = [lng, lat]
          const hasActive = activeIds.has(restaurant.id)
          const markerHTML = createMarkerHTML(restaurant, hasActive)
          let marker: any
          try {
            marker = new AMap.Marker({ position: pos, content: markerHTML, offset: new AMap.Pixel(-20, -20), zIndex: 100, visible: true, cursor: "pointer", title: restaurant.name })
          } catch {
            return
          }
          const infoContent = `
          <div style="background:linear-gradient(135deg,rgba(15,23,42,0.95),rgba(30,58,138,0.95));border:1px solid rgba(59,130,246,0.5);border-radius:12px;padding:16px;min-width:250px;color:white;font-family:system-ui,sans-serif;">
            <div style="font-size:18px;font-weight:600;margin-bottom:12px;color:#60a5fa;">${restaurant.name}</div>
            <div style="font-size:12px;color:#94a3b8;"><strong>QR Token:</strong> <span style="color:#cbd5e1;">${(restaurant as any).qr_token || "未设置"}</span></div>
            <div style="font-size:12px;color:#94a3b8;"><strong>累计加注量:</strong> <span style="color:#34d399;">${(restaurant as any).total_refilled ?? 0}L</span></div>
            <div style="font-size:12px;color:#94a3b8;"><strong>状态:</strong> <span style="color:${restaurant.status === "activated" || restaurant.status === "已激活" ? "#34d399" : "#fbbf24"};">${restaurant.status === "activated" || restaurant.status === "已激活" ? "已激活" : "待激活"}</span></div>
          </div>
        `
          const infoWindow = new AMap.InfoWindow({ content: infoContent, offset: new AMap.Pixel(0, -30), closeWhenClickMap: true })
          const rid = restaurant.id
          marker.on("click", () => {
            const existing = markerClickTimersRef.current.get(rid)
            if (existing) clearTimeout(existing)
            const t = setTimeout(() => {
              const isDbl = markerDoubleClickFlagsRef.current.get(rid) || false
              if (!isDbl) {
                infoWindowsRef.current.forEach((iw) => safeInfoWindowClose(iw))
                const p = marker.getPosition()
                if (p) {
                  const plng = p.getLng?.() ?? p.lng
                  const plat = p.getLat?.() ?? p.lat
                  if (typeof plng === "number" && typeof plat === "number" && !isNaN(plng) && !isNaN(plat)) {
                    infoWindow.open(map, p)
                  }
                }
              }
              markerDoubleClickFlagsRef.current.set(rid, false)
              markerClickTimersRef.current.delete(rid)
            }, 300)
            markerClickTimersRef.current.set(rid, t)
          })
          marker.on("dblclick", (e: any) => {
            if (e?.domEvent) {
              e.domEvent.stopPropagation()
              e.domEvent.preventDefault()
            }
            markerDoubleClickFlagsRef.current.set(rid, true)
            const existing = markerClickTimersRef.current.get(rid)
            if (existing) {
              clearTimeout(existing)
              markerClickTimersRef.current.delete(rid)
            }
            infoWindowsRef.current.forEach((iw) => safeInfoWindowClose(iw))
            const p = marker.getPosition()
            if (p) {
              const plng = p.getLng?.() ?? p.lng
              const plat = p.getLat?.() ?? p.lat
              if (typeof plng === "number" && typeof plat === "number" && !isNaN(plng) && !isNaN(plat)) {
                map.setZoomAndCenter(18, p, false)
                setTimeout(() => {
                  if (markerDoubleClickFlagsRef.current.get(rid)) {
                    infoWindow.open(map, p)
                    markerDoubleClickFlagsRef.current.set(rid, false)
                  }
                }, 1000)
              }
            }
          })
          map.add(marker)
          if (marker.show) marker.show()
          if (marker.setVisible) marker.setVisible(true)
          markersRef.current.push(marker)
          infoWindowsRef.current.push(infoWindow)
          markerMapRef.current.set(restaurant.id, { marker, infoWindow })
        })
        isUpdatingMarkersRef.current = false
        return
      }

      if (markersRef.current.length > 0 && hasIdChange) {
        const toRemoveM = [...markersRef.current]
        markersRef.current = []
        toRemoveM.forEach((m) => safeMarkerSetMapNull(m))
      }

      const toRemoveIw = [...infoWindowsRef.current]
      const toRemoveC = [...serviceCirclesRef.current]
      infoWindowsRef.current = []
      serviceCirclesRef.current = []
      markerMapRef.current.clear()
      markerClickTimersRef.current.forEach((t) => clearTimeout(t))
      markerClickTimersRef.current.clear()
      markerDoubleClickFlagsRef.current.clear()
      toRemoveIw.forEach((iw) => safeInfoWindowClose(iw))
      toRemoveC.forEach((c) => safeMarkerSetMapNull(c))

      current.forEach((restaurant) => {
        const rawLat = typeof restaurant.latitude === "number" ? restaurant.latitude : parseFloat(String(restaurant.latitude || ""))
        const rawLng = typeof restaurant.longitude === "number" ? restaurant.longitude : parseFloat(String(restaurant.longitude || ""))
        const validLat = !isNaN(rawLat) && isFinite(rawLat) && rawLat >= -90 && rawLat <= 90
        const validLng = !isNaN(rawLng) && isFinite(rawLng) && rawLng >= -180 && rawLng <= 180
        if (!validLat || !validLng) {
          if (restaurant.address && restaurant.address.trim() && restaurant.address !== "地址待完善" && !geocodingInProgressRef.current.has(restaurant.id)) {
            geocodingInProgressRef.current.add(restaurant.id)
            geocodeAddress(restaurant.address).then((loc) => {
              geocodingInProgressRef.current.delete(restaurant.id)
              if (!loc || !supabase || destroyedRef.current) return
              const { lat: locLat, lng: locLng } = normalizeLatLng(loc.latitude, loc.longitude)
              supabase
                .from("restaurants")
                .update({
                  latitude: locLat,
                  longitude: locLng,
                  location: `${locLat},${locLng}`,
                })
                .eq("id", restaurant.id)
                .then(({ error }) => {
                  if (destroyedRef.current) return
                  if (!error) {
                    if (typeof window !== "undefined") localStorage.setItem(CACHE_KEY, Date.now().toString())
                    setRestaurants((prev) =>
                      prev.map((r) => (r.id === restaurant.id ? { ...r, latitude: locLat, longitude: locLng } : r))
                    )
                    setTimeout(() => {
                      if (destroyedRef.current) return
                      if (mapInstanceRef.current && markerMapRef.current.has(restaurant.id)) {
                        const { marker } = markerMapRef.current.get(restaurant.id)!
                        try {
                          marker.setPosition([locLng, locLat])
                        } catch {
                          const updated = restaurants.map((r) => (r.id === restaurant.id ? { ...r, latitude: locLat, longitude: locLng } : r))
                          updateMarkers(updated)
                        }
                      } else {
                        const updated = restaurants.map((r) => (r.id === restaurant.id ? { ...r, latitude: locLat, longitude: locLng } : r))
                        updateMarkers(updated)
                      }
                    }, 300)
                  }
                })
            })
          }
          return
        }

        const { lat, lng } = normalizeLatLng(rawLat, rawLng)
        const pos: [number, number] = [lng, lat]
        const hasActive = activeIds.has(restaurant.id)
        const markerHTML = createMarkerHTML(restaurant, hasActive)
        let marker: any
        try {
          marker = new AMap.Marker({
            position: pos,
            content: markerHTML,
            offset: new AMap.Pixel(-20, -20),
            zIndex: 100,
            visible: true,
            cursor: "pointer",
            title: restaurant.name,
          })
        } catch {
          return
        }

        const infoContent = `
          <div style="background:linear-gradient(135deg,rgba(15,23,42,0.95),rgba(30,58,138,0.95));border:1px solid rgba(59,130,246,0.5);border-radius:12px;padding:16px;min-width:250px;color:white;font-family:system-ui,sans-serif;">
            <div style="font-size:18px;font-weight:600;margin-bottom:12px;color:#60a5fa;">${restaurant.name}</div>
            <div style="font-size:12px;color:#94a3b8;"><strong>QR Token:</strong> <span style="color:#cbd5e1;">${(restaurant as any).qr_token || "未设置"}</span></div>
            <div style="font-size:12px;color:#94a3b8;"><strong>累计加注量:</strong> <span style="color:#34d399;">${(restaurant as any).total_refilled ?? 0}L</span></div>
            <div style="font-size:12px;color:#94a3b8;"><strong>状态:</strong> <span style="color:${restaurant.status === "activated" || restaurant.status === "已激活" ? "#34d399" : "#fbbf24"};">${restaurant.status === "activated" || restaurant.status === "已激活" ? "已激活" : "待激活"}</span></div>
          </div>
        `
        const infoWindow = new AMap.InfoWindow({
          content: infoContent,
          offset: new AMap.Pixel(0, -30),
          closeWhenClickMap: true,
        })

        const rid = restaurant.id
        marker.on("click", () => {
          const existing = markerClickTimersRef.current.get(rid)
          if (existing) clearTimeout(existing)
          const t = setTimeout(() => {
            const isDbl = markerDoubleClickFlagsRef.current.get(rid) || false
            if (!isDbl) {
              infoWindowsRef.current.forEach((iw) => safeInfoWindowClose(iw))
              const p = marker.getPosition()
              if (p) {
                const plng = p.getLng?.() ?? p.lng
                const plat = p.getLat?.() ?? p.lat
                if (typeof plng === "number" && typeof plat === "number" && !isNaN(plng) && !isNaN(plat)) {
                  infoWindow.open(map, p)
                }
              }
            }
            markerDoubleClickFlagsRef.current.set(rid, false)
            markerClickTimersRef.current.delete(rid)
          }, 300)
          markerClickTimersRef.current.set(rid, t)
        })

        marker.on("dblclick", (e: any) => {
          if (e?.domEvent) {
            e.domEvent.stopPropagation()
            e.domEvent.preventDefault()
          }
          markerDoubleClickFlagsRef.current.set(rid, true)
          const existing = markerClickTimersRef.current.get(rid)
          if (existing) {
            clearTimeout(existing)
            markerClickTimersRef.current.delete(rid)
          }
          infoWindowsRef.current.forEach((iw) => safeInfoWindowClose(iw))
          const p = marker.getPosition()
          if (p) {
            const plng = p.getLng?.() ?? p.lng
            const plat = p.getLat?.() ?? p.lat
            if (typeof plng === "number" && typeof plat === "number" && !isNaN(plng) && !isNaN(plat)) {
              map.setZoomAndCenter(18, p, false)
              setTimeout(() => {
                if (markerDoubleClickFlagsRef.current.get(rid)) {
                  infoWindow.open(map, p)
                  markerDoubleClickFlagsRef.current.set(rid, false)
                }
              }, 1000)
            }
          }
        })

        try {
          map.add(marker)
          if (marker.show) marker.show()
          if (marker.setVisible) marker.setVisible(true)
          markersRef.current.push(marker)
          infoWindowsRef.current.push(infoWindow)
          markerMapRef.current.set(restaurant.id, { marker, infoWindow })
        } catch (_) {}
      })

      if (showServicePoints) {
        servicePoints.forEach((sp) => {
          const lat = sp.latitude
          const lng = sp.longitude
          const r = (sp.service_radius ?? 0) * 1000
          if (lat == null || lng == null || !r) return
          const circle = new AMap.Circle({
            center: [lng, lat],
            radius: r,
            fillColor: "#3b82f6",
            fillOpacity: 0.2,
            strokeColor: "#60a5fa",
            strokeOpacity: 0.6,
            strokeWeight: 2,
            strokeStyle: "solid",
            zIndex: 50,
          })
          map.add(circle)
          serviceCirclesRef.current.push(circle)
        })
      }

      isUpdatingMarkersRef.current = false
    },
    [restaurants, orders, servicePoints, showServicePoints, showHeatmap, geocodeAddress, supabase, setRestaurants, safeInfoWindowClose, safeMarkerSetMapNull]
  )

  const initMap = useCallback(async () => {
    if (!mapContainerRef.current || mapInstanceRef.current) return
    destroyedRef.current = false
    const amapKey = process.env.NEXT_PUBLIC_AMAP_KEY || "21556e22648ec56beda3e6148a22937c"
    if (!amapKey) {
      setMapLoaded(true)
      return
    }
    if (typeof window !== "undefined" && !(window as any)._AMapSecurityConfig) {
      ;(window as any)._AMapSecurityConfig = { securityJsCode: AMAP_SECURITY_CODE }
    }

    const { center, zoom } = calculateMapCenterAndZoom()

    try {
      const win = typeof window !== "undefined" ? window : null
      if (win && (win as any).AMap) {
        if (destroyedRef.current) return
        const AMap = (win as any).AMap
        if (!mapContainerRef.current) return
        const map = new AMap.Map(mapContainerRef.current, {
          mapStyle: "amap://styles/darkblue",
          center,
          zoom,
          viewMode: "3D",
        })
        mapInstanceRef.current = map
        setMapLoaded(true)
        if (AMap.plugin) AMap.plugin(["AMap.Geocoder", "AMap.PlaceSearch"], () => {})
        const done = () => {
          if (destroyedRef.current) return
          setTimeout(() => {
            if (destroyedRef.current) return
            updateMarkers()
            setRestaurants((prev) => {
              if (destroyedRef.current || prev.length === 0) return prev
              updateRestaurantCoordinates(prev)
              return prev
            })
          }, 500)
        }
        const to = setTimeout(() => {
          if (destroyedRef.current) return
          setTimeout(() => { if (!destroyedRef.current) updateMarkers() }, 500)
        }, 3000)
        map.on("complete", () => {
          clearTimeout(to)
          done()
        })
        if (map.getStatus?.() === "complete") {
          clearTimeout(to)
          done()
        }
        return
      }

      // 高德脚本加载后控制台可能出现 Canvas2D getImageData 提示，来自 SDK 内部，可忽略
      const script = document.createElement("script")
      script.src = `https://webapi.amap.com/maps?v=2.0&key=${amapKey}&callback=initAMapCallback`
      script.async = true
      script.onerror = () => {
        setMapLoaded(true)
      }
      ;(window as any).initAMapCallback = () => {
        try {
          const AMap = (window as any).AMap
          if (!AMap || !mapContainerRef.current || destroyedRef.current) {
            setMapLoaded(true)
            return
          }
          const map = new AMap.Map(mapContainerRef.current, {
            mapStyle: "amap://styles/darkblue",
            center,
            zoom,
            viewMode: "3D",
            minZoom: 10,
            maxZoom: 18,
          })
          mapInstanceRef.current = map
          setMapLoaded(true)
          if (AMap.plugin) AMap.plugin(["AMap.Geocoder", "AMap.PlaceSearch", "AMap.HeatMap"], () => {})
          const to2 = setTimeout(() => {
            if (destroyedRef.current) return
            setTimeout(() => { if (!destroyedRef.current) updateMarkers() }, 500)
          }, 3000)
          const done2 = () => {
            clearTimeout(to2)
            if (destroyedRef.current) return
            setTimeout(() => {
              if (destroyedRef.current) return
              updateMarkers()
              setRestaurants((prev) => {
                if (destroyedRef.current || prev.length === 0) return prev
                updateRestaurantCoordinates(prev)
                return prev
              })
            }, 500)
          }
          map.on("complete", done2)
          if (map.getStatus?.() === "complete") done2()
        } finally {
          ;(window as any).initAMapCallback = undefined
        }
      }
      if (!document.querySelector('script[src^="https://webapi.amap.com/maps"]')) {
        document.head.appendChild(script)
      } else if ((win as any).AMap) {
        ;(window as any).initAMapCallback?.()
      }
    } catch (e) {
      logBusinessWarning("Map", "初始化地图失败", e)
      setMapLoaded(true)
    }
  }, [calculateMapCenterAndZoom, updateMarkers, updateRestaurantCoordinates, setRestaurants])

  useImperativeHandle(ref, () => ({
    locateToRestaurant(restaurant: Restaurant) {
      if (destroyedRef.current || restaurant.latitude == null || restaurant.longitude == null) return
      const map = mapInstanceRef.current
      const AMap = (window as any).AMap
      if (!map || !AMap) return
      const { lat, lng } = normalizeLatLng(Number(restaurant.latitude), Number(restaurant.longitude))
      const pos: [number, number] = [lng, lat]
      map.setFitView([new AMap.Marker({ position: pos })], false, [50, 50, 50, 50], 1000)
      setTimeout(() => {
        if (destroyedRef.current) return
        const info = markerMapRef.current.get(restaurant.id)
        if (info) {
          info.infoWindow.open(map, pos)
        } else {
          const temp = new AMap.InfoWindow({
            content: `
              <div style="background:linear-gradient(135deg,rgba(15,23,42,0.95),rgba(30,58,138,0.95));border:1px solid rgba(59,130,246,0.5);border-radius:12px;padding:16px;min-width:250px;color:white;">
                <div style="font-size:18px;font-weight:600;margin-bottom:12px;color:#60a5fa;">${restaurant.name}</div>
                <div style="font-size:12px;color:#94a3b8;"><strong>QR Token:</strong> <span style="color:#cbd5e1;">${(restaurant as any).qr_token || "未设置"}</span></div>
                <div style="font-size:12px;color:#94a3b8;"><strong>累计加注量:</strong> <span style="color:#34d399;">${(restaurant as any).total_refilled ?? 0}L</span></div>
                <div style="font-size:12px;color:#94a3b8;"><strong>状态:</strong> <span style="color:${restaurant.status === "activated" || restaurant.status === "已激活" ? "#34d399" : "#fbbf24"};">${restaurant.status === "activated" || restaurant.status === "已激活" ? "已激活" : "待激活"}</span></div>
              </div>
            `,
            offset: new AMap.Pixel(0, -30),
            closeWhenClickMap: true,
          })
          temp.open(map, pos)
        }
      }, 1100)
    },
  }))

  // 仅挂载时初始化地图一次，避免因 restaurants/orders 变化导致 initMap 引用变化而反复 destroy → init
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return
    initMap()
    return () => {
      destroyMap()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 故意只依赖挂载，地图不需随数据重初始化
  }, [])

  useEffect(() => {
    if (!mapInstanceRef.current || !mapLoaded || destroyedRef.current) return
    const dataKey = [
      mapLoaded,
      showServicePoints,
      showHeatmap,
      restaurants.length,
      restaurants.map((r) => r.id).sort().join(","),
      orders.length,
      orders.map((o) => o.id).sort().join(","),
      servicePoints.length,
    ].join("|")
    pendingDataKeyRef.current = dataKey

    if (mapDataSettleTimerRef.current) clearTimeout(mapDataSettleTimerRef.current)
    const capturedKey = dataKey
    mapDataSettleTimerRef.current = setTimeout(() => {
      mapDataSettleTimerRef.current = null
      if (destroyedRef.current) return
      if (pendingDataKeyRef.current !== capturedKey) return
      if (capturedKey === lastMapDataKeyRef.current) return
      lastMapDataKeyRef.current = capturedKey

      if (updateMarkersTimerRef.current) clearTimeout(updateMarkersTimerRef.current)
      updateMarkersTimerRef.current = setTimeout(() => {
        if (destroyedRef.current || isUpdatingMarkersRef.current) return
        updateMarkers()
      }, 400)
      const needGeocode = restaurants.some(
        (r) =>
          r.address &&
          r.address.trim() !== "" &&
          r.address !== "地址待完善" &&
          (!r.latitude || !r.longitude || isNaN(r.latitude) || isNaN(r.longitude))
      )
      if (needGeocode && typeof window !== "undefined" && (window as any).AMap && !geocodingEffectInProgressRef.current) {
        if (geocodingTimeoutRef.current) clearTimeout(geocodingTimeoutRef.current)
        geocodingTimeoutRef.current = setTimeout(async () => {
          if (destroyedRef.current || geocodingEffectInProgressRef.current) return
          geocodingEffectInProgressRef.current = true
          try {
            await updateRestaurantCoordinates(restaurants)
          } finally {
            if (!destroyedRef.current) geocodingEffectInProgressRef.current = false
          }
        }, 400)
      }
    }, 500)

    return () => {
      if (mapDataSettleTimerRef.current) {
        clearTimeout(mapDataSettleTimerRef.current)
        mapDataSettleTimerRef.current = null
      }
      if (updateMarkersTimerRef.current) {
        clearTimeout(updateMarkersTimerRef.current)
        updateMarkersTimerRef.current = null
      }
      if (geocodingTimeoutRef.current) {
        clearTimeout(geocodingTimeoutRef.current)
        geocodingTimeoutRef.current = null
      }
    }
  }, [restaurants, orders, servicePoints, showServicePoints, showHeatmap, mapLoaded, updateMarkers, updateRestaurantCoordinates])

  return (
    <Card semanticLevel="secondary_fact" className="bg-gradient-to-br from-slate-900/90 to-blue-950/90 border-blue-800/50 backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-white flex items-center gap-2">
              <MapPin className="h-5 w-5 text-cyan-400" />
              实时地图看板
            </CardTitle>
            <CardDescription className="text-slate-400">餐厅位置分布与状态监控</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled
              className="border-gray-500/30 text-gray-400 cursor-not-allowed opacity-50"
              title="热力图功能暂时关闭"
            >
              <Activity className="h-4 w-4 mr-2" />
              热力图（已关闭）
            </Button>
            <Button
              onClick={() => setShowServicePoints((s) => !s)}
              variant={showServicePoints ? "default" : "outline"}
              className={showServicePoints ? "bg-blue-500 hover:bg-blue-600 text-white border-blue-500" : "border-blue-500/50 text-blue-400 hover:bg-blue-500/10"}
            >
              <MapPin className="h-4 w-4 mr-2" />
              服务网点
            </Button>
            <Button
              onClick={() => {
                if (mapInstanceRef.current && mapLoaded) updateMarkers()
              }}
              variant="outline"
              className="border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10"
              title="手动刷新标记"
            >
              🔧 刷新标记
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative w-full h-[300px] md:h-[600px] rounded-lg overflow-hidden border border-blue-800/30" style={{ minHeight: "300px" }}>
          {/* 地图容器：不放入任何 React 子节点，仅由高德注入 DOM，避免 removeChild 冲突 */}
          <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" style={{ width: "100%", minHeight: "300px" }} />
          {!mapLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 z-30">
              <div className="text-center">
                <div className="inline-block h-8 w-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mb-3" />
                <p className="text-slate-400 text-sm">加载地图中...</p>
                <p className="text-slate-500 text-xs mt-2">若长时间未加载，请刷新页面</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
})
