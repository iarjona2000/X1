import type { Icon } from '@primer/octicons-react'
import {
  TelescopeIcon,
  LawIcon,
  MegaphoneIcon,
  GraphIcon,
  CommentDiscussionIcon,
  NoteIcon,
  CodeIcon,
  MailIcon,
  BroadcastIcon,
  BeakerIcon,
} from '@primer/octicons-react'

/* ------------------------------------------------------------------ */
/* Agents — mirror the role-based personas built into the browser agent */
/* ------------------------------------------------------------------ */

export type AgentAccent =
  | 'accent'
  | 'success'
  | 'attention'
  | 'done'
  | 'severe'
  | 'danger'
  | 'sponsors'

export interface Agent {
  id: string
  name: string
  role: string
  description: string
  icon: Icon
  accent: AgentAccent
  triggers: string[]
  tools: string[]
}

export const AGENTS: Agent[] = [
  {
    id: 'research',
    name: 'Research',
    role: 'Analyst & synthesis',
    description:
      'Browses multiple sources, extracts data, and synthesises findings into a concise brief with citations.',
    icon: TelescopeIcon,
    accent: 'accent',
    triggers: ['investiga', 'busca información sobre', 'resume la web'],
    tools: ['web.search', 'page.extract', 'summarize', 'memory.write'],
  },
  {
    id: 'writer',
    name: 'Writer',
    role: 'Long-form & rewriting',
    description:
      'Drafts, rewrites, and polishes text in your voice — from emails to full documents.',
    icon: NoteIcon,
    accent: 'done',
    triggers: ['escribe', 'reescribe esto', 'redacta un borrador'],
    tools: ['page.read', 'rewrite', 'clipboard.write'],
  },
  {
    id: 'developer',
    name: 'Developer',
    role: 'Code & automation',
    description:
      'Reads code on the page, explains it, and generates snippets or automation scripts.',
    icon: CodeIcon,
    accent: 'severe',
    triggers: ['explica este código', 'genera un script', 'depura'],
    tools: ['page.read', 'code.generate', 'code.explain'],
  },
  {
    id: 'marketing',
    name: 'Marketing',
    role: 'Campaigns & copy',
    description:
      'Turns a page or product into campaign angles, ad copy, and social posts.',
    icon: MegaphoneIcon,
    accent: 'sponsors',
    triggers: ['crea una campaña', 'genera copy', 'ideas de marketing'],
    tools: ['page.extract', 'generate.copy', 'seo.analyze'],
  },
  {
    id: 'finance',
    name: 'Finance',
    role: 'Numbers & modelling',
    description:
      'Reads tables and sheets, runs quick calculations, and explains the numbers.',
    icon: GraphIcon,
    accent: 'success',
    triggers: ['analiza estos números', 'calcula', 'modela el escenario'],
    tools: ['sheet.read', 'calc', 'chart.describe'],
  },
  {
    id: 'legal',
    name: 'Legal',
    role: 'Review & summaries',
    description:
      'Summarises long documents, flags clauses, and answers questions about terms.',
    icon: LawIcon,
    accent: 'attention',
    triggers: ['resume este contrato', 'revisa las cláusulas'],
    tools: ['page.read', 'summarize', 'flag.clauses'],
  },
  {
    id: 'support',
    name: 'Support',
    role: 'Answers & triage',
    description:
      'Drafts helpful replies and triages incoming conversations by intent.',
    icon: CommentDiscussionIcon,
    accent: 'accent',
    triggers: ['responde a este cliente', 'clasifica esta consulta'],
    tools: ['thread.read', 'reply.draft', 'intent.classify'],
  },
  {
    id: 'email',
    name: 'Email',
    role: 'Inbox actions',
    description:
      'Reads, summarises, and composes email directly in your Gmail tab.',
    icon: MailIcon,
    accent: 'done',
    triggers: ['revisa mi correo', 'redacta un email', 'responde este hilo'],
    tools: ['gmail.read', 'gmail.compose', 'gmail.reply'],
  },
  {
    id: 'meeting',
    name: 'Meeting',
    role: 'Transcribe & recap',
    description:
      'Transcribes live meetings, captures action items, and writes the recap.',
    icon: BroadcastIcon,
    accent: 'severe',
    triggers: ['transcribe la reunión', 'resume la llamada'],
    tools: ['meet.transcribe', 'actions.extract', 'recap.write'],
  },
  {
    id: 'analyst',
    name: 'Analyst',
    role: 'Data & insight',
    description:
      'Explores data on the page, spots patterns, and reports the insight in plain language.',
    icon: BeakerIcon,
    accent: 'success',
    triggers: ['analiza esta página', 'qué patrones ves'],
    tools: ['page.extract', 'analyze', 'insight.report'],
  },
]

export function getAgent(id: string): Agent {
  return AGENTS.find((a) => a.id === id) ?? AGENTS[0]
}

/* ------------------------------------------------------------------ */
/* AI providers — the swappable model cascade behind the agent         */
/* ------------------------------------------------------------------ */

export type ProviderStatus = 'online' | 'degraded' | 'offline'

