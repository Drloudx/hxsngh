<script setup>
import { ref, computed, onMounted } from 'vue'
import allData from './assets/data.json'
import { ImageMatcher } from './utils/imageMatcher'

const filterCols = ['星级', '职业', '种族', '属性', '地区']
const selectedTags = ref([])
const isMatchingLoading = ref(false)
const fileInput = ref(null)
const imageMatcher = new ImageMatcher()

// 🌟 新增：设置与深色模式状态
const isSettingsOpen = ref(false)
const isDarkMode = ref(false)

const toggleTheme = () => {
  isDarkMode.value = !isDarkMode.value
  if (isDarkMode.value) {
    document.documentElement.classList.add('dark-mode')
  } else {
    document.documentElement.classList.remove('dark-mode')
  }
}

const toggleSettings = () => {
  isSettingsOpen.value = !isSettingsOpen.value
}

// 点击外部关闭下拉菜单
onMounted(() => {
  window.addEventListener('click', (e) => {
    if (!e.target.closest('.settings-container')) {
      isSettingsOpen.value = false
    }
  })
})

// 🌟 新增：控制自定义弹窗状态
const showResultModal = ref(false)
const showFeedbackModal = ref(false) // 🌟 反馈弹窗
const showNoticeModal = ref(false)   // 🌟 公告弹窗
const matchResultTags = ref([]) // 存储成功匹配到的标签数组

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

          // 🌟 核心修改：不再调用 alert，而是将结果写入变量并打开自定义弹窗
          matchResultTags.value = matched
          showResultModal.value = true

        } catch (err) {
          console.error('Matching failed:', err)
          engineStatus.value = 'error'
          alert(`识别失败！\n\n错误原因：${err.message}`) // 错误提示可保留或按同样逻辑修改
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

// 检查角色是否匹配某个标签
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

    return {
      c,
      f: f.sort((a, b) => b.稀有度 - a.稀有度),
      minR,
      w: minR * 100 + hasGold * 10 + c.length * 0.1
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
      <h2 class="title-with-logo">
        <img src="/logo1.png" alt="Logo" class="header-logo" />
        指定招募工具
        <span class="ocr-status-tag" :class="'status-' + engineStatus">
          <span class="status-dot"></span>
          {{ engineStatus === 'loading' ? '' : engineStatus === 'ready' ? '' : '引擎加载失败' }}
        </span>
      </h2>
      <div class="header-btns">
        <!-- 🌟 新增：设置下拉菜单 -->
        <div class="settings-container">
          <button class="btn-icon" @click.stop="toggleSettings">
            <img src="/setting.svg" alt="设置" />
          </button>
          
          <div v-if="isSettingsOpen" class="settings-dropdown glass-card">
            <div class="dropdown-item" @click="toggleTheme">
              <img :src="isDarkMode ? '/theme-light.svg' : '/theme-dark.svg'" class="item-icon" />
              <span>{{ isDarkMode ? '浅色模式' : '深色模式' }}</span>
            </div>
            <div class="dropdown-item" @click="showFeedbackModal = true; isSettingsOpen = false">
              <img src="/feedback.svg" class="item-icon" />
              <span>反馈/建议</span>
            </div>
            <div class="dropdown-item" @click="showNoticeModal = true; isSettingsOpen = false">
              <img src="/announcement.svg" class="item-icon" />
              <span>公告</span>
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

    <div class="filter-section">
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
                <td class="col-name" :class="'rarity-' + r.稀有度">{{ r.角色名 }}</td>
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

    <!-- 🌟 新增：反馈建议弹窗 -->
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

    <!-- 🌟 新增：官方公告弹窗 -->
    <div v-if="showNoticeModal" class="custom-modal-overlay" @click.self="showNoticeModal = false">
      <div class="custom-modal-card">
        <div class="modal-header">
          <h3>官方公告</h3>
        </div>
        <div class="modal-body notice-body">
          <div class="notice-list">
            <div class="notice-item">
              <span class="notice-date">6.1</span>
              <p>补充了“雪原”标签的识别</p>
            </div>
            <div class="notice-item">
              <span class="notice-date">5.22</span>
              <p>补充了“史诗”标签的识别</p>
            </div>
            <div class="notice-item">
              <span class="notice-date">5.17</span>
              <p>添加了地区标签“星界”</p>
            </div>
            <div class="notice-item">
              <span class="notice-date">5.16</span>
              <p>修复了“佣兵枪手”标签错误，属性由“地系”更正为“火系”</p>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="modal-btn-confirm" @click="showNoticeModal = false">确定</button>
        </div>
      </div>
    </div>

  </div>
</template>

<style>
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
  /* 🌟 新增：图标颜色过滤器 (#1e293b) */
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
  /* 🌟 暗色模式下图标填充色改为 #cbd5e1 */
  --icon-filter: brightness(0) saturate(100%) invert(91%) sepia(5%) saturate(542%) hue-rotate(181deg) brightness(96%) contrast(87%);
}

body {
  font-family: "PingFang SC", "Microsoft YaHei", sans-serif;
  background: var(--bg);
  padding: 15px;
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
}

/* 🎯 优化：顶栏恢复 space-between，让两端对齐 */
.header-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

/* 🌟 新增：设置容器 */
.settings-container {
  position: relative;
  display: flex;
  align-items: center;
}

.btn-icon {
  background: none;
  border: none;
  padding: 6px; /* 💡 缩减 Padding 从 8px 到 6px */
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
  width: 24px;  /* 💡 增大图标尺寸 从 20px 到 24px */
  height: 24px;
  filter: var(--icon-filter);
}

.settings-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 8px;
  width: 160px;
  z-index: 1000;
  border: 1px solid var(--border-color);
  animation: slideDown 0.2s ease-out;
}

