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
        // 用户端接口代理
        '/user': {
          target: env.VITE_API_BASE_URL,
          changeOrigin: true,
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq, req) => {
              console.log('用户端代理请求:', req.method, req.url)
            })
            proxy.on('proxyRes', (proxyRes, req) => {
              console.log('用户端代理响应:', proxyRes.statusCode, req.url)
            })
            proxy.on('error', (err, req, res) => {
              console.error('用户端代理错误:', err)
            })
          }
        },
        // 管理端接口代理（包含通用认证接口、超管接口和讲师接口）
        '^/admin/(auth|superAdmin|lecturer)/.*': {
          target: env.VITE_API_BASE_URL,
          changeOrigin: true,
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq, req) => {
              console.log('管理端代理请求:', req.method, req.url)
            })
            proxy.on('proxyRes', (proxyRes, req) => {
              console.log('管理端代理响应:', proxyRes.statusCode, req.url)
            })
            proxy.on('error', (err, req, res) => {
              console.error('管理端代理错误:', err)
            })
          }
        }
      }
    }
  }
})
