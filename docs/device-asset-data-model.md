# 设备/资产数据模型与页面分析

## 目的
- 列出 asset / device 相关的 type 定义
- 列出目前有哪些页面"已经在展示或使用设备"
- 判断是否已有 device_id / asset_id 在事实系统中流动

---

## 1. Asset / Device 相关的 Type 定义

### 1.1 事实系统类型定义

#### `lib/facts/types.ts`

**AssetFact 类型**：
```typescript
/**
 * 资产事实（Asset Fact）
 * 
 * 数据来源：gas_cylinders / devices 表
 * 
 * 说明：
 * - asset_id: 资产唯一标识（对应 gas_cylinders.id 或 devices.device_id）
 * - status: 资产当前状态（active, inactive, maintenance, delivered, returned 等）
 * - last_action: 最后一次操作类型（从 trace_logs 表聚合得出，如果没有溯源记录则为空字符串）
 * - last_action_at: 最后一次操作时间（从 trace_logs 表聚合得出，如果没有溯源记录则使用资产的 updated_at 或 created_at）
 */
export type AssetFact = {
  asset_id: string
  status: string
  last_action: string
  last_action_at: string
}
```

**TraceFact 类型（包含 asset_id）**：
```typescript
/**
 * 溯源事实（Trace Fact）
 * 
 * 数据来源：trace_logs 表
 * 
 * 说明：
 * - asset_id: 资产ID（被操作的资产）
 * - action_type: 操作类型（出厂、充装、配送、回收、安检）
 */
export type TraceFact = {
  id: string
  asset_id: string  // ← 资产ID
  action_type: '出厂' | '充装' | '配送' | '回收' | '安检'
  operator_id: string
  order_id?: string
  created_at: string
}
```

**FactWarning 类型（包含 device_id）**：
```typescript
/**
 * 结构化事实警告
 * 
 * 说明：
 * - device_id: 设备ID（警告的直接归因对象）
 *   来源：从 trace.asset_id 或 asset.asset_id 关联查询 devices 表获取
 */
export type FactWarning = {
  // ... 其他字段
  device_id?: string | null  // ← 设备ID（用于按设备归因统计）
}
```

---

#### `lib/facts/contracts/order.fact.ts`

**AssetFactContract 类型**：
```typescript
/**
 * 资产事实契约
 * 
 * 数据来源：gas_cylinders / devices 表 + trace_logs 表（聚合）
 */
export type AssetFactContract = {
  /**
   * 资产唯一标识
   * 
   * 数据来源：gas_cylinders.id 或 devices.device_id
   * 是否允许为空：否
   */
  asset_id: string

  /**
   * 资产当前状态
   * 
   * 数据来源：gas_cylinders.status 或 devices.status
   * 是否允许为空：否
   */
  status: string

  /**
   * 最后一次操作类型
   * 
   * 数据来源：trace_logs.action_type（最后一次操作）
   * 是否允许为空：是（空字符串表示事实不存在）
   */
  last_action: string

  /**
   * 最后一次操作时间
   * 
   * 数据来源：trace_logs.created_at（最后一次操作时间）
   * 是否允许为空：是
   * 空值含义：资产从未产生任何 trace 行为
   */
  last_action_at: string | null
}
```

**TraceFactContract 类型（包含 asset_id）**：
```typescript
/**
 * 溯源事实契约
 * 
 * 数据来源：trace_logs 表
 */
export type TraceFactContract = {
  id: string
  asset_id: string  // ← 资产ID（被操作的资产）
  action_type: 'ASSET_CREATED' | 'ASSET_FILLED' | 'ASSET_DELIVERED' | 'ASSET_RETURNED' | 'ASSET_INSPECTED'
  operator_id: string
  order_id: string | null
  created_at: string
}
```

---

### 1.2 页面组件类型定义

#### `app/devices/page.tsx`

**设备列表类型**：
```typescript
const [devices, setDevices] = useState<Array<{
  device_id: string
  model: string | null
  address: string | null
  installer: string | null
  install_date: string | null
  status: string | null
  created_at: string | null
}>>([])
```

**数据来源**：`devices` 表
- 查询字段：`device_id, model, address, installer, install_date, status, created_at`
- 过滤条件：`restaurant_id` 和 `status IN ('active', 'online')`

---

#### `components/iot-dashboard.tsx`

**设备状态类型**：
```typescript
const [deviceId, setDeviceId] = useState<string | null>(null)
const [fuelLevel, setFuelLevel] = useState<number | null>(null)
const [isOnline, setIsOnline] = useState(false)
```

**数据来源**：
- `devices` 表：通过 `restaurant_id` 查询 `device_id`
- `/api/fuel-sensor?device_id=${deviceId}`：获取燃料实时数据
- `/api/facts/fuel/${deviceId}/stats`：获取燃料统计数据

---

#### `app/(admin)/dashboard/page.tsx`

**设备监控类型**：
```typescript
// 设备数据结构（从代码推断）
devices: Array<{
  device_id: string
  model: string | null
  status: string  // 'active' | 'offline'
  // ... 其他字段
}>
```

**数据来源**：`devices` 表

---

