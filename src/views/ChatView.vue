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
            <template v-if="message.role === 'assistant'">
              <div v-if="message.content" 
                   class="message-text" 
                   :class="{ 'has-thinking': hasThinkingContent(message.content) }" 
                   v-html="formatMessage(message.content, true)">
              </div>
              <div v-if="isThinking && message === currentMessages[currentMessages.length - 1]" class="thinking-bubble">
                <div class="thinking-indicator">
                  <el-icon><Loading /></el-icon>
                  <span>AI 正在思考...</span>
                </div>
                <div v-if="thinkingContent" class="thinking-content">
                  {{ thinkingContent }}
                </div>
              </div>
              <div class="message-actions" v-if="message.content && !isStreaming">
                <el-button type="text" size="small" @click="copyMessage(message.content)">
                  <el-icon><Document /></el-icon>复制
                </el-button>
              </div>
            </template>
            <template v-else>
              <div class="message-text" v-html="formatMessage(message.content, false)"></div>
            </template>
          </div>
        </div>
      </div>

      <div class="chat-input">
        <el-input
          v-model="currentInputMessage"
          type="textarea"
          :rows="3"
          placeholder="输入消息..."
          @keydown.enter.exact.prevent="handleEnterPress"
          @keydown.enter.shift.exact="handleShiftEnterPress"
          :disabled="isLoading"
        />
        <el-button type="primary" @click="sendMessage" :loading="isLoading" :disabled="!currentInputMessage.trim()">
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
import { ref, computed, onMounted, nextTick, h, onUnmounted } from 'vue'
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
  breaks: false,
  gfm: true,
  highlight: function (code, lang) {
    if (lang && hljs.getLanguage(lang)) {
      return hljs.highlight(lang, code).value
    }
    return hljs.highlightAuto(code).value
  }
})

const router = useRouter()
const userStore = useUserStore()
const messagesContainer = ref(null)
const isLoading = ref(false)
const currentChatId = ref(null)
const chatList = ref([])
const messagesMap = ref({})
const isStreaming = ref(false)
const thinkingStateMap = ref(new Map())

// 添加 EventSource 实例的引用
const currentEventSource = ref(null)
const eventSourceMap = ref(new Map()) // 添加 eventSourceMap 用于存储每个会话的 EventSource

// 添加输入框内容映射
const inputMessagesMap = ref({})

// 当前对话的消息列表
const currentMessages = computed(() => {
  return messagesMap.value[currentChatId.value] || []
})

// 计算属性：当前会话的输入内容
const currentInputMessage = computed({
  get: () => {
    // 确保当前会话ID存在且有对应的输入内容
    if (!currentChatId.value) return ''
    if (!(currentChatId.value in inputMessagesMap.value)) {
      inputMessagesMap.value[currentChatId.value] = ''
    }
    return inputMessagesMap.value[currentChatId.value]
  },
  set: (value) => {
    if (!currentChatId.value) return
    inputMessagesMap.value[currentChatId.value] = value
  }
})

// 计算当前会话的思考状态
const currentThinkingState = computed(() => {
  if (!currentChatId.value) return { isThinking: false, content: '' }
  return thinkingStateMap.value.get(currentChatId.value) || { isThinking: false, content: '' }
})

// 更新模板中的引用
const isThinking = computed(() => currentThinkingState.value.isThinking)
const thinkingContent = computed(() => currentThinkingState.value.content)

// 创建新对话
const createNewChat = () => {
  const newChat = {
    id: Date.now().toString(),
    title: '新对话',
    createdAt: new Date().toISOString(),
    sessionId: crypto.randomUUID()
  }
  chatList.value.unshift(newChat)
  messagesMap.value[newChat.id] = []
  inputMessagesMap.value[newChat.id] = '' // 初始化新会话的输入内容
  currentChatId.value = newChat.id
}

// 切换对话
const switchChat = (chatId) => {
  if (!(chatId in inputMessagesMap.value)) {
    inputMessagesMap.value[chatId] = ''
  }
  currentChatId.value = chatId
  scrollToBottom()
}

// 删除对话
const deleteChat = async (chatId) => {
  try {
    // 关闭该对话的 EventSource
    const eventSource = eventSourceMap.value.get(chatId)
    if (eventSource) {
      eventSource.close()
      eventSourceMap.value.delete(chatId)
    }
    
    // 清理思考状态
    thinkingStateMap.value.delete(chatId)
    
    chatList.value = chatList.value.filter(chat => chat.id !== chatId)
    delete messagesMap.value[chatId]
    delete inputMessagesMap.value[chatId]
    
    if (currentChatId.value === chatId) {
      currentChatId.value = chatList.value[0]?.id
    }
  } catch (error) {
    ElMessage.error('删除对话失败')
  }
}

