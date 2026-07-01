/**
 * Configuración de webpack para X1.
 *
 * El código fuente ahora está en `background/x1-core/` (integrado en cbos-ext).
 * Este webpack.build apunta a esa carpeta para builds independientes.
 */

const path = require('path');
const fs = require('fs');

const SRC = path.resolve(__dirname, '../background/x1-core');

class CopyStaticPlugin {
  constructor(items) { this.items = items; }
  apply(compiler) {
    const outputPath = compiler.options.output.path;
    compiler.hooks.afterEmit.tap('CopyStaticPlugin', () => {
      for (const { from, to } of this.items) {
        const src = path.resolve(__dirname, from);
        const dest = path.resolve(outputPath, to);
        if (!fs.existsSync(src)) {
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
    'src/popup/popup': path.join(SRC, 'popup/popup.js'),
    'src/options/options': path.join(SRC, 'options/options.js'),
    'src/background/service-worker': path.join(SRC, 'background/service-worker.js'),
    'src/content/chat': path.join(SRC, 'content/chat.js'),
    'src/content/workspace': path.join(SRC, 'content/workspace.js')
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    clean: true
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
    alias: {
      '@core': path.join(SRC, 'core/'),
      '@utils': path.join(SRC, 'utils/')
    }
  },
  plugins: [
    new CopyStaticPlugin([
      { from: 'manifest.json', to: 'manifest.json' },
      { from: path.join(SRC, 'popup/popup.html'), to: 'src/popup/popup.html' },
      { from: path.join(SRC, 'popup/popup.css'), to: 'src/popup/popup.css' },
      { from: path.join(SRC, 'options/options.html'), to: 'src/options/options.html' },
      { from: path.join(SRC, 'options/options.css'), to: 'src/options/options.css' },
      { from: path.join(SRC, 'assets'), to: 'src/assets' }
    ])
  ],
  devtool: 'cheap-source-map',
  performance: { hints: false }
};
