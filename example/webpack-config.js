import path from "path"

module.exports = {
  sourceType: "unambiguous",
  mode: 'development',
  entry: {
    main: './src/index.js',
    worker: './src/ocWorker.js',
  },
  output: {
    path: path.resolve(__dirname, 'public/dist'), // Output to public/dist
    filename: '[name].bundle.js',
    publicPath: '/dist/', // Serve from /dist/
  },
  resolve: {
    alias: { "stream": require.resolve("stream-browserify") }
  },
  devServer: {
    static: {
      directory: path.resolve(__dirname, 'public'), // Serve the public folder
    },
    port: 3000,
    open: true,
    hot: true,
    compress: true,
    historyApiFallback: true,
  },
  module: {
    rules: [
      {
        test: /\.json$/,
        loader: 'json-loader',
      },
      {
        test: /\.css$/i,
        include: path.resolve(__dirname, 'src'),
        use: ['style-loader', 'css-loader', 'postcss-loader'],
      },
    ],
  },
}