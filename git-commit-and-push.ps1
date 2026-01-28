# Git 提交和推送脚本
# 用于提交订单主表同步问题修复的所有更改

Write-Host "开始 Git 操作..." -ForegroundColor Green

# 检查是否有锁文件
if (Test-Path ".git/index.lock") {
    Write-Host "发现 Git 锁文件，正在删除..." -ForegroundColor Yellow
    Remove-Item ".git/index.lock" -Force
}

# 添加所有更改的文件
Write-Host "添加所有更改的文件..." -ForegroundColor Green
git add app/api/orders/create/route.ts
git add app/api/orders/main/list/route.ts
git add app/api/user/context/route.ts
git add app/api/restaurants/current/route.ts
git add "app/(dashboard)/orders/page.tsx"
git add "app/(dashboard)/orders/create/page.tsx"
git add app/api/equipment/rental/update/route.ts

# 添加新创建的文档和脚本文件
Write-Host "添加新创建的文档和脚本文件..." -ForegroundColor Green
git add "修复订单主表同步问题.sql"
git add "诊断订单列表为空问题.sql"
git add "订单主表同步问题修复报告.md"
git add "测试账号数据完整性检查.md"

# 检查状态
Write-Host "检查 Git 状态..." -ForegroundColor Green
git status

# 提交更改
Write-Host "提交更改..." -ForegroundColor Green
$commitMessage = @"
修复订单主表同步问题

- 修复订单创建API影子写入失败问题（强制使用Service Role Key）
- 修复订单列表API客户端认证问题（支持x-restaurant-id header）
- 修复用户上下文API和餐厅API的客户端认证支持
- 修复订单列表页面的认证和错误处理
- 修复订单创建页面的认证和用户体验
- 添加订单主表同步修复SQL脚本
- 添加诊断和修复报告文档

修复内容：
1. 代码修复：强制使用Service Role Key，避免RLS策略阻止影子写入
2. 数据修复：18条历史订单已同步到order_main表
3. 关联修复：delivery_orders.main_order_id已正确关联
"@

git commit -m $commitMessage

# 推送到远程仓库
Write-Host "推送到远程仓库..." -ForegroundColor Green
git push origin main

Write-Host "完成！" -ForegroundColor Green
