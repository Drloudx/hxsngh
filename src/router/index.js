import { createRouter, createWebHashHistory } from 'vue-router'
import RecruitView from '../views/RecruitView.vue'
import TalentView from '../views/TalentView.vue'
import PrefixView from '../views/PrefixView.vue'

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
    path: '/prefix',
    name: 'prefix',
    component: PrefixView,
    meta: { title: '怪物前缀', shortName: '前缀' }
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

// 百度统计：路由切换时上报页面路径
router.afterEach((to) => {
  if (window._hmt) {
    window._hmt.push(['_trackPageview', to.fullPath])
  }
})

export default router
