# 创建仪表盘概览页面
<template>
  <div class="overview">
    <el-row :gutter="20">
      <!-- 数据概览卡片 -->
      <el-col :span="8">
        <el-card class="overview-card">
          <template #header>
            <div class="card-header">
              <span>总管理员数</span>
              <el-icon class="icon"><User /></el-icon>
            </div>
          </template>
          <div class="card-content">
            <h2>{{ statistics.adminCount || 0 }}</h2>
            <p>活跃管理员: {{ statistics.activeAdminCount || 0 }}</p>
          </div>
        </el-card>
      </el-col>
      
      <el-col :span="8">
        <el-card class="overview-card">
          <template #header>
            <div class="card-header">
              <span>总讲座数</span>
              <el-icon class="icon"><Calendar /></el-icon>
            </div>
          </template>
          <div class="card-content">
            <h2>{{ statistics.lectureCount || 0 }}</h2>
            <p>待审核: {{ statistics.pendingLectureCount || 0 }}</p>
          </div>
        </el-card>
      </el-col>
      
      <el-col :span="8">
        <el-card class="overview-card">
          <template #header>
            <div class="card-header">
              <span>今日数据</span>
              <el-icon class="icon"><DataLine /></el-icon>
            </div>
          </template>
          <div class="card-content">
            <h2>{{ statistics.todayLectureCount || 0 }}</h2>
            <p>新增讲座数</p>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 待处理事项 -->
    <el-card class="pending-tasks" style="margin-top: 20px;">
      <template #header>
        <div class="card-header">
          <span>待处理事项</span>
          <el-button type="primary" link @click="refreshTasks">
            <el-icon><Refresh /></el-icon>
            刷新
          </el-button>
        </div>
      </template>
      
      <el-tabs v-model="activeTab">
        <el-tab-pane label="待审核讲座" name="lectures">
          <el-table :data="pendingLectures" style="width: 100%" v-loading="loading">
            <el-table-column prop="id" label="ID" width="80" />
            <el-table-column prop="title" label="讲座标题" min-width="200" show-overflow-tooltip />
            <el-table-column prop="lecturer" label="讲师" width="120" />
            <el-table-column prop="createTime" label="提交时间" width="180" />
            <el-table-column fixed="right" label="操作" width="120">
              <template #default="scope">
                <el-button type="primary" link @click="goToLecture(scope.row)">
                  去审核
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- 系统信息 -->
    <el-card class="system-info" style="margin-top: 20px;">
      <template #header>
        <div class="card-header">
          <span>系统信息</span>
        </div>
      </template>
      
      <el-descriptions :column="3" border>
        <el-descriptions-item label="系统版本">v1.0.0</el-descriptions-item>
        <el-descriptions-item label="服务器状态">
          <el-tag type="success">运行中</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="最后更新">{{ currentTime }}</el-descriptions-item>
      </el-descriptions>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { User, Calendar, DataLine, Refresh } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import axios from 'axios'

const router = useRouter()
const loading = ref(false)
const activeTab = ref('lectures')
const currentTime = ref(new Date().toLocaleString())

// 统计数据
const statistics = reactive({
  adminCount: 0,
  activeAdminCount: 0,
  lectureCount: 0,
  pendingLectureCount: 0,
  todayLectureCount: 0
})

// 待审核讲座列表
const pendingLectures = ref([])

// 获取统计数据
const fetchStatistics = async () => {
  try {
    // 这里需要后端提供相应的统计接口
    // const response = await axios.get('/admin/superAdmin/statistics')
    // if (response.data.code === 200) {
    //   Object.assign(statistics, response.data.data)
    // }
  } catch (error) {
    ElMessage.error('获取统计数据失败')
  }
}

// 获取待审核讲座
const fetchPendingLectures = async () => {
  loading.value = true
  try {
    const response = await axios.get('/admin/superAdmin/lectures/page', {
      params: {
        page: 1,
        pageSize: 5,
        status: 'PENDING'
      }
    })
    if (response.data.code === 200) {
      pendingLectures.value = response.data.data.records
    }
  } catch (error) {
    ElMessage.error('获取待审核讲座失败')
  } finally {
    loading.value = false
  }
}

// 刷新待处理事项
const refreshTasks = () => {
  fetchPendingLectures()
  currentTime.value = new Date().toLocaleString()
}

// 跳转到讲座管理页面
const goToLecture = (lecture) => {
  router.push({
    name: 'lectureManagement',
    query: { id: lecture.id }
  })
}

onMounted(() => {
  fetchStatistics()
  fetchPendingLectures()
})
</script>

<style scoped>
.overview {
  min-height: 100%;
  padding: 20px;
}

.overview-card {
  height: 100%;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header .icon {
  font-size: 20px;
  color: #909399;
}

.card-content {
  text-align: center;
  padding: 20px 0;
}

.card-content h2 {
  font-size: 28px;
  color: #303133;
  margin: 0 0 10px 0;
}

.card-content p {
  color: #909399;
  margin: 0;
}

:deep(.el-card__header) {
  padding: 15px 20px;
  font-weight: 500;
}

.system-info :deep(.el-descriptions__label) {
  width: 120px;
}

:deep(.el-tag) {
  min-width: 60px;
  text-align: center;
}
</style> 