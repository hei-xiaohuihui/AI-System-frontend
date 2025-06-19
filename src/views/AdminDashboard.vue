<template>
  <div class="admin-dashboard">
    <header class="dashboard-header">
      <h1>河小嗨后台管理系统</h1>
      <button class="logout-button" @click="handleLogout">退出登录</button>
    </header>
    <div class="dashboard-content">
      <h2>欢迎回来，管理员</h2>
      <div class="dashboard-stats">
        <div class="stat-card">
          <h3>用户总数</h3>
          <p>{{ stats.totalUsers || 0 }}</p>
        </div>
        <div class="stat-card">
          <h3>今日活跃用户</h3>
          <p>{{ stats.activeUsers || 0 }}</p>
        </div>
        <div class="stat-card">
          <h3>总对话数</h3>
          <p>{{ stats.totalChats || 0 }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import request from '../utils/request'

const router = useRouter()
const stats = ref({
  totalUsers: 0,
  activeUsers: 0,
  totalChats: 0
})

const fetchStats = async () => {
  try {
    const token = localStorage.getItem('adminToken')
    if (!token) {
      router.push('/admin/login')
      return
    }

    const response = await request.get('/admin/stats')
    
    if (response.code === 200) {
      stats.value = response.data
    }
  } catch (error) {
    console.error('Failed to fetch stats:', error)
    if (error.response?.status === 401) {
      router.push('/admin/login')
    }
  }
}

const handleLogout = () => {
  localStorage.removeItem('adminToken')
  router.push('/admin/login')
}

onMounted(() => {
  fetchStats()
})
</script>

<style scoped>
.admin-dashboard {
  min-height: 100vh;
  background-color: #f5f5f5;
}

.dashboard-header {
  background-color: white;
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.dashboard-header h1 {
  margin: 0;
  color: #333;
  font-size: 1.5rem;
}

.logout-button {
  background-color: #f56c6c;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.logout-button:hover {
  background-color: #f78989;
}

.dashboard-content {
  padding: 2rem;
}

.dashboard-content h2 {
  margin-bottom: 2rem;
  color: #333;
}

.dashboard-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
}

.stat-card {
  background-color: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.stat-card h3 {
  margin: 0;
  color: #666;
  font-size: 1rem;
  margin-bottom: 0.5rem;
}

.stat-card p {
  margin: 0;
  color: #409EFF;
  font-size: 2rem;
  font-weight: bold;
}
</style> 