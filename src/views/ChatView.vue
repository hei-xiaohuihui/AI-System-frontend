<template>
  <div class="chat-container">
    <!-- 侧边栏 -->
    <div class="sidebar">
      <div class="sidebar-header">
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
              <el-dropdown-item divided @click.stop="handleLogout">退出登录</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>

    <!-- 主聊天区域 -->
    <div class="main-content">
      <div class="chat-messages" ref="messagesContainer">
        <div v-for="message in currentMessages" :key="message.id" :class="['message', message.role]">
          <div class="avatar">
            <el-avatar :size="40">
              {{ message.role === 'user' ? userStore.getUserInfo.username?.charAt(0).toUpperCase() : 'AI' }}
            </el-avatar>
          </div>
          <div class="message-content">
            <div class="message-text" v-html="formatMessage(message.content)"></div>
            <div class="message-actions" v-if="message.role === 'assistant'">
              <el-button type="text" size="small" @click="copyMessage(message.content)">
                <el-icon><Document /></el-icon>复制
              </el-button>
            </div>
          </div>
        </div>
        <div v-if="isLoading" class="message assistant">
          <div class="avatar">
            <el-avatar :size="40">AI</el-avatar>
          </div>
          <div class="message-content">
            <div class="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </div>
      </div>

      <div class="chat-input">
        <el-input
          v-model="inputMessage"
          type="textarea"
          :rows="3"
          placeholder="输入消息..."
          @keydown.enter.exact.prevent="sendMessage"
          :disabled="isLoading"
        />
        <el-button type="primary" @click="sendMessage" :loading="isLoading" :disabled="!inputMessage.trim()">
          发送
        </el-button>
      </div>
    </div>

    <!-- 添加个人信息对话框 -->
    <el-dialog
      v-model="dialogVisible"
      title="个人信息"
      width="500px"
      :close-on-click-modal="false"
    >
      <div class="user-info-header">
        <el-avatar :size="80">{{ userStore.getUserInfo.username?.charAt(0).toUpperCase() }}</el-avatar>
        <h2>{{ userStore.getUserInfo.username }}</h2>
      </div>
      
      <el-form
        ref="formRef"
        :model="updateForm"
        :rules="formRules"
        label-width="80px"
        class="user-form"
      >
        <el-form-item label="密码" prop="password">
          <el-input
            v-model="updateForm.password"
            type="password"
            placeholder="留空表示不修改密码"
            show-password
            clearable
          />
        </el-form-item>
        
        <el-form-item label="邮箱" prop="email">
          <el-input
            v-model="updateForm.email"
            placeholder="请输入邮箱"
            clearable
          />
        </el-form-item>
        
        <el-form-item label="手机号" prop="phone">
          <el-input
            v-model="updateForm.phone"
            placeholder="请输入手机号"
            clearable
          />
        </el-form-item>
        
        <el-form-item label="性别" prop="gender">
          <el-radio-group v-model="updateForm.gender">
            <el-radio :label="0">未知</el-radio>
            <el-radio :label="1">男</el-radio>
            <el-radio :label="2">女</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleUpdate" :loading="updating">
            保存
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick, h } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'
import { Plus, ChatRound, Delete, Document } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import axios from 'axios'
import * as marked from 'marked'
import hljs from 'highlight.js'

// 配置marked
const markedInstance = new marked.Marked({
  highlight: function (code, lang) {
    if (lang && hljs.getLanguage(lang)) {
      return hljs.highlight(lang, code).value
    }
    return hljs.highlightAuto(code).value
  },
  breaks: true
})

const router = useRouter()
const userStore = useUserStore()
const messagesContainer = ref(null)
const inputMessage = ref('')
const isLoading = ref(false)
const currentChatId = ref(null)
const chatList = ref([])
const messagesMap = ref({})

// 当前对话的消息列表
const currentMessages = computed(() => {
  return messagesMap.value[currentChatId.value] || []
})

// 创建新对话
const createNewChat = () => {
  const newChat = {
    id: Date.now().toString(),
    title: '新对话',
    createdAt: new Date().toISOString()
  }
  chatList.value.unshift(newChat)
  messagesMap.value[newChat.id] = []
  currentChatId.value = newChat.id
}

// 切换对话
const switchChat = (chatId) => {
  currentChatId.value = chatId
  scrollToBottom()
}

// 删除对话
const deleteChat = async (chatId) => {
  try {
    // 这里可以添加删除确认
    chatList.value = chatList.value.filter(chat => chat.id !== chatId)
    delete messagesMap.value[chatId]
    if (currentChatId.value === chatId) {
      currentChatId.value = chatList.value[0]?.id
    }
  } catch (error) {
    ElMessage.error('删除对话失败')
  }
}

