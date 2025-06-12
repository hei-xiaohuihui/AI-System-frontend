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

// 讲师分页查询讲座
export function getLectureList(params) {
  return request({
    url: '/admin/lecturer/lectures/page',
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