<template>
  <div class="talent-container">
    <div class="talent-search-wrapper">
      <div class="talent-search-box">
        <img src="/ui/search.svg" class="search-icon" />
        <input
          type="text"
          v-model="searchQuery"
          placeholder="搜索关键词"
          class="talent-search-input"
        />
      </div>

      <!-- 前缀分类标签栏 -->
      <div class="name-tags-section">
        <div class="name-tags-header" @click="toggleNameTagsExpand">
          <span class="name-tags-title">词条标签筛选</span>
          <img src="/ui/up.svg" class="collapse-icon" :class="{ collapsed: !nameTagsExpanded }" />
        </div>
        <div v-if="nameTagsExpanded" class="name-tags-grid">
          <span
            v-for="name in uniqueNames"
            :key="name"
            :class="['name-tag', { active: activeNameTag === name }]"
            @click="toggleNameTag(name)"
          >
            {{ name }}
          </span>
        </div>
      </div>
    </div>

    <div class="talent-list">
      <div
        v-for="group in displayGroups"
        :key="group[0].Name"
        class="talent-card"
      >
        <div class="prefix-card-header">
          <span class="prefix-name">{{ group[0].Name }}</span>
          <div class="step-tabs">
            <span
              v-for="(s, si) in stepLabels"
              :key="s.key"
              :class="['step-tab', s.key.toLowerCase(), { active: getActiveStep(group) === s.key }]"
              @click="setActiveStep(group[0].Name, s.key)"
            >
              {{ s.label }}
            </span>
          </div>
        </div>

        <div class="talent-effect">
          <div
            v-for="(line, idx) in getEffectLines(group, getActiveStep(group))"
            :key="idx"
            class="effect-line"
          >
            {{ line }}
          </div>
        </div>

        <div class="prefix-bottom-tags">
          <span class="bottom-tag" @click="openLimitModal(group[0].Name, 'area', getActiveStep(group))">区域限制</span>
          <span class="bottom-tag" @click="openLimitModal(group[0].Name, 'element', getActiveStep(group))">元素限制</span>
          <span class="bottom-tag" @click="openLimitModal(group[0].Name, 'class', getActiveStep(group))">职业限制</span>
        </div>
      </div>

      <div v-if="displayGroups.length === 0" class="no-data">
        未找到匹配的词条
      </div>
    </div>

    <div v-if="limitModal.visible" class="modal-overlay" @click.self="closeLimitModal">
      <div class="modal-window limit-modal-window">
        <div class="modal-header">
          <h3>{{ limitModal.title }}</h3>
          <button class="modal-close-x" @click="closeLimitModal">✕</button>
        </div>
        <div class="modal-body">
          <div class="limit-tags-container">
            <span
              v-for="(tag, idx) in limitModal.tags"
              :key="idx"
              class="limit-tag"
            >{{ tag }}</span>
          </div>
          <div v-if="limitModal.tags.length === 0" class="limit-empty">无限制</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import prefixData from '@/assets/PrefixDataTable.json'

const STEP_ORDER = ['C', 'B', 'A', 'S']
const stepLabels = [
  { key: 'C', label: '绿' },
  { key: 'B', label: '蓝' },
  { key: 'A', label: '紫' },
  { key: 'S', label: '橙' }
]

const rawGroups = computed(() => {
  const map = new Map()
  prefixData.DataTable.forEach(item => {
    if (!map.has(item.Name)) {
      map.set(item.Name, [])
    }
    map.get(item.Name).push(item)
  })
  for (const [, items] of map) {
    items.sort((a, b) => STEP_ORDER.indexOf(a.Step) - STEP_ORDER.indexOf(b.Step))
  }
  return map
})

const uniqueNames = computed(() => {
  return Array.from(rawGroups.value.keys())
})

const searchQuery = ref('')
const activeNameTag = ref(null)
const nameTagsExpanded = ref(false)

const activeSteps = ref({})

const getDefaultStep = (group) => {
  for (const s of [...STEP_ORDER].reverse()) {
    if (group.some(item => item.Step === s)) return s
  }
  return group[0]?.Step || 'S'
}

const getActiveStep = (group) => {
  const name = group[0]?.Name
  return activeSteps.value[name] || getDefaultStep(group)
}

const setActiveStep = (name, step) => {
  activeSteps.value[name] = step
}

const toggleNameTag = (name) => {
  activeNameTag.value = activeNameTag.value === name ? null : name
}

const toggleNameTagsExpand = () => {
  nameTagsExpanded.value = !nameTagsExpanded.value
}

