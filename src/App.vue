<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import notices from './assets/notices.json'
import NoticeModal from './components/NoticeModal.vue'
import UpdateModal from './components/UpdateModal.vue'
import BackToTop from './components/BackToTop.vue'
import { fetchLatestRelease, compareVersions, isUpdateSkippedToday } from './utils/version'
import { imageMatcher } from './utils/imageMatcher'

const route = useRoute()
const router = useRouter()

// 匹配引擎状态映射到全局
const engineStatus = ref('loading')

onMounted(() => {
  // 全局一次性初始化引擎
  console.log('🌐 App已挂载，开始全局初始化匹配引擎...')
  imageMatcher.init()
    .then(() => {
      console.log('✨ 全局引擎预热成功！')
      engineStatus.value = 'ready'
    })
    .catch((err) => {
      console.error('❌ 全局引擎预热失败:', err)
      engineStatus.value = 'error'
    })

  // 读取 GIF 显隐状态
  const savedShowGifs = localStorage.getItem('recruit_tool_showGifs')
  if (savedShowGifs !== null) {
    showGifs.value = savedShowGifs === 'true'
  }

  // 检查是否在 App 内
  const checkShell = () => {
    const a = document.documentElement.getAttribute("data-app-shell") === "true"
    isInApp.value = a
    if (a && !isUpdateSkippedToday()) {
      setTimeout(() => checkUpdate(true), 2000)
    }
  }
  checkShell()

  // 监听公告
  const savedNoticeVer = localStorage.getItem('saved_notice_version')
  if (noticeVersion.value && noticeVersion.value !== savedNoticeVer) {
    showNoticeModal.value = true
  }

  window.addEventListener('click', (e) => {
    if (!e.target.closest('.settings-container')) isSettingsOpen.value = false
    if (!e.target.closest('.mode-switcher-container')) isModeDropdownOpen.value = false
  })
})

const isSettingsOpen = ref(false)
const isDarkMode = ref(false)

// GIF 显示状态（默认 true，并从 localStorage 读取）
const showGifs = ref(true)

const toggleTheme = () => {
  isDarkMode.value = !isDarkMode.value
  if (isDarkMode.value) {
    document.documentElement.classList.add('dark-mode')
  } else {
    document.documentElement.classList.remove('dark-mode')
  }
}

const toggleGifs = () => {
  showGifs.value = !showGifs.value
  localStorage.setItem('recruit_tool_showGifs', showGifs.value)
}

const toggleSettings = () => {
  isSettingsOpen.value = !isSettingsOpen.value
  if (isSettingsOpen.value) isModeDropdownOpen.value = false
}

// 模式切换
const isModeDropdownOpen = ref(false)
const modes = [
  { id: 'recruit', name: '指定招募工具', shortName: '招募', path: '/recruit' },
  { id: 'talent', name: '天赋筛选工具', shortName: '天赋', path: '/talent' },
  { id: 'lime', name: '莱姆图鉴', shortName: '莱姆', path: '/lime' },
  { id: 'prefix', name: '怪物前缀', shortName: '前缀', path: '/prefix' }
]

const currentModeInfo = computed(() => {
  const m = modes.find(m => route.path.startsWith(m.path))
  return m || modes[0]
})

const toggleModeDropdown = () => {
  isModeDropdownOpen.value = !isModeDropdownOpen.value
  if (isModeDropdownOpen.value) isSettingsOpen.value = false
}

const switchMode = (mode) => {
  router.push(mode.path)
  isModeDropdownOpen.value = false
}

// 全局弹窗状态
const showFeedbackModal = ref(false)
const showNoticeModal = ref(false)
const showUpdateModal = ref(false)
const showAboutModal = ref(false)
const showDonateSection = ref(false)
const showVersionAlert = ref(false)
const versionAlertMessage = ref('')
const updateInfo = ref(null)
const isInApp = ref(false)

// 引用当前视图组件
const viewRef = ref(null)

