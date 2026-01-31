// 获取用户上下文信息 API
// 用于前端获取当前用户的基本信息和权限
//
// 鉴权方式：getUserContext 优先解析 Authorization: Bearer <access_token>，
// 其次为 Cookie。Vercel 环境下 Cookie 可能因跨域失效，前端应使用 fetchWithAuth
// 从 supabase.auth.getSession() 获取 access_token 并放入 Bearer 头。

import { NextResponse, NextRequest } from "next/server"
import { getUserContext } from "@/lib/auth/user-context"

export async function GET(request: NextRequest) {
  try {
    // 尝试获取 Supabase Auth 用户上下文
    let userContext = await getUserContext(request)
    
    // 如果 Supabase Auth 失败，尝试客户端用户认证（通过 x-restaurant-id 请求头）
    if (!userContext) {
      const clientRestaurantId = request.headers.get("x-restaurant-id")
      if (clientRestaurantId && clientRestaurantId.trim() !== "") {
        console.log("[用户上下文API] 使用客户端用户认证，restaurant_id:", clientRestaurantId)
        
        // 查询餐厅信息获取 company_id
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

        if (supabaseUrl && (serviceRoleKey || anonKey)) {
          const { createClient } = await import("@supabase/supabase-js")
          const supabaseClient = createClient(
            supabaseUrl,
            serviceRoleKey || anonKey!,
            {
              auth: {
                persistSession: false,
                autoRefreshToken: false,
              },
            }
          )

          const { data: restaurantData } = await supabaseClient
            .from("restaurants")
            .select("id, company_id")
            .eq("id", clientRestaurantId)
            .maybeSingle()

          if (restaurantData) {
            return NextResponse.json({
              success: true,
              data: {
                userId: clientRestaurantId, // 使用 restaurant_id 作为 userId
                role: "client", // 客户端用户角色
                companyId: restaurantData.company_id || undefined,
                restaurantId: clientRestaurantId,
              },
            })
          }
        }
      }
      
      return NextResponse.json(
        {
          success: false,
          error: "未授权",
          details: "用户未登录或会话已过期",
        },
        { status: 401 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        userId: userContext.userId,
        role: userContext.role,
        companyId: userContext.companyId,
      },
    })
  } catch (error: any) {
    console.error("[用户上下文API] 获取失败:", error)
    
    return NextResponse.json(
      {
        success: false,
        error: "获取用户信息失败",
        details: error.message || "未知错误",
      },
      { status: 500 }
    )
  }
}