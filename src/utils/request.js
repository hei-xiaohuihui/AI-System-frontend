import axios from 'axios'
import { ElMessage } from 'element-plus'
import router from '../router'

// 创建 axios 实例
const service = axios.create({
  baseURL: 'http://192.168.198.129:7816', // API 的 base_url 生产环境
  timeout: 15000 // 请求超时时间
})

// 请求拦截器
service.interceptors.request.use(
  config => {
    // 根据请求路径判断使用哪个token
    const isAdminRequest = config.url.startsWith('/admin/')
    const token = isAdminRequest 
      ? localStorage.getItem('adminToken')
      : localStorage.getItem('token')
    
    // 如果 token 存在，则添加到请求头
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`
    }
    
    return config
  },
  error => {
    console.error('请求错误：', error)
    return Promise.reject(error)
  }
)

// 响应拦截器
service.interceptors.response.use(
  response => {
    const res = response.data
    
    // 如果返回的状态码不是 200，说明接口有问题，应该提示
    if (res.code !== 200) {
      ElMessage.error(res.message || '系统错误')
      
      // 11004: Token 失效
      // 11003: Token 过期
      // 11005: 无效的Token
      if ([11004, 11003, 11005].includes(res.code)) {
        // 清除 token 和管理员信息
        localStorage.removeItem('adminToken')
        localStorage.removeItem('adminInfo')
        
        // 如果当前在管理员路由中，重定向到管理员登录页
        if (location.pathname.startsWith('/admin')) {
          router.push('/admin/login')
        }
      }
      
      return Promise.reject(new Error(res.message || '系统错误'))
    }
    
    return res
  },
  error => {
    console.error('响应错误：', error)
    
    // 如果是 401 错误，说明 token 有问题
    if (error.response && error.response.status === 401) {
      // 清除 token 和管理员信息
      localStorage.removeItem('adminToken')
      localStorage.removeItem('adminInfo')
      
      // 如果当前在管理员路由中，重定向到管理员登录页
      if (location.pathname.startsWith('/admin')) {
        router.push('/admin/login')
      }
      
      ElMessage.error('登录已过期，请重新登录')
    } else {
      ElMessage.error(error.message || '系统错误')
    }
    
    return Promise.reject(error)
  }
)

export default service 