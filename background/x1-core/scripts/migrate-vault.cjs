/*
 * Migración de la bóveda al esquema de manifest (spec §12) — DRY-RUN.
 *
 * Recorre las notas de agente de vault/, infiere el manifest canónico (domain,
 * subdomain, capabilities, integration_level, integration_ref, cluster) a partir
 * del front-matter existente + la carpeta, y produce:
 *   - un resumen por consola (cuántas quedan listas vs. pendientes de revisión),
 *   - vault/MIGRACION_PENDIENTES.md con las notas de baja confianza.
 *
 * NO ESCRIBE sobre ninguna nota (spec §0.a: escritura destructiva sobre vault/
 * requiere confirmación humana). Idempotente: solo lee y reporta.
 *
 * Se ejecuta con `node scripts/migrate-vault.cjs` desde background/x1-core/.
 * Es CJS (no ESM) para correr con node directo sin build; el catálogo de
 * clústeres y los alias de nivel se replican aquí en pequeño (espejo de
 * core/orchestration/vault/clusters.js y manifest.js) por esa razón.
 */

const fs = require('fs');
const path = require('path');

// Espejo del catálogo cerrado (clusters.js). folder → {clusterId, domains}.
const FOLDER_TO_CLUSTER = {
  'Agentes-CEO-Estrategia': { id: 'ceo-estrategia', domains: ['ceo', 'estrategia', 'research'] },
  'Agentes-CFO-Finanzas': { id: 'cfo-finanzas', domains: ['cfo', 'finanzas'] },
  'Agentes-CMO-Marketing': { id: 'cmo-marketing', domains: ['cmo', 'marketing'] },
  'Agentes-CLO-Legal': { id: 'clo-legal', domains: ['clo', 'legal'] },
  'Agentes-CHRO-RRHH': { id: 'chro-rrhh', domains: ['chro', 'rrhh'] },
  'Agentes-CRO-Ventas': { id: 'cro-ventas', domains: ['cro', 'ventas'] },
  'Agentes-COO-Operaciones': { id: 'coo-operaciones', domains: ['coo', 'operaciones', 'cadena-suministro'] },
  'Agentes-CTO-Tecnico': { id: 'cto-tecnico', domains: ['cto', 'tecnico'] },
  'Agentes-CPO-Producto': { id: 'cpo-producto', domains: ['cpo', 'producto'] },
  'Agentes-Conectores': { id: 'conectores', domains: ['conectores'] }
};

// Espejo de LEVEL_ALIASES (manifest.js).
const LEVEL_ALIASES = {
  mcp: 1, 'mcp-server': 1, 'api-selfhosted': 2, 'rest-api-self-hosted': 2, 'api-self-hosted': 2,
  saas: 3, 'saas-api': 3, prompt: 4, 'prompt-import': 4, plugin: 4
};

