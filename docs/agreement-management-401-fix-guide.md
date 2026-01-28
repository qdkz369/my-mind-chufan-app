# 协议管理 401 错误修复指南

## 问题描述

在无痕浏览器模式下访问协议管理时出现 401 Unauthorized 错误。

## 根本原因

1. **无痕模式不共享 cookies**：无痕浏览器模式不会共享正常浏览器的 cookies，所以即使用户在正常浏览器中已登录，无痕模式下仍然没有认证信息。

2. **认证流程依赖 cookies**：`getUserContext` 函数需要从 cookies 中获取 Supabase Auth session，如果 cookies 不存在，就会抛出 "用户未登录" 错误。

## 解决方案

### 方案 1：在无痕模式下重新登录（推荐）

1. 打开无痕浏览器窗口
2. 访问管理后台登录页面
3. 使用管理员账号登录（admin@test.com）
4. 登录成功后，再次访问协议管理

### 方案 2：检查服务器端日志

如果问题仍然存在，请检查服务器端控制台的日志输出：

1. 查看 `[协议管理API]` 的日志：
   - Cookie header 是否存在
   - Cookie header 长度
   - 是否包含 Supabase cookies

2. 查看 `[getUserContext]` 的日志：
   - 使用了哪种方式获取 cookies（NextRequest cookies / Request headers / Next.js cookies() API）
   - Cookie 数量
   - 是否包含 Supabase cookie

3. 查看 `[协议管理API] ❌ 获取用户上下文失败` 的详细错误信息

### 方案 3：检查浏览器 Network 标签页

1. 打开浏览器开发者工具
2. 切换到 Network 标签页
3. 点击协议管理
4. 查看 `/api/agreements` 请求的 Headers：
   - 检查 `Cookie` header 是否存在
   - 检查是否包含 `sb-` 开头的 cookies

## 调试步骤

1. **确认正常浏览器可以访问**：
   - 在正常浏览器中登录
   - 访问协议管理
   - 如果正常浏览器可以访问，说明问题确实是 cookies 未共享

2. **检查服务器端日志**：
   - 查看服务器端控制台的完整日志输出
   - 确认 cookies 是否传递到服务器

3. **检查环境变量**：
   - 确认 `NEXT_PUBLIC_SUPABASE_URL` 已设置
   - 确认 `NEXT_PUBLIC_SUPABASE_ANON_KEY` 已设置
   - 确认 `SUPABASE_SERVICE_ROLE_KEY` 已设置（可选，但推荐）

## 常见问题

### Q: 为什么正常浏览器可以访问，但无痕模式不行？

A: 无痕浏览器模式不会共享正常浏览器的 cookies。每个无痕窗口都有独立的 cookie 存储，需要单独登录。

### Q: 如何确认 cookies 是否正确传递？

A: 检查服务器端控制台的日志输出，应该看到：
```
[协议管理API] 请求 Cookie header: { exists: true, length: XXX, hasSupabaseCookies: true }
```

### Q: 如果 cookies 存在但仍然 401，怎么办？

A: 可能是 Supabase Auth session 已过期。尝试：
1. 清除浏览器 cookies
2. 重新登录
3. 刷新页面

## 相关文件

- `lib/auth/user-context.ts` - 用户上下文获取逻辑
- `app/api/agreements/route.ts` - 协议管理 API
- `app/api/admin/rental/contracts/route.ts` - 租赁合同 API
