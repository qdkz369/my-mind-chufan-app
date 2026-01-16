/**
 * Section 组件
 * 
 * ⚠️ 重要：
 * - 所有 Section 组件必须声明 semanticLevel
 * - 禁止通过颜色自行表达重要性
 * - 语义层级决定视觉样式（颜色、对比度、边框等）
 */

import * as React from 'react'

import { cn } from '@/lib/utils'
import { SemanticLevel, getSemanticLevelClassName } from '@/lib/ui-semantic'

interface SectionProps extends React.ComponentProps<'section'> {
  /**
   * 语义层级（必填）
   * 
   * ⚠️ 重要：
   * - 所有 Section 组件必须声明 semanticLevel
   * - 禁止通过颜色自行表达重要性
   * - 语义层级决定视觉样式（颜色、对比度、边框等）
   */
  semanticLevel: SemanticLevel
}

const Section = React.forwardRef<HTMLElement, SectionProps>(
  ({ className, semanticLevel, ...props }, ref) => {
    const semanticClassName = getSemanticLevelClassName(semanticLevel)
    
    return (
      <section
        ref={ref}
        data-semantic-level={semanticLevel}
        className={cn(
          'border',
          semanticClassName,
          className,
        )}
        {...props}
      />
    )
  }
)
Section.displayName = 'Section'

export { Section }
