import { createRouter, createWebHashHistory } from 'vue-router'
import RecruitView from '../views/RecruitView.vue'
import TalentView from '../views/TalentView.vue'

const routes = [
  {
    path: '/',
    redirect: '/recruit'
  },
  {
    path: '/recruit',
    name: 'recruit',
    component: RecruitView,
    meta: { title: '指定招募工具', shortName: '招募' }
  },
  {
    path: '/talent',
    name: 'talent',
    component: TalentView,
    meta: { title: '天赋筛选工具', shortName: '天赋' }
  },
  {
    path: '/support',
    name: 'support',
    component: () => import('../views/RecruitView.vue'), // Placeholder
    beforeEnter: (to, from, next) => {
      alert('当前功能正在建设中')
      next(false)
    }
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
