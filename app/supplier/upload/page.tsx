"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Upload, X, Image as ImageIcon, CheckCircle2, AlertCircle, Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { logBusinessWarning } from "@/lib/utils/logger"

interface Category {
  id: string
  name: string
}

export default function SupplierUploadPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [uploadedImages, setUploadedImages] = useState<string[]>([])
  const [isUploadingImages, setIsUploadingImages] = useState(false)

  const [formData, setFormData] = useState({
    name: "",
    brand: "",
    model: "",
    description: "",
    category_id: "",
    monthly_rental_price: "",
    daily_rental_price: "",
    deposit_amount: "0",
    min_rental_period: "1",
    max_rental_period: "",
    maintenance_included: true,
    delivery_included: false,
    notes: "",
  })

  // 加载分类列表
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await fetch("/api/equipment/categories")
        const result = await response.json()
        if (result.success && result.data) {
          setCategories(result.data)
        }
      } catch (error) {
        logBusinessWarning('供应商上传', '加载分类失败', error)
      }
    }
    loadCategories()
  }, [])

  // 获取当前用户的 company_id
  useEffect(() => {
    const loadCompanyId = async () => {
      try {
        if (!supabase) return

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          alert("请先登录")
          return
        }

        // 从 user_companies 表查询
        const { data, error } = await supabase
          .from("user_companies")
          .select("company_id")
          .eq("user_id", user.id)
          .eq("is_primary", true)
          .single()

        if (!error && data) {
          setCompanyId(data.company_id)
        } else {
          // 如果没有主公司，获取第一个公司
          const { data: firstCompany } = await supabase
            .from("user_companies")
            .select("company_id")
            .eq("user_id", user.id)
            .limit(1)
            .single()

          if (firstCompany) {
            setCompanyId(firstCompany.company_id)
          } else {
            alert("您还没有关联公司，请联系管理员")
          }
        }
      } catch (error) {
        logBusinessWarning('供应商上传', '获取公司ID失败', error)
      }
    }

    loadCompanyId()
  }, [])

  // 上传图片
  const handleImageUpload = async (files: FileList) => {
    if (!companyId) {
      alert("请先关联公司")
      return
    }

    setIsUploadingImages(true)
    const newImages: string[] = []

    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) {
          alert(`${file.name} 不是图片文件`)
          continue
        }

        const formData = new FormData()
        formData.append("file", file)
        formData.append("folder", "products")
        formData.append("company_id", companyId)

        const response = await fetch("/api/storage/upload", {
          method: "POST",
          body: formData,
        })

        const result = await response.json()
        if (result.success && result.data?.url) {
          newImages.push(result.data.url)
        } else {
          alert(`上传 ${file.name} 失败: ${result.error}`)
        }
      }

      setUploadedImages([...uploadedImages, ...newImages])
    } catch (error) {
      logBusinessWarning('供应商上传', '图片上传失败', error)
      alert("图片上传失败")
    } finally {
      setIsUploadingImages(false)
    }
  }

  // 删除图片
  const handleRemoveImage = (index: number) => {
    setUploadedImages(uploadedImages.filter((_, i) => i !== index))
  }

  // 提交表单
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!companyId) {
      alert("请先关联公司")
      return
    }

    if (!formData.name || !formData.monthly_rental_price) {
      alert("请填写设备名称和月租金")
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch("/api/equipment/catalog/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider_id: companyId,
          name: formData.name,
          brand: formData.brand || null,
          model: formData.model || null,
          description: formData.description || null,
          category_id: formData.category_id || null,
          monthly_rental_price: parseFloat(formData.monthly_rental_price),
          daily_rental_price: formData.daily_rental_price ? parseFloat(formData.daily_rental_price) : null,
          deposit_amount: parseFloat(formData.deposit_amount) || 0,
          min_rental_period: parseInt(formData.min_rental_period) || 1,
          max_rental_period: formData.max_rental_period ? parseInt(formData.max_rental_period) : null,
          maintenance_included: formData.maintenance_included,
          delivery_included: formData.delivery_included,
          images: uploadedImages,
          notes: formData.notes || null,
        }),
      })

      const result = await response.json()

      if (result.success) {
        alert("产品已提交，等待审核！")
        // 重置表单
        setFormData({
          name: "",
          brand: "",
          model: "",
          description: "",
          category_id: "",
          monthly_rental_price: "",
          daily_rental_price: "",
          deposit_amount: "0",
          min_rental_period: "1",
          max_rental_period: "",
          maintenance_included: true,
          delivery_included: false,
          notes: "",
        })
        setUploadedImages([])
      } else {
        alert(`提交失败: ${result.error}`)
      }
    } catch (error: any) {
      logBusinessWarning('供应商上传', '提交失败', error)
      alert(`提交失败: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm p-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-white mb-2">上传设备产品</h1>
            <p className="text-slate-400">填写设备信息，提交后等待管理员审核</p>
          </div>

          {!companyId && (
            <div className="mb-6 p-4 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
              <div className="flex items-center gap-2 text-yellow-400">
                <AlertCircle className="h-5 w-5" />
                <span>您还没有关联公司，请联系管理员</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 基本信息 */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-white border-b border-slate-700 pb-2">
                基本信息
              </h2>

              <div>
                <Label className="text-slate-300 mb-2 block">设备名称 *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="例如：商用双门冰箱"
                  className="bg-slate-700 border-slate-600 text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-300 mb-2 block">品牌</Label>
                  <Input
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    placeholder="例如：美的"
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
                <div>
                  <Label className="text-slate-300 mb-2 block">型号</Label>
                  <Input
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    placeholder="例如：BCD-215TMPQ"
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
              </div>

              <div>
                <Label className="text-slate-300 mb-2 block">分类</Label>
                <Select
                  value={formData.category_id}
                  onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                >
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue placeholder="选择分类（可选）" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-slate-300 mb-2 block">描述</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="详细描述设备的功能、特点等"
                  className="bg-slate-700 border-slate-600 text-white min-h-[100px]"
                />
              </div>
            </div>

            {/* 价格信息 */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-white border-b border-slate-700 pb-2">
                价格信息
              </h2>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-slate-300 mb-2 block">月租金 *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.monthly_rental_price}
                    onChange={(e) => setFormData({ ...formData, monthly_rental_price: e.target.value })}
                    placeholder="0.00"
                    className="bg-slate-700 border-slate-600 text-white"
                    required
                  />
                </div>
                <div>
                  <Label className="text-slate-300 mb-2 block">日租金</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.daily_rental_price}
                    onChange={(e) => setFormData({ ...formData, daily_rental_price: e.target.value })}
                    placeholder="0.00"
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
                <div>
                  <Label className="text-slate-300 mb-2 block">押金</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.deposit_amount}
                    onChange={(e) => setFormData({ ...formData, deposit_amount: e.target.value })}
                    placeholder="0.00"
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-300 mb-2 block">最短租期（月）</Label>
                  <Input
                    type="number"
                    value={formData.min_rental_period}
                    onChange={(e) => setFormData({ ...formData, min_rental_period: e.target.value })}
                    placeholder="1"
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
                <div>
                  <Label className="text-slate-300 mb-2 block">最长租期（月）</Label>
                  <Input
                    type="number"
                    value={formData.max_rental_period}
                    onChange={(e) => setFormData({ ...formData, max_rental_period: e.target.value })}
                    placeholder="留空表示无限制"
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
              </div>
            </div>

            {/* 服务信息 */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-white border-b border-slate-700 pb-2">
                服务信息
              </h2>

              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.maintenance_included}
                    onChange={(e) => setFormData({ ...formData, maintenance_included: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-600 bg-slate-700 text-blue-600"
                  />
                  <span className="text-slate-300">包含维护服务</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.delivery_included}
                    onChange={(e) => setFormData({ ...formData, delivery_included: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-600 bg-slate-700 text-blue-600"
                  />
                  <span className="text-slate-300">包含配送服务</span>
                </label>
              </div>
            </div>

            {/* 图片上传 */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-white border-b border-slate-700 pb-2">
                产品图片
              </h2>

              <div className="border-2 border-dashed border-slate-600 rounded-lg p-6 text-center">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => e.target.files && handleImageUpload(e.target.files)}
                  className="hidden"
                  id="image-upload"
                  disabled={isUploadingImages || !companyId}
                />
                <label
                  htmlFor="image-upload"
                  className={`cursor-pointer flex flex-col items-center gap-2 ${
                    isUploadingImages || !companyId ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  {isUploadingImages ? (
                    <>
                      <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
                      <span className="text-slate-400">上传中...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="h-8 w-8 text-slate-400" />
                      <span className="text-slate-300">点击上传图片（可多选）</span>
                      <span className="text-sm text-slate-500">支持 JPG、PNG 格式</span>
                    </>
                  )}
                </label>
              </div>

              {uploadedImages.length > 0 && (
                <div className="grid grid-cols-4 gap-4">
                  {uploadedImages.map((url, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={url}
                        alt={`产品图片 ${index + 1}`}
                        className="w-full h-32 object-cover rounded border border-slate-600"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(index)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 备注 */}
            <div>
              <Label className="text-slate-300 mb-2 block">备注</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="其他需要说明的信息"
                className="bg-slate-700 border-slate-600 text-white min-h-[80px]"
              />
            </div>

            {/* 提交按钮 */}
            <div className="flex gap-4">
              <Button
                type="submit"
                disabled={isLoading || !companyId}
                className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    提交中...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    提交审核
                  </>
                )}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  )
}


