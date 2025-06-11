<template>
  <div class="admin-login">
    <div class="login-container">
      <h1>后台管理系统</h1>
      <div class="login-form">
        <div class="form-group">
          <input 
            type="text" 
            v-model="loginForm.username" 
            placeholder="用户名"
            @keyup.enter="handleLogin"
          >
        </div>
        <div class="form-group">
          <input 
            type="password" 
            v-model="loginForm.password" 
            placeholder="密码"
            @keyup.enter="handleLogin"
          >
        </div>
        <button 
          class="login-button" 
          @click="handleLogin"
          :disabled="isLoading"
        >
          {{ isLoading ? '登录中...' : '登录' }}
        </button>
        <p v-if="error" class="error-message">{{ error }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'

const router = useRouter()
const error = ref('')
const isLoading = ref(false)

const loginForm = reactive({
  username: '',
  password: ''
})

const handleLogin = async () => {
  if (!loginForm.username || !loginForm.password) {
    error.value = '请输入用户名和密码'
    return
  }

  try {
    isLoading.value = true
    error.value = ''
    
    const response = await axios.post('http://localhost:7816/admin/auth/login', loginForm)

    if (response.data.code === 200) {
      // 存储token
      localStorage.setItem('adminToken', response.data.data)
      // 登录成功后跳转到管理后台首页
      router.push('/admin/dashboard')
    } else {
      throw new Error(response.data.message || '登录失败')
    }
  } catch (err) {
    error.value = err.response?.data?.message || err.message || '登录失败，请重试'
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
.admin-login {
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #f5f5f5;
}

.login-container {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 400px;
}

h1 {
  text-align: center;
  color: #333;
  margin-bottom: 2rem;
  font-size: 1.8rem;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
}

input {
  padding: 0.8rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  outline: none;
  transition: border-color 0.3s;
}

input:focus {
  border-color: #409EFF;
}

.login-button {
  background-color: #409EFF;
  color: white;
  border: none;
  padding: 0.8rem;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  transition: background-color 0.3s;
}

.login-button:hover {
  background-color: #66b1ff;
}

.login-button:disabled {
  background-color: #a0cfff;
  cursor: not-allowed;
}

.error-message {
  color: #f56c6c;
  text-align: center;
  margin-top: 0.5rem;
  font-size: 0.9rem;
}
</style> 