.glass-card {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-radius: 12px;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
}

.dark-mode .glass-card {
  background: rgba(30, 41, 59, 0.8);
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);
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

.dropdown-item:first-child {
  border-top-left-radius: 12px;
  border-top-right-radius: 12px;
}

.dropdown-item:last-child {
  border-bottom-left-radius: 12px;
  border-bottom-right-radius: 12px;
}

.dropdown-item:hover {
  background-color: var(--dropdown-hover);
}

.item-icon {
  width: 22px;  /* 💡 增大下拉菜单图标 从 18px 到 22px */
  height: 22px;
  filter: var(--icon-filter);
}

@keyframes slideDown {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* 🎯 优化：让标题、状态标签紧密挨着，不再被 margin-right: auto 强行推开 */
.title-with-logo {
  display: flex;
  align-items: center;
  font-size: 1.05rem;
  margin: 0;
}

/* 🎯 优化：OCR状态标签，通过 margin-left 控制它与标题的固定间距 */
.ocr-status-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 20px;
  margin-left: 12px; /* 💡 控制标题与OCR状态的固定间距 */
  font-weight: 500;
  transition: all 0.3s ease;
  white-space: nowrap;
}

/* 🎯 优化：右侧按钮组，通过 gap 控制两个按钮之间的固定间距 */
.header-btns {
  display: flex;
  align-items: center;
  gap: 8px; /* 💡 两个按钮之间的间距 */
  flex-shrink: 0;
  margin-left: 12px; /* 💡 兜底间距，防止极窄屏下死死贴着OCR标签 */
}

.header-logo {
  width: 30px;
  height: 30px;
  margin-right: 8px;
  vertical-align: middle;
}

.ocr-status-tag .status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  display: inline-block;
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
  background: rgba(5, 150, 105, 0.2);
  color: #34d399;
}

.ocr-status-tag.status-ready .status-dot {
  background: #10b981;
  box-shadow: 0 0 6px rgba(16, 185, 129, 0.6);
}

.ocr-status-tag.status-error {
  background: #fef2f2;
  color: #dc2626;
}

.dark-mode .ocr-status-tag.status-error {
  background: rgba(220, 38, 38, 0.2);
  color: #f87171;
}

