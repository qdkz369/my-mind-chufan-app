import { createServerClient } from "@supabase/ssr"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function proxy(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("[Route Proxy] 缺少必需的环境变量")
    return NextResponse.json(
      { error: "服务器配置错误：缺少 Supabase 配置" },
      { status: 500 }
    )
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          response = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // 检查认证状态 - 使用 getUser() 从 JWT token 读取用户信息
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // 保护管理后台路由和设备相关路由：只检查是否登录，不检查角色
  const protectedRoutes = ["/dashboard", "/admin", "/device", "/devices"]
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))
  
  if (isProtectedRoute) {
    if (!user) {
      // 未登录，重定向到首页（游客首页）
      const url = request.nextUrl.clone()
      url.pathname = "/"
      return NextResponse.redirect(url)
    }
    // 已登录，允许访问（角色权限检查由前端页面完成）
  }

  // 已登录用户访问登录页时，不自动重定向（让前端处理）
  // 这样可以避免循环，同时让前端显示登录成功的信息

  return response
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*",
    "/device/:path*",
    "/devices/:path*",
    "/login",
  ],
}
