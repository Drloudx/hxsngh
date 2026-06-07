<script setup>
import { ref, computed, onMounted } from 'vue'
import allData from './assets/data.json'
import notices from './assets/notices.json'
import { ImageMatcher } from './utils/imageMatcher'
import NoticeModal from './components/NoticeModal.vue'

const filterCols = ['星级', '职业', '种族', '属性', '地区']
const selectedTags = ref([])
const isMatchingLoading = ref(false)
const fileInput = ref(null)
const imageMatcher = new ImageMatcher()

// 设置与深色模式状态
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
}

// 点击外部关闭下拉菜单 & 读取本地存储的 GIF 状态
onMounted(() => {
  // 读取 GIF 显隐状态
  const savedShowGifs = localStorage.getItem('recruit_tool_showGifs')
  if (savedShowGifs !== null) {
    showGifs.value = savedShowGifs === 'true'
  }

  const savedUnowned = localStorage.getItem('unowned_characters')
  if (savedUnowned) {
    try { unownedChars.value = JSON.parse(savedUnowned) } catch(e) {}
  }

  const savedNoticeVer = localStorage.getItem('saved_notice_version')
  if (noticeVersion.value && noticeVersion.value !== savedNoticeVer) {
    showNoticeModal.value = true
  }

  window.addEventListener('click', (e) => {
    if (!e.target.closest('.settings-container')) {
      isSettingsOpen.value = false
    }
  })
})

// 控制弹窗状态
const showResultModal = ref(false)
const showFeedbackModal = ref(false)
const showWishModal = ref(false)
const unownedChars = ref([])
const showNoticeModal = ref(false)
const matchResultTags = ref([])

const rarityMap = { 3: '传说', 2: '史诗', 1: '稀有', 0: '普通' }
const wishGroups = computed(() => [3, 2, 1, 0].map(r => ({ title: rarityMap[r], rarity: r, characters: allData.filter(c => c.稀有度 === r) })))

const toggleUnowned = (name) => {
  const idx = unownedChars.value.indexOf(name)
  if (idx >= 0) {
    unownedChars.value.splice(idx, 1)
  } else {
    unownedChars.value.push(name)
  }
  localStorage.setItem('unowned_characters', JSON.stringify(unownedChars.value))
}

const isUnowned = (name) => unownedChars.value.indexOf(name) >= 0

const searchQuery = ref('')
const expandedGroups = ref([3, 2, 1, 0])
const filteredWishGroups = computed(() => {
  if (!searchQuery.value) return wishGroups.value
  const q = searchQuery.value
  return wishGroups.value.map(g => ({ ...g, characters: g.characters.filter(c => { let i=0; for(let j=0;j<c.角色名.length&&i<q.length;j++){if(c.角色名[j]===q[i])i++} return i===q.length; }) }))
})

const toggleGroup = (rarity) => {
  const idx = expandedGroups.value.indexOf(rarity)
  if (idx >= 0) { expandedGroups.value.splice(idx, 1) } else { expandedGroups.value.push(rarity) }
}
const isGroupExpanded = (rarity) => expandedGroups.value.indexOf(rarity) >= 0

const noticeVersion = computed(() => {
  if (notices.length === 0) return ''
  const latest = notices.filter(n => !n.pinned)[0]
  return latest.date + '-' + (latest.title || '')
})
const markNoticeRead = () => {
  localStorage.setItem('saved_notice_version', noticeVersion.value)
}



// 匹配引擎加载状态: 'loading' | 'ready' | 'error'
const engineStatus = ref('loading')

onMounted(() => {
  console.log('🌐 网页已挂载，开始在后台静默预热匹配引擎...')
  engineStatus.value = 'loading'

  imageMatcher.init()
    .then(() => {
      console.log('✨ 后台预热成功！匹配模型已加载，随时可识别。')
      engineStatus.value = 'ready'
    })
    .catch((err) => {
      console.error('❌ 后台预热失败:', err)
      engineStatus.value = 'error'
    })
})