.ocr-status-tag.status-error .status-dot {
  background: #ef4444;
}

@keyframes status-blink {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; }
}

/* 🎯 优化：将按钮左右内边距从 14px 缩小到 8px，紧凑精致 */
.btn-reset {
  padding: 6px 8px; /* 💡 缩减了左右 Padding */
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  white-space: nowrap;
  flex-shrink: 0;
}

/* 🎯 优化：将按钮左右内边距从 14px 缩小到 8px */
.btn-upload {
  padding: 6px 8px; /* 💡 缩减了左右 Padding */
  background: var(--success);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  white-space: nowrap;
  flex-shrink: 0;
}

.btn-upload:disabled {
  background: #94a3b8;
  cursor: not-allowed;
}

/* 标签选择区 */
.filter-section {
  background: var(--card-bg);
  border-radius: 12px;
  padding: 15px;
  margin-bottom: 15px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  border: 1px solid var(--border-color);
}

.filter-group {
  margin-bottom: 10px;
  display: flex;
  align-items: flex-start;
}

.filter-label {
  font-weight: 600;
  width: 50px;
  color: var(--text-sub);
  font-size: 13px;
  padding-top: 6px;
  flex-shrink: 0;
}

.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tag {
  padding: 4px 10px;
  background: var(--bg);
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  border: 1px solid var(--border-color);
  color: var(--text-main);
}

.tag.active {
  background: #dbeafe;
  color: var(--primary);
  border-color: var(--primary);
  font-weight: 600;
}

.dark-mode .tag.active {
  background: rgba(59, 130, 246, 0.2);
}

.tag-rarity-3.active {
    background: #ffedd5;
    color: var(--gold);
    border-color: var(--gold);
}
.dark-mode .tag-rarity-3.active {
    background: rgba(249, 115, 22, 0.2);
}
.tag-rarity-2.active {
    background: #f3e8ff;
    color: var(--purple);
    border-color: var(--purple);
}
.dark-mode .tag-rarity-2.active {
    background: rgba(168, 85, 247, 0.2);
}

.result-stats {
  margin-bottom: 15px;
  font-size: 13px;
  padding: 10px 15px;
  background: #eff6ff;
  border-radius: 8px;
  color: #1e40af;
  border-left: 4px solid var(--primary);
}

.dark-mode .result-stats {
  background: rgba(59, 130, 246, 0.1);
  color: #93c5fd;
}

