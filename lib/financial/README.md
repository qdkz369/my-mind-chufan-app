# 金融参与方接口模型（可插拔设计）

## 完成时间
2025-01-20

## 核心原则

### 1. 可插拔性

**此层允许被替换或移除**

- ✅ 如果不需要金融功能，可以完全移除此层
- ✅ 如果更换金融机构，只需替换 `FinancialProvider` 实现
- ✅ 不影响任何事实 API 或事实表结构
- ✅ UI 只是"换一个卡片"

### 2. 禁止写入事实层

**FinancialView 严禁写入事实层**

- ⛔ 禁止写入 `facts` 表或结构
- ⛔ 禁止参与事实计算
- ⛔ 禁止影响事实 API 返回
- ⛔ 禁止修改任何事实数据

### 3. 独立设计

**FinancialProvider 和 FinancialView 是独立的接口模型**

- ✅ 不绑定到任何事实表结构
- ✅ 不依赖 facts API
- ✅ 不参与事实计算
- ✅ 仅用于展示金融信息

## 接口定义

### FinancialProvider（金融参与方）

```typescript
export interface FinancialProvider {
  provider_id: string                    // 金融参与方唯一标识
  provider_type: 'manufacturer' | 'leasing_company' | 'bank'  // 类型
  display_name: string                    // 显示名称（人类可读）
}
```

**使用场景**：
- UI 展示金融机构名称
- 区分不同的金融参与方
- 支持多金融机构切换

**示例**：
```typescript
const provider: FinancialProvider = {
  provider_id: "bank_001",
  provider_type: "bank",
  display_name: "XX 银行"
}
```

### FinancialView（金融视图）

```typescript
export interface FinancialView {
  provider_id: string      // 金融参与方 ID
  lease_id: string         // 租赁 ID（关联到租赁合同或租赁记录）
  summary_text: string     // 人类可读的金融信息摘要
  calculated_at: string    // 金融视图计算时间（ISO 8601 格式）
}
```

**使用场景**：
- UI 展示金融信息卡片
- 支持多个金融机构的金融视图
- 允许动态切换金融机构

**示例**：
```typescript
const financialView: FinancialView = {
  provider_id: "bank_001",
  lease_id: "lease_123",
  summary_text: "月租金 ¥1000，租期 12 个月，总金额 ¥12000",
  calculated_at: "2025-01-20T10:00:00Z"
}
```

## 设计约束

### ⚠️ 禁止事项

1. **禁止写入事实层**
   - FinancialView 严禁写入 `facts` 表或结构
   - FinancialView 不参与事实计算
   - FinancialView 不影响事实 API 返回

2. **禁止绑定事实层**
   - FinancialProvider 不绑定到任何事实表结构
   - FinancialView 不依赖 facts API
   - 不参与事实计算

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

## 使用示例

### 1. 查询金融视图

```typescript
// 查询金融视图（不写入事实层）
const query: FinancialViewQuery = {
  lease_id: "lease_123",
  provider_id: "bank_001"  // 可选，如果不提供则使用默认
}

// 返回 FinancialView（仅用于展示）
const financialView: FinancialView = await getFinancialView(query)
```

### 2. UI 展示

```tsx
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

### 3. 切换金融机构

```typescript
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

- [x] 禁止写入事实层
  - FinancialView 严禁写入 `facts` 表或结构
  - FinancialView 不参与事实计算
  - FinancialView 不影响事实 API 返回

- [x] 明确标注可插拔性
  - 所有接口和文档都明确标注"此层允许被替换或移除"
  - 所有禁止事项都已明确说明
  - 所有使用场景都已明确说明

## 总结

金融参与方接口模型设计完成：

- ✅ 定义了 `FinancialProvider` 接口（金融参与方）
- ✅ 定义了 `FinancialView` 数据结构（金融视图）
- ✅ 禁止 FinancialView 写入事实层
- ✅ 明确标注：此层允许被替换或移除
- ✅ 换金融机构不影响任何事实
- ✅ UI 只是"换一个卡片"

符合所有要求，验证通过！
