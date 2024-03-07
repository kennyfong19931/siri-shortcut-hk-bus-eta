const path = require('path')
import { defineConfig, loadEnv } from 'vite';
import htmlPurge from 'vite-plugin-html-purgecss'

export default ({ mode }) => {
  // Load app-level env vars to node-level env vars.
  process.env = { ...process.env, ...loadEnv(mode, process.cwd()) };

  return defineConfig({
    base: '',
    root: path.resolve(__dirname, 'src'),
    publicDir: path.resolve(__dirname, 'public'),
    resolve: {
      alias: {
        '~bootstrap': path.resolve(__dirname, 'node_modules/bootstrap'),
      }
    },
    server: {
      port: 8080,
      hot: true
    },
    build: {
      target: 'esnext',
      outDir: path.resolve(__dirname, 'public'),
      emptyOutDir: false
    },
    plugins: [
      htmlPurge([/data-bs-theme/, 'leaflet-popup-content', 'leaflet-container', 'leaflet-popup-close-button', 'mtrIcon']),
    ]
  });
}