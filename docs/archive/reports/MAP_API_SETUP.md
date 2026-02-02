# 地图API配置说明

## 概述

客户端注册表单已集成高德地图和百度地图API，用于获取精确的经纬度和格式化地址。

## 配置步骤

### 方案一：使用高德地图API（推荐，国内更准确）

1. **注册高德开放平台账号**
   - 访问：https://lbs.amap.com/
   - 注册并登录账号

2. **创建应用并获取Key**
   - 进入控制台 → 应用管理 → 我的应用
   - 点击"创建新应用"
   - 在应用下添加Key，选择"Web服务"类型
   - 复制生成的Key

3. **配置环境变量**
   - 在项目根目录的 `.env.local` 文件中添加：
   ```env
   NEXT_PUBLIC_AMAP_KEY=你的高德地图Key
   ```

### 方案二：使用百度地图API（备选）

1. **注册百度地图开放平台账号**
   - 访问：https://lbsyun.baidu.com/
   - 注册并登录账号

2. **创建应用并获取AK**
   - 进入控制台 → 应用管理 → 我的应用
   - 点击"创建应用"
   - 应用类型选择"服务端"
   - 复制生成的AK（Access Key）

3. **配置环境变量**
   - 在项目根目录的 `.env.local` 文件中添加：
   ```env
   NEXT_PUBLIC_BAIDU_MAP_KEY=你的百度地图AK
   ```

### 方案三：使用OpenStreetMap（默认，无需配置）

如果未配置高德或百度地图Key，系统会自动使用OpenStreetMap作为备用方案。该方案无需配置，但国内地址解析精度可能较低。

## API调用优先级

系统按以下优先级调用地图API：
1. **高德地图API**（如果配置了 `NEXT_PUBLIC_AMAP_KEY`）
2. **百度地图API**（如果配置了 `NEXT_PUBLIC_BAIDU_MAP_KEY`）
3. **OpenStreetMap**（默认备用方案）

## 数据存储

定位成功后，系统会将以下数据存入 `restaurants` 表：
- `latitude` - 纬度（NUMERIC）
- `longitude` - 经度（NUMERIC）
- `location` - 坐标字符串（TEXT，格式："latitude,longitude"）
- `address` - 格式化地址（TEXT）

## 注意事项

1. **API配额限制**：高德和百度地图都有免费配额限制，请根据实际使用量选择合适的套餐
2. **Key安全**：请勿将Key提交到Git仓库，使用 `.env.local` 文件管理
3. **HTTPS要求**：生产环境建议使用HTTPS，某些地图API可能要求HTTPS
4. **跨域问题**：如果遇到跨域问题，可以考虑使用服务端代理

## 测试

配置完成后，在注册表单中点击"点击定位"按钮，系统会：
1. 获取浏览器GPS位置
2. 调用配置的地图API进行反向地理编码
3. 显示格式化地址和坐标
4. 保存到数据库

