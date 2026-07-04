<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import notices from './assets/notices.json'
import NoticeModal from './components/NoticeModal.vue'
import UpdateModal from './components/UpdateModal.vue'
import BackToTop from './components/BackToTop.vue'
import PrivacyModal from './components/PrivacyModal.vue'
import AboutModal from './components/AboutModal.vue'
import HotUpdateModal from './components/HotUpdateModal.vue'
import { fetchLatestRelease, compareVersions, isUpdateSkippedToday } from './utils/version'
import { imageMatcher } from './utils/imageMatcher'
import { exportData, importData } from './utils/dataTransfer'

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

  // 初始化百度统计授权状态
  initBaiduAuth()

  // 缓存 APK 版本到 localStorage（供热更后页面重载时稳定读取）
  const apkVer = window.__APP_VERSION__
  if (apkVer && apkVer !== '0.0.0') {
    localStorage.setItem('apk_cached_version', apkVer)
  }

  // 初始化百度统计页面标识
  updateBaiduPage()

  // 检查是否在 App 内
  const checkShell = () => {
    const cap = window.Capacitor?.isNativePlatform?.() ?? false
    const attr = document.documentElement.getAttribute("data-app-shell") === "true"
    const hotPath = window.location.href.includes('files/www/') || window.location.href.includes('/data/')
    const isCustomHost = window.location.hostname === 'hxsngh.app'
    isInApp.value = cap || attr || hotPath || isCustomHost
    if (isInApp.value && !isUpdateSkippedToday()) {
      setTimeout(() => checkUpdate(true), 2000)
    }
  }
  checkShell()

  // 隐私优先：App 首次启动弹窗，网页版不弹窗，默认开启统计
  const savedPrivacy = localStorage.getItem('privacy_accepted')
  if (savedPrivacy === null && isInApp.value) {
    // App 首次启动，弹隐私政策
    setTimeout(() => {
      showPrivacyModal.value = true
      isFirstLaunchPrivacy.value = true
    }, 500)
  } else {
    // 网页版第一次访问：标记为已同意，默认开启统计
    if (savedPrivacy === null && !isInApp.value) {
      localStorage.setItem('privacy_accepted', 'true')
      if (!baiduAuthorized.value) {
        baiduAuthorized.value = true
        localStorage.setItem('baidu_authorized', 'true')
        window.__baidu_authorized = true
      }
    }
    // 已处理过隐私，正常检查公告
    checkNoticeAfterPrivacy()
    // 隐私就绪后，检查热更新
    checkForHotUpdate()
  }

  window.addEventListener('click', (e) => {
    if (!e.target.closest('.settings-container')) isSettingsOpen.value = false
    if (!e.target.closest('.mode-switcher-container')) isModeDropdownOpen.value = false
  })

  // ===== 侧滑/物理返回键全局弹窗拦截处理（双保险模式） =====
  const modalSelectors = [
    '.detail-modal-overlay',
    '.relic-modal-overlay',
    '.image-region-overlay',
    '.source-modal-overlay',
    '.talent-modal-overlay',
    '.custom-modal-overlay',
    '.modal-overlay',
    '.modal-backdrop',
    '.dialog-overlay',
    '.wish-modal-overlay',
    '.result-modal-overlay',
    '.about-modal-card',
    '[class*="modal-overlay"]',
    '[class*="modal-backdrop"]',
    '[class*="dialog-overlay"]'
  ]

  const getVisibleModal = () => {
    for (const selector of modalSelectors) {
      const el = document.querySelector(selector)
      if (el && el.style.display !== 'none' && getComputedStyle(el).display !== 'none') {
        return el
      }
    }
    return null
  }

  const closeActiveModal = (modalEl) => {
    if (!modalEl) return false
    // 1. 优先点击关闭按钮
    const closeBtn = modalEl.querySelector(
      '.relic-modal-close, .image-modal-close, .close-btn, .modal-close-btn, .modal-close, button[class*="close"]'
    ) || document.querySelector(
      '.relic-modal-close, .image-modal-close, .close-btn, .modal-close-btn, .modal-close, button[class*="close"]'
    )
    if (closeBtn) {
      closeBtn.click()
      return true
    }
    // 2. 备用直接点击遮罩层本身
    modalEl.click()
    return true
  }

  let isBacking = false

  const syncModalHistoryState = () => {
    const modalEl = getVisibleModal()
    const hasModal = !!modalEl
    const isStateModal = history.state?.modalOpen === true
    
    if (hasModal && !isStateModal) {
      history.pushState({ modalOpen: true }, '')
    } else if (!hasModal && isStateModal && !isBacking) {
      isBacking = true
      history.back()
    }
  }

  const observer = new MutationObserver(() => {
    setTimeout(syncModalHistoryState, 50)
  })
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['style', 'class']
  })

  window.addEventListener('popstate', (e) => {
    const isStateModal = e.state?.modalOpen === true
    const modalEl = getVisibleModal()
    
    if (isBacking) {
      isBacking = false
      return
    }
    
    if (!isStateModal && modalEl) {
      closeActiveModal(modalEl)
    }
  })

  // 暴露给原生安卓壳子的全局方法
  window.onAndroidBack = () => {
    const modalEl = getVisibleModal()
    if (modalEl) {
      closeActiveModal(modalEl)
      return true // 已拦截并关闭弹窗
    }
    return false // 交给原生安卓处理
  }
})

