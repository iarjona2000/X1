/**
 * Definición de un Agente de X1.
 *
 * Un Agente es una configuración declarativa: nombre, modelo base,
 * instrucciones (system prompt), herramientas permitidas, base de conocimiento
 * y ajustes de comportamiento. No contiene lógica de ejecución (eso vive en
 * AgentRuntime); esto lo hace serializable y persistible en storage.
 */

import { ids } from '../../utils/id.js';
import { v } from '../../utils/validation.js';

/** Esquema de validación de un agente. */
export const agentSchema = v.object({
  id: v.string().optional(),
  name: v.string().min(1).max(60),
  description: v.string().max(500).default(''),
  model: v.string().default('gpt-4o-mini'),
  instructions: v.string().max(8000).default(''),
  tools: v.array(v.string()).default([]),
  scopes: v.array(v.string()).default([]),
  temperature: v.number().min(0).max(2).default(0.7),
  maxTokens: v.number().min(1).max(8192).default(1024),
  maxSteps: v.number().min(1).max(30).default(8),
  knowledgeBase: v.array(v.string()).default([]),
  fineTuned: v.boolean().default(false),
  fineTunedModelId: v.string().optional(),
  useMemory: v.boolean().default(true),
  createdAt: v.string().optional(),
  updatedAt: v.string().optional()
});

export class Agent {
  /**
   * @param {Object} config - Ver agentSchema
   */
  constructor(config) {
    const validated = agentSchema.parse(config);
    this.id = validated.id || ids.agent();
    this.name = validated.name;
    this.description = validated.description;
    this.model = validated.model;
    this.instructions = validated.instructions;
    this.tools = validated.tools;
    this.scopes = validated.scopes;
    this.temperature = validated.temperature;
    this.maxTokens = validated.maxTokens;
    this.maxSteps = validated.maxSteps;
    this.knowledgeBase = validated.knowledgeBase;
    this.fineTuned = validated.fineTuned;
    this.fineTunedModelId = validated.fineTunedModelId;
    this.useMemory = validated.useMemory;
    this.createdAt = validated.createdAt || new Date().toISOString();
    this.updatedAt = validated.updatedAt || this.createdAt;
  }

  /**
   * Modelo efectivo (usa el fine-tuned si está activo).
   * @returns {string}
   */
  effectiveModel() {
    return this.fineTuned && this.fineTunedModelId ? this.fineTunedModelId : this.model;
  }

  /**
   * Construye el system prompt final del agente combinando instrucciones,
   * herramientas disponibles y una guía de comportamiento base.
   * @param {Object} [context]
   * @param {string} [context.memoryContext]
   * @param {string} [context.knowledgeContext]
   * @param {string[]} [context.availableTools]
   * @returns {string}
   */
  buildSystemPrompt(context = {}) {
    const parts = [];
    parts.push(
      this.instructions ||
        `Eres ${this.name}, un asistente de IA especializado. ${this.description}`
    );

    if (context.availableTools?.length) {
      parts.push(
        `\nTienes acceso a estas herramientas: ${context.availableTools.join(', ')}. ` +
          'Úsalas cuando aporten valor. Cuando tengas la respuesta definitiva, usa la herramienta "final_answer".'
      );
    }

    if (this.useMemory && context.memoryContext) {
      parts.push(`\n### MEMORIA DEL USUARIO\n${context.memoryContext}`);
    }

    if (context.knowledgeContext) {
      parts.push(`\n### BASE DE CONOCIMIENTO\n${context.knowledgeContext}`);
    }

    parts.push(
      '\nActúa de forma precisa y honesta. Si no dispones de un dato, dilo en lugar de inventarlo.'
    );

    return parts.join('\n');
  }

  /**
   * Serializa el agente a objeto plano (para storage).
   * @returns {Object}
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      model: this.model,
      instructions: this.instructions,
      tools: this.tools,
      scopes: this.scopes,
      temperature: this.temperature,
      maxTokens: this.maxTokens,
      maxSteps: this.maxSteps,
      knowledgeBase: this.knowledgeBase,
      fineTuned: this.fineTuned,
      fineTunedModelId: this.fineTunedModelId,
      useMemory: this.useMemory,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  /**
   * Reconstruye un Agent desde su forma serializada.
   * @param {Object} json
   * @returns {Agent}
   */
  static fromJSON(json) {
    return new Agent(json);
  }
}

export default Agent;
