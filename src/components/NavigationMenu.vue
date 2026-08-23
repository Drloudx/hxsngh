<script setup>
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  },
  menuMode: {
    type: String, // 'top' | 'bottom' | 'side'
    required: true
  },
  isDesktop: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close'])

const router = useRouter()
const route = useRoute()

// 14个工具和图鉴的定义
const categories = [
  {
    name: '核心工具',
    items: [
      { id: 'recruit', name: '指定招募工具', path: '/recruit', icon: '/General/1.png' },
      { id: 'search', name: '综合检索', path: '/search', icon: '/General/2.png' },
      { id: 'talent', name: '天赋筛选工具', path: '/talent', icon: '/General/3.png' },
      { id: 'subskill', name: '支援筛选工具', path: '/subskill', icon: '/General/4.png' },
      { id: 'unique', name: '技能筛选工具', path: '/unique', icon: '/General/5.png' },
      { id: 'equip', name: '装备筛选工具', path: '/equip', icon: '/General/6.png' },
      { id: 'fruit-record', name: '大果记录', path: '/fruit-record', icon: '/General/21.png' }
    ]
  },
  {
    name: '图鉴',
    items: [
      { id: 'role', name: '角色图鉴', path: '/role', icon: '/General/7.png' },
      { id: 'lime', name: '莱姆图鉴', path: '/lime', icon: '/General/8.png' },
      { id: 'prefix', name: '怪物加护', path: '/prefix', icon: '/General/9.png' },
      { id: 'areablock', name: '地块图鉴', path: '/areablock', icon: '/General/10.png' },
      { id: 'foretell', name: '预言图鉴', path: '/foretell', icon: '/General/11.png' },
      { id: 'equip-prob', name: '金装刷取难易度', path: '/equip-prob', icon: '/General/20.png' },
      { id: 'gambleshop', name: '商人/宝库概率', path: '/gambleshop', icon: '/General/16.png' },
      { id: 'other-prob', name: '其他概率', path: '/other-prob', icon: '/General/17.png' },
      { id: 'relics', name: '心得图鉴', path: '/relics', icon: '/General/15.png' },
      { id: 'godstone', name: '神石图鉴', path: '/godstone', icon: '/General/18.png' },
      { id: 'rune', name: '符文图鉴', path: '/rune', icon: '/General/19.png' },
      { id: 'dungeon-relics', name: '星界秘境遗物图鉴', path: '/dungeon-relics', icon: '/General/12.png' }
    ]
  },
  {
    name: '其他工具',
    items: [
      { id: 'talent-manage', name: '天赋管理', path: '/talent-manage', icon: '/General/13.png' },
      { id: 'guide', name: '新人攻略', path: '/guide', icon: '/General/14.png' }
    ]
  }
]

// 桌面端使用扁平列表，复刻参考项目的简洁侧边栏
const desktopNavList = categories.flatMap(cat => cat.items)

const currentPath = computed(() => route.path)

const isItemActive = (item) => {
  return currentPath.value === item.path || currentPath.value.startsWith(item.path + '/')
}

const handleNavigate = (path) => {
  router.push(path)
  emit('close')
}

const handleClose = () => {
  emit('close')
}

// 格式化九宫格导航文本换行
const formatGridItemName = (name) => {
  if (!name) return ''
  // 1. 商人/宝库概率 -> 从“概率”开始换行（忽略前面的 /）
  if (name === '商人/宝库概率') {
    return '商人/宝库<br/>概率'
  }
  // 2. 以“工具”结尾的4字以上名称，将“工具”置于第二行
  if (name.endsWith('工具') && name.length > 4) {
    return `${name.slice(0, -2)}<br/>工具`
  }
  // 3. 其他超过4个字的文本，4个字处换行
  if (name.length > 4) {
    return `${name.slice(0, 4)}<br/>${name.slice(4)}`
  }
  return name
}
</script>

