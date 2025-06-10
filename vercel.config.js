const { defineConfig } = require('vite');

module.exports = defineConfig({
  build: {
    target: 'esnext',
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 3000,
  },
  preview: {
    port: 3000,
  },
});
