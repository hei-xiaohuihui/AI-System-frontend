<template>
  <div :class="['message', message.role]">
    <div class="avatar">
      <el-avatar :size="40">
        {{ message.role === 'user' ? username?.charAt(0).toUpperCase() : 'AI' }}
      </el-avatar>
    </div>
    <div class="message-content">
      <template v-if="message.role === 'assistant'">
        <div v-if="message.content" 
             class="message-text" 
             :class="{ 'has-thinking': hasThinkingContent(message.content) }" 
             v-html="formatMessage(message.content, true)">
        </div>
        <div v-if="isThinking && isLastMessage" class="thinking-bubble">
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
</template>

<script setup>
import { Loading, Document } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import * as marked from 'marked'
import hljs from 'highlight.js'

const props = defineProps({
  message: {
    type: Object,
    required: true
  },
  username: {
    type: String,
    required: true
  },
  isThinking: {
    type: Boolean,
    default: false
  },
  thinkingContent: {
    type: String,
    default: ''
  },
  isLastMessage: {
    type: Boolean,
    default: false
  },
  isStreaming: {
    type: Boolean,
    default: false
  }
})

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

const hasThinkingContent = (content) => {
  return content && content.includes('<think>')
}

const formatMessage = (content, isAIResponse = false) => {
  if (!content) return ''
  let formattedContent = content.replace(/^\s+|\s+$/g, '')

  if (isAIResponse) {
    const parts = formattedContent.split(/<\/?think>/)
    if (parts.length >= 2) {
      const thinkContent = parts[1]
      const finalResponse = parts[2] || ''

      const thinkingHtml = markedInstance.parse(thinkContent.trim())
      const responseHtml = markedInstance.parse(finalResponse.trim())

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

  const rendered = markedInstance.parse(formattedContent)
  return rendered
    .replace(/<p>/g, '<p class="message-paragraph">')
    .trim()
}

const copyMessage = async (content) => {
  try {
    await navigator.clipboard.writeText(content)
    ElMessage.success('复制成功')
  } catch (error) {
    ElMessage.error('复制失败')
  }
}
</script>

<style scoped>
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

:deep(.message-paragraph) {
  margin: 0;
  padding: 0;
}

:deep(.thinking-header),
:deep(.response-header) {
  font-weight: 500;
  margin-bottom: 8px;
  color: #606266;
  font-size: 0.9em;
}

:deep(.thinking-header) {
  color: #409EFF;
}

:deep(.response-header) {
  color: #67C23A;
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
</style> 