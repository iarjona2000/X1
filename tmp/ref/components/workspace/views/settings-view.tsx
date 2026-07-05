'use client'

import {
  FormControl,
  Text,
  TextInput,
  ToggleSwitch,
} from '@primer/react'
import {
  BellIcon,
  ShieldCheckIcon,
  SyncIcon,
  UnmuteIcon,
} from '@primer/octicons-react'
import type { Icon } from '@primer/octicons-react'
import { Surface } from '@/components/workspace/surface'
import { useWorkspace } from '@/components/workspace/store'

function Row({
  icon: IconEl,
  title,
  description,
  control,
}: {
  icon: Icon
  title: string
  description: string
  control: React.ReactNode
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        padding: '14px 0',
        borderBottom: '1px solid var(--borderColor-muted)',
      }}
    >
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <span style={{ color: 'var(--fgColor-muted)', marginTop: 2 }}>
          <IconEl size={16} />
        </span>
        <div>
          <Text style={{ fontSize: 14, fontWeight: 600, display: 'block' }}>
            {title}
          </Text>
          <Text style={{ fontSize: 13, color: 'var(--fgColor-muted)' }}>
            {description}
          </Text>
        </div>
      </div>
      {control}
    </div>
  )
}

export function SettingsView() {
  const {
    voiceEnabled,
    setVoiceEnabled,
    notifications,
    setNotifications,
    autoRefresh,
    setAutoRefresh,
  } = useWorkspace()

  return (
    <div
      style={{
        maxWidth: 720,
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
      }}
    >
      <div>
        <Text
          as="h2"
          style={{ fontSize: 20, fontWeight: 600, margin: 0, lineHeight: 1.2 }}
        >
          Settings
        </Text>
        <Text style={{ color: 'var(--fgColor-muted)', fontSize: 13 }}>
          Control how the agent listens, notifies, and keeps its context fresh.
        </Text>
      </div>

      <Surface>
        <Text style={{ fontSize: 13, fontWeight: 600, color: 'var(--fgColor-muted)' }}>
          Behaviour
        </Text>
        <Row
          icon={UnmuteIcon}
          title="Voice control"
          description="Wake word, live transcription, and spoken replies."
          control={
            <ToggleSwitch
              checked={voiceEnabled}
              onChange={() => setVoiceEnabled(!voiceEnabled)}
              aria-label="Toggle voice control"
              size="small"
            />
          }
        />
        <Row
          icon={BellIcon}
          title="Notifications"
          description="Alert me when a background task finishes."
          control={
            <ToggleSwitch
              checked={notifications}
              onChange={() => setNotifications(!notifications)}
              aria-label="Toggle notifications"
              size="small"
            />
          }
        />
        <Row
          icon={SyncIcon}
          title="Auto-refresh context"
          description="Re-read the active tab before each run."
          control={
            <ToggleSwitch
              checked={autoRefresh}
              onChange={() => setAutoRefresh(!autoRefresh)}
              aria-label="Toggle auto-refresh"
              size="small"
            />
          }
        />
        <div style={{ paddingTop: 14 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <span style={{ color: 'var(--fgColor-muted)', marginTop: 2 }}>
              <ShieldCheckIcon size={16} />
            </span>
            <div style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: 600, display: 'block' }}>
                Local model endpoint
              </Text>
              <Text
                style={{
                  fontSize: 13,
                  color: 'var(--fgColor-muted)',
                  display: 'block',
                  marginBottom: 8,
                }}
              >
                Route requests to a private model instead of the cloud cascade.
              </Text>
              <FormControl>
                <FormControl.Label visuallyHidden>
                  Local endpoint URL
                </FormControl.Label>
                <TextInput
                  placeholder="http://localhost:11434"
                  block
                  monospace
                />
              </FormControl>
            </div>
          </div>
        </div>
      </Surface>
    </div>
  )
}
