# Console.error 分类清单（按页面/API/Util）

## 📄 页面组件（Pages）

### `app/user-bound/page.tsx` (11处) - ⚠️ 已规划修复

| 行号 | 错误信息 | 分类 | 建议处理 |
|------|---------|------|---------|
| 113 | 权限验证失败，请确保已登录 | B | → logBusinessWarning |
| 116 | 获取餐厅事实总览失败 | B | → logBusinessWarning |
| 138 | 转换资产卡片 ViewModel 失败 | C | → console.warn |
| 142 | 权限验证失败，请确保已登录 | B | → logBusinessWarning |
| 145 | 获取关联资产列表失败 | B | → logBusinessWarning |
| 207 | 转换订单时间线 ViewModel 失败 | C | → console.warn |
| 227 | 转换订单关联资产 ViewModel 失败 | C | → console.warn |
| 232 | 权限验证失败，请确保已登录 | B | → logBusinessWarning |
| 236 | 权限验证失败，请确保已登录 | B | → logBusinessWarning |
| 239 | 获取最近一次配送失败 | B | → logBusinessWarning |
| 243 | 加载事实数据失败 | B | → logBusinessWarning |

---

### `app/worker/page.tsx` (24处)

| 行号 | 错误信息 | 分类 | 建议处理 |
|------|---------|------|---------|
| 139 | 安装表单验证失败 | B | → logBusinessWarning |
| 146 | 安装表单验证失败 | B | → logBusinessWarning |
| 153 | 安装表单验证失败 | B | → logBusinessWarning |
| 160 | 安装表单验证失败 | B | → logBusinessWarning |
| 222 | 关联设备到客户失败 | B | → logBusinessWarning |
| 230 | 处理设备失败 | B | → logBusinessWarning |
| 257 | 更新餐厅状态失败 | B | → logBusinessWarning |
| 263 | 更新餐厅状态时出错 | B | → logBusinessWarning |
| 290 | 安装表单提交失败 | B | → logBusinessWarning |
| 335 | 获取客户信息失败 | B | → logBusinessWarning |
| 983 | 绑定设备失败 | B | → logBusinessWarning |
| 997 | 更新餐厅状态失败 | B | → logBusinessWarning |
| 1202 | 关联设备到餐厅失败 | B | → logBusinessWarning |
| 1223 | 创建安装订单失败 | B | → logBusinessWarning |
| 1243 | 更新餐厅状态失败 | B | → logBusinessWarning |
| 1643 | 接单失败 | B | → logBusinessWarning |
| 1703 | 操作失败 | B | → logBusinessWarning |
| 2589 | Supabase 客户端未初始化 | A | ✅ 保留 console.error |
| 2612 | Supabase URL 或 Service Role Key 未配置 | A | ✅ 保留 console.error |
| 2638 | 加载失败 | B | → logBusinessWarning |
| 2644 | 加载失败 | B | → logBusinessWarning |
| 2722 | 提交失败 | B | → logBusinessWarning |
| 3200 | 解析保存的工人信息失败 | B | → logBusinessWarning |
| 3320 | 登录失败 | B | → logBusinessWarning |

---

### `app/payment/page.tsx` (7处)

| 行号 | 错误信息 | 分类 | 建议处理 |
|------|---------|------|---------|
| 270 | 加载上次订单信息失败 | B | → logBusinessWarning |
| 324 | 获取位置信息失败 | B | → logBusinessWarning |
| 346 | 更新配送员位置失败 | B | → logBusinessWarning |
| 454 | 保存商户位置失败 | B | → logBusinessWarning |
| 496 | 保存商户位置失败 | B | → logBusinessWarning |
| 657 | 保存订单信息失败 | B | → logBusinessWarning |
| 707 | 支付处理失败 | B | → logBusinessWarning |

---

### `app/equipment-rental/page.tsx` (6处)

| 行号 | 错误信息 | 分类 | 建议处理 |
|------|---------|------|---------|
| 170 | 加载分类失败 | B | → logBusinessWarning |
| 176 | 加载分类失败 | B | → logBusinessWarning |
| 210 | 加载设备失败 | B | → logBusinessWarning |
| 216 | 加载设备失败 | B | → logBusinessWarning |
| 235 | 加载订单失败 | B | → logBusinessWarning |
| 311 | 提交失败 | B | → logBusinessWarning |

---

### `app/devices/page.tsx` (3处)

