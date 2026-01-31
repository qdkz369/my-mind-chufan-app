"use client"

// API 配置模块：自管数据（localStorage），从 page.tsx 迁出
// 迁出 apiConfigs/newApiConfig/isAddingApi、load from localStorage、handleAddApi

import { useState, useEffect } from "react"
import { logBusinessWarning } from "@/lib/utils/logger"
import { ApiConfigPanel } from "./api-config"
import type { ApiConfig } from "../types/dashboard-types"

const defaultNewApiConfig: ApiConfig = {
  name: "",
  endpoint: "",
  method: "POST",
  description: "",
  is_active: true,
}

export function ApiConfigWithData() {
  const [apiConfigs, setApiConfigs] = useState<ApiConfig[]>([])
  const [newApiConfig, setNewApiConfig] = useState<ApiConfig>(defaultNewApiConfig)
  const [isAddingApi, setIsAddingApi] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    const saved = localStorage.getItem("apiConfigs")
    if (saved) {
      try {
        setApiConfigs(JSON.parse(saved))
      } catch (e) {
        logBusinessWarning("API配置", "加载API配置失败", e)
      }
    }
  }, [])

  const handleAddApi = async () => {
    if (!newApiConfig.name || !newApiConfig.endpoint) {
      alert("请填写API名称和端点")
      return
    }
    setIsAddingApi(true)
    try {
      const configs = [...apiConfigs, { ...newApiConfig, id: Date.now().toString() }]
      setApiConfigs(configs)
      if (typeof window !== "undefined") {
        localStorage.setItem("apiConfigs", JSON.stringify(configs))
      }
      setNewApiConfig(defaultNewApiConfig)
      alert("API配置已添加")
    } catch (error) {
      logBusinessWarning("API配置", "添加API配置失败", error)
      alert("添加失败")
    } finally {
      setIsAddingApi(false)
    }
  }

  return (
    <ApiConfigPanel
      apiConfigs={apiConfigs}
      newApiConfig={newApiConfig}
      onNewApiConfigChange={setNewApiConfig}
      onAddApi={handleAddApi}
      isAddingApi={isAddingApi}
    />
  )
}
