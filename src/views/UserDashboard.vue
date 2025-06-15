<template>
  <div class="dashboard-container">
    <h1 class="welcome-title">欢迎使用AI客服系统</h1>
    
    <div class="feature-cards">
      <el-card class="feature-card" @click="navigateToChat">
        <el-icon class="feature-icon"><ChatRound /></el-icon>
        <h2>智能客服</h2>
        <p>与AI助手进行对话，获取即时帮助和解答</p>
      </el-card>
      
      <el-card class="feature-card" @click="navigateToLectures">
        <el-icon class="feature-icon"><Calendar /></el-icon>
        <h2>讲座中心</h2>
        <p>浏览和报名参加各类讲座活动</p>
      </el-card>
    </div>

    <div class="user-info">
      <el-dropdown trigger="click">
        <div class="user-avatar">
          <el-avatar :size="40">
            {{ userStore.getUserInfo.username?.charAt(0).toUpperCase() }}
          </el-avatar>
          <span>{{ userStore.getUserInfo.username }}</span>
        </div>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item @click="handleLogout">退出登录</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
  </div>
</template>

<script setup>
import { ChatRound, Calendar } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'

const router = useRouter()
const userStore = useUserStore()

const navigateToChat = () => {
  router.push('/chat')
}

const navigateToLectures = () => {
  router.push('/lectures')
}

const handleLogout = () => {
  userStore.logout()
  router.push('/login')
}
</script>

<style scoped>
.dashboard-container {
  min-height: 100vh;
  padding: 40px;
  background: #f5f7fa;
  position: relative;
}

.welcome-title {
  text-align: center;
  color: #409EFF;
  font-size: 2rem;
  margin-bottom: 40px;
}

.feature-cards {
  display: flex;
  justify-content: center;
  gap: 30px;
  margin-top: 40px;
}

.feature-card {
  width: 300px;
  height: 200px;
  cursor: pointer;
  transition: transform 0.3s, box-shadow 0.3s;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.feature-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.feature-icon {
  font-size: 48px;
  color: #409EFF;
  margin-bottom: 16px;
}

.feature-card h2 {
  margin: 10px 0;
  color: #303133;
}

.feature-card p {
  color: #606266;
  margin: 0;
}

.user-info {
  position: absolute;
  top: 20px;
  right: 20px;
}

.user-avatar {
  display: flex;
  align-items: center;
  cursor: pointer;
  padding: 8px;
  border-radius: 4px;
  transition: background-color 0.3s;
}

.user-avatar:hover {
  background-color: rgba(64, 158, 255, 0.1);
}

.user-avatar span {
  margin-left: 8px;
  color: #303133;
  font-size: 14px;
}
</style> 