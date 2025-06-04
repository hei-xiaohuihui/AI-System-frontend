// vite.config.js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/user': {
        target: 'http://localhost:7816',
        changeOrigin: true,
        // ✅ 添加以下配置项：
        configure: (proxy) => {
          proxy.on('proxyRes', (proxyRes) => {
            // 告诉代理服务器：不要缓冲 SSE
            proxyRes.headers['X-Accel-Buffering'] = 'no'
          })
        }
      }
    }
  }
})
