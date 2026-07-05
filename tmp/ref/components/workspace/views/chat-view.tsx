'use client'

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react'
import {
  ActionList,
  ActionMenu,
  Button,
  IconButton,
  Spinner,
  Text,
  Textarea,
  Token,
} from '@primer/react'
import {
  PaperAirplaneIcon,
  UnmuteIcon,
  StopIcon,
  CheckIcon,
  FileIcon,
  SearchIcon,
  DeviceCameraIcon,
  ChevronDownIcon,
  PersonIcon,
} from '@primer/octicons-react'
import { AGENTS, getAgent } from '@/lib/data'
import { planFor, type AgentStep } from '@/lib/agent'
import { useWorkspace } from '../store'

interface StepState extends AgentStep {
  status: 'pending' | 'running' | 'done'
}

interface Message {
  id: string
  role: 'user' | 'agent'
  agentId?: string
  text?: string
  steps?: StepState[]
  streaming?: boolean
}

const QUICK_ACTIONS = [
  { id: 'summarize', label: 'Summarise page', icon: FileIcon, prompt: 'Summarise the page I have open' },
  { id: 'research', label: 'Research', icon: SearchIcon, prompt: 'Research the latest on this topic' },
  { id: 'read', label: 'Read aloud', icon: UnmuteIcon, prompt: 'Read this page aloud to me' },
  { id: 'screenshot', label: 'Screenshot', icon: DeviceCameraIcon, prompt: 'Capture a screenshot of this page' },
]

let mid = 1
const newId = () => `msg-${mid++}`
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))

export function ChatView() {
  const { activeAgent, setActiveAgent, logActivity, voiceEnabled } =
    useWorkspace()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [listening, setListening] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const agent = getAgent(activeAgent)

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [messages])

  const patch = useCallback((id: string, next: Partial<Message>) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ...next } : m)),
    )
  }, [])

  const run = useCallback(
    async (query: string) => {
      if (!query.trim() || busy) return
      setBusy(true)
      setInput('')

      setMessages((prev) => [
        ...prev,
        { id: newId(), role: 'user', text: query },
      ])

      const plan = planFor(activeAgent, query)
      const agentMsgId = newId()
      const initialSteps: StepState[] = plan.steps.map((s) => ({
        ...s,
        status: 'pending',
      }))

      setMessages((prev) => [
        ...prev,
        {
          id: agentMsgId,
          role: 'agent',
          agentId: activeAgent,
          steps: initialSteps,
          streaming: true,
        },
      ])

      logActivity('voice', `Command routed to ${agent.name} agent`)

      for (let i = 0; i < initialSteps.length; i++) {
        await delay(520)
        setMessages((prev) =>
          prev.map((m) =>
            m.id === agentMsgId
              ? {
                  ...m,
                  steps: m.steps?.map((s, idx) =>
                    idx === i ? { ...s, status: 'running' } : s,
                  ),
                }
              : m,
          ),
        )
        await delay(620)
        const kind = initialSteps[i].tool
        logActivity(
          kind.includes('search')
            ? 'search'
            : kind.includes('extract') || kind.includes('read')
              ? 'extract'
              : kind.includes('memory')
                ? 'memory'
                : 'compose',
          initialSteps[i].label,
        )
        setMessages((prev) =>
          prev.map((m) =>
            m.id === agentMsgId
              ? {
                  ...m,
                  steps: m.steps?.map((s, idx) =>
                    idx === i ? { ...s, status: 'done' } : s,
                  ),
                }
              : m,
          ),
        )
      }

      await delay(300)
      patch(agentMsgId, { text: plan.answer, streaming: false })
      setBusy(false)
    },
    [activeAgent, agent.name, busy, logActivity, patch],
  )

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (
      e.key === 'Enter' &&
      !e.shiftKey &&
      !e.nativeEvent.isComposing &&
      e.keyCode !== 229
    ) {
      e.preventDefault()
      run(input)
    }
  }

  const toggleVoice = () => {
    if (!voiceEnabled) return
    if (listening) {
      setListening(false)
      return
    }
    setListening(true)
    setTimeout(() => {
      setListening(false)
      run('Investiga las últimas tendencias en IA para 2026')
    }, 1600)
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        maxWidth: 860,
        margin: '0 auto',
        gap: 16,
      }}
    >
      {/* Agent selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <ActionMenu>
          <ActionMenu.Button leadingVisual={agent.icon}>
            {agent.name} agent
          </ActionMenu.Button>
          <ActionMenu.Overlay width="medium">
            <ActionList selectionVariant="single">
              {AGENTS.map((a) => (
                <ActionList.Item
                  key={a.id}
                  selected={a.id === activeAgent}
                  onSelect={() => setActiveAgent(a.id)}
                >
                  <ActionList.LeadingVisual>
                    <a.icon />
                  </ActionList.LeadingVisual>
                  {a.name}
                  <ActionList.Description variant="block">
                    {a.role}
                  </ActionList.Description>
                </ActionList.Item>
              ))}
            </ActionList>
          </ActionMenu.Overlay>
        </ActionMenu>
        <Text style={{ fontSize: 13, color: 'var(--fgColor-muted)' }}>
          {agent.description}
        </Text>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
          paddingRight: 4,
        }}
      >
        {messages.length === 0 ? (
          <EmptyState onPick={run} />
        ) : (
          messages.map((m) => <MessageBubble key={m.id} message={m} />)
        )}
      </div>

      {/* Quick actions */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {QUICK_ACTIONS.map((q) => (
          <Token
            key={q.id}
            as="button"
            text={q.label}
            leadingVisual={q.icon}
            size="large"
            onClick={() => run(q.prompt)}
          />
        ))}
      </div>

      {/* Composer */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 8,
          border: '1px solid var(--borderColor-default)',
          borderRadius: 'var(--borderRadius-large)',
          backgroundColor: 'var(--bgColor-default)',
          padding: 8,
          boxShadow: 'var(--shadow-resting-small)',
        }}
      >
        <div style={{ flex: 1 }}>
          <Textarea
            aria-label="Message the agent"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={
              listening ? 'Listening…' : 'Ask by voice or text — it can see this page'
            }
            rows={1}
            resize="none"
            block
            disabled={busy}
          />
        </div>
        <IconButton
          icon={listening ? StopIcon : UnmuteIcon}
          aria-label={listening ? 'Stop listening' : 'Start voice input'}
          variant={listening ? 'danger' : 'invisible'}
          onClick={toggleVoice}
          disabled={busy || !voiceEnabled}
        />
        <IconButton
          icon={PaperAirplaneIcon}
          aria-label="Send message"
          variant="primary"
          onClick={() => run(input)}
          disabled={busy || !input.trim()}
        />
      </div>
    </div>
  )
}