const tagsByCol = computed(() => {
  const result = {}
  filterCols.forEach(col => {
    if (col === '星级') {
      result[col] = ['传说', '史诗']
    } else {
      result[col] = [...new Set(allData.map(i => i[col]))]
    }
  });
  return result
})

const toggleTag = (val) => {
  if (selectedTags.value.includes(val)) {
    selectedTags.value = selectedTags.value.filter(t => t !== val)
  } else {
    selectedTags.value.push(val)
  }
}

const resetTags = () => {
  selectedTags.value = []
}

const triggerUpload = () => {
  fileInput.value.click()
}

const handleFileUpload = async (event) => {
  const file = event.target.files[0]
  if (!file) return

  isMatchingLoading.value = true
  try {
    const reader = new FileReader()
    reader.onload = async (e) => {
      const img = new Image()
      img.onload = async () => {
        try {
          if (engineStatus.value !== 'ready') {
            engineStatus.value = 'loading'
            await imageMatcher.init()
            engineStatus.value = 'ready'
          }

          const result = await imageMatcher.match(img)
          const { matched } = result

          selectedTags.value = []
          matched.forEach(tag => {
            if (!selectedTags.value.includes(tag)) {
              selectedTags.value.push(tag)
            }
          })

          matchResultTags.value = matched
          showResultModal.value = true

        } catch (err) {
          console.error('Matching failed:', err)
          engineStatus.value = 'error'
          alert(`识别失败！\n\n错误原因：${err.message}`)
        } finally {
          isMatchingLoading.value = false
        }
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  } catch (err) {
    console.error('File upload failed:', err)
    isMatchingLoading.value = false
  }
  event.target.value = ''
}

const isMatch = (role, tag) => {
  if (tag === '传说') return role.稀有度 === 3
  if (tag === '史诗') return role.稀有度 === 2
  return role.职业 === tag || role.种族 === tag || role.属性 === tag || role.地区 === tag
}

const getCombos = (arr, n) => {
  let res = []
  const f = (s, p) => {
    if (p.length === n) { res.push(p); return; }
    for (let i = s; i < arr.length; i++) f(i + 1, [...p, arr[i]]);
  }
  f(0, []); return res;
}

const filteredResults = computed(() => {
  if (selectedTags.value.length === 0) return []

  let combos = []
  for (let i = 1; i <= Math.min(selectedTags.value.length, 3); i++) {
    combos.push(...getCombos(selectedTags.value, i))
  }

  return combos.map(c => {
    let f = allData.filter(r => c.every(tag => isMatch(r, tag)))
    if (f.length === 0) return null
    let minR = Math.min(...f.map(r => r.稀有度))
    let hasGold = f.some(r => r.稀有度 === 3) ? 1 : 0
    let unownedBonus = (minR >= 2 && f.some(r => unownedChars.value.includes(r.角色名))) ? 1000 : 0

    return {
      c,
      f: f.sort((a, b) => b.稀有度 - a.稀有度),
      minR,
      w: minR * 100 + hasGold * 10 + c.length * 0.1 + unownedBonus
    }
  }).filter(x => x).sort((a, b) => b.w - a.w)
})

const statsText = computed(() => {
  if (selectedTags.value.length === 0) return '请点击标签开始'
  const guaranteeCount = filteredResults.value.filter(x => x.minR >= 2).length
  return `分析完毕：发现 ${guaranteeCount} 组保底组合`
})

const getBadge = (minR) => {
  if (minR >= 3) return { text: '顶级招募', class: 'badge-top' }
  if (minR >= 2) return { text: '资深保底', class: 'badge-senior' }
  return null
}
</script>

<template>
  <div class="container">
    <div class="header-bar">
      <!-- 左侧：品牌与状态区 -->
      <div class="brand-status-section">
        <img src="/logo1.png" alt="Logo" class="header-logo" />
        <div class="title-container">
          <h1 class="main-title">指定招募工具</h1>
          <span class="ocr-status-tag" :class="'status-' + engineStatus">
            <span class="status-dot"></span>
            {{ engineStatus === 'loading' ? '识别模块预加载中' : engineStatus === 'ready' ? '识别模块就绪' : '识别模块加载失败' }}
          </span>
        </div>
      </div>

      <!-- 右侧：操作按钮区 -->
      <div class="header-btns">
        <div class="settings-container">
          <button class="btn-icon" @click.stop="toggleSettings" title="设置">
            <img src="/setting.svg" alt="设置" />
          </button>

          <div v-if="isSettingsOpen" class="settings-dropdown">
            <div class="dropdown-item" @click="toggleTheme">
              <img :src="isDarkMode ? '/theme-light.svg' : '/theme-dark.svg'" class="item-icon" />
              <span>{{ isDarkMode ? '浅色模式' : '深色模式' }}</span>
            </div>
            <div class="dropdown-item" @click="toggleGifs">
              <!-- 修正图标逻辑：显示GIF时显示“隐藏”图标，隐藏GIF时显示“显示”图标 -->
              <img :src="showGifs ? '/visibility-off.svg' : '/visibility.svg'" class="item-icon" />
              <span>{{ showGifs ? '隐藏GIF动画' : '显示GIF动画' }}</span>
            </div>
            <div class="dropdown-item" @click="showFeedbackModal = true; isSettingsOpen = false">
              <img src="/feedback.svg" class="item-icon" />
              <span>反馈/建议</span>
            </div>
            <div class="dropdown-item" @click="showNoticeModal = true; isSettingsOpen = false; markNoticeRead()">
              <img src="/announcement.svg" class="item-icon" />
              <span>公告</span>
            </div>
            <div class="dropdown-item" @click="showWishModal = true; isSettingsOpen = false">
              <img src="/wish.svg" class="item-icon" />
              <span>心愿招募</span>
            </div>
          </div>
        </div>

        <button
          class="btn-upload"
          @click="triggerUpload"
          :disabled="isMatchingLoading" >
          {{ isMatchingLoading ? '识别中...' : '上传截图' }}
        </button>
        <button class="btn-reset" @click="resetTags">重置</button>
      </div>
      <input type="file" ref="fileInput" @change="handleFileUpload" accept="image/*" style="display: none">
    </div>

    <!-- 给 filter-section 添加动态类，用于控制底部间距 -->
    <div class="filter-section" :class="{ 'no-gifs': !showGifs }">
      <div v-for="col in filterCols" :key="col" class="filter-group">
        <div class="filter-label">{{ col }}</div>
        <div class="tags-container">
          <span
            v-for="val in tagsByCol[col]"
            :key="val"
            class="tag"
            :class="{
                active: selectedTags.includes(val),
                'tag-rarity-3': val === '传说',
                'tag-rarity-2': val === '史诗'
            }"
            @click="toggleTag(val)"
          >
            {{ val }}
          </span>
        </div>
      </div>

      <!-- GIF 容器，使用 v-show 控制显隐 -->
      <div class="footer-gifs" v-show="showGifs">
        <div class="gif-group left-group">
          <img src="/gif/lzx.gif" alt="lzx" class="bottom-gif" />
          <img src="/gif/cl.gif" alt="cl" class="bottom-gif" />
        </div>
        <div class="gif-group right-group">
          <img src="/gif/ysgz.gif" alt="ysgz" class="bottom-gif" />
          <img src="/gif/hfmn.gif" alt="hfmn" class="bottom-gif" />
        </div>
      </div>
    </div>

    <div class="result-stats">{{ statsText }}</div>

    <div id="resultsArea">
      <template v-if="selectedTags.length === 0">
        <div class="no-data">未选择任何标签</div>
      </template>
      <template v-else-if="filteredResults.length === 0">
        <div class="no-data">无匹配组合</div>
      </template>
      <template v-else>
        <div v-for="(item, index) in filteredResults" :key="index" class="combo-card">
          <div class="combo-header">
            <div class="combo-tags-box">
              <span class="tag-count-badge"> {{ item.c.length }}词条 </span>
              <template v-for="(t, idx) in item.c" :key="t">
                <span class="combo-name-blue">{{ t }}</span>
                <span v-if="idx < item.c.length - 1" class="plus-sign">+</span>
              </template>
            </div>
            <div class="status-right">
              <span v-if="getBadge(item.minR)" class="badge-guarantee" :class="getBadge(item.minR).class">
                {{ getBadge(item.minR).text }}
              </span>
              <span class="people-count">{{ item.f.length }}人</span>
            </div>
          </div>
          <table class="result-table">
            <thead>
              <tr>
                <th class="col-name">角色</th>
                <th class="col-other">职业</th>
                <th class="col-other">种族</th>
                <th class="col-other">属性</th>
                <th class="col-other">地区</th>
                <th class="col-rarity">★</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in item.f" :key="r.角色名">
                <td class="col-name" :class="'rarity-' + r.稀有度">
                  {{ r.角色名 }}<img v-if="isUnowned(r.角色名)" src="/mid_ico_map_0001.png" class="unowned-icon" />
                </td>
                <td class="col-other">{{ r.职业 }}</td>
                <td class="col-other">{{ r.种族 }}</td>
                <td class="col-other">{{ r.属性 }}</td>
                <td class="col-other">{{ r.地区 }}</td>
                <td class="col-rarity" :class="'rarity-' + r.稀有度">{{ r.稀有度 }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </div>

    <!-- 识别结果弹窗 -->
    <div v-if="showResultModal" class="custom-modal-overlay" @click.self="showResultModal = false">
      <div class="custom-modal-card">
        <div class="modal-header">
          <h3>识别结果</h3>
        </div>
        <div class="modal-body">
          <p class="modal-title-text">匹配完毕！</p>
          <p class="modal-sub-text">成功匹配的标签：</p>
          <div class="modal-tags-grid">
            <template v-if="matchResultTags.length > 0">
              <span
                v-for="tag in matchResultTags"
                :key="tag"
                class="tag active"
                :class="{
                  'tag-rarity-3': tag === '传说',
                  'tag-rarity-2': tag === '史诗'
                }"
              >
                {{ tag }}
              </span>
            </template>
            <span v-else class="no-tag-hint">无</span>
          </div>
        </div>
        <div class="modal-footer">
          <button class="modal-btn-confirm" @click="showResultModal = false">确定</button>
        </div>
      </div>
    </div>

    <!-- 反馈建议弹窗 -->
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
          </div>
        </div>
        <div class="modal-footer">
          <button class="modal-btn-confirm" @click="showFeedbackModal = false">确定</button>
        </div>
      </div>
    </div>

    <!-- 公告弹窗 -->
    <NoticeModal :show="showNoticeModal" @close="showNoticeModal = false; markNoticeRead()" />

    <!-- 心愿招募弹窗 -->
    <div v-if="showWishModal" class="custom-modal-overlay" @click.self="showWishModal = false">
      <div class="custom-modal-card wish-modal-card">
        <div class="modal-header">
          <h3>心愿招募</h3>
        </div>
        <div class="modal-body wish-modal-body">
          <div class="wish-search-box">
            <img src="/search.svg" class="search-icon" />
            <input type="text" v-model="searchQuery" placeholder="搜索角色名称..." class="wish-search-input" />
          </div>
          <div v-for="group in filteredWishGroups" :key="group.rarity" class="wish-group">
            <div class="wish-group-title" :class="'wish-title-' + group.rarity" @click="toggleGroup(group.rarity)">
              <span>{{ group.title }}</span>
              <img src="/up.svg" class="collapse-icon" :class="{ collapsed: !isGroupExpanded(group.rarity) }" />
            </div>
            <div v-if="isGroupExpanded(group.rarity)" class="wish-tags-container">
              <span
                v-for="char in group.characters"
                :key="char.角色名"
                class="wish-tag"
                :class="'wish-tag-rarity-' + group.rarity + (isUnowned(char.角色名) ? ' wish-tag-unowned' : '')"
                @click="toggleUnowned(char.角色名)"
              >
                {{ char.角色名 }}
              </span>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="modal-btn-confirm" @click="showWishModal = false">确定</button>
        </div>
      </div>
    </div>
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
  --gold: #f97316;
  --purple: #a855f7;
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
  --text-main: #f8fafc;
  --text-sub: #94a3b8;
  --border-color: #334155;
  --header-bg: #1e293b;
  --dropdown-hover: #334155;
  --modal-overlay: rgba(0, 0, 0, 0.6);
  --icon-filter: brightness(0) saturate(100%) invert(91%) sepia(5%) saturate(542%) hue-rotate(181deg) brightness(96%) contrast(87%);
}