const checkUpdate = async (silent) => {
  try {
    const info = await fetchLatestRelease()
    const currentVer = (window.__APP_VERSION__ || '0.0.0').replace(/^v?/, 'v')
    if (compareVersions(info.version, currentVer) > 0) {
      updateInfo.value = info
      showUpdateModal.value = true
    } else if (!silent) {
      versionAlertMessage.value = '当前已是最新版本'
      showVersionAlert.value = true
    }
  } catch (e) {
    if (!silent) {
      versionAlertMessage.value = '检查更新失败: ' + e.message
      showVersionAlert.value = true
    }
  }
}

const noticeVersion = computed(() => {
  if (!notices || notices.length === 0) return ''
  const latest = notices.filter(n => !n.pinned)[0]
  return latest ? latest.date + '-' + (latest.title || '') : ''
})

const markNoticeRead = () => {
  localStorage.setItem('saved_notice_version', noticeVersion.value)
}
</script>

<template>
  <div class="container">
    <div class="header-bar">
      <!-- 左侧：logo与状态区 -->
      <div class="brand-status-section">
        <img src="/logo1.png" alt="Logo" class="header-logo" />
        <div class="title-container">
          <div class="title-main-info">
            <h1 class="main-title">{{ currentModeInfo.name }}</h1>
            <div class="status-row">
              <!-- 招募模式特有状态 -->
              <span v-if="route.name === 'recruit' && viewRef" class="ocr-status-tag" :class="'status-' + engineStatus">
                <span class="status-dot"></span>
                {{ engineStatus === 'loading' ? '识别模块预加载中' : engineStatus === 'ready' ? '识别模块就绪' : '识别模块加载失败' }}
              </span>
              <!-- 天赋模式特有展示 -->
              <div v-else-if="route.name === 'talent'" class="talent-header-gifs">
                <img src="/ui/TB20011.png" class="header-gif" />
                <img src="/ui/TB20012.png" class="header-gif" />
                <img src="/ui/TB20013.png" class="header-gif" />
                <img src="/ui/TB20014.png" class="header-gif" />
              </div>
              <!-- 前缀模式特有展示 -->
              <div v-else-if="route.name === 'prefix'" class="talent-header-gifs">
                <img src="/ui/mid_btn_duiwu_00000.png" class="header-gif" />
                <img src="/ui/mid_btn_duiwu_10001.png" class="header-gif" />
                <img src="/ui/mid_btn_duiwu_40001.png" class="header-gif" />
                <img src="/ui/mid_btn_duiwu_50001.png" class="header-gif" />
              </div>
              <!-- 莱姆模式特有展示 -->
              <div v-else-if="route.name === 'lime'" class="talent-header-gifs">
                <img src="/ui/mid_btn_duiwu_00000.png" class="header-gif" />
                <img src="/ui/mid_btn_duiwu_10001.png" class="header-gif" />
                <img src="/ui/mid_btn_duiwu_40001.png" class="header-gif" />
                <img src="/ui/mid_btn_duiwu_50001.png" class="header-gif" />
              </div>
            </div>
          </div>

          <div class="mode-switcher-container" @click.stop="toggleModeDropdown">
            <div class="mode-switcher-text-row">
              <span class="mode-switcher-text">{{ currentModeInfo.shortName }}</span>
            </div>
            <div class="mode-switcher-arrow-row">
              <img src="/ui/up.svg" class="mode-switcher-arrow" :class="{ 'is-open': isModeDropdownOpen }" />
            </div>

            <div v-if="isModeDropdownOpen" class="mode-dropdown">
              <div 
                v-for="mode in modes" 
                :key="mode.id" 
                class="mode-dropdown-item"
                :class="{ active: currentModeInfo.id === mode.id }"
                @click.stop="switchMode(mode)"
              >
                {{ mode.name }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧：操作按钮区 -->
      <div class="header-btns">
        <div class="settings-container">
          <button class="btn-icon" @click.stop="toggleSettings" title="设置">
            <img src="/ui/setting.svg" alt="设置" />
          </button>

          <div v-if="isSettingsOpen" class="settings-dropdown">
            <div class="dropdown-item" @click="toggleTheme">
              <img :src="isDarkMode ? '/ui/theme-light.svg' : '/ui/theme-dark.svg'" class="item-icon" />
              <span>{{ isDarkMode ? '浅色模式' : '深色模式' }}</span>
            </div>
            <div class="dropdown-item" @click="toggleGifs" v-if="route.name === 'recruit'">
              <img :src="showGifs ? '/ui/visibility-off.svg' : '/ui/visibility.svg'" class="item-icon" />
              <span>{{ showGifs ? '隐藏GIF动画' : '显示GIF动画' }}</span>
            </div>
            <div class="dropdown-item" @click="showFeedbackModal = true; isSettingsOpen = false">
              <img src="/ui/feedback.svg" class="item-icon" />
              <span>反馈/建议</span>
            </div>
            <div class="dropdown-item" @click="showNoticeModal = true; isSettingsOpen = false; markNoticeRead()">
              <img src="/ui/announcement.svg" class="item-icon" />
              <span>公告</span>
            </div>
            <div class="dropdown-item" @click="viewRef.openWishModal(); isSettingsOpen = false" v-if="route.name === 'recruit' && viewRef">
              <img src="/ui/wish.svg" class="item-icon" />
              <span>心愿招募</span>
            </div>
            <div class="dropdown-item app-only" @click="isSettingsOpen = true ; checkUpdate(false)">
              <img src="/ui/update.svg" class="item-icon" />
              <span>检测更新</span>
            </div>
            <div class="dropdown-item" @click="showAboutModal = true; isSettingsOpen = false">
              <img src="/ui/we.svg" class="item-icon" />
              <span>关于我们</span>
            </div>
          </div>
        </div>

        <template v-if="route.name === 'recruit' && viewRef">
          <button
            class="btn-upload"
            @click="viewRef.triggerUpload()"
            :disabled="viewRef.isMatchingLoading" >
            {{ viewRef.isMatchingLoading ? '识别中...' : '上传截图' }}
          </button>
          <button class="btn-reset" @click="viewRef.resetTags()">重置</button>
        </template>
      </div>
    </div>

    <!-- 路由内容区域 -->
    <router-view v-slot="{ Component }">
      <component :is="Component" ref="viewRef" :showGifs="showGifs" :engineStatus="engineStatus" />
    </router-view>

    <!-- 反馈建议弹窗 (全局) -->
    <div v-if="showFeedbackModal" class="custom-modal-overlay" @click.self="showFeedbackModal = false">
      <div class="custom-modal-card">
        <div class="modal-header">
          <h3>反馈/建议</h3>
        </div>
        <div class="modal-body feedback-body">
          <p class="modal-title-text">💬 遇到问题？联系反馈</p>
          <div class="feedback-content">
            <p>方式一：【 <a href="https://qm.qq.com/q/cUvhuRHvhK" target="_blank">QQ联系</a> 】</p>
            <p>方式二：【 <a href="https://f.kdocs.cn/g/y4Uu95na/" target="_blank">填写在线表单</a> 】</p>
            <p class="hint-text">如有建议，建议使用QQ联系，更方便交流</p>
            <p style="margin-top:8px"><a href="https://qun.qq.com/universal-share/share?ac=1&authKey=4xp%2BlCmM2Q2gVIvW6a14yOEVtT%2BPLsY9DwmNSDRVTBkp8xcNO%2FTRo%2FOksMb528aW&busi_data=eyJncm91cENvZGUiOiI5NjQ3Njg3OTkiLCJ0b2tlbiI6Im1abkR4eDNDb09HeDZtV2QvNi9ZOTlMNWRhQVQxSDVGK2hSUmlmdkd6bm9hNGRIYjZnWFB6QitBd1A5NVhscmMiLCJ1aW4iOiIxOTY1MTYxNjQzIn0%3D&data=CcXqRPXmezEwvtBwz950aSAyBxYHidOpffYEE8nD1EB-WDcAI-CLzvlLLIavd-lpEuHEP9fCXE5i5Sh3aGjUmw&svctype=4&tempid=h5_group_info" target="_blank" style="color:#3b82f6;font-weight:bold">点击链接加入群聊【幻想少女公会助手反馈交流群】</a></p>
          </div>
        </div>
        <div class="modal-footer">
          <button class="modal-btn-confirm" @click="showFeedbackModal = false">确定</button>
        </div>
      </div>
    </div>

    <!-- 公告弹窗 (全局) -->
    <NoticeModal :show="showNoticeModal" @close="showNoticeModal = false; markNoticeRead()" />

    <!-- 关于我们弹窗 (全局) -->
    <div v-if="showAboutModal" class="custom-modal-overlay" @click.self="showAboutModal = false; showDonateSection = false">
      <div class="custom-modal-card about-modal-card">
        <div class="modal-header about-header">
          <h3>关于我们</h3>
          <button class="donate-btn-top" @click="showDonateSection = !showDonateSection">
            {{ showDonateSection ? '返回' : '赞助' }}
          </button>
        </div>
        
        <div class="modal-body about-body" v-if="!showDonateSection">
          <div class="author-section">
            <img src="/ui/author_avatar.jpg" class="about-logo" />
            <h4 class="author-name">云汐渚梦</h4>
            <div class="social-links">
              <a href="https://www.taptap.cn/user/34448185?share_id=06714cbc47ff&utm_medium=share&utm_source=copylink" target="_blank" class="social-item taptap">
                <span class="social-icon">T</span>
                TapTap
              </a>
              <a href="https://b23.tv/xGNrRhf" target="_blank" class="social-item bilibili">
                <span class="social-icon">B</span>
                Bilibili
              </a>
            </div>
          </div>

          <div class="credits-section">
            <div class="credits-title">感谢名单</div>
            <div class="credits-list">
              <div class="credit-item">
                <span class="credit-name">TapTap 留白</span>
                <span class="credit-desc">最初角色数据源</span>
              </div>
              <div class="credit-item">
                <span class="credit-name">Lance</span>
                <span class="credit-desc">天赋数据</span>
              </div>
              <div class="credit-item">
                <span class="credit-name">幺蛾子</span>
                <span class="credit-desc">天赋推荐支持</span>
              </div>
              <div class="credit-item">
                <span class="credit-name">来年祈风信</span>
                <span class="credit-desc">数据支持</span>
              </div>
              <div class="credit-item">
                <span class="credit-name">山酒</span>
                <span class="credit-desc">数据支持</span>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-body donate-body" v-else>
          <p class="donate-hint">感谢您的支持，赞助将用于工具维护</p>
          <div class="donate-qrs">
            <div class="qr-item">
              <img src="/ui/Alipay.jpg" alt="支付宝" />
              <span>支付宝</span>
            </div>
            <div class="qr-item">
              <img src="/ui/WeChatPay.png" alt="微信支付" />
              <span>微信支付</span>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="modal-btn-confirm" @click="showAboutModal = false; showDonateSection = false">关闭</button>
        </div>
      </div>
    </div>

    <!-- 更新弹窗 (全局) -->
    <UpdateModal :show="showUpdateModal" :updateInfo="updateInfo" @close="showUpdateModal = false" />

    <!-- 版本提示弹窗 (全局) -->
    <div v-if="showVersionAlert" class="custom-modal-overlay" @click.self="showVersionAlert = false">
      <div class="custom-modal-card">
        <div class="modal-header">
          <h3>系统提示</h3>
        </div>
        <div class="modal-body">
          <p class="modal-title-text" style="color:var(--text-main);font-size:16px">{{ versionAlertMessage }}</p>
        </div>
        <div class="modal-footer">
          <button class="modal-btn-confirm" @click="showVersionAlert = false">确定</button>
        </div>
      </div>
    </div>

    <!-- 回到顶部按钮 (全局) -->
    <BackToTop />
  </div>
</template>

<style>
@font-face {
  font-family: 'HarmonyOS_Bold';
  src: url('/fonts/HarmonyOS_Sans_Bold.ttf') format('truetype');
  font-weight: bold;
}

@font-face {
  font-family: 'HarmonyOS_Regular';
  src: url('/fonts/HarmonyOS_Sans_Regular.ttf') format('truetype');
  font-weight: normal;
}

:root {
  --primary: #3b82f6;
  --red: #f43f5e;
  --gold: #f97316;
  --purple: #a855f7;
  --blue: #7FAECB;
  --green: #79C37A;
  --gold-light: #ffedd5;
  --purple-light: #f3e8ff;
  --blue-light: #e0f2fe;
  --green-light: #d1fae5;
  --gold-text: #c2410c;
  --purple-text: #7e22ce;
  --blue-text: #1d4ed8;
  --green-text: #065f46;
  --remark-text:#dd7738;
  --bg: #f8fafc;
  --card-bg: #ffffff;
  --text-main: #1e293b;
  --text-sub: #64748b;
  --success: #10b981;
  --border-color: #f1f5f9;
  --header-bg: #ffffff;
  --dropdown-hover: #f1f5f9;
  --modal-overlay: rgba(15, 23, 42, 0.4);
  --icon-filter: brightness(0) saturate(100%) invert(13%) sepia(13%) saturate(3665%) hue-rotate(189deg) brightness(91%) contrast(92%);
  --header-padding-top: 15px;
}

.dark-mode {
  --bg: #0f172a;
  --card-bg: #1e293b;
  --text-main: #cbd5e1;
  --text-sub: #b8c6dd;
  --border-color: #334155;
  --header-bg: #1e293b;
  --dropdown-hover: #334155;
  --modal-overlay: rgba(0, 0, 0, 0.6);
  --icon-filter: brightness(0) saturate(100%) invert(91%) sepia(5%) saturate(542%) hue-rotate(181deg) brightness(96%) contrast(87%);
}

*, *::before, *::after {
  box-sizing: border-box;
}

html {
  overscroll-behavior: none;
}

body {
  font-family: 'HarmonyOS_Regular', "PingFang SC", "Microsoft YaHei", sans-serif;
  background: var(--bg);
  padding: 0;
  color: var(--text-main);
  margin: 0;
  display: block !important;
  transition: background-color 0.3s, color 0.3s;
  min-height: 100vh;
  /* 核心修复：禁用系统级回弹效果 */
  overscroll-behavior: none;
  -webkit-overflow-scrolling: touch;
}

#app {
  max-width: none !important;
  margin: 0 !important;
  padding: 0 !important;
  display: block !important;
}

