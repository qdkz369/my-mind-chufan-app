# SQL 文件整理指南

## 📁 建议的文件夹结构

建议创建以下文件夹来组织 SQL 文件：

```
sql/
├── 01-核心表/              # 核心业务表（orders, restaurants, devices, workers）
├── 02-设备租赁/            # 设备租赁相关表
├── 03-权限修复/            # RLS 权限修复脚本
├── 04-诊断工具/            # 诊断和检查脚本
└── 99-归档/                # 不再使用的旧脚本
```

---

## 📋 文件分类清单

### ✅ **01-核心表/** （重要，经常使用）

这些是核心业务表的创建和维护脚本：

| 文件名 | 用途 | 是否保留 |
|--------|------|----------|
| `CREATE_ORDERS_TABLE.sql` | 创建订单表 | ✅ 保留 |
| `CREATE_WORKERS_TABLE.sql` | 创建工人表（旧版） | 🗑️ 归档 |
| `CREATE_WORKERS_TABLE_SIMPLE.sql` | 创建工人表（简化版） | 🗑️ 归档 |
| `CREATE_WORKERS_TABLE_FINAL.sql` | 创建工人表（最终版） | ✅ 保留 |
| `CREATE_SERVICE_POINTS_TABLE.sql` | 创建服务点表 | ✅ 保留 |
| `database-schema.sql` | 完整数据库架构 | ✅ 保留 |
| `database-schema-devices.sql` | 设备表架构 | ✅ 保留 |
| `database-schema-delivery.sql` | 配送表架构 | ✅ 保留 |

### ✅ **02-设备租赁/** （重要，当前使用）

设备租赁相关的表创建脚本：

| 文件名 | 用途 | 是否保留 |
|--------|------|----------|
| `重建rental_orders表.sql` | **重建被删除的 rental_orders 表** | ✅ **立即使用** |
| `检查所有表状态.sql` | 检查所有表是否存在 | ✅ 保留 |
| `创建设备相关表的完整脚本.sql` | 创建 equipment 和 equipment_categories | ✅ 保留 |
| `check_and_create_rental_orders.sql` | 检查并创建 rental_orders | ✅ 保留 |
| `RENTALS_TABLE_SCHEMA.sql` | rentals 表架构 | ✅ 保留 |
| `EQUIPMENT_RENTAL_SCHEMA.sql` | 设备租赁完整架构 | ✅ 保留 |

### ✅ **03-权限修复/** （重要，故障排查时使用）

RLS 权限修复脚本：

| 文件名 | 用途 | 是否保留 |
|--------|------|----------|
| `快速验证并修复策略.sql` | **快速修复 RLS 策略** | ✅ **推荐使用** |
| `彻底修复rental_orders权限问题.sql` | 彻底修复 rental_orders 权限 | ✅ 保留 |
| `修复rental_orders表权限.sql` | 修复 rental_orders 权限（旧版） | 🗑️ 归档 |
| `CREATE_RLS_POLICY_ORDERS_USER_ID.sql` | 创建 orders 表 RLS 策略 | ✅ 保留 |
| `RLS_PERMISSIONS_CHECK.sql` | 检查 RLS 权限 | ✅ 保留 |

### ✅ **04-诊断工具/** （故障排查时使用）

诊断和检查脚本：

| 文件名 | 用途 | 是否保留 |
|--------|------|----------|
| `检查rental_orders表是否存在.sql` | 检查 rental_orders 表 | ✅ 保留 |
| `验证策略是否创建成功.sql` | 验证 RLS 策略 | ✅ 保留 |
| `诊断Supabase连接问题.sql` | 诊断连接问题 | ✅ 保留 |

### 🗑️ **99-归档/** （不再使用，但保留作为参考）

| 文件名 | 原因 |
|--------|------|
| `CREATE_WORKERS_TABLE.sql` | 已被 FINAL 版本替代 |
| `CREATE_WORKERS_TABLE_SIMPLE.sql` | 已被 FINAL 版本替代 |
| `修复rental_orders表权限.sql` | 已被"彻底修复"版本替代 |
| `database-migration-*.sql` | 迁移脚本，已完成迁移 |
| `database-schema-*-upgrade.sql` | 升级脚本，已完成升级 |

---

## 🚀 立即执行的操作步骤

### 第一步：检查表状态
在 Supabase SQL Editor 中运行：
```sql
-- 运行 "检查所有表状态.sql"
```
这会告诉你哪些表存在，哪些表不存在。

### 第二步：重建 rental_orders 表
```sql
-- 运行 "重建rental_orders表.sql"
```
这会安全地重建被删除的 `rental_orders` 表。

### 第三步：验证和修复权限
```sql
-- 运行 "快速验证并修复策略.sql"
```
这会确保 RLS 策略正确配置。

### 第四步：整理文件（可选）
1. 创建 `sql/` 文件夹
2. 创建子文件夹：`01-核心表/`, `02-设备租赁/`, `03-权限修复/`, `04-诊断工具/`, `99-归档/`
3. 按照上面的分类移动文件

---

## ⚠️ 重要提醒

1. **不要删除任何 SQL 文件**：即使移到归档文件夹，也保留作为参考
2. **执行前备份**：重要操作前建议先备份数据库
3. **测试环境优先**：重要操作先在测试环境验证
4. **版本控制**：使用 Git 管理 SQL 脚本的版本

---

## 📝 当前紧急任务

由于 `rental_orders` 表被删除，请**立即执行**：

1. ✅ 运行 `检查所有表状态.sql` - 确认表状态
2. ✅ 运行 `重建rental_orders表.sql` - 重建表
3. ✅ 运行 `快速验证并修复策略.sql` - 修复权限
4. ✅ 刷新管理端页面 - 验证功能是否恢复