const isSettingsOpen = ref(false)
const isDarkMode = ref(false)
const limeFileInput = ref(null)
const universalFileInput = ref(null)

const exportLimeData = () => {
  exportData(JSON.parse(localStorage.getItem('my_owned_limes') || '[]'),
    `lime_owned_data_${new Date().toISOString().slice(0, 10)}.json`)
}

// ===== 通用导入导出（合并所有视图数据） =====
const exportAllData = () => {
  // 紧凑化天赋管理数据
  const rawCards = JSON.parse(localStorage.getItem('talent_manager_data') || '[]')
  const compactTM = Array.isArray(rawCards) ? rawCards.map(card => ({
    charId: card.baseInfo?.id,
    talentPages: (card.talentPages || []).map(page => ({
      slots: (page.slots || []).map(slot => slot && slot.talent ? { id: slot.talent.uid } : null)
    }))
  })) : []
  const mergedData = [
    { _type: 'lime', data: JSON.parse(localStorage.getItem('my_owned_limes') || '[]') },
    { _type: 'talent-manage', data: compactTM }
  ]
  exportData(mergedData, `full_backup_${new Date().toISOString().slice(0, 10)}.json`)
}

const triggerUniversalImport = () => {
  universalFileInput.value?.click()
}

const dispatchImportItem = (item) => {
  switch (item._type) {
    case 'lime':
      if (Array.isArray(item.data)) {
        localStorage.setItem('my_owned_limes', JSON.stringify(item.data))
        window.dispatchEvent(new CustomEvent('lime-data-imported'))
      }
      break
    case 'talent-manage':
      if (Array.isArray(item.data)) {
        localStorage.setItem('talent_manager_data', JSON.stringify(item.data))
        window.dispatchEvent(new CustomEvent('talent-manager-data-imported'))
      }
      break
    default:
      console.warn('未识别的数据类型:', item._type)
  }
}

const handleUniversalImport = async (event) => {
  try {
    const data = await importData(event)
    if (Array.isArray(data)) {
      data.forEach(item => dispatchImportItem(item))
      showMessage('提示', `导入成功！共处理 ${data.length} 项数据`, 'success')
    } else if (data && data._type) {
      dispatchImportItem(data)
      showMessage('提示', '导入成功！', 'success')
    } else {
      throw new Error('数据格式错误：应为数组或包含 _type 的对象')
    }
  } catch (err) {
    showMessage('导入失败', '导入失败：' + err.message, 'error')
  }
}

const triggerLimeImport = () => {
  limeFileInput.value?.click()
}

