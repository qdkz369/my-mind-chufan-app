import * as React from 'react'

import { cn } from '@/lib/utils'
import { SemanticLevel, getSemanticLevelClassName } from '@/lib/ui-semantic'

interface CardProps extends React.ComponentProps<'div'> {
  /**
   * 语义层级（必填）
   * 
   * ⚠️ 重要：
   * - 所有 Card 组件必须声明 semanticLevel
   * - 禁止通过颜色自行表达重要性
   * - 语义层级决定视觉样式（颜色、对比度、边框等）
   */
  semanticLevel: SemanticLevel
  
  /**
   * 卡片效果类型
   * - 'glow-soft': 柔和霓虹底光感（蓝色渐变 + 模糊）
   * - 不设置则不显示效果
   * 
   * ⚠️ 重要：
   * - 此属性不属于 Theme 系统
   * - 通过 data-card-effect 属性控制
   * - 使用 ::after 伪元素实现，不影响布局
   */
  cardEffect?: 'glow-soft' | null
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, cardEffect, semanticLevel, ...props }, ref) => {
    const semanticClassName = getSemanticLevelClassName(semanticLevel)
    
    return (
      <div
        ref={ref}
        data-slot="card"
        data-semantic-level={semanticLevel}
        data-card-effect={cardEffect || undefined}
        className={cn(
          'flex flex-col border shadow-sm bg-transparent',
          semanticClassName,
          className,
        )}
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
          borderRadius: 'var(--radius-card)',
          padding: 'var(--space-card-padding-y, 1rem) var(--space-card-padding-x, 1rem)',
          gap: 'var(--space-gap-card, 0.75rem)',
        }}
        {...props}
      />
    )
  }
)
Card.displayName = 'Card'

function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        '@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6',
        className,
      )}
      style={{
        paddingLeft: 'var(--space-card-header-padding, 1rem)',
        paddingRight: 'var(--space-card-header-padding, 1rem)',
        gap: 'var(--space-gap-sm, 0.5rem)',
        paddingBottom: 'var(--space-card-header-padding, 1rem)',
      }}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-title"
      className={cn('leading-none font-semibold', className)}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-description"
      className={cn('text-muted-foreground text-sm', className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        'col-start-2 row-span-2 row-start-1 self-start justify-self-end',
        className,
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-content"
      className={cn('', className)}
      style={{
        backgroundColor: 'transparent',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        paddingLeft: 'var(--space-card-body-padding, 1rem)',
        paddingRight: 'var(--space-card-body-padding, 1rem)',
      }}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-footer"
      className={cn('flex items-center [.border-t]:pt-6', className)}
      style={{
        paddingLeft: 'var(--space-card-footer-padding, 1rem)',
        paddingRight: 'var(--space-card-footer-padding, 1rem)',
        paddingTop: 'var(--space-card-footer-padding, 1rem)',
      }}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
