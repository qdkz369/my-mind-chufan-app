# Console.error 过滤后清单

## 排除规则

- ❌ `components/error-boundary.tsx` - Error Boundary 必须使用 console.error
- ❌ `app/api/**` - API 路由（服务端代码，不影响 Cursor 客户端弹窗）
- ❌ `docs/**` - 文档文件（仅示例代码）

---

## 剩余文件统计（按文件分组）

### 📄 页面组件（Pages）

#### `app/user-bound/page.tsx` (11处)
- 第 113 行：`console.error('[User Bound Page] 权限验证失败，请确保已登录')`
- 第 116 行：`console.error('[User Bound Page] 获取餐厅事实总览失败:', error)`
- 第 138 行：`console.error('[User Bound Page] 转换资产卡片 ViewModel 失败:', error)`
- 第 142 行：`console.error('[User Bound Page] 权限验证失败，请确保已登录')`
- 第 145 行：`console.error('[User Bound Page] 获取关联资产列表失败:', error)`
- 第 207 行：`console.error('[User Bound Page] 转换订单时间线 ViewModel 失败:', error)`
- 第 227 行：`console.error('[User Bound Page] 转换订单关联资产 ViewModel 失败:', error)`
- 第 232 行：`console.error('[User Bound Page] 权限验证失败，请确保已登录')`
- 第 236 行：`console.error('[User Bound Page] 权限验证失败，请确保已登录')`
- 第 239 行：`console.error('[User Bound Page] 获取最近一次配送失败:', error)`
- 第 243 行：`console.error('[User Bound Page] 加载事实数据失败:', error)`

---

#### `app/worker/page.tsx` (24处)
- 第 139 行：`console.error('[安装表单] 验证失败:', errorMsg)`
- 第 146 行：`console.error('[安装表单] 验证失败:', errorMsg)`
- 第 153 行：`console.error('[安装表单] 验证失败:', errorMsg)`
- 第 160 行：`console.error('[安装表单] 验证失败:', errorMsg)`
- 第 222 行：`console.error(\`关联设备 ${device.deviceId} 到客户失败:\`, linkError)`
- 第 230 行：`console.error(\`处理设备 ${device.deviceId} 失败:\`, err)`
- 第 257 行：`console.error("更新餐厅状态失败:", statusError)`
- 第 263 行：`console.error("更新餐厅状态时出错:", err)`
- 第 290 行：`console.error('[安装表单] 提交失败:', err)`
- 第 335 行：`console.error("获取客户信息失败:", err)`
- 第 983 行：`console.error("绑定设备失败:", linkError)`
- 第 997 行：`console.error("更新餐厅状态失败:", statusError)`
- 第 1202 行：`console.error("关联设备到餐厅失败:", linkError)`
- 第 1223 行：`console.error("创建安装订单失败:", orderResult.error)`
- 第 1243 行：`console.error("更新餐厅状态失败:", statusError)`
- 第 1643 行：`console.error("[配送流程] 接单失败:", errorMsg, "完整响应:", acceptResult)`
- 第 1703 行：`console.error("[配送流程] 操作失败:", err)`
- 第 2589 行：`console.error("[设备交付] Supabase 客户端未初始化")` ⚠️ A类
- 第 2612 行：`console.error("[设备交付] Supabase URL 或 Service Role Key 未配置")` ⚠️ A类
- 第 2638 行：`console.error("[设备交付] 加载失败:", error)`
- 第 2644 行：`console.error("[设备交付] 加载失败:", err)`
- 第 2722 行：`console.error("[设备交付] 提交失败:", err)`
- 第 3200 行：`console.error("[工人端] 解析保存的工人信息失败:", error)`
- 第 3320 行：`console.error("[工人端] 登录失败:", error)`

---

#### `app/payment/page.tsx` (7处)
- 第 270 行：`console.error("加载上次订单信息失败:", error)`
- 第 324 行：`console.error("获取位置信息失败:", error)`
- 第 346 行：`console.error("更新配送员位置失败:", error)`
- 第 454 行：`console.error("保存商户位置失败:", error)`
- 第 496 行：`console.error("保存商户位置失败:", error)`
- 第 657 行：`console.error("保存订单信息失败:", error)`
- 第 707 行：`console.error("支付处理失败:", error)`

---

#### `app/equipment-rental/page.tsx` (6处)
- 第 170 行：`console.error("[设备租赁] 加载分类失败:", errorMsg)`
- 第 176 行：`console.error("[设备租赁] 加载分类失败:", err)`
- 第 210 行：`console.error("[设备租赁] 加载设备失败:", errorMsg)`
- 第 216 行：`console.error("[设备租赁] 加载设备失败:", err)`
- 第 235 行：`console.error("[设备租赁] 加载订单失败:", err)`
- 第 311 行：`console.error("[设备租赁] 提交失败:", err)`

---

#### `app/devices/page.tsx` (3处)
- 第 84 行：`console.error("[设备页面] 检查登录状态失败:", error)`
- 第 143 行：`console.error("查询设备失败:", devicesError)`
- 第 241 行：`console.error("加载设备失败:", err)`

