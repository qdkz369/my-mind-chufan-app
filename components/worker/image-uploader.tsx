"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Camera, X, Loader2, CheckCircle2, AlertCircle, Image as ImageIcon } from "lucide-react"

interface ImageUploaderProps {
  onUploadSuccess: (imageUrl: string) => void
  onRemove: () => void
  currentImageUrl?: string | null
  label?: string
}

export function ImageUploader({
  onUploadSuccess,
  onRemove,
  currentImageUrl,
  label = "上传图片",
}: ImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState("")
  const [preview, setPreview] = useState<string | null>(currentImageUrl || null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 验证文件类型
    if (!file.type.startsWith("image/")) {
      setError("只支持图片文件")
      return
    }

    // 验证文件大小（最大5MB）
    if (file.size > 5 * 1024 * 1024) {
      setError("图片大小不能超过5MB")
      return
    }

    setError("")
    setIsUploading(true)

    // 创建预览
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreview(reader.result as string)
    }
    reader.readAsDataURL(file)

    try {
      // 上传到服务器
      const formData = new FormData()
      formData.append("file", file)
      formData.append("folder", "proofs") // 文件夹路径（在桶内的子文件夹）

      const response = await fetch("/api/storage/upload", {
        method: "POST",
        body: formData,
      })

      const result = await response.json()

      if (!response.ok || result.error) {
        throw new Error(result.error || "上传失败")
      }

      // 上传成功
      console.log("[图片上传] 上传成功，URL:", result.data.url)
      onUploadSuccess(result.data.url)
    } catch (err: any) {
      console.error("上传失败:", err)
      setError(err.message || "上传失败")
      setPreview(null)
      
      // 测试模式：如果上传失败，使用预览图片作为临时URL（仅用于测试）
      if (process.env.NODE_ENV === "development") {
        console.warn("[测试模式] 上传失败，使用预览图片作为临时URL")
        // 注意：这只是一个测试用的fallback，实际生产环境不应该这样做
        // onUploadSuccess(reader.result as string) // 取消注释以启用测试模式
      }
    } finally {
      setIsUploading(false)
    }
  }

  const handleRemove = () => {
    setPreview(null)
    setError("")
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
    onRemove()
  }

  const handleCameraClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="space-y-2">
      <label className="text-slate-300 text-sm font-medium">{label}</label>

      {preview ? (
        <Card className="bg-slate-800/50 border-slate-700 p-4">
          <div className="relative">
            <img
              src={preview}
              alt="预览"
              className="w-full h-48 object-cover rounded-lg"
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRemove}
              className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs text-green-400">
            <CheckCircle2 className="h-3 w-3" />
            <span>图片已上传</span>
          </div>
        </Card>
      ) : (
        <Card className="bg-slate-800/50 border-slate-700 p-6 border-2 border-dashed">
          <div className="text-center">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              capture="environment" // 优先使用后置摄像头
            />

            {isUploading ? (
              <div className="space-y-2">
                <Loader2 className="h-8 w-8 animate-spin text-blue-400 mx-auto" />
                <p className="text-sm text-slate-400">上传中...</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500/20 to-cyan-600/20 rounded-xl flex items-center justify-center mx-auto">
                  <ImageIcon className="h-8 w-8 text-blue-400" />
                </div>
                <div>
                  <Button
                    onClick={handleCameraClick}
                    variant="outline"
                    className="border-blue-500/50 text-blue-400 hover:bg-blue-500/10"
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    拍照或选择图片
                  </Button>
                </div>
                <p className="text-xs text-slate-500">支持 JPG、PNG 格式，最大 5MB</p>
              </div>
            )}
          </div>
        </Card>
      )}

      {error && (
        <div className="p-2 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-red-400" />
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}
    </div>
  )
}

