'use client'

import type { CSSProperties, ReactNode } from 'react'

export function Surface({
  children,
  style,
  muted,
  padding = 16,
}: {
  children: ReactNode
  style?: CSSProperties
  muted?: boolean
  padding?: number
}) {
  return (
    <div
      style={{
        backgroundColor: muted ? 'var(--bgColor-muted)' : 'var(--bgColor-default)',
        border: '1px solid var(--borderColor-default)',
        borderRadius: 'var(--borderRadius-large)',
        boxShadow: 'var(--shadow-resting-small)',
        padding,
        ...style,
      }}
    >
      {children}
    </div>
  )
}
