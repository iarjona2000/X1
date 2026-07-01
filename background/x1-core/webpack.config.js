/**
 * Webpack config for X1Core library bundle.
 * Outputs a single IIFE that sets self.X1Core with all backend modules.
 * Loaded via importScripts in cbos-ext service-worker.js (ES5 classic).
 */
var path = require('path');

module.exports = {
  entry: './entry.js',
  output: {
    path: path.resolve(__dirname, 'bundle'),
    filename: 'x1-core.js',
    library: 'X1Core',
    libraryTarget: 'self',
    clean: true
  },
  target: 'web',
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              ['@babel/preset-env', {
                targets: { chrome: "88" },
                modules: false
              }]
            ]
          }
        }
      }
    ]
  },
  resolve: {
    extensions: ['.js']
  },
  performance: { hints: false },
  devtool: false
};
