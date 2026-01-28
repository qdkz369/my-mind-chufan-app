"use client"

import { useEffect } from "react"

/**
 * 强制可见包装器
 * 用于移除 Next.js 自动添加的 hidden 属性，确保页面内容始终可见
 */
export function ForceVisibleWrapper({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // 立即移除所有 hidden 属性
    const removeHiddenAttributes = () => {
      try {
        // 查找 body 下的所有带有 hidden 属性的 div
        const hiddenDivs = document.querySelectorAll('body > div[hidden], body > *[hidden]')
        hiddenDivs.forEach((div: any) => {
          // 检查节点是否仍然在 DOM 中
          if (div && div.isConnected && div.hasAttribute('hidden')) {
            div.removeAttribute('hidden')
            div.style.display = 'block'
            div.style.visibility = 'visible'
            div.style.opacity = '1'
          }
        })
        
        // 同时检查 body 本身
        if (document.body && document.body.hasAttribute('hidden')) {
          document.body.removeAttribute('hidden')
          document.body.style.display = 'block'
          document.body.style.visibility = 'visible'
          document.body.style.opacity = '1'
        }
      } catch (error) {
        // 静默处理错误，避免控制台刷屏
        // 这些错误通常是因为节点在操作过程中被移除了
      }
    }
    
    // 立即执行一次
    removeHiddenAttributes()
    
    // 持续监控 DOM 变化，确保 hidden 属性不会再次出现
    // 使用防抖机制，避免频繁操作 DOM
    let debounceTimer: NodeJS.Timeout | null = null
    const observer = new MutationObserver((mutations) => {
      let hasChanges = false
      mutations.forEach((mutation) => {
        try {
          if (mutation.type === 'attributes' && mutation.attributeName === 'hidden') {
            const target = mutation.target as HTMLElement
            // 检查节点是否仍然在 DOM 中
            if (target && target.isConnected && target.hasAttribute('hidden')) {
              try {
                target.removeAttribute('hidden')
                target.style.display = 'block'
                target.style.visibility = 'visible'
                target.style.opacity = '1'
                hasChanges = true
              } catch (e) {
                // 静默处理错误
              }
            }
          }
          if (mutation.type === 'childList') {
            // 只处理新增的节点，不处理删除的节点（避免 removeChild 错误）
            mutation.addedNodes.forEach((node) => {
              if (node.nodeType === 1) {
                const element = node as HTMLElement
                // 检查节点是否仍然在 DOM 中
                if (element && element.isConnected) {
                  if (element.hasAttribute('hidden')) {
                    try {
                      element.removeAttribute('hidden')
                      element.style.display = 'block'
                      element.style.visibility = 'visible'
                      element.style.opacity = '1'
                      hasChanges = true
                    } catch (e) {
                      // 静默处理错误
                    }
                  }
                  // 递归检查子元素（使用 try-catch 防止节点已被移除）
                  try {
                    const childHiddenElements = element.querySelectorAll('[hidden]')
                    childHiddenElements.forEach((child: any) => {
                      // 再次检查节点是否仍然在 DOM 中
                      if (child && child.isConnected && child.parentNode) {
                        try {
                          child.removeAttribute('hidden')
                          child.style.display = 'block'
                          child.style.visibility = 'visible'
                          child.style.opacity = '1'
                          hasChanges = true
                        } catch (e) {
                          // 静默处理错误
                        }
                      }
                    })
                  } catch (e) {
                    // 静默处理错误，避免控制台刷屏
                  }
                }
              }
            })
            // 不处理 removedNodes，避免 removeChild 错误
          }
        } catch (error) {
          // 静默处理错误，避免控制台刷屏
          // 这些错误通常是因为节点在操作过程中被移除了
        }
      })
      if (hasChanges) {
        // 使用防抖机制，避免频繁操作 DOM
        if (debounceTimer) {
          clearTimeout(debounceTimer)
        }
        debounceTimer = setTimeout(() => {
          // 使用 try-catch 包装，防止在操作过程中节点被移除
          try {
            removeHiddenAttributes()
          } catch (error) {
            // 静默处理错误
          }
        }, 100) // 100ms 防抖
      }
    })

    // 开始监控 body 及其所有子元素
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['hidden'],
    })
    
    // 标记页面已加载
    // ⚠️ 注意：这里会设置 body 的 style，但只是为了确保显示，不会干扰正常渲染
    document.body.setAttribute('data-force-visible-loaded', 'true')
    // 只设置必要的基础样式，确保可见性
    if (!document.body.style.display || document.body.style.display === 'none') {
      document.body.style.display = 'block'
    }
    if (!document.body.style.visibility || document.body.style.visibility === 'hidden') {
      document.body.style.visibility = 'visible'
    }
    if (!document.body.style.opacity || document.body.style.opacity === '0') {
      document.body.style.opacity = '1'
    }
    
    return () => {
      document.body.removeAttribute('data-force-visible-loaded')
      observer.disconnect()
    }
  }, [])

  // 使用 div 包装，并强制显示样式
  return (
    <div 
      style={{ 
        display: 'block', 
        visibility: 'visible', 
        opacity: 1,
        position: 'relative',
        zIndex: 1
      }}
    >
      {children}
    </div>
  )
}