// 发送消息
const sendMessage = async () => {
  if (!currentInputMessage.value.trim() || isLoading.value) return

  const message = {
    id: Date.now().toString(),
    role: 'user',
    content: currentInputMessage.value.trim(),
    timestamp: new Date().toISOString()
  }

  if (!currentChatId.value) {
    createNewChat()
  }

  const currentChat = chatList.value.find(chat => chat.id === currentChatId.value)
  if (!currentChat) {
    ElMessage.error('对话不存在')
    return
  }

  if (!messagesMap.value[currentChatId.value]) {
    messagesMap.value[currentChatId.value] = []
  }
  messagesMap.value[currentChatId.value].push(message)
  
  const aiResponse = {
    id: Date.now().toString(),
    role: 'assistant',
    content: '',
    timestamp: new Date().toISOString()
  }
  
  messagesMap.value[currentChatId.value].push(aiResponse)
  
  currentInputMessage.value = ''
  await nextTick()
  scrollToBottom()

  try {
    isLoading.value = true
    isStreaming.value = true

    const url = `http://localhost:7816/user/chat/model?sessionId=${encodeURIComponent(currentChat.sessionId)}&message=${encodeURIComponent(message.content)}`
    
    // 创建新的 EventSource 实例
    const eventSource = new EventSource(url)
    const thisChatId = currentChatId.value
    
    // 将新的 EventSource 添加到 Map 中
    eventSourceMap.value.set(thisChatId, eventSource)
    currentEventSource.value = eventSource

    // 为每个会话存储其响应文本
    const responseTextMap = new Map()
    
    eventSource.onmessage = async (event) => {
      // 只检查会话ID是否匹配，不再检查 currentEventSource
      if (thisChatId !== currentChatId.value) {
        // 如果不是当前显示的会话，只更新内容，不滚动
        handleEventMessage(event, thisChatId, responseTextMap, false)
      } else {
        // 如果是当前显示的会话，更新内容并滚动
        handleEventMessage(event, thisChatId, responseTextMap, true)
      }
    }

    eventSource.onerror = (error) => {
      console.error('发生错误:', error)
      eventSource.close()
      eventSourceMap.value.delete(thisChatId)
      isStreaming.value = false
      isLoading.value = false
      
      if (chatList.value[0].title === '新对话' && responseTextMap.get(thisChatId)) {
        chatList.value[0].title = message.content.slice(0, 20) + (message.content.length > 20 ? '...' : '')
      }
    }

  } catch (error) {
    console.error('发送消息失败:', error)
    ElMessage.error('发送消息失败')
    isLoading.value = false
    isStreaming.value = false
    const eventSource = eventSourceMap.value.get(currentChatId.value)
    if (eventSource) {
      eventSource.close()
      eventSourceMap.value.delete(currentChatId.value)
    }
  }
}

// 添加消息处理函数
const handleEventMessage = (event, chatId, responseTextMap, shouldScroll = true) => {
  // 确保该会话的响应文本已初始化
  if (!responseTextMap.has(chatId)) {
    responseTextMap.set(chatId, '')
  }
  
  // 确保该会话的思考状态已初始化
  if (!thinkingStateMap.value.has(chatId)) {
    thinkingStateMap.value.set(chatId, { isThinking: false, content: '' })
  }
  
  // 获取当前会话的响应文本和思考状态
  let responseText = responseTextMap.get(chatId)
  let thinkingState = thinkingStateMap.value.get(chatId)
  
  // 检查是否是思考内容
  if (event.data.includes('<think>')) {
    thinkingState.isThinking = true
    const thinkMatch = event.data.match(/<think>([\s\S]*?)<\/think>/)
    if (thinkMatch) {
      thinkingState.content = thinkMatch[1].trim()
    }
    thinkingStateMap.value.set(chatId, thinkingState)
    return
  }
  
  // 如果不是思考内容，也不是结束标签，则添加到实际回复中
  if (!event.data.includes('</think>')) {
    const currentData = event.data.trim()
    
    if (!currentData) {
      return
    }

    if (/^[,.!?，。！？、]/.test(currentData) && responseText) {
      responseText = responseText.replace(/\s+$/, '')
    }

    if (currentData === '"' || currentData === '"') {
      responseText += currentData
    } else {
      if (responseText) {
        const lastChar = responseText.slice(-1)
        const currentFirstChar = currentData.charAt(0)
        
        const needSpace = 
          !/^[,.!?，。！？、]/.test(currentData) &&
          lastChar !== '"' &&
          lastChar.trim() && 
          currentFirstChar.trim() &&
          ((/[a-zA-Z0-9]/.test(lastChar) && /[a-zA-Z0-9\u4e00-\u9fa5]/.test(currentFirstChar)) ||
           (/[\u4e00-\u9fa5]/.test(lastChar) && /[a-zA-Z0-9]/.test(currentFirstChar)))

        if (needSpace) {
          responseText += ' '
        }
      }
      responseText += currentData
    }

    // 更新响应文本Map
    responseTextMap.set(chatId, responseText)

    const lastMessage = messagesMap.value[chatId].at(-1)
    if (lastMessage && lastMessage.role === 'assistant') {
      lastMessage.content = responseText
    }
    
    if (shouldScroll) {
      nextTick(() => {
        scrollToBottom()
      })
    }
  }
  
  // 如果收到结束标签，清除思考状态
  if (event.data.includes('</think>')) {
    thinkingState.isThinking = false
    thinkingState.content = ''
    thinkingStateMap.value.set(chatId, thinkingState)
  }
}

