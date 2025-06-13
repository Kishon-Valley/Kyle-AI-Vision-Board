import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? '/' : '/',
  server: {
    host: "::",
    port: 3000, // Frontend port
    strictPort: true,
    proxy: {
      // Proxy API requests to the backend server
      '/api': {
        target: 'http://localhost:3001', // Backend server port
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, '')
      },
      // Proxy webhook requests to the backend server
      '/webhook': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false
      }
    }
  },
  preview: {
    port: 3001,
    strictPort: true,
  },
  plugins: [
    react(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    sourcemap: true,
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom']
        },
      },
    },
    assetsInlineLimit: 4096,
    chunkSizeWarningLimit: 1000,
  },
}));