const filteredGroups = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) {
    return Array.from(rawGroups.value.values())
  }
  const result = []
  for (const items of rawGroups.value.values()) {
    const name = items[0].Name.toLowerCase()
    const effectText = items.map(item => item.Effect || '').join(' ').toLowerCase()
    if (name.includes(q) || effectText.includes(q)) {
      result.push(items)
    }
  }
  return result
})

const sortedGroups = computed(() => {
  const groups = [...filteredGroups.value]
  if (activeNameTag.value) {
    const idx = groups.findIndex(g => g[0].Name === activeNameTag.value)
    if (idx > -1) {
      const [pinned] = groups.splice(idx, 1)
      groups.unshift(pinned)
    }
  }
  return groups
})

const displayGroups = computed(() => sortedGroups.value)

const getCurrentItem = (group, step) => {
  return group.find(item => item.Step === step) || group[group.length - 1]
}

const getEffectLines = (group, step) => {
  const item = getCurrentItem(group, step)
  if (!item || !item.Effect) return []
  let text = item.Effect
  text = text
    .replace(/\{0\}/g, item.Value0 ?? '')
    .replace(/\{1\}/g, item.Value1 ?? '')
    .replace(/\{2\}/g, item.Value2 ?? '')
    .replace(/\{3\}/g, item.Value3 ?? '')
    .replace(/\{4\}/g, item.Value4 ?? '')
  return text.split('\n').filter(Boolean)
}

const limitModal = ref({ visible: false, title: '', content: '' })

const openLimitModal = (name, type, step) => {
  const group = rawGroups.value.get(name)
  if (!group) return
  const item = getCurrentItem(group, step)
  if (!item) return

  let title = ''
  let tags = []
  switch (type) {
    case 'area':
      title = '区域限制'
      tags = splitLimitTags(item.AreaLimit)
      break
    case 'element':
      title = '元素限制'
      tags = splitLimitTags(item.Element)
      break
    case 'class':
      title = '职业限制'
      tags = splitLimitTags(item.ClassLimit)
      break
  }
  limitModal.value = { visible: true, title, tags }
}

const splitLimitTags = (str) => {
  if (!str || str === '无') return []
  if (str === '全部' || str === '全职') return ['全部']
  return str.split(/[,\s]+/).filter(Boolean)
}

const closeLimitModal = () => {
  limitModal.value = { visible: false, title: '', content: '' }
}
</script>

<style scoped>
/* ===== 容器 ===== */
.talent-container {
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
  padding: 0;
  box-sizing: border-box;
}

/* ===== 搜索区域 ===== */
.talent-search-wrapper {
  background: var(--bg);
  padding: 10px 0;
  margin-bottom: 0;
  box-sizing: border-box;
  position: sticky;
  top: calc(var(--header-padding-top) + 64px);
  z-index: 999;
  width: 100%;
}

.talent-search-wrapper::before,
.talent-search-wrapper::after {
  content: none;
}

.talent-search-box {
  display: flex;
  align-items: center;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 10px 14px;
  gap: 0;
  box-shadow: inset 0 1px 4px rgba(0, 0, 0, 0.06);
  transition: border-color 0.2s ease;
}
.talent-search-box:focus-within {
  border-color: #409eff;
}

.search-icon {
  width: 18px;
  height: 18px;
  filter: var(--icon-filter);
  margin-right: 10px;
  flex-shrink: 0;
  opacity: 0.7;
}

.talent-search-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 15px;
  color: var(--text-main);
  font-family: inherit;
}

/* ===== 名称标签栏（可折叠） ===== */
.name-tags-section {
  margin-top: 10px;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 12px 14px;
  box-shadow: inset 0 1px 4px rgba(0, 0, 0, 0.06);
}

.name-tags-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  user-select: none;
}

.name-tags-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-main);
}

.collapse-icon {
  width: 14px;
  height: 14px;
  filter: var(--icon-filter);
  transition: transform 0.25s ease;
}
.collapse-icon.collapsed {
  transform: rotate(180deg);
}

.name-tags-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-top: 10px;
}

.name-tag {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px 6px;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-main);
  background: var(--bg);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  user-select: none;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.name-tag:hover {
  border-color: var(--primary);
  color: var(--primary);
  transform: translateY(-1px);
}
.name-tag.active {
  background: #dbeafe;
  color: var(--primary);
  border-color: var(--primary);
  font-weight: 600;
}

/* ===== 卡片列表 ===== */
.talent-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 0;
}

/* ===== 卡片 ===== */
.talent-card {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 14px;
  padding: 16px;
  box-shadow: 0 3px 12px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: all 0.2s ease;
}
.talent-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1);
}

/* ===== 卡片头部 ===== */
.prefix-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
}

.prefix-name {
  font-size: 17px;
  font-weight: 600;
  color: var(--text-main);
  margin-right: 4px;
}

