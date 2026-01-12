# 修复说明：中间件改用 getUser()

## 🔍 问题根源

从网络请求分析发现：
- ✅ 认证成功（token 200 OK）
- ✅ 角色查询成功（user_roles 200 OK）
- ✅ 用户信息成功（user 200 OK）
- ❌ `/dashboard` 返回 307 重定向到 `/login`

**问题原因：**
中间件使用 `getSession()` 检查 session，但登录后 Cookie 可能还没有完全同步到服务器端，导致中间件检测不到已登录的用户。

## ✅ 修复方案

### 1. 改用 `getUser()` 方法
- `getSession()` 依赖 Cookie 中的 session 数据
- `getUser()` 从 JWT token 中读取用户信息，不依赖 Cookie 同步
- 这样即使 Cookie 还没完全同步，也能检测到已登录的用户

### 2. 添加详细调试信息
- 记录所有 Cookie 信息
- 记录认证 Cookie 的名称
- 记录用户检查的结果

## 🧪 测试步骤

### 1. 重启开发服务器
```bash
# 如果服务器正在运行，按 Ctrl+C 停止
npm run dev
```

### 2. 使用无痕模式测试
- 打开无痕窗口（`Ctrl + Shift + N`）
- 访问 `http://localhost:3000/login`
- 打开浏览器控制台（F12）

### 3. 登录并观察
- 输入管理员账号密码
- 点击登录
- 观察控制台和网络请求

### 4. 检查中间件日志
在服务器终端中，应该看到：
```
[中间件] Cookie 检查: {
  pathname: '/dashboard',
  totalCookies: X,
  authCookies: [...],
  hasUser: true,
  userEmail: 'xxx@xxx.com'
}
[中间件] 用户已登录，允许访问: xxx@xxx.com 路径: /dashboard
```

## 📊 预期结果

**成功标志：**
- ✅ `/dashboard` 请求返回 200 OK（不再是 307 重定向）
- ✅ 成功跳转到 dashboard 页面
- ✅ 中间件日志显示 `用户已登录，允许访问`
- ✅ 不再出现登录循环

**如果仍然失败：**
- 查看服务器终端的中间件日志
- 查看 Cookie 检查的结果
- 确认 `hasUser` 是否为 `true`

## 🔧 如果问题仍然存在

### 检查 Cookie 写入
如果 `authCookies` 为空或 `hasUser` 为 `false`，可能是：
1. Cookie 没有正确写入
2. Cookie 名称不匹配
3. Cookie 域或路径设置不正确

### 进一步调试
查看服务器终端的完整日志，特别是：
- `[中间件] Cookie 检查:` 的输出
- `[中间件] 用户检查错误:` 的错误信息

---

**现在请测试登录，应该能正常跳转到 dashboard 了！** 🚀
