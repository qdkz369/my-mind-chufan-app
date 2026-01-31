"use client"

import { Badge } from "@/components/ui/badge"
import { CheckCircle2, XCircle } from "lucide-react"

export function getSupplierStatusBadge(status: string) {
  switch (status) {
    case "active":
      return (
        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          激活
        </Badge>
      )
    case "inactive":
      return (
        <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/30">
          停用
        </Badge>
      )
    case "suspended":
      return (
        <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
          <XCircle className="h-3 w-3 mr-1" />
          暂停
        </Badge>
      )
    default:
      return <Badge>{status}</Badge>
  }
}
