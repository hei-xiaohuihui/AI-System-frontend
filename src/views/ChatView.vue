<template>
  <div class="chat-container">
    <!-- 侧边栏组件 -->
    <ChatSidebar
      :chatList="chatList"
      :currentChatId="currentChatId"
      @create-chat="createNewChat"
      @switch-chat="switchChat"
      @delete-chat="deleteChat"
      @show-profile="showUserProfile"
    />

    <!-- 主聊天区域 -->
    <div class="main-content">
      <div class="chat-messages" ref="messagesContainer">
        <div v-if="loadingHistory" class="loading-container">
          <el-icon class="loading-icon"><Loading /></el-icon>
          <span>加载聊天记录中...</span>
        </div>
        <template v-else>
          <ChatMessage
            v-for="(message, index) in currentMessages"
            :key="message.id"
            :message="message"
            :username="userStore.getUserInfo.username"
            :isThinking="isThinking"
            :thinkingContent="thinkingContent"
            :isLastMessage="index === currentMessages.length - 1"
            :isStreaming="isCurrentChatStreaming"
          />
        </template>
      </div>

      <ChatInput
        v-model="currentInputMessage"
        :isLoading="isLoading"
        :shouldFocus="shouldFocus"
        @send="sendMessage"
        ref="inputRef"
      />
    </div>

    <!-- 用户个人信息对话框 -->
    <UserProfileDialog
      v-model="dialogVisible"
      @close="handleDialogClose"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'
import { Loading } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import axios from 'axios'
import ChatSidebar from '../components/ChatSidebar.vue'
import ChatMessage from '../components/ChatMessage.vue'
import ChatInput from '../components/ChatInput.vue'
import UserProfileDialog from '../components/UserProfileDialog.vue'

// 使用 crypto API 生成 UUID
const crypto = window.crypto

const router = useRouter()
const userStore = useUserStore()
const messagesContainer = ref(null)
const inputRef = ref(null)
const isLoading = ref(false)
const currentChatId = ref(null)
const chatList = ref([])
const messagesMap = ref({})
const streamingStateMap = ref(new Map())
const thinkingStateMap = ref(new Map())
const shouldFocus = ref(true)
const dialogVisible = ref(false)
const loadingHistory = ref(false)

// 添加 EventSource 实例的引用
const eventSourceMap = ref(new Map())

// 添加输入框内容映射
const inputMessagesMap = ref({})

// 计算属性
const currentMessages = computed(() => messagesMap.value[currentChatId.value] || [])