| 行号 | 错误信息 | 分类 | 建议处理 |
|------|---------|------|---------|
| 84 | 检查登录状态失败 | B | → logBusinessWarning |
| 143 | 查询设备失败 | B | → logBusinessWarning |
| 241 | 加载设备失败 | B | → logBusinessWarning |

---

### `app/login/page.tsx` (2处)

| 行号 | 错误信息 | 分类 | 建议处理 |
|------|---------|------|---------|
| 61 | 登录失败 | B | → logBusinessWarning |
| 90 | 查询角色失败 | B | → logBusinessWarning |

---

### `app/(admin)/dashboard/page.tsx` (30+处)

| 行号 | 错误信息 | 分类 | 建议处理 |
|------|---------|------|---------|
| 453 | Geocoder 插件加载失败 | B | → logBusinessWarning |
| 458 | AMap.plugin 不可用 | B | → logBusinessWarning |
| 514 | PlaceSearch 插件加载失败 | B | → logBusinessWarning |
| 520 | AMap.plugin 不可用 | B | → logBusinessWarning |
| 634 | 更新坐标失败 | B | → logBusinessWarning |
| 768 | 加载餐厅数据失败 | B | → logBusinessWarning |
| 824 | 加载餐厅数据时出错 | B | → logBusinessWarning |
| 865 | 加载订单失败 | B | → logBusinessWarning |
| 901 | 加载订单时出错 | B | → logBusinessWarning |
| 964 | 加载所有订单失败 | B | → logBusinessWarning |
| 1002 | 加载所有订单时出错 | B | → logBusinessWarning |
| 1029 | 接口返回错误 | B | → logBusinessWarning |
| 1055 | 加载报修时出错 | B | → logBusinessWarning |
| 1057 | 错误详情 | B | → logBusinessWarning |
| 1140 | 更新报修失败 | B | → logBusinessWarning |
| 1147 | 更新报修后未返回数据 | B | → logBusinessWarning |
| 1175 | 更新报修时出错 | B | → logBusinessWarning |
| 1236 | 设备租赁管理加载失败 | B | → logBusinessWarning |
| 1242 | 设备租赁管理加载失败 | B | → logBusinessWarning |
| 1269 | 设备租赁基础功能加载失败 | B | → logBusinessWarning |
| 1275 | 设备租赁基础功能加载失败 | B | → logBusinessWarning |
| 1301 | 加载设备和餐厅列表失败 | B | → logBusinessWarning |
| 1415 | 加载设备和餐厅列表失败 | B | → logBusinessWarning |
| 1540 | 租赁工作台加载失败 | B | → logBusinessWarning |
| 1785-1788 | 添加工人失败（多行） | B | → logBusinessWarning |
| ... | 更多... | B | → logBusinessWarning |

---

### `app/(admin)/rental/contracts/page.tsx` (4处)

| 行号 | 错误信息 | 分类 | 建议处理 |
|------|---------|------|---------|
| 104 | 权限验证失败 | B | → logBusinessWarning |
| 128 | 加载失败 | B | → logBusinessWarning |
| 146 | 加载餐厅列表失败 | B | → logBusinessWarning |
| 154 | 加载餐厅列表失败 | B | → logBusinessWarning |

---

### `app/(admin)/rental/usage-snapshots/page.tsx` (3处)

| 行号 | 错误信息 | 分类 | 建议处理 |
|------|---------|------|---------|
| 103 | 权限验证失败 | B | → logBusinessWarning |
| 134 | 加载快照列表失败 | B | → logBusinessWarning |
| 171 | 更新状态失败 | B | → logBusinessWarning |

---

## 🔧 组件（Components）

### `components/profile-content.tsx` (21处)

