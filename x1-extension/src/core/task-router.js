/**
 * Router por tipo de tarea (capability + coste).
 *
 * Complementa al Router por sector: en lugar de un dominio de negocio, clasifica
 * la NATURALEZA técnica de la petición (código simple/complejo, razonamiento
 * matemático, creativo, multilingüe, documentos largos, agente de larga
 * duración) y selecciona el modelo óptimo según una matriz de idoneidad,
 * el presupuesto disponible y las claves configuradas.
 *
 * Refleja la "Matriz de Decisión" del diseño maestro pero de forma ejecutable.
 */

import { stripAccents } from '../utils/text.js';
import { registry } from './providers/index.js';
import Logger from './logger.js';

const logger = new Logger('TaskRouter');

/** Tipos de tarea reconocidos. */
export const TASK_TYPES = {
  CODE_SIMPLE: 'code_simple',
  CODE_COMPLEX: 'code_complex',
  REASONING: 'reasoning',
  CREATIVE: 'creative',
  MULTILINGUAL: 'multilingual',
  LONG_DOCUMENT: 'long_document',
  AGENT: 'agent',
  GENERAL: 'general'
};

/**
 * Matriz de idoneidad modelo→tipo (0-5). Se usa como preferencia; el modelo
 * concreto se filtra luego por disponibilidad de clave y presupuesto.
 * Los "modelos" aquí son identificadores canónicos de gama.
 */
const SUITABILITY = {
  [TASK_TYPES.CODE_SIMPLE]: [
    ['deepseek-chat', 5], ['gpt-4o-mini', 4], ['glm-4-flash', 4], ['claude-3-5-haiku-20241022', 4]
  ],
  [TASK_TYPES.CODE_COMPLEX]: [
    ['claude-3-5-sonnet-20241022', 5], ['deepseek-chat', 4], ['gpt-4o', 4], ['glm-4-plus', 4]
  ],
  [TASK_TYPES.REASONING]: [
    ['deepseek-reasoner', 5], ['o1-mini', 5], ['glm-4-plus', 4], ['claude-3-5-sonnet-20241022', 4]
  ],
  [TASK_TYPES.CREATIVE]: [
    ['MiniMax-Text-01', 5], ['claude-3-5-sonnet-20241022', 5], ['gpt-4o', 4], ['gemini-1.5-pro', 4]
  ],
  [TASK_TYPES.MULTILINGUAL]: [
    ['MiniMax-Text-01', 5], ['gemini-1.5-pro', 4], ['gpt-4o', 4], ['deepseek-chat', 3]
  ],
  [TASK_TYPES.LONG_DOCUMENT]: [
    ['moonshot-v1-128k', 5], ['gemini-1.5-flash', 5], ['claude-3-5-sonnet-20241022', 4], ['gpt-4o-mini', 3]
  ],
  [TASK_TYPES.AGENT]: [
    ['claude-3-5-sonnet-20241022', 5], ['gpt-4o', 4], ['deepseek-chat', 3], ['glm-4-plus', 3]
  ],
  [TASK_TYPES.GENERAL]: [
    ['gpt-4o-mini', 4], ['gemini-1.5-flash', 4], ['deepseek-chat', 4], ['claude-3-5-haiku-20241022', 4]
  ]
};

/** Señales léxicas por tipo de tarea. */
const TYPE_SIGNALS = {
  [TASK_TYPES.CODE_COMPLEX]: ['refactoriza', 'arquitectura', 'optimiza el algoritmo', 'diseña el sistema', 'concurrencia', 'race condition', 'memory leak'],
  [TASK_TYPES.CODE_SIMPLE]: ['funcion', 'script', 'snippet', 'como imprimo', 'sintaxis', 'ejemplo de codigo', 'bug', 'error'],
  [TASK_TYPES.REASONING]: ['demuestra', 'calcula', 'resuelve', 'ecuacion', 'teorema', 'logica', 'matematic', 'probabilidad', 'por que'],
  [TASK_TYPES.CREATIVE]: ['escribe un', 'inventa', 'historia', 'poema', 'creativo', 'idea', 'brainstorm', 'eslogan', 'guion'],
  [TASK_TYPES.MULTILINGUAL]: ['traduce', 'translate', 'en ingles', 'en chino', 'en frances', 'idioma', 'multilingue'],
  [TASK_TYPES.LONG_DOCUMENT]: ['resume este documento', 'analiza el pdf', 'documento largo', 'transcripcion', 'todo el texto', 'informe completo'],
  [TASK_TYPES.AGENT]: ['automatiza', 'haz por mi', 'ejecuta', 'agente', 'multiples pasos', 'planifica y ejecuta', 'gestiona']
};

