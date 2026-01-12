# Supabase Realtime WebSocket 配置说明

## 问题诊断

如果遇到 WebSocket 连接失败，请按以下步骤检查：

## 1. 环境变量配置

确保 `.env.local` 文件中包含以下变量：

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

**重要：**
- URL 必须使用 `https://` 协议（生产环境）或 `http://`（本地开发）
- URL 格式应为：`https://[project-ref].supabase.co`
- 不要使用 `service_role` key，应使用 `anon` key

## 2. Supabase 项目配置

### 2.1 启用 Realtime 功能

在 Supabase Dashboard 中：
1. 进入 **Database** → **Replication**
2. 找到 `fuel_level` 表
3. 启用 **Realtime** 开关

### 2.2 检查表结构

确保 `fuel_level` 表：
- 有主键（`id` 字段）
- 已启用逻辑复制（Logical Replication）

## 3. 代码配置

### 3.1 客户端配置（已修复）

`lib/supabase.ts` 中已添加 Realtime 配置：

```typescript
realtime: {
  params: {
    eventsPerSecond: 10, // 限制每秒事件数
  },
},
```

### 3.2 订阅代码（已优化）

`components/iot-dashboard.tsx` 中已添加：
- 详细的日志输出
- 错误处理
- 连接状态监控

## 4. 常见问题排查

### 问题 1: "WebSocket connection failed"

**可能原因：**
- Supabase URL 不正确
- 网络防火墙阻止 WebSocket 连接
- Supabase 项目未启用 Realtime

**解决方案：**
1. 检查浏览器控制台的完整错误信息
2. 确认 Supabase Dashboard 中 Realtime 已启用
3. 检查网络连接和防火墙设置

### 问题 2: "Channel subscription failed"

**可能原因：**
- 表未启用 Realtime
- RLS（Row Level Security）策略阻止访问
- 设备 ID 不存在

**解决方案：**
1. 在 Supabase Dashboard 中启用表的 Realtime
2. 检查 RLS 策略是否允许读取 `fuel_level` 表
3. 确认 `devices` 表中有对应的设备记录

### 问题 3: "Connection timeout"

**可能原因：**
- 网络延迟过高
- Supabase 服务暂时不可用

**解决方案：**
1. 检查网络连接
2. 查看 Supabase Status 页面：https://status.supabase.com
3. 增加重连逻辑（代码中已包含）

## 5. 调试步骤

### 步骤 1: 检查环境变量

在浏览器控制台运行：
```javascript
console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
console.log('Supabase Key:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20) + '...')
```

### 步骤 2: 检查 Realtime 连接

在浏览器控制台查看：
- `[IoT Dashboard] Realtime 订阅状态:` 日志
- 应该看到 `SUBSCRIBED` 状态

### 步骤 3: 测试数据库连接

在 Supabase Dashboard 的 SQL Editor 中运行：
```sql
SELECT * FROM fuel_level ORDER BY created_at DESC LIMIT 5;
```

### 步骤 4: 检查表权限

确认当前用户有权限读取 `fuel_level` 表：
```sql
-- 检查 RLS 策略
SELECT * FROM pg_policies WHERE tablename = 'fuel_level';
```

## 6. 验证修复

修复后，应该看到：
1. 浏览器控制台显示：`[IoT Dashboard] Realtime 订阅成功`
2. 状态显示为 `SUBSCRIBED`
3. 当 `fuel_level` 表有新数据时，UI 自动更新

## 7. 如果问题仍然存在

1. **查看完整错误日志**：浏览器控制台 → Network → WS (WebSocket)
2. **检查 Supabase 日志**：Dashboard → Logs → Realtime
3. **联系 Supabase 支持**：提供项目 ID 和错误信息

## 相关文件

- `lib/supabase.ts` - Supabase 客户端配置
- `components/iot-dashboard.tsx` - Realtime 订阅实现
