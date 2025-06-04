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
            <div class="message-text" v-html="formatMessage(message.content.trim(), message.role === 'assistant')"></div>
            <div class="message-actions" v-if="message.role === 'assistant'">
              <el-button type="text" size="small" @click="copyMessage(message.content)">
                <el-icon><Document /></el-icon>复制
              </el-button>
            </div>
          </div>
        </div>
        <div v-if="isThinking" class="message assistant thinking">
          <div class="avatar">
            <el-avatar :size="40">AI</el-avatar>
          </div>
          <div class="message-content">
            <div class="thinking-indicator">
              <el-icon><Loading /></el-icon>
              <span>AI 正在思考...</span>
            </div>
            <div class="thinking-content" v-if="thinkingContent">
              {{ thinkingContent }}
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
import { Plus, ChatRound, Delete, Document, Loading } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import axios from 'axios'
import * as marked from 'marked'
import hljs from 'highlight.js'

// 使用 crypto API 生成 UUID
const crypto = window.crypto

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
const isStreaming = ref(false)
const currentStreamingMessage = ref('')
const isThinking = ref(false)
const thinkingContent = ref('')
const actualResponse = ref('')

// 当前对话的消息列表
const currentMessages = computed(() => {
  return messagesMap.value[currentChatId.value] || []
})

