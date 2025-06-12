<template>
  <div class="admin-management">
    <div class="page-header">
      <h3>讲师管理</h3>
      <el-button type="primary" @click="dialogVisible = true">
        <el-icon><Plus /></el-icon>
        创建讲师
      </el-button>
    </div>

    <!-- 搜索表单 -->
    <el-card class="search-card" style="margin-bottom: 20px;">
      <el-form :model="searchForm" inline class="search-form">
        <div class="form-item-group">
          <el-form-item label="讲师姓名">
            <el-input v-model="searchForm.lecturerName" placeholder="请输入讲师姓名" clearable />
          </el-form-item>
          <el-form-item label="讲师职称">
            <el-input v-model="searchForm.lecturerTitle" placeholder="请输入讲师职称" clearable />
          </el-form-item>
          <el-form-item label="邮箱">
            <el-input v-model="searchForm.email" placeholder="请输入邮箱" clearable />
          </el-form-item>
          <el-form-item label="电话">
            <el-input v-model="searchForm.phone" placeholder="请输入电话" clearable />
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="searchForm.status" placeholder="请选择状态" clearable style="width: 120px;">
              <el-option label="正常" :value="1" />
              <el-option label="禁用" :value="0" />
            </el-select>
          </el-form-item>
        </div>
        <div class="form-buttons">
          <el-form-item>
            <el-button type="primary" @click="handleSearch">搜索</el-button>
            <el-button @click="resetSearch">重置</el-button>
          </el-form-item>
        </div>
      </el-form>
    </el-card>

    <!-- 讲师列表 -->
    <el-card class="table-card">
      <el-table :data="adminList" style="width: 100%" v-loading="loading">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="username" label="用户名" width="150" />
        <el-table-column prop="lecturerName" label="讲师姓名" width="120" />
        <el-table-column prop="lecturerTitle" label="讲师职称" width="120" />
        <el-table-column prop="email" label="邮箱" width="180" />
        <el-table-column prop="phone" label="电话" width="120" />
        <el-table-column prop="gender" label="性别" width="80">
          <template #default="scope">
            {{ scope.row.gender === 1 ? '男' : scope.row.gender === 2 ? '女' : '未知' }}
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="scope">
            <el-tag :type="scope.row.status === 1 ? 'success' : 'danger'">
              {{ scope.row.status === 1 ? '正常' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" fixed="right" width="150">
          <template #default="scope">
            <el-button type="primary" link @click="handleEdit(scope.row)">编辑</el-button>
            <el-switch
              v-model="scope.row.status"
              :active-value="1"
              :inactive-value="0"
              @change="handleStatusChange(scope.row)"
            />
          </template>
        </el-table-column>
      </el-table>
      
      <div class="pagination">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next"
          :total="total"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <!-- 创建讲师对话框 -->
    <el-dialog
      v-model="dialogVisible"
      title="创建讲师"
      width="500px"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="80px"
      >
        <el-form-item label="用户名" prop="username">
          <el-input v-model="form.username" placeholder="请输入用户名" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input v-model="form.password" type="password" placeholder="请输入密码" />
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="form.email" placeholder="请输入邮箱" />
        </el-form-item>
        <el-form-item label="电话" prop="phone">
          <el-input v-model="form.phone" placeholder="请输入电话" />
        </el-form-item>
        <el-form-item label="性别" prop="gender">
          <el-select v-model="form.gender" placeholder="请选择性别">
            <el-option label="男" :value="1" />
            <el-option label="女" :value="2" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleCreate" :loading="creating">
            创建
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 编辑讲师对话框 -->
    <el-dialog
      v-model="editDialogVisible"
      title="编辑讲师信息"
      width="500px"
    >
      <el-form
        ref="editFormRef"
        :model="editForm"
        :rules="editRules"
        label-width="80px"
      >
        <el-form-item label="用户名" prop="username">
          <el-input v-model="editForm.username" placeholder="请输入用户名" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input v-model="editForm.password" type="password" placeholder="不修改请留空" />
        </el-form-item>
        <el-form-item label="讲师姓名" prop="lecturerName">
          <el-input v-model="editForm.lecturerName" placeholder="请输入讲师姓名" />
        </el-form-item>
        <el-form-item label="讲师职称" prop="lecturerTitle">
          <el-input v-model="editForm.lecturerTitle" placeholder="请输入讲师职称" />
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="editForm.email" placeholder="请输入邮箱" />
        </el-form-item>
        <el-form-item label="电话" prop="phone">
          <el-input v-model="editForm.phone" placeholder="请输入电话" />
        </el-form-item>
        <el-form-item label="性别" prop="gender">
          <el-select v-model="editForm.gender" placeholder="请选择性别">
            <el-option label="男" :value="1" />
            <el-option label="女" :value="2" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="editDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleUpdate" :loading="updating">
            更新
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { Plus } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import request from '../../utils/request'

const loading = ref(false)
const creating = ref(false)
const dialogVisible = ref(false)
const editDialogVisible = ref(false)
const formRef = ref(null)
const editFormRef = ref(null)
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)
const adminList = ref([])
const updating = ref(false)

// 搜索表单
const searchForm = reactive({
  lecturerName: '',
  lecturerTitle: '',
  email: '',
  phone: '',
  status: ''
})

// 创建表单
const form = reactive({
  username: '',
  password: '',
  email: '',
  phone: '',
  gender: undefined
})

// 编辑表单
const editForm = reactive({
  id: undefined,
  username: '',
  password: '',
  lecturerName: '',
  lecturerTitle: '',
  email: '',
  phone: '',
  gender: undefined
})

const rules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 5, max: 20, message: '用户名长度必须在5到20之间', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 20, message: '密码长度必须在6到20之间', trigger: 'blur' }
  ],
  email: [
    { type: 'email', message: '请输入正确的邮箱地址', trigger: 'blur' }
  ],
  phone: [
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号码', trigger: 'blur' }
  ]
}

