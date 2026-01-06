import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// 后备值（与 lib/supabase.ts 保持一致）
const FALLBACK_SUPABASE_URL = "https://gjlhcpfvjgqabqanvgmu.supabase.co"
const FALLBACK_SUPABASE_ANON_KEY = "sb_publishable_OQSB-t8qr1xO0WRcpVSIZA_O4RFkAHQ"

/**
 * GET: 获取设备分类列表
 */
export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || FALLBACK_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || FALLBACK_SUPABASE_ANON_KEY
    
    // 优先使用 service role key，如果没有则使用 anon key（需要 RLS 策略允许）
    const keyToUse = serviceRoleKey || anonKey
    const useServiceRole = !!serviceRoleKey
    
    if (!keyToUse) {
      console.error("[设备分类API] 未找到有效的 Supabase 密钥")
      return NextResponse.json(
        { 
          success: true, 
          data: [],
          warning: "未配置 Supabase 密钥，返回空列表"
        },
        { status: 200 }
      )
    }

    const supabaseClient = createClient(supabaseUrl, keyToUse, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })

    const { data: categories, error } = await supabaseClient
      .from("equipment_categories")
      .select("*")
      .order("sort_order", { ascending: true })

    if (error) {
      // 如果是表不存在的错误，返回空数组而不是错误
      if (error.code === "PGRST116" || error.message?.includes("does not exist")) {
        console.warn("[设备分类API] 表不存在，返回空列表:", error.message)
        return NextResponse.json({
          success: true,
          data: [],
          warning: "设备分类表不存在，请先运行数据库迁移脚本"
        })
      }
      
      console.error("[设备分类API] 查询失败:", error)
      // 即使查询失败，也返回空数组，避免前端崩溃
      return NextResponse.json({
        success: true,
        data: [],
        error: error.message
      })
    }

    return NextResponse.json({
      success: true,
      data: categories || [],
    })
  } catch (err: any) {
    console.error("[设备分类API] 错误:", err)
    // 捕获所有错误，返回空数组而不是错误，确保前端不会崩溃
    return NextResponse.json({
      success: true,
      data: [],
      error: err.message
    })
  }
}

