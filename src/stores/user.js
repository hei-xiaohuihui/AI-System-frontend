import { defineStore } from 'pinia'
import axios from 'axios'
import { ElMessage } from 'element-plus'
import router from '../router'
import { jwtDecode } from 'jwt-decode'

// 创建 axios 请求拦截器
axios.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token')
    // 只有当 token 存在且不为 'undefined' 时才添加到请求头
    if (token && token !== 'undefined') {
      config.headers['Authorization'] = `Bearer ${token}`
    }
    return config
  },
  error => {
    return Promise.reject(error)
  }
)

// 创建 axios 响应拦截器
axios.interceptors.response.use(
  response => response,
  error => {
    if (error.response) {
      switch (error.response.status) {
        case 401: // token 过期或无效
          // 清除本地存储的 token
          localStorage.removeItem('token')
          localStorage.removeItem('userInfo')
          // 跳转到登录页
          router.push('/login')
          ElMessage.error('登录已过期，请重新登录')
          break
        case 403: // 权限不足
          ElMessage.error('没有权限访问')
          break
        default:
          ElMessage.error(error.response.data.message || '请求失败')
      }
    }
    return Promise.reject(error)
  }
)

export const useUserStore = defineStore('user', {
  state: () => {
    let userInfo = {}
    try {
      const storedUserInfo = localStorage.getItem('userInfo')
      if (storedUserInfo) {
        userInfo = JSON.parse(storedUserInfo)
      }
    } catch (error) {
      console.error('Error parsing userInfo from localStorage:', error)
    }

    return {
      token: localStorage.getItem('token') || '',
      userInfo
    }
  },

  actions: {
    async login(credentials) {
      try {
        const response = await axios.post('/user/auth/login', credentials)
        const { code, message, data } = response.data

        if (code !== 200) {
          ElMessage.error(message || '登录失败')
          return false
        }

        // data 就是 JWT token 字符串
        const token = data
        
        // 解析 JWT 获取用户信息
        const decodedToken = jwtDecode(token)
        const userInfo = {
          username: decodedToken.userName,
          userId: decodedToken.userId
        }

        // 存储 token 和解析出的用户信息
        this.token = token
        this.userInfo = userInfo
        
        localStorage.setItem('token', token)
        localStorage.setItem('userInfo', JSON.stringify(userInfo))
        
        ElMessage.success('登录成功')
        return true
      } catch (error) {
        console.error('Login error:', error)
        if (!error.response) {
          ElMessage.error('网络错误，请稍后重试')
        }
        return false
      }
    },

    async register(userData) {
      try {
        const response = await axios.post('/user/auth/register', userData)
        const { code, message } = response.data

        if (code !== 200) {
          ElMessage.error(message || '注册失败')
          return false
        }

        ElMessage.success('注册成功')
        return true
      } catch (error) {
        console.error('Register error:', error)
        if (!error.response) {
          ElMessage.error('网络错误，请稍后重试')
        }
        return false
      }
    },

    logout() {
      this.token = ''
      this.userInfo = {}
      localStorage.removeItem('token')
      localStorage.removeItem('userInfo')
      // 清除 axios 默认请求头
      delete axios.defaults.headers.common['Authorization']
      // 跳转到登录页
      router.push('/login')
    }
  },

  getters: {
    isAuthenticated: (state) => !!state.token,
    getUserInfo: (state) => state.userInfo
  }
}) 