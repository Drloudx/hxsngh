import { createRouter, createWebHashHistory } from 'vue-router'
import { reactive } from 'vue'

export const routeLoadingState = reactive({
  active: false,
  fullPath: '',
  path: '',
  title: ''
})

const RecruitView = () => import('../views/RecruitView.vue')
const TalentView = () => import('../views/TalentView.vue')
const PrefixView = () => import('../views/PrefixView.vue')
const LimeView = () => import('../views/LimeView.vue')
const TalentManageView = () => import('../views/TalentManageView.vue')
const GuideView = () => import('../views/GuideView.vue')
const SubSkillView = () => import('../views/SubSkillView.vue')
const UniqueView = () => import('../views/UniqueView.vue')
const RoleView = () => import('../views/RoleView.vue')
const RankingView = () => import('../views/RankingView.vue')
const RelicsView = () => import('../views/RelicsView.vue')
const ForetellView = () => import('../views/ForetellView.vue')
const DungeonRelicsView = () => import('../views/DungeonRelicsView.vue')
const EquipView = () => import('../views/EquipView.vue')
const AreaBlockView = () => import('../views/AreaBlockView.vue')
const SynthesisSearchView = () => import('../views/SynthesisSearchView.vue')
const BattleSimView = () => import('../views/BattleSimView.vue')
const GambleShopView = () => import('../views/GambleShopView.vue')
const OtherProbView = () => import('../views/OtherProbView.vue')
const GodStoneView = () => import('../views/GodStoneView.vue')
const RuneView = () => import('../views/RuneView.vue')
const EquipProbView = () => import('../views/EquipProbView.vue')
const FruitRecordView = () => import('../views/FruitRecordView.vue')

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
  { path: '/godstone', name: 'godstone', component: GodStoneView, meta: { title: '神石图鉴', shortName: '神石' } },
  { path: '/rune', name: 'rune', component: RuneView, meta: { title: '符文图鉴', shortName: '符文' } },
  { path: '/equip', name: 'equip', component: EquipView, meta: { title: '装备筛选工具', shortName: '装备' } },
  { path: '/equip-prob', name: 'equip-prob', component: EquipProbView, meta: { title: '金装刷取难易度', shortName: '概率' } },
  { path: '/areablock', name: 'areablock', component: AreaBlockView, meta: { title: '地块图鉴', shortName: '地块' } },
  { path: '/gambleshop', name: 'gambleshop', component: GambleShopView, meta: { title: '商人/宝库概率', shortName: '概率' } },
  { path: '/other-prob', name: 'other-prob', component: OtherProbView, meta: { title: '其他概率', shortName: '其他' } },
  { path: '/talent-manage', name: 'talent-manage', component: TalentManageView, meta: { title: '天赋管理', shortName: '库存' } },
  { path: '/guide', name: 'guide', component: GuideView, meta: { title: '新人攻略', shortName: '攻略' } },
  { path: '/fruit-record', name: 'fruit-record', component: FruitRecordView, meta: { title: '大果记录', shortName: '大果' } },
  { path: '/role', name: 'role', component: RoleView, meta: { title: '角色图鉴', shortName: '角色' } },
  { path: '/battle', name: 'battle', component: BattleSimView, meta: { title: '战斗模拟', shortName: '战斗' } },
  { path: '/ranking', name: 'ranking', component: RankingView, meta: { title: '预告：热度排行', shortName: '预告' } }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

router.beforeEach((to, from) => {
  if (to.fullPath !== from.fullPath) {
    routeLoadingState.active = true
    routeLoadingState.fullPath = to.fullPath
    routeLoadingState.path = to.path
    routeLoadingState.title = to.meta?.title || '页面'
  }
  return true
})

router.afterEach((to) => {
  if (routeLoadingState.fullPath === to.fullPath) {
    routeLoadingState.active = false
  }
})

router.onError((error, to) => {
  if (routeLoadingState.fullPath === to?.fullPath) {
    routeLoadingState.active = false
  }
  console.error('[Router] 页面加载失败:', error)
})

export default router