/* 套壳 WebView 安全区域 */
html[data-app-shell="true"] {
  background: var(--bg);
  --header-padding-top: calc(var(--status-bar-height, 24px) + 8px);
}
html[data-app-shell="true"] body {
  background: var(--bg);
}
html[data-app-shell="true"] #app {
  padding-top: 0 !important;
}

.container {
  width: 100% !important;
  max-width: 800px;
  margin: 0 auto;
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: calc(var(--header-padding-top) + 64px) 15px 15px 15px; /* 顶部留出固定栏高度 */
}

.header-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0;
  padding: var(--header-padding-top) 15px 10px 15px;
  height: calc(var(--header-padding-top) + 64px);
  position: fixed;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 800px;
  z-index: 1000;
  background: var(--bg);
  box-sizing: border-box;
  /* 增强固定稳定性 */
  backface-visibility: hidden;
  will-change: transform;
}

.brand-status-section {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 180px;
}

.main-title {
  margin: 0;
  padding: 0;
  font-family: 'HarmonyOS_Bold', sans-serif;
  font-size: 16px;
  font-weight: 800;
  color: var(--text-main);
  white-space: nowrap;
  line-height: 1.2;

}

.talent-header-gifs {
  display: flex;
  align-items: center;
  gap: 4px;
}
.header-gif {
  height: 20px;
  width: auto;
  object-fit: contain;
}
.ocr-status-tag {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 4px;
  font-weight: 600;
  transition: all 0.3s ease;
  margin-left: -6px;
}

