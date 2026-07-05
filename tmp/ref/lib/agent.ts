import { getAgent } from './data'

export interface AgentStep {
  tool: string
  label: string
  detail: string
}

export interface AgentPlan {
  steps: AgentStep[]
  answer: string
}

const STEP_LIBRARY: Record<string, AgentStep> = {
  'web.search': {
    tool: 'web.search',
    label: 'Searching the web',
    detail: 'Querying 3 engines and de-duplicating results',
  },
  'page.extract': {
    tool: 'page.extract',
    label: 'Reading the page',
    detail: 'Extracting the main content and structured data',
  },
  'page.read': {
    tool: 'page.read',
    label: 'Reading the page',
    detail: 'Parsing the visible DOM into clean text',
  },
  summarize: {
    tool: 'summarize',
    label: 'Synthesising',
    detail: 'Condensing findings into key points',
  },
  'memory.write': {
    tool: 'memory.write',
    label: 'Saving to memory',
    detail: 'Writing the result to the operation graph',
  },
  rewrite: {
    tool: 'rewrite',
    label: 'Rewriting',
    detail: 'Adapting tone and structure to your voice',
  },
  'code.generate': {
    tool: 'code.generate',
    label: 'Generating code',
    detail: 'Producing a snippet from the requirements',
  },
  'code.explain': {
    tool: 'code.explain',
    label: 'Explaining code',
    detail: 'Walking through the logic line by line',
  },
  'generate.copy': {
    tool: 'generate.copy',
    label: 'Drafting copy',
    detail: 'Creating angles and variations',
  },
  'seo.analyze': {
    tool: 'seo.analyze',
    label: 'Analysing SEO',
    detail: 'Checking keywords and structure',
  },
  calc: {
    tool: 'calc',
    label: 'Calculating',
    detail: 'Running the numbers',
  },
  'sheet.read': {
    tool: 'sheet.read',
    label: 'Reading the sheet',
    detail: 'Parsing rows and columns',
  },
  'chart.describe': {
    tool: 'chart.describe',
    label: 'Describing the chart',
    detail: 'Interpreting the visualisation',
  },
  'flag.clauses': {
    tool: 'flag.clauses',
    label: 'Flagging clauses',
    detail: 'Highlighting terms that need attention',
  },
  'thread.read': {
    tool: 'thread.read',
    label: 'Reading the thread',
    detail: 'Loading conversation context',
  },
  'reply.draft': {
    tool: 'reply.draft',
    label: 'Drafting a reply',
    detail: 'Composing a helpful response',
  },
  'intent.classify': {
    tool: 'intent.classify',
    label: 'Classifying intent',
    detail: 'Routing by detected topic',
  },
  'gmail.read': {
    tool: 'gmail.read',
    label: 'Reading Gmail',
    detail: 'Loading recent messages',
  },
  'gmail.compose': {
    tool: 'gmail.compose',
    label: 'Composing email',
    detail: 'Opening a draft in your inbox',
  },
  'gmail.reply': {
    tool: 'gmail.reply',
    label: 'Replying',
    detail: 'Drafting a reply in the open thread',
  },
  'meet.transcribe': {
    tool: 'meet.transcribe',
    label: 'Transcribing',
    detail: 'Capturing the live audio',
  },
  'actions.extract': {
    tool: 'actions.extract',
    label: 'Extracting actions',
    detail: 'Finding decisions and to-dos',
  },
  'recap.write': {
    tool: 'recap.write',
    label: 'Writing recap',
    detail: 'Summarising the meeting',
  },
  analyze: {
    tool: 'analyze',
    label: 'Analysing',
    detail: 'Looking for patterns and outliers',
  },
  'insight.report': {
    tool: 'insight.report',
    label: 'Reporting insight',
    detail: 'Turning findings into plain language',
  },
  'clipboard.write': {
    tool: 'clipboard.write',
    label: 'Copying result',
    detail: 'Placing the output on your clipboard',
  },
}

const ANSWERS: Record<string, (q: string) => string> = {
  research: (q) =>
    `Here's what I found on "${trim(q)}". I searched across multiple engines and read the top sources:\n\n• The strongest signal points to rapid consolidation around a few key players.\n• Two independent sources corroborate the trend, one is an outlier worth noting.\n• I saved the full synthesis to memory so you can revisit it later.\n\nWant me to turn this into a short brief or a slide?`,
  writer: (q) =>
    `Here's a first draft for "${trim(q)}":\n\nI kept the tone clear and direct, front-loaded the key message, and tightened the closing. I can make it warmer, shorter, or more formal — just say the word and I'll rewrite it in place.`,
  developer: (q) =>
    `On "${trim(q)}": I read the code on the page and here's the approach.\n\n• The core logic is sound; the edge case is the empty-input path.\n• I generated a small helper you can drop in.\n• I can also add tests or wire it into the existing module.`,
  marketing: (q) =>
    `Campaign angles for "${trim(q)}":\n\n1. Lead with the outcome, not the feature.\n2. A short social variant for reach.\n3. A benefit-driven headline for the landing hero.\n\nI can expand any of these into full copy.`,
  finance: (q) =>
    `On "${trim(q)}": I read the numbers and ran the calculation.\n\n• The headline figure checks out.\n• Growth is steady but the margin line is the one to watch.\n• I can model an optimistic and a conservative scenario next.`,
  legal: (q) =>
    `Summary for "${trim(q)}":\n\nThe document is mostly standard. I flagged two clauses worth a closer read — the termination window and the liability cap. Nothing here is legal advice, but I can pull the exact wording for you.`,
  support: (q) =>
    `For "${trim(q)}" I classified the intent and drafted a reply:\n\nThe message is a billing question with a mild frustration signal. I wrote a calm, solution-first response you can send as-is or tweak.`,
  email: (q) =>
    `Done. For "${trim(q)}" I read your recent inbox and drafted a reply in your Gmail tab. It's concise and matches your usual tone — review it before sending.`,
  meeting: (q) =>
    `On "${trim(q)}": I transcribed the call and pulled out the action items.\n\n• 3 decisions were made.\n• 4 to-dos with owners.\n• The recap is ready to share.`,
  analyst: (q) =>
    `Analysis of "${trim(q)}":\n\nI extracted the data on the page and looked for patterns. There's a clear weekly cycle and one anomaly last Tuesday. I can chart it or dig into the anomaly.`,
}

function trim(q: string): string {
  const t = q.trim().replace(/\s+/g, ' ')
  return t.length > 60 ? `${t.slice(0, 57)}…` : t
}

export function planFor(agentId: string, query: string): AgentPlan {
  const agent = getAgent(agentId)
  const steps = agent.tools
    .map((t) => STEP_LIBRARY[t])
    .filter(Boolean)
    .slice(0, 4)
  const answerFn = ANSWERS[agentId] ?? ANSWERS.research
  return { steps, answer: answerFn(query) }
}
