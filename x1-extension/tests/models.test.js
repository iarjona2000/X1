/**
 * Tests para ModelManager
 */

import { ModelManager } from '../src/core/models.js';

describe('ModelManager', () => {
  describe('getAvailableModels', () => {
    test('debería retornar lista de modelos para proveedor válido', () => {
      const models = ModelManager.getAvailableModels('openai');
      expect(Array.isArray(models)).toBe(true);
      expect(models.length).toBeGreaterThan(0);
      expect(models).toContain('gpt-4o');
    });

    test('debería retornar lista vacía para proveedor inválido', () => {
      const models = ModelManager.getAvailableModels('invalid');
      expect(Array.isArray(models)).toBe(true);
    });
  });

  describe('estimateCost', () => {
    test('debería calcular costo correcto para OpenAI', () => {
      const cost = ModelManager.estimateCost('GPT-3.5 Turbo', 100, 100);
      expect(cost).toBeGreaterThan(0);
      expect(cost).toBeLessThan(0.01); // Pequeño costo
    });

    test('debería retornar 0 para modelos gratuitos', () => {
      const cost = ModelManager.estimateCost('Mistral 7B', 1000, 1000);
      expect(cost).toBe(0);
    });

    test('debería retornar 0 para modelos locales', () => {
      const cost = ModelManager.estimateCost('Llama 3', 5000, 5000);
      expect(cost).toBe(0);
    });
  });
});
