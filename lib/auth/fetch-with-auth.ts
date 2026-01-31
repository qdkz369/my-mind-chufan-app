/**
 * 带认证的 fetch 封装
 *
 * 前端 Supabase 默认把 session 存在 localStorage，请求 /api 时不会自动带 Cookie，
 * 导致服务端 getUserContext 读不到会话。本封装在请求头中附带 Authorization: Bearer <access_token>，
 * 使 API 能通过 Bearer 路径识别已登录用户。
 */

import { supabase } from "@/lib/supabase"

export async function fetchWithAuth(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const headers = new Headers(init?.headers)

  if (typeof window !== "undefined" && supabase) {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (session?.access_token) {
        headers.set("Authorization", `Bearer ${session.access_token}`)
      }
    } catch {
      // 忽略获取 session 失败（如未登录）
    }
  }

  return fetch(input, {
    ...init,
    credentials: init?.credentials ?? "include",
    headers,
  })
}