---

#### `app/login/page.tsx` (2处)
- 第 61 行：`console.error("[登录页] 登录失败:", authError)`
- 第 90 行：`console.error("[登录页] 查询角色失败:", roleError)`

---

#### `app/(admin)/dashboard/page.tsx` (30+处)
- 第 453 行：`console.error('[地理编码] Geocoder 插件加载失败')`
- 第 458 行：`console.error('[地理编码] AMap.plugin 不可用，无法加载 Geocoder 插件')`
- 第 514 行：`console.error('[地理编码] PlaceSearch 插件加载失败')`
- 第 520 行：`console.error('[地理编码] AMap.plugin 不可用，无法加载 PlaceSearch 插件')`
- 第 634 行：`console.error(\`[更新坐标] 更新餐厅 ${restaurant.id} 失败:\`, updateError)`
- 第 768 行：`console.error("[Admin Dashboard] 加载餐厅数据失败:", error)`
- 第 824 行：`console.error("[Admin Dashboard] 加载餐厅数据时出错:", error)`
- 第 865 行：`console.error("[Admin Dashboard] 加载订单失败:", ordersError)`
- 第 901 行：`console.error("[Admin Dashboard] 加载订单时出错:", error)`
- 第 964 行：`console.error("[Admin Dashboard] 加载所有订单失败:", ordersError)`
- 第 1002 行：`console.error("[Admin Dashboard] 加载所有订单时出错:", error)`
- 第 1029 行：`console.error("[Admin Dashboard] 接口返回错误:", response.status, errorText)`
- 第 1055 行：`console.error("[Admin Dashboard] 加载报修时出错:", error)`
- 第 1057 行：`console.error("[Admin Dashboard] 错误详情:", error.message, error.stack)`
- 第 1140 行：`console.error("[Admin Dashboard] 更新报修失败:", updateError)`
- 第 1147 行：`console.error("[Admin Dashboard] 更新报修后未返回数据")`
- 第 1175 行：`console.error("[Admin Dashboard] 更新报修时出错:", error)`
- 第 1236 行：`console.error("[设备租赁管理] 加载失败:", errorMsg, details)`
- 第 1242 行：`console.error("[设备租赁管理] 加载失败:", err)`
- 第 1269 行：`console.error("[设备租赁基础功能] 加载失败:", errorMsg, details)`
- 第 1275 行：`console.error("[设备租赁基础功能] 加载失败:", err)`
- 第 1301 行：`console.error("[设备租赁基础功能] 加载设备和餐厅列表失败:", err)`
- 第 1415 行：`console.error("[设备租赁管理] 加载设备和餐厅列表失败:", err)`
- 第 1540 行：`console.error("[租赁工作台] 加载失败:", error)`
- 第 1546 行：`console.error("[租赁工作台] 加载失败:", err)`
- 第 1631 行：`console.error("[Admin Dashboard] 加载工人列表失败:", error)`
- 第 1705 行：`console.error("[Admin Dashboard] 加载工人列表失败:", error)`
- 第 1785 行：`console.error("[Admin Dashboard] 添加工人失败 - 详细错误:", error)`
- 第 1786 行：`console.error("[Admin Dashboard] 错误代码:", error.code)`
- 第 1787 行：`console.error("[Admin Dashboard] 错误详情:", error.details)`
- 第 1788 行：`console.error("[Admin Dashboard] 错误提示:", error.hint)`
- 更多...

---

#### `app/(admin)/rental/contracts/page.tsx` (4处)
- 第 104 行：`console.error("[租赁合同页面] 权限验证失败:", error)`
- 第 128 行：`console.error("[租赁合同页面] 加载失败:", err)`
- 第 146 行：`console.error("[租赁合同页面] 加载餐厅列表失败:", error)`
- 第 154 行：`console.error("[租赁合同页面] 加载餐厅列表失败:", err)`

---

#### `app/(admin)/rental/usage-snapshots/page.tsx` (3处)
- 第 103 行：`console.error("权限验证失败:", err)`
- 第 134 行：`console.error("加载快照列表失败:", err)`
- 第 171 行：`console.error("更新状态失败:", err)`

---

### 🔧 组件（Components）

