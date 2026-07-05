'use client'

import { useState, type KeyboardEvent } from 'react'
import { Button, IconButton, Label, Text, TextInput } from '@primer/react'
import { Blankslate } from '@primer/react/experimental'
import {
  PlusIcon,
  TrashIcon,
  CheckCircleFillIcon,
  CircleIcon,
  ChecklistIcon,
} from '@primer/octicons-react'
import { getAgent } from '@/lib/data'
import { useWorkspace } from '../store'
import { Surface } from '../surface'

export function TasksView() {
  const { tasks, addTask, toggleTask, removeTask } = useWorkspace()
  const [value, setValue] = useState('')

  const submit = () => {
    if (!value.trim()) return
    addTask(value.trim())
    setValue('')
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing && e.keyCode !== 229) {
      e.preventDefault()
      submit()
    }
  }

  const open = tasks.filter((t) => !t.done)
  const done = tasks.filter((t) => t.done)

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ flex: 1 }}>
          <TextInput
            block
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Add a task or ask the agent to track something…"
            aria-label="New task"
          />
        </div>
        <Button variant="primary" leadingVisual={PlusIcon} onClick={submit}>
          Add
        </Button>
      </div>

      {tasks.length === 0 ? (
        <Surface padding={0}>
          <Blankslate>
            <Blankslate.Visual>
              <ChecklistIcon size={24} />
            </Blankslate.Visual>
            <Blankslate.Heading>No tasks yet</Blankslate.Heading>
            <Blankslate.Description>
              Add one above, or ask the agent to track a follow-up for you.
            </Blankslate.Description>
          </Blankslate>
        </Surface>
      ) : (
        <Surface padding={0} style={{ overflow: 'hidden' }}>
          {open.map((t, i) => (
            <TaskRow
              key={t.id}
              id={t.id}
              title={t.title}
              done={t.done}
              agent={t.agent}
              onToggle={toggleTask}
              onRemove={removeTask}
              last={i === open.length - 1 && done.length === 0}
            />
          ))}
          {done.length > 0 ? (
            <div
              style={{
                padding: '8px 16px',
                borderTop: open.length ? '1px solid var(--borderColor-muted)' : 'none',
                borderBottom: '1px solid var(--borderColor-muted)',
                backgroundColor: 'var(--bgColor-muted)',
              }}
            >
              <Text style={{ fontSize: 12, color: 'var(--fgColor-muted)', fontWeight: 600 }}>
                Completed · {done.length}
              </Text>
            </div>
          ) : null}
          {done.map((t, i) => (
            <TaskRow
              key={t.id}
              id={t.id}
              title={t.title}
              done={t.done}
              agent={t.agent}
              onToggle={toggleTask}
              onRemove={removeTask}
              last={i === done.length - 1}
            />
          ))}
        </Surface>
      )}
    </div>
  )
}

function TaskRow({
  id,
  title,
  done,
  agent,
  onToggle,
  onRemove,
  last,
}: {
  id: string
  title: string
  done: boolean
  agent?: string
  onToggle: (id: string) => void
  onRemove: (id: string) => void
  last: boolean
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 16px',
        borderBottom: last ? 'none' : '1px solid var(--borderColor-muted)',
      }}
    >
      <button
        onClick={() => onToggle(id)}
        aria-label={done ? 'Mark as not done' : 'Mark as done'}
        style={{
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          display: 'grid',
          placeItems: 'center',
          color: done ? 'var(--fgColor-success)' : 'var(--fgColor-muted)',
        }}
      >
        {done ? <CheckCircleFillIcon size={18} /> : <CircleIcon size={18} />}
      </button>
      <Text
        style={{
          flex: 1,
          fontSize: 14,
          color: done ? 'var(--fgColor-muted)' : 'var(--fgColor-default)',
          textDecoration: done ? 'line-through' : 'none',
        }}
      >
        {title}
      </Text>
      {agent ? <Label variant="secondary">{getAgent(agent).name}</Label> : null}
      <IconButton
        icon={TrashIcon}
        aria-label="Delete task"
        variant="invisible"
        size="small"
        onClick={() => onRemove(id)}
      />
    </div>
  )
}
