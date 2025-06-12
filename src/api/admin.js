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