body {
  font-family: 'HarmonyOS_Regular', "PingFang SC", "Microsoft YaHei", sans-serif;
  background: var(--bg);
  padding: 15px;
  padding-bottom: 15px !important;
  color: var(--text-main);
  margin: 0;
  display: block !important;
  transition: background-color 0.3s, color 0.3s;
}

#app {
  max-width: none !important;
  margin: 0 !important;
  padding: 0 !important;
  display: block !important;
}

.container {
  width: 100% !important;
  max-width: 800px;
  margin: 0 auto;
  flex: 1;
  display: flex;
  flex-direction: column;
}
#resultsArea {
  flex: 1;
}

.header-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0;
  padding: 10px 0;
}

.brand-status-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

.title-container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: flex-start;
  gap: 3px;
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

/* 下拉菜单 — 纯色背景，无玻璃态 */
.settings-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 8px;
  width: 160px;
  z-index: 1000;
  background: var(--card-bg);
  border-radius: 12px;
  border: 1px solid var(--border-color);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  animation: slideDown 0.2s ease-out;
}

.dropdown-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  cursor: pointer;
  font-size: 14px;
  color: var(--text-main);
  transition: background-color 0.2s;
  gap: 10px;
}

.dropdown-item:first-child { border-top-left-radius: 12px; border-top-right-radius: 12px; }
.dropdown-item:last-child { border-bottom-left-radius: 12px; border-bottom-right-radius: 12px; }
.dropdown-item:hover { background-color: var(--dropdown-hover); }

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

