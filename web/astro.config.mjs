// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import vercel from '@astrojs/vercel';

// https://astro.build/config
export default defineConfig({
  site: 'https://www.acordesocultos.com',
  output: 'server',
  adapter: vercel(),
  server: {
    host: true,
    port: 3000
  },
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
    server: {
      allowedHosts: true
    },
    preview: {
      port: 3000,
      allowedHosts: true
    }
  },
});