<template>
  <div class="navigation-wrapper">
    <!-- 1. 侧边栏模式 -->
    <template v-if="menuMode === 'side'">
      <div v-if="isOpen && !isDesktop" class="nav-mask" @click="handleClose"></div>
      <Transition :name="isDesktop ? '' : 'slide-side'">
        <div v-if="isOpen || isDesktop" class="side-panel" :class="{ 'desktop-panel': isDesktop }">
          <div v-if="!isDesktop" class="side-header">
            <div class="side-header-title">
              <h2>功能导航</h2>
              <span class="side-header-sub">请选择要切换的工具</span>
            </div>
            <button class="close-btn" @click="handleClose">✕</button>
          </div>
          <div class="side-body">
            <!-- 桌面端：扁平列表，复刻参考项目 -->
            <template v-if="isDesktop">
              <div class="side-category-title">核心功能</div>
              <div
                v-for="item in desktopNavList"
                :key="item.path"
                class="side-item"
                :class="{ active: isItemActive(item) }"
                @click="handleNavigate(item.path)"
              >
                <img :src="item.icon" class="icon-img" />
                <span class="item-name">{{ item.name }}</span>
                <span class="arrow">›</span>
              </div>
            </template>
            <!-- 移动端：保留原有分类 -->
            <template v-else>
              <div v-for="cat in categories" :key="cat.name" class="side-section">
                <div class="side-category-title">{{ cat.name }}</div>
                <div class="side-items-list">
                  <div
                    v-for="item in cat.items"
                    :key="item.id"
                    class="side-item"
                    :class="{ active: isItemActive(item) }"
                    @click="handleNavigate(item.path)"
                  >
                    <img :src="item.icon" class="icon-img" />
                    <span class="item-name">{{ item.name }}</span>
                    <span class="arrow">›</span>
                  </div>
                </div>
              </div>
            </template>
          </div>
        </div>
      </Transition>
    </template>

    <!-- 2. 底部抽屉模式 -->
    <template v-else-if="menuMode === 'bottom'">
      <Transition name="fade">
        <div v-if="isOpen" class="nav-mask" @click="handleClose"></div>
      </Transition>
      <Transition name="slide-bottom">
        <div v-if="isOpen" class="bottom-sheet">
          <div class="sheet-handle" @click="handleClose"></div>
          <div class="sheet-header">
            <h3>功能导航</h3>
            <button class="close-btn" @click="handleClose">✕</button>
          </div>
          <div class="sheet-content">
            <div v-for="cat in categories" :key="cat.name" class="grid-section">
              <div class="grid-category-title">{{ cat.name }}</div>
              <div class="tools-grid">
                <div
                  v-for="item in cat.items"
                  :key="item.id"
                  class="grid-item"
                  :class="{ active: isItemActive(item) }"
                  @click="handleNavigate(item.path)"
                >
                  <img :src="item.icon" class="icon-img" />
                  <span class="grid-item-name" v-html="formatGridItemName(item.name)"></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </template>

    <!-- 3. 顶部下拉模式 -->
    <template v-else-if="menuMode === 'top'">
      <Transition name="fade-top">
        <div v-if="isOpen" class="top-overlay" @click="handleClose">
          <div class="top-panel" @click.stop>
            <div v-for="cat in categories" :key="cat.name" class="grid-section">
              <div class="grid-category-title">{{ cat.name }}</div>
              <div class="tools-grid">
                <div
                  v-for="item in cat.items"
                  :key="item.id"
                  class="grid-item"
                  :class="{ active: isItemActive(item) }"
                  @click="handleNavigate(item.path)"
                >
                  <img :src="item.icon" class="icon-img" />
                  <span class="grid-item-name" v-html="formatGridItemName(item.name)"></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </template>
  </div>
</template>

<style scoped>
/* 蒙版动画 */
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.25s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

/* 侧边栏过渡 */
.slide-side-enter-active, .slide-side-leave-active {
  transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}
.slide-side-enter-from, .slide-side-leave-to {
  transform: translateX(100%);
}

/* 底部抽屉过渡 */
.slide-bottom-enter-active, .slide-bottom-leave-active {
  transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}
.slide-bottom-enter-from, .slide-bottom-leave-to {
  transform: translateY(100%) translateX(-50%);
}
.slide-bottom-enter-to, .slide-bottom-leave-from {
  transform: translateY(0) translateX(-50%);
}

/* 顶部下拉过渡 */
.fade-top-enter-active, .fade-top-leave-active {
  transition: opacity 0.2s ease;
}
.fade-top-enter-from, .fade-top-leave-to {
  opacity: 0;
}
.fade-top-enter-active .top-panel, .fade-top-leave-active .top-panel {
  transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}
.fade-top-enter-from .top-panel, .fade-top-leave-to .top-panel {
  transform: translateY(-15px);
}

/* --- 基础样式 --- */
.nav-mask {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: var(--modal-overlay, rgba(0, 0, 0, 0.4));
  z-index: 1500;
}

/* --- 1. 侧边栏样式 --- */
.side-panel {
  position: fixed;
  top: 0;
  bottom: 0;
  right: max(0px, calc(50% - 400px)); /* 对齐主内容区右边缘 */
  width: 70%;
  max-width: 260px;
  background: var(--card-bg, #ffffff);
  border-left: 1px solid var(--border-color);
  z-index: 1501;
  display: flex;
  flex-direction: column;
  box-shadow: -4px 0 20px rgba(0, 0, 0, 0.08);
}

/* 桌面端侧边栏：复刻参考项目，透明、无边框、紧贴内容区 */
.side-panel.desktop-panel {
  position: relative;
  width: 200px;
  height: auto;
  max-width: none;
  border-left: none;
  background: transparent;
  z-index: 1;
  box-shadow: none;
}

.side-panel.desktop-panel .side-item {
  padding: 10px 12px 10px 16px;
}

.side-panel.desktop-panel .side-item .icon-img {
  width: 30px;
  height: 30px;
  margin-right: 10px;
  border-radius: 8px;
  object-fit: contain;
}

.side-panel.desktop-panel .side-item .item-name {
  font-size: 14px;
  font-weight: 700;
  white-space: nowrap;
}

.side-panel.desktop-panel .side-category-title {
  padding: 12px 16px 4px;
  font-size: 13px;
}

.side-panel.desktop-panel .side-item.active {
  background-color: rgba(59, 130, 246, 0.06);
}

.dark-mode .side-panel.desktop-panel .side-item.active {
  background-color: rgba(59, 130, 246, 0.15);
}

.side-header {
  padding: 24px 16px 16px;
  background: linear-gradient(135deg, var(--bg-hover, rgba(0, 0, 0, 0.02)) 0%, var(--border-color, rgba(0, 0, 0, 0.05)) 100%);
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--border-color);
}

