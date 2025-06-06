import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import 'element-plus/dist/index.css'
import 'highlight.js/styles/github.css'
import App from './App.vue'
import router from './router'
import axios from 'axios'

console.log('Starting application initialization')

// 配置axios默认值
axios.defaults.baseURL = 'http://localhost:7816'
axios.defaults.timeout = 10000
axios.defaults.headers.common['Content-Type'] = 'application/json'

// 从localStorage中获取token并设置
const token = localStorage.getItem('token')
if (token) {
  console.log('Found existing token in localStorage')
  axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
}

// 添加axios拦截器用于调试
axios.interceptors.request.use(config => {
  console.log('Sending request:', config.url, config)
  return config
})

// 移除可能冲突的响应拦截器，只保留调试日志
axios.interceptors.response.use(
  response => {
    console.log('Received response:', response.config.url, response)
    return response
  }
)

const app = createApp(App)
const pinia = createPinia()

// 全局错误处理
app.config.errorHandler = (err, vm, info) => {
  console.error('Vue error:', err)
  console.error('Error info:', info)
}

// 注册Element Plus图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

app.use(pinia)
app.use(router)
app.use(ElementPlus)

console.log('Mounting application')
app.mount('#app')
console.log('Application mounted') 