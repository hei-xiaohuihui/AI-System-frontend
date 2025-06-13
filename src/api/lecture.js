import request from '@/utils/request'

// 讲师创建讲座
export function createLecture(data) {
  return request({
    url: '/admin/lecturer/lectures/create',
    method: 'post',
    data
  })
}

// 讲师更新讲座
export function updateLecture(data) {
  // 确保 id 是数字类型
  const updateData = {
    ...data,
    id: Number(data.id),
    capacity: Number(data.capacity)
  }
  
  return request({
    url: '/admin/lecturer/lectures/update',
    method: 'put',
    data: updateData
  })
}

// 讲师/超级管理员分页查询讲座
export function getLectureList(params) {
  // 动态选择接口
  let url = '/admin/lecturer/lectures/page'
  try {
    const adminInfo = localStorage.getItem('adminInfo')
    if (adminInfo) {
      const { adminRole } = JSON.parse(adminInfo)
      if (adminRole === 'SUPER_ADMIN') {
        url = '/admin/superAdmin/lectures/page'
      }
    }
  } catch (e) {}
  return request({
    url,
    method: 'get',
    params
  })
}

// 讲师删除讲座
export function deleteLecture(id) {
  return request({
    url: '/admin/lecturer/lectures/delete',
    method: 'delete',
    params: { id: Number(id) }
  })
}

// 超级管理员审核讲座
export function checkLecture(id, status) {
  return request({
    url: '/admin/superAdmin/lectures/check',
    method: 'put',
    params: { id, status }
  })
}

// 讲师端重新提交讲座审核
export function recreateLecture(data) {
  return request({
    url: '/admin/lecturer/lectures/recreate',
    method: 'post',
    data
  })
} 