/**
 * Tests para el sistema de herramientas y el evaluador aritmético seguro.
 */

import { Tool, ToolRegistry } from '../src/core/agents/tool.js';
import { safeEval, createUtilityTools } from '../src/core/agents/tools/utility-tools.js';
import { ToolError } from '../src/utils/errors.js';

describe('safeEval', () => {
  test('operaciones básicas', () => {
    expect(safeEval('1+2*3')).toBe(7);
    expect(safeEval('(1+2)*3')).toBe(9);
    expect(safeEval('2^10')).toBe(1024);
    expect(safeEval('10/4')).toBeCloseTo(2.5);
  });
  test('rechaza caracteres no permitidos', () => {
    expect(() => safeEval('alert(1)')).toThrow();
  });
});

describe('Tool', () => {
  test('genera definición de function calling', () => {
    const tool = new Tool({
      name: 'saludar',
      description: 'Saluda',
      parameters: { type: 'object', properties: { nombre: { type: 'string' } } },
      execute: async ({ nombre }) => `Hola ${nombre}`
    });
    const def = tool.toFunctionDef();
    expect(def.type).toBe('function');
    expect(def.function.name).toBe('saludar');
  });

  test('run ejecuta y envuelve errores en ToolError', async () => {
    const tool = new Tool({
      name: 'falla',
      description: 'Siempre falla',
      execute: async () => {
        throw new Error('boom');
      }
    });
    await expect(tool.run({})).rejects.toBeInstanceOf(ToolError);
  });
});

describe('ToolRegistry', () => {
  test('registra y ejecuta herramientas', async () => {
    const registry = new ToolRegistry();
    registry.registerAll(createUtilityTools());
    expect(registry.has('calculator')).toBe(true);
    const result = await registry.run('calculator', { expression: '3+4' });
    expect(result.result).toBe(7);
  });

  test('functionDefs filtra por nombres permitidos', () => {
    const registry = new ToolRegistry();
    registry.registerAll(createUtilityTools());
    const defs = registry.functionDefs(['calculator']);
    expect(defs).toHaveLength(1);
    expect(defs[0].function.name).toBe('calculator');
  });

  test('final_answer marca final', async () => {
    const registry = new ToolRegistry();
    registry.registerAll(createUtilityTools());
    const result = await registry.run('final_answer', { answer: 'listo' });
    expect(result.final).toBe(true);
    expect(result.answer).toBe('listo');
  });

  test('lanza ToolError con herramienta desconocida', async () => {
    const registry = new ToolRegistry();
    await expect(registry.run('inexistente', {})).rejects.toBeInstanceOf(ToolError);
  });
});