#### `app/worker/page.tsx`

**设备列表类型**：
```typescript
// 设备数据结构（从代码推断）
devices: Array<{
  device_id: string
  model: string
  address: string
  status: string  // 'online' | 'offline'
  is_locked: boolean
  fuel_percentage: number
  container_type: string  // 'fixed_tank' | '钢瓶'
}>
```

**数据来源**：`devices` 表

---

## 2. 目前有哪些页面"已经在展示或使用设备"

### 2.1 用户端页面

| 页面 | 文件 | 使用方式 | 数据来源 |
|------|------|----------|----------|
| `/devices` | `app/devices/page.tsx` | **设备列表页面**，展示所有已激活设备 | `devices` 表（直接查询） |
| `/user-bound` | `app/user-bound/page.tsx` | **关联资产列表**，通过 `AssetFactCard` 组件展示资产事实 | `/api/facts/restaurant/:restaurant_id/assets` |
| `/user-bound` | `app/user-bound/page.tsx` | **IoT Dashboard**，显示设备燃料数据 | `devices` 表 + `/api/facts/fuel/:device_id/stats` |

**关键代码片段**：
```typescript
// app/user-bound/page.tsx
// 1. 获取关联资产列表
const assetsResponse = await fetch(`/api/facts/restaurant/${savedRestaurantId}/assets`)
// 2. 使用 AssetFactCard 组件展示
{assetsList.map((asset) => (
  <AssetFactCard key={asset.asset_id} asset={asset} />
))}
```

---

### 2.2 管理端页面

| 页面 | 文件 | 使用方式 | 数据来源 |
|------|------|----------|----------|
| `/dashboard` | `app/(admin)/dashboard/page.tsx` | **设备监控**，展示所有设备状态和传感器数据 | `devices` 表（直接查询） |

**关键代码片段**：
```typescript
// app/(admin)/dashboard/page.tsx
const renderDevices = () => {
  return (
    <div>
      {devices.map((device) => (
        <Card key={device.device_id}>
          <CardTitle>{device.device_id}</CardTitle>
          <CardDescription>{device.model || "未知型号"}</CardDescription>
          <Badge>{device.status === "active" ? "在线" : "离线"}</Badge>
        </Card>
      ))}
    </div>
  )
}
```

---

### 2.3 工人端页面

| 页面 | 文件 | 使用方式 | 数据来源 |
|------|------|----------|----------|
| `/worker` | `app/worker/page.tsx` | **配送表单**，显示可用设备列表供选择 | `devices` 表（直接查询） |

**关键代码片段**：
```typescript
// app/worker/page.tsx
{devices.map((device) => (
  <Card>
    <h4>{device.model}</h4>
    <Badge>{device.status === "online" ? "在线" : "离线"}</Badge>
    <span>燃料: {device.fuel_percentage.toFixed(1)}%</span>
  </Card>
))}
```

---

### 2.4 组件

| 组件 | 文件 | 使用方式 | 数据来源 |
|------|------|----------|----------|
| `IoTDashboard` | `components/iot-dashboard.tsx` | **IoT 仪表盘**，显示设备燃料实时数据和统计 | `devices` 表 + `/api/facts/fuel/:device_id/stats` |
| `AssetFactCard` | `components/facts/AssetFactCard.tsx` | **资产事实卡片**，展示资产事实信息 | `AssetFactContract` 类型 |

---

## 3. 是否已有 device_id / asset_id 在事实系统中流动

### 3.1 asset_id 在事实系统中的流动

#### ✅ 已存在：asset_id 在事实系统中流动

**证据**：

1. **TraceFactContract 包含 asset_id**：
   ```typescript
   // lib/facts/contracts/order.fact.ts
   export type TraceFactContract = {
     asset_id: string  // ← 资产ID
     // ...
   }
   ```

2. **AssetFactContract 包含 asset_id**：
   ```typescript
   // lib/facts/contracts/order.fact.ts
   export type AssetFactContract = {
     asset_id: string  // ← 资产ID
     // ...
   }
   ```

3. **Facts API 返回 asset_id**：
   - `/api/facts/orders/:order_id`：返回 `assets: AssetFactContract[]`，每个资产包含 `asset_id`
   - `/api/facts/restaurant/:restaurant_id/assets`：返回 `assets: AssetFactContract[]`，每个资产包含 `asset_id`

4. **数据流**：
   ```
   trace_logs.asset_id
     ↓
   TraceFactContract.asset_id
     ↓
   /api/facts/orders/:order_id (traces[])
     ↓
   UI 组件（OrderTimeline）
   ```

   ```
   devices.device_id (作为 asset_id)
     ↓
   AssetFactContract.asset_id
     ↓
   /api/facts/restaurant/:restaurant_id/assets (assets[])
     ↓
   UI 组件（AssetFactCard）
   ```

---

### 3.2 device_id 在事实系统中的流动

#### ⚠️ 部分存在：device_id 在事实系统中部分流动

**证据**：

1. **FactWarning 包含 device_id**：
   ```typescript
   // lib/facts/types.ts
   export type FactWarning = {
     // ...
     device_id?: string | null  // ← 设备ID（用于按设备归因统计）
   }
   ```

