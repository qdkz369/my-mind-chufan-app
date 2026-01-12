# 阶段 2B-3 RLS 临时调整说明

## 📋 操作步骤

### 步骤 1：执行临时放宽RLS策略

在 **Supabase Dashboard → SQL Editor** 中执行：

```sql
-- 文件：scripts/temp-relax-rls-for-verification.sql
```

**执行方法**：
1. 打开 Supabase Dashboard
2. 进入 SQL Editor
3. 复制 `scripts/temp-relax-rls-for-verification.sql` 的内容
4. 粘贴到 SQL Editor
5. 点击 "Run" 执行

### 步骤 2：重新执行验证脚本

执行完成后，运行：

```bash
node scripts/verify-phase-2b3-execute.js
```

### 步骤 3：验证完成后恢复RLS策略

验证完成后，**必须**执行恢复脚本：

```sql
-- 文件：scripts/restore-rls-after-verification.sql
```

---

## ⚠️ 重要提醒

1. **临时策略仅用于验证**：放宽的RLS策略会允许所有用户访问，存在安全风险
2. **验证完成后必须恢复**：验证完成后立即执行 `scripts/restore-rls-after-verification.sql`
3. **不要在生产环境使用**：这些临时策略仅用于开发/测试环境

---

## 📝 预期结果

执行临时RLS策略后，验证脚本应该能够：
- ✅ 创建报修工单（测试1）
- ✅ 查询报修工单列表（测试2）
- ✅ 更新报修工单状态（测试3）
- ✅ 创建燃料配送订单（测试4）
- ✅ 查询待接单列表（测试5）
- ✅ 执行接单/派单/完成流程（测试6-8）
