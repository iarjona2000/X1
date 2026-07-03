#!/usr/bin/env node
/**
 * Bulk-imports agency-agents (github.com/msitarzewski/agency-agents, cloned
 * locally) into this Obsidian vault as lightweight, auto-generated notes.
 *
 * Respects 04-Diseno-de-Red.md's cluster-isolation rule: each agent note links
 * only to its own cluster hub; only hub files (00-*.md) link out to meta docs.
 * Does NOT copy prompt bodies into the vault (source repo is the source of
 * truth) — only frontmatter (name/description/emoji/vibe).
 *
 * Re-runnable: notes are overwritten deterministically by slug; hub sections
 * for FOLDED divisions are replaced between AGENCY-AGENTS:START/END markers
 * so hand-researched hub content above/below is preserved. Hubs for NEW
 * agency-only clusters are fully regenerated each run (nothing hand-written
 * to lose).
 *
 * Usage: node scripts/import-agency-agents.js
 */

const fs = require('fs');
const path = require('path');

const SOURCE_REPO = process.env.AGENCY_AGENTS_DIR || path.resolve(__dirname, '..', '..', '..', '..', '..', 'agency-agents');
const VAULT_ROOT = path.resolve(__dirname, '..');

// division -> { mode: 'fold', cluster, hubFile } | { mode: 'new', cluster, hubFile, label }
const CLUSTER_MAP = {
  finance:            { mode: 'fold', cluster: 'Agentes-Finanzas',       hubFile: '00-Finanzas.md' },
  marketing:          { mode: 'fold', cluster: 'Agentes-Marketing',      hubFile: '00-Marketing.md' },
  'paid-media':       { mode: 'fold', cluster: 'Agentes-Marketing',      hubFile: '00-Marketing.md' },
  sales:              { mode: 'fold', cluster: 'Agentes-Ventas-CRM',     hubFile: '00-Ventas.md' },
  support:            { mode: 'fold', cluster: 'Agentes-Atencion-Cliente', hubFile: '00-Atencion.md' },
  'project-management': { mode: 'fold', cluster: 'Agentes-Operaciones',  hubFile: '00-Operaciones.md' },

  academic:           { mode: 'new', cluster: 'Agentes-Agency-Academic',        hubFile: '00-Academic.md',        label: 'Academic' },
  design:             { mode: 'new', cluster: 'Agentes-Agency-Design',          hubFile: '00-Design.md',          label: 'Design' },
  engineering:        { mode: 'new', cluster: 'Agentes-Agency-Engineering',     hubFile: '00-Engineering.md',     label: 'Engineering' },
  'game-development': { mode: 'new', cluster: 'Agentes-Agency-GameDev',         hubFile: '00-GameDev.md',         label: 'Game Development' },
  gis:                { mode: 'new', cluster: 'Agentes-Agency-GIS',             hubFile: '00-GIS.md',             label: 'GIS' },
  product:            { mode: 'new', cluster: 'Agentes-Agency-Product',         hubFile: '00-Product.md',         label: 'Product' },
  security:           { mode: 'new', cluster: 'Agentes-Agency-Security',        hubFile: '00-Security.md',        label: 'Security' },
  'spatial-computing': { mode: 'new', cluster: 'Agentes-Agency-SpatialComputing', hubFile: '00-SpatialComputing.md', label: 'Spatial Computing' },
  specialized:        { mode: 'new', cluster: 'Agentes-Agency-Specialized',     hubFile: '00-Specialized.md',     label: 'Specialized' },
  testing:            { mode: 'new', cluster: 'Agentes-Agency-Testing',         hubFile: '00-Testing.md',         label: 'Testing' },
};

const START_MARKER = '<!-- AGENCY-AGENTS:START (auto-generado, no editar a mano — ver scripts/import-agency-agents.js) -->';
const END_MARKER = '<!-- AGENCY-AGENTS:END -->';

function parseFrontmatter(raw) {
  const lines = raw.split(/\r?\n/);
  if (lines[0].trim() !== '---') return null;
  let end = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') { end = i; break; }
  }
  if (end === -1) return null;
  const fm = {};
  for (let i = 1; i < end; i++) {
    const line = lines[i];
    if (/^\s/.test(line)) continue; // skip indented nested YAML (e.g. services: - name: ...)
    const m = line.match(/^([A-Za-z_][\w-]*)\s*:\s*(.*)$/);
    if (!m) continue;
    let val = m[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    fm[m[1]] = val;
  }
  return fm;
}

function slugify(name) {
  return name
    .replace(/[^\w\s-]/g, '')
    .trim()
    .split(/\s+/)
    .join('-');
}

function oneLine(s, max) {
  s = (s || '').replace(/\s+/g, ' ').trim();
  if (s.length > max) s = s.slice(0, max - 1).trim() + '…';
  return s;
}

function mdEscapeTableCell(s) {
  return (s || '').replace(/\|/g, '\\|');
}

// ── 1. Read every division, parse frontmatter ──
const divisions = fs.readdirSync(SOURCE_REPO, { withFileTypes: true })
  .filter(d => d.isDirectory() && CLUSTER_MAP[d.name])
  .map(d => d.name);

const byCluster = {}; // clusterFolder -> { mode, hubFile, entries: [{division,label,slug,fm,sourcePath}] }

for (const division of divisions) {
  const cfg = CLUSTER_MAP[division];
  const dir = path.join(SOURCE_REPO, division);
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));

  if (!byCluster[cfg.cluster]) byCluster[cfg.cluster] = { mode: cfg.mode, hubFile: cfg.hubFile, label: cfg.label, entries: [] };

  for (const file of files) {
    const full = path.join(dir, file);
    const raw = fs.readFileSync(full, 'utf8');
    const fm = parseFrontmatter(raw);
    if (!fm || !fm.name) { console.warn('SKIP (no frontmatter/name):', division + '/' + file); continue; }
    const slug = slugify(fm.name);
    byCluster[cfg.cluster].entries.push({
      division, slug, fm,
      sourceRel: 'agency-agents/' + division + '/' + file,
    });
  }
}