2. **Facts API 使用 device_id**：
   - `/api/facts/fuel/:device_id/stats`：通过 `device_id` 查询燃料统计数据

3. **但 device_id 未在 FactWarning 中填充**：
   ```typescript
   // lib/facts/governance/order.fact.guard.ts
   warningsStructured.push({
     // ...
     device_id: null, // ← 当前所有警告的 device_id 都设置为 null
     // 注释：trace.asset_id 与 device_id 的关系不明确，无法在不查询数据库的情况下确定
   })
   ```

4. **数据流**：
   ```
   devices.device_id
     ↓
   /api/facts/fuel/:device_id/stats
     ↓
   UI 组件（IoTDashboard）
   ```

   ```
   trace_logs.asset_id
     ↓
   TraceFactContract.asset_id
     ↓
   FactWarning.device_id  // ← 当前为 null，未填充
   ```

---

### 3.3 asset_id 与 device_id 的关系

**当前状态**：

1. **asset_id 来源**：
   - `gas_cylinders.id`（钢瓶资产）
   - `devices.device_id`（设备资产，在 `/api/facts/restaurant/:restaurant_id/assets` 中使用）

2. **device_id 来源**：
   - `devices.device_id`（设备表）

3. **关系**：
   - ⚠️ **关系不明确**：`trace_logs.asset_id` 可能指向 `gas_cylinders.id` 或 `devices.device_id`
   - ⚠️ **未建立映射**：当前代码中 `asset_id` 和 `device_id` 的关系未明确建立
   - ⚠️ **FactWarning.device_id 未填充**：因为关系不明确，所有警告的 `device_id` 都设置为 `null`

---

## 4. 总结

### 4.1 Type 定义

**事实系统类型**：
- ✅ `AssetFact`：资产事实类型（`lib/facts/types.ts`）
- ✅ `AssetFactContract`：资产事实契约（`lib/facts/contracts/order.fact.ts`）
- ✅ `TraceFactContract`：溯源事实契约（包含 `asset_id`）
- ✅ `FactWarning`：事实警告类型（包含 `device_id`，但当前未填充）

**页面组件类型**：
- ✅ `app/devices/page.tsx`：设备列表类型
- ✅ `components/iot-dashboard.tsx`：设备状态类型
- ✅ `app/(admin)/dashboard/page.tsx`：设备监控类型
- ✅ `app/worker/page.tsx`：设备列表类型

---

### 4.2 使用设备的页面

**用户端**：
- ✅ `/devices`：设备列表页面
- ✅ `/user-bound`：关联资产列表（通过 Facts API）
- ✅ `/user-bound`：IoT Dashboard（显示设备燃料数据）

**管理端**：
- ✅ `/dashboard`：设备监控

**工人端**：
- ✅ `/worker`：配送表单（显示可用设备）

**组件**：
- ✅ `IoTDashboard`：IoT 仪表盘
- ✅ `AssetFactCard`：资产事实卡片

---

### 4.3 device_id / asset_id 在事实系统中的流动

**asset_id**：
- ✅ **已流动**：在 `TraceFactContract`、`AssetFactContract` 中定义
- ✅ **已流动**：在 Facts API 中返回（`/api/facts/orders/:order_id`、`/api/facts/restaurant/:restaurant_id/assets`）
- ✅ **已流动**：在 UI 组件中使用（`OrderTimeline`、`AssetFactCard`）

**device_id**：
- ⚠️ **部分流动**：在 `FactWarning` 中定义，但当前未填充（所有警告的 `device_id` 都为 `null`）
- ✅ **已流动**：在 `/api/facts/fuel/:device_id/stats` 中使用
- ⚠️ **关系不明确**：`asset_id` 和 `device_id` 的关系未明确建立，导致 `FactWarning.device_id` 无法填充

---

## 5. 问题与建议

### 5.1 当前问题

1. **asset_id 与 device_id 关系不明确**：
   - `trace_logs.asset_id` 可能指向 `gas_cylinders.id` 或 `devices.device_id`
   - 未建立明确的映射关系

2. **FactWarning.device_id 未填充**：
   - 所有警告的 `device_id` 都设置为 `null`
   - 无法按设备归因统计警告

3. **数据模型不一致**：
   - `/api/facts/restaurant/:restaurant_id/assets` 将 `devices.device_id` 作为 `asset_id`
   - `/api/facts/orders/:order_id` 将 `gas_cylinders.id` 作为 `asset_id`
   - 两者都使用 `asset_id`，但来源不同

---

### 5.2 建议

1. **明确 asset_id 与 device_id 的关系**：
   - 建立 `asset_id` 到 `device_id` 的映射表或查询逻辑
   - 在 `OrderFactGuard` 中填充 `FactWarning.device_id`

2. **统一数据模型**：
   - 明确 `asset_id` 的来源（`gas_cylinders.id` vs `devices.device_id`）
   - 或创建统一的资产标识符

3. **完善 FactWarning.device_id 填充**：
   - 在生成警告时，通过 `trace.asset_id` 查询对应的 `device_id`
   - 或建立 `asset_id` 到 `device_id` 的映射关系
