"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { CheckCircle2, XCircle, Loader2 } from "lucide-react"
import Link from "next/link"

function PaymentCallbackContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const paymentStatus = searchParams.get('status')
    const orderId = searchParams.get('out_trade_no')
    
    if (paymentStatus === 'success') {
      setStatus('success')
      setMessage('支付成功！订单已确认')
    } else if (paymentStatus === 'failed' || paymentStatus === 'cancel') {
      setStatus('failed')
      setMessage('支付失败或已取消')
    } else {
      setStatus('failed')
      setMessage('支付状态未知')
    }
  }, [searchParams])

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900">
      <Header />
      <div className="container mx-auto px-4 py-12">
        <Card className="max-w-md mx-auto bg-slate-900/90 border-slate-700/50 backdrop-blur-sm p-8">
          <div className="text-center space-y-6">
            {status === 'loading' && (
              <>
                <Loader2 className="h-16 w-16 text-blue-400 mx-auto animate-spin" />
                <h1 className="text-2xl font-bold text-white">处理中...</h1>
                <p className="text-slate-400">正在确认支付结果</p>
              </>
            )}
            
            {status === 'success' && (
              <>
                <CheckCircle2 className="h-16 w-16 text-green-400 mx-auto" />
                <h1 className="text-2xl font-bold text-white">支付成功</h1>
                <p className="text-slate-400">{message}</p>
                <div className="pt-4 space-y-3">
                  <Link href="/dashboard">
                    <Button className="w-full bg-blue-500 hover:bg-blue-600 text-white">
                      查看订单
                    </Button>
                  </Link>
                  <Link href="/">
                    <Button variant="outline" className="w-full border-slate-700 text-slate-300 hover:bg-slate-800">
                      返回首页
                    </Button>
                  </Link>
                </div>
              </>
            )}
            
            {status === 'failed' && (
              <>
                <XCircle className="h-16 w-16 text-red-400 mx-auto" />
                <h1 className="text-2xl font-bold text-white">支付失败</h1>
                <p className="text-slate-400">{message}</p>
                <div className="pt-4 space-y-3">
                  <Link href="/payment">
                    <Button className="w-full bg-blue-500 hover:bg-blue-600 text-white">
                      重新支付
                    </Button>
                  </Link>
                  <Link href="/">
                    <Button variant="outline" className="w-full border-slate-700 text-slate-300 hover:bg-slate-800">
                      返回首页
                    </Button>
                  </Link>
                </div>
              </>
            )}
          </div>
        </Card>
      </div>
    </main>
  )
}

export default function PaymentCallback() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-blue-400 animate-spin" />
      </div>
    }>
      <PaymentCallbackContent />
    </Suspense>
  )
}

