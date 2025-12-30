# 二维码图标"灰转蓝"功能测试指南

## 开发服务器
开发服务器已启动，访问地址：**http://localhost:3000**

## 测试步骤

### 1. 测试无设备状态（灰色图标）

**前提条件：**
- 用户已登录（有 `restaurantId` 在 localStorage）
- 当前餐厅没有关联任何设备

**预期效果：**
- ✅ 右上角显示 **浅灰色** QrCode 图标（`text-zinc-500`）
- ✅ 图标**无动画效果**
- ✅ 点击图标后弹出对话框，显示：
  - 标题："欢迎！您的餐厅已建立数字档案"
  - 提示："请联系服务商绑定设备以开启完整功能。"

**测试方法：**
1. 打开浏览器开发者工具（F12）
2. 在 Console 中执行：
   ```javascript
   localStorage.setItem("restaurantId", "你的餐厅ID")
   ```
3. 刷新页面
4. 确保该餐厅在数据库中没有任何设备记录
5. 观察右上角图标颜色（应为灰色）
6. 点击图标，查看弹出的对话框

---

### 2. 测试有设备状态（蓝色图标）

**前提条件：**
- 用户已登录（有 `restaurantId` 在 localStorage）
- 当前餐厅至少关联了 1 个设备

**预期效果：**
- ✅ 右上角显示 **亮蓝色** QrCode 图标（`text-blue-400`）
- ✅ 图标有**呼吸灯动画效果**（`animate-pulse` + `drop-shadow`）
- ✅ 点击图标后显示二维码弹窗（包含餐厅信息和二维码）

**测试方法：**
1. 确保数据库中该餐厅有设备记录：
   ```sql
   -- 在 Supabase SQL Editor 中执行
   INSERT INTO devices (device_id, restaurant_id, model, address, container_type, status)
   VALUES ('test-device-001', '你的餐厅ID', '智能燃料监控系统', '测试地址', 'fixed_tank', 'active');
   ```
2. 刷新页面
3. 观察右上角图标颜色（应为蓝色）和动画效果
4. 点击图标，查看二维码弹窗

---

### 3. 强制显示测试

**测试场景：**
- 无论是否有设备，只要用户已登录，图标都应该显示

**预期效果：**
- ✅ 只要 `localStorage` 中有 `restaurantId`，图标就会显示
- ✅ 不会因为"无设备"而隐藏图标

**测试方法：**
1. 清除所有设备记录（或使用新注册的餐厅）
2. 确保已登录（有 `restaurantId`）
3. 刷新页面
4. 验证图标仍然显示（虽然是灰色的）

---

## 视觉样式检查清单

### 无设备对话框样式
- [ ] 背景：`bg-slate-900/95 backdrop-blur-md`（毛玻璃效果）
- [ ] 圆角：`rounded-2xl`（大圆角）
- [ ] 边框：`border border-slate-700/50`
- [ ] 阴影：`shadow-2xl`
- [ ] 动画：淡入淡出效果（Framer Motion）
- [ ] 图标：灰色 Package 图标
- [ ] 按钮：灰色渐变按钮

### 有设备图标样式
- [ ] 颜色：`text-blue-400`
- [ ] 阴影：`drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]`
- [ ] 动画：`animate-pulse`（呼吸灯效果）
- [ ] 悬停效果：`hover:text-blue-300 hover:bg-blue-500/10`

### 无设备图标样式
- [ ] 颜色：`text-zinc-500`
- [ ] 无动画效果
- [ ] 悬停效果：`hover:text-zinc-400 hover:bg-zinc-500/10`

---

## 调试信息

打开浏览器开发者工具的 Console，可以看到以下调试信息：

```
[QR Code] 检查餐厅ID: xxx
[QR Code] 餐厅查询结果: {...}
[QR Code] 设备数量: 0 或 >0
[QR Code] 点击二维码按钮，餐厅ID: xxx, 设备数: 0 或 >0
```

---

## 常见问题

### Q: 图标不显示？
**A:** 检查：
1. `localStorage` 中是否有 `restaurantId`
2. 浏览器控制台是否有错误信息
3. Supabase 环境变量是否配置正确

### Q: 图标颜色不对？
**A:** 检查：
1. 设备数量查询是否成功（查看 Console 日志）
2. 数据库中该餐厅的设备记录是否正确

### Q: 对话框样式不对？
**A:** 检查：
1. Tailwind CSS 是否正确加载
2. Framer Motion 是否已安装
3. 浏览器是否支持 backdrop-blur

---

## 快速测试命令

在浏览器 Console 中执行以下命令来快速切换测试场景：

```javascript
// 设置餐厅ID（如果还没有）
localStorage.setItem("restaurantId", "你的餐厅ID")

// 刷新页面
location.reload()

// 查看当前设备数量（需要 Supabase 配置）
// 在 Network 标签中查看 /api/restaurant 请求的响应
```

---

**测试完成后，请反馈以下信息：**
1. 图标颜色是否正确（灰色/蓝色）
2. 动画效果是否正常
3. 对话框样式是否与客户端 UI 一致
4. 是否有任何错误或异常

