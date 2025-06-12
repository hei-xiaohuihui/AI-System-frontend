<template>
  <div class="lecture-management">
    <div class="page-header">
      <h3>讲座管理</h3>
    </div>

    <!-- 搜索表单 -->
    <el-card class="search-card" style="margin-bottom: 20px;">
      <el-form :model="searchForm" inline class="search-form">
        <div class="form-item-group">
          <el-form-item label="讲座标题">
            <el-input v-model="searchForm.title" placeholder="请输入讲座标题" clearable />
          </el-form-item>
          <el-form-item label="讲师姓名">
            <el-input v-model="searchForm.speakerName" placeholder="请输入讲师姓名" clearable />
          </el-form-item>
          <el-form-item label="讲师职称">
            <el-input v-model="searchForm.speakerTitle" placeholder="请输入讲师职称" clearable />
          </el-form-item>
          <el-form-item label="地点">
            <el-input v-model="searchForm.location" placeholder="请输入地点" clearable />
          </el-form-item>
          <el-form-item label="标签">
            <el-input v-model="searchForm.tags" placeholder="请输入标签" clearable />
          </el-form-item>
          <el-form-item label="时间范围">
            <el-date-picker
              v-model="timeRange"
              type="datetimerange"
              range-separator="至"
              start-placeholder="开始时间"
              end-placeholder="结束时间"
              value-format="YYYY-MM-DD HH:mm:ss"
              :default-time="[
                new Date(2000, 1, 1, 0, 0, 0),
                new Date(2000, 1, 1, 23, 59, 59),
              ]"
            />
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="searchForm.status" placeholder="请选择状态" clearable style="width: 120px;">
              <el-option label="待审核" value="PENDING" />
              <el-option label="已通过" value="APPROVED" />
              <el-option label="已拒绝" value="REJECTED" />
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

    <!-- 讲座列表 -->
    <el-card class="table-card">
      <el-table :data="lectureList" style="width: 100%" v-loading="loading">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="title" label="讲座标题" min-width="150" show-overflow-tooltip />
        <el-table-column prop="speakerName" label="讲师" width="100" />
        <el-table-column prop="speakerTitle" label="职称" width="100" />
        <el-table-column prop="location" label="地点" width="200" show-overflow-tooltip />
        <el-table-column prop="lectureTime" label="讲座时间" width="180">
          <template #default="scope">
            {{ new Date(scope.row.lectureTime).toLocaleString() }}
          </template>
        </el-table-column>
        <el-table-column prop="capacity" label="容量" width="80" />
        <el-table-column prop="enrollCount" label="已报名" width="80" />
        <el-table-column prop="tags" label="标签" width="150" show-overflow-tooltip />
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
          <span>{{ currentLecture.speakerName }}</span>
        </div>
        <div class="detail-item">
          <label>职称：</label>
          <span>{{ currentLecture.speakerTitle }}</span>
        </div>
        <div class="detail-item">
          <label>地点：</label>
          <span>{{ currentLecture.location }}</span>
        </div>
        <div class="detail-item">
          <label>讲座时间：</label>
          <span>{{ new Date(currentLecture.lectureTime).toLocaleString() }}</span>
        </div>
        <div class="detail-item">
          <label>容量：</label>
          <span>{{ currentLecture.capacity }}人</span>
        </div>
        <div class="detail-item">
          <label>已报名：</label>
          <span>{{ currentLecture.enrollCount }}人</span>
        </div>
        <div class="detail-item">
          <label>标签：</label>
          <span>{{ currentLecture.tags }}</span>
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
        <div class="detail-item">
          <label>创建时间：</label>
          <span>{{ new Date(currentLecture.createdAt).toLocaleString() }}</span>
        </div>
        <div class="detail-item">
          <label>更新时间：</label>
          <span>{{ new Date(currentLecture.updatedAt).toLocaleString() }}</span>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, watch } from 'vue'
import { Search, Check, Close, View } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '../../utils/request'

const loading = ref(false)
const dialogVisible = ref(false)
const currentLecture = ref(null)
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)
const lectureList = ref([])
const timeRange = ref([])

const searchForm = reactive({
  title: '',
  speakerName: '',
  speakerTitle: '',
  location: '',
  tags: '',
  status: ''
})

// 获取讲座列表
const fetchLectureList = async () => {
  loading.value = true
  try {
    const params = {
      pageNum: currentPage.value,
      pageSize: pageSize.value,
      ...searchForm
    }
    
    // 添加时间范围
    if (timeRange.value?.length === 2) {
      params.startTime = timeRange.value[0]
      params.endTime = timeRange.value[1]
    }

    const response = await request.get('/admin/superAdmin/lectures/page', {
      params: params
    })
    console.log('Response:', response)
    if (response.code === 200) {
      lectureList.value = response.data.records
      total.value = response.data.total
    }
  } catch (error) {
    console.error('Error:', error)
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
    
    const response = await request.put('/admin/superAdmin/lectures/check', null, {
      params: {
        id: lecture.id,
        status
      }
    })
    if (response.code === 200) {
      ElMessage.success(`${action}成功`)
      fetchLectureList()
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Error:', error)
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
  Object.keys(searchForm).forEach(key => {
    searchForm[key] = ''
  })
  timeRange.value = []
  currentPage.value = 1
  fetchLectureList()
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