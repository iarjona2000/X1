/**
 * Utilidades de texto y tokenización aproximada.
 *
 * No incluimos un tokenizer BPE real (pesado). Para presupuestos de contexto
 * usamos una estimación calibrada (~4 chars/token en inglés, ~3.5 en español)
 * que es suficiente para recortar prompts y estimar costes.
 */

/**
 * Estima el número de tokens de un texto.
 * Heurística: combina conteo de palabras y de caracteres.
 * @param {string} text
 * @returns {number}
 */
export function estimateTokens(text) {
  if (!text) return 0;
  const chars = text.length;
  const words = (text.trim().match(/\S+/g) || []).length;
  // Media ponderada entre chars/4 y words/0.75
  const byChars = chars / 4;
  const byWords = words / 0.75;
  return Math.max(1, Math.round((byChars + byWords) / 2));
}

/**
 * Estima tokens de una lista de mensajes de chat, sumando un overhead por
 * mensaje (roles, separadores) similar al de las APIs tipo OpenAI.
 * @param {Array<{role:string, content:string}>} messages
 * @returns {number}
 */
export function estimateMessagesTokens(messages) {
  let total = 0;
  for (const m of messages) {
    total += estimateTokens(m.content || '') + 4; // overhead por mensaje
  }
  return total + 2; // overhead de cierre
}

/**
 * Trunca un texto a un máximo de tokens estimados, respetando límites de
 * palabra y añadiendo un sufijo indicativo.
 * @param {string} text
 * @param {number} maxTokens
 * @param {string} [suffix='…']
 * @returns {string}
 */
export function truncateToTokens(text, maxTokens, suffix = '…') {
  if (!text) return '';
  if (estimateTokens(text) <= maxTokens) return text;
  // Aproximar el corte por caracteres y ajustar
  const approxChars = maxTokens * 4;
  let cut = text.slice(0, approxChars);
  const lastSpace = cut.lastIndexOf(' ');
  if (lastSpace > approxChars * 0.6) cut = cut.slice(0, lastSpace);
  return cut.trimEnd() + suffix;
}

/**
 * Divide un texto largo en fragmentos (chunks) solapados, útil para
 * indexación en memoria vectorial. Corta preferentemente en límites de
 * párrafo/frase.
 * @param {string} text
 * @param {Object} [options]
 * @param {number} [options.chunkTokens=400]
 * @param {number} [options.overlapTokens=60]
 * @returns {string[]}
 */
export function chunkText(text, options = {}) {
  const { chunkTokens = 400, overlapTokens = 60 } = options;
  if (!text) return [];
  const paragraphs = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);

  const chunks = [];
  let current = '';
  const flush = () => {
    if (current.trim()) chunks.push(current.trim());
    current = '';
  };

  for (const para of paragraphs) {
    if (estimateTokens(current) + estimateTokens(para) > chunkTokens) {
      flush();
      // Si un solo párrafo excede el tamaño, partir por frases
      if (estimateTokens(para) > chunkTokens) {
        const sentences = para.match(/[^.!?]+[.!?]*/g) || [para];
        for (const s of sentences) {
          if (estimateTokens(current) + estimateTokens(s) > chunkTokens) flush();
          current += s;
        }
      } else {
        current = para;
      }
    } else {
      current += (current ? '\n\n' : '') + para;
    }
  }
  flush();

  // Aplicar solapamiento tomando el final del chunk previo
  if (overlapTokens > 0 && chunks.length > 1) {
    const overlapped = [];
    for (let i = 0; i < chunks.length; i++) {
      if (i === 0) {
        overlapped.push(chunks[i]);
        continue;
      }
      const prev = chunks[i - 1];
      const tail = truncateToTokens(prev.split(' ').slice(-40).join(' '), overlapTokens, '');
      overlapped.push(`${tail} ${chunks[i]}`.trim());
    }
    return overlapped;
  }
  return chunks;
}

/**
 * Normaliza espacios en blanco (colapsa múltiples, recorta extremos).
 * @param {string} text
 * @returns {string}
 */
export function normalizeWhitespace(text) {
  return (text || '').replace(/\s+/g, ' ').trim();
}

/**
 * Elimina acentos/diacríticos para comparaciones laxas.
 * @param {string} text
 * @returns {string}
 */
export function stripAccents(text) {
  return (text || '').normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/**
 * Slug seguro para claves/nombres de fichero.
 * @param {string} text
 * @returns {string}
 */
export function slugify(text) {
  return stripAccents(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/**
 * Extrae bloques de código markdown de un texto.
 * @param {string} text
 * @returns {Array<{lang:string, code:string}>}
 */
export function extractCodeBlocks(text) {
  const blocks = [];
  const re = /```(\w+)?\n([\s\S]*?)```/g;
  let match;
  while ((match = re.exec(text)) !== null) {
    blocks.push({ lang: match[1] || '', code: match[2] });
  }
  return blocks;
}

/**
 * Parseo tolerante de JSON embebido en texto (p.ej. respuestas de modelos que
 * envuelven el JSON en markdown o añaden texto). Devuelve null si no logra.
 * @param {string} text
 * @returns {*|null}
 */
export function parseLooseJson(text) {
  if (!text || typeof text !== 'string') return null;
  // 1. Intento directo
  try {
    return JSON.parse(text);
  } catch {
    /* seguir */
  }
  // 2. Bloque de código ```json
  const codeBlocks = extractCodeBlocks(text);
  for (const block of codeBlocks) {
    try {
      return JSON.parse(block.code);
    } catch {
      /* seguir */
    }
  }
  // 3. Primer {...} o [...] balanceado
  const candidates = extractBalanced(text, '{', '}').concat(
    extractBalanced(text, '[', ']')
  );
  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      /* seguir */
    }
  }
  return null;
}

/**
 * Extrae subcadenas con delimitadores balanceados.
 * @param {string} text
 * @param {string} open
 * @param {string} close
 * @returns {string[]}
 * @private
 */
function extractBalanced(text, open, close) {
  const results = [];
  let depth = 0;
  let start = -1;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === open) {
      if (depth === 0) start = i;
      depth++;
    } else if (text[i] === close) {
      depth--;
      if (depth === 0 && start !== -1) {
        results.push(text.slice(start, i + 1));
        start = -1;
      }
    }
  }
  return results;
}

/**
 * Calcula similitud de Jaccard entre dos textos (a nivel de tokens).
 * Rápida y sin embeddings; útil para deduplicación y fact-check básico.
 * @param {string} a
 * @param {string} b
 * @returns {number} 0..1
 */
export function jaccardSimilarity(a, b) {
  const setA = new Set(stripAccents(a).toLowerCase().match(/\w+/g) || []);
  const setB = new Set(stripAccents(b).toLowerCase().match(/\w+/g) || []);
  if (!setA.size && !setB.size) return 1;
  let inter = 0;
  for (const t of setA) if (setB.has(t)) inter++;
  return inter / (setA.size + setB.size - inter);
}

export default {
  estimateTokens,
  estimateMessagesTokens,
  truncateToTokens,
  chunkText,
  normalizeWhitespace,
  stripAccents,
  slugify,
  extractCodeBlocks,
  parseLooseJson,
  jaccardSimilarity
};