const currentInputMessage = computed({
  get: () => {
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

const currentThinkingState = computed(() => {
  if (!currentChatId.value) return { isThinking: false, content: '' }
  return thinkingStateMap.value.get(currentChatId.value) || { isThinking: false, content: '' }
})

const isThinking = computed(() => currentThinkingState.value.isThinking)
const thinkingContent = computed(() => currentThinkingState.value.content)

const isCurrentChatStreaming = computed(() => {
  return streamingStateMap.value.get(currentChatId.value) || false
})

// 主要功能函数
const createNewChat = () => {
  shouldFocus.value = true
  
  const newChat = {
    id: Date.now().toString(),
    title: '新对话',
    createdAt: new Date().toISOString(),
    sessionId: crypto.randomUUID()
  }
  chatList.value.unshift(newChat)
  messagesMap.value[newChat.id] = []
  inputMessagesMap.value[newChat.id] = ''
  currentChatId.value = newChat.id
  inputRef.value?.focus()
}

const switchChat = async (chatId) => {
  shouldFocus.value = true
  
  if (!(chatId in inputMessagesMap.value)) {
    inputMessagesMap.value[chatId] = ''
  }
  
  const targetChat = chatList.value.find(chat => chat.id === chatId)
  if (targetChat && !messagesMap.value[chatId]) {
    await loadChatHistory(chatId, targetChat.sessionId)
  }
  
  currentChatId.value = chatId
  await nextTick()
  scrollToBottom()
  inputRef.value?.focus()
}

const deleteChat = async (chatId) => {
  try {
    const chat = chatList.value.find(c => c.id === chatId)
    if (!chat) {
      ElMessage.error('对话不存在')
      return
    }

    await ElMessageBox.confirm(
      '确定要删除这个对话吗？删除后无法恢复。',
      '删除确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    const eventSource = eventSourceMap.value.get(chatId)
    if (eventSource) {
      eventSource.close()
      eventSourceMap.value.delete(chatId)
    }
    
    await axios.delete('/user/session/delete', {
      params: { sessionId: chat.sessionId }
    })
    
    thinkingStateMap.value.delete(chatId)
    streamingStateMap.value.delete(chatId)
    
    chatList.value = chatList.value.filter(c => c.id !== chatId)
    delete messagesMap.value[chatId]
    delete inputMessagesMap.value[chatId]
    
    if (currentChatId.value === chatId) {
      if (chatList.value.length > 0) {
        currentChatId.value = chatList.value[0].id
      } else {
        createNewChat()
      }
    }

    ElMessage.success('对话删除成功')
  } catch (error) {
    if (error === 'cancel') return
    console.error('删除对话失败:', error)
    ElMessage.error('删除对话失败')
  }
}

const sendMessage = async () => {
  if (!currentInputMessage.value.trim() || isLoading.value) return

  shouldFocus.value = true
  let accumulatedData = ''
  let responseComplete = false

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

  const sendingChatId = currentChatId.value

  if (!messagesMap.value[sendingChatId]) {
    messagesMap.value[sendingChatId] = []
  }
  messagesMap.value[sendingChatId].push(message)
  
  const aiResponse = {
    id: Date.now().toString(),
    role: 'assistant',
    content: '',
    timestamp: new Date().toISOString()
  }
  
  messagesMap.value[sendingChatId].push(aiResponse)
  
  currentInputMessage.value = ''
  await nextTick()
  scrollToBottom()

  let scrollTimeout
  const debouncedScroll = () => {
    clearTimeout(scrollTimeout)
    scrollTimeout = setTimeout(() => {
      if (currentChatId.value === sendingChatId) {
        scrollToBottom()
      }
    }, 100)
  }

  const handleStreamData = (data) => {
    if (!data) return false

    try {
      const newData = data.substring(accumulatedData.length)
      accumulatedData = data

      const lines = newData.split('\n')
      let hasValidData = false
      
      lines.forEach(line => {
        if (line.startsWith('data:')) {
          const eventData = line.slice(5).trim()
          if (eventData) {
            hasValidData = true
            const lastMessage = messagesMap.value[sendingChatId]?.at(-1)
            if (lastMessage && lastMessage.role === 'assistant') {
              if (!lastMessage.content) {
                lastMessage.content = eventData
              } else {
                lastMessage.content += eventData
              }
              debouncedScroll()
            }
          }
        }
      })

      return hasValidData
    } catch (error) {
      console.error('Error processing stream data:', error)
      return false
    }
  }

  let retryCount = 0
  const maxRetries = 3
  const retryDelay = 1000

  const attemptRequest = async () => {
    try {
      isLoading.value = true
      streamingStateMap.value.set(sendingChatId, true)

      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:7816'
      const url = `${baseUrl}/user/chat/model`

      try {
        const checkResponse = await axios.get('/user/auth/checkToken')
        if (checkResponse.data.code !== 200) {
          throw new Error('Token validation failed')
        }
      } catch (error) {
        if (!error.config?._isRetry) {
          userStore.logout()
          await router.push('/login')
        }
        streamingStateMap.value.delete(sendingChatId)
        isLoading.value = false
        return false
      }

      const axiosInstance = axios.create({
        timeout: 600000,
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        headers: {
          'Authorization': `Bearer ${userStore.token}`,
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache'
        },
        responseType: 'text'
      })

      axiosInstance.interceptors.response.use(
        response => response,
        async error => {
          if (error.code === 'ECONNABORTED' || error.message.includes('Network Error')) {
            console.warn('连接中断，正在重试...')
            const lastMessage = messagesMap.value[sendingChatId]?.at(-1)
            if (lastMessage && lastMessage.role === 'assistant') {
              const currentContent = lastMessage.content || ''
              const retryConfig = {
                ...error.config,
                headers: {
                  ...error.config.headers,
                  'X-Content-Position': currentContent.length.toString()
                }
              }
              await new Promise(resolve => setTimeout(resolve, 1000))
              return axiosInstance(retryConfig)
            }
          }
          throw error
        }
      )

      const response = await axiosInstance.get(url, {
        params: {
          sessionId: currentChat.sessionId,
          message: message.content
        },
        onDownloadProgress: (progressEvent) => {
          try {
            const data = progressEvent.event.target.response
            handleStreamData(data)
          } catch (error) {
            console.warn('Stream processing error:', error)
          }
        }
      })

      if (!responseComplete) {
        handleStreamData(response.data + '\ndata:\n')
      }

      streamingStateMap.value.delete(sendingChatId)
      isLoading.value = false
      
      if (chatList.value[0]?.id === sendingChatId && chatList.value[0]?.title === '新对话') {
        chatList.value[0].title = message.content.slice(0, 20) + (message.content.length > 20 ? '...' : '')
      }

      await nextTick()
      scrollToBottom()

      return true
    } catch (error) {
      console.error('发送消息失败:', error)
      
      if (error.response?.status === 401 && !error.config?._isRetry) {
        userStore.logout()
        await router.push('/login')
        streamingStateMap.value.delete(sendingChatId)
        isLoading.value = false
        return false
      }
      
      if (
        (error.code === 'ECONNABORTED' || 
         error.message.includes('Network Error') ||
         error.message.includes('timeout')) &&
        retryCount < maxRetries
      ) {
        retryCount++
        console.warn(`请求失败，第 ${retryCount} 次重试...`)
        await new Promise(resolve => setTimeout(resolve, retryDelay * retryCount))
        return attemptRequest()
      }

      if (retryCount >= maxRetries && !error.config._isHandled) {
        error.config._isHandled = true
        ElMessage.error('多次重试后仍然失败，请检查网络连接')
      }

      const lastMessage = messagesMap.value[sendingChatId]?.at(-1)
      if (lastMessage && lastMessage.role === 'assistant' && !lastMessage.content) {
        lastMessage.content = '抱歉，消息发送过程中出现错误。已接收的内容如下：\n' + (accumulatedData || '')
      }

      streamingStateMap.value.delete(sendingChatId)
      isLoading.value = false
      return false
    }
  }

  return attemptRequest()
}

const scrollToBottom = () => {
  if (messagesContainer.value) {
    const container = messagesContainer.value
    const shouldSmoothScroll = container.scrollHeight - (container.scrollTop + container.clientHeight) > 500
    
    container.scrollTo({
      top: container.scrollHeight,
      behavior: shouldSmoothScroll ? 'smooth' : 'auto'
    })
  }
}

const loadSessionList = async () => {
  try {
    const response = await axios.get('/user/session/sessionIds')
    if (response.data.code === 200) {
      const sessionIds = response.data.data
      const chats = sessionIds.map(sessionId => ({
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        sessionId: sessionId,
        title: '加载中...',
        createdAt: new Date().toISOString()
      }))
      chatList.value = chats
      
      if (chats.length > 0) {
        // 加载所有会话的历史记录
        await Promise.all(chats.map(chat => loadChatHistory(chat.id, chat.sessionId)))
        currentChatId.value = chats[0].id
      } else {
        createNewChat()
      }
    }
  } catch (error) {
    console.error('加载会话列表失败:', error)
    ElMessage.error('加载会话列表失败')
    createNewChat()
  }
}

const loadChatHistory = async (chatId, sessionId) => {
  try {
    loadingHistory.value = true
    const response = await axios.get('/user/session/history', {
      params: { sessionId }
    })
    
    if (response.data.code === 200) {
      const historyMessages = response.data.data.map(msg => ({
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        role: msg.sender,
        content: msg.message,
        timestamp: new Date().toISOString()
      }))
      
      messagesMap.value[chatId] = historyMessages
      
      const firstUserMessage = historyMessages.find(msg => msg.role === 'user')
      if (firstUserMessage) {
        const chat = chatList.value.find(c => c.id === chatId)
        if (chat) {
          chat.title = firstUserMessage.content.slice(0, 20) + (firstUserMessage.content.length > 20 ? '...' : '')
        }
      }
      
      await nextTick()
      setTimeout(() => {
        scrollToBottom()
      }, 100)
    }
  } catch (error) {
    console.error('加载聊天历史失败:', error)
    ElMessage.error('加载聊天历史失败')
  } finally {
    loadingHistory.value = false
  }
}

const showUserProfile = () => {
  dialogVisible.value = true
  shouldFocus.value = false
}

const handleDialogClose = () => {
  dialogVisible.value = false
  setTimeout(() => {
    shouldFocus.value = true
    inputRef.value?.focus()
  }, 100)
}

// 监听器
watch(
  () => currentMessages.value,
  () => {
    nextTick(() => {
      scrollToBottom()
    })
  },
  { deep: true }
)

watch(
  () => currentChatId.value,
  () => {
    nextTick(() => {
      scrollToBottom()
    })
  }
)

// 生命周期钩子
onMounted(async () => {
  if (!userStore.isAuthenticated) {
    await router.push('/login')
    return
  }

  await loadSessionList()
  inputRef.value?.focus()
})

onUnmounted(() => {
  eventSourceMap.value.forEach(eventSource => {
    eventSource.close()
  })
  eventSourceMap.value.clear()
  streamingStateMap.value.clear()
  thinkingStateMap.value.clear()
})
</script>

<style scoped>
.chat-container {
  display: flex;
  height: 100vh;
  background-color: #f5f5f5;
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

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: #909399;
}

.loading-icon {
  font-size: 24px;
  margin-bottom: 8px;
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