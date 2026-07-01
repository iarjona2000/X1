/**
 * Tests para la detección de sector del Router.
 */

import { Router } from '../src/core/router.js';
import { SECTORS } from '../src/utils/constants.js';

describe('Router.detectSector', () => {
  const router = new Router({});

  test('detecta sector legal', () => {
    const { sector } = router.detectSector('Redacta una cláusula de un contrato conforme a la normativa');
    expect(sector).toBe(SECTORS.LEGAL);
  });

  test('detecta sector marketing', () => {
    const { sector } = router.detectSector('Necesito copy persuasivo para una campaña de publicidad en redes');
    expect(sector).toBe(SECTORS.MARKETING);
  });

  test('detecta sector finanzas', () => {
    const { sector } = router.detectSector('Analiza el balance y el flujo de ingresos y gastos del presupuesto');
    expect(sector).toBe(SECTORS.FINANCE);
  });

  test('detecta sector técnico', () => {
    const { sector } = router.detectSector('Tengo un bug en el código Python, ayúdame a hacer debug de la función');
    expect(sector).toBe(SECTORS.TECHNICAL);
  });

  test('detecta sector soporte', () => {
    const { sector } = router.detectSector('El cliente puso una queja y abrió un ticket de incidencia');
    expect(sector).toBe(SECTORS.SUPPORT);
  });

  test('cae a general con texto ambiguo', () => {
    const { sector } = router.detectSector('Hola, ¿qué tal estás hoy?');
    expect(sector).toBe(SECTORS.GENERAL);
  });

  test('devuelve puntuaciones por sector', () => {
    const { scores } = router.detectSector('contrato legal');
    expect(scores[SECTORS.LEGAL]).toBeGreaterThan(0);
  });
});

describe('Router.selectComparisonModels', () => {
  test('devuelve el número solicitado sin duplicados', async () => {
    const router = new Router({});
    const models = await router.selectComparisonModels(3);
    expect(models).toHaveLength(3);
    expect(new Set(models).size).toBe(3);
  });
});