// ── 2. Write one note per agent ──
let notesWritten = 0;
for (const clusterName of Object.keys(byCluster)) {
  const clusterInfo = byCluster[clusterName];
  const clusterDir = path.join(VAULT_ROOT, clusterName);
  fs.mkdirSync(clusterDir, { recursive: true });

  const hubName = path.basename(clusterInfo.hubFile, '.md');

  for (const entry of clusterInfo.entries) {
    const fm = entry.fm;
    const notePath = path.join(clusterDir, entry.slug + '.md');
    const emoji = fm.emoji || '';
    const title = (emoji ? emoji + ' ' : '') + fm.name;
    const body = [
      '---',
      `tags: [agente, agency-agents, "tema/agency-${entry.division}", nivel-4]`,
      'tier: prompt-import',
      'fuente: agency-agents (github.com/msitarzewski/agency-agents)',
      `origen_archivo: ${entry.sourceRel}`,
      '---',
      '',
      `# ${title}`,
      '',
      fm.vibe ? `**Vibe:** ${fm.vibe}` : null,
      '',
      `**Descripción:** ${fm.description || '(sin descripción)'}`,
      '',
      'Importado en bloque desde `agency-agents` — nivel 4 (plantilla de prompt/system-prompt, sin API/MCP real). Cuerpo completo del prompt en el repo clonado localmente: `' + entry.sourceRel + '`.',
      '',
      '## Enlaces',
      `[[${hubName}]]`,
      '',
    ].filter(l => l !== null).join('\n');
    fs.writeFileSync(notePath, body, 'utf8');
    notesWritten++;
  }
}

// ── 3. Write/update hub files ──
for (const clusterName of Object.keys(byCluster)) {
  const clusterInfo = byCluster[clusterName];
  const clusterDir = path.join(VAULT_ROOT, clusterName);
  const hubPath = path.join(clusterDir, clusterInfo.hubFile);
  const hubName = path.basename(clusterInfo.hubFile, '.md');

  // Group entries by division for sub-tables when a cluster folds >1 division (e.g. Marketing)
  const byDivision = {};
  for (const e of clusterInfo.entries) {
    (byDivision[e.division] = byDivision[e.division] || []).push(e);
  }

  const tableBlocks = [];
  for (const division of Object.keys(byDivision).sort()) {
    const rows = byDivision[division]
      .sort((a, b) => a.fm.name.localeCompare(b.fm.name))
      .map(e => `| [[${e.slug}]] | ${mdEscapeTableCell(oneLine(e.fm.description, 140))} |`)
      .join('\n');
    tableBlocks.push(
      (Object.keys(byDivision).length > 1 ? `### ${division}\n\n` : '') +
      '| Agente | Descripción |\n|---|---|\n' + rows
    );
  }

  const autoSection = [
    START_MARKER,
    '',
    `Importación en bloque de \`agency-agents\` (${Object.keys(byDivision).join(', ')}) — nivel 4, ver [[01-Mecanismo-de-Integracion]]. Notas auto-generadas desde el frontmatter de cada archivo (sin investigación adicional); el prompt completo de cada una vive en el repo clonado localmente. Regenerado por \`scripts/import-agency-agents.js\` — no editar esta sección a mano.`,
    '',
    tableBlocks.join('\n\n'),
    '',
    END_MARKER,
  ].join('\n');

  if (clusterInfo.mode === 'new') {
    const full = [
      '---',
      `tags: [categoria, "tema/agency-${Object.keys(byDivision)[0]}", agency-agents]`,
      'fuente: agency-agents (github.com/msitarzewski/agency-agents)',
      '---',
      '',
      `# ${clusterInfo.label} (agency-agents)`,
      '',
      autoSection,
      '',
      '## Enlaces',
      '[[00-Indice]]',
      '',
    ].join('\n');
    fs.writeFileSync(hubPath, full, 'utf8');
    console.log('WROTE (new hub):', clusterName + '/' + clusterInfo.hubFile);
  } else {
    let existing = fs.existsSync(hubPath) ? fs.readFileSync(hubPath, 'utf8') : null;
    if (existing === null) {
      console.warn('WARN: expected existing hub not found, creating minimal one:', hubPath);
      existing = `---\ntags: [categoria]\n---\n\n# ${hubName}\n\n## Enlaces\n[[00-Indice]]\n`;
    }
    const startIdx = existing.indexOf(START_MARKER);
    const endIdx = existing.indexOf(END_MARKER);
    let updated;
    if (startIdx !== -1 && endIdx !== -1) {
      updated = existing.slice(0, startIdx) + autoSection + existing.slice(endIdx + END_MARKER.length);
    } else {
      // Insert right before the final "## Enlaces" section so hand-written content above is preserved.
      const enlacesIdx = existing.lastIndexOf('## Enlaces');
      if (enlacesIdx === -1) {
        updated = existing.trimEnd() + '\n\n' + autoSection + '\n';
      } else {
        updated = existing.slice(0, enlacesIdx) + autoSection + '\n\n' + existing.slice(enlacesIdx);
      }
    }
    fs.writeFileSync(hubPath, updated, 'utf8');
    console.log('UPDATED (folded hub):', clusterName + '/' + clusterInfo.hubFile);
  }
}

console.log('---');
console.log('Notes written:', notesWritten);
console.log('Clusters touched:', Object.keys(byCluster).length);