/* 组合卡片 */
.combo-card {
  width: 100% !important;
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

.combo-tags-box {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
  flex: 1;
  min-width: 200px;
}

.tag-count-badge {
  background: var(--text-sub);
  color: #fff;
  padding: 2px 6px;
  border-radius: 12px;
  font-size: 10px;
  flex-shrink: 0;
  margin-right: 4px;
}

.combo-name-blue {
  color: var(--primary);
  font-weight: bold;
  background: #eff6ff;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 13px;
  white-space: nowrap;
}

.dark-mode .combo-name-blue {
  background: rgba(59, 130, 246, 0.2);
}

.plus-sign {
  color: var(--text-sub);
  font-size: 12px;
}

.status-right {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.badge-guarantee {
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: bold;
  color: #fff;
  white-space: nowrap;
}

.badge-top {
  background: #f97316;
}

.badge-senior {
  background: #a855f7;
}

.people-count {
  color: var(--text-sub);
  font-size: 11px;
  white-space: nowrap;
}

/* 表格布局 */
.result-table {
  width: 100% !important;
  border-collapse: collapse;
  table-layout: fixed;
}

.result-table th {
  background: var(--bg);
  color: var(--text-sub);
  font-size: 11px;
  text-align: left;
  padding: 8px 12px;
  font-weight: 400;
  vertical-align: middle;
}

.result-table td {
  padding: 10px 12px;
  font-size: 13px;
  border-top: 1px solid var(--border-color);
  overflow: visible !important;
  white-space: nowrap;
  color: var(--text-main);
  vertical-align: middle;
}

.col-name {
  width: 30% !important;
  font-weight: 600;
  white-space: nowrap !important;
}

.col-other {
  width: 14%;
}

/* 🌟 稀有度列对齐优化：确保表头星号与下方数字严格中心对齐 */
.result-table th.col-rarity,
.result-table td.col-rarity {
  text-align: center !important;
  padding-left: 4px !important;
  padding-right: 4px !important;
  width: 40px !important; /* 💡 给定固定宽度确保对齐更稳固 */
}

/* 🌟 恢复稀有度颜色区分 */
.result-table td.rarity-3 {
  color: var(--gold) !important;
  font-weight: bold;
}

.result-table td.rarity-2 {
  color: var(--purple) !important;
  font-weight: bold;
}

.no-data {
  text-align: center;
  padding: 50px;
  color: var(--text-sub);
  background: var(--card-bg);
  border-radius: 12px;
  font-size: 14px;
  border: 1px solid var(--border-color);
}
/* 🌟 完美版：文本居中，标签框整体居中但内部靠左 */
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
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  overflow: hidden;
  animation: scaleUp 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
  border: 1px solid var(--border-color);
}

.modal-header {
  padding: 16px 20px 10px 20px;
  border-bottom: 1px solid var(--border-color);
}

.modal-header h3 {
  margin: 0;
  font-size: 14px;
  color: var(--text-sub);
  font-weight: 500;
  text-align: center; /* 网页域名提示保持居中 */
}

.modal-body {
  padding: 24px 20px;
  text-align: center;  /* 💡 核心：让红色和文字部分（你的红色区域）实现居中 */
}

.modal-title-text {
  margin: 0 0 6px 0;
  font-size: 20px;
  font-weight: bold;
  color: var(--success);
}

.modal-sub-text {
  margin: 0 0 16px 0;
  font-size: 13px;
  color: var(--text-sub);
}

/* 💡 核心：标签灰色底框（你的黄色区域） */
.modal-tags-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-start; /* 💡 核心：让框内的标签严格靠左对齐，不居中 */
  background: var(--bg);
  padding: 14px;
  border-radius: 10px;
  border: 1px solid var(--border-color);
  width: 100%;
  box-sizing: border-box;
  text-align: left;            /* 兜底，防止继承父级居中 */
}

.no-tag-hint {
  font-size: 13px;
  color: var(--text-sub);
  width: 100%;
  text-align: center;          /* 如果没有标签，提示字可以居中 */
}

.modal-footer {
  padding: 12px 20px 20px 20px;
  display: flex;
  justify-content: center;     /* 按钮保持居中 */
}

/* 按钮样式 */
.modal-btn-confirm {
  padding: 10px 40px;
  background: var(--primary);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(59, 130, 246, 0.2);
  transition: all 0.2s;
}

.modal-btn-confirm:hover {
  background: #2563eb;
  box-shadow: 0 4px 6px rgba(59, 130, 246, 0.3);
}

/* 🌟 弹窗内容样式优化 */
.feedback-body, .notice-body {
  text-align: left !important;
  padding: 20px 24px !important;
}

.feedback-content p {
  margin: 12px 0;
  font-size: 14px;
  color: var(--text-main);
}

.feedback-content a {
  color: var(--primary);
  text-decoration: none;
  font-weight: bold;
  border-bottom: 1px solid var(--primary);
  padding-bottom: 2px;
}

.feedback-content .hint-text {
  font-size: 12px;
  color: var(--text-sub);
  margin-top: 20px;
  background: var(--bg);
  padding: 10px;
  border-radius: 8px;
  line-height: 1.5;
}

.notice-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.notice-item {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.notice-date {
  font-size: 12px;
  font-weight: bold;
  color: var(--primary);
  background: var(--bg);
  padding: 2px 8px;
  border-radius: 4px;
  min-width: 40px;
  text-align: center;
}

.notice-item p {
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
  color: var(--text-main);
}

/* 动效 */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes scaleUp {
  from { transform: scale(0.95); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
</style>