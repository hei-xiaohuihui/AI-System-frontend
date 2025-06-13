<template>
  <el-container class="dashboard-container">
    <el-aside width="200px">
      <el-menu
        :router="true"
        class="dashboard-menu"
        background-color="#001529"
        text-color="#fff"
        active-text-color="#1890ff"
        :default-active="$route.path"
      >
        <el-menu-item index="/admin/dashboard">
          <el-icon><DataBoard /></el-icon>
          <span>仪表盘</span>
        </el-menu-item>
        <template v-if="isSuper">
        <el-menu-item index="/admin/admins">
          <el-icon><User /></el-icon>
            <span>讲师管理</span>
        </el-menu-item>
        <el-menu-item index="/admin/students">
          <el-icon><Avatar /></el-icon>
          <span>学生管理</span>
        </el-menu-item>
        </template>
        <el-menu-item index="/admin/lectures">
          <el-icon><Calendar /></el-icon>
          <span>讲座管理</span>
        </el-menu-item>
        <el-menu-item index="/admin/profile">
          <el-icon><Setting /></el-icon>
          <span>个人信息</span>
        </el-menu-item>
      </el-menu>
    </el-aside>
    <el-container>
      <el-header>
        <div class="header-content">
          <h2>AI客服系统 - {{ isSuper ? '超级管理员您好' : '讲师您好' }}</h2>
          <el-dropdown @command="handleCommand">
            <span class="user-dropdown">
              <el-icon><UserFilled /></el-icon>
              {{ adminInfo.adminName || '管理员' }}
              <el-icon><CaretBottom /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="logout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>
      <el-main>
        <router-view></router-view>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { DataBoard, User, Calendar, UserFilled, CaretBottom, Avatar, Setting } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const adminInfo = ref({})

// 判断是否是超级管理员
const isSuper = computed(() => {
  return adminInfo.value.adminRole === 'SUPER_ADMIN'
})

// 获取管理员信息
onMounted(() => {
  const storedInfo = localStorage.getItem('adminInfo')
  if (storedInfo) {
    try {
      adminInfo.value = JSON.parse(storedInfo)
    } catch (e) {
      console.error('Failed to parse admin info:', e)
    }
  }
})

const handleCommand = (command) => {
  if (command === 'logout') {
    localStorage.removeItem('adminToken')
    localStorage.removeItem('adminInfo')
    router.push('/admin/login')
  }
}
</script>

<style scoped>
.dashboard-container {
  height: 100vh;
}

.dashboard-menu {
  height: 100%;
  border-right: none;
}

.el-header {
  background-color: #fff;
  border-bottom: 1px solid #e8e8e8;
  padding: 0 20px;
}

.header-content {
  height: 60px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.user-dropdown {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  color: #666;
}

.el-aside {
  background-color: #001529;
}

.el-main {
  background-color: #f0f2f5;
  padding: 20px;
}
</style>