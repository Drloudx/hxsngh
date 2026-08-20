<template>
  <div class="talent-container">
    <div class="talent-sticky-top">
      <!-- 顶部栏: 搜索框 -->
      <div class="talent-search-box">
        <img src="/ui/search.svg" class="search-icon" />
        <input
          type="text"
          v-model="searchQuery"
          placeholder="搜索关键词"
          class="talent-search-input"
        />
      </div>

      <!-- 搜索区域: 词条标签筛选 -->
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
        :class="['talent-card', { 'dropdown-open': openLevelDropdown === group[0].Name }]"
      >
        <div class="prefix-card-header">
          <div class="prefix-title-wrapper">
            <div 
              v-if="getPrefixIcon(getActiveStepItem(group)?.IDs)" 
              class="prefix-icon-box"
              :class="'step-' + getActiveStep(group).toLowerCase()"
            >
              <img 
                :src="getPrefixIcon(getActiveStepItem(group)?.IDs)" 
                class="prefix-icon-img game-sprite" 
                @error="handleIconError(getPrefixIcon(getActiveStepItem(group)?.IDs))"
              />
            </div>
            <span class="prefix-name">{{ group[0].Name }}</span>
          </div>
          <div class="card-actions">
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
            <div class="level-section" @click.stop>
              <div class="level-input-wrapper">
                <span class="level-label">等级</span>
                <input
                  type="number"
                  class="level-input"
                  :value="getDisplayLevel(group[0].Name)"
                  @input="onLevelInput(group[0].Name, ($event.target).value)"
                  min="0"
                />
                <div class="level-dropdown-trigger" @click="toggleLevelDropdown(group[0].Name)">
                  <img src="/ui/up.svg" class="level-arrow" :class="{ collapsed: openLevelDropdown !== group[0].Name }" />
                </div>
                <div v-if="openLevelDropdown === group[0].Name" class="level-dropdown-menu">
                  <div
                    v-for="preset in PRESET_LEVELS"
                    :key="preset"
                    class="level-dropdown-item"
                    :class="{ active: getDisplayLevel(group[0].Name) == preset }"
                    @click="selectLevel(group[0].Name, preset)"
                  >
                    {{ preset }}
                  </div>
                </div>
              </div>
            </div>
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
import { ref, computed, onMounted, onUnmounted } from 'vue'
import prefixData from '@/assets/Prefix.json'

const STEP_ORDER = ['C', 'B', 'A', 'S']
const stepLabels = [
  { key: 'C', label: '绿' },
  { key: 'B', label: '蓝' },
  { key: 'A', label: '紫' },
  { key: 'S', label: '橙' }
]

const PRESET_LEVELS = [100, 120, 130, 140, 160, 170, 180, 200, 210]
const DEFAULT_LEVEL = 200

const rawGroups = computed(() => {
  const map = new Map()
  const list = Array.isArray(prefixData) ? prefixData : (prefixData.DataTable || [])
  list.forEach(item => {
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

const getActiveStepItem = (group) => {
  const step = getActiveStep(group)
  return group.find(item => item.Step === step) || group[0]
}

const failedIcons = ref(new Set())
const handleIconError = (iconPath) => {
  if (iconPath) {
    failedIcons.value.add(iconPath)
  }
}

const getPrefixIcon = (ids) => {
  if (!ids) return null
  const lastTwo = ids.slice(-2)
  const validNumbers = [
    '01', '02', '03', '04', '05', '06', '07', '08', '09', '10',
    '11', '12', '13', '15', '16', '17', '18', '19', '20',
    '21', '22', '23', '24', '25', '26', '27', '28', '29', '30',
    '31', '32', '33', '34', '35', '36', '37', '38', '39', '40',
    '41', '42'
  ]
  if (validNumbers.includes(lastTwo)) {
    const iconPath = `/ParagonPrefix/JH400${lastTwo}.png`
    if (failedIcons.value.has(iconPath)) return null
    return iconPath
  }
  return null
}

const setActiveStep = (name, step) => {
  activeSteps.value[name] = step
}

// ===== 等级系统 =====
const cardLevels = ref({})
const openLevelDropdown = ref(null)

const getDisplayLevel = (name) => {
  // 输入框显示原始值，支持空字符串以便用户删光后继续输入
  const v = cardLevels.value[name]
  return v !== undefined ? v : DEFAULT_LEVEL
}

const getCardLevel = (name) => {
  const v = cardLevels.value[name]
  if (v === undefined || v === null) return DEFAULT_LEVEL
  if (v === '') return 0
  const num = parseInt(v)
  if (isNaN(num) || num <= 0) return 0
  return num
}

const onLevelInput = (name, val) => {
  // 允许输入任意值，包括空字符串
  cardLevels.value[name] = val
}

const getSafeLevel = (name) => {
  const v = cardLevels.value[name]
  if (v === undefined || v === null || v === '') return DEFAULT_LEVEL
  const num = parseInt(v)
  if (isNaN(num)) return DEFAULT_LEVEL
  return Math.max(0, num)
}

const toggleLevelDropdown = (name) => {
  openLevelDropdown.value = openLevelDropdown.value === name ? null : name
}

const selectLevel = (name, level) => {
  cardLevels.value[name] = level
  openLevelDropdown.value = null
}

const handleGlobalClick = () => {
  openLevelDropdown.value = null
}

onMounted(() => {
  document.addEventListener('click', handleGlobalClick)
})

onUnmounted(() => {
  document.removeEventListener('click', handleGlobalClick)
})

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
  const name = group[0]?.Name
  const level = getCardLevel(name)

  let text = item.Effect
  const compute = (val) => {
    const v = parseInt(val)
    if (!v || v === 0) return 0
    return Math.ceil(level / v)
  }
  text = text
    .replace(/\{0\}/g, compute(item.Value0))
    .replace(/\{1\}/g, compute(item.Value1))
    .replace(/\{2\}/g, compute(item.Value2))
    .replace(/\{3\}/g, compute(item.Value3))
    .replace(/\{4\}/g, compute(item.Value4))
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
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.talent-sticky-top {
  flex-shrink: 0;
  background: var(--bg);
  padding-bottom: 10px;
}

/* ===== 搜索框 ===== */
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
  flex-shrink: 0;
}
.talent-search-box:focus-within {
  border-color: #409eff;
}

/* ===== 词条标签筛选 ===== */

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
  flex-shrink: 0;
  margin-bottom: 10px;

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
  flex: 1;
  overflow-y: auto;
  padding-bottom: 15px;
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
  transition: background-color 0.2s, box-shadow 0.2s, transform 0.2s;
  position: relative;
  z-index: 1;
  flex-shrink: 0;
}
.talent-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1);
}
.talent-card.dropdown-open {
  z-index: 50;
}

