import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Trocado',
        short_name: 'Trocado',
        description: 'Controle de gastos: quanto entra, quanto sai, quanto você guarda e quanto sobra.',
        lang: 'pt-BR',
        start_url: '/',
        display: 'standalone',
        background_color: '#121210',
        theme_color: '#121210',
        icons: [
          { src: 'icone-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icone-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icone-mascara-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // A API nunca vem do cache: os números precisam ser os de agora
        navigateFallbackDenylist: [/^\/api\//],
      },
    }),
  ],
  server: {
    port: 5190,
    strictPort: true,
    // Em desenvolvimento, a API é a do Docker (nginx do serviço web repassa /api ao backend)
    proxy: { '/api': process.env.API_PROXY ?? 'http://localhost:8070' },
  },
});
