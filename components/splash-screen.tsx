"use client"

/**
 * 品牌能量波纹启动动画 (Brand Energy Pulse Splash Screen)
 * 
 * 动画序列：
 * 1. 灶小蜂显现：从 scale(0.8) 放大到 scale(1)，opacity 从 0 到 1，持续 0.5s
 * 2. 能量波纹：从腹部中心向外扩散 5 道线性波纹，持续 1.2s，各波纹延迟 0.2s
 * 3. 背景过渡：Splash Screen 淡出，页面内容淡入，持续 0.3s
 */

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"

interface SplashScreenProps {
  onComplete: () => void
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [showRipples, setShowRipples] = useState(false)
  const [isExiting, setIsExiting] = useState(false)

  useEffect(() => {
    // 步骤 1: 灶小蜂显现后，触发波纹动画
    const rippleTimer = setTimeout(() => {
      setShowRipples(true)
    }, 500) // 0.5s 后开始波纹

    // 步骤 2: 波纹动画结束后，开始淡出
    // 总时长：0.5s (显现) + 1.2s (最后一道波纹) + 0.2s (延迟) = 1.9s
    const exitTimer = setTimeout(() => {
      setIsExiting(true)
      // 淡出动画结束后，调用 onComplete
      setTimeout(() => {
        onComplete()
      }, 300) // 0.3s 淡出时间
    }, 500 + 1200 + 200) // 0.5s 显现 + 1.2s 波纹 + 0.2s 延迟

    return () => {
      clearTimeout(rippleTimer)
      clearTimeout(exitTimer)
    }
  }, [onComplete])

  // 波纹配置：5 道波纹，每道延迟 0.2s
  const ripples = Array.from({ length: 5 }, (_, i) => i)

  return (
    <AnimatePresence>
      {!isExiting && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="splash-screen fixed inset-0 z-[9999] flex items-center justify-center bg-background"
        >
          {/* 灶小蜂 Logo 和波纹容器 */}
          <div className="relative w-24 h-24 flex items-center justify-center">
            {/* 灶小蜂 Logo */}
            <motion.img
              src="/assets/chef-bee-logo.svg"
              alt="灶小蜂 Logo"
              className="relative z-10 w-24 h-24"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{
                duration: 0.5,
                ease: [0.34, 1.56, 0.64, 1], // 弹性缓动
              }}
            />

            {/* 能量波纹容器 - 从腹部中心（Logo 中心）向外扩散 */}
            {showRipples && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                {ripples.map((index) => (
                  <motion.div
                    key={index}
                    className="absolute rounded-full"
                    style={{
                      width: "96px",
                      height: "96px",
                      border: "2px solid",
                      borderColor: "var(--accent, #007AFF)",
                      // 流光效果：使用 box-shadow 创建光晕
                      boxShadow: `
                        0 0 0 0 var(--accent, #007AFF),
                        0 0 10px var(--accent, #007AFF),
                        0 0 20px rgba(var(--accent-rgb, 0, 122, 255), 0.5)
                      `,
                    }}
                    initial={{
                      scale: 0,
                      opacity: 1,
                    }}
                    animate={{
                      scale: 3,
                      opacity: [1, 0.8, 0.4, 0],
                    }}
                    transition={{
                      duration: 1.2,
                      delay: index * 0.2,
                      ease: "easeOut",
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
