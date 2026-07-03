#!/usr/bin/env node
/**
 * Generates the Agentes-Conectores cluster: Claude's own MCP connector
 * ecosystem (per rdmgator12/awesome-claude-connectors + Anthropic's official
 * connectors directory), catalogued as Nivel-1 (MCP) candidates X1's own
 * X1MCPClient.addServer() can point at directly — same protocol, same
 * mechanism, no code change needed to "borrow" Claude's own connector list.
 */
const fs = require('fs');
const path = require('path');

const VAULT_ROOT = 'C:/Users/Ivan/Documents/Business/X1/vault';
const CLUSTER = 'Agentes-Conectores';
const HUB = '00-Conectores.md';

// [category, [ [name, oneLineDesc], ... ] ]
const CATEGORIES = [
  ['AI y ML', [
    ['Hugging Face', 'catálogo de modelos y datasets, inferencia'],
    ['ElevenLabs Agents', 'voz sintética y agentes de voz'],
    ['Wolfram', 'cómputo simbólico y conocimiento estructurado'],
    ['Mem0', 'memoria persistente para agentes de IA'],
  ]],
  ['Automatización e integración', [
    ['Zapier', 'conecta miles de apps sin código, el conector "universal"'],
    ['n8n', 'automatización visual self-hosted, alternativa abierta a Zapier'],
    ['Make', 'automatización visual (ex-Integromat)'],
    ['IFTTT', 'automatización simple consumer-grade'],
    ['Workato', 'integración enterprise'],
  ]],
  ['Calendario y programación', [
    ['Google Calendar', 'ya cubierto en X1 vía googleApi() inline — este es el MCP oficial equivalente'],
    ['Calendly', 'programación de reuniones con disponibilidad pública'],
    ['Clockwise', 'optimización de calendario de equipo'],
  ]],
  ['Nube e infraestructura', [
    ['AWS API MCP Server', 'servidor MCP oficial de AWS'],
    ['Azure MCP Server', 'servidor MCP oficial de Azure'],
    ['Cloudflare', 'Workers, DNS, KV — X1 ya tiene su propio Worker desplegado'],
    ['Kubernetes', 'gestión de clústeres'],
    ['Vercel', 'despliegue de apps web'],
    ['Supabase', 'Postgres + auth + storage as a service'],
  ]],
  ['CMS y construcción web', [
    ['Shopify', 'e-commerce — complementa el CRM ya integrado (Pipedrive/HubSpot)'],
    ['WordPress.com', 'gestión de contenido'],
    ['Webflow', 'diseño web visual con código real'],
  ]],
  ['Comunicación', [
    ['Slack', 'mensajería de equipo — altísimo valor, patrón idéntico a Gmail ya integrado'],
    ['Gmail', 'MCP oficial — X1 ya tiene su propia integración inline, alternativa estándar'],
    ['Outlook', 'correo/calendario Microsoft, para usuarios fuera de Google Workspace'],
    ['Zoom', 'videollamadas — relevante para la transcripción de reuniones ya existente'],
    ['Twilio', 'SMS/voz programático'],
  ]],
  ['Atención al cliente', [
    ['Intercom', 'chat de soporte y CRM de clientes'],
    ['Zoho Desk', 'helpdesk'],
  ]],
  ['Datos y analítica', [
    ['BigQuery', 'data warehouse de Google'],
    ['Snowflake', 'data warehouse'],
    ['PostHog', 'analítica de producto open-source'],
    ['Metabase', 'BI open-source self-hosted'],
  ]],
  ['Diseño y creatividad', [
    ['Figma', 'diseño de interfaces — alto valor para el rol de Design ya en la bóveda'],
    ['Canva', 'diseño gráfico simplificado'],
    ['Miro', 'pizarra colaborativa'],
  ]],
  ['Herramientas de desarrollo', [
    ['GitHub MCP', 'oficial — issues, PRs, código — el más natural de todos dado que ya clonamos repos de GitHub a mano'],
    ['GitLab', 'alternativa self-hostable a GitHub'],
    ['Sourcegraph', 'búsqueda de código a gran escala'],
  ]],
  ['Documentos y archivos', [
    ['Google Drive', 'MCP oficial — X1 ya tiene su propia integración inline, alternativa estándar'],
    ['Dropbox', 'almacenamiento de archivos'],
    ['Docusign', 'firma electrónica — encaja directamente con el rol Legal'],
  ]],
  ['Finanzas y trading', [
    ['Stripe', 'pagos — alto valor, X1 ya genera facturas (Invoice-Generator)'],
    ['QuickBooks', 'contabilidad — encaja con el rol de Finanzas'],
    ['Xero', 'contabilidad, alternativa a QuickBooks'],
    ['PayPal', 'pagos'],
  ]],
  ['Jobs / empleo', [
    ['LinkedIn', 'búsqueda de candidatos y networking profesional'],
    ['Indeed', 'bolsa de empleo'],
  ]],
  ['Legal', [
    ['CourtListener', 'jurisprudencia real, base de datos legal pública — encaja con el hueco de "investigación jurídica" del Lote 1'],
    ['Harvey', 'plataforma legal de IA para despachos'],
  ]],
  ['Marketing y ventas', [
    ['HubSpot', 'ya integrado en X1 (CRM push) — este es el MCP oficial, más completo que el wrapper actual'],
    ['Salesforce', 'CRM enterprise — alternativa/complemento a Pipedrive/HubSpot'],
    ['Apollo.io', 'prospección B2B y datos de contacto'],
  ]],
  ['Gestión de proyectos', [
    ['Jira', 'seguimiento de tickets/sprints — muy usado, encaja con Operaciones/PMO'],
    ['Asana', 'gestión de tareas de equipo'],
    ['Linear', 'seguimiento de issues moderno, muy usado en equipos de producto/ingeniería'],
    ['Monday.com', 'gestión de trabajo visual'],
  ]],
  ['Productividad', [
    ['Notion', 'notas/wiki/bases de datos — altísimo valor, el más pedido de esta categoría'],
    ['Microsoft Teams', 'comunicación/colaboración Microsoft'],
    ['Evernote', 'notas personales'],
  ]],
];

