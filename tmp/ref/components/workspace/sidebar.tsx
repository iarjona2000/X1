'use client'

import { NavList, Text, Label } from '@primer/react'
import {
  CommandPaletteIcon,
  HubotIcon,
  CalendarIcon,
  MailIcon,
  ChecklistIcon,
  PulseIcon,
  GearIcon,
  type Icon,
} from '@primer/octicons-react'
import { useWorkspace } from './store'

export type ViewId =
  | 'chat'
  | 'agents'
  | 'calendar'
  | 'email'
  | 'tasks'
  | 'activity'
  | 'settings'

const NAV: { id: ViewId; label: string; icon: Icon }[] = [
  { id: 'chat', label: 'Agent', icon: CommandPaletteIcon },
  { id: 'agents', label: 'Agents', icon: HubotIcon },
  { id: 'calendar', label: 'Calendar', icon: CalendarIcon },
  { id: 'email', label: 'Email', icon: MailIcon },
  { id: 'tasks', label: 'Tasks', icon: ChecklistIcon },
  { id: 'activity', label: 'Activity', icon: PulseIcon },
  { id: 'settings', label: 'Settings', icon: GearIcon },
]

export function Sidebar({
  view,
  onSelect,
}: {
  view: ViewId
  onSelect: (view: ViewId) => void
}) {
  const { tasks, emails } = useWorkspace()
  const openTasks = tasks.filter((t) => !t.done).length
  const unread = emails.filter((m) => m.unread).length

  return (
    <aside
      style={{
        width: 248,
        flexShrink: 0,
        borderRight: '1px solid var(--borderColor-default)',
        backgroundColor: 'var(--bgColor-inset)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        padding: '16px 8px',
        gap: 8,
      }}
    >
      <div style={{ padding: '4px 12px 12px' }}>
        <Text
          style={{
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--fgColor-muted)',
          }}
        >
          Workspace
        </Text>
      </div>

      <NavList aria-label="Primary" style={{ flex: 1 }}>
        {NAV.map((item) => {
          const counter =
            item.id === 'tasks'
              ? openTasks
              : item.id === 'email'
                ? unread
                : undefined
          return (
            <NavList.Item
              key={item.id}
              aria-current={view === item.id ? 'page' : undefined}
              onClick={(e) => {
                e.preventDefault()
                onSelect(item.id)
              }}
              href="#"
            >
              <NavList.LeadingVisual>
                <item.icon />
              </NavList.LeadingVisual>
              {item.label}
              {counter ? (
                <NavList.TrailingVisual>
                  <Label variant={item.id === 'email' ? 'accent' : 'default'}>
                    {counter}
                  </Label>
                </NavList.TrailingVisual>
              ) : null}
            </NavList.Item>
          )
        })}
      </NavList>

      <div
        style={{
          margin: '4px 8px 0',
          padding: 12,
          borderRadius: 'var(--borderRadius-medium)',
          border: '1px solid var(--borderColor-default)',
          backgroundColor: 'var(--bgColor-default)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: 'var(--bgColor-success-emphasis)',
            boxShadow: '0 0 0 3px var(--bgColor-success-muted)',
            flexShrink: 0,
          }}
        />
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <Text style={{ fontSize: 12, fontWeight: 600 }}>Agent online</Text>
          <Text style={{ fontSize: 11, color: 'var(--fgColor-muted)' }}>
            Local + cloud cascade
          </Text>
        </div>
      </div>
    </aside>
  )
}
