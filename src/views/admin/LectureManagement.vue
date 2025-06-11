<template>
  <div class="lecture-management">
    <div class="page-header">
      <h3>讲座管理</h3>
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item>
          <el-input
            v-model="searchForm.keyword"
            placeholder="搜索讲座"
            clearable
            @keyup.enter="handleSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item>
          <el-select v-model="searchForm.status" placeholder="讲座状态" clearable>
            <el-option label="待审核" value="PENDING" />
            <el-option label="已通过" value="APPROVED" />
            <el-option label="已拒绝" value="REJECTED" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">搜索</el-button>
          <el-button @click="resetSearch">重置</el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 讲座列表 -->
    <el-card class="table-card">
      <el-table :data="lectureList" style="width: 100%" v-loading="loading">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="title" label="讲座标题" min-width="200" show-overflow-tooltip />
        <el-table-column prop="lecturer" label="讲师" width="120" />
        <el-table-column prop="startTime" label="开始时间" width="180" />
        <el-table-column prop="duration" label="时长" width="100">
          <template #default="scope">
            {{ scope.row.duration }}分钟
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="scope">
            <el-tag :type="getStatusType(scope.row.status)">
              {{ getStatusText(scope.row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" fixed="right" width="200">
          <template #default="scope">
            <el-button-group v-if="scope.row.status === 'PENDING'">
              <el-button
                type="success"
                :icon="Check"
                @click="handleCheck(scope.row, 'APPROVED')"
                size="small"
              >
                通过
              </el-button>
              <el-button
                type="danger"
                :icon="Close"
                @click="handleCheck(scope.row, 'REJECTED')"
                size="small"
              >
                拒绝
              </el-button>
            </el-button-group>
            <el-button
              v-else
              type="primary"
              :icon="View"
              @click="handleView(scope.row)"
              size="small"
            >
              查看
            </el-button>
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

    <!-- 讲座详情对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="currentLecture?.title"
      width="600px"
    >
      <div class="lecture-detail" v-if="currentLecture">
        <div class="detail-item">
          <label>讲师：</label>
          <span>{{ currentLecture.lecturer }}</span>
        </div>
        <div class="detail-item">
          <label>开始时间：</label>
          <span>{{ currentLecture.startTime }}</span>
        </div>
        <div class="detail-item">
          <label>时长：</label>
          <span>{{ currentLecture.duration }}分钟</span>
        </div>
        <div class="detail-item">
          <label>状态：</label>
          <el-tag :type="getStatusType(currentLecture.status)">
            {{ getStatusText(currentLecture.status) }}
          </el-tag>
        </div>
        <div class="detail-item">
          <label>简介：</label>
          <p class="lecture-description">{{ currentLecture.description }}</p>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { Search, Check, Close, View } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import axios from 'axios'

const loading = ref(false)
const dialogVisible = ref(false)
const currentLecture = ref(null)
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)
const lectureList = ref([])

const searchForm = reactive({
  keyword: '',
  status: ''
})

// 获取讲座列表
const fetchLectureList = async () => {
  loading.value = true
  try {
    const response = await axios.get('/admin/superAdmin/lectures/page', {
      params: {
        page: currentPage.value,
        pageSize: pageSize.value,
        keyword: searchForm.keyword,
        status: searchForm.status
      }
    })
    if (response.data.code === 200) {
      lectureList.value = response.data.data.records
      total.value = response.data.data.total
    }
  } catch (error) {
    ElMessage.error('获取讲座列表失败')
  } finally {
    loading.value = false
  }
}

// 审核讲座
const handleCheck = async (lecture, status) => {
  try {
    const action = status === 'APPROVED' ? '通过' : '拒绝'
    await ElMessageBox.confirm(
      `确定要${action}该讲座吗？`,
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: status === 'APPROVED' ? 'success' : 'warning'
      }
    )
    
    await axios.put('/admin/superAdmin/lectures/check', null, {
      params: {
        id: lecture.id,
        status
      }
    })
    ElMessage.success(`${action}成功`)
    fetchLectureList()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('操作失败')
    }
  }
}

// 查看讲座详情
const handleView = (lecture) => {
  currentLecture.value = lecture
  dialogVisible.value = true
}

// 搜索
const handleSearch = () => {
  currentPage.value = 1
  fetchLectureList()
}

// 重置搜索
const resetSearch = () => {
  searchForm.keyword = ''
  searchForm.status = ''
  handleSearch()
}

const handleSizeChange = (val) => {
  pageSize.value = val
  fetchLectureList()
}

const handleCurrentChange = (val) => {
  currentPage.value = val
  fetchLectureList()
}

// 状态相关工具函数
const getStatusType = (status) => {
  const map = {
    'PENDING': 'warning',
    'APPROVED': 'success',
    'REJECTED': 'danger'
  }
  return map[status] || 'info'
}

const getStatusText = (status) => {
  const map = {
    'PENDING': '待审核',
    'APPROVED': '已通过',
    'REJECTED': '已拒绝'
  }
  return map[status] || '未知'
}

onMounted(() => {
  fetchLectureList()
})
</script>

<style scoped>
.lecture-management {
  min-height: 100%;
}

.page-header {
  margin-bottom: 20px;
}

.page-header h3 {
  margin: 0 0 20px 0;
  font-size: 20px;
  font-weight: 500;
}

.search-form {
  display: flex;
  align-items: center;
  gap: 10px;
}

.table-card {
  margin-bottom: 20px;
}

.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.lecture-detail {
  padding: 10px;
}

.detail-item {
  margin-bottom: 15px;
}

.detail-item label {
  font-weight: 500;
  margin-right: 10px;
  color: #606266;
}

.lecture-description {
  margin: 10px 0;
  white-space: pre-wrap;
  color: #606266;
  line-height: 1.6;
}

:deep(.el-tag) {
  min-width: 60px;
  text-align: center;
}
</style>