import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '../stores/user'
import AdminLogin from '../views/AdminLogin.vue'
import Dashboard from '../views/admin/Dashboard.vue'
import AdminManagement from '../views/admin/AdminManagement.vue'
import LectureManagement from '../views/admin/LectureManagement.vue'
import StudentManagement from '../views/admin/StudentManagement.vue'

// 用户路由
const userRoutes = [
  {
    path: '/',
    redirect: '/login'
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/LoginView.vue')
  },
  {
    path: '/chat',
    name: 'chat',
    component: () => import('@/views/ChatView.vue'),
    meta: { requiresAuth: true }
  }
]

// 管理员路由
const adminRoutes = [
  {
    path: '/admin/login',
    name: 'adminLogin',
    component: AdminLogin
  },
  {
    path: '/admin',
    component: Dashboard,
    meta: { requiresAdminAuth: true },
    children: [
      {
        path: 'dashboard',
        name: 'adminDashboard',
        component: () => import('../views/admin/Overview.vue')
      },
      {
        path: 'admins',
        name: 'adminManagement',
        component: AdminManagement
      },
      {
        path: 'students',
        name: 'studentManagement',
        component: StudentManagement
      },
      {
        path: 'lectures',
        name: 'lectureManagement',
        component: LectureManagement
      },
      {
        path: 'profile',
        name: 'profile',
        component: () => import('../views/admin/Profile.vue')
      },
      {
        path: 'knowledge-management',
        name: 'KnowledgeManagement',
        component: () => import('@/views/admin/KnowledgeManagement.vue'),
        meta: { title: '知识库管理', icon: 'BookOutlined', roles: ['SUPER_ADMIN'] }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [...userRoutes, ...adminRoutes]
})

// 管理员路由守卫
const isAdminRoute = (path) => path.startsWith('/admin')
const isAdminLoggedIn = () => !!localStorage.getItem('adminToken')
export const getAdminRole = () => {
  const adminInfo = localStorage.getItem('adminInfo')
  if (adminInfo) {
    try {
      const { adminRole } = JSON.parse(adminInfo)
      return adminRole
    } catch (e) {
      return null
    }
  }
  return null
}

router.beforeEach((to, from, next) => {
  // 处理管理员路由
  if (isAdminRoute(to.path)) {
    // 如果是管理员登录页，直接通过
    if (to.path === '/admin/login') {
      // 如果已经登录，直接跳转到仪表盘
      if (isAdminLoggedIn()) {
        next('/admin/dashboard')
        return
      }
      next()
      return
    }
    
    // 如果是其他管理员页面，检查管理员是否登录
    if (!isAdminLoggedIn()) {
      next('/admin/login')
      return
    }

    // 检查角色权限
    const adminRole = getAdminRole()
    if (adminRole === 'LECTURER') {
      // 讲师只能访问讲座管理页面和个人信息页面
      if (to.path !== '/admin/lectures' && to.path !== '/admin/dashboard' && to.path !== '/admin/profile') {
        next('/admin/lectures')
        return
      }
    } else if (adminRole !== 'SUPER_ADMIN' && to.meta.roles && to.meta.roles.includes('SUPER_ADMIN')) {
      // 非超级管理员不能访问超级管理员专属页面
      next('/admin/dashboard')
      return
    }
    
    next()
    return
  }

  // 处理用户路由
  const userStore = useUserStore()
  
  if (to.meta.requiresAuth && !userStore.isAuthenticated) {
    next('/login')
  } else if (to.path === '/login' && userStore.isAuthenticated) {
    next('/chat')
  } else {
    next()
  }
})

export default router 