/** Parser mínimo de front-matter YAML (solo los campos que usa la bóveda). */
function parseFrontmatter(text) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  if (!m) return {};
  const fm = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = /^([a-zA-Z_]+):\s*(.*)$/.exec(line);
    if (!kv) continue;
    const key = kv[1];
    let val = kv[2].trim();
    if (val.startsWith('[') && val.endsWith(']')) {
      val = val.slice(1, -1).split(',').map((s) => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
    } else {
      val = val.replace(/^["']|["']$/g, '');
    }
    fm[key] = val;
  }
  return fm;
}

/** Infiere el manifest canónico de una nota a partir de su front-matter + carpeta. */
function inferManifest(fm, ctx) {
  const cluster = FOLDER_TO_CLUSTER[ctx.folder] || null;
  const level = normalizeLevel(fm.nivel_integracion || fm.tier || levelFromTags(fm.tags));
  const caps = fm.capacidades || fm.capabilities || [];
  return {
    id: ctx.id,
    domain: (fm.dominio || fm.domain || (cluster && cluster.domains[0]) || null),
    subdomain: fm.subdominio || fm.subdomain || null,
    capabilities: Array.isArray(caps) ? caps : (caps ? [caps] : []),
    integration_level: level,
    integration_ref: fm.integration_ref || null,
    cluster: cluster ? cluster.id : null
  };
}

function normalizeLevel(v) {
  if (typeof v === 'number') return v >= 1 && v <= 4 ? v : null;
  if (typeof v === 'string') return LEVEL_ALIASES[v.toLowerCase().trim()] || null;
  return null;
}

function levelFromTags(tags) {
  if (!Array.isArray(tags)) return null;
  for (const t of tags) {
    const m = /nivel-(\d)/.exec(t);
    if (m) return Number(m[1]);
  }
  return null;
}

/** Planifica la migración (dry-run): clasifica cada nota como lista o pendiente. */
function planMigration(notes) {
  const ready = [];
  const pending = [];
  const seenIds = new Map();

  for (const note of notes) {
    const man = inferManifest(note.fm, { id: note.id, folder: note.folder });
    const reasons = [];

    if (!man.cluster) reasons.push('carpeta fuera del catálogo de clústeres');
    if (!man.domain) reasons.push('sin domain inferible');
    if (!man.capabilities.length) reasons.push('sin capacidades (capacidades) declaradas');
    if (!man.integration_level) reasons.push('nivel de integración no inferible');
    // integration_ref: casi nunca está en el texto; el propio spec §12 dice que
    // este campo suele requerir revisión manual (cómo se conectó en la práctica).
    if (man.integration_level >= 2 && man.integration_level <= 4 && !man.integration_ref) {
      reasons.push('falta integration_ref (nivel ' + man.integration_level + ') — dato de conexión real, revisión manual');
    }
    if (man.integration_level === 1 && !man.integration_ref) {
      reasons.push('falta integration_ref (nombre de herramienta MCP)');
    }

    const dupOf = seenIds.get(man.id);
    if (dupOf) reasons.push('id duplicado con ' + dupOf);
    else seenIds.set(man.id, note.path);

    (reasons.length ? pending : ready).push({ note, man, reasons });
  }
  return { ready, pending, total: notes.length };
}

/** Recorre vault/ y devuelve las notas de agente (excluye hubs 00-* y metadocs). */
function collectVaultNotes(vaultDir) {
  const notes = [];
  for (const folder of Object.keys(FOLDER_TO_CLUSTER)) {
    const dir = path.join(vaultDir, folder);
    if (!fs.existsSync(dir)) continue;
    for (const file of fs.readdirSync(dir)) {
      if (!file.endsWith('.md') || file.startsWith('00-')) continue;
      const full = path.join(dir, file);
      const text = fs.readFileSync(full, 'utf8');
      notes.push({
        id: file.replace(/\.md$/, '').toLowerCase(),
        folder,
        path: path.join('vault', folder, file),
        fm: parseFrontmatter(text)
      });
    }
  }
  return notes;
}

/** Genera el contenido de MIGRACION_PENDIENTES.md. */
function renderPending(plan) {
  const lines = [];
  lines.push('---');
  lines.push('tags: [meta, migracion]');
  lines.push('---');
  lines.push('');
  lines.push('# Migración de manifest — notas pendientes de revisión manual');
  lines.push('');
  lines.push('Generado por `scripts/migrate-vault.cjs` en modo **dry-run** (' + new Date().toISOString().slice(0, 10) + '). Ninguna nota fue modificada.');
  lines.push('');
  lines.push('Resumen: **' + plan.ready.length + '** notas listas para manifest automático · **' + plan.pending.length + '** requieren revisión manual · ' + plan.total + ' totales.');
  lines.push('');
  lines.push('El campo que más frecuentemente falta es `integration_ref` — el spec §12 ya avisa de que ese dato (cómo se conecta el agente en la práctica) casi nunca puede inferirse del texto de la nota y debe rellenarse a mano, en vez de con un valor por defecto que rompería el dispatch (§10) sin avisar.');
  lines.push('');
  lines.push('| Nota | Clúster | Nivel | Motivos de revisión |');
  lines.push('|---|---|---|---|');
  for (const p of plan.pending) {
    lines.push('| `' + p.note.path + '` | ' + (p.man.cluster || '—') + ' | ' + (p.man.integration_level || '?') + ' | ' + p.reasons.join('; ') + ' |');
  }
  lines.push('');
  return lines.join('\n');
}

function main() {
  const vaultDir = path.resolve(__dirname, '../../../vault');
  const notes = collectVaultNotes(vaultDir);
  const plan = planMigration(notes);

  console.log('[migrate:dry-run] notas de agente: ' + plan.total);
  console.log('[migrate:dry-run] listas para manifest: ' + plan.ready.length);
  console.log('[migrate:dry-run] pendientes de revisión: ' + plan.pending.length);

  const outPath = path.join(vaultDir, 'MIGRACION_PENDIENTES.md');
  fs.writeFileSync(outPath, renderPending(plan), 'utf8');
  console.log('[migrate:dry-run] escrito ' + path.relative(process.cwd(), outPath) + ' (solo reporte; NINGUNA nota modificada)');
}

module.exports = { parseFrontmatter, inferManifest, normalizeLevel, planMigration, collectVaultNotes, renderPending };

if (require.main === module) main();
