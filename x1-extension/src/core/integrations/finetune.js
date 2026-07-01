/**
 * Fine-tuning con Hugging Face.
 *
 * Prepara datasets en formato instrucción→respuesta a partir de ejemplos del
 * usuario (correos, documentos, pares Q&A), y coordina la evaluación ciega
 * entre el modelo base y el fine-tuneado. La ejecución real del entrenamiento
 * ocurre fuera del navegador (Inference Endpoints / TRL); aquí gestionamos la
 * preparación de datos, el registro del job y la evaluación comparativa.
 */

import { registry } from '../providers/index.js';
import { HttpClient } from '../../utils/http.js';
import { ids } from '../../utils/id.js';
import { ValidationError } from '../../utils/errors.js';
import Logger from '../logger.js';

const logger = new Logger('FineTune');
const STORAGE_KEY = 'x1_finetune_jobs';

export class FineTuneManager {
  /**
   * @param {Object} deps
   * @param {{get:Function, set:Function}} deps.store
   * @param {Function} deps.getApiKey - (provider) => Promise<string>
   */
  constructor(deps) {
    this.store = deps.store;
    this.getApiKey = deps.getApiKey;
  }

  /**
   * Construye un dataset de instrucción→respuesta a partir de ejemplos.
   * @param {Array<{input:string, output:string, instruction?:string}>} examples
   * @param {Object} [options]
   * @param {'chatml'|'alpaca'|'jsonl'} [options.format='chatml']
   * @returns {{format:string, data:Array, count:number}}
   */
  buildDataset(examples, options = {}) {
    const { format = 'chatml' } = options;
    if (!examples?.length) throw new ValidationError('Se necesitan ejemplos para el dataset');

    const clean = examples
      .filter((e) => e.input && e.output)
      .map((e) => ({
        instruction: e.instruction || 'Responde en el estilo del usuario.',
        input: e.input.trim(),
        output: e.output.trim()
      }));

    let data;
    if (format === 'alpaca') {
      data = clean;
    } else if (format === 'jsonl') {
      data = clean.map((e) => ({ prompt: `${e.instruction}\n${e.input}`, completion: e.output }));
    } else {
      // chatml (messages)
      data = clean.map((e) => ({
        messages: [
          { role: 'system', content: e.instruction },
          { role: 'user', content: e.input },
          { role: 'assistant', content: e.output }
        ]
      }));
    }

    logger.info(`Dataset construido: ${data.length} ejemplos (${format})`);
    return { format, data, count: data.length };
  }

  /**
   * Deriva ejemplos de estilo a partir de correos enviados por el usuario
   * (usa el asunto/consulta como input y el cuerpo como output objetivo).
   * @param {Array<{subject:string, body:string}>} sentEmails
   * @returns {Array}
   */
  examplesFromEmails(sentEmails) {
    return sentEmails
      .filter((m) => m.body && m.body.length > 40)
      .map((m) => ({
        instruction: 'Redacta un correo en mi estilo personal.',
        input: `Asunto: ${m.subject}`,
        output: m.body
      }));
  }

  /**
   * Registra un job de fine-tuning (estado local; el entrenamiento es externo).
   * @param {Object} params
   * @param {string} params.baseModel - Repo HF base (p.ej. mistralai/Mistral-7B-Instruct-v0.3)
   * @param {Object} params.dataset - Salida de buildDataset
   * @param {string} [params.agentId] - Agente al que se asociará
   * @returns {Promise<Object>} job
   */
  async createJob({ baseModel, dataset, agentId }) {
    if (!baseModel) throw new ValidationError('Falta el modelo base');
    if (!dataset?.count) throw new ValidationError('Dataset vacío');

    const job = {
      id: ids.prefixedId?.('ft') || `ft_${Date.now()}`,
      baseModel,
      agentId: agentId || null,
      exampleCount: dataset.count,
      format: dataset.format,
      status: 'prepared',
      createdAt: new Date().toISOString(),
      resultModelId: null
    };

    const jobs = await this.listJobs();
    jobs.push(job);
    await this.store.set(STORAGE_KEY, jobs);
    logger.info(`Job de fine-tuning registrado: ${job.id}`);
    return job;
  }

  /**
   * Lista los jobs registrados.
   * @returns {Promise<Array>}
   */
  async listJobs() {
    return (await this.store.get(STORAGE_KEY)) || [];
  }

  /**
   * Marca un job como completado y asocia el modelo resultante.
   * @param {string} jobId
   * @param {string} resultModelId - Repo/endpoint del modelo fine-tuneado
   * @returns {Promise<Object>}
   */
  async completeJob(jobId, resultModelId) {
    const jobs = await this.listJobs();
    const job = jobs.find((j) => j.id === jobId);
    if (!job) throw new ValidationError(`Job no encontrado: ${jobId}`);
    job.status = 'completed';
    job.resultModelId = resultModelId;
    job.completedAt = new Date().toISOString();
    await this.store.set(STORAGE_KEY, jobs);
    return job;
  }

  /**
   * Evaluación ciega entre modelo base y fine-tuneado sobre consultas de prueba.
   * Genera pares de respuestas para que el usuario vote; devuelve el material
   * y una recomendación cuando hay suficientes votos.
   * @param {Object} params
   * @param {string} params.baseModel
   * @param {string} params.tunedModel
   * @param {string[]} params.testQueries
   * @returns {Promise<{pairs:Array}>}
   */
  async blindEval({ baseModel, tunedModel, testQueries }) {
    const baseProvider = registry.forModel(baseModel);
    const tunedProvider = registry.forModel(tunedModel);
    const pairs = [];

    for (const query of testQueries.slice(0, 10)) {
      const messages = [
        { role: 'system', content: 'Responde de forma útil y en el estilo esperado.' },
        { role: 'user', content: query }
      ];
      const [a, b] = await Promise.all([
        baseProvider.complete(baseModel, messages, { maxTokens: 400 }).catch((e) => ({ text: `[error: ${e.message}]` })),
        tunedProvider.complete(tunedModel, messages, { maxTokens: 400 }).catch((e) => ({ text: `[error: ${e.message}]` }))
      ]);

      // Barajar posiciones para voto ciego
      const flip = Math.random() < 0.5;
      pairs.push({
        query,
        optionA: flip ? { model: 'tuned', text: b.text } : { model: 'base', text: a.text },
        optionB: flip ? { model: 'base', text: a.text } : { model: 'tuned', text: b.text }
      });
    }
    return { pairs };
  }

  /**
   * Calcula si el modelo fine-tuneado debe activarse según los votos.
   * @param {Array<{winner:'base'|'tuned'}>} votes
   * @param {number} [threshold=0.7]
   * @returns {{tunedWinRate:number, activate:boolean}}
   */
  evaluateVotes(votes, threshold = 0.7) {
    if (!votes.length) return { tunedWinRate: 0, activate: false };
    const tunedWins = votes.filter((v) => v.winner === 'tuned').length;
    const rate = tunedWins / votes.length;
    return { tunedWinRate: rate, activate: rate >= threshold };
  }
}

export default FineTuneManager;