const handleLimeImport = async (event) => {
  try {
    const data = await importData(event)
    if (!Array.isArray(data)) throw new Error('数据格式错误：应为数组')
    localStorage.setItem('my_owned_limes', JSON.stringify(data))
    window.dispatchEvent(new CustomEvent('lime-data-imported'))
    showMessage('提示', '导入成功！', 'success')
  } catch (err) {
    showMessage('导入失败', '导入失败：' + err.message, 'error')
  }
}

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
  { id: 'subskill', name: '支援筛选工具', shortName: '支援', path: '/subskill' },
  { id: 'equip', name: '装备筛选工具', shortName: '装备', path: '/equip' },
  { id: 'talent-manage', name: '天赋管理', shortName: '库存', path: '/talent-manage' },
  { id: 'role', name: '角色图鉴', shortName: '角色', path: '/role' },
  { id: 'lime', name: '莱姆图鉴', shortName: '莱姆', path: '/lime' },
  { id: 'prefix', name: '怪物前缀', shortName: '前缀', path: '/prefix' },
  { id: 'foretell', name: '预言图鉴', shortName: '预言', path: '/foretell' },
  { id: 'dungeon-relics', name: '星界秘境遗物图鉴', shortName: '遗物', path: '/dungeon-relics' },
  { id: 'guide', name: '新人攻略', shortName: '攻略', path: '/guide' },
  { id: 'ranking', name: '预告：角色/队伍热度排行', shortName: '预告', path: '/ranking' }
]

