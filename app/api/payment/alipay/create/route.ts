// ACCESS_LEVEL: COMPANY_LEVEL
// ALLOWED_ROLES: admin, staff
// CURRENT_KEY: 无（不直接访问数据库）
// TARGET_KEY: Anon Key + RLS（如需要）
// 说明：admin/staff 调用，创建支付订单，必须强制 company_id 过滤

import { NextRequest, NextResponse } from 'next/server'
import { getUserContext } from "@/lib/auth/user-context"

// 环境配置
const IS_PRODUCTION = process.env.NODE_ENV === 'production'
const ALIPAY_APP_ID = IS_PRODUCTION 
  ? process.env.ALIPAY_APP_ID // 正式环境AppID
  : process.env.ALIPAY_SANDBOX_APP_ID || '2021000122671234' // 沙箱环境AppID（示例）

const ALIPAY_PRIVATE_KEY = IS_PRODUCTION
  ? process.env.ALIPAY_PRIVATE_KEY // 正式环境私钥
  : process.env.ALIPAY_SANDBOX_PRIVATE_KEY || '' // 沙箱环境私钥

const ALIPAY_PUBLIC_KEY = IS_PRODUCTION
  ? process.env.ALIPAY_PUBLIC_KEY // 正式环境公钥
  : process.env.ALIPAY_SANDBOX_PUBLIC_KEY || '' // 沙箱环境公钥

const ALIPAY_GATEWAY = IS_PRODUCTION
  ? 'https://openapi.alipay.com/gateway.do' // 正式环境网关
  : 'https://openapi.alipaydev.com/gateway.do' // 沙箱环境网关

/**
 * 创建支付宝支付订单（沙箱环境）
 * 
 * 正式环境需要：
 * 1. 配置正式环境的 AppID、私钥、公钥
 * 2. 修改 ALIPAY_GATEWAY 为正式环境网关
 * 3. 配置支付回调地址（return_url 和 notify_url）
 */
export async function POST(request: NextRequest) {
  try {
    // P0修复：强制使用统一用户上下文获取用户身份和权限
    let userContext
    try {
      userContext = await getUserContext(request)
      if (!userContext) {
        return NextResponse.json(
          {
            success: false,
            error: "未授权",
            details: "请先登录",
          },
          { status: 401 }
        )
      }
      if (userContext.role === "super_admin") {
        console.log("[支付创建API] Super Admin 访问，跳过多租户过滤")
      }
    } catch (error: any) {
      const errorMessage = error.message || "未知错误"
      if (errorMessage.includes("未登录")) {
        return NextResponse.json(
          {
            success: false,
            error: "未授权",
            details: "请先登录",
          },
          { status: 401 }
        )
      }
      return NextResponse.json(
        {
          success: false,
          error: "权限不足",
          details: errorMessage,
        },
        { status: 403 }
      )
    }

    // P0修复：强制验证 companyId（super_admin 除外）
    if (!userContext.companyId && userContext.role !== "super_admin") {
      return NextResponse.json(
        {
          success: false,
          error: "权限不足",
          details: "用户未关联任何公司",
        },
        { status: 403 }
      )
    }
    const body = await request.json()
    const { orderId, amount, subject, returnUrl, notifyUrl } = body

    if (!orderId || !amount || !subject) {
      return NextResponse.json(
        { error: '缺少必要参数：orderId, amount, subject' },
        { status: 400 }
      )
    }

    // 沙箱环境：使用模拟支付流程
    if (!IS_PRODUCTION) {
      // 生成支付链接（沙箱环境可以直接跳转到支付宝沙箱支付页面）
      const paymentUrl = await createSandboxPayment({
        orderId,
        amount,
        subject,
        returnUrl: returnUrl || `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/payment/callback?status=success`,
        notifyUrl: notifyUrl || `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/payment/alipay/notify`,
      })

      return NextResponse.json({
        success: true,
        paymentUrl,
        orderId,
        isSandbox: true,
        message: '沙箱环境：请使用支付宝沙箱账号进行支付测试',
      })
    }

    // 正式环境：调用支付宝API创建支付订单
    // TODO: 实现正式环境的支付订单创建
    // const paymentUrl = await createProductionPayment({
    //   orderId,
    //   amount,
    //   subject,
    //   returnUrl,
    //   notifyUrl,
    // })

    return NextResponse.json({
      error: '正式环境支付接口待实现',
    }, { status: 501 })

  } catch (error: any) {
    console.error('[Alipay Payment] 创建支付订单失败:', error)
    return NextResponse.json(
      { error: error.message || '创建支付订单失败' },
      { status: 500 }
    )
  }
}

/**
 * 创建沙箱环境支付订单
 * 
 * 注意：这是一个简化版本，实际使用时需要：
 * 1. 配置真实的沙箱AppID和密钥
 * 2. 实现RSA2签名算法
 * 3. 使用支付宝SDK或正确调用API
 * 
 * 当前实现：返回一个模拟的支付URL，用于测试流程
 */
async function createSandboxPayment(params: {
  orderId: string
  amount: number
  subject: string
  returnUrl: string
  notifyUrl: string
}) {
  const { orderId, amount, subject, returnUrl, notifyUrl } = params

  // 沙箱环境：生成支付链接
  // 注意：实际使用时需要配置真实的沙箱AppID和密钥，并实现签名
  const baseUrl = ALIPAY_GATEWAY
  const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0]
  
  // 构建支付参数（简化版，实际需要RSA2签名）
  const bizContent = {
    out_trade_no: orderId,
    product_code: 'FAST_INSTANT_TRADE_PAY',
    total_amount: amount.toFixed(2),
    subject,
    return_url: returnUrl,
    notify_url: notifyUrl,
  }

  // TODO: 实现RSA2签名
  // const sign = generateRSASignature({
  //   app_id: ALIPAY_APP_ID,
  //   method: 'alipay.trade.page.pay',
  //   format: 'JSON',
  //   charset: 'utf-8',
  //   sign_type: 'RSA2',
  //   timestamp,
  //   version: '1.0',
  //   biz_content: JSON.stringify(bizContent),
  // }, ALIPAY_PRIVATE_KEY)

  const paymentParams = new URLSearchParams({
    app_id: ALIPAY_APP_ID || '2021000122671234',
    method: 'alipay.trade.page.pay',
    format: 'JSON',
    charset: 'utf-8',
    sign_type: 'RSA2',
    timestamp,
    version: '1.0',
    biz_content: JSON.stringify(bizContent),
    // sign, // TODO: 添加签名
  })

  // 沙箱环境支付页面URL
  // 注意：由于没有实现签名，这个URL可能无法直接使用
  // 建议使用支付宝官方SDK或实现完整的签名流程
  const sandboxPaymentUrl = `${baseUrl}?${paymentParams.toString()}`

  console.log('[Alipay Sandbox] 生成支付URL:', sandboxPaymentUrl)
  console.log('[Alipay Sandbox] 订单信息:', { orderId, amount, subject })

  return sandboxPaymentUrl
}

/**
 * 创建正式环境支付订单
 * TODO: 实现正式环境的支付订单创建
 * 需要：
 * 1. 使用正式环境的AppID和密钥
 * 2. 实现RSA2签名
 * 3. 调用支付宝API
 */
async function createProductionPayment(params: {
  orderId: string
  amount: number
  subject: string
  returnUrl: string
  notifyUrl: string
}) {
  // TODO: 实现正式环境支付逻辑
  throw new Error('正式环境支付接口待实现')
}