// 发送消息
const sendMessage = async () => {
  if (!inputMessage.value.trim() || isLoading.value) return

  const message = {
    id: Date.now().toString(),
    role: 'user',
    content: inputMessage.value.trim(),
    timestamp: new Date().toISOString()
  }

  if (!currentChatId.value) {
    createNewChat()
  }

  messagesMap.value[currentChatId.value].push(message)
  inputMessage.value = ''
  scrollToBottom()

  try {
    isLoading.value = true
    // 这里替换为实际的API接口地址
    const response = await axios.post('/api/chat', {
      message: message.content,
      chatId: currentChatId.value
    })

    const aiResponse = {
      id: Date.now().toString(),
      role: 'assistant',
      content: response.data.message,
      timestamp: new Date().toISOString()
    }

    messagesMap.value[currentChatId.value].push(aiResponse)
    
    // 如果是新对话，更新标题
    if (chatList.value[0].title === '新对话') {
      chatList.value[0].title = message.content.slice(0, 20) + (message.content.length > 20 ? '...' : '')
    }
  } catch (error) {
    ElMessage.error('发送消息失败')
  } finally {
    isLoading.value = false
    scrollToBottom()
  }
}

// 格式化消息内容（支持Markdown）
const formatMessage = (content) => {
  return markedInstance.parse(content)
}

// 复制消息内容
const copyMessage = async (content) => {
  try {
    await navigator.clipboard.writeText(content)
    ElMessage.success('复制成功')
  } catch (error) {
    ElMessage.error('复制失败')
  }
}

// 滚动到底部
const scrollToBottom = async () => {
  await nextTick()
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

// 退出登录
const handleLogout = () => {
  userStore.logout()
  router.push('/login')
}

// 对话框相关的响应式变量
const dialogVisible = ref(false)
const formRef = ref(null)
const updating = ref(false)

// 表单数据
const updateForm = ref({
  password: '',
  email: '',
  phone: '',
  gender: 0
})

// 表单验证规则
const formRules = {
  password: [
    { min: 6, max: 20, message: '密码长度必须在6到20之间', trigger: 'blur' }
  ],
  email: [
    { type: 'email', message: '请输入正确的邮箱地址', trigger: 'blur' }
  ],
  phone: [
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号码', trigger: 'blur' }
  ]
}

// 显示用户个人中心
const showUserProfile = async () => {
  try {
    const response = await axios.get('/user/auth/detail')
    if (response.data.code === 200) {
      const userDetail = response.data.data
      // 更新表单数据
      updateForm.value = {
        password: '', // 密码始终为空，表示不修改
        email: userDetail.email || '',
        phone: userDetail.phone || '',
        gender: userDetail.gender ?? 0
      }
      dialogVisible.value = true
    } else {
      ElMessage.error('获取用户信息失败')
    }
  } catch (error) {
    console.error('获取用户信息失败:', error)
    ElMessage.error('获取用户信息失败，请稍后重试')
  }
}

// 处理表单提交
const handleUpdate = async () => {
  if (!formRef.value) return
  
  try {
    await formRef.value.validate()
    updating.value = true
    
    // 创建一个新对象，只包含已修改的字段
    const updateData = {}
    if (updateForm.value.password) {
      updateData.password = updateForm.value.password
    }
    if (updateForm.value.email !== userStore.getUserInfo.email) {
      updateData.email = updateForm.value.email
    }
    if (updateForm.value.phone !== userStore.getUserInfo.phone) {
      updateData.phone = updateForm.value.phone
    }
    if (updateForm.value.gender !== userStore.getUserInfo.gender) {
      updateData.gender = updateForm.value.gender
    }

    // 如果没有任何修改，直接关闭对话框
    if (Object.keys(updateData).length === 0) {
      ElMessage.info('没有信息需要更新')
      dialogVisible.value = false
      return
    }

    const response = await axios.post('/user/auth/update', updateData)
    if (response.data.code === 200) {
      ElMessage.success('个人信息更新成功')
      // 更新本地存储的用户信息
      const userInfo = {
        ...userStore.getUserInfo,
        ...updateData
      }
      delete userInfo.password // 不保存密码
      localStorage.setItem('userInfo', JSON.stringify(userInfo))
      userStore.userInfo = userInfo
      dialogVisible.value = false
    } else {
      ElMessage.error(response.data.message || '更新失败')
    }
  } catch (error) {
    console.error('更新个人信息失败:', error)
    ElMessage.error('更新失败，请稍后重试')
  } finally {
    updating.value = false
  }
}

// 初始化
onMounted(() => {
  if (!userStore.isAuthenticated) {
    router.push('/login')
    return
  }
  createNewChat()
})
</script>

<style scoped>
.chat-container {
  display: flex;
  height: 100vh;
  background-color: #f5f5f5;
}

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

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  background-color: #ffffff;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.message {
  display: flex;
  margin-bottom: 20px;
}

.message .avatar {
  margin-right: 12px;
}

.message-content {
  flex: 1;
  max-width: 80%;
}

.message-text {
  padding: 12px 16px;
  border-radius: 8px;
  background-color: #f5f5f5;
  line-height: 1.5;
}

.message.assistant .message-text {
  background-color: #ecf5ff;
}

.message-actions {
  margin-top: 4px;
  display: flex;
  justify-content: flex-end;
}

