'use client'

import { Heading, Text, IconButton, Label } from '@primer/react'
import { SunIcon, MoonIcon, BellIcon, SyncIcon } from '@primer/octicons-react'
import { useColorMode } from '@/components/providers'
import { useWorkspace } from './store'

export function Topbar({
  title,
  subtitle,
}: {
  title: string
  subtitle: string
}) {
  const { mode, toggle } = useColorMode()
  const { notifications } = useWorkspace()

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 24px',
        borderBottom: '1px solid var(--borderColor-default)',
        backgroundColor: 'var(--bgColor-default)',
        gap: 16,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Heading as="h1" style={{ fontSize: 18, fontWeight: 600 }}>
            {title}
          </Heading>
          <Label variant="success" size="small">
            Beta
          </Label>
        </div>
        <Text
          style={{
            fontSize: 13,
            color: 'var(--fgColor-muted)',
            display: 'block',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {subtitle}
        </Text>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <IconButton
          icon={SyncIcon}
          aria-label="Refresh data"
          variant="invisible"
        />
        <IconButton
          icon={BellIcon}
          aria-label={notifications ? 'Notifications on' : 'Notifications off'}
          variant="invisible"
        />
        <IconButton
          icon={mode === 'dark' ? SunIcon : MoonIcon}
          aria-label={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          variant="invisible"
          onClick={toggle}
        />
      </div>
    </header>
  )
}