// 格式化消息内容（支持Markdown）
const formatMessage = (content, isAIResponse = false) => {
  if (!content) return ''
  let formattedContent = content.replace(/^\s+|\s+$/g, '')

  if (isAIResponse) {
    // 检查是否包含思考过程
    const parts = formattedContent.split(/<\/?think>/)
    if (parts.length >= 2) {
      // parts[0] 是开始标签前的内容（如果有）
      // parts[1] 是思考内容
      // parts[2] 是最终回答
      const thinkContent = parts[1]
      const finalResponse = parts[2] || ''

      // 使用marked处理每个部分的Markdown，并添加额外的换行
      const thinkingHtml = markedInstance.parse(thinkContent.trim())
      const responseHtml = markedInstance.parse(finalResponse.trim())

      // 组合带样式的HTML，在思考内容和最终回答之间添加明显的分隔
      return `
        <div class="thinking-content">
          <div class="thinking-header">🤔 思考过程</div>
          ${thinkingHtml}
        </div>
        <div class="final-response">
          <div class="response-header">💡 最终回答</div>
          ${responseHtml}
        </div>
      `.trim()
    }
  }

  // 如果不是AI回复或没有think标签，正常处理
  const rendered = markedInstance.parse(formattedContent)
  return rendered
    .replace(/<p>/g, '<p class="message-paragraph">')
    .trim()
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
        password: '', // 密码始终为空，表示不修改密码
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

// 检查消息是否包含思考内容
const hasThinkingContent = (content) => {
  return content && content.includes('<think>');
}

// 初始化
onMounted(() => {
  if (!userStore.isAuthenticated) {
    router.push('/login')
    return
  }
  createNewChat()
})

// 组件卸载时清理
onUnmounted(() => {
  // 清理所有的 EventSource 连接
  eventSourceMap.value.forEach(eventSource => {
    eventSource.close()
  })
  eventSourceMap.value.clear()
  
  // 清理所有思考状态
  thinkingStateMap.value.clear()
})

const handleEnterPress = (e) => {
  // 在光标位置插入换行符
  const textarea = e.target;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const text = currentInputMessage.value;
  currentInputMessage.value = text.substring(0, start) + '\n' + text.substring(end);
  // 下一个 tick 后将光标位置设置到换行符后
  nextTick(() => {
    textarea.selectionStart = textarea.selectionEnd = start + 1;
  });
}

const handleShiftEnterPress = () => {
  sendMessage();
}
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
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: 80%;
}

.message.user .message-content {
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
  display: inline-block;
  max-width: 100%;
}

.message-text :deep(p) {
  margin: 0;
  padding: 0;
}

.message-text :deep(.message-paragraph) {
  margin: 0;
  padding: 0;
}

.message-text :deep(p:not(:last-child)) {
  margin-bottom: 8px;
}

.message.assistant .message-text {
  background-color: #ecf5ff;
  border-radius: 0 12px 12px 12px;
  padding: 12px 16px;
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

.thinking-bubble {
  margin-top: 8px;
  padding: 8px 12px;
  background-color: #f0f9ff;
  border-radius: 8px;
  border-left: 4px solid #409EFF;
}

.thinking-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #409EFF;
  font-size: 13px;
}

.thinking-content {
  margin-top: 4px;
  color: #409EFF;
  font-size: 14px;
  line-height: 1.5;
  white-space: pre-line;
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

.message-text :deep(.ai-thinking) {
  background-color: #f6f8fa;
  border-left: 4px solid #95a5a6;
  padding: 12px 16px;
  margin: 8px 0;
  border-radius: 6px;
  font-family: monospace;
  color: #606060;
}

.message.assistant .message-text.has-thinking :deep(.thinking-content) {
  display: block;
  background-color: #f8f9fa;
  padding: 12px 16px;
  margin: -12px -16px 12px -16px;
  border-radius: 0 12px 12px 0;
  border-left: 4px solid #409EFF;
}

.message.assistant .message-text.has-thinking :deep(.final-response) {
  display: block;
  background-color: #fff;
  padding: 12px 16px;
  margin: -12px -16px -12px -16px;
  border-radius: 0 12px 12px 0;
  border-left: 4px solid #67C23A;
}

.message-text :deep(.thinking-header),
.message-text :deep(.response-header) {
  font-weight: 500;
  margin-bottom: 8px;
  color: #606266;
  font-size: 0.9em;
}

.message-text :deep(.thinking-header) {
  color: #409EFF;
}

.message-text :deep(.response-header) {
  color: #67C23A;
}

.message-text :deep(.thinking-content),
.message-text :deep(.final-response) {
  position: relative;
}

.message-text :deep(.thinking-content p:last-child),
.message-text :deep(.final-response p:last-child) {
  margin-bottom: 0;
}
</style> 