import { createRouter, createWebHashHistory } from 'vue-router'
import RecruitView from '../views/RecruitView.vue'
import TalentView from '../views/TalentView.vue'
import PrefixView from '../views/PrefixView.vue'
import LimeView from '../views/LimeView.vue'
import TalentManageView from '../views/TalentManageView.vue'
import GuideView from '../views/GuideView.vue'
import SubSkillView from '../views/SubSkillView.vue'
import UniqueView from '../views/UniqueView.vue'
import RoleView from '../views/RoleView.vue'
import RankingView from '../views/RankingView.vue'
import RelicsView from '../views/RelicsView.vue'
import ForetellView from '../views/ForetellView.vue'
import DungeonRelicsView from '../views/DungeonRelicsView.vue'
import EquipView from '../views/EquipView.vue'
import AreaBlockView from '../views/AreaBlockView.vue'
import SynthesisSearchView from '../views/SynthesisSearchView.vue'
import BattleSimView from '../views/BattleSimView.vue'

const routes = [
  { path: '/', redirect: '/recruit' },
  { path: '/recruit', name: 'recruit', component: RecruitView, meta: { title: '指定招募工具', shortName: '招募' } },
  { path: '/search', name: 'search', component: SynthesisSearchView, meta: { title: '综合检索', shortName: '综合' } },
  { path: '/talent', name: 'talent', component: TalentView, meta: { title: '天赋筛选工具', shortName: '天赋' } },
  { path: '/subskill', name: 'subskill', component: SubSkillView, meta: { title: '支援筛选工具', shortName: '支援' } },
  { path: '/unique', name: 'unique', component: UniqueView, meta: { title: '技能筛选工具', shortName: '技能' } },
  { path: '/lime', name: 'lime', component: LimeView, meta: { title: '莱姆图鉴', shortName: '莱姆' } },
  { path: '/prefix', name: 'prefix', component: PrefixView, meta: { title: '怪物加护', shortName: '加护' } },
  { path: '/relics', name: 'relics', component: RelicsView, meta: { title: '心得图鉴', shortName: '心得' } },
  { path: '/foretell', name: 'foretell', component: ForetellView, meta: { title: '预言图鉴', shortName: '预言' } },
  { path: '/dungeon-relics', name: 'dungeon-relics', component: DungeonRelicsView, meta: { title: '星界秘境遗物图鉴', shortName: '遗物' } },
  { path: '/equip', name: 'equip', component: EquipView, meta: { title: '装备筛选工具', shortName: '装备' } },
  { path: '/areablock', name: 'areablock', component: AreaBlockView, meta: { title: '地块图鉴', shortName: '地块' } },
  { path: '/talent-manage', name: 'talent-manage', component: TalentManageView, meta: { title: '天赋管理', shortName: '库存' } },
  { path: '/guide', name: 'guide', component: GuideView, meta: { title: '新人攻略', shortName: '攻略' } },
  { path: '/role', name: 'role', component: RoleView, meta: { title: '角色图鉴', shortName: '角色' } },
  { path: '/relics', name: 'relics', component: RelicsView, meta: { title: '心得图鉴', shortName: '心得' } },
  { path: '/battle', name: 'battle', component: BattleSimView, meta: { title: '战斗模拟', shortName: '战斗' } },
  { path: '/ranking', name: 'ranking', component: RankingView, meta: { title: '预告：热度排行', shortName: '预告' } }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

// 百度统计：App 端路径加 /app 前缀，网页端正常上报
const isNativeApp = () => {
  if (window.Capacitor?.isNativePlatform?.()) return true
  if (document.documentElement.dataset.appShell === 'true') return true
  return window.location.hostname === 'hxsngh.app'
}
const BAIDU_SID = 'ba00a207e4ac743eb824ad1d9f44ae76'

const sendTrack = (to) => {
  if (window.__baidu_authorized === false) {
    console.log('[Baidu] 用户未授权，跳过:', to.fullPath)
    return
  }
  let p = to.fullPath
  if (isNativeApp()) p = '/app' + to.fullPath

  // 方案A：标准 SDK 埋点（部分 WebView 环境下 SDK 内部不发 GIF，保留作为兼容）
  if (window._hmt) window._hmt.push(['_trackPageview', p])

  // 方案B：手动 GIF 兜底（绕过 SDK 内部 WebView 环境检测，直接经 Java 代理发出）
  const pageUrl = 'https://hxsngh.app/#/' + p.replace(/^\//, '')
  const gifUrl = 'https://hm.baidu.com/hm.gif?si=' + BAIDU_SID +
    '&su=' + encodeURIComponent(pageUrl) +
    '&et=0&nv=0&st=1&v=v1.2.1&rnd=' + Date.now()
  new Image().src = gifUrl

  console.log('[Baidu] 上报路径:', p)
}
// firstRun 仅首次执行上报，后续重试只检测 hm.js 就绪，不重复推入 PV
const waitAndTrack = (to, remaining = 10, firstRun = true) => {
  if (firstRun) sendTrack(to)
  if (window._hmt && window._hmt.push !== Array.prototype.push) return
  if (remaining > 0) setTimeout(() => waitAndTrack(to, remaining - 1, false), 500)
}
router.afterEach((to) => {
  waitAndTrack(to, 10, true)
})

// 冷启动首页上报：路由就绪后主动上报当前页
router.isReady().then(() => {
  waitAndTrack(router.currentRoute.value, 10, true)
})

export default router