/* ===== 卡片头部（自适应换行+换行左对齐） ===== */
.prefix-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
  row-gap: 6px;
}

.prefix-name {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-main);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1 1 auto;
}

.card-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

/* ===== 品质切换标签 ===== */
.step-tabs {
  display: flex;
  gap: 4px;
}

.step-tab {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 700;
  border-radius: 5px;
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
}
.step-tab.b.active {
  background: var(--blue-light);
  color: var(--blue);
}
.step-tab.a.active {
  background: var(--purple-light);
  color: var(--purple);
}
.step-tab.s.active {
  background: var(--gold-light);
  color: var(--gold);
}

/* ===== 等级输入与下拉 ===== */
.level-section {
  display: flex;
  align-items: center;
}

.level-input-wrapper {
  display: flex;
  align-items: center;
  position: relative;
  background: var(--bg);
  border: 1px solid var(--border-color);
  border-radius: 5px;
  padding: 2px 2px 2px 8px;
  gap: 0;
}

.level-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-main);
  margin-right: 4px;
  white-space: nowrap;
  opacity: 0.85;
}

.level-input {
  width: 36px;
  border: none;
  outline: none;
  background: transparent;
  font-size: 13px;
  font-weight: 700;
  color: var(--text-main);
  text-align: center;
  -moz-appearance: textfield;
  padding: 2px 0;
}
.level-input::-webkit-outer-spin-button,
.level-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.level-dropdown-trigger {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  cursor: pointer;
  border-radius: 3px;
  transition: background 0.2s;
}
.level-dropdown-trigger:hover {
  background: var(--dropdown-hover);
}

.level-arrow {
  width: 11px;
  height: 11px;
  filter: var(--icon-filter);
  transition: transform 0.25s ease;
}
.level-arrow.collapsed {
  transform: rotate(180deg);
}

.level-dropdown-menu {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 4px;
  width: 76px;
  background: var(--card-bg);
  border-radius: 8px;
  border: 1px solid var(--border-color);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
  z-index: 9999;
  overflow: hidden;
  animation: slideDown 0.15s ease-out;
}

.level-dropdown-item {
  padding: 6px 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-main);
  text-align: center;
  cursor: pointer;
  transition: background 0.15s;
}
.level-dropdown-item:hover {
  background: var(--dropdown-hover);
}
.level-dropdown-item.active {
  color: var(--primary);
  background: rgba(59, 130, 246, 0.08);
}

@keyframes slideDown {
  from { opacity: 0; transform: translateY(-6px); }
  to { opacity: 1; transform: translateY(0); }
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
.dark-mode .level-input {
  background: transparent;
  color: var(--text-main);
}
.dark-mode .level-dropdown-menu {
  background: var(--card-bg);
  border-color: var(--border-color);
}
.dark-mode .level-dropdown-item:hover {
  background: rgba(255, 255, 255, 0.08);
}
.dark-mode .level-dropdown-item.active {
  background: rgba(59, 130, 246, 0.2);
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

/* ===== 词条图标样式 ===== */
.prefix-title-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1 1 auto;
  min-width: 0;
}

.prefix-icon-box {
  width: 30px;
  height: 30px;
  border-radius: 4px;
  border: 1px solid var(--border-color);
  overflow: hidden;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}

.prefix-icon-box.step-c {
  background: #7ac38f;
}
.prefix-icon-box.step-b {
  background: #72b6df;
}
.prefix-icon-box.step-a {
  background: #b284db;
}
.prefix-icon-box.step-s {
  background: #e59f4c;
}

.prefix-icon-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  image-rendering: pixelated;
  image-rendering: -moz-crisp-edges;
  image-rendering: crisp-edges;
}
</style>