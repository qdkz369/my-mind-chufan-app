"use client"

// 系统设置 + 修改密码对话框：自管状态与逻辑，从 page.tsx 迁出
// 迁出 isChangePasswordDialogOpen、changePasswordForm、handleChangePassword 及 Dialog、URL action=change-password

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Lock, CheckCircle2, AlertCircle, Loader2 } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { supabase } from "@/lib/supabase"
import { logBusinessWarning } from "@/lib/utils/logger"
import { SettingsPanel } from "./settings"

export function SettingsWithDialogs() {
  const [isChangePasswordDialogOpen, setIsChangePasswordDialogOpen] = useState(false)
  const [changePasswordForm, setChangePasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [changePasswordError, setChangePasswordError] = useState<string | null>(null)
  const [changePasswordSuccess, setChangePasswordSuccess] = useState(false)

  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    const action = searchParams.get("action")
    if (action === "change-password") {
      setIsChangePasswordDialogOpen(true)
      router.replace("/dashboard", { scroll: false })
    }
  }, [searchParams, router])

  const handleChangePassword = async () => {
    setChangePasswordError(null)
    setChangePasswordSuccess(false)

    if (!changePasswordForm.currentPassword || !changePasswordForm.newPassword || !changePasswordForm.confirmPassword) {
      setChangePasswordError("请填写所有字段")
      return
    }
    if (changePasswordForm.newPassword.length < 6) {
      setChangePasswordError("新密码长度至少为6位")
      return
    }
    if (changePasswordForm.newPassword !== changePasswordForm.confirmPassword) {
      setChangePasswordError("两次输入的新密码不一致")
      return
    }

    setIsChangingPassword(true)
    try {
      if (!supabase) {
        throw new Error("Supabase 未初始化")
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !user.email) {
        throw new Error("无法获取用户信息")
      }

      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: changePasswordForm.currentPassword,
      })
      if (verifyError) {
        setChangePasswordError("当前密码错误")
        setIsChangingPassword(false)
        return
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: changePasswordForm.newPassword,
      })
      if (updateError) throw updateError

      await supabase.auth.updateUser({
        data: { is_default_password: false },
      })

      setChangePasswordSuccess(true)
      setChangePasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" })
      setTimeout(() => {
        setIsChangePasswordDialogOpen(false)
        setChangePasswordSuccess(false)
      }, 2000)
    } catch (error: any) {
      logBusinessWarning("Dashboard", "修改密码失败", error)
      setChangePasswordError(error.message || "修改密码失败，请重试")
    } finally {
      setIsChangingPassword(false)
    }
  }

  const closeDialog = () => {
    setIsChangePasswordDialogOpen(false)
    setChangePasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" })
    setChangePasswordError(null)
    setChangePasswordSuccess(false)
  }

  return (
    <>
      <SettingsPanel
        onOpenChangePasswordDialog={() => setIsChangePasswordDialogOpen(true)}
        isSupabaseConnected={!!supabase}
      />
      <Dialog open={isChangePasswordDialogOpen} onOpenChange={setIsChangePasswordDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Lock className="h-5 w-5" />
              修改密码
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              为了账户安全，请修改您的默认密码
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {changePasswordError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{changePasswordError}</AlertDescription>
              </Alert>
            )}
            {changePasswordSuccess && (
              <Alert className="bg-green-500/10 border-green-500/50 text-green-400">
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>密码修改成功！</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="currentPassword" className="text-slate-300">当前密码</Label>
              <Input
                id="currentPassword"
                type="password"
                value={changePasswordForm.currentPassword}
                onChange={(e) => setChangePasswordForm({ ...changePasswordForm, currentPassword: e.target.value })}
                placeholder="请输入当前密码"
                className="bg-slate-800 border-slate-700 text-white"
                disabled={isChangingPassword}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword" className="text-slate-300">新密码</Label>
              <Input
                id="newPassword"
                type="password"
                value={changePasswordForm.newPassword}
                onChange={(e) => setChangePasswordForm({ ...changePasswordForm, newPassword: e.target.value })}
                placeholder="请输入新密码（至少6位）"
                className="bg-slate-800 border-slate-700 text-white"
                disabled={isChangingPassword}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-slate-300">确认新密码</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={changePasswordForm.confirmPassword}
                onChange={(e) => setChangePasswordForm({ ...changePasswordForm, confirmPassword: e.target.value })}
                placeholder="请再次输入新密码"
                className="bg-slate-800 border-slate-700 text-white"
                disabled={isChangingPassword}
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleChangePassword}
                disabled={isChangingPassword}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {isChangingPassword ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    修改中...
                  </>
                ) : (
                  "确认修改"
                )}
              </Button>
              <Button onClick={closeDialog} variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800">
                取消
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
