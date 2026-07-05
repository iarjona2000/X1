'use client'

import { useMemo, useState } from 'react'
import { ActionList, Button, Text, Textarea, TextInput } from '@primer/react'
import { Dialog } from '@primer/react/experimental'
import {
  CheckIcon,
  MailIcon,
  PaperAirplaneIcon,
  SparkleFillIcon,
} from '@primer/octicons-react'
import { Surface } from '@/components/workspace/surface'
import { useWorkspace } from '@/components/workspace/store'

export function EmailView() {
  const { emails, markRead, addEmail, logActivity } = useWorkspace()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [composeOpen, setComposeOpen] = useState(false)
  const [to, setTo] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')

  const selected = useMemo(
    () => emails.find((e) => e.id === selectedId) ?? null,
    [emails, selectedId],
  )
  const unreadCount = emails.filter((e) => e.unread).length

  function openEmail(id: string) {
    setSelectedId(id)
    markRead(id)
  }

  function draftWithAgent() {
    setBody(
      "Hola,\n\nGracias por tu mensaje. He revisado el contexto y aquí tienes un resumen de los próximos pasos.\n\nUn saludo,",
    )
  }

  function send() {
    addEmail({
      from: to || 'Me',
      subject: subject || '(no subject)',
      preview: body.slice(0, 80) || 'Sent from the agent panel.',
      time: 'now',
      unread: false,
    })
    logActivity('compose', `Sent email: "${subject || '(no subject)'}"`)
    setComposeOpen(false)
    setTo('')
    setSubject('')
    setBody('')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <Text
            as="h2"
            style={{ fontSize: 20, fontWeight: 600, margin: 0, lineHeight: 1.2 }}
          >
            Inbox
          </Text>
          <Text style={{ color: 'var(--fgColor-muted)', fontSize: 13 }}>
            {unreadCount} unread · connected to your Gmail tab
          </Text>
        </div>
        <Button
          variant="primary"
          leadingVisual={PaperAirplaneIcon}
          onClick={() => setComposeOpen(true)}
        >
          Compose
        </Button>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(280px, 1fr) minmax(0, 1.4fr)',
          gap: 16,
          alignItems: 'start',
        }}
      >
        <Surface style={{ padding: 0, overflow: 'hidden' }}>
          <ActionList>
            {emails.map((email) => (
              <ActionList.Item
                key={email.id}
                active={email.id === selectedId}
                onSelect={() => openEmail(email.id)}
              >
                <ActionList.LeadingVisual>
                  <MailIcon />
                </ActionList.LeadingVisual>
                <span
                  style={{
                    fontWeight: email.unread ? 600 : 400,
                    color: email.unread
                      ? 'var(--fgColor-default)'
                      : 'var(--fgColor-muted)',
                  }}
                >
                  {email.from}
                </span>
                <ActionList.Description variant="block">
                  <span
                    style={{
                      fontWeight: email.unread ? 600 : 400,
                      color: 'var(--fgColor-default)',
                    }}
                  >
                    {email.subject}
                  </span>
                  {' — '}
                  {email.preview}
                </ActionList.Description>
                <ActionList.TrailingVisual>{email.time}</ActionList.TrailingVisual>
              </ActionList.Item>
            ))}
          </ActionList>
        </Surface>

        <Surface style={{ minHeight: 320 }}>
          {selected ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <Text
                  as="h3"
                  style={{ fontSize: 18, fontWeight: 600, margin: 0 }}
                >
                  {selected.subject}
                </Text>
                <Text style={{ color: 'var(--fgColor-muted)', fontSize: 13 }}>
                  {selected.from} · {selected.time}
                </Text>
              </div>
              <Text style={{ fontSize: 14, lineHeight: 1.6 }}>
                {selected.preview} The agent can read the full thread in your
                Gmail tab, summarise it, and draft a reply in your voice without
                leaving this panel.
              </Text>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Button
                  variant="primary"
                  leadingVisual={PaperAirplaneIcon}
                  onClick={() => {
                    setTo(selected.from)
                    setSubject(`Re: ${selected.subject}`)
                    draftWithAgent()
                    setComposeOpen(true)
                  }}
                >
                  Reply with agent
                </Button>
                <Button leadingVisual={SparkleFillIcon}>Summarise thread</Button>
              </div>
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                height: '100%',
                minHeight: 240,
                color: 'var(--fgColor-muted)',
                textAlign: 'center',
              }}
            >
              <MailIcon size={24} />
              <Text style={{ fontSize: 14 }}>
                Select a message to read, summarise, or reply.
              </Text>
            </div>
          )}
        </Surface>
      </div>

      {composeOpen ? (
        <Dialog
          title="Compose"
          subtitle="The agent will send from your connected Gmail tab"
          onClose={() => setComposeOpen(false)}
          width="large"
          footerButtons={[
            { buttonType: 'default', content: 'Discard', onClick: () => setComposeOpen(false) },
            {
              buttonType: 'primary',
              content: 'Send',
              onClick: send,
              disabled: !to.trim() || !subject.trim(),
            },
          ]}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <TextInput
              aria-label="To"
              placeholder="To"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              block
            />
            <TextInput
              aria-label="Subject"
              placeholder="Subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              block
            />
            <Textarea
              aria-label="Message body"
              placeholder="Write your message…"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={6}
              block
              resize="vertical"
            />
            <div>
              <Button size="small" leadingVisual={SparkleFillIcon} onClick={draftWithAgent}>
                Draft with agent
              </Button>
            </div>
          </div>
        </Dialog>
      ) : null}
    </div>
  )
}
