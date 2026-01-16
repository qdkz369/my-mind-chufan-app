/**
 * Panel 组件
 * 
 * ⚠️ 重要：
 * - 所有 Panel 组件必须声明 semanticLevel
 * - 禁止通过颜色自行表达重要性
 * - 语义层级决定视觉样式（颜色、对比度、边框等）
 */

import * as React from 'react'

import { cn } from '@/lib/utils'
import { SemanticLevel, getSemanticLevelClassName } from '@/lib/ui-semantic'

interface PanelProps extends React.ComponentProps<'div'> {
  /**
   * 语义层级（必填）
   * 
   * ⚠️ 重要：
   * - 所有 Panel 组件必须声明 semanticLevel
   * - 禁止通过颜色自行表达重要性
   * - 语义层级决定视觉样式（颜色、对比度、边框等）
   */
  semanticLevel: SemanticLevel
}

const Panel = React.forwardRef<HTMLDivElement, PanelProps>(
  ({ className, semanticLevel, ...props }, ref) => {
    const semanticClassName = getSemanticLevelClassName(semanticLevel)
    
    return (
      <div
        ref={ref}
        data-semantic-level={semanticLevel}
        className={cn(
          'border shadow-sm',
          semanticClassName,
          className,
        )}
        style={{
          borderRadius: 'var(--radius-card)',
        }}
        {...props}
      />
    )
  }
)
Panel.displayName = 'Panel'

export { Panel }
