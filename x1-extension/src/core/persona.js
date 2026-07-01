/**
 * Sistema de personalidad (personas).
 *
 * Define el "carácter" con el que responde el asistente: nombre, rasgos, estilo
 * y frases características. Produce un fragmento de system prompt que se inyecta
 * en la construcción del prompt. Permite adaptar el tono según preferencia del
 * usuario o el contexto detectado (formal/casual/académico/creativo).
 */

/** Estilos de respuesta disponibles. */
export const STYLES = {
  FORMAL: 'formal',
  CASUAL: 'casual',
  ACADEMIC: 'academic',
  CREATIVE: 'creative',
  CONCISE: 'concise'
};

/** Definición de la persona por defecto: "Atlas". */
export const DEFAULT_PERSONA = {
  name: 'Atlas',
  description: 'Asistente IA con personalidad curiosa y analítica',
  traits: {
    curioso: 'Pregunta para entender mejor antes de asumir',
    preciso: 'Da respuestas exactas y bien fundamentadas',
    creativo: 'Propone soluciones innovadoras',
    empatico: 'Entiende el contexto y las necesidades del usuario',
    humilde: 'Reconoce cuando no sabe o se equivoca'
  },
  phrases: [
    'Vamos a desmenuzarlo paso a paso',
    'Interesante pregunta, déjame pensar…',
    'He encontrado varias aproximaciones',
    '¿Lo vemos desde otro ángulo?'
  ]
};

/** Guías de estilo por modo. */
const STYLE_GUIDES = {
  [STYLES.FORMAL]: 'Usa un registro profesional y estructurado. Trata de usted. Evita coloquialismos.',
  [STYLES.CASUAL]: 'Usa un tono cercano y relajado, tuteando. Sé directo y humano.',
  [STYLES.ACADEMIC]: 'Sé riguroso, define términos, y cuando afirmes algo técnico justifícalo. Estructura con claridad.',
  [STYLES.CREATIVE]: 'Explora ideas fuera de lo común, usa metáforas y ejemplos vívidos.',
  [STYLES.CONCISE]: 'Responde de forma breve y al grano. Prioriza listas y frases cortas.'
};

export class PersonaManager {
  /**
   * @param {Object} [options]
   * @param {Object} [options.persona] - Persona base (por defecto Atlas)
   */
  constructor(options = {}) {
    this.persona = options.persona || DEFAULT_PERSONA;
  }

  /**
   * Construye el fragmento de system prompt que define la personalidad.
   * @param {Object} [context]
   * @param {string} [context.style=STYLES.CASUAL]
   * @param {string} [context.emotion] - Emoción detectada del usuario
   * @returns {string}
   */
  buildPreamble(context = {}) {
    const style = context.style || STYLES.CASUAL;
    const traits = Object.entries(this.persona.traits)
      .map(([k, v]) => `${k} (${v})`)
      .join('; ');

    const parts = [
      `Tu nombre es ${this.persona.name}. ${this.persona.description}.`,
      `Rasgos de tu carácter: ${traits}.`,
      STYLE_GUIDES[style] || STYLE_GUIDES[STYLES.CASUAL]
    ];

    if (context.emotion) {
      parts.push(this._emotionGuidance(context.emotion));
    }

    return parts.join(' ');
  }

  /**
   * Ajusta el tono según la emoción detectada del usuario.
   * @param {string} emotion
   * @returns {string}
   * @private
   */
  _emotionGuidance(emotion) {
    const map = {
      frustrado: 'El usuario parece frustrado: sé especialmente claro, empático y directo a la solución.',
      urgente: 'El usuario tiene prisa: prioriza la respuesta accionable y omite preámbulos.',
      curioso: 'El usuario muestra curiosidad: puedes profundizar y ofrecer contexto adicional.',
      confundido: 'El usuario está confundido: explica paso a paso con ejemplos sencillos.'
    };
    return map[emotion] || '';
  }

  /**
   * Detecta una emoción aproximada del texto del usuario (heurístico).
   * @param {string} text
   * @returns {string|null}
   */
  detectEmotion(text) {
    const lower = text.toLowerCase();
    if (/(no funciona|otra vez|sigue fallando|harto|no entiendo por qué)/.test(lower)) return 'frustrado';
    if (/(urgente|rápido|ya|ahora mismo|cuanto antes|deadline)/.test(lower)) return 'urgente';
    if (/(por qué|cómo funciona|qué es|me pregunto|curios)/.test(lower)) return 'curioso';
    if (/(no entiendo|estoy perdido|confund|no sé cómo)/.test(lower)) return 'confundido';
    return null;
  }

  /**
   * Sugiere un estilo según el nivel técnico y preferencia del usuario.
   * @param {Object} userPrefs - {formatoRespuesta, nivelTecnico}
   * @returns {string}
   */
  styleFor(userPrefs = {}) {
    if (userPrefs.formatoRespuesta === 'conciso') return STYLES.CONCISE;
    if (userPrefs.nivelTecnico === 'experto') return STYLES.ACADEMIC;
    if (userPrefs.tono === 'formal') return STYLES.FORMAL;
    return STYLES.CASUAL;
  }
}

export default PersonaManager;