function slugify(name) {
  return name.replace(/[^\w\s-]/g, '').trim().split(/\s+/).join('-');
}

const clusterDir = path.join(VAULT_ROOT, CLUSTER);
fs.mkdirSync(clusterDir, { recursive: true });

let count = 0;
const tableRows = [];

for (const [category, items] of CATEGORIES) {
  const catSlug = slugify(category).toLowerCase();
  for (const [name, desc] of items) {
    const slug = slugify(name);
    const notePath = path.join(clusterDir, slug + '.md');
    const body = [
      '---',
      `tags: [agente, conector, "tema/conectores", "categoria/${catSlug}", "nivel-1"]`,
      'tier: mcp',
      `dominio: conectores`,
      `subdominio: ${category}`,
      'nivel_integracion: mcp',
      'fuente: Claude Connectors Directory (Anthropic) — mismo protocolo MCP que X1MCPClient ya soporta',
      'candidato_desde: 2026-07-05',
      '---',
      '',
      `# ${name}`,
      '',
      `**Categoría:** ${category}`,
      '',
      `**Qué conecta:** ${desc}`,
      '',
      `Servidor MCP disponible en el directorio oficial de conectores de Claude (claude.com/connectors). Mismo protocolo que \`X1MCPClient\` ya implementa — añadirlo a X1 es \`X1MCPClient.addServer({name: '${name}', url: '<url del servidor MCP>'})\` una vez el usuario tenga (o despliegue) ese servidor corriendo. No requiere código nuevo en X1, solo configuración.`,
      '',
      '## Enlaces',
      `[[${HUB.replace('.md','')}]]`,
      '',
    ].join('\n');
    fs.writeFileSync(notePath, body, 'utf8');
    count++;
    tableRows.push({ category, name, slug, desc });
  }
}

// Build hub
let hubBody = [
  '---',
  'tags: [categoria, "tema/conectores", conector-mcp]',
  '---',
  '',
  '# Conectores (ecosistema MCP de Claude)',
  '',
  `Catálogo de ${count} conectores MCP tomados directamente del directorio oficial de Claude (claude.com/connectors, vía [rdmgator12/awesome-claude-connectors](https://github.com/rdmgator12/awesome-claude-connectors) — 343 conectores verificados en total, esta es una selección curada de los más relevantes para X1). Todos son Nivel 1 (MCP) por definición — el mismo protocolo que \`X1MCPClient\` ya implementa. Petición explícita de Ivan (2026-07-05): "añade todos los conectores que puedas, si es posible todos los de Claude".`,
  '',
  'Distinto de los demás clústeres: esto no son personas/especialistas, son **conectores de infraestructura/datos** — encajan con cualquier rol (Legal puede usar Docusign, Finanzas puede usar Stripe, etc.), así que viven en su propio clúster transversal en vez de plegarse en uno temático.',
  '',
];

let lastCat = null;
for (const row of tableRows) {
  if (row.category !== lastCat) {
    if (lastCat !== null) hubBody.push('');
    hubBody.push(`### ${row.category}`, '', '| Conector | Qué conecta |', '|---|---|');
    lastCat = row.category;
  }
  hubBody.push(`| [[${row.slug}]] | ${row.desc} |`);
}

hubBody.push('', '## Enlaces', '[[00-Indice]]', '');

fs.writeFileSync(path.join(clusterDir, HUB), hubBody.join('\n'), 'utf8');

console.log('Notes written:', count);
console.log('Categories:', CATEGORIES.length);