const currentModeInfo = computed(() => {
  const m = modes.find(m => route.path === m.path || route.path.startsWith(m.path + '/'))
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
const showDonateModal = ref(false)
const showPrivacyModal = ref(false)
const showVersionAlert = ref(false)
const versionAlertMessage = ref('')

// 通用消息弹窗（替代 alert）
const showMessageModal = ref(false)
const messageModalTitle = ref('')
const messageModalText = ref('')
const messageModalType = ref('info') // info | success | error
const showMessage = (title, text, type = 'info') => {
  messageModalTitle.value = title
  messageModalText.value = text
  messageModalType.value = type
  showMessageModal.value = true
}
const baiduAuthorized = ref(localStorage.getItem('baidu_authorized') === 'true')

const initBaiduAuth = () => {
  window.__baidu_authorized = baiduAuthorized.value
}

const toggleBaiduAuth = () => {
  baiduAuthorized.value = !baiduAuthorized.value
  localStorage.setItem('baidu_authorized', baiduAuthorized.value)
  window.__baidu_authorized = baiduAuthorized.value
}

const updateBaiduPage = () => {
  const pageMap = {
    'recruit': '指定招募',
    'talent': '天赋筛选',
    'lime': '莱姆图鉴',
    'prefix': '怪物前缀',
    'foretell': '预言图鉴',
    'dungeon-relics': '星界秘境遗物图鉴',
    'equip': '装备筛选',
    'talent-manage': '天赋管理',
    'guide': '新人攻略',
    'subskill': '支援筛选',
    'role': '角色图鉴',
    'ranking': '热度排行',
  }
  window.__baidu_page = pageMap[route.name] || route.name || 'unknown'
}

// 路由变化时更新百度统计页面标识
watch(() => route.name, updateBaiduPage)

// 首次启动隐私同意标记
const isFirstLaunchPrivacy = ref(false)

// 隐私同意后，再检查公告
const checkNoticeAfterPrivacy = () => {
  const savedNoticeVer = localStorage.getItem('saved_notice_version')
  if (noticeVersion.value && noticeVersion.value !== savedNoticeVer) {
    showNoticeModal.value = true
  }
}

const agreeToPrivacy = () => {
  localStorage.setItem('privacy_accepted', 'true')
  if (!baiduAuthorized.value) {
    baiduAuthorized.value = true
    localStorage.setItem('baidu_authorized', 'true')
    window.__baidu_authorized = true
  }
  showPrivacyModal.value = false
  isFirstLaunchPrivacy.value = false
  checkNoticeAfterPrivacy()
  checkForHotUpdate()
}

const disagreePrivacy = () => {
  localStorage.setItem('privacy_accepted', 'true')
  if (baiduAuthorized.value) {
    baiduAuthorized.value = false
    localStorage.setItem('baidu_authorized', 'false')
    window.__baidu_authorized = false
  }
  showPrivacyModal.value = false
  isFirstLaunchPrivacy.value = false
  checkNoticeAfterPrivacy()
  checkForHotUpdate()
}

const updateInfo = ref(null)
const isInApp = ref(false)
const showHotUpdate = ref(false)     // 控制热更新弹窗
const hotUpdateManifest = ref(null)  // 预检测到的热更信息

// 引用当前视图组件
const viewRef = ref(null)

// 检查热更新（静默检测，有更新才弹窗）
const checkForHotUpdate = async () => {
  if (!isInApp.value) { console.log('[HotUpdate] 非 App 环境，跳过'); return }
  await new Promise(r => setTimeout(r, 1500))
  const { checkHotUpdate } = await import('./utils/hotupdate')
  const m = await checkHotUpdate()
  console.log('[HotUpdate] 检测结果:', m ? '有更新 version=' + m.version + ' needApk=' + m._needsApkUpdate : '无更新')
  if (m) {
    if (m._needsApkUpdate) {
      checkUpdate(true)
    } else {
      hotUpdateManifest.value = m
      showHotUpdate.value = true
    }
  }
}

// 热更新应用完毕后通知 Java 清缓存后重载（比 JS 重载更稳定）
const onHotUpdateApplied = () => {
  window.__hotUpdateReady = true
}
const checkUpdate = async (silent) => {
  try {
    const info = await fetchLatestRelease()
    // 优先用 localStorage 持久化的版本，避免 Java 异步注入未完成时读到 0.0.0
    const cachedVer = localStorage.getItem('apk_cached_version')
    const curVer = window.__APP_VERSION__ || cachedVer || '0.0.0'
    const currentVer = curVer.replace(/^v?/, 'v')
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

const borderNoticeRead = () => {
  localStorage.setItem('saved_notice_version', noticeVersion.value)
}
</script>

<template>
  <div class="layout-wrapper">
    <div class="app-header">
      <div class="brand-status-section">
        <img src="/logo1.png" alt="Logo" class="header-logo" />
        <div class="title-container">
          <div class="title-main-info">
            <h1 class="main-title">{{ currentModeInfo.name }}</h1>
            <div class="status-row">
              <span v-if="route.name === 'recruit' && viewRef" class="ocr-status-tag" :class="'status-' + engineStatus">
                <span class="status-dot"></span>
                {{ engineStatus === 'loading' ? '识别模块预加载中' : engineStatus === 'ready' ? '识别模块就绪' : '识别模块加载失败' }}
              </span>
              <div v-else-if="route.name === 'talent'" class="talent-header-gifs">
                <img src="/ui/TB20011.png" class="header-gif" />
                <img src="/ui/TB20012.png" class="header-gif" />
                <img src="/ui/TB20013.png" class="header-gif" />
                <img src="/ui/TB20014.png" class="header-gif" />
              </div>
              <div v-else-if="route.name === 'prefix'" class="talent-header-gifs">
                <img src="/ui/mid_btn_duiwu_00000.png" class="header-gif" />
                <img src="/ui/mid_btn_duiwu_10001.png" class="header-gif" />
                <img src="/ui/mid_btn_duiwu_40001.png" class="header-gif" />
                <img src="/ui/mid_btn_duiwu_50001.png" class="header-gif" />
              </div>
              <div v-else-if="route.name === 'subskill'" class="talent-header-gifs">
                <img src="/Skill/TB00025.png" class="header-gif" />
                <img src="/Skill/TB00026.png" class="header-gif" />
                <img src="/Skill/TB00027.png" class="header-gif" />
                <img src="/Skill/TB00031.png" class="header-gif" />
              </div>
              <div v-else-if="route.name === 'lime'" class="talent-header-gifs">
                <img src="/lime/LM02027B.png" class="header-gif" />
                <img src="/lime/LM03033B.png" class="header-gif" />
                <img src="/lime/LM02020B.png" class="header-gif" />
                <img src="/lime/LM02016B.png" class="header-gif" />
              </div>
              <div v-else-if="route.name === 'guide'" class="talent-header-gifs">
                <img src="/misc/mid_btn_equip_0002.png" class="header-gif" />
                <img src="/misc/mid_btn_equip_0003.png" class="header-gif" />
                <img src="/misc/mid_btn_equip_0004.png" class="header-gif" />
                <img src="/misc/mid_btn_equip_0005.png" class="header-gif" />
              </div>
              <div v-else-if="route.name === 'role'" class="talent-header-gifs">
                <img src="/misc/mid_btn_equip_0002.png" class="header-gif" />
                <img src="/misc/mid_btn_equip_0003.png" class="header-gif" />
                <img src="/misc/mid_btn_equip_0004.png" class="header-gif" />
                <img src="/misc/mid_btn_equip_0005.png" class="header-gif" />
              </div>
               <div v-else-if="route.name === 'talent-manage'" class="talent-header-gifs">
                <img src="/ui/TB40012.png" class="header-gif" />
                <img src="/ui/TB40013.png" class="header-gif" />
                <img src="/ui/TB40014.png" class="header-gif" />
                <img src="/ui/TB40016.png" class="header-gif" />
              </div>
              <div v-else-if="route.name === 'foretell'" class="talent-header-gifs">
                <img src="/Foretell/YY00005.png" class="header-gif" />
                <img src="/Foretell/YY00002.png" class="header-gif" />
                <img src="/Foretell/YY00003.png" class="header-gif" />
                <img src="/Foretell/YY00004.png" class="header-gif" />
              </div>
              <div v-else-if="route.name === 'dungeon-relics'" class="talent-header-gifs">
                <img src="/DungeonRelics/YW00022_311.png" class="header-gif" />
                <img src="/DungeonRelics/YW00022_401.png" class="header-gif" />
                <img src="/DungeonRelics/YW00003_321.png" class="header-gif" />
                <img src="/DungeonRelics/YW00009_301.png" class="header-gif" />
              </div>
              <div v-else-if="route.name === 'equip'" class="talent-header-gifs">
                <img src="/ui/TB20011.png" class="header-gif" />
                <img src="/ui/TB20012.png" class="header-gif" />
                <img src="/ui/TB20013.png" class="header-gif" />
                <img src="/ui/TB20014.png" class="header-gif" />
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
            <div class="dropdown-item" @click="showNoticeModal = true; isSettingsOpen = false; borderNoticeRead()">
              <img src="/ui/announcement.svg" class="item-icon" />
              <span>公告</span>
            </div>
            <div class="dropdown-item app-only" @click="isSettingsOpen = true ; checkUpdate(false)">
              <img src="/ui/update.svg" class="item-icon" />
              <span>检测更新</span>
            </div>
            <div class="dropdown-item" @click="showPrivacyModal = true; isSettingsOpen = false">
              <img src="/ui/privacy.svg" class="item-icon" />
              <span>隐私政策</span>
            </div>
            <div class="dropdown-item" @click="showAboutModal = true; isSettingsOpen = false">
              <img src="/ui/we.svg" class="item-icon" />
              <span>关于我们</span>
            </div>
              <div class="dropdown-item" @click="exportAllData(); isSettingsOpen = false">
              <img src="/ui/export .svg" class="item-icon" />
              <span>导出数据</span>
            </div>
            <div class="dropdown-item" @click="triggerUniversalImport(); isSettingsOpen = false">
              <img src="/ui/output.svg" class="item-icon" />
              <span>导入数据</span>
            </div>
            <div class="dropdown-item donate-entry" @click="showDonateModal = true; isSettingsOpen = false">
              <img src="/ui/sponsor.svg" class="item-icon" />
              <span>赞助支持</span>
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
        <template v-if="route.name === 'lime'">
          <button class="btn-lime-export" @click="exportLimeData">导出数据</button>
          <button class="btn-lime-import" @click="triggerLimeImport">导入数据</button>
          <input type="file" ref="limeFileInput" @change="handleLimeImport" accept=".json" style="display:none" />
        </template>
        <template v-if="route.name === 'talent-manage'">
          <button class="btn-lime-export" @click="viewRef?.exportTalentManagerData?.()">导出数据</button>
          <button class="btn-lime-import" @click="viewRef?.triggerTalentDataImport?.()">导入数据</button>
        </template>
        <input type="file" ref="universalFileInput" @change="handleUniversalImport" accept=".json" style="display:none" />
      </div>
    </div>

    <div class="app-content">
      <router-view v-slot="{ Component }">
        <component :is="Component" ref="viewRef" :showGifs="showGifs" :engineStatus="engineStatus" />
      </router-view>
    </div>

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

    <NoticeModal :show="showNoticeModal" @close="showNoticeModal = false; borderNoticeRead()" />

    <AboutModal :show="showAboutModal" @close="showAboutModal = false" />

    <PrivacyModal
      :show="showPrivacyModal"
      :is-first-launch="isFirstLaunchPrivacy"
      :is-in-app="isInApp"
      :baidu-authorized="baiduAuthorized"
      @toggle-auth="toggleBaiduAuth"
      @agree="agreeToPrivacy"
      @disagree="disagreePrivacy"
      @close="showPrivacyModal = false"
    />

    <UpdateModal :show="showUpdateModal" :updateInfo="updateInfo" @close="showUpdateModal = false" />

    <HotUpdateModal
      v-if="showHotUpdate"
      :pre-checked-manifest="hotUpdateManifest"
      @close="showHotUpdate = false; hotUpdateManifest = null"
      @apply="onHotUpdateApplied"
    />

    <div v-if="showDonateModal" class="custom-modal-overlay" @click.self="showDonateModal = false">
      <div class="custom-modal-card about-modal-card">
        <div class="modal-header about-header" style="position:relative">
          <h3>赞助支持</h3>
          <button class="modal-close-btn" @click="showDonateModal = false">✕</button>
        </div>
        <div class="modal-body donate-body">
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
          <button class="modal-btn-confirm" @click="showDonateModal = false">关闭</button>
        </div>
      </div>
    </div>

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

    <div v-if="showMessageModal" class="custom-modal-overlay" @click.self="showMessageModal = false">
      <div class="custom-modal-card">
        <div class="modal-header">
          <h3>{{ messageModalTitle }}</h3>
        </div>
        <div class="modal-body">
          <p class="modal-title-text" :style="{ color: messageModalType === 'error' ? '#ef4444' : messageModalType === 'success' ? 'var(--success)' : 'var(--text-main)', fontSize: '16px' }">
            {{ messageModalText }}
          </p>
        </div>
        <div class="modal-footer">
          <button class="modal-btn-confirm" @click="showMessageModal = false">确定</button>
        </div>
      </div>
    </div>

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
  --blue: #3b82f6;
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
  overflow-x: hidden;
  overflow-y: hidden;
  transition: background-color 0.3s, color 0.3s;
  min-height: 100vh;
  overscroll-behavior: none;
  -webkit-overflow-scrolling: touch;
}

#app {
  max-width: none !important;
  margin: 0 !important;
  padding: 0 !important;
  display: flex;
  flex-direction: column;
  height: 100vh;
}

/* ===== 顶层 flex 容器 ===== */
.layout-wrapper {
  width: 100% !important;
  max-width: 800px;
  margin: 0 auto;
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  box-sizing: border-box;
  overflow-x: hidden;
}

/* ===== 顶栏：利用 space-between 完美将左右两端推开 ===== */
.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 15px;
  flex-shrink: 0;
  background: var(--bg);
  position: relative;
  z-index: 100;
  width: 100%;
  box-sizing: border-box;
}

/* ===== 内容区 ===== */
.app-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 0 15px 15px 15px;
  box-sizing: border-box;
  position: relative;
  z-index: 0;
  overflow-x: hidden;
}

