/**
 * Configuración de Babel compartida por webpack (bundling) y Jest (tests).
 * preset-env transpila ESM/ES2020+ al target del entorno. Bajo Jest usamos
 * el target de la versión de Node en ejecución para que import/export y
 * async/await funcionen sin configuración adicional.
 */
module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' } }]
  ]
};
