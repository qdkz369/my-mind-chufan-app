"use client"

// API 配置组件
// 从 page.tsx 的 renderApiConfig() 函数提取

import { Plus, Edit, Trash2, Server, Link as LinkIcon } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ApiConfig } from "../types/dashboard-types"

interface ApiConfigProps {
  apiConfigs: ApiConfig[]
  newApiConfig: ApiConfig
  onNewApiConfigChange: (config: ApiConfig) => void
  onAddApi: () => void
  isAddingApi: boolean
}

export function ApiConfigPanel({
  apiConfigs,
  newApiConfig,
  onNewApiConfigChange,
  onAddApi,
  isAddingApi,
}: ApiConfigProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">API接口配置</h1>
        <p className="text-slate-400">配置物联网数据传输API接口</p>
      </div>

      {/* 添加API配置 */}
      <Card semanticLevel="secondary_fact" className="bg-gradient-to-br from-slate-900/90 to-blue-950/90 border-blue-800/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-white">添加API接口</CardTitle>
          <CardDescription className="text-slate-400">配置新的API端点用于数据传输</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-slate-300 mb-2 block">API名称</Label>
              <Input
                value={newApiConfig.name}
                onChange={(e) => onNewApiConfigChange({ ...newApiConfig, name: e.target.value })}
                placeholder="例如: 燃料传感器API"
                className="bg-slate-800/50 border-slate-700 text-white"
              />
            </div>
            <div>
              <Label className="text-slate-300 mb-2 block">请求方法</Label>
              <Select
                value={newApiConfig.method}
                onValueChange={(value) => onNewApiConfigChange({ ...newApiConfig, method: value })}
              >
                <SelectTrigger className="bg-slate-800/50 border-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="POST">POST</SelectItem>
                  <SelectItem value="GET">GET</SelectItem>
                  <SelectItem value="PUT">PUT</SelectItem>
                  <SelectItem value="DELETE">DELETE</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-slate-300 mb-2 block">API端点URL</Label>
            <Input
              value={newApiConfig.endpoint}
              onChange={(e) => onNewApiConfigChange({ ...newApiConfig, endpoint: e.target.value })}
              placeholder="https://api.example.com/fuel-sensor"
              className="bg-slate-800/50 border-slate-700 text-white"
            />
          </div>
          <div>
            <Label className="text-slate-300 mb-2 block">描述</Label>
            <Textarea
              value={newApiConfig.description}
              onChange={(e) => onNewApiConfigChange({ ...newApiConfig, description: e.target.value })}
              placeholder="API接口的用途和说明"
              className="bg-slate-800/50 border-slate-700 text-white"
              rows={3}
            />
          </div>
          <Button
            onClick={onAddApi}
            disabled={isAddingApi}
            className="bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700"
          >
            {isAddingApi ? (
              <>
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                添加中...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                添加API接口
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* API配置列表 */}
      <Card semanticLevel="secondary_fact" className="bg-gradient-to-br from-slate-900/90 to-blue-950/90 border-blue-800/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-white">已配置的API接口</CardTitle>
          <CardDescription className="text-slate-400">管理所有API接口配置</CardDescription>
        </CardHeader>
        <CardContent>
          {apiConfigs.length === 0 ? (
            <div className="text-center py-8">
              <Server className="h-8 w-8 text-slate-600 mx-auto mb-2" />
              <p className="text-slate-400 text-sm">暂无API配置</p>
            </div>
          ) : (
            <div className="space-y-3">
              {apiConfigs.map((config) => (
                <div
                  key={config.id}
                  className="p-4 rounded-xl border-2 border-slate-700/50 bg-slate-800/50"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <LinkIcon className="h-4 w-4 text-blue-400" />
                        <span className="font-semibold text-white">{config.name}</span>
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            config.is_active
                              ? "border-green-500/30 text-green-400 bg-green-500/10"
                              : "border-slate-600 text-slate-400"
                          }`}
                        >
                          {config.is_active ? "启用" : "禁用"}
                        </Badge>
                      </div>
                      <div className="text-sm text-slate-400 ml-6">
                        <span className="font-mono">{config.method}</span> {config.endpoint}
                      </div>
                      {config.description && (
                        <div className="text-xs text-slate-500 ml-6 mt-1">{config.description}</div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="border-blue-500/50 text-blue-400 hover:bg-blue-500/10">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" className="border-red-500/50 text-red-400 hover:bg-red-500/10">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