// 创建新对话
const createNewChat = () => {
  const newChat = {
    id: Date.now().toString(),
    title: '新对话',
    createdAt: new Date().toISOString(),
    sessionId: crypto.randomUUID() // 为每个新对话生成一个唯一的sessionId
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

  // 获取当前对话的sessionId
  const currentChat = chatList.value.find(chat => chat.id === currentChatId.value)
  if (!currentChat) {
    ElMessage.error('对话不存在')
    return
  }

  messagesMap.value[currentChatId.value].push(message)
  inputMessage.value = ''
  scrollToBottom()

  try {
    isLoading.value = true
    isStreaming.value = true
    actualResponse.value = ''
    
    // 创建一个初始的AI响应消息
    const aiResponse = {
      id: Date.now().toString(),
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString()
    }
    
    // 添加到消息列表
    messagesMap.value[currentChatId.value].push(aiResponse)
    currentStreamingMessage.value = ''

    // 构建带有sessionId的URL
    const url = `http://localhost:7816/user/chat/model?sessionId=${encodeURIComponent(currentChat.sessionId)}&message=${encodeURIComponent(message.content)}`
    
    // 创建 EventSource 实例
    const eventSource = new EventSource(url)

    // 处理消息
    eventSource.onmessage = (event) => {
      console.log('收到消息:', event.data)
      
      // 检查是否是思考内容
      if (event.data.includes('<think>')) {
        isThinking.value = true
        const thinkMatch = event.data.match(/<think>([\s\S]*?)<\/think>/)
        if (thinkMatch) {
          thinkingContent.value = thinkMatch[1].trim()
        }
        return
      }
      
      // 如果不是思考内容，也不是结束标签，则添加到实际回复中
      if (!event.data.includes('</think>')) {
        const currentData = event.data.trim()
        
        // 如果是空字符串，可能是换行标记
        if (!currentData) {
          return
        }

        // 处理标点符号前的空格
        const punctuationStart = /^[,.!?，。！？、]/.test(currentData)
        if (punctuationStart && actualResponse.value) {
          // 如果是标点符号开头，移除前面可能的空格
          actualResponse.value = actualResponse.value.replace(/\s+$/, '')
        }

        // 处理引号
        if (currentData === '"' || currentData === '"') {
          actualResponse.value += currentData
          return
        }

        // 添加适当的空格
        if (actualResponse.value) {
          const lastChar = actualResponse.value.slice(-1)
          const currentFirstChar = currentData.charAt(0)
          
          // 判断是否需要添加空格
          const needSpace = 
            // 不是在标点符号之前
            !punctuationStart &&
            // 不是在引号之后
            lastChar !== '"' &&
            // 确保两个字符都不是空白字符
            lastChar.trim() && currentFirstChar.trim() &&
            // 如果两边都是英文字母或数字，或者一边是中文一边是英文，则需要空格
            ((/[a-zA-Z0-9]/.test(lastChar) && /[a-zA-Z0-9\u4e00-\u9fa5]/.test(currentFirstChar)) ||
             (/[\u4e00-\u9fa5]/.test(lastChar) && /[a-zA-Z0-9]/.test(currentFirstChar)))

          if (needSpace) {
            actualResponse.value += ' '
          }
        }

        actualResponse.value += currentData
        currentStreamingMessage.value = actualResponse.value
        aiResponse.content = actualResponse.value
        nextTick(() => {
          scrollToBottom()
        })
      }
      
      // 如果收到结束标签，清除思考状态
      if (event.data.includes('</think>')) {
        isThinking.value = false
        thinkingContent.value = ''
      }
    }

    // 处理错误
    eventSource.onerror = (error) => {
      console.error('发生错误:', error)
      eventSource.close()
      isStreaming.value = false
      isLoading.value = false
    }

    // 处理连接打开
    eventSource.onopen = () => {
      console.log('SSE 连接已建立')
    }

    // 监听连接状态
    const checkConnection = setInterval(() => {
      if (eventSource.readyState === EventSource.CLOSED) {
        clearInterval(checkConnection)
        isStreaming.value = false
        isLoading.value = false
        
        // 如果是新对话，更新标题
        if (chatList.value[0].title === '新对话') {
          chatList.value[0].title = message.content.slice(0, 20) + (message.content.length > 20 ? '...' : '')
        }
      }
    }, 100)

  } catch (error) {
    console.error('发送消息失败:', error)
    ElMessage.error('发送消息失败')
    isLoading.value = false
    isStreaming.value = false
  }
}

// 格式化消息内容（支持Markdown）
const formatMessage = (content, isAIResponse = false) => {
  let formattedContent = content

  // 只对 AI 回复进行格式化处理
  if (isAIResponse) {
    // 1. 处理段落（以句号、问号、感叹号结尾的句子）
    formattedContent = content
      .split(/([.。！？!?]\s*)/)
      .filter(Boolean)
      .map(part => part.trim())
      .join('')
      .replace(/([.。！？!?])/g, '$1\n\n')
      .replace(/\n\s*\n/g, '\n')  // 移除多余的空行
      .trim()

    // 2. 处理中英文混排
    formattedContent = formattedContent
      // 在中英文之间添加空格
      .replace(/([A-Za-z0-9])([\u4e00-\u9fa5])/g, '$1 $2')
      .replace(/([\u4e00-\u9fa5])([A-Za-z0-9])/g, '$1 $2')
      // 移除多余的空格和换行
      .replace(/\s+/g, ' ')
      .trim()
  }

  // 使用marked处理Markdown
  return markedInstance.parse(formattedContent)
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
  width: 100%;
}

.message.user {
  flex-direction: row-reverse;
}

.message .avatar {
  margin-right: 12px;
  flex-shrink: 0;
}

.message.user .avatar {
  margin-right: 0;
  margin-left: 12px;
}

.message-content {
  flex: 0 1 auto;
  max-width: 80%;
  min-width: 50px;
}

.message.user .message-content {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.message-text {
  padding: 12px 16px;
  border-radius: 12px;
  background-color: #f5f5f5;
  line-height: 1.5;
  font-size: 14px;
  word-wrap: break-word;
  white-space: normal;
}

.message.assistant .message-text {
  background-color: #ecf5ff;
  border-radius: 0 12px 12px 12px;
}

.message.user .message-text {
  background-color: #95EC69;
  color: #000000;
  border-radius: 12px 0 12px 12px;
}

.message-actions {
  margin-top: 4px;
  display: flex;
  justify-content: flex-end;
  opacity: 0;
  transition: opacity 0.2s;
}

.message-content:hover .message-actions {
  opacity: 1;
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
  padding: 8px 12px;
  background: #ecf5ff;
  border-radius: 12px;
  width: fit-content;
}

.thinking-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #409EFF;
  margin-bottom: 4px;
  font-size: 13px;
}

.thinking-content {
  padding: 8px 12px;
  background-color: #F5F7FA;
  border-radius: 6px;
  font-size: 13px;
  color: #606266;
  line-height: 1.4;
  white-space: pre-line;
  max-width: 100%;
}

/* 消息内容样式 */
.message-text :deep(p) {
  margin: 0;
  line-height: 1.5;
  white-space: normal;
}

.message-text :deep(p + p) {
  margin-top: 8px;
}

.message-text :deep(pre) {
  margin: 8px 0;
  padding: 12px;
  background-color: #f6f8fa;
  border-radius: 6px;
  font-size: 13px;
  overflow-x: auto;
}

.message-text :deep(code) {
  font-family: 'Fira Code', monospace;
  font-size: 13px;
  padding: 2px 4px;
  background-color: rgba(0, 0, 0, 0.05);
  border-radius: 3px;
}

.message-text :deep(ul), 
.message-text :deep(ol) {
  margin: 8px 0;
  padding-left: 20px;
}

.message-text :deep(li) {
  margin: 4px 0;
}

.message-text :deep(blockquote) {
  margin: 8px 0;
  padding-left: 12px;
  border-left: 4px solid #ddd;
  color: #666;
}

/* 响应式布局 */
@media screen and (max-width: 768px) {
  .message-content {
    max-width: 90%;
  }
  
  .message-text {
    font-size: 13px;
    padding: 10px 12px;
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

.thinking {
  opacity: 0.8;
}

.thinking-indicator .el-icon {
  animation: rotate 1s linear infinite;
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style> 