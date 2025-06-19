# 创建个人信息页面
<template>
  <div class="profile-container">
    <el-card class="profile-card">
      <template #header>
        <div class="card-header">
          <h2>{{ isSuper ? '超级管理员信息' : '讲师信息' }}</h2>
        </div>
      </template>

      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="100px"
        class="profile-form"
      >
        <el-form-item 
          label="用户名" 
          prop="username"
          :disabled="!isSuper"
        >
          <el-input 
            v-model="form.username" 
            :readonly="!isSuper"
          />
        </el-form-item>

        <el-form-item label="密码" prop="password">
          <el-input
            v-model="form.password"
            type="password"
            placeholder="留空表示不修改密码"
            show-password
          />
        </el-form-item>

        <template v-if="!isSuper">
          <el-form-item label="讲师姓名" prop="lecturerName">
            <el-input v-model="form.lecturerName" />
          </el-form-item>

          <el-form-item label="讲师职称" prop="lecturerTitle">
            <el-input v-model="form.lecturerTitle" />
          </el-form-item>
        </template>

        <el-form-item label="邮箱" prop="email">
          <el-input v-model="form.email" />
        </el-form-item>

        <el-form-item label="手机号" prop="phone">
          <el-input v-model="form.phone" />
        </el-form-item>

        <template v-if="!isSuper">
          <el-form-item label="性别" prop="gender">
            <el-select v-model="form.gender" placeholder="请选择性别">
              <el-option label="未知" :value="0" />
              <el-option label="男" :value="1" />
              <el-option label="女" :value="2" />
            </el-select>
          </el-form-item>

          <el-form-item label="个人简介" prop="bio">
            <el-input
              v-model="form.bio"
              type="textarea"
              :rows="4"
              placeholder="请输入个人简介"
            />
          </el-form-item>
        </template>

        <el-form-item>
          <el-button type="primary" @click="handleSubmit">保存</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { getAdminDetail, updateAdminInfo } from '@/api/admin'

const formRef = ref(null)
const form = ref({
  username: '',
  password: '',
  lecturerName: '',
  lecturerTitle: '',
  email: '',
  phone: '',
  gender: '',
  bio: ''
})

// 从 localStorage 获取管理员角色
const isSuper = computed(() => {
  const adminInfo = localStorage.getItem('adminInfo')
  if (adminInfo) {
    try {
      const { adminRole } = JSON.parse(adminInfo)
      return adminRole === 'SUPER_ADMIN'
    } catch (e) {
      return false
    }
  }
  return false
})

const rules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '长度在 3 到 20 个字符', trigger: 'blur' }
  ],
  password: [
    { min: 6, max: 20, message: '长度在 6 到 20 个字符', trigger: 'blur' }
  ],
  email: [
    { required: true, message: '请输入邮箱地址', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱地址', trigger: 'blur' }
  ],
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号', trigger: 'blur' }
  ]
}

const fetchProfile = async () => {
  try {
    const { data } = await getAdminDetail()
    Object.assign(form.value, data)
  } catch (error) {
    ElMessage.error('获取个人信息失败')
  }
}

const handleSubmit = async () => {
  if (!formRef.value) return
  
  await formRef.value.validate(async (valid) => {
    if (valid) {
      try {
        const formData = { ...form.value }
        if (!formData.password) {
          delete formData.password
        }
        await updateAdminInfo(formData)
        ElMessage.success('更新成功')
        fetchProfile()
      } catch (error) {
        ElMessage.error('更新失败')
      }
    }
  })
}

onMounted(() => {
  fetchProfile()
})
</script>

<style scoped>
.profile-container {
  padding: 20px;
}

.profile-card {
  max-width: 800px;
  margin: 0 auto;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.profile-form {
  margin-top: 20px;
}
</style> 