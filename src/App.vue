<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import notices from './assets/notices.json'
import NoticeModal from './components/NoticeModal.vue'
import UpdateModal from './components/UpdateModal.vue'
import BackToTop from './components/BackToTop.vue'
import PrivacyModal from './components/PrivacyModal.vue'
import AboutModal from './components/AboutModal.vue'
import HotUpdateModal from './components/HotUpdateModal.vue'
import { fetchLatestRelease, compareVersions, isUpdateSkippedThisVersion } from './utils/version'
import { imageMatcher } from './utils/imageMatcher'
import { exportData, importData } from './utils/dataTransfer'
import NavigationMenu from './components/NavigationMenu.vue'
import { readStoredArray, writeStoredJson } from './utils/storage'
import { routeLoadingState } from './router'
import { checkHotUpdate } from './utils/hotupdate'

const route = useRoute()
const router = useRouter()

// 匹配引擎状态映射到全局
const engineStatus = ref('loading')

const handleGlobalClick = (e) => {
  if (!e.target.closest('.settings-container')) isSettingsOpen.value = false
  if (!e.target.closest('.sponsor-container')) isSponsorOpen.value = false
  if (!e.target.closest('.title-dropdown-trigger') && !e.target.closest('.nav-fab-btn')) isMenuOpen.value = false
}

/**
 * 图片扩展名回退：.png ↔ .webp
 *
 * 背景：`public/` 下这些目录的图**部分已转 WebP、部分保留 PNG**
 * （转换按"至少省 15%"决定，已有高压缩 WebP 重编码反而变大，故意跳过）。
 * 而路径是 `模板字符串 + .png` 拼出来的（54 处），写死任一扩展名都会对另一部分死链。
 *
 * 做法：不碰那 54 处模板，改用一个**全局捕获阶段**的 error 监听：
 * 图片 404 时若同一路径存在另一种扩展名，就换过去重试一次。
 * 这样 `.png` / `.webp` 两种写法都能正确显示，无需运行时探测、无需改动视图代码。
 *
 * 注意：capture=true 才能捕获到资源加载错误 —— error 事件在 img 上**不冒泡**。
 */
const IMAGE_EXT_DIRS = /^\/(Equip|AreaBlock|RoleCard|RoleDraw|Skill|Header|lime|Shop|DungeonRelics|GodStone|Relics|Rune|Foretell|ParagonPrefix|Bond)\//
const SWAP_EXT = { '.png': '.webp', '.webp': '.png' }

const handleImageError = (e) => {
  const el = e.target
  if (!el || el.tagName !== 'IMG') return
  if (el.dataset.extSwapped === '1') return          // 每种扩展名只试一次，避免死循环
  const current = el.getAttribute('src') || ''
  if (!current.startsWith('/') || !IMAGE_EXT_DIRS.test(current)) return
  const dot = current.lastIndexOf('.')
  if (dot < 0) return
  const ext = current.slice(dot).toLowerCase()
  const alt = SWAP_EXT[ext]
  if (!alt) return
  el.dataset.extSwapped = '1'
  el.src = current.slice(0, dot) + alt
}

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

  // 缓存 APK 版本到 localStorage（供热更后页面重载时稳定读取）
  const apkVer = window.__APK_VERSION__ || window.__APP_VERSION__
  if (apkVer && apkVer !== '0.0.0') {
    localStorage.setItem('apk_cached_version', apkVer)
  }

  // 检查是否在 App 内
  const checkShell = () => {
    const cap = window.Capacitor?.isNativePlatform?.() ?? false
    const attr = document.documentElement.getAttribute("data-app-shell") === "true"
    const hotPath = window.location.href.includes('files/www/') || window.location.href.includes('/data/')
    const hasNativeBridge = typeof window.NativeAnalytics?.acceptPrivacyAndInitialize === 'function'
    isInApp.value = cap || attr || hotPath || hasNativeBridge
    // APK 检查不再用「按天忽略」当闸门 —— 那个开关会连带静默掉热更新（见 version.js 注释）。
    // 是否重复弹窗改由「是否已忽略过这个版本」在 checkUpdate 内部判断。
    if (isInApp.value) {
      setTimeout(() => checkUpdate(true), 1200)
    }
  }
  checkShell()
  if (!isInApp.value) initializeWebAnalytics()

  // 隐私优先：App 首次启动先确认隐私政策，网页版不强制弹窗
  const savedPrivacy = localStorage.getItem('privacy_accepted')
  if (savedPrivacy !== 'true' && isInApp.value) {
    // App 首次启动，弹隐私政策
    setTimeout(() => {
      showPrivacyModal.value = true
      isFirstLaunchPrivacy.value = true
    }, 500)
  } else {
    // 网页版不强制弹窗。
    if (savedPrivacy === null && !isInApp.value) {
      localStorage.setItem('privacy_accepted', 'true')
    }
    if (isInApp.value) initializeAppAnalytics()
    // 已处理过隐私，正常检查公告
    checkNoticeAfterPrivacy()
    // 隐私就绪后，检查热更新
    checkForHotUpdate()
  }

  window.addEventListener('click', handleGlobalClick)
  // 捕获阶段：img 的 error 事件不冒泡，必须用 capture
  window.addEventListener('error', handleImageError, true)

  // ===== 侧滑/物理返回键全局弹窗拦截处理 =====
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

  // 暴露给原生安卓壳子的全局方法（物理返回键优先拦截关闭弹窗）
  window.onAndroidBack = () => {
    const modalEl = getVisibleModal()
    if (modalEl) {
      closeActiveModal(modalEl)
      return true // 已拦截并关闭弹窗
    }
    return false // 交给原生安卓处理
  }
})

onUnmounted(() => {
  window.removeEventListener('click', handleGlobalClick)
  window.removeEventListener('error', handleImageError, true)
  delete window.onAndroidBack
})

const isSettingsOpen = ref(false)
// 深色模式持久化：挂载前就按 localStorage 定好初始值。
// 首帧的防白闪由 index.html 里的内联脚本负责（这里挂载时再补一次确保一致）。
const DARK_MODE_KEY = 'recruit_tool_darkMode'
const isDarkMode = ref(localStorage.getItem(DARK_MODE_KEY) === 'true')
const universalFileInput = ref(null)

// ===== 通用导入导出（合并所有视图数据） =====
/** 生成备份数据（导出文件与复制文本共用同一份内容） */
const buildBackupData = () => {
  const rawCards = readStoredArray('talent_manager_data', { strict: true })
  const compactTM = rawCards.map(card => ({
    charId: card?.baseInfo?.id || card?.charId,
    talentPages: (card?.talentPages || []).map(page => ({
      slots: (page?.slots || []).map(slot => slot?.talent ? { id: slot.talent.uid } : (slot?.id ? { id: slot.id } : null))
    }))
  })).filter(card => typeof card.charId === 'string' && card.charId)
  return [
    { _type: 'lime', data: readStoredArray('my_owned_limes', { strict: true }) },
    { _type: 'talent-manage', data: compactTM },
    { _type: 'fruit-record', data: readStoredArray('fruit_record_data', { strict: true }) }
  ]
}

