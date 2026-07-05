'use client'

import { Timeline, Text } from '@primer/react'
import {
  BroadcastIcon,
  NoteIcon,
  PulseIcon,
  SearchIcon,
  TelescopeIcon,
  UnmuteIcon,
} from '@primer/octicons-react'
import type { Icon } from '@primer/octicons-react'
import { Surface } from '@/components/workspace/surface'
import { useWorkspace } from '@/components/workspace/store'
import type { ActivityEntry } from '@/lib/data'

type BadgeVariant =
  | 'default'
  | 'primary'
  | 'success'
  | 'danger'

const KIND_META: Record<
  ActivityEntry['kind'],
  { icon: Icon; variant: BadgeVariant }
> = {
  voice: { icon: UnmuteIcon, variant: 'primary' },
  search: { icon: SearchIcon, variant: 'primary' },
  extract: { icon: TelescopeIcon, variant: 'default' },
  navigate: { icon: BroadcastIcon, variant: 'danger' },
  compose: { icon: NoteIcon, variant: 'success' },
  memory: { icon: PulseIcon, variant: 'default' },
}

export function ActivityView() {
  const { activity } = useWorkspace()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <Text
          as="h2"
          style={{ fontSize: 20, fontWeight: 600, margin: 0, lineHeight: 1.2 }}
        >
          Activity &amp; memory
        </Text>
        <Text style={{ color: 'var(--fgColor-muted)', fontSize: 13 }}>
          Every tool call the agent makes is logged to its operation graph for
          transparent, replayable runs.
        </Text>
      </div>

      <Surface>
        {activity.length === 0 ? (
          <Text style={{ color: 'var(--fgColor-muted)', fontSize: 14 }}>
            No activity yet. Run a task from the Agent tab and the trace will
            appear here.
          </Text>
        ) : (
          <Timeline>
            {activity.map((entry) => {
              const meta = KIND_META[entry.kind]
              const IconEl = meta.icon
              return (
                <Timeline.Item key={entry.id}>
                  <Timeline.Badge variant={meta.variant}>
                    <IconEl />
                  </Timeline.Badge>
                  <Timeline.Body>
                    <Text style={{ fontSize: 14, color: 'var(--fgColor-default)' }}>
                      {entry.text}
                    </Text>
                    <Text
                      style={{
                        display: 'block',
                        fontSize: 12,
                        color: 'var(--fgColor-muted)',
                        marginTop: 2,
                      }}
                    >
                      {entry.time}
                    </Text>
                  </Timeline.Body>
                </Timeline.Item>
              )
            })}
          </Timeline>
        )}
      </Surface>
    </div>
  )
}
