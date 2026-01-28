# 清理 Next.js 构建缓存脚本
# 使用方法：在项目根目录运行此脚本

Write-Host "正在清理 Next.js 构建缓存..." -ForegroundColor Yellow

# 删除 .next 目录
if (Test-Path ".next") {
    Remove-Item -Recurse -Force ".next" -ErrorAction SilentlyContinue
    Write-Host "✓ 已删除 .next 目录" -ForegroundColor Green
} else {
    Write-Host "✓ .next 目录不存在，无需清理" -ForegroundColor Green
}

Write-Host "`n缓存清理完成！现在可以运行 npm run build" -ForegroundColor Cyan