const exportAllData = () => {
  try {
    exportData(buildBackupData(), `full_backup_${new Date().toISOString().slice(0, 10)}.json`)
  } catch (error) {
    showMessage('导出失败', error.message, 'error')
  }
}

// ===== 数据管理弹窗（导出/导入各有文件与文本两条通道）=====
// 手机端文件选择器常被宿主/文件管理器拒绝（宿主会弹「无法打开文件选择器」），
// 文本通道不依赖系统组件，是手机上的主力通道。
const showDataModal = ref(false)
const showPasteBox = ref(false)
const pasteImportText = ref('')
const dataModalMessage = ref('')
const dataModalMessageType = ref('info')

const setDataModalMessage = (text, type = 'info') => {
  dataModalMessage.value = text
  dataModalMessageType.value = type
}

const openDataModal = () => {
  showDataModal.value = true
  showPasteBox.value = false
  pasteImportText.value = ''
  setDataModalMessage('')
}

const closeDataModal = () => {
  showDataModal.value = false
  showPasteBox.value = false
  pasteImportText.value = ''
  setDataModalMessage('')
}

/** 复制文本到剪贴板：优先 Clipboard API，失败退回 execCommand（旧 WebView） */
const copyText = async (text) => {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch (e) {
    // 继续走兜底方案
  }
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', 'readonly')
    ta.style.position = 'fixed'
    ta.style.top = '-9999px'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    ta.setSelectionRange(0, ta.value.length)
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch (e) {
    return false
  }
}

/** 导出：文件导出 */
const doExportFile = () => {
  try {
    exportData(buildBackupData(), `full_backup_${new Date().toISOString().slice(0, 10)}.json`)
    setDataModalMessage('已生成备份文件，请在系统弹窗里选择保存或分享。', 'success')
  } catch (error) {
    setDataModalMessage('导出失败：' + error.message, 'error')
  }
}

/** 导出：复制文本数据 */
const doExportText = async () => {
  try {
    const json = JSON.stringify(buildBackupData())
    const ok = await copyText(json)
    if (ok) {
      setDataModalMessage(`已复制备份文本（${json.length} 字符），可直接粘贴给别人或存到备忘录。`, 'success')
    } else {
      showPasteBox.value = true
      pasteImportText.value = json
      setDataModalMessage('自动复制被系统拒绝。备份文本已填在下方，请长按全选后手动复制。', 'error')
    }
  } catch (error) {
    setDataModalMessage('导出失败：' + error.message, 'error')
  }
}

/** 导入：文件导入 */
const doImportFromFile = () => {
  const input = universalFileInput.value
  if (!input) {
    setDataModalMessage('文件选择器未就绪，请改用「粘贴文本数据」。', 'error')
    showPasteBox.value = true
    return
  }
  // 重置 value：同一文件连续导入两次时，不重置不会触发 change
  input.value = ''
  // 不设 accept：部分安卓文件管理器/WebView 无法把 .json 解析成 MIME，会把文件过滤掉或直接打不开选择器。
  // 数据合法性由 normalizeImportItem 在读取后校验，这里不做白名单限制。
  input.removeAttribute('accept')
  input.click()
}

/** 导入：读取剪贴板文本 */
const doImportFromClipboard = async () => {
  showPasteBox.value = true
  try {
    if (navigator.clipboard?.readText) {
      const text = await navigator.clipboard.readText()
      if (text && text.trim()) {
        pasteImportText.value = text.trim()
        setDataModalMessage('已读取剪贴板内容，点「确认导入」即可。')
        return
      }
    }
    setDataModalMessage('没能自动读取剪贴板（系统可能禁止），请在下方长按粘贴。')
  } catch (e) {
    setDataModalMessage('没能自动读取剪贴板（系统可能禁止），请在下方长按粘贴。')
  }
}

/** 导入：提交粘贴内容 */
const submitPasteImport = () => {
  const text = pasteImportText.value.trim()
  if (!text) {
    setDataModalMessage('请先粘贴备份内容。', 'error')
    return
  }
  try {
    const count = applyImportData(JSON.parse(text))
    closeDataModal()
    showMessage('提示', `导入成功！共处理 ${count} 项数据`, 'success')
  } catch (err) {
    setDataModalMessage('导入失败：' + err.message, 'error')
  }
}

const isValidDate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
}

const normalizeImportItem = (item) => {
  if (!item || typeof item !== 'object' || !Array.isArray(item.data)) {
    throw new Error('导入项目缺少类型或数据列表')
  }

  if (item._type === 'lime') {
    const data = [...new Set(item.data.filter(id => typeof id === 'string' || typeof id === 'number'))]
    if (data.length !== item.data.length) throw new Error('莱姆数据包含无效编号')
    return { key: 'my_owned_limes', event: 'lime-data-imported', data }
  }

  if (item._type === 'talent-manage') {
    const valid = item.data.every(card => card && typeof card === 'object' &&
      (typeof card.charId === 'string' || typeof card.baseInfo?.id === 'string') &&
      (!card.talentPages || Array.isArray(card.talentPages)))
    if (!valid) throw new Error('天赋管理数据结构无效')
    return { key: 'talent_manager_data', event: 'talent-manager-data-imported', data: item.data }
  }

  if (item._type === 'fruit-record') {
    const data = item.data.map(record => {
      if (!record || !isValidDate(record.date) || !Number.isFinite(record.count)) {
        throw new Error('大果记录包含无效日期或数量')
      }
      return {
        date: record.date,
        count: Math.max(0, Math.floor(record.count)),
        consumed: Math.max(0, Math.floor(Number(record.consumed) || 0)),
        spreadAcrossDays: record.spreadAcrossDays !== false,
        remark: typeof record.remark === 'string' ? record.remark : ''
      }
    })
    return { key: 'fruit_record_data', event: 'fruit-record-imported', data }
  }

  throw new Error(`不支持的数据类型：${item._type || '未知'}`)
}

/** 把导入数据归一化后写入 localStorage（导入/粘贴两条路径共用），失败时回滚 */
const applyImportData = (data) => {
  if (!Array.isArray(data) && !(data && data._type)) {
    throw new Error('数据格式错误：应为数组或包含 _type 的对象')
  }
  const sourceItems = Array.isArray(data) ? data : [data]
  const normalizedItems = sourceItems.map(normalizeImportItem)
  const previousValues = new Map(normalizedItems.map(item => [item.key, localStorage.getItem(item.key)]))
  try {
    normalizedItems.forEach(item => writeStoredJson(item.key, item.data))
  } catch (writeError) {
    previousValues.forEach((value, key) => {
      if (value === null) localStorage.removeItem(key)
      else localStorage.setItem(key, value)
    })
    throw writeError
  }
  normalizedItems.forEach(item => window.dispatchEvent(new CustomEvent(item.event)))
  return normalizedItems.length
}

