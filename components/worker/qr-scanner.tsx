"use client"

import { useState, useEffect, useRef } from "react"
import { Html5Qrcode } from "html5-qrcode"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { QrCode, X, Loader2, AlertCircle } from "lucide-react"
import { logBusinessWarning } from "@/lib/utils/logger"

interface QRScannerProps {
  onScanSuccess: (decodedText: string) => void
  onClose: () => void
  title?: string
}

export function QRScanner({ onScanSuccess, onClose, title = "扫描二维码" }: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState("")
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const isStartedRef = useRef<boolean>(false)

  useEffect(() => {
    return () => {
      // 组件卸载时停止扫描
      if (scannerRef.current) {
        scannerRef.current
          .stop()
          .then(() => {
            scannerRef.current = null
            isStartedRef.current = false
          })
          .catch(() => {
            scannerRef.current = null
            isStartedRef.current = false
          })
      } else {
        isStartedRef.current = false
      }
    }
  }, [])

  const startScan = async () => {
    if (!containerRef.current) return

    // 如果已经启动，直接返回
    if (isStartedRef.current) {
      return
    }

    setError("")
    setIsScanning(true)

    try {
      const scanner = new Html5Qrcode(containerRef.current.id)
      scannerRef.current = scanner

      await scanner.start(
        { facingMode: "environment" }, // 使用后置摄像头
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
          disableFlip: true,
          experimentalFeatures: {
            useBarCodeDetectorIfSupported: false
          }
        },
        (decodedText) => {
          // 扫描成功
          onScanSuccess(decodedText)
          stopScan()
        },
        (errorMessage) => {
          // 扫描失败（继续扫描，不显示错误）
        }
      )
      
      // 调试代码：检查 video 元素
      const video = document.querySelector('video');
      console.log('[QR DEBUG] video element:', video);
      console.log('[QR DEBUG] video tag name:', video?.tagName);
      console.log('[QR DEBUG] video width/height:', video?.videoWidth, video?.videoHeight);
      console.log('[QR DEBUG] video srcObject:', video?.srcObject);
      
      // 启动成功后设置锁
      isStartedRef.current = true
    } catch (err: any) {
      logBusinessWarning('QR Scanner', '启动扫描失败', err)
      setError(err.message || "启动扫描失败，请检查摄像头权限")
      setIsScanning(false)
      isStartedRef.current = false
    }
  }

  const stopScan = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop()
        scannerRef.current = null
        setIsScanning(false)
        isStartedRef.current = false
      } catch (err) {
        logBusinessWarning('QR Scanner', '停止扫描失败', err)
        isStartedRef.current = false
      }
    } else {
      isStartedRef.current = false
    }
  }

  const handleClose = async () => {
    await stopScan()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="bg-slate-900/95 border-slate-700/50 p-6 max-w-md w-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white">{title}</h3>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="text-slate-400 hover:text-white"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* 扫描区域 */}
        <div className="mb-4">
          <div
            id="qr-scanner-container"
            ref={containerRef}
            className="w-full aspect-square bg-slate-800 rounded-lg overflow-hidden"
          />
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-400" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* 控制按钮 */}
        <div className="flex gap-2">
          {!isScanning ? (
            <Button
              onClick={startScan}
              className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-600 hover:opacity-90 text-white"
            >
              <QrCode className="h-4 w-4 mr-2" />
              开始扫描
            </Button>
          ) : (
            <Button
              onClick={stopScan}
              variant="outline"
              className="flex-1 border-slate-700 text-slate-300 hover:bg-slate-800/50"
            >
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              停止扫描
            </Button>
          )}
          <Button
            onClick={handleClose}
            variant="outline"
            className="border-slate-700 text-slate-300 hover:bg-slate-800/50"
          >
            取消
          </Button>
        </div>

        <p className="text-xs text-slate-400 text-center mt-4">
          将二维码对准扫描框，系统将自动识别
        </p>
      </Card>
    </div>
  )
}