function EmptyState({ onPick }: { onPick: (q: string) => void }) {
  const prompts = [
    'Investiga las últimas tendencias en IA para 2026',
    'Summarise this page and save it to memory',
    'Draft a reply to the last email in my inbox',
  ]
  return (
    <div
      style={{
        margin: 'auto',
        maxWidth: 480,
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 16,
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          display: 'grid',
          placeItems: 'center',
          backgroundColor: 'var(--bgColor-accent-muted)',
          color: 'var(--fgColor-accent)',
        }}
      >
        <SearchIcon size={24} />
      </div>
      <div>
        <Text style={{ fontSize: 18, fontWeight: 600, display: 'block' }}>
          What should I do?
        </Text>
        <Text style={{ fontSize: 14, color: 'var(--fgColor-muted)' }}>
          Speak or type. I read the page you&apos;re on, search the web, and run
          multi-step tasks for you.
        </Text>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
        {prompts.map((p) => (
          <Button key={p} onClick={() => onPick(p)} block alignContent="start">
            {p}
          </Button>
        ))}
      </div>
    </div>
  )
}

function MessageBubble({ message }: { message: Message }) {
  if (message.role === 'user') {
    return (
      <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
        <div
          style={{
            maxWidth: '78%',
            backgroundColor: 'var(--bgColor-accent-emphasis)',
            color: 'var(--fgColor-onEmphasis)',
            padding: '10px 14px',
            borderRadius: 'var(--borderRadius-large)',
            fontSize: 14,
            lineHeight: 1.5,
            whiteSpace: 'pre-wrap',
          }}
        >
          {message.text}
        </div>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            flexShrink: 0,
            display: 'grid',
            placeItems: 'center',
            backgroundColor: 'var(--bgColor-muted)',
            color: 'var(--fgColor-muted)',
            border: '1px solid var(--borderColor-default)',
          }}
        >
          <PersonIcon size={16} />
        </div>
      </div>
    )
  }

  const agent = getAgent(message.agentId ?? 'research')
  const AgentIconCmp = agent.icon

  return (
    <div style={{ display: 'flex', gap: 12 }}>
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          flexShrink: 0,
          display: 'grid',
          placeItems: 'center',
          backgroundColor: 'var(--bgColor-accent-muted)',
          color: 'var(--fgColor-accent)',
        }}
      >
        <AgentIconCmp size={16} />
      </div>
      <div style={{ maxWidth: '78%', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {message.steps && message.steps.length > 0 ? (
          <div
            style={{
              border: '1px solid var(--borderColor-default)',
              borderRadius: 'var(--borderRadius-medium)',
              backgroundColor: 'var(--bgColor-muted)',
              padding: 12,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            {message.steps.map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 16, display: 'grid', placeItems: 'center' }}>
                  {s.status === 'done' ? (
                    <span style={{ color: 'var(--fgColor-success)' }}>
                      <CheckIcon size={14} />
                    </span>
                  ) : s.status === 'running' ? (
                    <Spinner size="small" srText="Working" />
                  ) : (
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        border: '1.5px solid var(--borderColor-muted)',
                      }}
                    />
                  )}
                </span>
                <Text
                  style={{
                    fontSize: 13,
                    color:
                      s.status === 'pending'
                        ? 'var(--fgColor-muted)'
                        : 'var(--fgColor-default)',
                    fontWeight: s.status === 'running' ? 600 : 400,
                  }}
                >
                  {s.label}
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    color: 'var(--fgColor-muted)',
                    fontFamily: 'var(--fontStack-monospace)',
                  }}
                >
                  {s.tool}
                </Text>
              </div>
            ))}
          </div>
        ) : null}

        {message.text ? (
          <div
            style={{
              backgroundColor: 'var(--bgColor-default)',
              border: '1px solid var(--borderColor-default)',
              padding: '10px 14px',
              borderRadius: 'var(--borderRadius-large)',
              fontSize: 14,
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap',
            }}
          >
            {message.text}
          </div>
        ) : message.streaming && (!message.steps || message.steps.length === 0) ? (
          <Spinner size="small" srText="Thinking" />
        ) : null}
      </div>
    </div>
  )
}
