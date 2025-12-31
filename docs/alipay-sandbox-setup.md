# 支付宝沙箱环境配置指南

## 概述

本项目已集成支付宝沙箱环境支付功能，支持测试支付流程。正式环境接口已预留，待正式商户号申请完成后即可切换。

## 环境变量配置

在 `.env.local` 文件中添加以下配置：

### 沙箱环境（开发/测试）

```env
# 支付宝沙箱环境配置
ALIPAY_SANDBOX_APP_ID=你的沙箱AppID
ALIPAY_SANDBOX_PRIVATE_KEY=你的沙箱应用私钥
ALIPAY_SANDBOX_PUBLIC_KEY=支付宝公钥

# 基础URL（用于回调地址）
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### 正式环境（生产）

```env
# 支付宝正式环境配置
ALIPAY_APP_ID=你的正式AppID
ALIPAY_PRIVATE_KEY=你的正式应用私钥
ALIPAY_PUBLIC_KEY=支付宝正式公钥

# 基础URL（用于回调地址）
NEXT_PUBLIC_BASE_URL=https://your-domain.com
```

## 获取沙箱环境配置

1. 访问 [支付宝开放平台](https://open.alipay.com/)
2. 登录后进入"控制台" → "开发助手" → "沙箱环境"
3. 获取以下信息：
   - **AppID**：沙箱应用的应用ID
   - **应用私钥**：在"沙箱应用"中生成RSA2密钥对，下载私钥
   - **支付宝公钥**：在"沙箱应用"中查看并复制支付宝公钥

## 当前实现状态

### ✅ 已实现

- [x] 支付订单创建API (`/api/payment/alipay/create`)
- [x] 支付回调通知API (`/api/payment/alipay/notify`)
- [x] 支付结果页面 (`/payment/callback`)
- [x] 支付流程集成到客户端
- [x] 环境切换逻辑（沙箱/正式）

### ⚠️ 待完善

- [ ] RSA2签名算法实现（当前为简化版本）
- [ ] 使用支付宝官方SDK（推荐）或实现完整签名流程
- [ ] 支付回调签名验证
- [ ] 订单状态同步机制

## 使用支付宝SDK（推荐）

为了简化开发，建议使用支付宝官方SDK：

```bash
npm install alipay-sdk
```

然后在 `app/api/payment/alipay/create/route.ts` 中使用SDK：

```typescript
import AlipaySdk from 'alipay-sdk'
import AlipayFormData from 'alipay-sdk/lib/form'

const alipaySdk = new AlipaySdk({
  appId: ALIPAY_APP_ID,
  privateKey: ALIPAY_PRIVATE_KEY,
  alipayPublicKey: ALIPAY_PUBLIC_KEY,
  gateway: ALIPAY_GATEWAY,
})

// 创建支付订单
const formData = new AlipayFormData()
formData.setMethod('get')
formData.addField('bizContent', {
  outTradeNo: orderId,
  productCode: 'FAST_INSTANT_TRADE_PAY',
  totalAmount: amount.toFixed(2),
  subject,
  returnUrl,
  notifyUrl,
})

const paymentUrl = await alipaySdk.exec(
  'alipay.trade.page.pay',
  {},
  { formData }
)
```

## 测试流程

1. **配置环境变量**：按照上述说明配置沙箱环境变量
2. **启动项目**：`npm run dev`
3. **创建订单**：在支付页面选择支付宝支付
4. **跳转支付**：系统会自动跳转到支付宝沙箱支付页面
5. **使用沙箱账号**：使用支付宝提供的沙箱买家账号进行支付测试
6. **查看结果**：支付完成后会跳转回回调页面

## 沙箱测试账号

在支付宝开放平台的"沙箱环境"中可以找到：
- **买家账号**：用于支付测试
- **登录密码**：用于登录沙箱支付宝
- **支付密码**：用于支付确认

## 切换到正式环境

当正式商户号申请完成后：

1. 更新环境变量为正式环境的配置
2. 确保 `NODE_ENV=production`
3. 系统会自动使用正式环境配置
4. 更新回调地址为正式域名

## 注意事项

1. **签名安全**：私钥必须妥善保管，不要提交到代码仓库
2. **回调地址**：确保回调地址可以从外网访问（正式环境）
3. **HTTPS**：正式环境必须使用HTTPS
4. **订单号唯一性**：确保订单号（out_trade_no）唯一
5. **金额格式**：金额必须保留两位小数

## 相关文件

- `app/api/payment/alipay/create/route.ts` - 创建支付订单
- `app/api/payment/alipay/notify/route.ts` - 支付回调通知
- `app/payment/callback/page.tsx` - 支付结果页面
- `app/payment/page.tsx` - 支付页面（已集成支付流程）

