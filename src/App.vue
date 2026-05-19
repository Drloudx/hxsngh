<script setup>
import { ref, computed, onMounted } from 'vue'
import allData from './assets/data.json'
import { ImageMatcher } from './utils/imageMatcher'

const filterCols = ['星级', '职业', '种族', '属性', '地区']
const selectedTags = ref([])
const isMatchingLoading = ref(false)
const fileInput = ref(null)
const imageMatcher = new ImageMatcher()

// 🌟 新增：控制自定义弹窗状态
const showResultModal = ref(false)
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
        指定招募分析

        <span class="ocr-status-tag" :class="'status-' + engineStatus">
          <span class="status-dot"></span>
          {{ engineStatus === 'loading' ? '匹配模板加载中' : engineStatus === 'ready' ? '图像识别已就绪' : '引擎加载失败' }}
        </span>
      </h2>
      <div class="header-btns">
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
          <h3>hxsngh.pages.dev 提示</h3>
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

  </div>
</template>

<style>
:root {
  --primary: #3b82f6;
  --gold: #f97316;
  --purple: #a855f7;
  --bg: #f8fafc;
  --text-main: #1e293b;
  --text-sub: #64748b;
  --success: #10b981;
}

body {
  font-family: "PingFang SC", "Microsoft YaHei", sans-serif;
  background: var(--bg);
  padding: 15px;
  color: var(--text-main);
  margin: 0;
  display: block !important;
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
  background: #f1f5f9;
  color: #64748b;
}

.ocr-status-tag.status-loading .status-dot {
  background: #94a3b8;
  animation: status-blink 1.2s infinite ease-in-out;
}

.ocr-status-tag.status-ready {
  background: #ecfdf5;
  color: #059669;
}

.ocr-status-tag.status-ready .status-dot {
  background: #10b981;
  box-shadow: 0 0 6px rgba(16, 185, 129, 0.6);
}

.ocr-status-tag.status-error {
  background: #fef2f2;
  color: #dc2626;
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
  background: #fff;
  border-radius: 12px;
  padding: 15px;
  margin-bottom: 15px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
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
  background: #f1f5f9;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  border: 1px solid transparent;
}

.tag.active {
  background: #dbeafe;
  color: var(--primary);
  border-color: var(--primary);
  font-weight: 600;
}

.tag-rarity-3.active {
    background: #ffedd5;
    color: var(--gold);
    border-color: var(--gold);
}
.tag-rarity-2.active {
    background: #f3e8ff;
    color: var(--purple);
    border-color: var(--purple);
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

/* 组合卡片 */
.combo-card {
  width: 100% !important;
  background: #fff;
  border-radius: 12px;
  margin-bottom: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  border: 1px solid #f1f5f9;
}

.combo-header {
  padding: 10px 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fff;
  border-bottom: 1px solid #f8fafc;
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
  background: #64748b;
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

.plus-sign {
  color: #cbd5e1;
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
  color: #94a3b8;
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
  background: #fafafa;
  color: #94a3b8;
  font-size: 11px;
  text-align: left;
  padding: 8px 12px;
  font-weight: 400;
}

.result-table td {
  padding: 10px 12px;
  font-size: 13px;
  border-top: 1px solid #f1f5f9;
  overflow: visible !important;
  white-space: nowrap;
}

.col-name {
  width: 30% !important;
  font-weight: 600;
  white-space: nowrap !important;
}

.col-other {
  width: 14%;
}

.col-rarity {
  width: 10%;
  text-align: center;
}

.rarity-3 {
  color: var(--gold);
}

.rarity-2 {
  color: var(--purple);
}

.no-data {
  text-align: center;
  padding: 50px;
  color: #94a3b8;
  background: #fff;
  border-radius: 12px;
  font-size: 14px;
}
/* 🌟 完美版：文本居中，标签框整体居中但内部靠左 */
.custom-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(15, 23, 42, 0.4);
  backdrop-filter: blur(4px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
  animation: fadeIn 0.2s ease-out;
}

.custom-modal-card {
  background: #ffffff;
  width: 90%;
  max-width: 400px;
  border-radius: 16px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  overflow: hidden;
  animation: scaleUp 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.modal-header {
  padding: 16px 20px 10px 20px;
  border-bottom: 1px solid #f1f5f9;
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
  background: #f8fafc;
  padding: 14px;
  border-radius: 10px;
  border: 1px solid #f1f5f9;
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