const handleUniversalImport = async (event) => {
  try {
    const data = await importData(event)
    const count = applyImportData(data)
    closeDataModal()
    showMessage('提示', `导入成功！共处理 ${count} 项数据`, 'success')
  } catch (err) {
    // 文件选择器打不开 / 读取失败时，把用户引到文本粘贴通道
    showPasteBox.value = true
    setDataModalMessage('文件导入失败：' + err.message + '（若选不了文件，请用「粘贴文本数据」）', 'error')
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
  // 写回持久化，刷新后保持主题
  localStorage.setItem(DARK_MODE_KEY, String(isDarkMode.value))
}

const toggleGifs = () => {
  showGifs.value = !showGifs.value
  localStorage.setItem('recruit_tool_showGifs', showGifs.value)
}

const toggleSettings = () => {
  isSettingsOpen.value = !isSettingsOpen.value
  if (isSettingsOpen.value) {
    isMenuOpen.value = false
    isSponsorOpen.value = false
  }
}

// 导航与菜单设置
const isMenuOpen = ref(false)
const menuMode = ref(localStorage.getItem('recruit_tool_menuMode') || 'top')

const saveMenuMode = () => {
  localStorage.setItem('recruit_tool_menuMode', menuMode.value)
}

const modes = [
  { id: 'recruit', name: '指定招募工具', shortName: '招募', path: '/recruit' },
  { id: 'search', name: '综合检索', shortName: '综合', path: '/search' },
  { id: 'talent', name: '天赋筛选工具', shortName: '天赋', path: '/talent' },
  { id: 'subskill', name: '支援筛选工具', shortName: '支援', path: '/subskill' },
  { id: 'unique', name: '技能筛选工具', shortName: '技能', path: '/unique' },
  { id: 'equip', name: '装备筛选工具', shortName: '装备', path: '/equip' },
  { id: 'talent-manage', name: '天赋管理', shortName: '库存', path: '/talent-manage' },
  { id: 'role', name: '角色图鉴', shortName: '角色', path: '/role' },
  { id: 'lime', name: '莱姆图鉴', shortName: '莱姆', path: '/lime' },
  { id: 'prefix', name: '怪物加护', shortName: '加护', path: '/prefix' },
  { id: 'areablock', name: '地块图鉴', shortName: '地块', path: '/areablock' },
  { id: 'foretell', name: '预言图鉴', shortName: '预言', path: '/foretell' },
  { id: 'gambleshop', name: '商人/宝库概率', shortName: '概率', path: '/gambleshop' },
  { id: 'other-prob', name: '其他概率', shortName: '其他', path: '/other-prob' },
  { id: 'equip-prob', name: '金装刷取难易度', shortName: '概率', path: '/equip-prob' },
  { id: 'godstone', name: '神石图鉴', shortName: '神石', path: '/godstone' },
  { id: 'rune', name: '符文图鉴', shortName: '符文', path: '/rune' },
  { id: 'dungeon-relics', name: '星界秘境遗物图鉴', shortName: '遗物', path: '/dungeon-relics' },
  { id: 'guide', name: '新人攻略', shortName: '攻略', path: '/guide' },
  { id: 'fruit-record', name: '大果记录', shortName: '大果', path: '/fruit-record' },
  { id: 'relics', name: '心得图鉴', shortName: '心得', path: '/relics' },
  { id: 'ranking', name: '预告：角色/队伍热度排行', shortName: '预告', path: '/ranking' }
]

const currentModeInfo = computed(() => {
  if (routeLoadingState.active) {
    const loadingMode = modes.find(m => routeLoadingState.path === m.path || routeLoadingState.path.startsWith(m.path + '/'))
    if (loadingMode) return loadingMode
    return {
      name: routeLoadingState.title,
      shortName: routeLoadingState.title,
      path: routeLoadingState.path
    }
  }
  if (route.meta && route.meta.title) {
    const found = modes.find(m => route.path === m.path || route.path.startsWith(m.path + '/'))
    if (found) return found
    return { name: route.meta.title, shortName: route.meta.shortName || route.meta.title, path: route.path }
  }
  const m = modes.find(m => route.path === m.path || route.path.startsWith(m.path + '/'))
  return m || modes[0]
})

const toggleModeDropdown = () => {
  isMenuOpen.value = !isMenuOpen.value
  if (isMenuOpen.value) {
    isSettingsOpen.value = false
    isSponsorOpen.value = false
  }
}

const switchMode = (mode) => {
  router.push(mode.path)
  isMenuOpen.value = false
  isSponsorOpen.value = false
}

// 全局弹窗状态
const showMenuModeModal = ref(false)
const setMenuMode = (mode) => {
  menuMode.value = mode
  saveMenuMode()
}
const showFeedbackModal = ref(false)
const showNoticeModal = ref(false)
const showUpdateModal = ref(false)
const showAboutModal = ref(false)
const showPaymentModal = ref(false)
const paymentType = ref('alipay')
const isSponsorOpen = ref(false)
const toggleSponsor = () => {
  isSponsorOpen.value = !isSponsorOpen.value
  isSettingsOpen.value = false
}
const openPaymentModal = (type) => {
  paymentType.value = type
  showPaymentModal.value = true
  isSponsorOpen.value = false
}
const showPrivacyModal = ref(false)
const showVersionAlert = ref(false)
const versionAlertMessage = ref('')
// 手动「检测更新」时的四版本对比数据（本地/远端 × 包体/热更）
const versionDetail = ref(null)

/** 点击对比面板里的「更新热更」 */
const applyHotFromVersionPanel = () => {
  const m = versionDetail.value?.hotManifest
  if (!m) { showVersionAlert.value = false; return }
  showVersionAlert.value = false
  hotUpdateManifest.value = m
  showHotUpdate.value = true
}

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
// 首次启动隐私同意标记
const isFirstLaunchPrivacy = ref(false)

const baiduSiteId = 'ba00a207e4ac743eb824ad1d9f44ae76'
const pageNames = {
  recruit: '指定招募',
  search: '综合检索',
  talent: '天赋筛选',
  subskill: '支援筛选',
  unique: '技能筛选',
  equip: '装备筛选',
  'fruit-record': '大果记录',
  role: '角色图鉴',
  lime: '莱姆图鉴',
  prefix: '怪物加护',
  areablock: '地块图鉴',
  foretell: '预言图鉴',
  relics: '心得图鉴',
  godstone: '神石图鉴',
  rune: '符文图鉴',
  'dungeon-relics': '星界秘境遗物图鉴',
  'equip-prob': '金装刷取难易度',
  gambleshop: '商人宝库概率',
  'other-prob': '其他概率',
  'talent-manage': '天赋管理',
  guide: '新人攻略',
  ranking: '热度排行'
}

const trackWebPage = () => {
  if (isInApp.value || !window._hmt) return
  const pageName = pageNames[route.name] || route.name
  if (!pageName) return
  window._hmt.push(['_trackPageview', `/app/${encodeURIComponent(pageName)}`])
}

const initializeWebAnalytics = () => {
  if (isInApp.value || document.getElementById('baidu-analytics')) return
  window._hmt = window._hmt || []
  window._hmt.push(['_setAutoPageview', false])
  const script = document.createElement('script')
  script.id = 'baidu-analytics'
  script.async = true
  script.src = `https://hm.baidu.com/hm.js?${baiduSiteId}`
  document.head.appendChild(script)
  trackWebPage()
}

const initializeAppAnalytics = () => {
  if (!isInApp.value) return
  if (window.NativeAnalytics?.acceptPrivacyAndInitialize) {
    window.NativeAnalytics.acceptPrivacyAndInitialize()
  } else {
    console.warn('[Analytics] 当前 App 壳未提供友盟初始化接口')
  }
}

watch(() => route.fullPath, trackWebPage)

// 隐私同意后，再检查公告
const checkNoticeAfterPrivacy = () => {
  const savedNoticeVer = localStorage.getItem('saved_notice_version')
  if (noticeVersion.value && noticeVersion.value !== savedNoticeVer) {
    showNoticeModal.value = true
  }
}

const agreeToPrivacy = () => {
  localStorage.setItem('privacy_accepted', 'true')
  initializeAppAnalytics()
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

// 检查热更新（静默检测，有更新就弹窗）
// 注意：**不设人为延时**。原实现先 sleep 1500ms 再取清单，是「进软件好几秒才弹」的主因之一。
// 启动后立刻发起，网络往返本身就是耗时，没必要再加等待。
const checkForHotUpdate = async () => {
  if (!isInApp.value) { console.log('[HotUpdate] 非 App 环境，跳过'); return }
  const m = await checkHotUpdate()
  console.log('[HotUpdate] 检测结果:', m ? '有更新 version=' + m.version + ' needApk=' + m._needsApkUpdate : '无更新')
  if (m) {
    if (m._needsApkUpdate) {
      // 热更包跨了 base 版本（含原生改动），必须走 APK 更新；不弹热更弹窗
      checkUpdate(true)
    } else {
      // 先弹窗、体积后补：packageSize 的 probe 是额外网络请求，不能让它拖住弹窗出现
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
    // 本地两个版本：包体（APK）与热更（Web 资源）
    const nativeVer = window.__APK_VERSION__
    if (nativeVer && nativeVer !== '0.0.0') localStorage.setItem('apk_cached_version', nativeVer)
    const cachedVer = localStorage.getItem('apk_cached_version')
    const localApkVer = (nativeVer || cachedVer || window.__APP_VERSION__ || '0.0.0').replace(/^v?/, 'v')
    const localWebVer = (localStorage.getItem('local_web_version') || localApkVer).replace(/^v?/, 'v')

    // 远端两个版本：APK Release 与热更清单
    const info = await fetchLatestRelease()
    const remoteApkVer = String(info.version || '').replace(/^v?/, 'v')

    let hot = null
    try { hot = await checkHotUpdate() } catch { hot = null }
    const remoteWebVer = hot ? String(hot.version).replace(/^v?/, 'v') : localWebVer

    const apkOutdated = compareVersions(remoteApkVer, localApkVer) > 0
    const webOutdated = hot !== null && !hot._needsApkUpdate   // 有热更且不跨 base

    const detail = {
      localApkVer,
      remoteApkVer,
      localWebVer,
      remoteWebVer,
      apkOutdated,
      webOutdated,
      // 远程热更跨了 base，但 Release 里还没有对应 APK
      apkNotPublished: hot !== null && hot._needsApkUpdate,
      hotManifest: hot,
    }
    versionDetail.value = detail

    if (silent) {
      // 静默检查：只弹真正需要的那个弹窗，不弹对比面板
      if (apkOutdated) {
        if (isUpdateSkippedThisVersion(remoteApkVer)) {
          console.log('[Update] ' + remoteApkVer + ' 已被用户跳过，静默不弹')
          return
        }
        updateInfo.value = info
        showUpdateModal.value = true
      } else if (webOutdated) {
        hotUpdateManifest.value = hot
        showHotUpdate.value = true
      }
      return
    }

    // 手动检查：APK 有更新 → 直接进 APK 弹窗；否则展示版本对比
    if (apkOutdated) {
      updateInfo.value = info
      showUpdateModal.value = true
      return
    }
    showVersionAlert.value = true
  } catch (e) {
    if (!silent) {
      versionDetail.value = null
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
      <div class="header-content">
      <div class="brand-status-section">
        <img src="/logo.webp" alt="Logo" class="header-logo" />
        <div class="title-dropdown-trigger" @click.stop="toggleModeDropdown">
          <h1 class="main-title">
            {{ currentModeInfo.name }}
            <img src="/ui/down-top.svg" class="title-dropdown-arrow" :class="{ 'is-open': isMenuOpen }" />
          </h1>
        </div>
      </div>

      <div class="header-btns">
        <!-- 赞助按键容器（包含 GIF 和文字以扩大点击面积） -->
        <div class="sponsor-container" @click.stop="toggleSponsor" style="cursor: pointer;">
          <!-- 赞助 GIF -->
          <img v-show="showGifs" src="/gif/zc.gif" alt="zc" class="sponsor-gif game-sprite" />
          
          <button class="btn-sponsor" title="赞助">
            赞助
          </button>
          
          <div v-if="isSponsorOpen" class="settings-dropdown sponsor-dropdown" @click.stop>
            <div class="dropdown-item" @click="openPaymentModal('alipay')">
              <img src="/ui/Alipay Payment.svg" class="item-icon" />
              <span>支付宝</span>
            </div>
            <div class="dropdown-item" @click="openPaymentModal('wechat')">
              <img src="/ui/WeChat Pay.svg" class="item-icon" />
              <span>微信</span>
            </div>
          </div>
        </div>

        <div class="settings-container">
          <button class="btn-icon" @click.stop="toggleSettings" title="设置">
            <img src="/ui/setting.svg" alt="设置" />
          </button>

          <div v-if="isSettingsOpen" class="settings-dropdown">
            <div class="dropdown-item" @click="toggleTheme">
              <img :src="isDarkMode ? '/ui/theme-light.svg' : '/ui/theme-dark.svg'" class="item-icon" />
              <span>{{ isDarkMode ? '浅色模式' : '深色模式' }}</span>
            </div>
            <div class="dropdown-item mobile-only" @click="showMenuModeModal = true; isSettingsOpen = false">
              <img src="/ui/menu.svg" class="item-icon" />
              <span>切换菜单模式</span>
            </div>
            <div class="dropdown-item" @click="toggleGifs">
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
              <div class="dropdown-item" @click="openDataModal(); isSettingsOpen = false">
              <img src="/ui/export .svg" class="item-icon" />
              <span>数据管理</span>
            </div>
          </div>
        </div>



        <!-- 导入用文件输入：常驻 DOM（不能放在 v-if 下拉里），且必须 display:none -->
        <input
          type="file"
          ref="universalFileInput"
          class="universal-file-input"
          hidden
          @change="handleUniversalImport"
        />
      </div>
      </div>
    </div>

    <div class="main-layout-row">
      <!-- 电脑端侧边栏：复刻参考项目，紧贴中间内容区左侧 -->
      <div class="desktop-sidebar-container desktop-only">
        <NavigationMenu :is-desktop="true" menu-mode="side" />
      </div>

      <main class="app-content">
        <div v-if="routeLoadingState.active" class="route-loading-state" role="status" aria-live="polite">
          <div class="route-loading-spinner" aria-hidden="true"></div>
          <div class="route-loading-copy">
            <span>正在加载{{ routeLoadingState.title }}...</span>
            <span class="route-loading-hint">第一次加载缓慢，请耐心等待</span>
          </div>
        </div>
        <router-view v-else v-slot="{ Component }">
          <component :is="Component" ref="viewRef" :showGifs="showGifs" :engineStatus="engineStatus" />
        </router-view>
      </main>

      <!-- 右侧空白占位，保证 app-content 完美居中 -->
      <div class="desktop-right-spacer desktop-only"></div>
    </div>

    <div v-if="showFeedbackModal" class="custom-modal-overlay" @click.self="showFeedbackModal = false">
      <div class="custom-modal-card">
        <div class="modal-header">
          <h3>反馈/建议</h3>
        </div>
        <div class="modal-body feedback-body">
          <p class="modal-title-text">💬 遇到问题？联系反馈</p>
          <div class="feedback-content">
              <p>方式一：【 <a href="https://qm.qq.com/q/cUvhuRHvhK" target="_blank" rel="noopener noreferrer">QQ联系</a> 】</p>
              <p>方式二：【 <a href="https://f.kdocs.cn/g/y4Uu95na/" target="_blank" rel="noopener noreferrer">填写在线表单</a> 】</p>
            <p class="hint-text">如有建议，建议使用QQ联系，更方便交流</p>
              <p style="margin-top:8px"><a href="https://qun.qq.com/universal-share/share?ac=1&authKey=4xp%2BlCmM2Q2gVIvW6a14yOEVtT%2BPLsY9DwmNSDRVTBkp8xcNO%2FTRo%2FOksMb528aW&busi_data=eyJncm91cENvZGUiOiI5NjQ3Njg3OTkiLCJ0b2tlbiI6Im1abkR4eDNDb09HeDZtV2QvNi9ZOTlMNWRhQVQxSDVGK2hSUmlmdkd6bm9hNGRIYjZnWFB6QitBd1A5NVhscmMiLCJ1aW4iOiIxOTY1MTYxNjQzIn0%3D&data=CcXqRPXmezEwvtBwz950aSAyBxYHidOpffYEE8nD1EB-WDcAI-CLzvlLLIavd-lpEuHEP9fCXE5i5Sh3aGjUmw&svctype=4&tempid=h5_group_info" target="_blank" rel="noopener noreferrer" style="color:#3b82f6;font-weight:bold">点击链接加入群聊【幻想少女公会助手反馈交流群】</a></p>
          </div>
        </div>
        <div class="modal-footer">
          <button class="modal-btn-confirm" @click="showFeedbackModal = false">确定</button>
        </div>
      </div>
    </div>

    <NoticeModal :show="showNoticeModal" @close="showNoticeModal = false; borderNoticeRead()" />

    <!-- 导航菜单样式选择弹窗（移动端显示） -->
    <div v-if="showMenuModeModal" class="custom-modal-overlay mobile-only" @click.self="showMenuModeModal = false">
      <div class="custom-modal-card">
        <div class="modal-header">
          <h3>切换菜单模式</h3>
        </div>
        <div class="modal-body nav-mode-modal-body">
          <p class="modal-hint">请选择您偏好的导航展示样式：</p>
          <div class="nav-mode-options">
            <div
              class="nav-mode-option-card"
              :class="{ active: menuMode === 'top' }"
              @click="setMenuMode('top')"
            >
              <div class="option-header">
                <span class="option-title">顶部菜单</span>
                <span class="option-check" v-if="menuMode === 'top'">✓</span>
              </div>
              <span class="option-desc">下拉面板形式，从顶部标题栏自然展开</span>
            </div>

            <div
              class="nav-mode-option-card"
              :class="{ active: menuMode === 'bottom' }"
              @click="setMenuMode('bottom')"
            >
              <div class="option-header">
                <span class="option-title">底部菜单</span>
                <span class="option-check" v-if="menuMode === 'bottom'">✓</span>
              </div>
              <span class="option-desc">抽屉卡片形式，从底部向上滑出展现</span>
            </div>

            <div
              class="nav-mode-option-card"
              :class="{ active: menuMode === 'side' }"
              @click="setMenuMode('side')"
            >
              <div class="option-header">
                <span class="option-title">侧边菜单</span>
                <span class="option-check" v-if="menuMode === 'side'">✓</span>
              </div>
              <span class="option-desc">抽屉菜单形式，从屏幕右侧向左滑出</span>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="modal-btn-confirm" @click="showMenuModeModal = false">确定</button>
        </div>
      </div>
    </div>

    <AboutModal :show="showAboutModal" @close="showAboutModal = false" />

    <PrivacyModal
      :show="showPrivacyModal"
      :is-first-launch="isFirstLaunchPrivacy"
      @agree="agreeToPrivacy"
      @close="showPrivacyModal = false"
    />

    <UpdateModal :show="showUpdateModal" :updateInfo="updateInfo" @close="showUpdateModal = false" />

    <HotUpdateModal
      v-if="showHotUpdate"
      :pre-checked-manifest="hotUpdateManifest"
      @close="showHotUpdate = false; hotUpdateManifest = null"
      @apply="onHotUpdateApplied"
    />

    <div v-if="showPaymentModal" class="custom-modal-overlay" @click.self="showPaymentModal = false">
      <div class="custom-modal-card about-modal-card">
        <div class="modal-header about-header" style="position:relative">
          <h3>赞助支持</h3>
          <button class="modal-close-btn" @click="showPaymentModal = false">✕</button>
        </div>
        <div class="modal-body donate-body" style="text-align: center; padding: 20px 24px;">
          <p class="donate-hint" style="color: var(--text-sub); margin-bottom: 16px; font-size: 14px;">感谢您的慷慨赞助，资金将用于工具维护与功能开发！</p>
          <div class="donate-qrs" style="display: flex; justify-content: center; margin-top: 15px;">
            <div class="qr-item" style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
              <img :src="paymentType === 'alipay' ? '/ui/Alipay.webp' : '/ui/WeChatPay.webp'" :alt="paymentType === 'alipay' ? '支付宝' : '微信支付'" style="width: 210px; height: auto; border-radius: 12px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);" />
              <span style="font-size: 14px; font-weight: 600; color: var(--text-main); margin-top: 6px;">{{ paymentType === 'alipay' ? '支付宝扫码' : '微信扫码' }}</span>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="modal-btn-confirm" @click="showPaymentModal = false">关闭</button>
        </div>
      </div>
    </div>

    <div v-if="showVersionAlert" class="custom-modal-overlay" @click.self="showVersionAlert = false">
      <div class="custom-modal-card">
        <div class="modal-header">
          <h3>{{ versionDetail ? '版本检测' : '系统提示' }}</h3>
        </div>
        <div class="modal-body">
          <!-- 有对比数据：展示 本地/远端 × 包体/热更 四个版本 -->
          <template v-if="versionDetail">
            <div class="version-grid">
              <div class="version-grid-head"></div>
              <div class="version-grid-head">本地版本</div>
              <div class="version-grid-head">远端版本</div>

              <div class="version-grid-label">包体版本</div>
              <div class="version-grid-cell">{{ versionDetail.localApkVer }}</div>
              <div class="version-grid-cell" :class="{ 'is-newer': versionDetail.apkOutdated }">
                {{ versionDetail.remoteApkVer }}
                <span v-if="versionDetail.apkOutdated" class="version-tag">可更新</span>
              </div>

              <div class="version-grid-label">热更版本</div>
              <div class="version-grid-cell">{{ versionDetail.localWebVer }}</div>
              <div class="version-grid-cell" :class="{ 'is-newer': versionDetail.webOutdated }">
                {{ versionDetail.remoteWebVer }}
                <span v-if="versionDetail.webOutdated" class="version-tag">可更新</span>
              </div>
            </div>

            <p class="version-summary" :class="{ 'is-ok': !versionDetail.webOutdated && !versionDetail.apkNotPublished }">
              <template v-if="versionDetail.apkNotPublished">
                远端热更跨了包体大版本，但对应的安装包还没发布，请稍后再试。
              </template>
              <template v-else-if="versionDetail.webOutdated">
                热更新有新版，点下方按钮立即更新。
              </template>
              <template v-else>
                包体与热更均为最新版本。
              </template>
            </p>
          </template>

          <!-- 无对比数据（例如请求失败）：退回纯文本 -->
          <p v-else class="modal-title-text" style="color:var(--text-main);font-size:16px">{{ versionAlertMessage }}</p>
        </div>
        <div class="modal-footer">
          <button
            v-if="versionDetail && versionDetail.webOutdated"
            class="modal-btn-confirm"
            @click="applyHotFromVersionPanel"
          >更新热更</button>
          <button class="modal-btn-confirm" @click="showVersionAlert = false; versionDetail = null">确定</button>
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

    <!-- 数据管理：导出（存文件 / 复制文本）+ 导入（选文件 / 粘贴文本）
         手机端文件选择器常被宿主拒绝，故文本通道与文件通道并列提供 -->
    <div v-if="showDataModal" class="custom-modal-overlay" @click.self="closeDataModal">
      <div class="custom-modal-card import-modal-card">
        <div class="modal-header">
          <h3>数据管理</h3>
          <button class="modal-close-x" @click="closeDataModal">✕</button>
        </div>
        <div class="modal-body">
          <!-- ===== 导出 ===== -->
          <div class="data-modal-section-title">
            <span>导出备份</span>
          </div>

          <button class="import-method-btn" @click="doExportFile">
            <img src="/ui/export .svg" class="import-method-icon" />
            <span class="import-method-copy">
              <span class="import-method-title">文件导出</span>
              <span class="import-method-desc">生成 full_backup_日期.json 并保存/分享</span>
            </span>
          </button>

          <button class="import-method-btn" @click="doExportText">
            <img src="/ui/output.svg" class="import-method-icon" />
            <span class="import-method-copy">
              <span class="import-method-title">复制文本数据</span>
              <span class="import-method-desc">把备份内容复制到剪贴板，自己发给别人或存备忘</span>
            </span>
          </button>

          <!-- ===== 导入 ===== -->
          <div class="data-modal-section-title">
            <span>导入备份</span>
          </div>

          <button class="import-method-btn" @click="doImportFromFile">
            <img src="/ui/output.svg" class="import-method-icon" />
            <span class="import-method-copy">
              <span class="import-method-title">文件导入</span>
              <span class="import-method-desc">从手机文件里选 .json 备份</span>
            </span>
          </button>

          <button class="import-method-btn" @click="doImportFromClipboard">
            <img src="/ui/export .svg" class="import-method-icon" />
            <span class="import-method-copy">
              <span class="import-method-title">粘贴文本数据</span>
              <span class="import-method-desc">直接读取剪贴板里的备份文本</span>
            </span>
          </button>

          <!-- 粘贴区：自动读取失败时手填 -->
          <div v-if="showPasteBox" class="paste-import-box">
            <div class="paste-import-hint">
              若没能自动读取剪贴板，请长按下面的输入框粘贴备份内容：
            </div>
            <textarea
              v-model="pasteImportText"
              class="paste-import-textarea"
              rows="5"
              placeholder='粘贴备份文本，例如：[{"_type":"lime","data":["LM01001"]}]'
            ></textarea>
            <button class="modal-btn-confirm paste-import-submit" :disabled="!pasteImportText.trim()" @click="submitPasteImport">
              确认导入
            </button>
          </div>

          <div v-if="dataModalMessage" class="data-modal-message" :class="dataModalMessageType">
            {{ dataModalMessage }}
          </div>
        </div>
      </div>
    </div>

    <BackToTop />

    <!-- 右下角悬浮切换菜单按钮（移动端显示） -->
    <div class="nav-fab-btn mobile-only" @click.stop="isMenuOpen = !isMenuOpen" title="功能导航">
      <span></span>
      <span></span>
      <span></span>
    </div>

    <!-- 全局多样式菜单切换组件（移动端显示） -->
    <NavigationMenu class="mobile-only" :isOpen="isMenuOpen" :menuMode="menuMode" @close="isMenuOpen = false" />
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

/* ================= 全局统一样式滚动条 ================= */
::-webkit-scrollbar {
  width: 7px !important;
  height: 7px !important;
}

::-webkit-scrollbar-track {
  background: transparent !important;
}

::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.10) !important;
  border-radius: 10px !important;
  transition: background-color 0.2s ease;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.15) !important;
}

::-webkit-scrollbar-thumb:active {
  background: rgba(0, 0, 0, 0.22) !important;
}

::-webkit-scrollbar-corner {
  background: transparent !important;
}

/* 夜间模式全局滚动条适配 */
.dark-mode ::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.12) !important;
}

.dark-mode ::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.18) !important;
}

