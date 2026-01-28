# 无痕模式下 401 错误排查指南

## 问题说明

在无痕浏览器模式下访问协议管理时出现 401 Unauthorized 错误是**正常行为**。

## 原因

无痕浏览器模式（Incognito/Private Mode）不会共享正常浏览器的 cookies。每个无痕窗口都有独立的 cookie 存储，需要单独登录。

## 解决方案

### ✅ 方案 1：在无痕模式下重新登录（推荐）

1. 打开无痕浏览器窗口
2. 访问管理后台登录页面：`http://localhost:3000/login` 或相应的登录页面
3. 使用管理员账号登录（例如：`admin@test.com`）
4. 登录成功后，再次访问协议管理

### ✅ 方案 2：使用正常浏览器模式

如果不需要测试无痕模式，直接使用正常浏览器模式即可。

## 如何确认问题

### 检查服务器端日志

当你在无痕模式下点击协议管理时，服务器端控制台应该显示：

```
[协议管理API] 请求 Cookie header: { exists: false, length: 0, hasSupabaseCookies: false }
[getUserContext] ⚠️ Cookie header 不存在！
[协议管理API] ❌ 获取用户上下文失败: { message: "用户未登录", ... }
```

这确认了 cookies 确实没有传递到服务器。

### 检查浏览器 Network 标签页

1. 打开浏览器开发者工具
2. 切换到 Network 标签页
3. 点击协议管理
4. 查看 `/api/agreements` 请求的 Headers
5. 应该看到 `Cookie` header 为空或不存在

## 验证修复

在无痕模式下重新登录后：

1. 服务器端日志应该显示：
   ```
   [协议管理API] 请求 Cookie header: { exists: true, length: XXX, hasSupabaseCookies: true }
   [getUserContext] ✅ 使用 NextRequest cookies，数量: X
   [协议管理API] ✅ 用户上下文获取成功: { role: "super_admin", ... }
   ```

2. 浏览器 Network 标签页中，`/api/agreements` 请求的 Headers 应该包含 `Cookie` header，并且包含 `sb-` 开头的 cookies

3. 协议管理页面应该正常加载，不再显示 401 错误

## 注意事项

- 无痕模式下的登录状态是临时的，关闭无痕窗口后需要重新登录
- 如果需要在无痕模式下测试，每次打开新的无痕窗口都需要重新登录
- 这是浏览器的安全特性，不是系统 bug
