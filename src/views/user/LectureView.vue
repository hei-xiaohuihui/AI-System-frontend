<template>
  <div class="lecture-view">
    <div class="header-actions">
      <el-button @click="$router.back()" icon="ArrowLeft">返回</el-button>
    </div>

    <!-- Search Form -->
    <el-card class="search-card">
      <el-form :model="currentSearchForm" inline>
        <el-form-item label="标题">
          <el-input 
            v-model="currentSearchForm.title" 
            placeholder="请输入讲座标题" 
            clearable 
          />
        </el-form-item>
        <el-form-item label="主讲人">
          <el-input 
            v-model="currentSearchForm.speakerName" 
            placeholder="请输入主讲人姓名" 
            clearable 
          />
        </el-form-item>
        <el-form-item label="职称">
          <el-input 
            v-model="currentSearchForm.speakerTitle" 
            placeholder="请输入主讲人职称" 
            clearable 
          />
        </el-form-item>
        <el-form-item label="地点">
          <el-input 
            v-model="currentSearchForm.location" 
            placeholder="请输入讲座地点" 
            clearable 
          />
        </el-form-item>
        <el-form-item label="标签">
          <el-input 
            v-model="currentSearchForm.tags" 
            placeholder="请输入标签" 
            clearable 
          />
        </el-form-item>
        <el-form-item label="时间范围">
          <el-date-picker
            v-model="currentTimeRange"
            type="datetimerange"
            range-separator="至"
            start-placeholder="开始时间"
            end-placeholder="结束时间"
            value-format="YYYY-MM-DD HH:mm:ss"
            @change="handleTimeRangeChange"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">搜索</el-button>
          <el-button @click="resetSearch">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- Tabs -->
    <el-tabs v-model="activeTab" @tab-click="handleTabClick">
      <el-tab-pane label="全部讲座" name="all">
        <el-card v-for="lecture in lectures" :key="lecture.id" class="lecture-card">
          <div class="lecture-header">
            <h3>{{ lecture.title }}</h3>
            <el-button 
              type="primary" 
              @click="handleEnroll(lecture.id)"
              :disabled="lecture.enrollCount >= lecture.capacity"
            >
              报名参加
            </el-button>
          </div>
          <div class="lecture-info">
            <p>{{ lecture.description }}</p>
            <el-descriptions :column="3">
              <el-descriptions-item label="主讲人">{{ lecture.speakerName }} ({{ lecture.speakerTitle }})</el-descriptions-item>
              <el-descriptions-item label="时间">{{ formatDateTime(lecture.lectureTime) }}</el-descriptions-item>
              <el-descriptions-item label="地点">{{ lecture.location }}</el-descriptions-item>
              <el-descriptions-item label="标签">{{ lecture.tags }}</el-descriptions-item>
              <el-descriptions-item label="已报名/容量">{{ lecture.enrollCount }}/{{ lecture.capacity }}</el-descriptions-item>
            </el-descriptions>
            <div v-if="lecture.resourceUrl" class="resource-link">
              <el-link :href="lecture.resourceUrl" target="_blank" type="primary">查看讲座资料</el-link>
            </div>
          </div>
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="我的报名" name="enrolled">
        <el-card v-for="lecture in enrolledLectures" :key="lecture.id" class="lecture-card">
          <div class="lecture-header">
            <h3>{{ lecture.title }}</h3>
            <el-button 
              type="danger" 
              @click="handleCancelEnroll(lecture.id)"
            >
              取消报名
            </el-button>
          </div>
          <div class="lecture-info">
            <p>{{ lecture.description }}</p>
            <el-descriptions :column="3">
              <el-descriptions-item label="主讲人">{{ lecture.speakerName }} ({{ lecture.speakerTitle }})</el-descriptions-item>
              <el-descriptions-item label="时间">{{ formatDateTime(lecture.lectureTime) }}</el-descriptions-item>
              <el-descriptions-item label="地点">{{ lecture.location }}</el-descriptions-item>
              <el-descriptions-item label="标签">{{ lecture.tags }}</el-descriptions-item>
              <el-descriptions-item label="已报名/容量">{{ lecture.enrollCount }}/{{ lecture.capacity }}</el-descriptions-item>
              <el-descriptions-item label="报名时间">{{ formatDateTime(lecture.enrollTime) }}</el-descriptions-item>
            </el-descriptions>
            <div v-if="lecture.resourceUrl" class="resource-link">
              <el-link :href="lecture.resourceUrl" target="_blank" type="primary">查看讲座资料</el-link>
            </div>
          </div>
        </el-card>
      </el-tab-pane>
    </el-tabs>

    <!-- Pagination -->
    <div class="pagination">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[5, 10, 20, 50]"
        :total="total"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import axios from 'axios'
import dayjs from 'dayjs'
import { useRouter } from 'vue-router'

const router = useRouter()
const lectures = ref([])
const enrolledLectures = ref([])
const activeTab = ref('all')
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)

// 分别为两个标签页设置时间范围
const allTimeRange = ref([])
const enrolledTimeRange = ref([])

// 分别为两个标签页设置搜索表单
const allSearchForm = ref({
  title: '',
  speakerName: '',
  speakerTitle: '',
  location: '',
  tags: '',
  startTime: '',
  endTime: '',
  pageNum: 1,
  pageSize: 10
})