| 行号 | 错误信息 | 分类 | 建议处理 |
|------|---------|------|---------|
| 113 | 加载餐厅信息失败 | B | → logBusinessWarning |
| 197 | 定位失败事件 | B | → logBusinessWarning |
| 208 | 加载高德地图插件失败 | B | → logBusinessWarning |
| 247 | 加载统计数据异常 | B | → logBusinessWarning |
| 294 | 解析缓存数据失败 | B | → logBusinessWarning |
| 340 | Supabase查询失败 | B | → logBusinessWarning |
| 356 | 异常 | B | → logBusinessWarning |
| 467 | 高德逆地理编码异常 | B | → logBusinessWarning |
| 492 | 浏览器原生定位失败 | B | → logBusinessWarning |
| 549 | 定位超时 | B | → logBusinessWarning |
| 577 | 坐标无效 | B | → logBusinessWarning |
| 714 | 逆地理编码异常 | B | → logBusinessWarning |
| 730 | 定位数据格式错误 | B | → logBusinessWarning |
| 744 | 定位失败 | B | → logBusinessWarning |
| 790 | 定位异常 | B | → logBusinessWarning |
| 853 | 注册表单更新失败 | B | → logBusinessWarning |
| 952 | 注册表单更新失败 | B | → logBusinessWarning |
| 976 | 注册表单注册失败 | B | → logBusinessWarning |
| 1034 | 注册表单注册失败 | B | → logBusinessWarning |
| 1039 | 提交失败 | B | → logBusinessWarning |
| 1116 | 登录失败 | B | → logBusinessWarning |

---

### `components/iot-dashboard.tsx` (5处)

| 行号 | 错误信息 | 分类 | 建议处理 |
|------|---------|------|---------|
| 79 | 加载燃料数据失败 | B | → logBusinessWarning |
| 169 | 刷新统计数据失败 | B | → logBusinessWarning |
| 181 | Realtime 订阅失败 | B | → logBusinessWarning |
| 193 | 达到最大重连次数 | B | → logBusinessWarning |
| 198 | 设置实时订阅失败 | B | → logBusinessWarning |

---

### `components/error-boundary.tsx` (2处) - ✅ 保留

| 行号 | 错误信息 | 分类 | 建议处理 |
|------|---------|------|---------|
| 41 | 捕获到错误 | A | ✅ 保留 console.error |
| 42 | 错误信息 | A | ✅ 保留 console.error |

**说明**：Error Boundary 捕获的错误是真正的系统错误，必须使用 `console.error`。

---

### `components/worker/repair-list.tsx` (1处)

| 行号 | 错误信息 | 分类 | 建议处理 |
|------|---------|------|---------|
| 190 | 加载维修工单失败 | B | → logBusinessWarning |

---

## 🔌 API 路由（API Routes）

### `app/api/facts/orders/[order_id]/route.ts` (5处)

| 行号 | 错误信息 | 分类 | 建议处理 |
|------|---------|------|---------|
| 96 | 查询订单失败 | B | → logBusinessWarning |
| 235 | 查询溯源记录失败 | B | → logBusinessWarning |
| 297 | 查询资产状态失败 | B | → logBusinessWarning |
| 374 | 订单事实不符合契约 | A | ✅ 保留 console.error |
| 432 | 处理请求时出错 | B | → logBusinessWarning |

**说明**：第 374 行是数据约束违反，属于 A 类错误，应保留 `console.error`。

---

### `app/api/facts/restaurant/[restaurant_id]/overview/route.ts` (5处)

| 行号 | 错误信息 | 分类 | 建议处理 |
|------|---------|------|---------|
| 104 | 查询活跃订单失败 | B | → logBusinessWarning |
| 118 | 查询已完成订单失败 | B | → logBusinessWarning |
| 134 | 查询活跃资产失败 | B | → logBusinessWarning |
| 152 | 查询最后一次配送时间失败 | B | → logBusinessWarning |
| 166 | 处理请求时出错 | B | → logBusinessWarning |

---

### `app/api/facts/restaurant/[restaurant_id]/assets/route.ts` (2处)

| 行号 | 错误信息 | 分类 | 建议处理 |
|------|---------|------|---------|
| 95 | 查询设备失败 | B | → logBusinessWarning |
| 155 | 处理请求时出错 | B | → logBusinessWarning |

---

### `app/api/facts/restaurant/[restaurant_id]/latest-order/route.ts` (2处)

| 行号 | 错误信息 | 分类 | 建议处理 |
|------|---------|------|---------|
| 94 | 查询失败 | B | → logBusinessWarning |
| 107 | 处理请求时出错 | B | → logBusinessWarning |

---

### `app/api/facts/restaurant/[restaurant_id]/stats/route.ts` (3处)

| 行号 | 错误信息 | 分类 | 建议处理 |
|------|---------|------|---------|
| 89 | 查询订单数失败 | B | → logBusinessWarning |
| 110 | 查询积分余额失败 | B | → logBusinessWarning |
| 134 | 处理请求时出错 | B | → logBusinessWarning |

---

### `app/api/facts/fuel/[device_id]/stats/route.ts` (4处)

