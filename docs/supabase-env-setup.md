# Supabase 环境变量配置指南

## 问题说明

如果遇到 "Supabase环境变量未配置" 错误，需要配置 Supabase 环境变量。

## 解决方案

### 方案一：使用环境变量（推荐）

#### 步骤 1：获取 Supabase 凭证

1. **登录 Supabase Dashboard**
   - 访问：https://supabase.com/dashboard
   - 使用您的账号登录

2. **选择项目**
   - 在左侧项目列表中选择您的项目

3. **获取 Project URL**
   - 点击左侧菜单 **Settings** (设置)
   - 选择 **API**
   - 在 **Project URL** 部分，复制 URL
   - 格式类似：`https://xxxxxxxxxxxxx.supabase.co`

4. **获取 Anon Key**
   - 在同一个页面（Settings -> API）
   - 找到 **Project API keys** 部分
   - 复制 **anon public** 密钥（不是 service_role key！）
   - 格式类似：`eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

#### 步骤 2：创建环境变量文件

1. **在项目根目录创建 `.env.local` 文件**
   ```bash
   # Windows PowerShell
   New-Item -Path .env.local -ItemType File
   
   # 或者直接在文件管理器中创建
   ```

2. **编辑 `.env.local` 文件，添加以下内容：**
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   ```

3. **替换为您的实际值：**
   - 将 `https://your-project-id.supabase.co` 替换为您从 Supabase Dashboard 复制的 Project URL
   - 将 `your-anon-key-here` 替换为您从 Supabase Dashboard 复制的 anon public 密钥

#### 步骤 3：重启开发服务器

配置环境变量后，需要重启 Next.js 开发服务器：

1. **停止当前服务器**
   - 在运行 `npm run dev` 的终端按 `Ctrl + C`

2. **重新启动服务器**
   ```bash
   npm run dev
   ```

3. **验证配置**
   - 刷新浏览器页面
   - 点击"模拟获取"按钮
   - 应该不再出现环境变量错误

### 方案二：使用后备值（临时方案）

如果暂时无法配置环境变量，系统会使用后备值（已在 `lib/supabase.ts` 中配置）。但请注意：

- ⚠️ 后备值仅用于开发测试
- ⚠️ 生产环境必须配置正确的环境变量
- ⚠️ 后备值可能不是您的项目凭证

## 验证配置

### 方法 1：检查控制台日志

启动开发服务器后，查看终端输出，应该看到：

```
[Supabase] 初始化配置:
[Supabase] URL: 使用环境变量  (或 使用后备值)
[Supabase] Key: 使用环境变量（已隐藏） (或 使用后备值)
[Supabase] 客户端初始化成功
```

### 方法 2：测试 API

1. 打开浏览器开发者工具（F12）
2. 切换到 **Console** 标签
3. 点击"模拟获取"按钮
4. 查看是否有错误信息

## 常见问题

### Q1: 找不到 `.env.local` 文件？

**A:** 在项目根目录（与 `package.json` 同级）创建该文件。如果使用 VS Code，可以：
- 右键点击项目根目录
- 选择 "New File"
- 输入文件名：`.env.local`

### Q2: 配置后仍然报错？

**A:** 请检查：
1. 文件是否命名为 `.env.local`（注意前面的点）
2. 环境变量名称是否正确（`NEXT_PUBLIC_SUPABASE_URL` 和 `NEXT_PUBLIC_SUPABASE_ANON_KEY`）
3. 是否重启了开发服务器
4. 值是否正确（没有多余的空格或引号）

### Q3: 如何确认环境变量已加载？

**A:** 在代码中临时添加：
```typescript
console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
console.log('Key:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '已设置' : '未设置')
```

### Q4: 生产环境如何配置？

**A:** 根据部署平台配置：
- **Vercel**: 在项目设置 -> Environment Variables 中添加
- **Netlify**: 在 Site settings -> Environment variables 中添加
- **其他平台**: 参考平台文档配置环境变量

## 安全提示

⚠️ **重要：**
- 不要将 `.env.local` 文件提交到 Git（已在 `.gitignore` 中忽略）
- 不要将 Supabase 密钥分享给他人
- 生产环境使用 `service_role` key 时，确保服务器端安全

## 需要帮助？

如果按照以上步骤仍无法解决问题，请检查：
1. Supabase 项目是否正常运行
2. 网络连接是否正常
3. 浏览器控制台是否有其他错误信息

