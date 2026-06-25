import { createRouter, createWebHashHistory } from 'vue-router'
import RecruitView from '../views/RecruitView.vue'
import TalentView from '../views/TalentView.vue'
import PrefixView from '../views/PrefixView.vue'
import LimeView from '../views/LimeView.vue'
import TalentManageView from '../views/TalentManageView.vue'
import GuideView from '../views/GuideView.vue'
import SubSkillView from '../views/SubSkillView.vue'
import RoleView from '../views/RoleView.vue'
import RankingView from '../views/RankingView.vue'

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
  },
  {
    path: '/talent-manage',
    name: 'talent-manage',
    component: TalentManageView,
    meta: { title: '天赋管理', shortName: '库存' }
  },
  {
    path: '/guide',
    name: 'guide',
    component: GuideView,
    meta: { title: '新人攻略', shortName: '攻略' }
  },
  {
    path: '/subskill',
    name: 'subskill',
    component: SubSkillView,
    meta: { title: '预告：支援筛选', shortName: '预告' }
  },
  {
    path: '/role',
    name: 'role',
    component: RoleView,
    meta: { title: '预告：角色图鉴', shortName: '预告' }
  },
  {
    path: '/ranking',
    name: 'ranking',
    component: RankingView,
    meta: { title: '预告：热度排行', shortName: '预告' }
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

// 百度统计：路由切换时上报，网页端正常上报，App 端路径加 /app 前缀
router.afterEach((to) => {
  if (!window._hmt) return;
  if (to.fullPath === '/') return;
  if (window.__baidu_authorized === false) return;

  const isApp = (window.Capacitor && window.Capacitor.isNativePlatform()) ||
                document.documentElement.getAttribute("data-app-shell") === "true" ||
                window.location.href.includes('files/www/') ||
                window.location.href.includes('/data/')
  let reportPath = to.fullPath;
  if (isApp) reportPath = '/app' + reportPath;
  _hmt.push(['_trackPageview', reportPath]);

})

export default router
