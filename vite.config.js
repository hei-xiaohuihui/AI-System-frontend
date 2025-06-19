// vite.config.js
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd())
  
  return {
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
          target: env.VITE_API_BASE_URL,
          changeOrigin: true,
          secure: false,  // 如果是 https 接口，需要配置这个参数
          ws: true,      // 是否启用 websocket
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq, req) => {
              console.log('代理请求:', req.method, req.url)
            })
            proxy.on('proxyRes', (proxyRes, req) => {
              console.log('代理响应:', proxyRes.statusCode, req.url)
              proxyRes.headers['X-Accel-Buffering'] = 'no'
            })
            proxy.on('error', (err, req, res) => {
              console.error('代理错误:', err)
            })
          }
        }
      }
    }
  }
})
