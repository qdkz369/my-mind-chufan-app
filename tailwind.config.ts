import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
    './hooks/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // 强制覆盖 white 和 black 为语义颜色
        // 在 theme.extend.colors 中覆盖，确保 Tailwind 在编译阶段使用这些变量
        // 注意：extend 可以覆盖默认颜色值
        white: 'var(--foreground)',
        black: 'var(--background)',
      },
    },
  },
  plugins: [],
}

export default config
