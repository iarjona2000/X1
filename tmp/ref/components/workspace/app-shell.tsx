'use client'

import { useState } from 'react'
import { WorkspaceProvider } from './store'
import { Sidebar, type ViewId } from './sidebar'
import { Topbar } from './topbar'
import { ChatView } from './views/chat-view'
import { AgentsView } from './views/agents-view'
import { CalendarView } from './views/calendar-view'
import { EmailView } from './views/email-view'
import { TasksView } from './views/tasks-view'
import { ActivityView } from './views/activity-view'
import { SettingsView } from './views/settings-view'

const META: Record<ViewId, { title: string; subtitle: string }> = {
  chat: {
    title: 'Agent',
    subtitle: 'Ask by voice or text — it sees the page and acts for you.',
  },
  agents: {
    title: 'Agents',
    subtitle: 'Role-based personas, each with its own tools and triggers.',
  },
  calendar: {
    title: 'Calendar',
    subtitle: 'Upcoming events pulled from your connected calendar.',
  },
  email: {
    title: 'Email',
    subtitle: 'Read, summarise, and compose without leaving the panel.',
  },
  tasks: {
    title: 'Tasks',
    subtitle: 'Everything the agent is tracking for you.',
  },
  activity: {
    title: 'Activity',
    subtitle: 'A live trace of actions written to the operation graph.',
  },
  settings: {
    title: 'Settings',
    subtitle: 'Providers, voice, and appearance.',
  },
}

function ViewSwitch({ view }: { view: ViewId }) {
  switch (view) {
    case 'chat':
      return <ChatView />
    case 'agents':
      return <AgentsView />
    case 'calendar':
      return <CalendarView />
    case 'email':
      return <EmailView />
    case 'tasks':
      return <TasksView />
    case 'activity':
      return <ActivityView />
    case 'settings':
      return <SettingsView />
  }
}

export function AppShell() {
  const [view, setView] = useState<ViewId>('chat')
  const meta = META[view]

  return (
    <WorkspaceProvider>
      <div
        style={{
          display: 'flex',
          height: '100dvh',
          overflow: 'hidden',
          backgroundColor: 'var(--bgColor-inset)',
          color: 'var(--fgColor-default)',
        }}
      >
        <Sidebar view={view} onSelect={setView} />
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            minWidth: 0,
          }}
        >
          <Topbar title={meta.title} subtitle={meta.subtitle} />
          <main
            style={{
              flex: 1,
              overflow: 'auto',
              padding: 24,
            }}
          >
            <ViewSwitch view={view} />
          </main>
        </div>
      </div>
    </WorkspaceProvider>
  )
}
