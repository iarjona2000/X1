/*
 * Mapa de pasos del proceso → icono. Los pasos que corresponden a una app real
 * usan su ICONO ORIGINAL (PNG en ../assets), como pide el diseño de referencia.
 * Los pasos abstractos (razonar, dar estilo, exportar…) usan iconos Fluent.
 *
 * Las rutas PNG son relativas a sidepanel/panel.html → ../assets/<app>_48dp.png.
 */

import * as React from 'react';
import {
  Search24Regular,
  Globe24Regular,
  Code24Regular,
  Edit24Regular,
  Sparkle24Regular,
  Beaker24Regular,
  DocumentText24Regular,
  DocumentPdf24Regular,
  Color24Regular,
  CheckmarkCircle24Filled
} from '@fluentui/react-icons';

const A = '../assets/';

// key → { title, png } (icono original) ó { title, Icon, color } (Fluent)
const APP_META = {
  github: { title: 'GitHub', png: A + 'github_48dp.svg' },
  repo: { title: 'GitHub', png: A + 'github_48dp.svg' },
  repository: { title: 'GitHub', png: A + 'github_48dp.svg' },
  linkedin: { title: 'LinkedIn', png: A + 'linkedin_48dp.png' },
  docs: { title: 'Google Docs', png: A + 'docs_48dp.png' },
  document: { title: 'Google Docs', png: A + 'docs_48dp.png' },
  sheets: { title: 'Google Sheets', png: A + 'sheets_48dp.png' },
  slides: { title: 'Google Slides', png: A + 'slides_48dp.png' },
  drive: { title: 'Google Drive', png: A + 'drive_48dp.png' },
  calendar: { title: 'Google Calendar', png: A + 'calendar_48dp.png' },
  meeting: { title: 'Google Meet', png: A + 'meet_48dp.png' },
  meet: { title: 'Google Meet', png: A + 'meet_48dp.png' },
  contacts: { title: 'Contacts', png: A + 'contacts_48dp.png' },
  tasks: { title: 'Tasks', png: A + 'tasks_48dp.png' },
  email: { title: 'Gmail', png: A + 'gmail_48dp.png' },
  mail: { title: 'Gmail', png: A + 'gmail_48dp.png' },
  gmail: { title: 'Gmail', png: A + 'gmail_48dp.png' },
  inbox: { title: 'Gmail', png: A + 'gmail_48dp.png' },
  hubspot: { title: 'HubSpot', png: A + 'hubspot_48dp.svg' },
  crm: { title: 'HubSpot', png: A + 'hubspot_48dp.svg' },
  notion: { title: 'Notion', png: A + 'notion_48dp.png' },
  slack: { title: 'Slack', png: A + 'slack_48dp.png' },
  canva: { title: 'Canva', png: A + 'canva_48dp.png' },
  forms: { title: 'Forms', png: A + 'forms_48dp.png' },
  google: { title: 'Google', png: A + 'chrome_48dp.png' },
  chrome: { title: 'Chrome', png: A + 'chrome_48dp.png' },

  // abstractos → Fluent
  search: { title: 'Search', Icon: Search24Regular, color: '#5b5fc7' },
  read: { title: 'Read', Icon: DocumentText24Regular, color: '#5b5fc7' },
  extract: { title: 'Extract', Icon: DocumentText24Regular, color: '#5b5fc7' },
  scrape: { title: 'Extract', Icon: Globe24Regular, color: '#5b5fc7' },
  code: { title: 'Code', Icon: Code24Regular, color: '#107c41' },
  generate: { title: 'Generate', Icon: Code24Regular, color: '#107c41' },
  program: { title: 'Code', Icon: Code24Regular, color: '#107c41' },
  script: { title: 'Code', Icon: Code24Regular, color: '#107c41' },
  implement: { title: 'Code', Icon: Code24Regular, color: '#107c41' },
  test: { title: 'Test', Icon: Beaker24Regular, color: '#c19c00' },
  debug: { title: 'Debug', Icon: Beaker24Regular, color: '#c19c00' },
  fix: { title: 'Fix', Icon: Beaker24Regular, color: '#c19c00' },
  draft: { title: 'Draft', Icon: Edit24Regular, color: '#5b5fc7' },
  write: { title: 'Draft', Icon: Edit24Regular, color: '#5b5fc7' },
  compose: { title: 'Compose', Icon: Edit24Regular, color: '#5b5fc7' },
  style: { title: 'Style', Icon: Color24Regular, color: '#8764b8' },
  format: { title: 'Format', Icon: Color24Regular, color: '#8764b8' },
  refine: { title: 'Refine', Icon: Sparkle24Regular, color: '#8764b8' },
  synthesize: { title: 'Synthesize', Icon: Sparkle24Regular, color: '#8764b8' },
  stylize: { title: 'Style', Icon: Color24Regular, color: '#8764b8' },
  analyse: { title: 'Analyse', Icon: Sparkle24Regular, color: '#8764b8' },
  analyze: { title: 'Analyse', Icon: Sparkle24Regular, color: '#8764b8' },
  plan: { title: 'Plan', Icon: Sparkle24Regular, color: '#8764b8' },
  research: { title: 'Research', Icon: Search24Regular, color: '#5b5fc7' },
  pdf: { title: 'PDF', Icon: DocumentPdf24Regular, color: '#c50f1f' },
  export: { title: 'Export', Icon: DocumentPdf24Regular, color: '#c50f1f' },
  done: { title: 'Done', Icon: CheckmarkCircle24Filled, color: '#107c41' },
  result: { title: 'Result', Icon: CheckmarkCircle24Filled, color: '#107c41' },
  complete: { title: 'Done', Icon: CheckmarkCircle24Filled, color: '#107c41' },
  finish: { title: 'Done', Icon: CheckmarkCircle24Filled, color: '#107c41' }
};

const FALLBACK = { title: '', Icon: Sparkle24Regular, color: '#8764b8' };

export function metaFor(app) {
  const key = String(app || '').toLowerCase().trim();
  return APP_META[key] || { ...FALLBACK, title: app || 'Step' };
}

const tileBase = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '8px',
  flexShrink: 0,
  boxShadow: '0 1px 3px rgba(0,0,0,0.10), 0 0 0 0.5px rgba(0,0,0,0.04)'
};

/** Icono del paso: tile blanco con logo original, ó tile de color con icono Fluent. */
export function StepIcon({ app, size = 30 }) {
  const meta = metaFor(app);
  if (meta.png) {
    return (
      <span style={{ ...tileBase, width: size, height: size, background: '#fff' }}>
        <img src={meta.png} alt="" width={size - 8} height={size - 8}
          style={{ objectFit: 'contain' }}
          onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} />
      </span>
    );
  }
  const Icon = meta.Icon;
  return (
    <span style={{ ...tileBase, width: size, height: size, background: meta.color }}>
      <Icon style={{ color: '#fff', fontSize: size - 12 }} />
    </span>
  );
}
