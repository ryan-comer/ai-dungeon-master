import path from 'path-browserify';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  entry: {
    //backend: './src/index.ts',
    module: './scripts/index.js'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js', 
    library: {
      type: 'module', // Use ES module output
      //name: '[name]'
    }
  },
  resolve: {
    extensions: ['.ts', '.js'],
    alias: {
      path: 'path-browserify'
    },
    fallback: {
      fs: false // Mock 'fs' module for browser compatibility
    }
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/
      }
    ]
  },
  target: 'web', // Target the browser environment
  mode: 'development', // or 'production' in a live environment
  experiments: {
    outputModule: true // Enable module output
  }
};
