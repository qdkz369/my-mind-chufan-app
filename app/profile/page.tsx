"use client"

import { Header } from "@/components/header"
import { BottomNavigation } from "@/components/bottom-navigation"
import dynamic from "next/dynamic"
import { Loader2 } from "lucide-react"

// 动态导入 ProfileContent，禁用 SSR，确保只在客户端加载
const ProfileContent = dynamic(
  () => import("@/components/profile-content").then((mod) => ({ default: mod.ProfileContent })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
      </div>
    ),
  }
)

export default function ProfilePage() {
  return (
    <main className="min-h-screen bg-background pb-20">
      <Header />
      <ProfileContent />
      <BottomNavigation />
    </main>
  )
}
