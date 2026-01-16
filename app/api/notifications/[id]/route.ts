/**
 * 通知管理 API - 单个通知操作
 * 
 * PUT /api/notifications/[id] - 更新通知（标记已读等）
 * DELETE /api/notifications/[id] - 删除通知
 */

import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    const keyToUse = serviceRoleKey || anonKey
    
    if (!supabaseUrl || !keyToUse) {
      return NextResponse.json(
        { error: "数据库配置错误" },
        { status: 500 }
      )
    }

    const supabaseClient = createClient(supabaseUrl, keyToUse, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })

    const { id } = await params
    const body = await request.json()
    const { is_read } = body

    // 更新通知
    const updateData: any = {}
    if (is_read !== undefined) {
      updateData.is_read = is_read
      if (is_read) {
        updateData.read_at = new Date().toISOString()
      } else {
        updateData.read_at = null
      }
    }

    const { data, error } = await supabaseClient
      .from("notifications")
      .update(updateData)
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("[通知API] 更新失败:", error)
      return NextResponse.json(
        { error: "更新通知失败", details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data,
    })
  } catch (error: any) {
    console.error("[通知API] 错误:", error)
    return NextResponse.json(
      { error: "服务器错误", details: error.message },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    const keyToUse = serviceRoleKey || anonKey
    
    if (!supabaseUrl || !keyToUse) {
      return NextResponse.json(
        { error: "数据库配置错误" },
        { status: 500 }
      )
    }

    const supabaseClient = createClient(supabaseUrl, keyToUse, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })

    const { id } = await params

    const { error } = await supabaseClient
      .from("notifications")
      .delete()
      .eq("id", id)

    if (error) {
      console.error("[通知API] 删除失败:", error)
      return NextResponse.json(
        { error: "删除通知失败", details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "通知已删除",
    })
  } catch (error: any) {
    console.error("[通知API] 错误:", error)
    return NextResponse.json(
      { error: "服务器错误", details: error.message },
      { status: 500 }
    )
  }
}
