<template>
  <div class="student-management">
    <div class="page-header">
      <h3>学生管理</h3>
    </div>

    <!-- 搜索表单 -->
    <el-card class="search-card" style="margin-bottom: 20px;">
      <el-form :model="searchForm" inline class="search-form">
        <div class="form-item-group">
          <el-form-item label="用户名">
            <el-input v-model="searchForm.username" placeholder="请输入用户名" clearable />
          </el-form-item>
          <el-form-item label="姓名">
            <el-input v-model="searchForm.realName" placeholder="请输入姓名" clearable />
          </el-form-item>
          <el-form-item label="学号">
            <el-input v-model="searchForm.studentId" placeholder="请输入学号" clearable />
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

    <!-- 学生列表 -->
    <el-card class="table-card">
      <el-table :data="studentList" style="width: 100%" v-loading="loading">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="username" label="用户名" width="150" />
        <el-table-column prop="realName" label="姓名" width="120" />
        <el-table-column prop="studentId" label="学号" width="120" />
        <el-table-column prop="email" label="邮箱" width="200" />
        <el-table-column prop="phone" label="电话" width="120" />
        <el-table-column prop="gender" label="性别" width="80">
          <template #default="scope">
            {{ scope.row.gender === 1 ? '男' : scope.row.gender === 2 ? '女' : '未知' }}
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="180" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="scope">
            <el-tag :type="scope.row.status === 1 ? 'success' : 'danger'">
              {{ scope.row.status === 1 ? '正常' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" fixed="right" width="150">
          <template #default="scope">
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
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import request from '../../utils/request'

const loading = ref(false)
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)
const studentList = ref([])

// 搜索表单
const searchForm = reactive({
  username: '',
  realName: '',
  studentId: '',
  email: '',
  phone: '',
  status: ''
})

// 获取学生列表
const fetchStudentList = async () => {
  loading.value = true
  try {
    const params = {
      pageNum: currentPage.value,
      pageSize: pageSize.value
    }
    
    // 只添加有值的搜索条件
    if (searchForm.username) params.username = searchForm.username
    if (searchForm.realName) params.realName = searchForm.realName
    if (searchForm.studentId) params.studentId = searchForm.studentId
    if (searchForm.email) params.email = searchForm.email
    if (searchForm.phone) params.phone = searchForm.phone
    if (searchForm.status !== '') params.status = searchForm.status

    const response = await request.get('/admin/superAdmin/userPage', {
      params: params
    })
    console.log('Response:', response)
    if (response.code === 200) {
      studentList.value = response.data.records
      total.value = response.data.total
    }
  } catch (error) {
    console.error('Error:', error)
    ElMessage.error('获取学生列表失败')
  } finally {
    loading.value = false
  }
}

// 更新学生状态
const handleStatusChange = async (row) => {
  try {
    // 使用 URLSearchParams 来发送表单数据
    const params = new URLSearchParams()
    params.append('userId', row.id)
    params.append('status', row.status)

    await request.post('/admin/superAdmin/updateUserStatus', params, {
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
  fetchStudentList()
}

// 重置搜索
const resetSearch = () => {
  searchForm.username = ''
  searchForm.realName = ''
  searchForm.studentId = ''
  searchForm.email = ''
  searchForm.phone = ''
  searchForm.status = ''
  currentPage.value = 1
  fetchStudentList()
}

const handleSizeChange = (val) => {
  pageSize.value = val
  fetchStudentList()
}

const handleCurrentChange = (val) => {
  currentPage.value = val
  fetchStudentList()
}

onMounted(() => {
  fetchStudentList()
})
</script>

<style scoped>
.student-management {
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

.search-card {
  margin-bottom: 20px;
}

.search-form {
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
}

.form-item-group {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.form-buttons {
  display: flex;
  align-items: flex-start;
}

.table-card {
  margin-bottom: 20px;
}

.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

:deep(.el-tag) {
  width: 48px;
  text-align: center;
}
</style> 