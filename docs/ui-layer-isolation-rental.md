# UI 层级隔离规范 - 设备租赁页面

## 完成时间
2025-01-20

## 核心原则

为设备租赁相关页面建立独立的 UI 分区规范，明确区分三个层级：

1. **Device Facts（设备事实）** - 设备编号、型号、状态、使用记录
2. **Lease Status（租赁状态）** - 租赁开始/结束时间、当前承租方、是否逾期
3. **Financial View（金融视图）** - 必须单独 Card/Panel 呈现，视觉上弱化

## 三个层级定义

### 层级 1: Device Facts（设备事实）

**职责**：
- 显示设备编号、型号、状态、使用记录
- 显示安装地址、安装人、安装日期、创建时间

**严格禁止**：
- ⛔ 禁止出现任何金额或支付相关字段
- ⛔ 禁止出现租赁费用、押金、总金额等金融信息
- ⛔ 禁止出现支付状态、支付方式等支付相关信息

**视觉样式**：
- 使用标准 `theme-card` 样式
- 主色调：`primary`（设备图标使用 `text-primary`）
- 背景：`bg-card`
- 文字：`text-foreground` / `text-muted-foreground`
- 位置：最上方（最重要）

**示例代码**：
```tsx
<Card className="theme-card">
  <CardHeader>
    <div className="flex items-start gap-4">
      <div className="w-12 h-12 bg-primary/20 flex items-center justify-center border border-primary/30">
        <Package className="h-6 w-6 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-lg font-bold text-foreground">{device.device_id}</h3>
        <p className="text-sm text-muted-foreground">型号: {device.model}</p>
      </div>
    </div>
  </CardHeader>
  <CardContent>
    {/* 设备事实信息：地址、安装人、安装日期、创建时间 */}
  </CardContent>
</Card>
```

### 层级 2: Lease Status（租赁状态）

**职责**：
- 显示租赁开始/结束时间
- 显示当前承租方（平台 / 商户 / 工人 / 公司）
- 显示是否逾期（boolean）

**严格禁止**：
- ⛔ 禁止出现任何金额或支付相关字段
- ⛔ 禁止出现租赁费用、押金、总金额等金融信息
- ⛔ 禁止出现支付状态、支付方式等支付相关信息

**视觉样式**：
- 使用 `border-blue-500/30 bg-blue-500/5` 样式（蓝色边框和浅蓝色背景）
- 图标颜色：`text-blue-400`
- 标题：`text-foreground`
- 文字：`text-foreground` / `text-muted-foreground`
- 位置：中间（次重要）

**示例代码**：
```tsx
<Card className="theme-card border-blue-500/30 bg-blue-500/5">
  <CardHeader>
    <div className="flex items-center gap-2">
      <Building2 className="h-5 w-5 text-blue-400" />
      <h3 className="text-lg font-bold text-foreground">租赁状态</h3>
    </div>
  </CardHeader>
  <CardContent>
    {/* 租赁状态信息：合同编号、开始/结束时间、出租方、是否逾期 */}
  </CardContent>
</Card>
```

### 层级 3: Financial View（金融视图）

**职责**：
- 显示合同约定的金额信息（仅作记录，不参与业务逻辑）
- 显示计费模式

**严格要求**：
- ✅ 必须单独 Card/Panel 呈现
- ✅ 视觉上弱化（灰阶 / 次级背景）
- ✅ 明确标注"财务视图 / 估算视图"
- ✅ 明确说明"以上金额仅为合同约定记录，不参与业务逻辑判断"
- ✅ 位置：最下方（最不重要）

**视觉样式**：
- 使用 `bg-muted/30 border-muted text-muted-foreground` 样式（灰阶、次级背景）
- 标题：`text-sm font-medium text-muted-foreground`
- 文字：`text-muted-foreground`
- 图标：`text-muted-foreground`
- 位置：放在最下方（最不重要的位置）