/* ===== 左侧：移除 flex: 1，添加绝对防挤压 ===== */
.brand-status-section {
  display: flex;
  align-items: center;
  gap: clamp(6px, 1.5vw, 10px);
  min-width: 0;
  flex-shrink: 0;
}

/* Logo 大小支持响应式缩小 */
.header-logo {
  width: clamp(28px, 8vw, 36px);
  height: clamp(28px, 8vw, 36px);
  border-radius: 8px;
  object-fit: cover;
  flex-shrink: 0;
}

/* 标题与状态彻底转为列排版，绝不横向挤压 */
.title-main-info {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  min-width: 0;
  flex: 1;
}

/* 标题容器：变成自然的紧凑横向流，不再两端强行撑开 */
.title-container {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
  min-width: 0;
}

/* 主要标题：加入物理防折行，确保未到极限前不触发胡乱缩小 */
.main-title {
  margin: 0;
  padding: 0;
  font-family: 'HarmonyOS_Bold', sans-serif;
  font-size: clamp(13px, 3.8vw, 16px);
  font-weight: 800;
  color: var(--text-main);
  white-space: nowrap;
  line-height: 1.2;
}

.status-row {
  display: flex;
  align-items: center;
  width: 100%;
  height: 18px;
  min-width: 0;
}

