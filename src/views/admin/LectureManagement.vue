<template>
  <div class="lecture-container">
    <div class="page-header">
      <h2>讲座管理</h2>
      <el-button-group v-if="getAdminRole() !== 'SUPER_ADMIN'">
        <el-button type="primary" @click="handleAdd">创建讲座</el-button>
      </el-button-group>
    </div>

    <!-- 搜索表单 -->
    <el-card class="search-card">
      <el-form :inline="true" :model="searchForm" class="search-form">
        <div class="form-item-group">
          <el-form-item label="讲座标题">
            <el-input v-model="searchForm.title" placeholder="讲座标题" clearable @keyup.enter="getList" />
          </el-form-item>
          <el-form-item label="讲座地点">
            <el-input v-model="searchForm.location" placeholder="讲座地点" clearable @keyup.enter="getList" />
          </el-form-item>
          <el-form-item label="讲座标签">
            <el-input v-model="searchForm.tags" placeholder="讲座标签" clearable @keyup.enter="getList" />
          </el-form-item>
          <el-form-item label="讲座时间">
            <el-date-picker
              v-model="timeRange"
              type="datetimerange"
              range-separator="至"
              start-placeholder="开始时间"
              end-placeholder="结束时间"
              value-format="YYYY-MM-DD HH:mm:ss"
              :default-time="[new Date(2000, 1, 1, 0, 0, 0), new Date(2000, 1, 1, 23, 59, 59)]"
            />
          </el-form-item>
          <!-- 超级管理员特有字段 -->
          <el-form-item v-if="getAdminRole() === 'SUPER_ADMIN'" label="讲师姓名">
            <el-input v-model="searchForm.speakerName" placeholder="讲师姓名" clearable @keyup.enter="getList" />
          </el-form-item>
          <el-form-item v-if="getAdminRole() === 'SUPER_ADMIN'" label="讲师职称">
            <el-input v-model="searchForm.speakerTitle" placeholder="讲师职称" clearable @keyup.enter="getList" />
          </el-form-item>
          <el-form-item v-if="getAdminRole() === 'SUPER_ADMIN'" label="讲座状态">
            <el-select v-model="searchForm.status" placeholder="讲座状态" clearable @change="getList">
              <el-option label="待审核" value="PENDING" />
              <el-option label="已通过" value="APPROVED" />
              <el-option label="已拒绝" value="REJECTED" />
            </el-select>
          </el-form-item>
        </div>
        <div class="form-buttons">
          <el-form-item>
            <el-button type="primary" @click="getList">搜索</el-button>
            <el-button @click="resetSearch">重置</el-button>
          </el-form-item>
        </div>
      </el-form>
    </el-card>

    <!-- 讲座列表 -->
    <el-table
      v-loading="loading"
      :data="lectureList"
      style="width: 100%"
      border
      class="table-content"
    >
      <el-table-column prop="title" label="讲座标题" min-width="150" />
      <el-table-column prop="description" label="讲座描述" min-width="200">
        <template #default="{ row }">
          <el-tooltip
            :content="row.description"
            placement="top"
            :hide-after="0"
          >
            <span class="description-text">{{ row.description }}</span>
          </el-tooltip>
        </template>
      </el-table-column>
      <el-table-column v-if="getAdminRole() === 'SUPER_ADMIN'" prop="speakerName" label="讲师姓名" min-width="120" />
      <el-table-column v-if="getAdminRole() === 'SUPER_ADMIN'" prop="speakerTitle" label="讲师职称" min-width="120" />
      <el-table-column prop="location" label="地点" min-width="180" />
      <el-table-column prop="tags" label="标签" min-width="150">
        <template #default="{ row }">
          <el-tooltip
            :content="row.tags"
            placement="top"
            :hide-after="0"
          >
            <span class="tags-text">{{ row.tags }}</span>
          </el-tooltip>
        </template>
      </el-table-column>
      <el-table-column prop="lectureTime" label="讲座时间" width="180">
        <template #default="{ row }">
          {{ formatDateTime(row.lectureTime) }}
        </template>
      </el-table-column>
      <el-table-column label="人数" width="120">
        <template #default="{ row }">
          {{ row.enrollCount }}/{{ row.capacity }}
        </template>
      </el-table-column>
      <el-table-column prop="resourceUrl" label="讲座资料" width="120">
        <template #default="{ row }">
          <el-link
            v-if="row.resourceUrl"
            type="primary"
            :href="row.resourceUrl"
            target="_blank"
          >
            查看资料
          </el-link>
          <span v-else>暂无资料</span>
        </template>
      </el-table-column>
      <el-table-column prop="status" label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="getStatusType(row.status)">
            {{ getStatusText(row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="150" fixed="right">
        <template #default="{ row }">
          <el-button-group v-if="getAdminRole() === 'SUPER_ADMIN'">
            <el-button
              size="small"
              :type="row.status === 'APPROVED' ? 'success' : 'default'"
              :disabled="row.status === 'APPROVED' || row.status === 'REJECTED'"
              @click="handleCheck(row, 'APPROVED')"
            >通过</el-button>
            <el-button
              size="small"
              :type="row.status === 'REJECTED' ? 'danger' : 'default'"
              :disabled="row.status === 'APPROVED' || row.status === 'REJECTED'"
              @click="handleCheck(row, 'REJECTED')"
            >拒绝</el-button>
          </el-button-group>
          <el-button-group v-else>
            <el-button type="primary" @click="handleEdit(row)" :disabled="row.status === 'REJECTED' || row.status === 'APPROVED'">编辑</el-button>
            <el-button type="danger" @click="handleDelete(row)" :disabled="row.status === 'REJECTED' || row.status === 'APPROVED'">删除</el-button>
            <el-button v-if="row.status === 'REJECTED'" type="warning" @click="handleRecreate(row)">再次提交</el-button>
          </el-button-group>
        </template>
      </el-table-column>
    </el-table>
    
    <!-- 分页 -->
    <div class="pagination-container">
        <el-pagination
        v-model:current-page="queryParams.pageNum"
        v-model:page-size="queryParams.pageSize"
          :total="total"
        :page-sizes="[10, 20, 30, 50]"
        layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>

    <!-- 创建/编辑讲座对话框 -->
    <el-dialog
      :title="dialogTitle"
      v-model="dialogVisible"
      width="600px"
      @close="handleDialogClose"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="100px"
      >
        <el-form-item label="讲座标题" prop="title">
          <el-input v-model="form.title" placeholder="请输入讲座标题" />
        </el-form-item>
        <el-form-item label="讲座描述" prop="description">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="4"
            placeholder="请输入讲座描述"
          />
        </el-form-item>
        <el-form-item label="讲座地点" prop="location">
          <el-input v-model="form.location" placeholder="请输入讲座地点" />
        </el-form-item>
        <el-form-item label="标签" prop="tags">
          <el-input v-model="form.tags" placeholder="请输入标签，用逗号分隔" />
        </el-form-item>
        <el-form-item label="开始时间" prop="lectureTime">
          <el-date-picker
            v-model="form.lectureTime"
            type="datetime"
            placeholder="选择开始时间"
            value-format="YYYY-MM-DDTHH:mm:ss"
            :disabled-date="disabledDate"
            :disabled-time="disabledTime"
          />
        </el-form-item>
        <el-form-item label="容量" prop="capacity">
          <el-input-number
            v-model="form.capacity"
            :min="1"
            :max="1000"
            placeholder="请输入讲座容量"
          />
        </el-form-item>
        <el-form-item label="讲座资料" prop="resourceUrl">
          <el-upload
            class="upload-demo"
            :http-request="handleCustomUpload"
            :before-upload="beforeUpload"
            :limit="1"
            :file-list="fileList"
            :on-remove="handleRemoveFile"
          >
            <el-button type="primary">
              <el-icon><Upload /></el-icon> 上传文件
            </el-button>
            <template #tip>
              <div class="el-upload__tip">
                只能上传 PDF 或 Word 文件
              </div>
            </template>
          </el-upload>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">
          确定
        </el-button>
      </template>
    </el-dialog>

    <!-- 再次提交对话框 -->
    <el-dialog
      title="再次提交讲座审核"
      v-model="recreateDialogVisible"
      width="600px"
      @close="() => { recreateForm.value = {}; currentRecreateId.value = null }"
    >
      <el-form
        ref="recreateFormRef"
        :model="recreateForm"
        label-width="100px"
      >
        <el-form-item label="讲座标题" prop="title">
          <el-input v-model="recreateForm.title" placeholder="请输入讲座标题" />
        </el-form-item>
        <el-form-item label="讲座描述" prop="description">
          <el-input v-model="recreateForm.description" type="textarea" :rows="4" placeholder="请输入讲座描述" />
        </el-form-item>
        <el-form-item label="讲座时间" prop="lectureTime">
          <el-date-picker v-model="recreateForm.lectureTime" type="datetime" placeholder="选择开始时间" value-format="YYYY-MM-DDTHH:mm:ss" />
        </el-form-item>
        <el-form-item label="地点" prop="location">
          <el-input v-model="recreateForm.location" placeholder="请输入讲座地点" />
        </el-form-item>
        <el-form-item label="容量" prop="capacity">
          <el-input-number v-model="recreateForm.capacity" :min="1" :max="1000" placeholder="请输入讲座容量" />
        </el-form-item>
        <el-form-item label="标签" prop="tags">
          <el-input v-model="recreateForm.tags" placeholder="请输入标签" />
        </el-form-item>
        <el-form-item label="讲座资料" prop="resourceUrl">
          <el-upload
            class="upload-demo"
            :http-request="handleRecreateUpload"
            :before-upload="beforeUpload"
            :limit="1"
            :file-list="recreateFileList"
            :on-remove="handleRecreateRemoveFile"
          >
            <el-button type="primary">
              <el-icon><Upload /></el-icon> 上传文件
            </el-button>
            <template #tip>
              <div class="el-upload__tip">
                只能上传 PDF 或 Word 文件
              </div>
            </template>
          </el-upload>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="recreateDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleRecreateSubmit">提交</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { createLecture, updateLecture, getLectureList, deleteLecture, checkLecture, recreateLecture } from '@/api/lecture'
import { uploadFile } from '@/api/admin'
import { formatDateTime } from '@/utils/format'
import { getAdminRole } from '@/router'
import { Upload } from '@element-plus/icons-vue'

// 查询参数
const queryParams = ref({
  pageNum: 1,
  pageSize: 10
})

// 搜索表单
const searchForm = reactive({
  title: '',
  location: '',
  tags: '',
  speakerName: '',
  speakerTitle: '',
  status: ''
})
const timeRange = ref([])

// 数据列表
const lectureList = ref([])
const total = ref(0)
const loading = ref(false)

// 表单相关
const dialogVisible = ref(false)
const dialogTitle = ref('')
const submitting = ref(false)
const formRef = ref(null)
const form = ref({
  id: undefined,
  title: '',
  description: '',
  location: '',
  tags: '',
  lectureTime: '',
  capacity: 100,
  resourceUrl: '',
  ragDocId: ''
})

// 新增：再次提交相关
const recreateDialogVisible = ref(false)
const recreateFormRef = ref(null)
const recreateForm = ref({})
const currentRecreateId = ref(null)
const recreateFileList = ref([])

// 表单校验规则
const rules = {
  title: [
    { required: true, message: '请输入讲座标题', trigger: 'blur' },
    { min: 2, max: 100, message: '长度在 2 到 100 个字符', trigger: 'blur' }
  ],
  description: [
    { required: true, message: '请输入讲座描述', trigger: 'blur' },
    { min: 10, max: 500, message: '长度在 10 到 500 个字符', trigger: 'blur' }
  ],
  location: [
    { required: true, message: '请输入讲座地点', trigger: 'blur' }
  ],
  tags: [
    { required: true, message: '请输入标签', trigger: 'blur' }
  ],
  lectureTime: [
    { required: true, message: '请选择开始时间', trigger: 'change' }
  ],
  capacity: [
    { required: true, message: '请输入讲座容量', trigger: 'change' },
    { type: 'number', min: 1, max: 1000, message: '容量范围在 1 到 1000 之间', trigger: 'change' }
  ],
  resourceUrl: [
    { required: true, message: '请上传讲座资料', trigger: 'change' }
  ]
}

// 监听表单变化，自动保存到 localStorage
watch(
  () => ({ ...form.value }),
  (newVal) => {
    if (dialogVisible.value && !form.value.id) {  // 只在创建模式下保存
      localStorage.setItem('lecture_draft', JSON.stringify(newVal))
    }
  },
  { deep: true }
)

// 获取讲座列表
const getList = async () => {
  loading.value = true
  try {
    // 构建查询参数
    const params = {
      ...queryParams.value,
      ...searchForm
    }
    
    // 添加时间范围
    if (timeRange.value?.length === 2) {
      params.startTime = timeRange.value[0]
      params.endTime = timeRange.value[1]
    }

    const { data } = await getLectureList(params)
    const adminRole = getAdminRole()
    if (adminRole === 'SUPER_ADMIN') {
      // 超级管理员端：后端返回的讲座信息字段（例如 speakerName、speakerTitle）直接使用，无需额外映射
      lectureList.value = data.records
    } else {
      // 讲师端：不做额外处理，直接赋值
      lectureList.value = data.records
    }
    total.value = data.total
  } catch (error) {
    ElMessage.error('获取讲座列表失败')
  } finally {
    loading.value = false
  }
}

// 搜索
const handleSearch = () => {
  queryParams.value.pageNum = 1
  getList()
}

// 重置搜索
const resetSearch = () => {
  searchForm.title = ''
  searchForm.location = ''
  searchForm.tags = ''
  searchForm.speakerName = ''
  searchForm.speakerTitle = ''
  searchForm.status = ''
  timeRange.value = null
  getList()
}

// 处理分页变化
const handleSizeChange = (val) => {
  queryParams.value.pageSize = val
  getList()
}

const handleCurrentChange = (val) => {
  queryParams.value.pageNum = val
  getList()
}

// 添加讲座
const handleAdd = () => {
  dialogTitle.value = '创建讲座'
  dialogVisible.value = true
  
  // 尝试从 localStorage 恢复草稿
  const draft = localStorage.getItem('lecture_draft')
  if (draft) {
    const draftData = JSON.parse(draft)
    form.value = {
      ...draftData,
      id: undefined  // 确保是创建模式
    }
  } else {
    form.value = {
      id: undefined,
      title: '',
      description: '',
      location: '',
      tags: '',
      lectureTime: '',
      capacity: 100,
      resourceUrl: '',
      ragDocId: ''
    }
  }
}

// 编辑讲座
const handleEdit = (row) => {
  dialogTitle.value = '编辑讲座'
  dialogVisible.value = true
  form.value = {
    ...row,
    id: Number(row.id),
    lectureTime: row.lectureTime
  }
  if (row.resourceUrl) {
    fileList.value = [{
      name: '当前文件',
      url: row.resourceUrl
    }]
  } else {
    fileList.value = []
  }
}

// 删除讲座
const handleDelete = (row) => {
  ElMessageBox.confirm(
    '确定要删除这个讲座吗？',
    '警告',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(async () => {
    try {
      await deleteLecture(row.id, row.resourceUrl || '')
      ElMessage.success('删除成功')
      getList()
    } catch (error) {
      ElMessage.error('删除失败')
    }
  })
}

// 处理对话框关闭
const handleDialogClose = () => {
  dialogVisible.value = false
  fileList.value = []
  form.value = {
    id: undefined,
    title: '',
    description: '',
    location: '',
    tags: '',
    lectureTime: '',
    capacity: 100,
    resourceUrl: '',
    ragDocId: ''
  }
}

// 提交表单
const handleSubmit = async () => {
  if (!formRef.value) return
  
  await formRef.value.validate(async (valid) => {
    if (valid) {
      submitting.value = true
      try {
        if (form.value.id) {
          const updateData = {
            id: Number(form.value.id),
            title: form.value.title,
            description: form.value.description,
            location: form.value.location,
            tags: form.value.tags,
            lectureTime: form.value.lectureTime,
            capacity: Number(form.value.capacity),
            resourceUrl: form.value.resourceUrl,
            ragDocId: form.value.ragDocId
          }
          await updateLecture(updateData)
          ElMessage.success('更新成功')
        } else {
          const createData = {
            title: form.value.title,
            description: form.value.description,
            location: form.value.location,
            tags: form.value.tags,
            lectureTime: form.value.lectureTime,
            capacity: Number(form.value.capacity),
            resourceUrl: form.value.resourceUrl,
            ragDocId: form.value.ragDocId
          }
          await createLecture(createData)
          ElMessage.success('创建成功')
          // 创建成功后清除草稿
          localStorage.removeItem('lecture_draft')
        }
        dialogVisible.value = false
        getList()
      } catch (error) {
        console.error('提交失败:', error)
        ElMessage.error(form.value.id ? '更新失败' : '创建失败')
      } finally {
        submitting.value = false
      }
    }
  })
}

// 禁用过去的日期
const disabledDate = (time) => {
  return time.getTime() < Date.now() - 8.64e7 // 禁用今天之前的日期
}

// 禁用过去的时间
const disabledTime = (date) => {
  if (!date) return
  const now = new Date()
  const isToday = new Date(date).toDateString() === now.toDateString()
  
  if (isToday) {
    const hours = now.getHours()
    const minutes = now.getMinutes()
    return {
      disabledHours: () => Array.from({ length: hours }, (_, i) => i),
      disabledMinutes: (hour) => hour === hours ? Array.from({ length: minutes }, (_, i) => i) : []
    }
  }
  return {}
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

// 审核讲座（超级管理员）
const handleCheck = async (row, status) => {
  if (row.status === status) return
  try {
    await checkLecture(row.id, status)
    ElMessage.success('操作成功')
    getList()
  } catch (e) {
    ElMessage.error('操作失败')
  }
}

// 新增：再次提交相关
const handleRecreate = (row) => {
  recreateDialogVisible.value = true
  currentRecreateId.value = row.id
  // 预填充表单
  recreateForm.value = {
    id: row.id,
    title: row.title,
    description: row.description,
    lectureTime: row.lectureTime,
    location: row.location,
    capacity: row.capacity,
    tags: row.tags,
    resourceUrl: row.resourceUrl || ''
  }
  // 如果有原文件，显示在文件列表中
  if (row.resourceUrl) {
    recreateFileList.value = [{
      name: '当前文件',
      url: row.resourceUrl
    }]
  } else {
    recreateFileList.value = []
  }
}

const handleRecreateSubmit = async () => {
  if (!recreateFormRef.value) return
  await recreateFormRef.value.validate(async (valid) => {
    if (valid) {
      try {
        await recreateLecture(recreateForm.value)
        ElMessage.success('已重新提交审核')
        recreateDialogVisible.value = false
        // 清空文件列表
        recreateFileList.value = []
        getList()
      } catch (e) {
        ElMessage.error('提交失败')
      }
    }
  })
}

// 新增：文件上传相关
const fileList = ref([])
const handleCustomUpload = async (event) => {
  const file = event.file
  try {
    const formData = new FormData()
    formData.append('file', file)
    const { data } = await uploadFile(formData)
    form.value.resourceUrl = data
    fileList.value = [{
      name: file.name,
      url: data
    }]
    ElMessage.success('上传成功')
  } catch (error) {
    ElMessage.error('上传失败')
  }
}

const beforeUpload = (file) => {
  const allowedExtensions = ['.pdf', '.doc', '.docx']
  const extension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase()
  if (!allowedExtensions.includes(extension)) {
    ElMessage.error('只能上传 PDF 或 Word 文件')
    return false
  }
  return true
}

const handleRemoveFile = (file) => {
  form.value.resourceUrl = ''
  form.value.ragDocId = ''
  fileList.value = []
  ElMessage.success('文件移除成功')
}

// 新增：再次提交文件处理函数
const handleRecreateUpload = async (event) => {
  const file = event.file
  try {
    const formData = new FormData()
    formData.append('file', file)
    const { data } = await uploadFile(formData)
    recreateForm.value.resourceUrl = data
    recreateFileList.value = [{
      name: file.name,
      url: data
    }]
    ElMessage.success('上传成功')
  } catch (error) {
    ElMessage.error('上传失败')
  }
}

const handleRecreateRemoveFile = () => {
  recreateForm.value.resourceUrl = ''
  recreateFileList.value = []
  ElMessage.success('文件移除成功')
}

onMounted(() => {
  getList()
})
</script>

<style scoped>
.lecture-container {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0;
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

.table-content {
  margin-top: 20px;
}

.description-text,
.tags-text {
  display: inline-block;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

:deep(.el-tag) {
  min-width: 60px;
  text-align: center;
}
</style>