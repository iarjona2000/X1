'use client'

import { Button, Heading, Label, Text, Token } from '@primer/react'
import { CheckIcon, DotFillIcon } from '@primer/octicons-react'
import { AGENTS, PROVIDERS, type Provider } from '@/lib/data'
import { useWorkspace } from '../store'
import { Surface } from '../surface'

export function AgentsView() {
  const { activeAgent, setActiveAgent } = useWorkspace()

  return (
    <div style={{ maxWidth: 1080, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 28 }}>
      <section>
        <SectionHeading
          title="Agents"
          caption="Each persona has its own system prompt, voice triggers, and tools."
        />
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: 16,
          }}
        >
          {AGENTS.map((agent) => {
            const active = agent.id === activeAgent
            const Icon = agent.icon
            return (
              <Surface
                key={agent.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  borderColor: active
                    ? 'var(--borderColor-accent-emphasis)'
                    : 'var(--borderColor-default)',
                  boxShadow: active
                    ? '0 0 0 1px var(--borderColor-accent-emphasis)'
                    : 'var(--shadow-resting-small)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 'var(--borderRadius-medium)',
                      display: 'grid',
                      placeItems: 'center',
                      backgroundColor: 'var(--bgColor-accent-muted)',
                      color: 'var(--fgColor-accent)',
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={20} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Heading as="h3" style={{ fontSize: 15, fontWeight: 600 }}>
                        {agent.name}
                      </Heading>
                      {active ? <Label variant="accent">Active</Label> : null}
                    </div>
                    <Text style={{ fontSize: 12, color: 'var(--fgColor-muted)' }}>
                      {agent.role}
                    </Text>
                  </div>
                </div>

                <Text style={{ fontSize: 13, color: 'var(--fgColor-muted)', lineHeight: 1.5 }}>
                  {agent.description}
                </Text>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {agent.tools.map((t) => (
                    <span
                      key={t}
                      style={{
                        fontSize: 11,
                        fontFamily: 'var(--fontStack-monospace)',
                        color: 'var(--fgColor-muted)',
                        backgroundColor: 'var(--bgColor-muted)',
                        border: '1px solid var(--borderColor-muted)',
                        borderRadius: 'var(--borderRadius-small)',
                        padding: '2px 6px',
                      }}
                    >
                      {t}
                    </span>
                  ))}
                </div>

                <div style={{ marginTop: 'auto', paddingTop: 4 }}>
                  <Button
                    block
                    variant={active ? 'default' : 'primary'}
                    leadingVisual={active ? CheckIcon : undefined}
                    onClick={() => setActiveAgent(agent.id)}
                  >
                    {active ? 'Selected' : 'Use this agent'}
                  </Button>
                </div>
              </Surface>
            )
          })}
        </div>
      </section>

      <section>
        <SectionHeading
          title="Model cascade"
          caption="Providers are tried in order with automatic fallback, circuit breaking, and rate limiting."
        />
        <Surface padding={0} style={{ overflow: 'hidden' }}>
          {PROVIDERS.map((p, i) => (
            <ProviderRow key={p.id} provider={p} last={i === PROVIDERS.length - 1} />
          ))}
        </Surface>
      </section>
    </div>
  )
}

function SectionHeading({ title, caption }: { title: string; caption: string }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <Heading as="h2" style={{ fontSize: 16, fontWeight: 600 }}>
        {title}
      </Heading>
      <Text style={{ fontSize: 13, color: 'var(--fgColor-muted)' }}>{caption}</Text>
    </div>
  )
}

const STATUS_COLOR: Record<Provider['status'], string> = {
  online: 'var(--fgColor-success)',
  degraded: 'var(--fgColor-attention)',
  offline: 'var(--fgColor-muted)',
}

function ProviderRow({ provider, last }: { provider: Provider; last: boolean }) {
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
      <span style={{ color: STATUS_COLOR[provider.status], display: 'grid', placeItems: 'center' }}>
        <DotFillIcon size={16} />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: 14, fontWeight: 600 }}>{provider.name}</Text>
          {provider.local ? <Label size="small">Local</Label> : null}
        </div>
        <Text
          style={{
            fontSize: 12,
            color: 'var(--fgColor-muted)',
            fontFamily: 'var(--fontStack-monospace)',
          }}
        >
          {provider.model}
        </Text>
      </div>
      <Token text={provider.family} size="small" />
      <Text
        style={{
          fontSize: 12,
          color: 'var(--fgColor-muted)',
          width: 72,
          textAlign: 'right',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {provider.status === 'offline' ? '—' : `${provider.latencyMs} ms`}
      </Text>
    </div>
  )
}