.chat-input {
  padding: 20px;
  border-top: 1px solid #e0e0e0;
  display: flex;
  align-items: flex-end;
  gap: 12px;
}

.chat-input .el-input {
  flex: 1;
}

.typing-indicator {
  display: flex;
  padding: 12px 16px;
  background: #ecf5ff;
  border-radius: 8px;
}

.typing-indicator span {
  height: 8px;
  width: 8px;
  background: #4b9eff;
  border-radius: 50%;
  margin: 0 2px;
  display: inline-block;
  animation: bounce 1.3s linear infinite;
}

.typing-indicator span:nth-child(2) {
  animation-delay: 0.15s;
}

.typing-indicator span:nth-child(3) {
  animation-delay: 0.3s;
}

@keyframes bounce {
  0%, 60%, 100% {
    transform: translateY(0);
  }
  30% {
    transform: translateY(-4px);
  }
}

:deep(.markdown-body) {
  background: transparent !important;
}

:deep(pre) {
  background-color: #f6f8fa;
  border-radius: 6px;
  padding: 16px;
  overflow-x: auto;
}

:deep(code) {
  font-family: 'Fira Code', monospace;
}

:deep(.user-profile-box) {
  max-width: 520px;
  border-radius: 8px;
}

:deep(.user-profile-box .el-message-box__header) {
  padding: 20px 20px 0;
}

:deep(.user-profile-box .el-message-box__title) {
  font-size: 18px;
  font-weight: 600;
}

:deep(.user-profile-box .el-message-box__content) {
  padding: 20px;
  max-height: 70vh;
  overflow-y: auto;
}

:deep(.user-profile-box .el-message-box__btns) {
  padding: 10px 20px 20px;
}

:deep(.user-profile-dialog) {
  padding: 0;
}

:deep(.user-profile-header) {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 8px 8px 0 0;
  color: white;
  margin: -20px -20px 20px -20px;
}

:deep(.user-profile-header h2) {
  color: white !important;
  margin-bottom: 4px !important;
}

:deep(.user-profile-header .el-avatar) {
  border: 3px solid rgba(255, 255, 255, 0.8);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

:deep(.update-form) {
  margin-top: 20px;
  padding: 0 20px;
}

:deep(.update-form .el-form-item) {
  margin-bottom: 22px;
}

:deep(.update-form .el-input__wrapper) {
  box-shadow: 0 0 0 1px #dcdfe6 inset;
}

:deep(.update-form .el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px #409eff inset;
}

:deep(.update-form .el-radio-group) {
  display: flex;
  gap: 16px;
}

:deep(.update-form .el-radio) {
  margin-right: 0;
}

:deep(.el-message-box__header) {
  padding-bottom: 20px;
}

:deep(.el-message-box__title) {
  font-size: 18px;
  font-weight: 600;
}

:deep(.custom-radio-group) {
  display: flex;
  gap: 16px;
}

:deep(.radio-label) {
  font-size: 14px;
  color: #606266;
}

:deep(.status-tag) {
  font-size: 13px;
  padding: 0 12px;
  height: 28px;
  line-height: 26px;
}

:deep(.el-divider--horizontal) {
  margin: 16px 0;
  background-color: #ebeef5;
}

:deep(.user-info-list) {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 12px;
  width: 100%;
  max-width: 280px;
}

:deep(.info-item) {
  display: flex;
  align-items: center;
  gap: 8px;
  color: rgba(255, 255, 255, 0.9);
  font-size: 14px;
  padding: 4px 0;
}

:deep(.info-item i) {
  font-size: 16px;
}

:deep(.info-item span) {
  flex: 1;
  text-align: left;
}

:deep(.user-profile-content) {
  padding: 0;
}

:deep(.edit-section) {
  padding: 20px;
}

:deep(.edit-title) {
  margin: 0 0 20px 0;
  color: #303133;
  font-size: 16px;
  font-weight: 600;
}

:deep(.update-form) {
  margin-top: 20px;
}

:deep(.update-form .el-form-item) {
  margin-bottom: 18px;
}

:deep(.update-form .el-form-item:last-child) {
  margin-bottom: 0;
}

:deep(.update-form .el-radio-group) {
  display: flex;
  gap: 20px;
}

:deep(.el-message-box) {
  width: 460px;
  max-width: 95vw;
}

:deep(.el-message-box__header) {
  padding: 15px 20px;
  border-bottom: 1px solid #ebeef5;
}

:deep(.el-message-box__content) {
  padding: 0;
  max-height: 80vh;
  overflow-y: auto;
}

:deep(.el-message-box__btns) {
  padding: 15px 20px;
  border-top: 1px solid #ebeef5;
}

.user-info-header {
  text-align: center;
  margin-bottom: 30px;
}

.user-info-header h2 {
  margin: 15px 0 0;
  font-size: 20px;
  color: #303133;
}

.user-form {
  padding: 0 20px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

:deep(.el-dialog__body) {
  padding-top: 20px;
}

:deep(.el-radio-group) {
  display: flex;
  gap: 20px;
}

:deep(.el-form-item:last-child) {
  margin-bottom: 0;
}
</style> 