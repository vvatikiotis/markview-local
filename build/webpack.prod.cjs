const { merge } = require('webpack-merge');
const common = require('./webpack.common.cjs');
const { EsbuildPlugin } = require('esbuild-loader');

module.exports = merge(common, {
  mode: 'production',

  devtool: false, // No source maps in production

  optimization: {
    minimize: true,
    minimizer: [
      // Use esbuild for minification (faster than Terser)
      new EsbuildPlugin({
        target: 'es2020',
        css: true
      })
    ]
  },

  output: { clean: true }
});