.dark-mode ::-webkit-scrollbar-thumb:active {
  background: rgba(255, 255, 255, 0.25) !important;
}

/* Shared overflow protection for expandable filter cards. */
.page-filter-scroll {
  --filter-panel-reserved-space: 220px;
  max-height: calc(100vh - var(--filter-panel-reserved-space));
  max-height: calc(100dvh - var(--filter-panel-reserved-space));
  overflow-y: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
  touch-action: pan-y;
  scrollbar-gutter: stable;
}

@media (max-width: 767px) {
  * {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }

  .page-filter-scroll {
    scrollbar-gutter: auto;
  }

  *::-webkit-scrollbar {
    display: none;
    width: 0 !important;
    height: 0 !important;
  }
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
  max-width: none !important;
  margin: 0 auto;
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  box-sizing: border-box;
  overflow-x: hidden;
}

/* ===== 顶栏：全宽背景，内部内容保持 800px 居中 ===== */
.app-header {
  flex-shrink: 0;
  background: var(--bg);
  border-bottom: 1px solid var(--border-color);
  position: relative;
  z-index: 100;
  width: 100%;
  box-sizing: border-box;
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: 800px;
  margin: 0 auto;
  padding: 10px 15px;
  box-sizing: border-box;
  width: 100%;
}

