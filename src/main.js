import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import './assets/common.css' // 全局公共样式

const app = createApp(App)
app.use(router)
app.mount('#app')

// 首屏渲染完成后，利用空闲时间静默预加载其他所有页面 chunk
// 这样切换页面时不会有任何延迟
const prefetchViews = [
  () => import('./views/SynthesisSearchView.vue'),
  () => import('./views/TalentView.vue'),
  () => import('./views/EquipView.vue'),
  () => import('./views/RoleView.vue'),
  () => import('./views/SubSkillView.vue'),
  () => import('./views/UniqueView.vue'),
  () => import('./views/LimeView.vue'),
  () => import('./views/PrefixView.vue'),
  () => import('./views/TalentManageView.vue'),
  () => import('./views/DungeonRelicsView.vue'),
  () => import('./views/ForetellView.vue'),
  () => import('./views/AreaBlockView.vue'),
  () => import('./views/GuideView.vue'),
  () => import('./views/RankingView.vue'),
  () => import('./views/BattleSimView.vue'),
]

const prefetchAll = (views, index = 0) => {
  if (index >= views.length) return
  // 使用 requestIdleCallback 在浏览器空闲时加载，不阻塞用户交互
  const idle = window.requestIdleCallback || ((cb) => setTimeout(cb, 200))
  idle(() => {
    views[index]().then(() => prefetchAll(views, index + 1))
  })
}

// 延迟 2 秒后开始预加载，确保首屏已完全渲染完毕
setTimeout(() => prefetchAll(prefetchViews), 2000)
