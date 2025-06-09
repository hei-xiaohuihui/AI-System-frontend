<template>
  <el-dialog
    v-model="dialogVisible"
    title="个人信息"
    width="500px"
    :close-on-click-modal="false"
    @closed="handleClose"
  >
    <div class="user-info-header">
      <el-avatar :size="80">{{ username?.charAt(0).toUpperCase() }}</el-avatar>
      <h2>{{ username }}</h2>
    </div>
    
    <el-form
      ref="formRef"
      :model="form"
      :rules="formRules"
      label-width="80px"
      class="user-form"
    >
      <el-form-item label="密码" prop="password">
        <el-input
          v-model="form.password"
          type="password"
          placeholder="留空表示不修改密码"
          show-password
          clearable
        />
      </el-form-item>
      
      <el-form-item label="邮箱" prop="email">
        <el-input
          v-model="form.email"
          placeholder="请输入邮箱"
          clearable
        />
      </el-form-item>
      
      <el-form-item label="手机号" prop="phone">
        <el-input
          v-model="form.phone"
          placeholder="请输入手机号"
          clearable
        />
      </el-form-item>
      
      <el-form-item label="性别" prop="gender">
        <el-radio-group v-model="form.gender">
          <el-radio :label="0">未知</el-radio>
          <el-radio :label="1">男</el-radio>
          <el-radio :label="2">女</el-radio>
        </el-radio-group>
      </el-form-item>
    </el-form>
    
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button type="primary" @click="handleUpdate" :loading="updating">
          保存
        </el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { ElMessage } from 'element-plus'
import axios from 'axios'
import { useUserStore } from '../stores/user'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'close'])

const userStore = useUserStore()
const formRef = ref(null)
const updating = ref(false)

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const username = computed(() => userStore.getUserInfo.username)

const form = ref({
  password: '',
  email: '',
  phone: '',
  gender: 0
})

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

const loadUserInfo = async () => {
  try {
    const response = await axios.get('/user/auth/detail')
    if (response.data.code === 200) {
      const userDetail = response.data.data
      form.value = {
        password: '',
        email: userDetail.email || '',
        phone: userDetail.phone || '',
        gender: userDetail.gender ?? 0
      }
    } else {
      ElMessage.error('获取用户信息失败')
    }
  } catch (error) {
    console.error('获取用户信息失败:', error)
    ElMessage.error('获取用户信息失败，请稍后重试')
  }
}

const handleClose = () => {
  dialogVisible.value = false
  emit('close')
}

const handleUpdate = async () => {
  if (!formRef.value) return
  
  try {
    await formRef.value.validate()
    updating.value = true
    
    const updateData = {}
    if (form.value.password) {
      updateData.password = form.value.password
    }
    if (form.value.email !== userStore.getUserInfo.email) {
      updateData.email = form.value.email
    }
    if (form.value.phone !== userStore.getUserInfo.phone) {
      updateData.phone = form.value.phone
    }
    if (form.value.gender !== userStore.getUserInfo.gender) {
      updateData.gender = form.value.gender
    }

    if (Object.keys(updateData).length === 0) {
      ElMessage.info('没有信息需要更新')
      dialogVisible.value = false
      return
    }

    const response = await axios.post('/user/auth/update', updateData)
    if (response.data.code === 200) {
      ElMessage.success('个人信息更新成功')
      const userInfo = {
        ...userStore.getUserInfo,
        ...updateData
      }
      delete userInfo.password
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

// 当对话框打开时加载用户信息
watch(() => props.modelValue, (newValue) => {
  if (newValue) {
    loadUserInfo()
  }
})
</script>

<style scoped>
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