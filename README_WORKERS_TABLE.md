# 创建 Workers 表的说明

## 问题
如果遇到错误："Could not find the table 'public.workers' in the schema cache"

## 解决方案

### 方法 1：在 Supabase Dashboard 中执行 SQL（推荐）

1. 打开 [Supabase Dashboard](https://app.supabase.com)
2. 选择你的项目
3. 点击左侧菜单的 **"SQL Editor"**
4. 点击 **"New query"** 按钮
5. 复制 `CREATE_WORKERS_TABLE_SIMPLE.sql` 文件中的**全部内容**
6. 粘贴到 SQL Editor 中
7. 点击 **"Run"** 或按 `Ctrl+Enter` 执行
8. 等待执行完成，应该会显示 "Success. No rows returned"
9. 刷新管理端页面，再次尝试添加工人

### 方法 2：使用 Supabase CLI

如果你安装了 Supabase CLI：

```bash
supabase db push
```

### 验证表是否创建成功

在 Supabase Dashboard 中：
1. 点击左侧菜单的 **"Table Editor"**
2. 查看是否有 **"workers"** 表
3. 如果看到 workers 表，说明创建成功

### 表结构

创建的 `workers` 表包含以下字段：
- `id`: UUID 主键（自动生成）
- `name`: 工人姓名（必填）
- `phone`: 联系电话
- `worker_type`: 工人类型（delivery/repair/install）
- `product_types`: JSONB 数组（产品类型，仅配送员）
- `status`: 状态（active/inactive，默认 active）
- `created_at`: 创建时间（自动）
- `updated_at`: 更新时间（自动）

### 如果仍然失败

1. 检查 Supabase 项目是否正确配置
2. 检查 `.env.local` 文件中的 `NEXT_PUBLIC_SUPABASE_URL` 和 `NEXT_PUBLIC_SUPABASE_ANON_KEY` 是否正确
3. 在 Supabase Dashboard 的 Table Editor 中手动检查 workers 表是否存在
4. 如果表存在但仍然报错，尝试刷新浏览器缓存或重启开发服务器