/* ===== 品质切换标签 ===== */
.step-tabs {
  display: flex;
  gap: 6px;
}

.step-tab {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 5px 18px;
  font-size: 13px;
  font-weight: 700;
  border-radius: 6px;
  cursor: pointer;
  user-select: none;
  background: #e2e8f0;
  color: #94a3b8;
  transition: all 0.2s ease;
}
.step-tab:hover {
  transform: translateY(-1px);
}

.step-tab.c.active {
  background: var(--green-light);
  color: var(--green);
  box-shadow: 0 2px 6px rgba(121, 195, 122, 0.4);
}
.step-tab.b.active {
  background: var(--blue-light);
  color: var(--blue);
  box-shadow: 0 2px 6px rgba(127, 174, 203, 0.4);
}
.step-tab.a.active {
  background: var(--purple-light);
  color: var(--purple);
  box-shadow: 0 2px 6px rgba(168, 85, 247, 0.4);
}
.step-tab.s.active {
  background: var(--gold-light);
  color: var(--gold);
  box-shadow: 0 2px 6px rgba(249, 115, 22, 0.4);
}

/* ===== 效果文本 ===== */
.talent-effect {
  font-size: 14px;
  line-height: 1.7;
  color: var(--text-main);
  white-space: pre-wrap;
  background: #f8faff;
  padding: 8px 10px;
  border-radius: 8px;
  text-align: left;
}

.effect-line {
  font-size: 14px;
  line-height: 1.8;
  color: var(--text-main);
}

/* ===== 底部三标签 ===== */
.prefix-bottom-tags {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 4px;
}

.bottom-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px 16px;
  font-size: 13px;
  font-weight: 600;
  background: var(--green-light);
  color: var(--green-text);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  user-select: none;
}
.bottom-tag:hover {
  filter: brightness(1.1);
  transform: translateY(-1px);
}

/* ===== 弹窗 ===== */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(15, 23, 42, 0.4);
  backdrop-filter: blur(16px) saturate(120%);
  -webkit-backdrop-filter: blur(16px) saturate(120%);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.modal-window {
  background: var(--card-bg);
  width: 92%;
  max-width: 420px;
  max-height: 82vh;
  border-radius: 24px;
  box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.12);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--border-color);
}

.modal-header {
  padding: 16px 22px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.modal-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #0f172a;
}

.modal-close-x {
  background: transparent;
  border: none;
  font-size: 18px;
  color: #94a3b8;
  cursor: pointer;
  transition: color 0.15s;
}
.modal-close-x:hover {
  color: #ef4444;
}

.modal-body {
  padding: 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.limit-tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
  padding: 8px 0;
}

.limit-tag {
  font-size: 12px;
  font-weight: 500;
  padding: 4px 12px;
  border-radius: 6px;
  border: 1px solid transparent;
  background: #eff6ff;
  color: #2563eb;
  border-color: #dbeafe;
}

.dark-mode .limit-tag {
  background: rgba(37, 99, 235, 0.2);
  color: #93c5fd;
  border-color: rgba(37, 99, 235, 0.3);
}

.limit-empty {
  text-align: center;
  color: var(--text-sub);
  font-size: 14px;
  padding: 12px 0;
}

/* ===== 空状态 ===== */
.no-data {
  text-align: center;
  padding: 40px 0;
  color: var(--text-sub);
  font-size: 14px;
}

/* ===== 深色模式 ===== */
.dark-mode .talent-search-wrapper {
  background: var(--bg);
}
.dark-mode .talent-search-box {
  border-color: rgba(255, 255, 255, 0.1);
}
.dark-mode .talent-effect {
  background: rgba(64, 158, 255, 0.08);
}
.dark-mode .name-tags-section {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.1);
}
.dark-mode .name-tag {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.1);
}
.dark-mode .name-tag:hover {
  border-color: var(--primary);
}
.dark-mode .name-tag.active {
  background: rgba(59, 130, 246, 0.2);
  color: var(--primary);
  border-color: var(--primary);
}
.dark-mode .step-tab {
  background: rgba(255, 255, 255, 0.08);
  color: #94a3b8;
}
.dark-mode .bottom-tag {
  background: var(--green);
  color: var(--green-text);
}
.dark-mode .bottom-tag:hover {
  filter: brightness(1.2);
}
.dark-mode .modal-overlay {
  background: rgba(15, 23, 42, 0.6);
}
.dark-mode .modal-window {
  border-color: var(--border-color);
  box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.5);
}
.dark-mode .modal-header {
  border-bottom-color: var(--border-color);
}
.dark-mode .modal-header h3 {
  color: #f8fafc;
}
</style>