/* ===== 内容区 ===== */
.app-content {
  flex: 0 1 800px;
  width: 100%;
  min-width: 0;
  max-width: 800px;
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 0 15px 15px 15px;
  box-sizing: border-box;
  position: relative;
  z-index: 0;
  overflow-x: hidden;
}

.route-loading-state {
  width: 100%;
  min-height: calc(100vh - 110px);
  min-height: calc(100dvh - 110px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: var(--text-sub, #64748b);
  font-size: 14px;
}

.route-loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid rgba(64, 158, 255, 0.2);
  border-top-color: #409eff;
  border-radius: 50%;
  animation: route-loading-spin 0.8s linear infinite;
}

.route-loading-copy {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  text-align: center;
}

.route-loading-hint {
  font-size: 12px;
  opacity: 0.72;
}

@keyframes route-loading-spin {
  to { transform: rotate(360deg); }
}

/* ===== 桌面端三列布局：左占位+侧边栏 / 内容 / 右占位 ===== */
.main-layout-row {
  flex: 1;
  min-height: 0;
  display: flex;
  width: 100%;
  position: relative;
  overflow: hidden;
}

.desktop-sidebar-container {
  flex: 1;
  min-height: 0;
  display: flex;
  justify-content: flex-end; /* 让侧边栏紧贴中间内容左侧 */
  overflow-y: auto;
}

.desktop-sidebar-container > .navigation-wrapper {
  height: auto;
}

.desktop-right-spacer {
  flex: 1;
}

/* 桌面端/移动端显示控制（复刻参考项目） */
@media (min-width: 769px) {
  .mobile-only {
    display: none !important;
  }
}
@media (max-width: 768px) {
  .desktop-only {
    display: none !important;
  }
}

/* 桌面端标题不再作为下拉菜单，隐藏箭头并禁用点击 */
@media (min-width: 769px) {
  .title-dropdown-trigger {
    pointer-events: none;
    cursor: default;
  }
  .title-dropdown-arrow {
    display: none;
  }
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

.main-title {
  margin: 0;
  padding: 3px 0px;
  font-family: 'HarmonyOS_Bold', sans-serif;
  font-size: clamp(22px, 2vw, 24px);
  font-weight: 600;
  color: var(--text-main);
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  gap: 0;
  white-space: nowrap;
  line-height: 1.0;
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
  font-size: 13px;
  padding: 6px 6px;
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

/* 导入用文件输入：必须 display:none —— 用 clip/opacity 隐藏时，部分浏览器
   仍会画出原生「选择文件」控件（在弹窗里多出一个带 ✕ 的白框）。
   display:none 的 input 依然可以被 JS click() 唤起选择器。 */
.universal-file-input {
  display: none;
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

.title-dropdown-trigger {
  position: relative;
  cursor: pointer;
  user-select: none;
  min-width: 0;
}

.title-dropdown-arrow {
  width: 14px;
  height: 14px;
  filter: var(--icon-filter);
  transition: transform 0.2s ease;
  transform: rotate(0deg); /* 收起时：向下 */
  opacity: 0.85;
}

.title-dropdown-arrow.is-open {
  transform: rotate(180deg); /* 展开时：翻转向上 */
}

/* 下方其余模态框与组件样式保持不变 */
.custom-modal-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: var(--modal-overlay); backdrop-filter: blur(4px); display: flex; justify-content: center; align-items: center; z-index: 9999; animation: fadeIn 0.2s ease-out; }
.custom-modal-card { background: var(--card-bg); width: 90%; max-width: 400px; border-radius: 16px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1); overflow: hidden; animation: scaleUp 0.25s cubic-bezier(0.34, 1.56, 0.64, 1); border: 1px solid var(--border-color); }
.modal-header { padding: 16px 20px 10px 20px; border-bottom: 1px solid var(--border-color); text-align: center; }
.modal-header h3 { margin: 0; font-size: 16px; color: var(--text-main); font-weight: 600; }
.modal-body { padding: 24px 20px; text-align: center; }
.modal-title-text { margin: 0 0 6px 0; font-size: 20px; font-weight: bold; color: var(--success); }
.modal-footer { padding: 12px 20px 20px 20px; display: flex; justify-content: center; }
.modal-btn-confirm { padding: 10px 40px; background: var(--primary); color: white; border: none; border-radius: 8px; font-size: 14px; font-weight: bold; cursor: pointer; transition: all 0.2s; }
.feedback-body { text-align: left; padding: 20px 24px; }
.feedback-content p { margin: 12px 0; font-size: 14px; }
.feedback-content a { color: var(--primary); font-weight: bold; }
.feedback-content .hint-text { font-size: 12px; color: var(--text-sub); margin-top: 20px; background: var(--bg); padding: 10px; border-radius: 8px; }
html:not([data-app-shell="true"]) .app-only { display: none !important; }

/* ===== 版本检测对比面板 ===== */
.version-grid {
  display: grid;
  grid-template-columns: auto 1fr 1fr;
  gap: 1px;
  background: var(--border-color);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  overflow: hidden;
  font-size: 13px;
}
.version-grid-head {
  background: var(--bg);
  padding: 7px 10px;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-sub);
  text-align: center;
}
.version-grid-label {
  background: var(--bg);
  padding: 9px 10px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-sub);
  white-space: nowrap;
}
.version-grid-cell {
  background: var(--card-bg);
  padding: 9px 10px;
  color: var(--text-main);
  font-variant-numeric: tabular-nums;
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: center;
}
.version-grid-cell.is-newer {
  color: var(--primary);
  font-weight: 700;
}
.version-tag {
  font-size: 10px;
  font-weight: 600;
  color: #fff;
  background: var(--primary);
  border-radius: 4px;
  padding: 1px 5px;
  white-space: nowrap;
}
.version-summary {
  margin: 12px 0 0 0;
  font-size: 13px;
  line-height: 1.5;
  color: #d97706;
  background: rgba(245, 158, 11, 0.1);
  border-radius: 8px;
  padding: 9px 12px;
  overflow-wrap: anywhere;
}
.version-summary.is-ok {
  color: #059669;
  background: rgba(16, 185, 129, 0.1);
}

