/**
 * 创建设备租赁记录 API
 *
 * POST /api/device-rentals/create
 *
 * 功能：
 * - 支持多台多型号一次创建（body.devices 数组）
 * - 支持 device_id（已有设备）或 equipment_catalog_id（从产品库选型，自动创建设备）
 * - 设备选择与上传设备(equipment_catalog)数据通，客户可客户端选型无租金租赁，后台可定制录入
 * - 每条记录含设备单价、合计资产总价（事实记录，可支持免租金策略）
 * - 创建后状态为 pending_confirmation，推送至客户端待客户确认形成租赁事实关系
 * - 已被绑定客户（已有活跃/待确认租赁）的设备不可选
 */

import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

type DeviceItem =
  | { device_id: string; unit_price?: number }
  | { equipment_catalog_id: string; unit_price?: number }

function isCatalogItem(d: DeviceItem): d is { equipment_catalog_id: string; unit_price?: number } {
  return "equipment_catalog_id" in d && !!d.equipment_catalog_id
}

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!supabaseUrl || (!serviceRoleKey && !anonKey)) {
      return NextResponse.json(
        { error: "数据库配置错误" },
        { status: 500 }
      )
    }
    const supabase = createClient(
      supabaseUrl,
      serviceRoleKey || anonKey!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    )

    const body = await request.json()
    const { restaurant_id, start_at, devices: devicesBody, device_id, unit_price: singleUnitPrice } = body

    const devices: DeviceItem[] = Array.isArray(devicesBody) && devicesBody.length > 0
      ? devicesBody.map((d: any) => {
          if (d.equipment_catalog_id) {
            return {
              equipment_catalog_id: String(d.equipment_catalog_id),
              unit_price: typeof d.unit_price === "number" ? d.unit_price : 0,
            }
          }
          return {
            device_id: String(d.device_id),
            unit_price: typeof d.unit_price === "number" ? d.unit_price : 0,
          }
        })
      : device_id
        ? [{ device_id: String(device_id), unit_price: typeof singleUnitPrice === "number" ? singleUnitPrice : 0 }]
        : []

    if (!restaurant_id || !start_at || devices.length === 0) {
      return NextResponse.json(
        { error: "缺少必需字段：restaurant_id, start_at，且需至少一条设备（device_id/equipment_catalog_id 或 devices 数组）" },
        { status: 400 }
      )
    }

    const { data: restaurant, error: restaurantError } = await supabase
      .from("restaurants")
      .select("id, company_id, address")
      .eq("id", restaurant_id)
      .single()

    if (restaurantError || !restaurant) {
      return NextResponse.json(
        { error: "餐厅不存在" },
        { status: 404 }
      )
    }

    const restaurantRow = restaurant as { id: string; company_id?: string | null; address?: string | null }
    const now = new Date().toISOString()
    const finalDeviceIds: string[] = []
    const unitPrices: number[] = []

    for (const d of devices) {
      if (isCatalogItem(d)) {
        const { data: catalog, error: catalogError } = await supabase
          .from("equipment_catalog")
          .select("id, name, model, brand")
          .eq("id", d.equipment_catalog_id)
          .eq("is_approved", true)
          .in("status", ["active", "approved"])
          .maybeSingle()

        if (catalogError || !catalog) {
          return NextResponse.json(
            { error: `产品库设备不存在或未审核通过：${d.equipment_catalog_id}` },
            { status: 404 }
          )
        }

        const newDeviceId = "EQ-" + crypto.randomUUID()
        const model = (catalog as { model?: string; name?: string }).model || (catalog as { name?: string }).name || "设备"
        const address = (restaurantRow.address as string) || ""

        const insertPayload: Record<string, unknown> = {
          device_id: newDeviceId,
          model,
          install_date: now,
          address,
          status: "offline",
          restaurant_id: restaurant_id,
          equipment_catalog_id: d.equipment_catalog_id,
        }
        const { error: insertDeviceErr } = await supabase.from("devices").insert(insertPayload as any)

        if (insertDeviceErr) {
          console.error("[设备租赁API] 从产品库创建设备失败:", insertDeviceErr)
          return NextResponse.json(
            { error: "从产品库创建设备失败", details: insertDeviceErr.message },
            { status: 500 }
          )
        }
        finalDeviceIds.push(newDeviceId)
        unitPrices.push(d.unit_price ?? 0)
      } else {
        const did = (d as { device_id: string }).device_id
        finalDeviceIds.push(did)
        unitPrices.push(d.unit_price ?? 0)
      }
    }

    const existingDeviceIds = finalDeviceIds.filter((id) => !id.startsWith("EQ-"))
    if (existingDeviceIds.length > 0) {
      const { data: existingDevices, error: devicesError } = await supabase
        .from("devices")
        .select("device_id")
        .in("device_id", existingDeviceIds)

      if (devicesError || (existingDevices?.length ?? 0) !== existingDeviceIds.length) {
        return NextResponse.json(
          { error: "部分设备不存在或重复，请检查 device_id" },
          { status: 404 }
        )
      }

      const { data: boundRentals, error: checkError } = await supabase
        .from("device_rentals")
        .select("device_id")
        .in("device_id", existingDeviceIds)
        .in("status", ["active", "pending_confirmation"])
        .is("end_at", null)

      if (checkError) {
        console.error("[设备租赁API] 检查已绑定设备失败:", checkError)
        return NextResponse.json(
          { error: "检查设备租赁状态失败" },
          { status: 500 }
        )
      }

      const boundSet = new Set((boundRentals || []).map((r: { device_id: string }) => r.device_id))
      const boundList = existingDeviceIds.filter((id) => boundSet.has(id))
      if (boundList.length > 0) {
        return NextResponse.json(
          { error: `以下设备已被绑定客户，不可选：${boundList.join("、")}` },
          { status: 400 }
        )
      }
    }

    const totalAssetValue = unitPrices.reduce((sum, p) => sum + p, 0)
    const rentalBatchId = crypto.randomUUID()

    const rows = finalDeviceIds.map((device_id, idx) => ({
      device_id,
      restaurant_id,
      company_id: restaurantRow.company_id ?? null,
      start_at,
      end_at: null,
      status: "pending_confirmation",
      unit_price: unitPrices[idx] ?? 0,
      total_asset_value: totalAssetValue,
      rental_batch_id: rentalBatchId,
      customer_confirmed_at: null,
    }))

    const { data: created, error: createError } = await supabase
      .from("device_rentals")
      .insert(rows)
      .select("*")

    if (createError) {
      console.error("[设备租赁API] 创建失败:", createError)
      return NextResponse.json(
        { error: "创建租赁记录失败", details: createError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: created || [],
      message: "设备租赁记录已创建，已推送至客户端对应客户的租赁信息栏，待客户确认后形成租赁事实关系。",
    })
  } catch (err: any) {
    console.error("[设备租赁API] 错误:", err)
    return NextResponse.json(
      { error: "服务器错误", details: err.message },
      { status: 500 }
    )
  }
}