**示例代码**：
```tsx
<Card className="bg-muted/30 border-muted text-muted-foreground">
  <CardHeader>
    <div className="flex items-center gap-2">
      <Info className="h-4 w-4 text-muted-foreground" />
      <h3 className="text-sm font-medium text-muted-foreground">财务视图 / 估算视图</h3>
    </div>
  </CardHeader>
  <CardContent>
    <div className="space-y-2 text-sm">
      {/* 金融信息：计费模式、日租金、月租金 */}
      <div className="pt-2 border-t border-muted text-xs text-muted-foreground/70">
        <Info className="h-3 w-3 inline mr-1" />
        以上金额仅为合同约定记录，不参与业务逻辑判断
      </div>
    </div>
  </CardContent>
</Card>
```

## 实现页面

### 1. 用户端设备页面 (`app/devices/page.tsx`)

**已实现**：
- ✅ 三个层级清晰分离
- ✅ Device Facts 区域：设备编号、型号、状态、安装地址、安装人、安装日期、创建时间
- ✅ Lease Status 区域：合同编号、租赁开始/结束时间、出租方、是否逾期
- ✅ Financial View 区域：单独 Card，视觉弱化，明确标注

**数据查询**：
- 查询 `devices` 表获取设备事实信息
- 查询 `device_rentals` 表获取租赁记录
- 查询 `rental_contract_devices` 表获取合同设备关系
- 查询 `rental_contracts` 表获取合同信息（用于判断逾期和承租方）

**视觉层次**：
1. **Device Facts**：标准 Card，主色调（primary）
2. **Lease Status**：蓝色边框和浅蓝色背景（`border-blue-500/30 bg-blue-500/5`）
3. **Financial View**：灰阶背景（`bg-muted/30 border-muted`），放在最下方

## 验证清单

### ✅ 达标检查

- [x] 同一页面能明显看出三块信息
  - Device Facts：标准 Card，主色调
  - Lease Status：蓝色边框和浅蓝色背景
  - Financial View：灰阶背景，放在最下方

- [x] 钱永远在"最不重要的位置"
  - Financial View 放在最下方（最后渲染）
  - 使用灰阶样式（`bg-muted/30 border-muted text-muted-foreground`）
  - 明确标注"财务视图 / 估算视图"
  - 明确说明"以上金额仅为合同约定记录，不参与业务逻辑判断"

### ✅ 禁止事项验证

- [x] Device Facts 区域没有金额或支付相关字段
- [x] Lease Status 区域没有金额或支付相关字段
- [x] Financial View 区域单独呈现，视觉弱化
- [x] Financial View 明确标注"财务视图 / 估算视图"
- [x] Financial View 明确说明金额仅为记录，不参与业务逻辑

## 视觉对比

### Device Facts（设备事实）
- **背景**：`bg-card`（标准卡片背景）
- **边框**：`border`（标准边框）
- **图标**：`text-primary`（主色调）
- **文字**：`text-foreground`（主要文字）
- **位置**：最上方（最重要）

### Lease Status（租赁状态）
- **背景**：`bg-blue-500/5`（浅蓝色背景，5% 透明度）
- **边框**：`border-blue-500/30`（蓝色边框，30% 透明度）
- **图标**：`text-blue-400`（蓝色图标）
- **文字**：`text-foreground`（主要文字）
- **位置**：中间（次重要）

### Financial View（金融视图）
- **背景**：`bg-muted/30`（灰阶背景，30% 透明度）
- **边框**：`border-muted`（灰阶边框）
- **图标**：`text-muted-foreground`（灰阶图标）
- **文字**：`text-muted-foreground`（灰阶文字）
- **位置**：最下方（最不重要）

## 总结

UI 层级隔离规范已成功实现：

- ✅ 三个层级清晰分离：Device Facts、Lease Status、Financial View
- ✅ Device Facts 和 Lease Status 区域禁止出现金额或支付相关字段
- ✅ Financial View 单独 Card 呈现，视觉上弱化
- ✅ Financial View 明确标注"财务视图 / 估算视图"
- ✅ 钱永远在"最不重要的位置"（最下方，灰阶样式）

符合所有要求，验证通过！
