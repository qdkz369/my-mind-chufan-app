/**
 * CardSkeleton - 卡片骨架屏组件
 * 
 * 职责：
 * - 定义卡片信息层级结构（标题 / 主数值 / 辅助说明）
 * - 控制信息显示顺序
 * - 提供卡片骨架屏的布局结构
 * 
 * ⛔ 不属于 Theme 系统：
 * - 卡片信息层级不属于 Theme，Theme 只控制视觉样式（颜色、字体、阴影、圆角）
 * - 卡片信息层级通过组件控制，不通过 Theme 控制
 * 
 * 信息层级（从上到下）：
 * 1. 标题（Title）
 * 2. 主数值（Main Value）
 * 3. 辅助说明（Description / Secondary Info）
 */

import { cn } from '@/lib/utils'
import { Skeleton } from './skeleton'

export interface CardSkeletonProps {
  /**
   * 是否显示标题
   * @default true
   */
  showTitle?: boolean
  /**
   * 是否显示主数值
   * @default true
   */
  showMainValue?: boolean
  /**
   * 是否显示辅助说明
   * @default true
   */
  showDescription?: boolean
  /**
   * 标题宽度（百分比或像素）
   * @default '60%'
   */
  titleWidth?: string
  /**
   * 主数值宽度（百分比或像素）
   * @default '40%'
   */
  mainValueWidth?: string
  /**
   * 辅助说明行数
   * @default 2
   */
  descriptionLines?: number
  className?: string
}

export function CardSkeleton({
  showTitle = true,
  showMainValue = true,
  showDescription = true,
  titleWidth = '60%',
  mainValueWidth = '40%',
  descriptionLines = 2,
  className,
}: CardSkeletonProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-2',
        // 信息层级结构：纵向排列
        // 1. 标题（顶部）
        // 2. 主数值（中间）
        // 3. 辅助说明（底部）
        className,
      )}
      style={{
        // 布局方向：纵向（flex-direction: column）
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-gap-card, 0.75rem)',
      }}
    >
      {/* 1. 标题层 */}
      {showTitle && (
        <div
          className="flex items-center justify-between"
          style={{
            // 标题布局：横向排列（标题 + 可选的操作按钮）
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Skeleton
            style={{
              width: titleWidth,
              height: '1.25rem', // 标题行高
            }}
          />
        </div>
      )}

      {/* 2. 主数值层 */}
      {showMainValue && (
        <div
          style={{
            // 主数值布局：单独一行，较大字号
            display: 'block',
          }}
        >
          <Skeleton
            style={{
              width: mainValueWidth,
              height: '2rem', // 主数值行高（较大）
            }}
          />
        </div>
      )}

      {/* 3. 辅助说明层 */}
      {showDescription && (
        <div
          className="flex flex-col gap-1"
          style={{
            // 辅助说明布局：纵向排列多行
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-gap-xs, 0.25rem)',
          }}
        >
          {Array.from({ length: descriptionLines }).map((_, index) => (
            <Skeleton
              key={index}
              style={{
                width: index === descriptionLines - 1 ? '80%' : '100%', // 最后一行稍短
                height: '0.875rem', // 辅助说明行高（较小）
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * 卡片信息层级结构常量（供其他组件参考）
 */
export const CARD_HIERARCHY = {
  /**
   * 信息显示顺序（从上到下）
   */
  order: ['title', 'mainValue', 'description'] as const,
  /**
   * 标题层级
   */
  title: {
    fontSize: 'var(--font-size-base, 1rem)',
    lineHeight: 'var(--line-height-normal, 1.5)',
    fontWeight: '600',
  },
  /**
   * 主数值层级
   */
  mainValue: {
    fontSize: 'var(--font-size-2xl, 1.5rem)',
    lineHeight: 'var(--line-height-tight, 1.25)',
    fontWeight: '700',
  },
  /**
   * 辅助说明层级
   */
  description: {
    fontSize: 'var(--font-size-sm, 0.875rem)',
    lineHeight: 'var(--line-height-normal, 1.5)',
    fontWeight: '400',
  },
} as const
