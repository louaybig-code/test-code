import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    base: process.env.NODE_ENV === 'production' ? '/app/' : '/',
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      allowedHosts: 'all',
      // Proxy API calls to the new backend during local development
      proxy: {
        '/api': {
          target: 'https://studiopilote.fr',
          changeOrigin: true,
          secure: false,
        },
        '/collab': {
          target: 'https://studiopilote.fr',
          changeOrigin: true,
          secure: false,
          ws: true, // Enable WebSocket proxying
        },
      },
    },
  };
});