/* ===== 导入数据弹窗 ===== */
.import-modal-card { max-width: 440px; }
.import-modal-card .modal-header { position: relative; }
.modal-close-x {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  font-size: 16px;
  line-height: 1;
  color: var(--text-sub);
  cursor: pointer;
  padding: 6px 8px;
}
.modal-close-x:hover { color: var(--text-main); }
.import-modal-card .modal-body {
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px 18px 18px 18px;
}
.data-modal-section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-sub);
  margin-top: 2px;
}
.data-modal-section-title::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--border-color);
}
.import-method-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  text-align: left;
  background: var(--bg);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 10px 12px;
  cursor: pointer;
  transition: all 0.2s;
}
.import-method-btn:hover { border-color: var(--primary); }
/* 这些 ui/*.svg 是 fill="white" 的单色图标，必须套 --icon-filter 才能在浅色/
   深色背景下可见（与 .item-icon / .btn-icon img 同一套规则），漏掉会「看不见图标」。 */
.import-method-icon { width: 22px; height: 22px; flex-shrink: 0; filter: var(--icon-filter); }
.import-method-copy { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.import-method-title { font-size: 13px; font-weight: 600; color: var(--text-main); }
.import-method-desc { font-size: 11px; color: var(--text-sub); line-height: 1.4; }
.paste-import-box { display: flex; flex-direction: column; gap: 8px; }
.paste-import-hint {
  font-size: 11px;
  line-height: 1.4;
  color: var(--text-sub);
  overflow-wrap: anywhere;
}
.paste-import-textarea {
  width: 100%;
  min-height: 100px;
  background: var(--bg);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 12px;
  font-family: inherit;
  line-height: 1.5;
  color: var(--text-main);
  outline: none;
  box-sizing: border-box;
  resize: vertical;
  overflow-wrap: anywhere;
}
.paste-import-textarea:focus { border-color: var(--primary); }
.paste-import-submit { align-self: flex-end; padding: 8px 20px; }
.paste-import-submit:disabled { opacity: 0.5; cursor: not-allowed; }
.data-modal-message {
  font-size: 12px;
  line-height: 1.45;
  padding: 8px 10px;
  border-radius: 7px;
  overflow-wrap: anywhere;
  background: rgba(59, 130, 246, 0.08);
  color: var(--text-sub);
}
.data-modal-message.success { background: rgba(16, 185, 129, 0.12); color: #059669; }
.data-modal-message.error { background: rgba(239, 68, 68, 0.1); color: #ef4444; }

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
  .header-content { padding: 4px 15px 8px 15px; }
  .header-logo { width: 32px; height: 32px; }
  .main-title { font-size: clamp(16px, 1vw, 18px); }
  .btn-icon img { width: 20px; height: 20px; }
  .btn-lime-export, .btn-lime-import { padding: 5px 6px; font-size: 11px; }
  .header-gif { height: 16px; }
  .ocr-status-tag { font-size: 10px; padding: 1px 4px; }
}

@media (max-width: 380px) {
  .app-content { padding-left: 12px; padding-right: 12px; }
}

@media (max-width: 340px) {
  .app-content { padding-left: 10px; padding-right: 10px; }
}

/* ===== 右下角悬浮切换菜单按钮 ===== */
.nav-fab-btn {
  position: fixed;
  right: 16px;
  left: auto;
  bottom: 96px; /* 偏上一些，不要和回到顶部按键叠在一起 */
  width: 54px;
  height: 54px;
  border-radius: 50%;
  background: var(--card-bg, rgba(255, 255, 255, 0.85));
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.6));
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 4px;
  z-index: 990;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  -webkit-tap-highlight-color: transparent;
}
.nav-fab-btn span {
  display: block;
  width: 20px;
  height: 2px;
  background-color: var(--text-main, #333);
  border-radius: 2px;
  transition: all 0.2s;
}
.nav-fab-btn:hover {
  transform: translateY(-4px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.25);
}
.nav-fab-btn:active {
  transform: translateY(-2px);
  filter: brightness(0.9);
}

/* 导航菜单样式选择弹窗 */
.nav-mode-modal-body {
  text-align: left !important;
  padding: 20px 24px !important;
}
.modal-hint {
  font-size: 13px;
  color: var(--text-sub);
  margin-bottom: 16px;
}
.nav-mode-options {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.nav-mode-option-card {
  padding: 14px 16px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
  background: var(--bg-hover, rgba(0,0,0,0.01));
}
.nav-mode-option-card:hover {
  background: var(--dropdown-hover);
}
.nav-mode-option-card.active {
  border-color: var(--primary);
  background: rgba(59, 130, 246, 0.04);
}
.dark-mode .nav-mode-option-card.active {
  background: rgba(59, 130, 246, 0.12);
}
.option-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}
.option-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-main);
}
.option-check {
  color: var(--primary);
  font-weight: bold;
}
.option-desc {
  font-size: 12px;
  color: var(--text-sub);
}