.ocr-status-tag .status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.ocr-status-tag.status-loading {
  background: var(--border-color);
  color: var(--text-sub);
}
.ocr-status-tag.status-loading .status-dot {
  background: var(--text-sub);
  animation: status-blink 1.2s infinite ease-in-out;
}

.ocr-status-tag.status-ready {
  background: #ecfdf5;
  color: #059669;
}
.dark-mode .ocr-status-tag.status-ready {
  background: rgba(5, 46, 22, 0.6) !important;
  color: #34d399 !important;
  border: 1px solid rgba(52, 211, 153, 0.2);
}
.ocr-status-tag.status-ready .status-dot {
  background: #10b981;
  box-shadow: 0 0 4px rgba(16, 185, 129, 0.6);
}

.ocr-status-tag.status-error {
  background: #fef2f2;
  color: #dc2626;
}
.dark-mode .ocr-status-tag.status-error {
  background: rgba(220, 38, 38, 0.2) !important;
  color: #f87171 !important;
}
.ocr-status-tag.status-error .status-dot {
  background: #ef4444;
}

@keyframes status-blink {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; }
}

.header-btns {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.settings-container {
  position: relative;
  display: flex;
  align-items: center;
}

.btn-icon {
  background: none;
  border: none;
  padding: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background-color 0.2s;
}

.btn-icon:hover {
  background-color: var(--dropdown-hover);
}

.btn-icon img {
  width: 24px;
  height: 24px;
  filter: var(--icon-filter);
}

.settings-dropdown, .mode-dropdown {
  position: absolute;
  top: 100%;
  margin-top: 8px;
  width: 160px;
  z-index: 1000;
  background: var(--card-bg);
  border-radius: 12px;
  border: 1px solid var(--border-color);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  animation: slideDown 0.2s ease-out;
  overflow: hidden;
}

.settings-dropdown {
  right: 0;
}

.mode-dropdown {
  left: 0;
  min-width: 120px;
}

.dropdown-item, .mode-dropdown-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  cursor: pointer;
  font-size: 14px;
  color: var(--text-main);
  transition: background-color 0.2s;
  gap: 10px;
}

