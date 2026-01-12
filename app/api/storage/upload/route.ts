// ACCESS_LEVEL: COMPANY_LEVEL
// ALLOWED_ROLES: admin, staff
// CURRENT_KEY: Anon Key (supabase)
// TARGET_KEY: Anon Key + RLS
// 说明：admin/staff 调用，必须强制 company_id 过滤，已使用 Anon Key，需完善 RLS

import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

/**
 * POST: 上传图片到Supabase Storage
 */
export async function POST(request: Request) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: "数据库连接失败" },
        { status: 500 }
      )
    }

    const formData = await request.formData()
    const file = formData.get("file") as File
    const companyId = formData.get("company_id") as string | null // 供应商ID（必需）
    const subFolder = formData.get("folder") || "proofs" // 子文件夹
    
    // 多租户隔离：使用 company_id 组织文件夹结构
    // 格式：companies/{company_id}/{sub_folder}/{filename}
    const folder = companyId 
      ? `companies/${companyId}/${subFolder}`
      : subFolder // 如果没有 company_id，使用旧格式（向后兼容）
    
    const BUCKET_NAME = "delivery-proofs" // Storage bucket 名称（固定）
    
    // 如果提供了 company_id，验证其有效性
    if (companyId) {
      // TODO: 验证 company_id 是否存在且有效
      // const { data: company } = await supabase
      //   .from("companies")
      //   .select("id")
      //   .eq("id", companyId)
      //   .single()
      // if (!company) {
      //   return NextResponse.json(
      //     { error: "无效的 company_id" },
      //     { status: 400 }
      //   )
      // }
    }

    if (!file) {
      return NextResponse.json(
        { error: "缺少文件" },
        { status: 400 }
      )
    }

    // 验证文件类型（支持图片和音频）
    const isImage = file.type.startsWith("image/")
    const isAudio = file.type.startsWith("audio/")
    
    if (!isImage && !isAudio) {
      return NextResponse.json(
        { error: "只支持图片或音频文件" },
        { status: 400 }
      )
    }

    // 生成唯一文件名
    const timestamp = Date.now()
    const randomStr = Math.random().toString(36).substring(2, 15)
    const fileExt = file.name.split(".").pop()
    const fileName = `${timestamp}_${randomStr}.${fileExt}`

    // 转换为ArrayBuffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)

    // 检查 bucket 是否存在
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()
    
    if (!bucketsError && buckets) {
      const bucketExists = buckets.some((b) => b.name === BUCKET_NAME)
      if (!bucketExists) {
        console.warn(`[存储上传API] Bucket '${BUCKET_NAME}' 不存在`)
        console.log(`[存储上传API] 可用的 buckets:`, buckets.map(b => b.name).join(", "))
        // 注意：创建 bucket 需要 Service Role Key，这里只记录警告
      }
    } else if (bucketsError) {
      console.error("[存储上传API] 检查 buckets 失败:", bucketsError)
    }

    // 上传到Supabase Storage
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME) // 使用固定的桶名称
      .upload(`${folder}/${fileName}`, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (error) {
      console.error("[存储上传API] 上传失败:", {
        error: error,
        message: error.message,
        statusCode: error.statusCode,
        bucket: BUCKET_NAME,
        folder: folder,
        fileType: file.type,
        fileName: fileName,
      })
      
      // 如果是 bucket 不存在的错误，提供更友好的提示
      if (
        error.message?.includes("Bucket not found") || 
        error.message?.includes("不存在") ||
        error.message?.includes("not found") ||
        error.statusCode === 404
      ) {
        const availableBuckets = buckets?.map(b => b.name).join(", ") || "无"
        return NextResponse.json(
          {
            error: "Storage Bucket 不存在",
            details: `请在 Supabase Dashboard 中创建名为 '${BUCKET_NAME}' 的 Storage Bucket。当前可用的 buckets: ${availableBuckets}`,
            hint: `需要创建名为 '${BUCKET_NAME}' 的 Storage Bucket，并确保其权限设置为公开（public）`,
          },
          { status: 500 }
        )
      }
      
      return NextResponse.json(
        {
          error: "上传失败",
          details: error.message || "未知错误",
          statusCode: error.statusCode,
        },
        { status: 500 }
      )
    }

    // 获取公开URL
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME) // 使用固定的桶名称
      .getPublicUrl(data.path)

    return NextResponse.json({
      success: true,
      data: {
        url: urlData.publicUrl,
        path: data.path,
        fileName: fileName,
      },
    })
  } catch (error) {
    console.error("[图片上传API] 处理请求时出错:", error)
    return NextResponse.json(
      {
        error: "服务器内部错误",
        details: error instanceof Error ? error.message : "未知错误",
      },
      { status: 500 }
    )
  }
}