@media (max-width: 600px) {
  .nav-fab-btn {
    right: 16px;
    left: unset;
    bottom: 84px; /* 偏上一些，防与回到顶部重叠 */
    width: 48px;
    height: 48px;
    gap: 4px;
  }
  .nav-fab-btn span {
    width: 18px;
    height: 2px;
  }
}

/* ===== 顶部栏赞助按键与 GIF 动效样式 ===== */
.sponsor-gif {
  height: 38px;
  width: auto;
  object-fit: contain;
  margin-right: 0px;
}
.sponsor-container {
  position: relative;
  display: flex;
  align-items: center;
}
.btn-sponsor {
  background: linear-gradient(135deg, #fef4d8 0%, #f6d48a 100%);
  color: #a46714;
  border: 1px solid transparent;
  border-radius: 6px;
  font-weight: bold;
  padding: 6px 12px !important;
  font-size: 14px !important;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
}
.btn-sponsor:hover, .sponsor-container:hover .btn-sponsor {
  filter: brightness(1.08);
}
.dark-mode .btn-sponsor {
  background: linear-gradient(135deg, #443118 0%, #2f210d 100%);
  color: #f6d48a;
  border: 1px solid #7d541c;
}
.sponsor-dropdown {
  right: 0;
  width: 120px !important;
  height: auto !important;
  min-height: auto !important;
  max-height: none !important;
}
.sponsor-dropdown .dropdown-item {
  padding: 10px 14px !important;
  font-size: 13px !important;
  gap: 8px !important;
}
.sponsor-dropdown .item-icon {
  filter: none !important;
}
</style>