export interface Provider {
  id: string
  name: string
  family: string
  model: string
  status: ProviderStatus
  latencyMs: number
  local: boolean
}

export const PROVIDERS: Provider[] = [
  {
    id: 'nim-glm',
    name: 'NVIDIA NIM',
    family: 'Cloud cascade',
    model: 'GLM 5.1',
    status: 'online',
    latencyMs: 820,
    local: false,
  },
  {
    id: 'nim-nemotron',
    name: 'NVIDIA NIM',
    family: 'Cloud cascade',
    model: 'Nemotron-3 Ultra',
    status: 'online',
    latencyMs: 910,
    local: false,
  },
  {
    id: 'nim-gptoss',
    name: 'NVIDIA NIM',
    family: 'Cloud cascade',
    model: 'gpt-oss 120B',
    status: 'online',
    latencyMs: 1040,
    local: false,
  },
  {
    id: 'nim-llama',
    name: 'NVIDIA NIM',
    family: 'Cloud cascade',
    model: 'Llama 4 Maverick',
    status: 'degraded',
    latencyMs: 1620,
    local: false,
  },
  {
    id: 'nim-qwen',
    name: 'NVIDIA NIM',
    family: 'Cloud cascade',
    model: 'Qwen3 Coder 480B',
    status: 'online',
    latencyMs: 1180,
    local: false,
  },
  {
    id: 'gemini',
    name: 'Gemini',
    family: 'Cloud cascade',
    model: 'Gemini 2.5 Flash',
    status: 'online',
    latencyMs: 740,
    local: false,
  },
  {
    id: 'fcc',
    name: 'Free Claude Code',
    family: 'Fast gateway',
    model: '18-provider router',
    status: 'online',
    latencyMs: 640,
    local: false,
  },
  {
    id: 'groq',
    name: 'Groq',
    family: 'Fast gateway',
    model: 'Llama 3.3 70B',
    status: 'online',
    latencyMs: 320,
    local: false,
  },
  {
    id: 'ollama',
    name: 'Ollama',
    family: 'Local & private',
    model: 'auto-detected',
    status: 'offline',
    latencyMs: 0,
    local: true,
  },
]

/* ------------------------------------------------------------------ */
/* Seed data for the productivity surfaces                             */
/* ------------------------------------------------------------------ */

export interface CalendarEvent {
  id: string
  title: string
  start: string
  duration: string
  location: string
  color: AgentAccent
}

export const SEED_EVENTS: CalendarEvent[] = [
  {
    id: 'e1',
    title: 'Product sync',
    start: 'Today · 10:30',
    duration: '30 min',
    location: 'Meet',
    color: 'accent',
  },
  {
    id: 'e2',
    title: 'Design review',
    start: 'Today · 14:00',
    duration: '45 min',
    location: 'Meet',
    color: 'done',
  },
  {
    id: 'e3',
    title: '1:1 with Tomás',
    start: 'Tomorrow · 09:00',
    duration: '30 min',
    location: 'Meet',
    color: 'success',
  },
]

export interface EmailItem {
  id: string
  from: string
  subject: string
  preview: string
  time: string
  unread: boolean
}

export const SEED_EMAILS: EmailItem[] = [
  {
    id: 'm1',
    from: 'GitHub',
    subject: 'Your weekly digest',
    preview: '12 repositories had activity this week including primer/react…',
    time: '08:14',
    unread: true,
  },
  {
    id: 'm2',
    from: 'Tomás Calero',
    subject: 'Voice layer — interruption handling',
    preview: 'Pushed the fix for barge-in latency, can you take a look before…',
    time: 'Yesterday',
    unread: true,
  },
  {
    id: 'm3',
    from: 'Notion',
    subject: 'Comment on “Roadmap Q3”',
    preview: 'Iván mentioned you in a comment: “let’s pull the memory layer…”',
    time: 'Yesterday',
    unread: false,
  },
]

export interface TaskItem {
  id: string
  title: string
  done: boolean
  agent?: string
}

export const SEED_TASKS: TaskItem[] = [
  { id: 't1', title: 'Draft launch announcement', done: false, agent: 'writer' },
  { id: 't2', title: 'Summarise competitor pricing pages', done: false, agent: 'research' },
  { id: 't3', title: 'Review the meeting recap', done: true, agent: 'meeting' },
]

export interface ActivityEntry {
  id: string
  kind: 'search' | 'extract' | 'navigate' | 'compose' | 'memory' | 'voice'
  text: string
  time: string
}

export const SEED_ACTIVITY: ActivityEntry[] = [
  { id: 'a1', kind: 'voice', text: 'Voice command: “investiga tendencias de IA 2026”', time: '2 min ago' },
  { id: 'a2', kind: 'search', text: 'Searched the web across 3 engines', time: '2 min ago' },
  { id: 'a3', kind: 'extract', text: 'Extracted content from 6 pages', time: '1 min ago' },
  { id: 'a4', kind: 'memory', text: 'Saved synthesis to the operation graph', time: '1 min ago' },
  { id: 'a5', kind: 'compose', text: 'Drafted summary reply in Gmail', time: 'just now' },
]
