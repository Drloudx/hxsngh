import { createRouter, createWebHashHistory } from 'vue-router'
import RecruitView from '../views/RecruitView.vue'
import TalentView from '../views/TalentView.vue'
import PrefixView from '../views/PrefixView.vue'
import LimeView from '../views/LimeView.vue'



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
  },
{
    path: '/lime',
    name: 'lime',
    component: LimeView,
    meta: { title: '莱姆图鉴', shortName: '莱姆' }
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

// 百度统计：路由切换时上报页面路径
// 区分网页端 vs App（Capacitor 套壳 WebView）
router.afterEach((to) => {
  if (!window._hmt) return;
  // 首页根路径直接跳过，不上报（会被 redirect 到 /recruit）
  if (to.fullPath === '/') return;
  // 用户未授权统计，不上报
  if (window.__baidu_authorized === false) return;

  const isCapApp = window.Capacitor && window.Capacitor.isNativePlatform();
  let reportPath = to.fullPath;
  if (isCapApp) reportPath = '/app' + reportPath;
  _hmt.push(['_trackPageview', reportPath]);
})

export default router
