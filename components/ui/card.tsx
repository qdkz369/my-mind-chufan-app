import * as React from 'react'

import { cn } from '@/lib/utils'

function Card({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card"
      className={cn(
        'bg-card text-card-foreground flex flex-col border shadow-sm',
        className,
      )}
      style={{
        borderRadius: 'var(--radius-card)',
        padding: 'var(--space-card-padding-y, 1rem) var(--space-card-padding-x, 1rem)',
        gap: 'var(--space-gap-card, 0.75rem)',
      }}
      {...props}
    />
  )
}

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