.dropdown-item:hover, .mode-dropdown-item:hover {
  background-color: var(--dropdown-hover);
}

.mode-dropdown-item.active {
  color: var(--primary);
  font-weight: 600;
  background: rgba(59, 130, 246, 0.05);
}

.dark-mode .mode-dropdown-item.active {
  background: rgba(59, 130, 246, 0.15);
}

.item-icon {
  width: 22px;
  height: 22px;
  filter: var(--icon-filter);
}

@keyframes slideDown {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

.header-logo {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  object-fit: cover;
  flex-shrink: 0;
}

.btn-reset, .btn-upload {
  padding: 6px 8px;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  white-space: nowrap;
  flex-shrink: 0;
}

.btn-reset { background: #ef4444; }
.btn-upload { background: var(--success); }
.btn-upload:disabled { background: #94a3b8; cursor: not-allowed; }

.custom-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: var(--modal-overlay);
  backdrop-filter: blur(4px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
  animation: fadeIn 0.2s ease-out;
}

.custom-modal-card {
  background: var(--card-bg);
  width: 90%;
  max-width: 400px;
  border-radius: 16px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  animation: scaleUp 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
  border: 1px solid var(--border-color);
}

.modal-header { padding: 16px 20px 10px 20px; border-bottom: 1px solid var(--border-color); text-align: center; }
.modal-header h3 { margin: 0; font-size: 14px; color: var(--text-sub); font-weight: 500; }

.modal-body { padding: 24px 20px; text-align: center; }
.modal-title-text { margin: 0 0 6px 0; font-size: 20px; font-weight: bold; color: var(--success); }
.modal-sub-text { margin: 0 0 16px 0; font-size: 13px; color: var(--text-sub); }

.modal-footer { padding: 12px 20px 20px 20px; display: flex; justify-content: center; }
.modal-btn-confirm { padding: 10px 40px; background: var(--primary); color: white; border: none; border-radius: 8px; font-size: 14px; font-weight: bold; cursor: pointer; transition: all 0.2s; }

.feedback-body { text-align: left; padding: 20px 24px; }
.feedback-content p { margin: 12px 0; font-size: 14px; }
.feedback-content a { color: var(--primary); font-weight: bold; }
.feedback-content .hint-text { font-size: 12px; color: var(--text-sub); margin-top: 20px; background: var(--bg); padding: 10px; border-radius: 8px; }

@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes scaleUp { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }

/* 模式切换器 */
.title-container { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex: 1; }
.title-main-info { display: flex; flex-direction: column; gap: 2px; }
.status-row { display: flex; align-items: center; width: 100%; height: 20px; }
.mode-switcher-container { position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; margin-left: auto; }
.mode-switcher-text-row { height: 20px; display: flex; align-items: center; justify-content: center; }
.mode-switcher-arrow-row { height: 20px; display: flex; align-items: center; justify-content: center; }
.mode-switcher-text { font-family: 'HarmonyOS_Bold', sans-serif; font-size: 10px; font-weight: 800; color: var(--text-main); border: 1px solid #000; padding: 1px 4px; border-radius: 3px; white-space: nowrap; }
.dark-mode .mode-switcher-text { border-color: #f8fafc; }
.mode-switcher-arrow { width: 12px; height: 12px; filter: var(--icon-filter); transition: transform 0.2s; transform: rotate(180deg); cursor: pointer; }
.mode-switcher-arrow.is-open { transform: rotate(0deg); }

html:not([data-app-shell="true"]) .app-only { display: none !important; }
.about-modal-card {
  max-width: 450px;
  max-height: 90vh;
  overflow-y: auto;
}
.about-header {
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
}
.donate-btn-top {
  position: absolute;
  right: 15px;
  top: 50%;
  transform: translateY(-50%);
  background: #fef3c7;
  color: #d97706;
  border: 1px solid #fbbf24;
  padding: 4px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
}
.dark-mode .donate-btn-top {
  background: rgba(217, 119, 6, 0.2);
  color: #fbbf24;
}
.donate-btn-top:hover {
  background: #fcd34d;
  color: #92400e;
}
.about-body {
  padding: 20px !important;
  text-align: left !important;
}
.author-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 24px;
}
.about-logo {
  width: 64px;
  height: 64px;
  border-radius: 12px;
  margin-bottom: 12px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}
.author-name {
  margin: 0 0 12px 0;
  font-size: 18px;
  color: var(--text-main);
}
.social-links {
  display: flex;
  gap: 12px;
}
.social-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 500;
  text-decoration: none;
  transition: all 0.2s;
}
.social-icon {
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-size: 10px;
  font-weight: bold;
  color: white;
}
.taptap {
  background: #00cccc20;
  color: #008a8a;
}
.taptap .social-icon { background: #00cccc; }
.bilibili {
  background: #fb729920;
  color: #e83e6d;
}
.bilibili .social-icon { background: #fb7299; }

.credits-section {
  background: var(--bg);
  padding: 16px;
  border-radius: 12px;
}
.credits-title {
  font-size: 14px;
  font-weight: bold;
  color: var(--text-sub);
  margin-bottom: 12px;
  text-align: center;
}
.credits-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.credit-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
}
.credit-name {
  color: var(--text-main);
  font-weight: 600;
}
.credit-desc {
  color: var(--text-sub);
  font-size: 12px;
}

.donate-body {
  padding: 30px 20px !important;
}
.donate-hint {
  font-size: 14px;
  color: var(--text-sub);
  margin-bottom: 20px;
}
.donate-qrs {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 30px;
}
.qr-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}
.qr-item img {
  width: 240px;
  height: auto;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  padding: 4px;
  background: white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}
.qr-item span {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-main);
}
</style>