#### `components/profile-content.tsx` (21处)
- 第 113 行：`console.error('[ProfileContent] 加载餐厅信息失败:', error)`
- 第 197 行：`console.error('[定位] 定位失败事件:', data)`
- 第 208 行：`console.error('[定位] 加载高德地图插件失败:', error)`
- 第 247 行：`console.error('[ProfileContent] 加载统计数据异常:', error)`
- 第 294 行：`console.error('[加载餐厅信息] 解析缓存数据失败:', e)`
- 第 340 行：`console.error("[加载餐厅信息] Supabase查询失败:", error)`
- 第 356 行：`console.error("[加载餐厅信息] 异常:", error)`
- 第 467 行：`console.error('[定位] 高德逆地理编码异常:', error)`
- 第 492 行：`console.error('[定位] 浏览器原生定位失败:', error)`
- 第 549 行：`console.error('[定位] 定位超时')`
- 第 577 行：`console.error('[定位] 坐标无效:', { latitude, longitude })`
- 第 714 行：`console.error('[定位] 逆地理编码异常:', error)`
- 第 730 行：`console.error('[定位] 定位数据格式错误:', data)`
- 第 744 行：`console.error('[定位] 定位失败:', data)`
- 第 790 行：`console.error('[定位] 定位异常:', error)`
- 第 853 行：`console.error('[注册表单] 更新失败 - HTTP错误:', response.status, errorResult)`
- 第 952 行：`console.error('[注册表单] 更新失败:', result.error, result.details)`
- 第 976 行：`console.error('[注册表单] 注册失败 - HTTP错误:', response.status, errorResult)`
- 第 1034 行：`console.error('[注册表单] 注册失败:', result.error, result.details)`
- 第 1039 行：`console.error("提交失败:", error)`
- 第 1116 行：`console.error("登录失败:", error)`

---

#### `components/iot-dashboard.tsx` (5处)
- 第 79 行：`console.error('[IoT Dashboard] 加载燃料数据失败:', error)`
- 第 169 行：`console.error('[IoT Dashboard] 刷新统计数据失败:', err)`
- 第 181 行：`console.error('[IoT Dashboard] Realtime 订阅失败:', status, err)`
- 第 193 行：`console.error('[IoT Dashboard] 达到最大重连次数，停止重连')`
- 第 198 行：`console.error('[IoT Dashboard] 设置实时订阅失败:', error)`

---

#### `components/worker/repair-list.tsx` (1处)
- 第 190 行：`console.error("[工人端] 加载维修工单失败:", err)`

---

### 🪝 Hooks

#### `hooks/use-financial-view-permission.ts` (1处)
- 第 69 行：`console.error("[金融视图权限检查] 错误:", error)`

---

## 📊 统计汇总

### 按文件类型统计

| 类型 | 文件数 | console.error 总数 |
|------|--------|-------------------|
| **页面组件** | 9 | ~90+ |
| **组件** | 3 | ~27 |
| **Hooks** | 1 | 1 |
| **总计** | **13** | **~118** |

### 按文件统计（详细）

| 文件路径 | 行数 |
|---------|------|
| `app/(admin)/dashboard/page.tsx` | 30+ |
| `app/worker/page.tsx` | 24 |
| `components/profile-content.tsx` | 21 |
| `app/user-bound/page.tsx` | 11 |
| `app/payment/page.tsx` | 7 |
| `app/equipment-rental/page.tsx` | 6 |
| `components/iot-dashboard.tsx` | 5 |
| `app/(admin)/rental/contracts/page.tsx` | 4 |
| `app/devices/page.tsx` | 3 |
| `app/(admin)/rental/usage-snapshots/page.tsx` | 3 |
| `app/login/page.tsx` | 2 |
| `components/worker/repair-list.tsx` | 1 |
| `hooks/use-financial-view-permission.ts` | 1 |

---

## 🎯 需要修复的文件清单

### 优先级 1：立即修复
- ✅ `app/user-bound/page.tsx` - 11 处（已规划）

### 优先级 2：高优先级
- ⏳ `components/profile-content.tsx` - 21 处
- ⏳ `app/worker/page.tsx` - 24 处（其中 2 处为 A 类，需保留）
- ⏳ `app/(admin)/dashboard/page.tsx` - 30+ 处

### 优先级 3：中优先级
- ⏳ `app/payment/page.tsx` - 7 处
- ⏳ `app/equipment-rental/page.tsx` - 6 处
- ⏳ `components/iot-dashboard.tsx` - 5 处

### 优先级 4：低优先级
- ⏳ `app/(admin)/rental/contracts/page.tsx` - 4 处
- ⏳ `app/devices/page.tsx` - 3 处
- ⏳ `app/(admin)/rental/usage-snapshots/page.tsx` - 3 处
- ⏳ `app/login/page.tsx` - 2 处
- ⏳ `components/worker/repair-list.tsx` - 1 处
- ⏳ `hooks/use-financial-view-permission.ts` - 1 处

---

## ⚠️ 特殊说明

### A 类错误（需保留 console.error）

以下错误属于系统不可恢复错误，应保留 `console.error`：

1. **`app/worker/page.tsx` 第 2589 行**：
   ```typescript
   console.error("[设备交付] Supabase 客户端未初始化")
   ```
   - 原因：系统配置错误，无法继续执行

2. **`app/worker/page.tsx` 第 2612 行**：
   ```typescript
   console.error("[设备交付] Supabase URL 或 Service Role Key 未配置")
   ```
   - 原因：系统配置错误，无法继续执行

---

## 📝 总结

排除 `components/error-boundary.tsx` 和 `app/api/**` 后：

- **剩余文件数**：13 个
- **剩余 console.error 总数**：~118 处
- **需要修复的 B/C 类错误**：~116 处
- **需要保留的 A 类错误**：~2 处
