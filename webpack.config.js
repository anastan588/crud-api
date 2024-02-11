const { merge } = require('webpack-merge');
const FileManagerPlugin = require('filemanager-webpack-plugin');
const path = require('path');
const baseConfig = {
  entry: path.resolve(__dirname, './src/index'),
  mode: 'development',
  devtool: false,
  target: 'node',
  resolve: {
    extensions: ['.ts', '.js'],
  },
  output: {
    path: path.join(__dirname, 'dist'),
    filename: 'index.js',
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  devServer: {
    watchFiles: path.join(__dirname, 'src'),
    port: 9000,
  },
  plugins: [
    new FileManagerPlugin({
      events: {
        onStart: {
          delete: ['dist'],
        },
      },
    }),
  ],
};

module.exports = ({ mode }) => {
  const isProductionMode = mode === 'prod';
  const envConfig = isProductionMode
    ? require('./webpack.prod.config')
    : require('./webpack.dev.config');

  return merge(baseConfig, envConfig);
};
