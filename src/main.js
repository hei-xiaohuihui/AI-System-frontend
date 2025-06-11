import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import 'element-plus/dist/index.css'
import 'highlight.js/styles/github.css'
import App from './App.vue'
import router from './router'
import request from './utils/request'

console.log('Starting application initialization')

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

// 将request实例添加到全局属性
app.config.globalProperties.$request = request

app.use(pinia)
app.use(router)
app.use(ElementPlus)

console.log('Mounting application')
app.mount('#app')
console.log('Application mounted') 