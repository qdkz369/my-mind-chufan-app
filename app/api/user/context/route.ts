// 获取用户上下文信息 API
// 用于前端获取当前用户的基本信息和权限

import { NextResponse, NextRequest } from "next/server"
import { getUserContext } from "@/lib/auth/user-context"

export async function GET(request: NextRequest) {
  try {
    const userContext = await getUserContext(request)
    
    if (!userContext) {
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