.filter-section {
  position: relative;
  background: var(--card-bg);
  border-radius: 12px;
  padding: 15px;
  padding-bottom: 30px;   /* 为 GIF 预留空间，默认有 GIF */
  margin-bottom: 15px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  border: 1px solid var(--border-color);
  transition: padding-bottom 0.2s ease;
}

/* 当 GIF 隐藏时，去掉底部预留空间 */
.filter-section.no-gifs {
  padding-bottom: 15px;
}

.filter-group { margin-bottom: 10px; display: flex; align-items: flex-start; }
.filter-label { font-weight: 600; width: 50px; color: var(--text-sub); font-size: 13px; padding-top: 6px; flex-shrink: 0; }
.tags-container { display: flex; flex-wrap: wrap; gap: 6px; }

.tag {
  padding: 4px 10px;
  background: var(--bg);
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  border: 1px solid var(--border-color);
  color: var(--text-main);
}

.tag.active { background: #dbeafe; color: var(--primary); border-color: var(--primary); font-weight: 600; }
.dark-mode .tag.active { background: rgba(59, 130, 246, 0.2); }
.tag-rarity-3.active { background: #ffedd5; color: var(--gold); border-color: var(--gold); }
.dark-mode .tag-rarity-3.active { background: rgba(249, 115, 22, 0.2); }
.tag-rarity-2.active { background: #f3e8ff; color: var(--purple); border-color: var(--purple); }
.dark-mode .tag-rarity-2.active { background: rgba(168, 85, 247, 0.2); }

.result-stats {
  margin-bottom: 15px;
  font-size: 13px;
  padding: 10px 15px;
  background: #eff6ff;
  border-radius: 8px;
  color: #1e40af;
  border-left: 4px solid var(--primary);
}

.dark-mode .result-stats { background: rgba(59, 130, 246, 0.1); color: #93c5fd; }

.combo-card {
  width: 100%;
  background: var(--card-bg);
  border-radius: 12px;
  margin-bottom: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  border: 1px solid var(--border-color);
}

.combo-header {
  padding: 10px 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--card-bg);
  border-bottom: 1px solid var(--border-color);
  flex-wrap: wrap;
  gap: 8px;
}

.combo-tags-box { display: flex; align-items: center; gap: 4px; flex-wrap: wrap; flex: 1; min-width: 200px; }
.tag-count-badge { background: var(--text-sub); color: #fff; padding: 2px 6px; border-radius: 12px; font-size: 10px; flex-shrink: 0; margin-right: 4px; }
.combo-name-blue { color: var(--primary); font-weight: bold; background: #eff6ff; padding: 2px 8px; border-radius: 4px; font-size: 13px; white-space: nowrap; }
.dark-mode .combo-name-blue { background: rgba(59, 130, 246, 0.2); }
.plus-sign { color: var(--text-sub); font-size: 12px; }
.status-right { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
.badge-guarantee { padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; color: #fff; white-space: nowrap; }
.badge-top { background: #f97316; }
.badge-senior { background: #a855f7; }
.people-count { color: var(--text-sub); font-size: 11px; white-space: nowrap; }

.result-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
.result-table th { background: var(--bg); color: var(--text-sub); font-size: 11px; text-align: left; padding: 8px 12px; font-weight: 400; }
.result-table td { padding: 10px 12px; font-size: 13px; border-top: 1px solid var(--border-color); white-space: nowrap; color: var(--text-main); }
.col-name { width: 30%; font-weight: 600; }
.col-other { width: 14%; }
.result-table th.col-rarity, .result-table td.col-rarity { text-align: center; width: 40px; }
.result-table td.rarity-3 { color: var(--gold); font-weight: bold; }
.result-table td.rarity-2 { color: var(--purple); font-weight: bold; }

.no-data { text-align: center; padding: 50px; color: var(--text-sub); background: var(--card-bg); border-radius: 12px; font-size: 14px; border: 1px solid var(--border-color); }

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

.modal-tags-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-start;
  background: var(--bg);
  padding: 14px;
  border-radius: 10px;
  border: 1px solid var(--border-color);
  width: 100%;
  box-sizing: border-box;
}

.modal-footer { padding: 12px 20px 20px 20px; display: flex; justify-content: center; }
.modal-btn-confirm { padding: 10px 40px; background: var(--primary); color: white; border: none; border-radius: 8px; font-size: 14px; font-weight: bold; cursor: pointer; transition: all 0.2s; }

.feedback-body { text-align: left; padding: 20px 24px; }
.feedback-content p { margin: 12px 0; font-size: 14px; }
.feedback-content a { color: var(--primary); font-weight: bold; }
.feedback-content .hint-text { font-size: 12px; color: var(--text-sub); margin-top: 20px; background: var(--bg); padding: 10px; border-radius: 8px; }

.footer-gifs {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  box-sizing: border-box;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  padding: 0 15px;
  z-index: 5;
  pointer-events: none;
}

.gif-group {
  display: flex;
  align-items: flex-end;
  gap: 15px;
  width: 45%;
}

.bottom-gif {
  height: 40px;
  width: auto;
  object-fit: contain;
  filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.15));
  transition: transform 0.3s ease;
  pointer-events: auto;
}

.bottom-gif:hover {
  transform: scale(1.1) translateY(-5px);
}

.left-group { justify-content: flex-start; }
.right-group { justify-content: flex-end; }

@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes scaleUp { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }

/* 心愿招募弹窗 */
.wish-modal-card {
  max-width: 500px !important;
}

.wish-modal-body {
  max-height: 420px;
  overflow-y: auto;
  text-align: left !important;
  padding: 16px 20px !important;
}

.wish-modal-body::-webkit-scrollbar {
  width: 6px;
}
.wish-modal-body::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 10px;
}

.wish-group {
  margin-bottom: 20px;
}

.wish-group:last-child {
  margin-bottom: 0;
}

.wish-group-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 800;
  margin-bottom: 8px;
  padding-bottom: 4px;
  border-bottom: 2px solid var(--border-color);
}

.wish-title-3 { color: #f97316; }
.wish-title-2 { color: #a855f7; }
.wish-title-1 { color: #79C37A; }
.wish-title-0 { color: #7FAECB; }

.wish-tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.wish-tag {
  width: 76px;
  text-align: center;
  padding: 5px 4px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  border: 1.5px solid transparent;
  transition: all 0.2s ease;
  user-select: none;
}

.wish-tag-rarity-3 {
  background: #fff7ed;
  color: #c2410c;
  border-color: #fed7aa;
}

.wish-tag-rarity-2 {
  background: #faf5ff;
  color: #7e22ce;
  border-color: #e9d5ff;
}

.wish-tag-rarity-1 {
  background: #f0fdf4;
  color: #15803d;
  border-color: #bbf7d0;
}

.wish-tag-rarity-0 {
  background: #f0f9ff;
  color: #1d4ed8;
  border-color: #bae6fd;
}

.dark-mode .wish-tag-rarity-3 {
  background: rgba(249, 115, 22, 0.15);
  color: #fb923c;
  border-color: rgba(249, 115, 22, 0.3);
}

.dark-mode .wish-tag-rarity-2 {
  background: rgba(168, 85, 247, 0.15);
  color: #c084fc;
  border-color: rgba(168, 85, 247, 0.3);
}

.dark-mode .wish-tag-rarity-1 {
  background: rgba(121, 195, 122, 0.15);
  color: #86efac;
  border-color: rgba(121, 195, 122, 0.3);
}

.dark-mode .wish-tag-rarity-0 {
  background: rgba(127, 174, 203, 0.15);
  color: #93c5fd;
  border-color: rgba(127, 174, 203, 0.3);
}

.wish-tag.wish-tag-unowned {
  border-width: 2px;
  font-weight: 700;
}

.wish-tag-rarity-3.wish-tag-unowned {
  background: #f97316;
  color: #fff;
  border-color: #f97316;
  box-shadow: 0 0 0 2px rgba(249, 115, 22, 0.3);
}

.wish-tag-rarity-2.wish-tag-unowned {
  background: #a855f7;
  color: #fff;
  border-color: #a855f7;
  box-shadow: 0 0 0 2px rgba(168, 85, 247, 0.3);
}

.wish-tag-rarity-1.wish-tag-unowned {
  background: #79C37A;
  color: #fff;
  border-color: #79C37A;
  box-shadow: 0 0 0 2px rgba(121, 195, 122, 0.3);
}

.wish-tag-rarity-0.wish-tag-unowned {
  background: #7FAECB;
  color: #fff;
  border-color: #7FAECB;
  box-shadow: 0 0 0 2px rgba(127, 174, 203, 0.3);
}

.dark-mode .wish-tag-rarity-3.wish-tag-unowned {
  background: #ea580c;
  color: #fff;
  border-color: #ea580c;
}

.dark-mode .wish-tag-rarity-2.wish-tag-unowned {
  background: #9333ea;
  color: #fff;
  border-color: #9333ea;
}

.dark-mode .wish-tag-rarity-1.wish-tag-unowned {
  background: #16a34a;
  color: #fff;
  border-color: #16a34a;
}

.dark-mode .wish-tag-rarity-0.wish-tag-unowned {
  background: #2563eb;
  color: #fff;
  border-color: #2563eb;
}

.unowned-icon {
  width: 16px;
  height: 16px;
  vertical-align: middle;
  margin-left: 4px;
}

.wish-search-box {
  display: flex;
  align-items: center;
  margin-bottom: 14px;
  background: var(--bg);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 6px 10px;
}

.search-icon {
  width: 16px;
  height: 16px;
  filter: var(--icon-filter);
  margin-right: 8px;
  flex-shrink: 0;
}

.wish-search-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 13px;
  color: var(--text-main);
  font-family: inherit;
}

.wish-search-input::placeholder {
  color: var(--text-sub);
}

.collapse-icon {
  width: 14px;
  height: 14px;
  transition: transform 0.25s ease;
  margin-left: auto;
  filter: var(--icon-filter);
  flex-shrink: 0;
}

.collapse-icon.collapsed {
  transform: rotate(180deg);
}

</style>
