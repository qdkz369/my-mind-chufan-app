# UI Contexts 使用指南

## 概述

为设备租赁与金融相关页面引入独立的 UI Context，确保这些页面：
- 禁止使用 Facts 页面卡片样式
- 禁止使用事实时间线组件
- 使用金融视图专用组件（合同区块、表格化结构、责任主体标签）

## Context 类型

### 1. RentalUIContext

**用途**：设备租赁相关页面

**使用场景**：
- `/equipment-rental` - 设备租赁页面
- `/admin/rental/contracts` - 租赁合同页面
- `/admin/rental/usage-snapshots` - 使用快照页面

**特性**：
- `disableFactsCardStyle: true` - 禁止使用 Facts 页面卡片样式
- `disableFactsTimeline: true` - 禁止使用事实时间线组件

### 2. FinanceUIContext

**用途**：金融相关页面

**使用场景**：
- 金融视图页面
- 租赁合同金融信息展示
- 账单、发票、应收应付等金融数据展示

**特性**：
- `disableFactsCardStyle: true` - 禁止使用 Facts 页面卡片样式
- `disableFactsTimeline: true` - 禁止使用事实时间线组件
- `useFinanceComponents: true` - 使用金融视图专用组件

## 使用方法

### 1. 在页面中使用 Provider

```tsx
import { RentalUIProvider, FinanceUIProvider } from "@/lib/ui-contexts"

export default function RentalPage() {
  return (
    <RentalUIProvider>
      <main>
        {/* 页面内容 */}
      </main>
    </RentalUIProvider>
  )
}
```

### 2. 在组件中检查 Context

```tsx
import { useRentalUICheck, useFinanceUICheck } from "@/lib/ui-contexts"

export function MyComponent() {
  const isRentalContext = useRentalUICheck()
  const isFinanceContext = useFinanceUICheck()
  
  // 根据 Context 决定渲染内容
  if (isRentalContext) {
    // 禁止使用 Facts 组件
    return <RentalSpecificComponent />
  }
  
  return <DefaultComponent />
}
```

### 3. 使用金融视图专用组件

```tsx
import { ContractBlock, ResponsibilityLabel, FinanceTable } from "@/components/finance"
import { FinanceUIProvider } from "@/lib/ui-contexts"

export default function FinancePage() {
  return (
    <FinanceUIProvider>
      <ContractBlock
        contractNo="CT-2024-001"
        lessee={{ name: "餐厅A", id: "R001" }}
        lessor={{ name: "平台", type: "platform" }}
        startAt="2024-01-01"
        endAt="2024-12-31"
        status="active"
      />
      
      <ResponsibilityLabel
        type="lessee"
        name="餐厅A"
        id="R001"
      />
      
      <FinanceTable
        title="账单列表"
        columns={[
          { header: "账单号", accessor: "billNo" },
          { header: "金额", accessor: "amount", alignRight: true },
        ]}
        data={bills}
      />
    </FinanceUIProvider>
  )
}
```

## 金融视图专用组件

### ContractBlock（合同区块）

展示合同相关信息，使用表格化结构，包含清晰的责任主体标签。

**Props**：
- `contractNo: string` - 合同编号
- `title?: string` - 合同标题
- `lessee: { name, id?, type? }` - 承租方（责任主体）
- `lessor: { name, id?, type? }` - 出租方（责任主体）
- `startAt: string` - 合同开始时间
- `endAt: string` - 合同结束时间
- `status?: "active" | "expired" | "terminated" | "pending"` - 合同状态
- `extraInfo?: ReactNode` - 额外信息

### ResponsibilityLabel（责任主体标签）

清晰标识责任主体（承租方、出租方、平台等），使用统一的视觉样式。

**Props**：
- `type: "lessee" | "lessor" | "platform" | "finance"` - 责任主体类型
- `name: string` - 责任主体名称
- `id?: string` - 责任主体ID
- `showIcon?: boolean` - 是否显示图标
- `className?: string` - 自定义样式类名

### FinanceTable（金融表格）

提供金融数据的表格化展示，支持金额、日期、状态等金融字段。

**Props**：
- `title?: string` - 表格标题
- `description?: string` - 表格描述
- `columns: FinanceTableColumn[]` - 表格列配置
- `data: T[]` - 表格数据
- `emptyMessage?: string` - 空数据提示
- `className?: string` - 自定义样式类名

## 禁止事项

### 在 RentalUIContext 或 FinanceUIContext 中：

1. **禁止使用 Facts 页面卡片样式**
   - 不要使用 `AssetFactCard` 组件
   - 不要使用 Facts 相关的卡片样式类

2. **禁止使用事实时间线组件**
   - 不要使用 `OrderTimeline` 组件
   - 不要使用 Facts 相关的时间线组件

3. **必须使用金融视图专用组件**
   - 使用 `ContractBlock` 展示合同信息
   - 使用 `ResponsibilityLabel` 标识责任主体
   - 使用 `FinanceTable` 展示金融数据

## 已更新的页面

1. ✅ `/equipment-rental` - 使用 `RentalUIProvider`
2. ✅ `/admin/rental/contracts` - 使用 `RentalUIProvider` 和 `FinanceUIProvider`
3. ✅ `/admin/rental/usage-snapshots` - 使用 `RentalUIProvider`

## 注意事项

1. **Context 嵌套**：可以同时使用 `RentalUIProvider` 和 `FinanceUIProvider`（如租赁合同页面）
2. **组件检查**：金融视图专用组件会自动检查是否在 `FinanceUIProvider` 内使用
3. **向后兼容**：不在 Context 中的页面不受影响，可以继续使用 Facts 组件