| 行号 | 错误信息 | 分类 | 建议处理 |
|------|---------|------|---------|
| 126 | 查询累计加注量失败 | B | → logBusinessWarning |
| 130 | 查询餐厅数据失败 | B | → logBusinessWarning |
| 157 | 查询燃料历史失败 | B | → logBusinessWarning |
| 179 | 处理请求时出错 | B | → logBusinessWarning |

---

### `app/api/repair/create/route.ts` (多处)

| 行号 | 错误信息 | 分类 | 建议处理 |
|------|---------|------|---------|
| 242-254 | RLS 策略错误 | B | → logBusinessWarning |
| 258-266 | 创建报修工单失败 | B | → logBusinessWarning |

---

### `app/api/equipment/rental/create/route.ts` (1处)

| 行号 | 错误信息 | 分类 | 建议处理 |
|------|---------|------|---------|
| 179 | 服务器错误 | B | → logBusinessWarning |

---

## 🪝 Hooks

### `hooks/use-financial-view-permission.ts` (1处)

| 行号 | 错误信息 | 分类 | 建议处理 |
|------|---------|------|---------|
| 69 | 金融视图权限检查错误 | B | → logBusinessWarning |

---

## 📊 统计汇总

### 按文件类型统计

| 类型 | 文件数 | console.error 总数 | B类 | C类 | A类 |
|------|--------|------------------|-----|-----|-----|
| **页面组件** | ~15 | ~100+ | ~95 | ~5 | ~5 |
| **组件** | ~5 | ~30+ | ~28 | ~0 | ~2 |
| **API 路由** | ~10 | ~30+ | ~29 | ~0 | ~1 |
| **Hooks** | 1 | 1 | 1 | 0 | 0 |
| **总计** | ~31 | ~160+ | ~153 | ~5 | ~8 |

### 按语义分类统计

| 分类 | 数量 | 占比 | 处理方式 |
|------|------|------|---------|
| **A类（系统不可恢复）** | ~8 | ~5% | ✅ 保留 console.error |
| **B类（可预期业务失败）** | ~153 | ~95% | → logBusinessWarning |
| **C类（ViewModel 转换失败）** | ~5 | ~3% | → console.warn |

---

## 🎯 优先级建议

### 优先级 1：立即修复（已规划）
- ✅ `app/user-bound/page.tsx` - 11 处

### 优先级 2：高优先级
- ⏳ `components/profile-content.tsx` - 21 处（用户核心功能）
- ⏳ `app/worker/page.tsx` - 24 处（工人端核心功能）
- ⏳ `app/(admin)/dashboard/page.tsx` - 30+ 处（管理端核心功能）

### 优先级 3：中优先级
- ⏳ `app/payment/page.tsx` - 7 处
- ⏳ `app/equipment-rental/page.tsx` - 6 处
- ⏳ `components/iot-dashboard.tsx` - 5 处

### 优先级 4：低优先级
- ⏳ 其他页面和组件
- ⏳ API 路由（服务端，不影响 Cursor 弹窗）

---

## 📝 注意事项

1. **API 路由的 console.error**：
   - 服务端代码的 `console.error` 不会触发 Cursor 客户端弹窗
   - 但为了代码一致性，建议也按规范处理

2. **Error Boundary**：
   - `components/error-boundary.tsx` 中的 `console.error` 必须保留
   - 这是真正的系统错误捕获

3. **数据约束违反**：
   - `app/api/facts/orders/[order_id]/route.ts` 第 374 行
   - 这是数据约束违反，属于 A 类错误，应保留 `console.error`

---

## 🔄 迁移计划

### 阶段 1：建立规范 ✅
- ✅ 创建 `docs/error-policy.md`
- ✅ 创建 `lib/utils/logger.ts`（待实现）
- ✅ 分析所有 console.error 使用情况

### 阶段 2：修复 user-bound 页面 ⏳
- ⏳ 修复 `app/user-bound/page.tsx` 的所有 console.error

### 阶段 3：修复核心组件 ⏳
- ⏳ `components/profile-content.tsx`
- ⏳ `app/worker/page.tsx`
- ⏳ `app/(admin)/dashboard/page.tsx`

### 阶段 4：修复其他页面 ⏳
- ⏳ 其他页面按优先级逐步修复

### 阶段 5：API 路由优化 ⏳
- ⏳ 优化 API 路由的错误处理（可选，不影响 Cursor 弹窗）
