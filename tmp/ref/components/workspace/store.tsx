'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react'
import {
  SEED_ACTIVITY,
  SEED_EMAILS,
  SEED_EVENTS,
  SEED_TASKS,
  type ActivityEntry,
  type CalendarEvent,
  type EmailItem,
  type TaskItem,
} from '@/lib/data'

let idCounter = 1000
const nextId = () => `id-${idCounter++}`

interface WorkspaceContextValue {
  activeAgent: string
  setActiveAgent: (id: string) => void

  tasks: TaskItem[]
  addTask: (title: string, agent?: string) => void
  toggleTask: (id: string) => void
  removeTask: (id: string) => void

  events: CalendarEvent[]
  addEvent: (event: Omit<CalendarEvent, 'id'>) => void

  emails: EmailItem[]
  addEmail: (email: Omit<EmailItem, 'id'>) => void
  markRead: (id: string) => void

  activity: ActivityEntry[]
  logActivity: (kind: ActivityEntry['kind'], text: string) => void

  autoRefresh: boolean
  setAutoRefresh: (value: boolean) => void
  notifications: boolean
  setNotifications: (value: boolean) => void
  voiceEnabled: boolean
  setVoiceEnabled: (value: boolean) => void
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null)

export function useWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext)
  if (!ctx) throw new Error('useWorkspace must be used within WorkspaceProvider')
  return ctx
}

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [activeAgent, setActiveAgent] = useState('research')
  const [tasks, setTasks] = useState<TaskItem[]>(SEED_TASKS)
  const [events, setEvents] = useState<CalendarEvent[]>(SEED_EVENTS)
  const [emails, setEmails] = useState<EmailItem[]>(SEED_EMAILS)
  const [activity, setActivity] = useState<ActivityEntry[]>(SEED_ACTIVITY)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [notifications, setNotifications] = useState(true)
  const [voiceEnabled, setVoiceEnabled] = useState(true)

  const logActivity = useCallback(
    (kind: ActivityEntry['kind'], text: string) => {
      setActivity((prev) => [
        { id: nextId(), kind, text, time: 'just now' },
        ...prev,
      ])
    },
    [],
  )

  const addTask = useCallback((title: string, agent?: string) => {
    setTasks((prev) => [{ id: nextId(), title, done: false, agent }, ...prev])
  }, [])

  const toggleTask = useCallback((id: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
    )
  }, [])

  const removeTask = useCallback((id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const addEvent = useCallback((event: Omit<CalendarEvent, 'id'>) => {
    setEvents((prev) => [...prev, { ...event, id: nextId() }])
  }, [])

  const addEmail = useCallback((email: Omit<EmailItem, 'id'>) => {
    setEmails((prev) => [{ ...email, id: nextId() }, ...prev])
  }, [])

  const markRead = useCallback((id: string) => {
    setEmails((prev) =>
      prev.map((m) => (m.id === id ? { ...m, unread: false } : m)),
    )
  }, [])

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      activeAgent,
      setActiveAgent,
      tasks,
      addTask,
      toggleTask,
      removeTask,
      events,
      addEvent,
      emails,
      addEmail,
      markRead,
      activity,
      logActivity,
      autoRefresh,
      setAutoRefresh,
      notifications,
      setNotifications,
      voiceEnabled,
      setVoiceEnabled,
    }),
    [
      activeAgent,
      tasks,
      addTask,
      toggleTask,
      removeTask,
      events,
      addEvent,
      emails,
      addEmail,
      markRead,
      activity,
      logActivity,
      autoRefresh,
      notifications,
      voiceEnabled,
    ],
  )

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  )
}
