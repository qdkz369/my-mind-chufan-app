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
    const folder = formData.get("folder") || "proofs" // 默认文件夹（在桶内的子文件夹）
    const BUCKET_NAME = "delivery-proofs" // Storage bucket 名称（固定）

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

    // 检查 bucket 是否存在，如果不存在则尝试创建（需要管理员权限）
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()
    
    if (!bucketsError && buckets) {
      const bucketExists = buckets.some((b) => b.name === BUCKET_NAME)
      if (!bucketExists) {
        console.warn(`[图片上传API] Bucket '${BUCKET_NAME}' 不存在，请手动创建`)
        // 注意：创建 bucket 需要 Service Role Key，这里只记录警告
      }
    }

    // 上传到Supabase Storage
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME) // 使用固定的桶名称
      .upload(`${folder}/${fileName}`, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (error) {
      console.error("[图片上传API] 上传失败:", error)
      
      // 如果是 bucket 不存在的错误，提供更友好的提示
      if (error.message?.includes("Bucket not found") || error.message?.includes("不存在")) {
        return NextResponse.json(
          {
            error: "Storage Bucket 不存在",
            details: `请在 Supabase Dashboard 中创建 '${BUCKET_NAME}' bucket。详细步骤请查看 docs/storage-setup.md`,
            hint: `需要创建名为 '${BUCKET_NAME}' 的 Storage Bucket`,
          },
          { status: 500 }
        )
      }
      
      return NextResponse.json(
        {
          error: "上传失败",
          details: error.message,
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