.side-header-title h2 {
  margin: 0;
  font-size: 17px;
  color: var(--text-main, #cf7155);
  font-weight: 700;
}

.side-header-sub {
  font-size: 11px;
  color: var(--text-sub);
  margin-top: 4px;
  display: block;
}

.close-btn {
  background: none;
  border: none;
  font-size: 18px;
  color: var(--text-sub);
  cursor: pointer;
  padding: 4px;
}

.side-body {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.side-category-title {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-sub);
  padding: 12px 16px 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.side-item {
  display: flex;
  align-items: center;
  padding: 12px 20px;
  color: var(--text-main, #333);
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.side-item:hover {
  background: var(--dropdown-hover, rgba(0, 0, 0, 0.02));
}

.side-item .icon-img {
  width: 20px;
  height: 20px;
  margin-right: 12px;
  flex-shrink: 0;
}

.side-item .item-name {
  font-size: 15px;
}

.side-item .arrow {
  margin-left: auto;
  color: var(--text-sub, #ccc);
  font-size: 14px;
}

.side-item.active {
  color: var(--primary);
  font-weight: bold;
  background-color: var(--dropdown-hover);
}

.side-item.active::before {
  content: '';
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 3px;
  background-color: var(--primary);
}

/* --- 2. 底部抽屉样式 --- */
.bottom-sheet {
  position: fixed;
  left: 50%;
  bottom: 0;
  transform: translateX(-50%);
  width: 100%;
  max-width: 800px;
  background: var(--card-bg, #ffffff);
  border-radius: 20px 20px 0 0;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  z-index: 1501;
  box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.1);
  border-top: 1px solid var(--border-color);
  box-sizing: border-box;
}

.sheet-handle {
  width: 36px;
  height: 4px;
  background: var(--border-color, #e2e8f0);
  border-radius: 2px;
  margin: 10px auto 4px;
  cursor: pointer;
}

.sheet-header {
  padding: 8px 16px 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--border-color);
}

.sheet-header h3 {
  margin: 0;
  font-size: 15px;
  color: var(--text-main);
  font-weight: 600;
}

.sheet-content {
  padding: 12px 16px 30px;
  overflow-y: auto;
}

.grid-category-title {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-sub);
  margin: 14px 0 8px 4px;
}

.grid-section:first-child .grid-category-title {
  margin-top: 0;
}

.tools-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-bottom: 12px;
}

.grid-item {
  background: var(--bg-hover, #f8fafc);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 12px 4px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: center;
}

.grid-item:hover {
  background: var(--dropdown-hover);
}

.grid-item .icon-img {
  width: 28px;
  height: 28px;
  flex-shrink: 0;
}

.grid-item-name {
  font-size: 12px;
  color: var(--text-main, #334155);
  line-height: 1.3;
}

.grid-item.active {
  background: rgba(59, 130, 246, 0.05);
  border-color: var(--primary);
  color: var(--primary);
}

.grid-item.active .grid-item-name {
  color: var(--primary);
  font-weight: 600;
}

/* --- 3. 顶部下拉样式 --- */
.top-overlay {
  position: fixed;
  top: 58px; /* 标题栏高度 */
  left: 0; right: 0; bottom: 0;
  background: var(--modal-overlay, rgba(0, 0, 0, 0.3));
  backdrop-filter: blur(3px);
  -webkit-backdrop-filter: blur(3px);
  z-index: 99;
}

.top-panel {
  background: var(--card-bg, #ffffff);
  padding: 16px;
  border-radius: 0 0 16px 16px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.08);
  border-bottom: 1px solid var(--border-color);
  max-height: 75vh;
  overflow-y: auto;
  max-width: 800px;
  margin: 0 auto;
  width: 100%;
  box-sizing: border-box;
}

@media (max-width: 480px) {
  .top-overlay {
    top: 48px;
  }
}
</style>

<style>
/* --- 深色模式全局样式 --- */
.dark-mode .grid-item {
  background: var(--bg) !important;
  border-color: var(--border-color) !important;
}
.dark-mode .grid-item:hover {
  background: var(--dropdown-hover) !important;
  border-color: var(--primary) !important;
}
.dark-mode .grid-item.active {
  background: rgba(59, 130, 246, 0.15) !important;
  border-color: var(--primary) !important;
}
.dark-mode .grid-item-name {
  color: var(--text-main) !important;
}
.dark-mode .grid-item.active .grid-item-name {
  color: var(--primary) !important;
}
</style>
