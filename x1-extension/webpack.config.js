/**
 * Configuración de webpack para X1.
 *
 * Empaqueta los entry points (popup, options, service worker, content scripts)
 * a `dist/` y, mediante un plugin ligero SIN dependencias externas, copia los
 * recursos estáticos (manifest, HTML, CSS, iconos) preservando la estructura
 * de rutas que declara el manifest. Así `dist/` queda listo para "Cargar
 * extensión sin empaquetar".
 */

const path = require('path');
const fs = require('fs');

/**
 * Plugin interno que copia archivos estáticos a la carpeta de salida tras
 * cada emisión. No requiere copy-webpack-plugin (cero dependencias nuevas).
 */
class CopyStaticPlugin {
  /**
   * @param {Array<{from:string, to:string}>} items - rutas relativas al proyecto
   */
  constructor(items) {
    this.items = items;
  }

  apply(compiler) {
    const outputPath = compiler.options.output.path;
    compiler.hooks.afterEmit.tap('CopyStaticPlugin', () => {
      for (const { from, to } of this.items) {
        const src = path.resolve(__dirname, from);
        const dest = path.resolve(outputPath, to);
        if (!fs.existsSync(src)) {
          // No abortar el build por un estático ausente (p.ej. iconos opcionales)
          console.warn(`[CopyStaticPlugin] omitido (no existe): ${from}`);
          continue;
        }
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.cpSync(src, dest, { recursive: true });
      }
    });
  }
}

module.exports = {
  entry: {
    'src/popup/popup': './src/popup/popup.js',
    'src/options/options': './src/options/options.js',
    'src/background/service-worker': './src/background/service-worker.js',
    'src/content/chat': './src/content/chat.js',
    'src/content/workspace': './src/content/workspace.js'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    clean: true // limpia dist/ antes de cada build
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: { presets: ['@babel/preset-env'] }
        }
      }
    ]
  },
  resolve: {
    extensions: ['.js'],
    // Se conservan los alias por compatibilidad histórica, aunque el código ya
    // usa rutas relativas de forma consistente.
    alias: {
      '@core': path.resolve(__dirname, 'src/core/'),
      '@utils': path.resolve(__dirname, 'src/utils/')
    }
  },
  plugins: [
    new CopyStaticPlugin([
      { from: 'manifest.json', to: 'manifest.json' },
      { from: 'src/popup/popup.html', to: 'src/popup/popup.html' },
      { from: 'src/popup/popup.css', to: 'src/popup/popup.css' },
      { from: 'src/options/options.html', to: 'src/options/options.html' },
      { from: 'src/options/options.css', to: 'src/options/options.css' },
      { from: 'src/assets', to: 'src/assets' }
    ])
  ],
  // Los service workers MV3 no admiten eval; usamos source-map plano.
  devtool: 'cheap-source-map',
  performance: { hints: false }
};