const enrolledSearchForm = ref({
  title: '',
  speakerName: '',
  speakerTitle: '',
  location: '',
  tags: '',
  startTime: '',
  endTime: '',
  pageNum: 1,
  pageSize: 10
})

// 计算属性：根据当前标签页返回对应的搜索表单
const currentSearchForm = computed(() => {
  return activeTab.value === 'all' ? allSearchForm.value : enrolledSearchForm.value
})

// 计算属性：根据当前标签页返回对应的时间范围
const currentTimeRange = computed({
  get: () => activeTab.value === 'all' ? allTimeRange.value : enrolledTimeRange.value,
  set: (val) => {
    if (activeTab.value === 'all') {
      allTimeRange.value = val
    } else {
      enrolledTimeRange.value = val
    }
  }
})

// Methods
const handleTimeRangeChange = (val) => {
  const currentForm = activeTab.value === 'all' ? allSearchForm : enrolledSearchForm
  if (val) {
    currentForm.value.startTime = val[0]
    currentForm.value.endTime = val[1]
  } else {
    currentForm.value.startTime = ''
    currentForm.value.endTime = ''
  }
}

const formatDateTime = (datetime) => {
  return dayjs(datetime).format('YYYY-MM-DD HH:mm')
}

const fetchLectures = async () => {
  try {
    const response = await axios.get('http://localhost:7816/user/lectures/page', {
      params: {
        ...currentSearchForm.value,
        pageNum: currentPage.value,
        pageSize: pageSize.value
      }
    })
    if (response.data.code === 200) {
      lectures.value = response.data.data.records
      if (activeTab.value === 'all') {
        total.value = response.data.data.total
      }
    }
  } catch (error) {
    ElMessage.error('获取讲座列表失败')
  }
}

const fetchEnrolledLectures = async () => {
  try {
    const response = await axios.get('http://localhost:7816/user/lectures/getEnroll', {
      params: {
        ...currentSearchForm.value,
        pageNum: currentPage.value,
        pageSize: pageSize.value
      }
    })
    if (response.data.code === 200) {
      enrolledLectures.value = response.data.data.records
      if (activeTab.value === 'enrolled') {
        total.value = response.data.data.total
      }
    }
  } catch (error) {
    ElMessage.error('获取已报名讲座失败')
  }
}

const handleSearch = () => {
  currentPage.value = 1
  if (activeTab.value === 'all') {
    fetchLectures()
  } else {
    fetchEnrolledLectures()
  }
}

const resetSearch = () => {
  if (activeTab.value === 'all') {
    allSearchForm.value = {
      title: '',
      speakerName: '',
      speakerTitle: '',
      location: '',
      tags: '',
      startTime: '',
      endTime: '',
      pageNum: 1,
      pageSize: 10
    }
    allTimeRange.value = []
  } else {
    enrolledSearchForm.value = {
      title: '',
      speakerName: '',
      speakerTitle: '',
      location: '',
      tags: '',
      startTime: '',
      endTime: '',
      pageNum: 1,
      pageSize: 10
    }
    enrolledTimeRange.value = []
  }
  handleSearch()
}

const handleEnroll = async (lectureId) => {
  try {
    const response = await axios.post('http://localhost:7816/user/lectures/enroll', null, {
      params: { lectureId }
    })
    if (response.data.code === 200) {
      ElMessage.success('报名成功')
      await Promise.all([
        fetchLectures(),
        fetchEnrolledLectures()
      ])
    }
  } catch (error) {
    ElMessage.error('报名失败')
  }
}

const handleCancelEnroll = async (lectureId) => {
  try {
    const response = await axios.delete('http://localhost:7816/user/lectures/cancel', {
      params: { lectureId }
    })
    if (response.data.code === 200) {
      ElMessage.success('取消报名成功')
      await Promise.all([
        fetchLectures(),
        fetchEnrolledLectures()
      ])
    }
  } catch (error) {
    ElMessage.error('取消报名失败')
  }
}

const handleSizeChange = (val) => {
  pageSize.value = val
  if (activeTab.value === 'all') {
    fetchLectures()
  } else {
    fetchEnrolledLectures()
  }
}

const handleCurrentChange = (val) => {
  currentPage.value = val
  if (activeTab.value === 'all') {
    fetchLectures()
  } else {
    fetchEnrolledLectures()
  }
}

const handleTabClick = () => {
  currentPage.value = 1
  if (activeTab.value === 'all') {
    fetchLectures()
  } else {
    fetchEnrolledLectures()
  }
}

// Lifecycle
onMounted(() => {
  // 初始化时加载两个列表的数据
  Promise.all([
    fetchLectures(),
    fetchEnrolledLectures()
  ])
})
</script>

<style scoped>
.lecture-view {
  padding: 20px;
}

.header-actions {
  margin-bottom: 20px;
  display: flex;
  justify-content: flex-start;
}

.search-card {
  margin-bottom: 20px;
}

.lecture-card {
  margin-bottom: 20px;
}

.lecture-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 15px;
}

.lecture-title {
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 10px;
}

.lecture-info {
  margin-bottom: 15px;
}

.lecture-info-item {
  margin-bottom: 8px;
}

.lecture-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}

.resource-link {
  margin-top: 10px;
}
</style> 