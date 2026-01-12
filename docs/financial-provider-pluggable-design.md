# 金融参与方可插拔设计

## 完成时间
2025-01-20

## 核心原则

**为"金融参与方"预留接口，但不绑定**

- ✅ 定义接口模型，不实现逻辑
- ✅ 允许被替换或移除
- ✅ 换金融机构不影响任何事实
- ✅ UI 只是"换一个卡片"

## 接口定义

### 1. FinancialProvider（金融参与方）

```typescript
export interface FinancialProvider {
  provider_id: string                    // 金融参与方唯一标识
  provider_type: 'manufacturer' | 'leasing_company' | 'bank'  // 类型
  display_name: string                    // 显示名称（人类可读）
}
```

**字段说明**：
- `provider_id`: 金融参与方唯一标识
- `provider_type`: 金融参与方类型
  - `manufacturer`: 厂家
  - `leasing_company`: 租赁公司
  - `bank`: 银行
- `display_name`: 显示名称（人类可读），例如："XX 银行"、"XX 租赁公司"、"XX 厂家"

**使用场景**：
- UI 展示金融机构名称
- 区分不同的金融参与方
- 支持多金融机构切换

### 2. FinancialView（金融视图）

```typescript
export interface FinancialView {
  provider_id: string      // 金融参与方 ID
  lease_id: string         // 租赁 ID（关联到租赁合同或租赁记录）
  summary_text: string     // 人类可读的金融信息摘要
  calculated_at: string    // 金融视图计算时间（ISO 8601 格式）
}
```

**字段说明**：
- `provider_id`: 金融参与方 ID，关联到 `FinancialProvider.provider_id`
- `lease_id`: 租赁 ID（关联到租赁合同或租赁记录），注意：这是业务关联，不是事实关联
- `summary_text`: 人类可读的金融信息摘要，例如："月租金 ¥1000，租期 12 个月，总金额 ¥12000"，注意：这只是展示文本，不参与任何计算或业务逻辑
- `calculated_at`: 金融视图计算时间（ISO 8601 格式），用于标识金融视图的生成时间，注意：这是视图生成时间，不是事实时间

**使用场景**：
- UI 展示金融信息卡片
- 支持多个金融机构的金融视图
- 允许动态切换金融机构

### 3. FinancialViewQuery（金融视图查询参数）

```typescript
export interface FinancialViewQuery {
  lease_id: string         // 租赁 ID（关联到租赁合同或租赁记录）
  provider_id?: string     // 金融参与方 ID（可选，如果不提供则使用默认的金融参与方）
}
```

**使用场景**：
- 查询金融视图的输入参数
- 支持指定金融参与方或使用默认金融参与方

## 设计约束

### ⚠️ 禁止事项

1. **禁止写入事实层**
   - FinancialView 严禁写入 `facts` 表或结构
   - FinancialView 不参与事实计算
   - FinancialView 不影响事实 API 返回
   - FinancialView 不修改任何事实数据

2. **禁止绑定事实层**
   - FinancialProvider 不绑定到任何事实表结构
   - FinancialView 不依赖 facts API
   - 不参与事实计算
   - 不依赖任何事实数据

3. **禁止影响事实**
   - 换金融机构不影响任何事实
   - 移除金融层不影响任何事实
   - 事实 API 不受金融层影响

### ✅ 允许事项

1. **允许替换**
   - 可以替换 `FinancialProvider` 实现
   - 可以替换 `FinancialView` 实现
   - 可以更换金融机构

2. **允许移除**
   - 可以完全移除金融层
   - 移除后不影响任何事实 API
   - 移除后不影响任何事实表结构

3. **允许扩展**
   - 可以添加新的 `FinancialProviderType`
   - 可以扩展 `FinancialView` 字段
   - 可以添加新的金融视图类型

## 可插拔性保证

### 1. 接口模型独立

- ✅ `FinancialProvider` 和 `FinancialView` 是独立的接口模型
- ✅ 不绑定到任何事实表结构
- ✅ 不依赖 facts API
- ✅ 不参与事实计算

