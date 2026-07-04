import * as React from 'react';
import {
  Search24Regular, Globe24Regular, Code24Regular, Edit24Regular,
  Sparkle24Regular, Beaker24Regular, DocumentText24Regular,
  DocumentPdf24Regular, Color24Regular, CheckmarkCircle24Filled,
  WeatherMoon24Regular, WeatherSunny24Regular, Brain20Regular,
  Chat24Regular, People24Regular, Mail24Regular, CalendarMonth24Regular,
  DocumentBulletList24Regular, Pen24Regular, ArrowRight24Regular,
  Book24Regular, Star24Regular, HandWave24Regular, Emoji24Regular
} from '@fluentui/react-icons';

const A = '../assets/';

const APP_META = {
  github:    { title: 'GitHub',    png: A + 'github_48dp.svg' },
  repo:      { title: 'GitHub',    png: A + 'github_48dp.svg' },
  linkedin:  { title: 'LinkedIn',  png: A + 'linkedin_48dp.png' },
  docs:      { title: 'Docs',      png: A + 'docs_48dp.png' },
  document:  { title: 'Docs',      png: A + 'docs_48dp.png' },
  sheets:    { title: 'Sheets',    png: A + 'sheets_48dp.png' },
  slides:    { title: 'Slides',    png: A + 'slides_48dp.png' },
  drive:     { title: 'Drive',     png: A + 'drive_48dp.png' },
  calendar:  { title: 'Calendar',  png: A + 'calendar_48dp.png' },
  meeting:   { title: 'Meet',      png: A + 'meet_48dp.png' },
  meet:      { title: 'Meet',      png: A + 'meet_48dp.png' },
  contacts:  { title: 'Contacts',  png: A + 'contacts_48dp.png' },
  tasks:     { title: 'Tasks',     png: A + 'tasks_48dp.png' },
  email:     { title: 'Gmail',     png: A + 'gmail_48dp.png' },
  mail:      { title: 'Gmail',     png: A + 'gmail_48dp.png' },
  gmail:     { title: 'Gmail',     png: A + 'gmail_48dp.png' },
  inbox:     { title: 'Gmail',     png: A + 'gmail_48dp.png' },
  hubspot:   { title: 'HubSpot',   png: A + 'hubspot_48dp.svg' },
  crm:       { title: 'HubSpot',   png: A + 'hubspot_48dp.png' },
  notion:    { title: 'Notion',    png: A + 'notion_48dp.png' },
  slack:     { title: 'Slack',     png: A + 'slack_48dp.png' },
  canva:     { title: 'Canva',     png: A + 'canva_48dp.png' },
  forms:     { title: 'Forms',     png: A + 'forms_48dp.png' },
  google:    { title: 'Google',    png: A + 'chrome_48dp.png' },
  chrome:    { title: 'Chrome',    png: A + 'chrome_48dp.png' },
  whatsapp:  { title: 'WhatsApp',  png: A + 'whatsapp_48dp.png' },
  keep:      { title: 'Keep',      png: A + 'keep_48dp.png' },

  search:    { title: 'Search',     Icon: Search24Regular, color: '#5b5fc7' },
  read:      { title: 'Read',       Icon: DocumentText24Regular, color: '#5b5fc7' },
  extract:   { title: 'Extract',    Icon: DocumentText24Regular, color: '#5b5fc7' },
  scrape:    { title: 'Scrape',     Icon: Globe24Regular, color: '#5b5fc7' },
  code:      { title: 'Code',       Icon: Code24Regular, color: '#107c41' },
  generate:  { title: 'Generate',   Icon: Code24Regular, color: '#107c41' },
  program:   { title: 'Code',       Icon: Code24Regular, color: '#107c41' },
  test:      { title: 'Test',       Icon: Beaker24Regular, color: '#c19c00' },
  debug:     { title: 'Debug',      Icon: Beaker24Regular, color: '#c19c00' },
  draft:     { title: 'Draft',      Icon: Edit24Regular, color: '#5b5fc7' },
  write:     { title: 'Write',      Icon: Pen24Regular, color: '#5b5fc7' },
  compose:   { title: 'Compose',    Icon: Edit24Regular, color: '#5b5fc7' },
  style:     { title: 'Style',      Icon: Color24Regular, color: '#8764b8' },
  format:    { title: 'Format',     Icon: Color24Regular, color: '#8764b8' },
  refine:    { title: 'Refine',     Icon: Sparkle24Regular, color: '#8764b8' },
  synthesize:{ title: 'Synthesize', Icon: Sparkle24Regular, color: '#8764b8' },
  analyse:   { title: 'Analyse',    Icon: Sparkle24Regular, color: '#8764b8' },
  analyze:   { title: 'Analyze',    Icon: Sparkle24Regular, color: '#8764b8' },
  plan:      { title: 'Plan',       Icon: Sparkle24Regular, color: '#8764b8' },
  research:  { title: 'Research',   Icon: Search24Regular, color: '#5b5fc7' },
  pdf:       { title: 'PDF',        Icon: DocumentPdf24Regular, color: '#c50f1f' },
  export:    { title: 'Export',     Icon: DocumentPdf24Regular, color: '#c50f1f' },
  done:      { title: 'Done',       Icon: CheckmarkCircle24Filled, color: '#107c41' },
  result:    { title: 'Result',     Icon: CheckmarkCircle24Filled, color: '#107c41' },
  complete:  { title: 'Done',       Icon: CheckmarkCircle24Filled, color: '#107c41' },
  finish:    { title: 'Done',       Icon: CheckmarkCircle24Filled, color: '#107c41' },

  groq:      { title: 'Groq',       Icon: Brain20Regular, color: '#f97316' },
  openai:    { title: 'OpenAI',     Icon: Sparkle24Regular, color: '#10a37f' },
  claude:    { title: 'Claude',     Icon: Chat24Regular, color: '#d97706' },
  gemini:    { title: 'Gemini',     Icon: Star24Regular, color: '#4285f4' },
  perplexity:{ title: 'Perplexity', Icon: Globe24Regular, color: '#1a56db' }
};

const FALLBACK = { title: '', Icon: Sparkle24Regular, color: '#8764b8' };

export function metaFor(app) {
  const key = String(app || '').toLowerCase().trim();
  return APP_META[key] || { ...FALLBACK, title: app || 'Step' };
}

const PASTEL = {
  '#5b5fc7': '#f0eefe',
  '#107c41': '#e6f7ed',
  '#c19c00': '#fef7e0',
  '#8764b8': '#f3edfc',
  '#c50f1f': '#fde7ea',
  '#f97316': '#fef2e4',
  '#10a37f': '#e6f7f2',
  '#d97706': '#fef5e0',
  '#4285f4': '#e8f0fe',
  '#1a56db': '#e8effd'
};

export function StepIcon({ app, size = 30 }) {
  const meta = metaFor(app);
  if (meta.png) {
    return (
      <img src={meta.png} alt={meta.title} width={size} height={size}
        style={{ objectFit: 'contain', flexShrink: 0, display: 'block', borderRadius: '4px' }}
        onError={(e) => { e.currentTarget.nextElementSibling.style.display = 'flex'; e.currentTarget.style.display = 'none'; }}
      />
    );
  }
  const Icon = meta.Icon;
  return (
    <span style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      width: size, height: size, borderRadius: '8px', flexShrink: 0,
      background: PASTEL[meta.color] || '#f0f0f0'
    }}>
      <Icon style={{ color: meta.color, fontSize: size - 10 }} />
    </span>
  );
}
