/**
 * Herramientas utilitarias independientes de servicios externos: cálculo,
 * fecha/hora, y una herramienta "final_answer" que los agentes usan para
 * terminar explícitamente con una respuesta al usuario.
 */

import { Tool } from '../tool.js';

/**
 * @returns {Tool[]}
 */
export function createUtilityTools() {
  return [
    new Tool({
      name: 'calculator',
      description:
        'Evalúa una expresión aritmética segura (+, -, *, /, paréntesis, potencias). No usa variables.',
      parameters: {
        type: 'object',
        properties: {
          expression: { type: 'string', description: 'Expresión, p.ej. "(1200*1.21)/3"' }
        },
        required: ['expression']
      },
      execute: async ({ expression }) => {
        const result = safeEval(expression);
        return { result };
      }
    }),

    new Tool({
      name: 'current_datetime',
      description: 'Devuelve la fecha y hora actuales, útil para agendar o fechar contenido.',
      parameters: { type: 'object', properties: {} },
      execute: async () => {
        const now = new Date();
        return {
          iso: now.toISOString(),
          local: now.toLocaleString('es-ES'),
          weekday: now.toLocaleDateString('es-ES', { weekday: 'long' }),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        };
      }
    }),

    new Tool({
      name: 'final_answer',
      description:
        'Entrega la respuesta final al usuario y finaliza la tarea. Úsala cuando tengas la solución completa.',
      parameters: {
        type: 'object',
        properties: {
          answer: { type: 'string', description: 'Respuesta final para el usuario' }
        },
        required: ['answer']
      },
      execute: async ({ answer }) => ({ answer, final: true })
    })
  ];
}

/**
 * Evaluador aritmético seguro por shunting-yard (sin eval ni acceso a globals).
 * @param {string} expr
 * @returns {number}
 */
export function safeEval(expr) {
  const tokens = tokenize(expr);
  const rpn = toRPN(tokens);
  return evalRPN(rpn);
}

function tokenize(expr) {
  const tokens = [];
  let i = 0;
  const s = expr.replace(/\s+/g, '');
  while (i < s.length) {
    const c = s[i];
    if (/[0-9.]/.test(c)) {
      let num = '';
      while (i < s.length && /[0-9.]/.test(s[i])) num += s[i++];
      tokens.push({ type: 'num', value: parseFloat(num) });
    } else if ('+-*/^()'.includes(c)) {
      tokens.push({ type: 'op', value: c });
      i++;
    } else {
      throw new Error(`Carácter no permitido en expresión: "${c}"`);
    }
  }
  return tokens;
}

function toRPN(tokens) {
  const out = [];
  const ops = [];
  const prec = { '+': 1, '-': 1, '*': 2, '/': 2, '^': 3 };
  const rightAssoc = { '^': true };
  for (const t of tokens) {
    if (t.type === 'num') out.push(t);
    else if (t.value === '(') ops.push(t);
    else if (t.value === ')') {
      while (ops.length && ops[ops.length - 1].value !== '(') out.push(ops.pop());
      ops.pop();
    } else {
      while (
        ops.length &&
        ops[ops.length - 1].value !== '(' &&
        (prec[ops[ops.length - 1].value] > prec[t.value] ||
          (prec[ops[ops.length - 1].value] === prec[t.value] && !rightAssoc[t.value]))
      ) {
        out.push(ops.pop());
      }
      ops.push(t);
    }
  }
  while (ops.length) out.push(ops.pop());
  return out;
}

function evalRPN(rpn) {
  const stack = [];
  for (const t of rpn) {
    if (t.type === 'num') stack.push(t.value);
    else {
      const b = stack.pop();
      const a = stack.pop();
      if (a === undefined || b === undefined) throw new Error('Expresión inválida');
      switch (t.value) {
        case '+': stack.push(a + b); break;
        case '-': stack.push(a - b); break;
        case '*': stack.push(a * b); break;
        case '/': stack.push(a / b); break;
        case '^': stack.push(Math.pow(a, b)); break;
        default: throw new Error(`Operador desconocido: ${t.value}`);
      }
    }
  }
  if (stack.length !== 1) throw new Error('Expresión inválida');
  return stack[0];
}

export default createUtilityTools;
