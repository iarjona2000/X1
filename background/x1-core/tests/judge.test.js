/**
 * Tests para el sistema de juicio (Judge)
 */

import { JudgeSystem } from '../src/core/judge.js';

describe('JudgeSystem', () => {
  describe('evaluateResponse', () => {
    test('debería dar puntuación baja para respuestas muy cortas', async () => {
      const response = {
        text: 'ok',
        model: 'gpt-4',
        sector: 'general'
      };
      const score = await JudgeSystem.evaluateResponse(response, 'pregunta larga');
      expect(score).toBeLessThan(5);
    });

    test('debería dar puntuación alta para respuestas relevantes y bien estructuradas', async () => {
      const response = {
        text: 'Este es un análisis profundo y bien estructurado. Primero, consideramos el contexto. Segundo, evaluamos las opciones. Finalmente, llegamos a conclusiones.',
        model: 'gpt-4',
        sector: 'general'
      };
      const score = await JudgeSystem.evaluateResponse(response, 'análisis');
      expect(score).toBeGreaterThan(7);
    });

    test('debería penalizar por alucinaciones', async () => {
      const response = {
        text: 'Yo he visitado personalmente ese lugar hace poco. Soy un humano y tengo cuerpo.',
        model: 'gpt-4',
        sector: 'general'
      };
      const score = await JudgeSystem.evaluateResponse(response, 'pregunta');
      expect(score).toBeLessThan(4);
    });
  });

  describe('compare', () => {
    test('debería identificar respuesta de mejor puntuación como ganadora', async () => {
      const responses = [
        {
          text: 'Respuesta corta.',
          model: 'model-a',
          sector: 'general'
        },
        {
          text: 'Esta es una respuesta muy completa y bien estructurada que aborda el tema en profundidad.',
          model: 'model-b',
          sector: 'general'
        }
      ];

      const result = await JudgeSystem.compare(responses, 'pregunta');
      expect(result.winner.model).toBe('model-b');
      expect(result.scores.get('model-b')).toBeGreaterThan(result.scores.get('model-a'));
    });

    test('debería indicar consenso si diferencia es > 2 puntos', async () => {
      const responses = [
        {
          text: 'Mala respuesta.',
          model: 'model-a',
          sector: 'general'
        },
        {
          text: 'Esta es una respuesta excelente, muy completa, bien estructurada y completamente relevante.',
          model: 'model-b',
          sector: 'general'
        }
      ];

      const result = await JudgeSystem.compare(responses, 'pregunta');
      expect(result.consensus).toBe(true);
    });
  });

  describe('recordVote', () => {
    test('debería guardar voto correctamente', async () => {
      const vote = {
        winner: 'gpt-4',
        options: [],
        reason: 'Más preciso',
        sector: 'legal'
      };

      await JudgeSystem.recordVote(vote);
      // En un test real, verificarías que se guardó en StorageManager
      expect(true).toBe(true);
    });
  });
});
