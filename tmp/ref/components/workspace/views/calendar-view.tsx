'use client'

import { useState } from 'react'
import { Button, FormControl, Text, TextInput } from '@primer/react'
import { Blankslate, Dialog } from '@primer/react/experimental'
import { PlusIcon, CalendarIcon, ClockIcon, LocationIcon } from '@primer/octicons-react'
import { useWorkspace } from '../store'
import { Surface } from '../surface'

export function CalendarView() {
  const { events, addEvent, logActivity } = useWorkspace()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [start, setStart] = useState('')
  const [duration, setDuration] = useState('30 min')

  const create = () => {
    if (!title.trim()) return
    addEvent({
      title: title.trim(),
      start: start.trim() || 'Today',
      duration: duration.trim() || '30 min',
      location: 'Meet',
      color: 'accent',
    })
    logActivity('compose', `Created event “${title.trim()}”`)
    setTitle('')
    setStart('')
    setDuration('30 min')
    setOpen(false)
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button variant="primary" leadingVisual={PlusIcon} onClick={() => setOpen(true)}>
          New event
        </Button>
      </div>

      {events.length === 0 ? (
        <Surface padding={0}>
          <Blankslate>
            <Blankslate.Visual>
              <CalendarIcon size={24} />
            </Blankslate.Visual>
            <Blankslate.Heading>No upcoming events</Blankslate.Heading>
            <Blankslate.Description>Create one to see it here.</Blankslate.Description>
          </Blankslate>
        </Surface>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {events.map((ev) => (
            <Surface key={ev.id} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div
                style={{
                  width: 4,
                  alignSelf: 'stretch',
                  borderRadius: 4,
                  backgroundColor: `var(--bgColor-${ev.color}-emphasis)`,
                }}
              />
              <div style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: 600, display: 'block' }}>
                  {ev.title}
                </Text>
                <div style={{ display: 'flex', gap: 16, marginTop: 4, flexWrap: 'wrap' }}>
                  <Meta icon={<ClockIcon size={12} />} text={`${ev.start} · ${ev.duration}`} />
                  <Meta icon={<LocationIcon size={12} />} text={ev.location} />
                </div>
              </div>
            </Surface>
          ))}
        </div>
      )}

      {open ? (
        <Dialog
          title="New event"
          subtitle="Add it to your calendar."
          onClose={() => setOpen(false)}
          footerButtons={[
            { buttonType: 'default', content: 'Cancel', onClick: () => setOpen(false) },
            { buttonType: 'primary', content: 'Create event', onClick: create },
          ]}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <FormControl required>
              <FormControl.Label>Title</FormControl.Label>
              <TextInput
                block
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Product sync"
              />
            </FormControl>
            <FormControl>
              <FormControl.Label>When</FormControl.Label>
              <TextInput
                block
                value={start}
                onChange={(e) => setStart(e.target.value)}
                placeholder="Today · 15:00"
              />
            </FormControl>
            <FormControl>
              <FormControl.Label>Duration</FormControl.Label>
              <TextInput
                block
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="30 min"
              />
            </FormControl>
          </div>
        </Dialog>
      ) : null}
    </div>
  )
}

function Meta({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 12,
        color: 'var(--fgColor-muted)',
      }}
    >
      {icon}
      {text}
    </span>
  )
}
