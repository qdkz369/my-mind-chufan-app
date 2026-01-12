// ACCESS_LEVEL: PUBLIC (公开API)
// ALLOWED_ROLES: 无（公开访问，由支付宝调用）
// CURRENT_KEY: Anon Key (supabase)
// TARGET_KEY: Anon Key + RLS
// 说明：公开API，用于接收支付宝支付回调，无需权限验证（但需要验证签名）

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

/**
 * 支付宝支付回调通知接口
 * 用于接收支付宝的异步支付结果通知
 * 
 * 正式环境需要：
 * 1. 验证签名
 * 2. 验证订单状态
 * 3. 更新订单状态
 */
export async function POST(request: NextRequest) {
  try {
    // 确保Body只被读取一次：先读取为文本并存储到变量
    const bodyText = await request.text()
    const params: Record<string, string> = {}
    
    // 解析URL编码的表单数据（支付宝回调使用URL编码格式）
    const urlParams = new URLSearchParams(bodyText)
    urlParams.forEach((value, key) => {
      params[key] = value
    })

    console.log('[Alipay Notify] 收到支付回调:', params)

    // 沙箱环境：简化处理
    if (process.env.NODE_ENV !== 'production') {
      const orderId = params.out_trade_no
      const tradeStatus = params.trade_status || 'TRADE_SUCCESS'
      
      if (tradeStatus === 'TRADE_SUCCESS' && orderId) {
        // 更新订单状态（需要判断订单类型）
        if (supabase) {
          // 先尝试更新 delivery_orders（燃料配送订单）
          const { error: deliveryError } = await supabase
            .from('delivery_orders')
            .update({ 
              status: 'paid',
              updated_at: new Date().toISOString(),
            })
            .eq('id', orderId)
          
          // 如果 delivery_orders 中不存在，尝试更新 repair_orders（报修工单）
          if (deliveryError) {
            await supabase
              .from('repair_orders')
              .update({ 
                status: 'paid',
                updated_at: new Date().toISOString(),
              })
              .eq('id', orderId)
          }
        }
        
        console.log('[Alipay Notify] 沙箱环境：订单支付成功', orderId)
      }

      // 返回success给支付宝
      return new NextResponse('success', { status: 200 })
    }

    // 正式环境：验证签名和订单状态
    // TODO: 实现正式环境的签名验证
    // const isValid = verifyAlipaySignature(params)
    // if (!isValid) {
    //   return new NextResponse('signature verification failed', { status: 400 })
    // }

    const orderId = params.out_trade_no
    const tradeStatus = params.trade_status

    if (tradeStatus === 'TRADE_SUCCESS' && orderId) {
      // 更新订单状态（需要判断订单类型）
      if (supabase) {
        // 先尝试更新 delivery_orders（燃料配送订单）
        const { error: deliveryError } = await supabase
          .from('delivery_orders')
          .update({ 
            status: 'paid',
            updated_at: new Date().toISOString(),
          })
          .eq('id', orderId)
        
        // 如果 delivery_orders 中不存在，尝试更新 repair_orders（报修工单）
        if (deliveryError) {
          await supabase
            .from('repair_orders')
            .update({ 
              status: 'paid',
              updated_at: new Date().toISOString(),
            })
            .eq('id', orderId)
        }
      }
      
      console.log('[Alipay Notify] 订单支付成功', orderId)
    }

    // 返回success给支付宝
    return new NextResponse('success', { status: 200 })

  } catch (error: any) {
    console.error('[Alipay Notify] 处理支付回调失败:', error)
    return new NextResponse('error', { status: 500 })
  }
}

/**
 * 验证支付宝签名
 * TODO: 实现正式环境的签名验证
 */
function verifyAlipaySignature(params: Record<string, string>): boolean {
  // TODO: 实现RSA2签名验证
  return true
}