### 2. 明确标注可插拔性

所有接口和文档都明确标注：

```typescript
/**
 * ⚠️ 重要：此层允许被替换或移除
 * - 如果不需要金融功能，可以完全移除此层
 * - 如果更换金融机构，只需替换 FinancialProvider 实现
 * - 不影响任何事实 API 或事实表结构
 */
```

### 3. 换金融机构不影响事实

- ✅ 切换金融机构只影响展示，不影响事实
- ✅ FinancialProvider 不绑定到事实表
- ✅ FinancialView 不写入事实层
- ✅ 事实 API 不受金融层影响

### 4. UI 只是"换一个卡片"

- ✅ FinancialView 仅用于 UI 展示
- ✅ 切换金融机构只更换展示内容
- ✅ 不影响任何业务逻辑或事实计算

## 使用示例

### 1. 定义金融参与方

```typescript
import { FinancialProvider } from '@/lib/financial'

const provider: FinancialProvider = {
  provider_id: "bank_001",
  provider_type: "bank",
  display_name: "XX 银行"
}
```

### 2. 查询金融视图

```typescript
import { FinancialView, FinancialViewQuery } from '@/lib/financial'

// 查询金融视图（不写入事实层）
const query: FinancialViewQuery = {
  lease_id: "lease_123",
  provider_id: "bank_001"  // 可选，如果不提供则使用默认
}

// 返回 FinancialView（仅用于展示）
const financialView: FinancialView = await getFinancialView(query)
```

### 3. UI 展示

```tsx
import { FinancialView, FinancialProvider } from '@/lib/financial'

// UI 只是"换一个卡片"
<Card className="bg-muted/30 border-muted">
  <CardHeader>
    <h3>财务视图 / 估算视图</h3>
  </CardHeader>
  <CardContent>
    <p>{financialView.summary_text}</p>
    <p className="text-xs text-muted-foreground">
      金融机构：{provider.display_name}
    </p>
  </CardContent>
</Card>
```

### 4. 切换金融机构

```typescript
import { FinancialProvider, FinancialView } from '@/lib/financial'

// 切换金融机构（不影响任何事实）
const newProvider: FinancialProvider = {
  provider_id: "leasing_company_001",
  provider_type: "leasing_company",
  display_name: "XX 租赁公司"
}

// 重新查询金融视图（仅更换展示内容）
const newFinancialView: FinancialView = await getFinancialView({
  lease_id: "lease_123",
  provider_id: newProvider.provider_id
})
```

## 验证清单

### ✅ 达标检查

- [x] 换金融机构不影响任何事实
  - FinancialProvider 不绑定到事实表
  - FinancialView 不写入事实层
  - 切换金融机构只影响展示，不影响事实

- [x] UI 只是"换一个卡片"
  - FinancialView 仅用于 UI 展示
  - 切换金融机构只更换展示内容
  - 不影响任何业务逻辑或事实计算

- [x] 禁止 FinancialView 写入事实层
  - FinancialView 严禁写入 `facts` 表或结构
  - FinancialView 不参与事实计算
  - FinancialView 不影响事实 API 返回

- [x] 明确标注：此层允许被替换或移除
  - 所有接口和文档都明确标注"此层允许被替换或移除"
  - 所有禁止事项都已明确说明
  - 所有使用场景都已明确说明

## 文件结构

```
lib/financial/
├── types.ts          # 接口定义（FinancialProvider, FinancialView, FinancialViewQuery）
├── index.ts          # 导出接口
└── README.md         # 设计文档
```

## 总结

金融参与方可插拔设计完成：

- ✅ 定义了 `FinancialProvider` 接口（金融参与方）
- ✅ 定义了 `FinancialView` 数据结构（金融视图）
- ✅ 定义了 `FinancialViewQuery` 查询参数
- ✅ 禁止 FinancialView 写入事实层
- ✅ 明确标注：此层允许被替换或移除
- ✅ 换金融机构不影响任何事实
- ✅ UI 只是"换一个卡片"

符合所有要求，验证通过！