.talent-header-gifs {
  display: flex;
  align-items: center;
  gap: 2px;
  min-width: 0;
  flex-shrink: 1;
  overflow: hidden;
}

.header-gif {
  height: clamp(14px, 4.5vw, 18px);
  width: auto;
  object-fit: contain;
}

/* 状态标签字体及 Padding 自适应 */
.ocr-status-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: clamp(9px, 2.8vw, 11px);
  padding: 1px clamp(3px, 1vw, 6px);
  border-radius: 4px;
  font-weight: 600;
  transition: all 0.3s ease;
  white-space: nowrap;
}

.ocr-status-tag .status-dot {
  width: 5px;
  height: 5px;
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

/* ===== 右侧：操作按钮容器添加防挤压 ===== */
.header-btns {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 1;
  min-width: 0;
}

.header-btns button {
  font-size: clamp(11px, 2.8vw, 13px) !important;
  padding: 6px clamp(4px, 1.2vw, 8px) !important;
  white-space: nowrap;
  box-sizing: border-box;
}

.settings-container {
  position: relative;
  display: flex;
  align-items: center;
}

.btn-icon {
  background: none;
  border: none;
  padding: 0;
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

.settings-dropdown { right: 0; }
.mode-dropdown { left: 0; min-width: 120px; }

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

.dropdown-item:hover, .mode-dropdown-item:hover { background-color: var(--dropdown-hover); }
.mode-dropdown-item.active { color: var(--primary); font-weight: 600; background: rgba(59, 130, 246, 0.05); }
.dark-mode .mode-dropdown-item.active { background: rgba(59, 130, 246, 0.15); }
.item-icon { width: 22px; height: 22px; filter: var(--icon-filter); }

@keyframes slideDown {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

.btn-reset, .btn-upload {
  padding: 8px 14px;
  font-size: clamp(13px, 2.8vw, 14px);
  font-family: inherit;
  line-height: 1.4;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
}
.btn-reset { background: #ef4444; }
.btn-upload { background: var(--success); }
.btn-upload:disabled { background: #94a3b8; cursor: not-allowed; }

.btn-lime-export, .btn-lime-import {
  padding: 6px 8px;
  font-size: clamp(11px, 2.5vw, 12px);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  white-space: nowrap;
  font-family: inherit;
}
.btn-lime-export { background: #3b82f6; }
.btn-lime-import { background: #10b981; }
.btn-lime-export:hover, .btn-lime-import:hover { filter: brightness(1.1); }

/* ===== 右侧模式切换盒子 ===== */
.mode-switcher-container {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  padding: 2px 4px;
}
.mode-switcher-text-row { height: 16px; display: flex; align-items: center; justify-content: center; }
.mode-switcher-arrow-row { height: 12px; display: flex; align-items: center; justify-content: center; }
.mode-switcher-text {
  font-family: 'HarmonyOS_Bold', sans-serif;
  font-size: 10px;
  font-weight: 800;
  color: var(--text-main);
  border: 1px solid currentColor;
  padding: 0px 3px;
  border-radius: 3px;
  white-space: nowrap;
}
.mode-switcher-arrow { width: 11px; height: 11px; filter: var(--icon-filter); transition: transform 0.2s; transform: rotate(180deg); cursor: pointer; }
.mode-switcher-arrow.is-open { transform: rotate(0deg); }

/* 下方其余模态框与组件样式保持不变 */
.custom-modal-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: var(--modal-overlay); backdrop-filter: blur(4px); display: flex; justify-content: center; align-items: center; z-index: 9999; animation: fadeIn 0.2s ease-out; }
.custom-modal-card { background: var(--card-bg); width: 90%; max-width: 400px; border-radius: 16px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1); overflow: hidden; animation: scaleUp 0.25s cubic-bezier(0.34, 1.56, 0.64, 1); border: 1px solid var(--border-color); }
.modal-header { padding: 16px 20px 10px 20px; border-bottom: 1px solid var(--border-color); text-align: center; }
.modal-header h3 { margin: 0; font-size: 14px; color: var(--text-sub); font-weight: 500; }
.modal-body { padding: 24px 20px; text-align: center; }
.modal-title-text { margin: 0 0 6px 0; font-size: 20px; font-weight: bold; color: var(--success); }
.modal-footer { padding: 12px 20px 20px 20px; display: flex; justify-content: center; }
.modal-btn-confirm { padding: 10px 40px; background: var(--primary); color: white; border: none; border-radius: 8px; font-size: 14px; font-weight: bold; cursor: pointer; transition: all 0.2s; }
.feedback-body { text-align: left; padding: 20px 24px; }
.feedback-content p { margin: 12px 0; font-size: 14px; }
.feedback-content a { color: var(--primary); font-weight: bold; }
.feedback-content .hint-text { font-size: 12px; color: var(--text-sub); margin-top: 20px; background: var(--bg); padding: 10px; border-radius: 8px; }
html:not([data-app-shell="true"]) .app-only { display: none !important; }
.donate-entry { border-top: 1px solid rgba(0, 0, 0, 0.06); margin-top: 4px; }
.modal-close-btn { position: absolute; right: 14px; top: 50%; transform: translateY(-50%); background: none; border: none; font-size: 18px; color: var(--text-sub); cursor: pointer; padding: 4px 8px; z-index: 2; }
.modal-close-btn:hover { color: var(--text-main); }
.about-modal-card { max-width: 450px; max-height: 90vh; overflow-y: auto; }
.donate-body { padding: 30px 20px !important; }
.donate-hint { font-size: 14px; color: var(--text-sub); margin-bottom: 20px; }
.donate-qrs { display: flex; flex-direction: column; align-items: center; gap: 30px; }
.qr-item { display: flex; flex-direction: column; align-items: center; gap: 12px; }
.qr-item img { width: 240px; height: auto; border-radius: 8px; border: 1px solid var(--border-color); padding: 4px; background: white; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1); }
.qr-item span { font-size: 13px; font-weight: 500; color: var(--text-main); }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes scaleUp { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }

@media (max-width: 480px) {
  .app-header { padding: 4px 15px 8px 15px; }
  .header-logo { width: 32px; height: 32px; }
  .main-title { font-size: clamp(11px, 3vw, 14px); }
  .btn-icon img { width: 20px; height: 20px; }
  .btn-lime-export, .btn-lime-import { padding: 5px 6px; font-size: 11px; }
  .header-gif { height: 16px; }
  .ocr-status-tag { font-size: 10px; padding: 1px 4px; }
}
</style>