// 编辑表单校验规则
const editRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 5, max: 20, message: '用户名长度必须在5到20之间', trigger: 'blur' }
  ],
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

// 获取讲师列表
const fetchAdminList = async () => {
  loading.value = true
  try {
    const params = {
      pageNum: currentPage.value,
      pageSize: pageSize.value
    }
    
    // 只添加有值的搜索条件
    if (searchForm.lecturerName) params.lecturerName = searchForm.lecturerName
    if (searchForm.lecturerTitle) params.lecturerTitle = searchForm.lecturerTitle
    if (searchForm.email) params.email = searchForm.email
    if (searchForm.phone) params.phone = searchForm.phone
    if (searchForm.status !== '') params.status = searchForm.status

    const response = await request.get('/admin/superAdmin/adminPage', {
      params: params
    })
    adminList.value = response.data.records
    total.value = response.data.total
  } catch (error) {
    ElMessage.error('获取讲师列表失败')
  } finally {
    loading.value = false
  }
}

// 创建讲师
const handleCreate = async () => {
  if (!formRef.value) return
  
  await formRef.value.validate(async (valid) => {
    if (valid) {
      creating.value = true
      try {
        await request.post('/admin/superAdmin/createAdmin', form)
        ElMessage.success('创建成功')
        dialogVisible.value = false
        fetchAdminList()
        formRef.value.resetFields()
      } catch (error) {
        ElMessage.error(error.response?.data?.message || '创建失败')
      } finally {
        creating.value = false
      }
    }
  })
}

// 更新讲师状态
const handleStatusChange = async (row) => {
  try {
    // 使用 URLSearchParams 来发送表单数据
    const params = new URLSearchParams()
    params.append('adminId', row.id)
    params.append('status', row.status)

    await request.post('/admin/superAdmin/updateAdminStatus', params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    })
    ElMessage.success('状态更新成功')
  } catch (error) {
    ElMessage.error('状态更新失败')
    row.status = row.status === 1 ? 0 : 1 // 恢复原状态
  }
}

// 搜索
const handleSearch = () => {
  currentPage.value = 1
  fetchAdminList()
}

// 重置搜索
const resetSearch = () => {
  searchForm.lecturerName = ''
  searchForm.lecturerTitle = ''
  searchForm.email = ''
  searchForm.phone = ''
  searchForm.status = ''
  currentPage.value = 1
  fetchAdminList()
}

const handleSizeChange = (val) => {
  pageSize.value = val
  fetchAdminList()
}

const handleCurrentChange = (val) => {
  currentPage.value = val
  fetchAdminList()
}

// 打开编辑对话框
const handleEdit = (row) => {
  editForm.id = row.id
  editForm.username = row.username
  editForm.password = '' // 密码不回显
  editForm.lecturerName = row.lecturerName
  editForm.lecturerTitle = row.lecturerTitle
  editForm.email = row.email
  editForm.phone = row.phone
  editForm.gender = row.gender
  editDialogVisible.value = true
}

// 更新讲师信息
const handleUpdate = async () => {
  if (!editFormRef.value) return
  
  await editFormRef.value.validate(async (valid) => {
    if (valid) {
      updating.value = true
      try {
        // 如果密码为空，不传递密码字段
        const updateData = { ...editForm }
        if (!updateData.password) {
          delete updateData.password
        }
        
        await request.post('/admin/superAdmin/updateAdminInfo', updateData)
        ElMessage.success('更新成功')
        editDialogVisible.value = false
        fetchAdminList()
      } catch (error) {
        ElMessage.error(error.response?.data?.message || '更新失败')
      } finally {
        updating.value = false
      }
    }
  })
}

onMounted(() => {
  fetchAdminList()
})
</script>

<style scoped>
.admin-management {
  min-height: 100%;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-header h3 {
  margin: 0;
  font-size: 20px;
  font-weight: 500;
}

.table-card {
  margin-bottom: 20px;
}

.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

:deep(.el-tag) {
  width: 48px;
  text-align: center;
}

.search-form {
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
}

.form-item-group {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  flex: 1;
}

.form-buttons {
  display: flex;
  align-items: flex-start;
  margin-left: 10px;
}

:deep(.el-form-item) {
  margin-bottom: 0;
  margin-right: 0;
}

:deep(.el-input) {
  width: 180px;
}

@media screen and (max-width: 1400px) {
  :deep(.el-input) {
    width: 150px;
  }
}

@media screen and (max-width: 1200px) {
  .form-buttons {
    width: 100%;
    justify-content: flex-end;
    margin-left: 0;
  }
}
</style>