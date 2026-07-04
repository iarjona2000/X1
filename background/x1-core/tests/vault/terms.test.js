/**
 * Tests de extracción de términos del prompt (spec §5).
 */

import { extractPromptTerms } from '../../core/orchestration/vault/terms.js';
import { lightStem, foldAccents, tokenize } from '../../core/orchestration/vault/normalize.js';

describe('foldAccents / tokenize', () => {
  test('elimina tildes', () => {
    expect(foldAccents('revisión código análisis')).toBe('revision codigo analisis');
  });
  test('tokeniza partiendo por no-alfanuméricos', () => {
    expect(tokenize('Impacto-fiscal, del contrato!')).toEqual(['impacto', 'fiscal', 'del', 'contrato']);
  });
});

describe('lightStem — plurales', () => {
  test('plural -es', () => {
    expect(lightStem('legales')).toBe('legal');
    expect(lightStem('revisiones')).toBe('revision');
  });
  test('plural -s', () => {
    expect(lightStem('datos')).toBe('dato');
  });
  test('palabras cortas no se tocan', () => {
    expect(lightStem('seo')).toBe('seo');
  });
});

describe('extractPromptTerms', () => {
  test('elimina stopwords y normaliza', () => {
    const terms = extractPromptTerms('Quiero que revises el contrato');
    expect(terms).toContain('revises');
    expect(terms).toContain('contrato');
    expect(terms).not.toContain('el');
    expect(terms).not.toContain('que');
  });

  test('"revisiones legales" produce los stems "revision" y "legal" (spec §5)', () => {
    const terms = extractPromptTerms('revisiones legales del acuerdo');
    expect(terms).toContain('revision');
    expect(terms).toContain('legal');
  });

  test('genera n-gramas compuestos para capacidades con guion', () => {
    const terms = extractPromptTerms('analiza el impacto fiscal');
    expect(terms).toContain('impacto-fiscal');
  });

  test('acentos foldeados: "análisis" → término "analisis"', () => {
    const terms = extractPromptTerms('haz un análisis');
    expect(terms).toContain('analisis');
  });

  test('entrada vacía o no-string → array vacío, sin lanzar', () => {
    expect(extractPromptTerms('')).toEqual([]);
    expect(extractPromptTerms(null)).toEqual([]);
    expect(extractPromptTerms(undefined)).toEqual([]);
  });

  test('devuelve términos únicos', () => {
    const terms = extractPromptTerms('contrato contrato contrato');
    const contratos = terms.filter((t) => t === 'contrato');
    expect(contratos.length).toBe(1);
  });
});
