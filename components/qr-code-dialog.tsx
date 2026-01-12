"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { QRCodeSVG } from "qrcode.react"

interface QRCodeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  restaurantId: string | null
  restaurantName?: string | null
}

export function QRCodeDialog({ open, onOpenChange, restaurantId, restaurantName }: QRCodeDialogProps) {
  // 生成二维码内容（使用 restaurant_id）
  const qrValue = restaurantId || ""

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="theme-card theme-glass max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground">客户身份二维码</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 py-6">
          {restaurantName && (
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">餐厅名称</p>
              <p className="text-base font-semibold text-foreground">{restaurantName}</p>
            </div>
          )}
          {qrValue ? (
            <div className="p-4 bg-white rounded-lg">
              <QRCodeSVG
                value={qrValue}
                size={200}
                level="H"
                includeMargin={true}
                fgColor="#000000"
                bgColor="#FFFFFF"
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-[200px] text-muted-foreground">
              <p className="text-sm">无法生成二维码，请先登录</p>
            </div>
          )}
          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              扫描此二维码可快速识别您的餐厅身份
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
