import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    base: process.env.NODE_ENV === 'production' ? '/agile/' : '/',
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      allowedHosts: 'all',
      // Proxy /smash_api to the VPS backend during local development
      proxy: {
        '/smash_api': {
          target: 'https://evalys.admin.preprod.studiolab.fr',
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});