export class TaskRouter {
  /**
   * @param {Object} [deps]
   * @param {import('./cost/budget-manager.js').BudgetManager} [deps.budget]
   * @param {Object} [deps.config] - ConfigManager
   */
  constructor(deps = {}) {
    this.budget = deps.budget || null;
    this.config = deps.config || null;
  }

  /**
   * Clasifica el tipo de tarea de una consulta.
   * @param {string} query
   * @returns {{type:string, confidence:number, scores:Object}}
   */
  classify(query) {
    const text = stripAccents(query.toLowerCase());
    const scores = {};
    for (const [type, signals] of Object.entries(TYPE_SIGNALS)) {
      scores[type] = signals.reduce((acc, sig) => acc + (text.includes(stripAccents(sig)) ? 1 : 0), 0);
    }
    // Heurística de longitud: consultas muy largas => documento largo
    if (query.length > 4000) scores[TASK_TYPES.LONG_DOCUMENT] = (scores[TASK_TYPES.LONG_DOCUMENT] || 0) + 2;

    let best = TASK_TYPES.GENERAL;
    let bestScore = 0;
    let total = 0;
    for (const [type, score] of Object.entries(scores)) {
      total += score;
      if (score > bestScore) {
        bestScore = score;
        best = type;
      }
    }
    return {
      type: bestScore > 0 ? best : TASK_TYPES.GENERAL,
      confidence: total ? bestScore / total : 0,
      scores
    };
  }

  /**
   * Selecciona el mejor modelo disponible y asequible para una consulta.
   * @param {string} query
   * @param {Object} [options]
   * @param {boolean} [options.critical=false] - Permitir modelos caros/exceso
   * @param {string} [options.forcedType]
   * @returns {Promise<{model:string, type:string, suitability:number, reason:string}>}
   */
  async selectModel(query, options = {}) {
    const classification = options.forcedType
      ? { type: options.forcedType, confidence: 1 }
      : this.classify(query);
    const candidates = SUITABILITY[classification.type] || SUITABILITY[TASK_TYPES.GENERAL];

    // Filtrar por disponibilidad de proveedor (clave configurada)
    const available = [];
    for (const [model, suitability] of candidates) {
      const provider = registry.forModel(model);
      const health = await provider.health().catch(() => ({ ok: false }));
      if (health.ok) available.push({ model, suitability });
    }

    // Si ninguno tiene clave, devolver el preferido igualmente (fallará luego con
    // un error claro de clave faltante, que es informativo para el usuario).
    if (!available.length) {
      const [model, suitability] = candidates[0];
      return { model, type: classification.type, suitability, reason: 'sin claves disponibles; usando preferido' };
    }

    // Ordenar por idoneidad; con presupuesto, preferir el más asequible entre
    // los de idoneidad alta.
    available.sort((a, b) => b.suitability - a.suitability);

    if (this.budget && !options.critical) {
      const topTier = available.filter((m) => m.suitability >= available[0].suitability - 1);
      const affordable = await this.budget.cheapestAffordable(topTier.map((m) => m.model));
      if (affordable) {
        const picked = topTier.find((m) => m.model === affordable);
        return {
          model: affordable,
          type: classification.type,
          suitability: picked.suitability,
          reason: 'idoneidad alta + coste mínimo'
        };
      }
    }

    const best = available[0];
    logger.debug(`Tarea "${classification.type}" -> ${best.model}`);
    return {
      model: best.model,
      type: classification.type,
      suitability: best.suitability,
      reason: 'máxima idoneidad'
    };
  }
}

export default TaskRouter;
