<template>
  <div class="chat-input">
    <el-input
      v-model="inputMessage"
      type="textarea"
      :rows="3"
      placeholder="输入消息..."
      @keydown.enter.exact.prevent="handleEnterPress"
      @keydown.enter.shift.exact="handleShiftEnterPress"
      :disabled="isLoading"
      ref="inputRef"
      @blur="handleInputBlur"
    />
    <el-button 
      type="primary" 
      @click="handleSend" 
      :loading="isLoading" 
      :disabled="!inputMessage.trim()"
    >
      发送
    </el-button>
  </div>
</template>

<script setup>
import { ref, nextTick, onMounted, onUnmounted, watch } from 'vue'

const props = defineProps({
  isLoading: {
    type: Boolean,
    default: false
  },
  modelValue: {
    type: String,
    default: ''
  },
  shouldFocus: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['update:modelValue', 'send'])

const inputRef = ref(null)
const inputMessage = ref(props.modelValue)

watch(() => props.modelValue, (newValue) => {
  inputMessage.value = newValue
})

watch(inputMessage, (newValue) => {
  emit('update:modelValue', newValue)
})

const handleEnterPress = (e) => {
  // 在光标位置插入换行符
  const textarea = e.target
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const text = inputMessage.value
  inputMessage.value = text.substring(0, start) + '\n' + text.substring(end)
  // 下一个 tick 后将光标位置设置到换行符后
  nextTick(() => {
    textarea.selectionStart = textarea.selectionEnd = start + 1
  })
}

const handleShiftEnterPress = () => {
  handleSend()
}

const handleSend = () => {
  if (!inputMessage.value.trim() || props.isLoading) return
  emit('send')
}

const focusInput = () => {
  if (!props.shouldFocus) return
  
  setTimeout(() => {
    if (inputRef.value) {
      inputRef.value.focus()
    }
  }, 100)
}

const handleInputBlur = () => {
  if (props.shouldFocus) {
    focusInput()
  }
}

onMounted(() => {
  focusInput()
})

// 导出方法供父组件调用
defineExpose({
  focus: focusInput
})
</script>

<style scoped>
.chat-input {
  padding: 20px;
  border-top: 1px solid #e0e0e0;
  display: flex;
  align-items: flex-end;
  gap: 12px;
}

.chat-input :deep(.el-input) {
  flex: 1;
}
</style> 