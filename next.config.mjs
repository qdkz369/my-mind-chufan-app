/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      { source: '/favicon.ico', destination: '/icon.svg', permanent: false },
    ]
  },
  typescript: {
    // ⚠️ P0修复：移除 ignoreBuildErrors，确保类型安全
    // 如果构建时出现类型错误，需要修复后再部署
    ignoreBuildErrors: false,
  },
  images: {
    unoptimized: true,
  },
  // 确保环境变量被正确加载
  env: {
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },
}

export default nextConfig
