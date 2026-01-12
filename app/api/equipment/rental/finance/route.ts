// ACCESS_LEVEL: COMPANY_LEVEL
// ALLOWED_ROLES: admin, staff
// CURRENT_KEY: 无（不直接访问数据库，预留接口）
// TARGET_KEY: 待实现
// 说明：admin/staff 调用，第三方金融机构接口（预留），必须强制 company_id 过滤

import { NextResponse } from "next/server"

/**
 * POST: 第三方金融机构API接口（预留）
 * 此接口用于与第三方金融机构对接，实现设备分期付款等功能
 * 
 * 目前暂时不启用，返回模拟响应
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      order_id,
      order_number,
      total_amount,
      rental_period,
      user_info,
      equipment_info,
    } = body

    // TODO: 实现第三方金融机构API调用
    // 示例：调用支付宝、微信支付、银行等金融机构的分期付款接口
    // 
    // const financeAPI = process.env.FINANCE_API_URL
    // const apiKey = process.env.FINANCE_API_KEY
    // 
    // const response = await fetch(`${financeAPI}/installment/create`, {
    //   method: "POST",
    //   headers: {
    //     "Content-Type": "application/json",
    //     "Authorization": `Bearer ${apiKey}`,
    //   },
    //   body: JSON.stringify({
    //     order_id,
    //     order_number,
    //     amount: total_amount,
    //     period: rental_period,
    //     user: user_info,
    //     product: equipment_info,
    //   }),
    // })
    // 
    // const result = await response.json()
    // return NextResponse.json(result)

    // 暂时返回模拟响应
    return NextResponse.json({
      success: false,
      message: "第三方金融机构API接口暂未启用",
      data: {
        finance_order_id: null,
        status: "not_implemented",
        installment_plan: null,
      },
    })
  } catch (err: any) {
    console.error("[金融机构API] 错误:", err)
    return NextResponse.json(
      { error: "服务器错误", details: err.message },
      { status: 500 }
    )
  }
}

/**
 * GET: 查询第三方金融机构订单状态（预留）
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const financeOrderId = searchParams.get("finance_order_id")

    if (!financeOrderId) {
      return NextResponse.json(
        { error: "缺少 finance_order_id 参数" },
        { status: 400 }
      )
    }

    // TODO: 实现查询第三方金融机构订单状态
    // const financeAPI = process.env.FINANCE_API_URL
    // const response = await fetch(`${financeAPI}/order/${financeOrderId}`)
    // const result = await response.json()
    // return NextResponse.json(result)

    // 暂时返回模拟响应
    return NextResponse.json({
      success: false,
      message: "第三方金融机构API接口暂未启用",
      data: {
        status: "not_implemented",
      },
    })
  } catch (err: any) {
    console.error("[金融机构API] 错误:", err)
    return NextResponse.json(
      { error: "服务器错误", details: err.message },
      { status: 500 }
    )
  }
}



