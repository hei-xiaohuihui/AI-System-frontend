<template>
  <div class="knowledge-management">
    <el-card class="box-card">
      <template #header>
        <div class="card-header">
          <h3>知识库管理</h3>
        </div>
      </template>

      <!-- Search and Add Button Section -->
      <div class="operation-bar">
        <el-space wrap>
          <el-input
            v-model="searchParams.title"
            placeholder="请输入文档标题"
            style="width: 200px"
            @keyup.enter="handleSearch"
            clearable
          >
            <template #prefix>
              <el-icon><Document /></el-icon>
            </template>
          </el-input>
          <el-input
            v-model="searchParams.description"
            placeholder="请输入文档描述"
            style="width: 200px"
            @keyup.enter="handleSearch"
            clearable
          >
            <template #prefix>
              <el-icon><InfoFilled /></el-icon>
            </template>
          </el-input>
          <el-button type="primary" @click="handleSearch">
            <el-icon><Search /></el-icon> 搜索
          </el-button>
          <el-button @click="resetSearch">
            <el-icon><RefreshRight /></el-icon> 重置
          </el-button>
          <el-button type="primary" @click="showCreateModal">
            <el-icon><Plus /></el-icon> 新增知识文档
          </el-button>
        </el-space>
      </div>

      <!-- Table Section -->
      <el-table
        :data="tableData"
        v-loading="loading"
        style="width: 100%"
      >
        <el-table-column prop="title" label="文档标题" />
        <el-table-column prop="description" label="文档描述" show-overflow-tooltip />
        <el-table-column label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDateTime(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="更新时间" width="180">
          <template #default="{ row }">
            {{ formatDateTime(row.updatedAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180">
          <template #default="{ row }">
            <el-space>
              <el-button link type="primary" @click="handleView(row)">查看</el-button>
              <el-button link type="primary" @click="handleEdit(row)">编辑</el-button>
              <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
            </el-space>
          </template>
        </el-table-column>
      </el-table>

      <!-- Pagination -->
      <div class="pagination-container">
        <el-pagination
          v-model:current-page="searchParams.pageNum"
          v-model:page-size="searchParams.pageSize"
          :page-sizes="[10, 20, 50]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>

      <!-- Create/Edit Modal -->
      <el-dialog
        v-model="modalVisible"
        :title="modalTitle"
        width="500px"
      >
        <el-form
          ref="formRef"
          :model="form"
          :rules="rules"
          label-width="100px"
        >
          <el-form-item label="文档标题" prop="title">
            <el-input v-model="form.title" placeholder="请输入文档标题" />
          </el-form-item>
          <el-form-item label="文档描述" prop="description">
            <el-input
              v-model="form.description"
              type="textarea"
              :rows="4"
              placeholder="请输入文档描述"
            />
          </el-form-item>
          <el-form-item label="文档文件" prop="resourceUrl">
            <el-upload
              class="upload-demo"
              :http-request="handleCustomUpload"
              :before-upload="beforeUpload"
              :limit="1"
              :file-list="fileList"
            >
              <el-button type="primary">
                <el-icon><Upload /></el-icon> 上传文件
              </el-button>
            </el-upload>
          </el-form-item>
        </el-form>
        <template #footer>
          <span class="dialog-footer">
            <el-button @click="handleModalCancel">取消</el-button>
            <el-button type="primary" :loading="modalLoading" @click="handleModalSubmit">
              确定
            </el-button>
          </span>
        </template>
      </el-dialog>

      <!-- View Modal -->
      <el-dialog
        v-model="viewModalVisible"
        title="文档详情"
        width="500px"
      >
        <el-descriptions :column="1" border>
          <el-descriptions-item label="文档标题">{{ viewData.title }}</el-descriptions-item>
          <el-descriptions-item label="文档描述">{{ viewData.description }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ formatDateTime(viewData.createdAt) }}</el-descriptions-item>
          <el-descriptions-item label="更新时间">{{ formatDateTime(viewData.updatedAt) }}</el-descriptions-item>
          <el-descriptions-item label="文档链接">
            <el-link :href="viewData.resourceUrl" target="_blank" type="primary">查看文档</el-link>
          </el-descriptions-item>
        </el-descriptions>
      </el-dialog>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Search, Upload, Document, InfoFilled, RefreshRight } from '@element-plus/icons-vue'
import { createKnowledgeDoc, updateKnowledgeDoc, deleteKnowledgeDoc, getKnowledgeDocDetail, pageKnowledgeDocs, uploadFile } from '@/api/admin'

// Data
const loading = ref(false)
const tableData = ref([])
const searchParams = reactive({
  title: '',
  description: '',
  pageNum: 1,
  pageSize: 10,
})
const pagination = reactive({
  total: 0
})

// Modal related
const modalVisible = ref(false)
const modalTitle = ref('')
const modalLoading = ref(false)
const formRef = ref(null)
const form = ref({
  id: undefined,
  title: '',
  description: '',
  resourceUrl: '', // 仅用于编辑时显示已有文件
  ragDocId: ''
})
const fileList = ref([])
const viewModalVisible = ref(false)
const viewData = ref({})

// Form rules
const rules = {
  title: [
    { required: true, message: '请输入文档标题', trigger: 'blur' },
    { min: 2, max: 100, message: '长度在 2 到 100 个字符', trigger: 'blur' }
  ],
  description: [
    { required: true, message: '请输入文档描述', trigger: 'blur' },
    { min: 10, max: 500, message: '长度在 10 到 500 个字符', trigger: 'blur' }
  ]
}

// Methods
const fetchData = async () => {
  loading.value = true
  try {
    const res = await pageKnowledgeDocs({
      pageNum: searchParams.pageNum,
      pageSize: searchParams.pageSize,
      title: searchParams.title,
      description: searchParams.description
    })
    tableData.value = res.data.records
    pagination.total = res.data.total
  } catch (error) {
    ElMessage.error('获取数据失败')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  searchParams.pageNum = 1
  fetchData()
}

const handleSizeChange = (val) => {
  searchParams.pageSize = val
  fetchData()
}

const handleCurrentChange = (val) => {
  searchParams.pageNum = val
  fetchData()
}

const resetForm = () => {
  form.value.id = undefined
  form.value.title = ''
  form.value.description = ''
  form.value.resourceUrl = ''
  fileList.value = []
  if (formRef.value) {
    formRef.value.resetFields()
  }
}

const showCreateModal = () => {
  modalTitle.value = '新增知识文档'
  resetForm()
  modalVisible.value = true
}

const handleView = async (record) => {
  try {
    const res = await getKnowledgeDocDetail(record.id)
    viewData.value = res.data
    viewModalVisible.value = true
  } catch (error) {
    ElMessage.error('获取详情失败')
  }
}

const handleEdit = async (record) => {
  try {
    const res = await getKnowledgeDocDetail(record.id)
    Object.assign(form.value, res.data)
    if (form.value.resourceUrl) {
      fileList.value = [
        {
          name: '当前文档',
          url: form.value.resourceUrl,
        },
      ]
    }
    modalTitle.value = '编辑知识文档'
    modalVisible.value = true
  } catch (error) {
    ElMessage.error('获取详情失败')
  }
}

const handleDelete = async (record) => {
  try {
    await ElMessageBox.confirm(
      '确定要删除这条知识文档吗？删除后不可恢复。',
      '删除确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )
    await deleteKnowledgeDoc(record.id, record.resourceUrl)
    ElMessage.success('删除成功')
    fetchData()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

const beforeUpload = (file) => {
  // Add file type and size validation if needed
  return true
}

const handleCustomUpload = async ({ file }) => {
  try {
    // 直接存储文件对象，不再单独上传
    fileList.value = [{
      name: file.name,
      raw: file // 保存原始文件对象
    }]
    ElMessage.success('文件已选择')
  } catch (error) {
    ElMessage.error('文件处理失败')
  }
}

const handleModalSubmit = async () => {
  if (!formRef.value) return
  
  await formRef.value.validate(async (valid) => {
    if (valid) {
      modalLoading.value = true
      try {
        if (form.value.id) {
          const updateData = {
            id: Number(form.value.id),
            title: form.value.title,
            description: form.value.description,
            resourceUrl: form.value.resourceUrl,
            ragDocId: form.value.ragDocId
          }
          await updateKnowledgeDoc(updateData)
          ElMessage.success('更新成功')
        } else {
          // 检查是否有文件
          if (!fileList.value.length || !fileList.value[0].raw) {
            ElMessage.error('请上传文档文件')
            return
          }
          
          const createData = {
            title: form.value.title,
            description: form.value.description
          }
          
          await createKnowledgeDoc(createData, fileList.value[0].raw)
          ElMessage.success('创建成功')
          // 创建成功后清除草稿
          localStorage.removeItem('knowledge_draft')
        }
        modalVisible.value = false
        fetchData()
      } catch (error) {
        console.error('提交失败:', error)
        ElMessage.error(form.value.id ? '更新失败' : '创建失败')
      } finally {
        modalLoading.value = false
      }
    }
  })
}

const handleModalCancel = () => {
  modalVisible.value = false
  resetForm()
}

// 格式化日期时间
const formatDateTime = (dateTimeStr) => {
  if (!dateTimeStr) return ''
  const date = new Date(dateTimeStr)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}`
}

const resetSearch = () => {
  searchParams.title = ''
  searchParams.description = ''
  searchParams.pageNum = 1
  fetchData()
}

onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.knowledge-management {
  padding: 24px;
}

.operation-bar {
  margin-bottom: 16px;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header h3 {
  margin: 0;
}
</style> 