/**
 * 金融视图 - 表格化结构组件
 * 
 * 职责：
 * - 提供金融数据的表格化展示
 * - 支持金额、日期、状态等金融字段
 * - 清晰的列标题和数据类型标识
 * 
 * ⚠️ 禁止在 Facts 页面使用
 */

"use client"

import { ReactNode } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useFinanceUICheck } from "@/lib/ui-contexts"

export interface FinanceTableColumn<T = any> {
  /**
   * 列标题
   */
  header: string
  
  /**
   * 数据字段名或访问函数
   */
  accessor: keyof T | ((row: T) => ReactNode)
  
  /**
   * 列宽（可选）
   */
  width?: string
  
  /**
   * 是否右对齐（用于金额等）
   */
  alignRight?: boolean
  
  /**
   * 自定义渲染函数（可选）
   */
  render?: (value: any, row: T) => ReactNode
}

export interface FinanceTableProps<T = any> {
  /**
   * 表格标题
   */
  title?: string
  
  /**
   * 表格描述
   */
  description?: string
  
  /**
   * 表格列配置
   */
  columns: FinanceTableColumn<T>[]
  
  /**
   * 表格数据
   */
  data: T[]
  
  /**
   * 空数据提示
   */
  emptyMessage?: string
  
  /**
   * 自定义样式类名
   */
  className?: string
}

/**
 * 金融表格组件
 * 
 * 提供金融数据的表格化展示，支持金额、日期、状态等金融字段
 */
export function FinanceTable<T = any>({
  title,
  description,
  columns,
  data,
  emptyMessage = "暂无数据",
  className,
}: FinanceTableProps<T>) {
  // ⚠️ 安全检查：确保在金融 UI 上下文中使用
  const isFinanceContext = useFinanceUICheck()
  
  if (!isFinanceContext) {
    console.warn('[FinanceTable] 组件必须在 FinanceUIProvider 内使用')
  }
  
  const renderCell = (column: FinanceTableColumn<T>, row: T) => {
    let value: any
    
    if (typeof column.accessor === 'function') {
      value = column.accessor(row)
    } else {
      value = row[column.accessor]
    }
    
    if (column.render) {
      return column.render(value, row)
    }
    
    // 默认渲染
    if (value === null || value === undefined) {
      return <span className="text-muted-foreground">-</span>
    }
    
    if (typeof value === 'boolean') {
      return <Badge variant={value ? "default" : "secondary"}>{value ? "是" : "否"}</Badge>
    }
    
    return <span>{String(value)}</span>
  }
  
  const tableContent = (
    <Table>
      <TableHeader>
        <TableRow className="border-b border-border">
          {columns.map((column, index) => (
            <TableHead
              key={index}
              style={{ width: column.width }}
              className={`border-r border-border last:border-r-0 ${column.alignRight ? "text-right" : ""}`}
            >
              {column.header}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.length === 0 ? (
          <TableRow>
            <TableCell colSpan={columns.length} className="text-center text-muted-foreground border-b border-border">
              {emptyMessage}
            </TableCell>
          </TableRow>
        ) : (
          data.map((row, rowIndex) => (
            <TableRow key={rowIndex} className="border-b border-border last:border-b-0">
              {columns.map((column, colIndex) => (
                <TableCell
                  key={colIndex}
                  className={`border-r border-border last:border-r-0 ${column.alignRight ? "text-right" : ""}`}
                >
                  {renderCell(column, row)}
                </TableCell>
              ))}
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  )
  
  if (title || description) {
    return (
      <Card className={`border border-border shadow-none ${className || ''}`}>
        {title && (
          <CardHeader className="border-b border-border">
            <CardTitle>{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </CardHeader>
        )}
        <CardContent>
          {tableContent}
        </CardContent>
      </Card>
    )
  }
  
  return <div className={`border border-border rounded-md ${className || ''}`}>{tableContent}</div>
}
