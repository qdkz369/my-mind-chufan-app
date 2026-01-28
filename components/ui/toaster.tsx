'use client'

import * as React from 'react'
import { useToast } from '@/hooks/use-toast'
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from '@/components/ui/toast'

/**
 * 避免将对象当作 React 子节点渲染，防止 "Cannot convert object to primitive value"。
 * 仅当为原始值或 ReactNode 时原样返回，否则转为安全字符串。
 */
function ensureReactText(node: React.ReactNode): React.ReactNode {
  if (node == null || typeof node === 'string' || typeof node === 'number' || typeof node === 'boolean') {
    return node
  }
  if (React.isValidElement(node)) {
    return node
  }
  if (typeof node === 'object') {
    try {
      return String(node)
    } catch {
      return '[无法显示]'
    }
  }
  return node
}

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        const safeTitle = title != null ? ensureReactText(title) : null
        const safeDescription = description != null ? ensureReactText(description) : null
        return (
          <Toast key={id} {...props}>
            <div className="grid gap-1">
              {safeTitle && <ToastTitle>{safeTitle}</ToastTitle>}
              {safeDescription && (
                <ToastDescription>{safeDescription}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
