import request from '@/utils/request'

// 获取管理员详情信息
export function getAdminDetail() {
  return request({
    url: '/admin/auth/detail',
    method: 'get'
  })
}

// 更新管理员信息
export function updateAdminInfo(data) {
  return request({
    url: '/admin/auth/update',
    method: 'post',
    data
  })
}

// Knowledge Document Management APIs
export function createKnowledgeDoc(data, file) {
  const formData = new FormData()
  formData.append('dto', new Blob([JSON.stringify(data)], { type: 'application/json' }))
  formData.append('file', file)
  
  return request({
    url: '/admin/superAdmin/knowledgeDoc/create',
    method: 'post',
    headers: {
      'Content-Type': 'multipart/form-data'
    },
    data: formData
  })
}

export function updateKnowledgeDoc(data) {
  return request({
    url: '/admin/superAdmin/knowledgeDoc/update',
    method: 'put',
    data
  })
}

export function deleteKnowledgeDoc(id, resourceUrl) {
  return request({
    url: '/admin/superAdmin/knowledgeDoc/delete',
    method: 'delete',
    params: {
      id,
      resourceUrl
    }
  })
}

export function getKnowledgeDocDetail(id) {
  return request({
    url: '/admin/superAdmin/knowledgeDoc/detail',
    method: 'get',
    params: { id }
  })
}

export function pageKnowledgeDocs(params) {
  return request({
    url: '/admin/superAdmin/knowledgeDoc/page',
    method: 'get',
    params
  })
}

export function uploadFile(data) {
  return request({
    url: '/admin/auth/uploadFile',
    method: 'post',
    headers: {
      'Content-Type': 'multipart/form-data'
    },
    data
  })
} 