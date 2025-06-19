<template>
  <div class="sidebar">
    <div class="sidebar-header">
      <h1 class="system-title">河小嗨AI智能助手</h1>
      <el-button type="primary" @click="createNewChat" plain>
        <el-icon><Plus /></el-icon>新对话
      </el-button>
    </div>
    <div class="conversation-list">
      <div
        v-for="chat in chatList"
        :key="chat.id"
        :class="['conversation-item', { active: currentChatId === chat.id }]"
        @click="switchChat(chat.id)"
      >
        <el-icon><ChatRound /></el-icon>
        <span class="title">{{ chat.title || '新对话' }}</span>
        <el-icon class="delete-icon" @click.stop="deleteChat(chat.id)"><Delete /></el-icon>
      </div>
    </div>
    <div class="sidebar-footer">
      <el-dropdown trigger="click" :hideOnClick="false">
        <div class="user-info" @click.stop>
          <el-avatar :size="32">
            {{ userStore.getUserInfo.username?.charAt(0).toUpperCase() }}
          </el-avatar>
          <span>{{ userStore.getUserInfo.username }}</span>
        </div>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item @click.stop="showUserProfile">个人中心</el-dropdown-item>
            <el-dropdown-item @click.stop="navigateToLectures">讲座中心</el-dropdown-item>
            <el-dropdown-item divided @click.stop="handleLogout">退出登录</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
  </div>
</template>

<script setup>
import { Plus, ChatRound, Delete } from '@element-plus/icons-vue'
import { useUserStore } from '../stores/user'
import { useRouter } from 'vue-router'

const props = defineProps({
  chatList: {
    type: Array,
    required: true
  },
  currentChatId: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['create-chat', 'switch-chat', 'delete-chat', 'show-profile'])

const userStore = useUserStore()
const router = useRouter()

const navigateToLectures = () => {
  router.push('/lectures')
}

const createNewChat = () => {
  emit('create-chat')
}

const switchChat = (chatId) => {
  emit('switch-chat', chatId)
}

const deleteChat = (chatId) => {
  emit('delete-chat', chatId)
}

const showUserProfile = () => {
  emit('show-profile')
}

const handleLogout = () => {
  userStore.logout()
  router.push('/login')
}
</script>

<style scoped>
.sidebar {
  width: 260px;
  background-color: #ffffff;
  border-right: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  padding: 16px;
  border-bottom: 1px solid #e0e0e0;
}

.system-title {
  font-size: 1.5rem;
  color: #409EFF;
  margin: 0 0 16px 0;
  text-align: center;
  font-weight: 600;
}

.sidebar-header .el-button {
  width: 100%;
}

.conversation-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.conversation-item {
  display: flex;
  align-items: center;
  padding: 12px;
  margin: 4px 0;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.conversation-item:hover {
  background-color: #f5f5f5;
}

.conversation-item.active {
  background-color: #ecf5ff;
}

.conversation-item .title {
  margin-left: 8px;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.delete-icon {
  opacity: 0;
  transition: opacity 0.3s;
}

.conversation-item:hover .delete-icon {
  opacity: 1;
}

.sidebar-footer {
  padding: 16px;
  border-top: 1px solid #e0e0e0;
}

.user-info {
  display: flex;
  align-items: center;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: background-color 0.3s;
}

.user-info:hover {
  background-color: #f5f5f5;
}

.user-info span {
  margin-left: 8px;
  color: #303133;
  font-size: 14px;
}
</style> 