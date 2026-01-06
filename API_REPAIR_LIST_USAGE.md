# `/api/repair/list` 接口使用说明

## 接口地址
```
GET /api/repair/list
```

## 请求参数（Query Parameters）
- `status` (可选): 状态筛选，如 `pending`, `processing`, `completed`, `cancelled`
- `restaurant_id` (可选): 餐厅ID筛选

## 请求头（可选）
- `x-worker-id`: 工人ID，用于筛选分配给该工人的工单

## 响应格式
```json
{
  "success": true,
  "data": [
    {
      "id": "订单ID",
      "restaurant_id": "餐厅ID",
      "service_type": "服务类型",
      "status": "pending",
      "description": "描述（可能为空）",
      "amount": 100,
      "contact_phone": "联系电话",
      "created_at": "创建时间",
      "updated_at": "更新时间",
      "assigned_to": "分配的工人ID（可能为null）",
      "audio_url": "音频URL（语音工单必需）"
    }
  ],
  "debug": {
    "totalOrders": 500,
    "filteredRepairs": 10,
    "audioOrders": 8
  }
}
```

## 前端调用示例（带调试代码）

```typescript
// 前端调用示例
async function fetchRepairList(status?: string) {
  try {
    const url = `/api/repair/list${status ? `?status=${status}` : ''}`
    const response = await fetch(url, {
      headers: {
        // 如果是工人端，可以添加工人ID
        // 'x-worker-id': workerId
      }
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const result = await response.json()
    
    // 前端强制调试：打印接口返回结果
    console.log("接口返回结果:", result)
    
    if (result.success) {
      const repairs = result.data || []
      
      // 前端强制调试：如果接口返回成功但列表依然是空的，显示alert
      if (repairs.length === 0) {
        alert(`匹配到的维修单数量: ${repairs.length}\n总订单数: ${result.debug?.totalOrders || 0}\n过滤后维修单: ${result.debug?.filteredRepairs || 0}\n语音工单: ${result.debug?.audioOrders || 0}`)
      } else {
        // 如果有数据，也显示调试信息（可选）
        console.log(`匹配到的维修单数量: ${repairs.length}`)
        console.log(`语音工单数量: ${result.debug?.audioOrders || 0}`)
      }
      
      return repairs
    } else {
      throw new Error(result.error || "获取维修列表失败")
    }
  } catch (error) {
    console.error("获取维修列表失败:", error)
    alert(`获取维修列表失败: ${error instanceof Error ? error.message : '未知错误'}`)
    return []
  }
}
```

## 语音工单处理

接口会优先返回有 `audio_url` 的订单（语音报修单）。前端需要：

1. **检查 audio_url 字段**：如果 `audio_url` 不为空，显示音频播放器
2. **处理空白描述**：如果 `description` 为空，显示占位文字："[语音报修单，请播放上方音频]"
3. **渲染音频播放器**：
```tsx
{repair.audio_url && (
  <audio controls src={repair.audio_url} className="w-full h-10 mt-2" />
)}
```

## 注意事项

1. **字段容错**：所有字段都使用了可选链操作符（`?.`），即使某些字段为 `null` 也不会崩溃
2. **权限验证**：目前权限验证已暂时注释，确保数据能正常返回
3. **调试信息**：返回数据中包含 `debug` 字段，方便排查问题
4. **worker_id 字段**：已从查询中移除，统一使用 `assigned_to` 字段

