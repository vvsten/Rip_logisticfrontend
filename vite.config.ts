import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  // Для GitHub Pages используем VITE_BASE_URL или имя репозитория
  base: process.env.VITE_BASE_URL || (process.env.NODE_ENV === 'production' ? '/Rip_logisticfrontend/' : '/'),
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'GruzDelivery - Грузоперевозки',
        short_name: 'GruzDelivery',
        description: 'Приложение для заказа грузоперевозок',
        theme_color: '#0d6efd',
        background_color: '#f8f9fa',
        display: 'standalone',
        orientation: 'portrait',
        scope: process.env.VITE_BASE_URL || (process.env.NODE_ENV === 'production' ? '/Rip_logisticfrontend/' : '/'),
        start_url: process.env.VITE_BASE_URL || (process.env.NODE_ENV === 'production' ? '/Rip_logisticfrontend/' : '/'),
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\./i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 // 24 часа
              }
            }
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    // Прокси для обхода CORS - перенаправляем /api на бэкенд
    proxy: {
      '/api': {
        target: 'http://localhost:8083',
        changeOrigin: true,
        ws: true,
        // НЕ перехватываем GET запросы к /api/v1/transport-services для навигации React Router
        // Перехватываем только реальные API запросы (POST, PUT, DELETE, или GET с query параметрами)
        // Различаем навигационные запросы (от браузера) и API запросы (от fetch/xhr)
        bypass: (req) => {
          const url = req.url || '';
          const isNavigationRequest = req.headers.accept?.includes('text/html');
          
          // Если это навигационный GET запрос (браузер переходит на страницу) - пропускаем для React Router
          if (isNavigationRequest && req.method === 'GET') {
            if (url.match(/^\/api\/v1\/transport-services\/?$/) || url.match(/^\/api\/v1\/transport-services\/\d+$/)) {
              return false; // Пропускаем прокси, чтобы React Router обработал маршрут
            }
          }
          
          // Все остальные запросы к /api (включая API запросы от fetch/xhr) проксируем на бэкенд
          return undefined;
        },
      },
      // Lab8: прокси на второй (async) сервис
      '/async': {
        target: 'http://localhost:8090',
        changeOrigin: true,
        ws: true,
      },
      // Auth endpoints (swagger-based): в dev должны проксироваться на бэкенд
      '/login': {
        target: 'http://localhost:8083',
        changeOrigin: true,
        ws: true,
      },
      '/sign_up': {
        target: 'http://localhost:8083',
        changeOrigin: true,
        ws: true,
      },
      '/logout': {
        target: 'http://localhost:8083',
        changeOrigin: true,
        ws: true,
      },
      '/refresh': {
        target: 'http://localhost:8083',
        changeOrigin: true,
        ws: true,
      },
      // Прокси для MinIO изображений через бэкенд
      '/lab1': {
        target: 'http://localhost:8083',
        changeOrigin: true,
      },
      // HTML-страницы, которые рендерит бэкенд (не React-роуты!)
      '/delivery-quote': {
        target: 'http://localhost:8083',
        changeOrigin: true,
      },
      // ВАЖНО: проксируем только quote-страницу, чтобы не перехватывать SPA-роут
      // `/logistic-requests` (иначе при refresh получаем пустой ответ от бэкенда).
      '/logistic-request/quote': {
        target: 'http://localhost:8083',
        changeOrigin: true,
      },
      // Прокси для статических файлов бэкенда (CSS, JS, изображения)
      '/static': {
        target: 'http://localhost:8083',
        changeOrigin: true,
      }
    }
  }
})
