<template>
  <div class="talent-container">
    <div class="talent-sticky-top">
      <!-- 搜索栏与次筛按钮 -->
      <div class="talent-search-row">
        <div class="talent-search-box">
          <img src="/ui/search.svg" class="search-icon" />
          <input
            type="text"
            v-model="searchQuery"
            placeholder="心得详细、心得名、角色名"
            class="talent-search-input"
          />
        </div>
        <button class="sub-filter-btn" :class="{ active: showSubSearch }" @click="showSubSearch = !showSubSearch">
          <span class="filter-toggle-text">次筛</span>
          <img src="/ui/up.svg" class="collapse-icon" :class="{ collapsed: !showSubSearch }" />
        </button>
      </div>

      <!-- 二次筛选输入框 -->
      <Transition name="slide-fade">
        <div v-show="showSubSearch" class="sub-search-box">
          <img src="/ui/search.svg" class="sub-search-icon" />
          <input
            type="text"
            v-model="subSearchQuery"
            placeholder="结果内二次筛选..."
            class="sub-search-input"
          />
        </div>
      </Transition>

<!--      <div class="talent-sub-header">-->
<!--        <span class="talent-hint-text">可通过空格，中英文逗号，顿号（、）进行多词搜索，例：战士、火系、魔灵</span>-->
<!--      </div>-->

      <!-- 角色查找与绑定提示 -->
      <div class="talent-suggest-area">
        <!-- 绑定角色提示条 -->
        <div v-if="selectedCharacter" class="selected-char-bar">
          <button class="clear-char-btn" @click="clearSelectedCharacter">
            清除绑定: {{ selectedCharacter.displayName }} ✕
          </button>
        </div>

        <!-- 候选角色推荐列表 -->
        <div v-if="suggestedCharacters.length > 0 && !selectedCharacter" class="char-suggest-bar">
          <div class="suggest-header" @click="toggleSuggestExpand">
            <span class="suggest-title">是否查找角色：</span>
            <img src="/ui/up.svg" class="collapse-icon" :class="{ collapsed: !suggestExpanded }" />
          </div>
          <div v-if="suggestExpanded" class="suggest-tags-list">
            <span
              v-for="char in suggestedCharacters"
              :key="char.id"
              :class="['suggest-char-tag', `wish-rarity-color-${getRarityNum(char.step)}`]"
              @click="selectCharacter(char)"
            >
              {{ char.displayName }}
            </span>
          </div>
        </div>

        <!-- 筛选面板（样式参考文件2） -->
        <div class="filter-header-panel">
          <!-- 1. 品阶筛选（常驻） -->
          <div class="filter-row">
            <span class="filter-label">品阶：</span>
            <div class="filter-options">
              <button
                v-for="stepOpt in stepFilterOptions"
                :key="stepOpt.value"
                class="filter-btn"
                :class="{ active: selectedStep === stepOpt.value }"
                @click="toggleStepFilter(stepOpt.value)"
              >
                {{ stepOpt.label }}
              </button>
            </div>
          </div>

          <!-- 2. 类别筛选（仅绑定角色后出现在品阶下方） -->
          <div v-if="selectedCharacter" class="filter-row">
            <span class="filter-label">类别：</span>
            <div class="filter-options">
              <button
                class="filter-btn"
                :class="{ active: activeCharTab === 'all' }"
                @click="activeCharTab = 'all'"
              >
                全部
              </button>
              <button
                v-if="selectedCharacter.class"
                class="filter-btn"
                :class="{ active: activeCharTab === 'class' }"
                @click="activeCharTab = 'class'"
              >
                {{ selectedCharacter.class }}
              </button>
              <button
                v-if="selectedCharacter.type"
                class="filter-btn"
                :class="{ active: activeCharTab === 'race' }"
                @click="activeCharTab = 'race'"
              >
                {{ selectedCharacter.type }}
              </button>
              <button
                v-if="selectedCharacter.element"
                class="filter-btn"
                :class="{ active: activeCharTab === 'element' }"
                @click="activeCharTab = 'element'"
              >
                {{ selectedCharacter.element }}
              </button>
              <button
                v-if="hasExclusiveRelic"
                class="filter-btn"
                :class="{ active: activeCharTab === 'exclusive' }"
                @click="activeCharTab = 'exclusive'"
              >
                专属
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 检索数量统计 -->
      <div class="search-count-bar">
        当前检索心得数量：<span class="count-highlight">{{ sortedRelics.length }}</span>
      </div>
    </div>

    <!-- 加载中状态 -->
    <div v-if="!isDataReady" class="global-loading-state">
      <div class="global-loading-spinner"></div>
      <span>正在加载数据...</span>
    </div>

    <!-- 心得卡片列表 -->
    <div v-else class="talent-list">
      <div v-if="sortedRelics.length === 0" class="empty-relic-state">
        未找到匹配的心得数据
      </div>

      <div
        v-for="item in pagedRelics"
        :key="item.IDs"
        class="relic-card-item"
      >
        <div class="relic-card-left">
          <img
            :src="`/Relics/${item.IDs}.png`"
            class="relic-card-icon game-sprite"
            @error="handleRelicIconError"
          />
          <div class="relic-card-text">
            <div class="relic-card-line1">
              <span class="relic-card-name" :style="{ color: getStepConfig(item.Step).color }">
                {{ item.Name }}
              </span>
              <span
                class="relic-card-source-name"
                :class="{ 'clickable-role': item.sourceRole }"
                @click="item.sourceRole && selectCharacter(item.sourceRole)"
                :title="item.sourceRole ? `点击查看【${item.sourceRole.displayName}】可用心得` : ''"
              >
                {{ item.sourceRoleName }}
              </span>
            </div>
            <div class="relic-card-line2">
              <span v-if="item.reqPrefix">{{ item.reqPrefix }} 角色 </span>{{ item.formattedEffect }}
            </div>
          </div>
        </div>
      </div>

      <!-- 分页无限滚动指示器 -->
      <div
        ref="loadMoreSentinel"
        class="load-more-sentinel"
        v-if="pagedRelics.length < sortedRelics.length"
      >
        <div class="loading-spinner"></div>
        <span>正在加载更多心得...</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import * as configUtil from '@/utils/configTableUtil.js'
import rawRoles from '@/assets/RoleDataTable.json'
import rawRelics from '@/assets/RelicsDataTable.json'
import { getVisibleCharacters, HIDE_UNRELEASED_CHARACTERS } from '@/utils/characterFilter'

const searchQuery = ref('')
const showSubSearch = ref(false)
const subSearchQuery = ref('')
const selectedCharacter = ref(null)
const selectedStep = ref('all')
const activeCharTab = ref('all') // 'all' | 'class' | 'race' | 'element' | 'exclusive'
const displayLimit = ref(30)
const PAGE_SIZE = 30

const isDataReady = ref(false)
const loadMoreSentinel = ref(null)
let observer = null

const allCharacters = ref([])
const allRelics = ref([])

const stepFilterOptions = [
  { label: '全部', value: 'all' },
  { label: '传说', value: 'S' },
  { label: '史诗', value: 'A' },
  { label: '稀有', value: 'B' },
  { label: '普通', value: 'C' }
]

const toggleStepFilter = (val) => {
  selectedStep.value = selectedStep.value === val ? 'all' : val
  displayLimit.value = PAGE_SIZE
}

const getRarityNum = (step = 'C') => {
  const map = { 'S': 3, 'A': 2, 'B': 1, 'C': 0 }
  return map[String(step).toUpperCase()] ?? 0
}

const getStepConfig = (step) => {
  const map = {
    'S': { label: '传说', color: '#f97316', bg: 'rgba(249, 115, 22, 0.1)', weight: 4 },
    'A': { label: '史诗', color: '#a855f7', bg: 'rgba(168, 85, 247, 0.1)', weight: 3 },
    'B': { label: '稀有', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)', weight: 2 },
    'C': { label: '普通', color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)', weight: 1 }
  }
  return map[step] || { label: step, color: '#64748b', bg: 'rgba(100, 116, 139, 0.1)', weight: 0 }
}

const formatRelicEffect = (effectText, maxLevel = 3) => {
  if (!effectText) return '无描述'
  const finalLevel = maxLevel ?? 3
  return effectText.replace(/(\d+(?:\.\d+)?)/g, (match) => {
    const baseVal = parseFloat(match)
    if (isNaN(baseVal)) return match
    const values = []
    for (let i = 0; i <= finalLevel; i++) {
      values.push(baseVal * (i + 1))
    }
    return values.join('/')
  })
}

const suggestExpanded = ref(true)
const toggleSuggestExpand = () => {
  suggestExpanded.value = !suggestExpanded.value
}

const parseKeywords = (str) => {
  if (!str) return []
  return str.toLowerCase().split(/[\s,，、]+/).filter(Boolean)
}

const suggestedCharacters = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return []

  const words = parseKeywords(q)
  return allCharacters.value.filter(c => {
    const charName = (c.displayName || '').toLowerCase()
    return words.some(w => charName.includes(w) || w.split('').every(ch => charName.includes(ch)))
  })
})

const selectCharacter = (char) => {
  selectedCharacter.value = char
  activeCharTab.value = 'all'
  searchQuery.value = ''
  displayLimit.value = PAGE_SIZE
}

const clearSelectedCharacter = () => {
  selectedCharacter.value = null
  activeCharTab.value = 'all'
  displayLimit.value = PAGE_SIZE
}

const hasExclusiveRelic = computed(() => {
  if (!selectedCharacter.value) return false
  const char = selectedCharacter.value
  return allRelics.value.some(r => r.SpecifyRoleIDs && r.SpecifyRoleIDs === char.id)
})

const isRelicMatchChar = (relic, char) => {
  if (!char) return false
  if (relic.SpecifyRoleIDs && relic.SpecifyRoleIDs === char.id) return true
  if (relic.Class && relic.Class === char.class) return true
  if (relic.Race && relic.Race === char.type) return true
  if (relic.SubRace && relic.SubRace === char.element) return true
  return false
}

const getCharMatchOrder = (relic, char) => {
  if (relic.SpecifyRoleIDs && relic.SpecifyRoleIDs === char.id) return 1
  if (relic.Class && relic.Class === char.class) return 2
  if (relic.Race && relic.Race === char.type) return 3
  if (relic.SubRace && relic.SubRace === char.element) return 4
  return 5
}

// 主筛选排序后的列表
const primarySortedRelics = computed(() => {
  let baseList = allRelics.value

  // 1. 品阶筛选
  if (selectedStep.value !== 'all') {
    baseList = baseList.filter(r => r.Step === selectedStep.value)
  }

  // 2. 绑定特定角色时的分类过滤与优先级排序
  if (selectedCharacter.value) {
    const char = selectedCharacter.value
    let matched = baseList.filter(r => isRelicMatchChar(r, char))

    if (activeCharTab.value === 'class') {
      matched = matched.filter(r => r.Class && r.Class === char.class)
    } else if (activeCharTab.value === 'race') {
      matched = matched.filter(r => r.Race && r.Race === char.type)
    } else if (activeCharTab.value === 'element') {
      matched = matched.filter(r => r.SubRace && r.SubRace === char.element)
    } else if (activeCharTab.value === 'exclusive') {
      matched = matched.filter(r => r.SpecifyRoleIDs && r.SpecifyRoleIDs === char.id)
    }

    return [...matched].sort((a, b) => {
      const orderA = getCharMatchOrder(a, char)
      const orderB = getCharMatchOrder(b, char)
      if (orderA !== orderB) return orderA - orderB

      const wa = getStepConfig(a.Step).weight
      const wb = getStepConfig(b.Step).weight
      if (wa !== wb) return wb - wa

      return (a.Name || '').localeCompare(b.Name || '')
    })
  }

  // 3. 搜索框匹配（未绑定角色时）
  const q = searchQuery.value.trim()
  if (!q) {
    return [...baseList].sort((a, b) => {
      const wa = getStepConfig(a.Step).weight
      const wb = getStepConfig(b.Step).weight
      if (wa !== wb) return wb - wa
      return (a.Name || '').localeCompare(b.Name || '')
    })
  }

  const keywords = parseKeywords(q)
  const filtered = baseList.filter(r => {
    const fields = [
      (r.Name || '').toLowerCase(),
      (r.Effect || '').toLowerCase(),
      (r.formattedEffect || '').toLowerCase(),
      (r.sourceRoleName || '').toLowerCase(),
      (r.reqPrefix || '').toLowerCase(),
      (r.Class || '').toLowerCase(),
      (r.Race || '').toLowerCase(),
      (r.SubRace || '').toLowerCase()
    ]
    return keywords.some(kw => fields.some(f => f.includes(kw)))
  })

  return filtered.sort((a, b) => {
    const wa = getStepConfig(a.Step).weight
    const wb = getStepConfig(b.Step).weight
    if (wa !== wb) return wb - wa
    return (a.Name || '').localeCompare(b.Name || '')
  })
})

// 二次筛选后的最终列表
const sortedRelics = computed(() => {
  const list = primarySortedRelics.value
  const subQ = subSearchQuery.value.trim()
  if (!subQ) return list

  const subKeywords = parseKeywords(subQ)
  return list.filter(r => {
    const fields = [
      (r.Name || '').toLowerCase(),
      (r.Effect || '').toLowerCase(),
      (r.formattedEffect || '').toLowerCase(),
      (r.sourceRoleName || '').toLowerCase(),
      (r.reqPrefix || '').toLowerCase(),
      (r.Class || '').toLowerCase(),
      (r.Race || '').toLowerCase(),
      (r.SubRace || '').toLowerCase()
    ]
    return subKeywords.every(kw => fields.some(f => f.includes(kw)))
  })
})

const pagedRelics = computed(() => {
  return sortedRelics.value.slice(0, displayLimit.value)
})

watch([searchQuery, subSearchQuery, selectedCharacter, selectedStep, activeCharTab], () => {
  displayLimit.value = PAGE_SIZE
})

const handleRelicIconError = (e) => {
  e.target.src = '/Relics/Mark.png'
}

const initObserver = () => {
  observer = new IntersectionObserver((entries) => {
    const entry = entries[0]
    if (entry.isIntersecting && displayLimit.value < sortedRelics.value.length) {
      setTimeout(() => {
        displayLimit.value += PAGE_SIZE
      }, 150)
    }
  }, {
    rootMargin: '100px',
    threshold: 0
  })

  if (loadMoreSentinel.value) {
    observer.observe(loadMoreSentinel.value)
  }
}

watch(loadMoreSentinel, (newVal) => {
  if (newVal && observer) {
    observer.observe(newVal)
  }
})

onMounted(() => {
  initObserver()

  setTimeout(() => {
    const rawRoleArr = configUtil.extractDataArray(rawRoles)
    const rawRelicArr = configUtil.extractDataArray(rawRelics)

    const fullDatasets = {
      supportList: [],
      skillList: [],
      talentList: [],
      relicList: rawRelicArr,
      noteList: []
    }

    // 1. 获取已实装/可见的角色列表
    const fullCharacters = getVisibleCharacters(configUtil.getFullCharacterList(rawRoleArr, fullDatasets))
    allCharacters.value = fullCharacters

    const roleMap = new Map()
    fullCharacters.forEach(char => {
      roleMap.set(char.id, char)
    })

    // 2. 参考 RoleView.vue 的 isUnreleasedRelic 过滤逻辑：
    // 如果心得指定了角色ID（SpecifyRoleIDs），但该角色不在当前已实装角色列表里，则判定为未实装心得，予以过滤隐藏
    const cleanRelics = rawRelicArr
      .filter(r => {
        if (!r.SpecifyRoleIDs) return true
        if (HIDE_UNRELEASED_CHARACTERS && HIDE_UNRELEASED_CHARACTERS.value === false) return true
        return fullCharacters.some(c => c.id === r.SpecifyRoleIDs)
      })
      .map(r => {
        const sourceRole = r.SpecifyRoleIDs ? roleMap.get(r.SpecifyRoleIDs) : null
        const sourceRoleName = sourceRole ? sourceRole.displayName : (r.SpecifyRoleIDs || '通用')
        const reqPrefix = r.Class || r.Race || r.SubRace || ''
        const formattedEffect = formatRelicEffect(r.Effect, r.MaxLevel ?? 3)

        return {
          ...r,
          sourceRole,
          sourceRoleName,
          reqPrefix,
          formattedEffect
        }
      })

    allRelics.value = cleanRelics
    isDataReady.value = true
  }, 50)
})
</script>

<style scoped>
/* ===== CSS pixel rendering helper ===== */
.game-sprite {
  image-rendering: pixelated;
  image-rendering: -moz-crisp-edges;
  image-rendering: crisp-edges;
}

/* ===== 稀有度颜色 ===== */
.wish-rarity-color-3 { color: #f97316 !important; font-weight: 600; }
.wish-rarity-color-2 { color: #a855f7 !important; font-weight: 600; }
.wish-rarity-color-1 { color: #3b82f6 !important; font-weight: 600; }
.wish-rarity-color-0 { color: #10b981 !important; font-weight: 600; }

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
  font-family: 'HarmonyOS Sans SC', sans-serif;
}

.talent-sticky-top {
  flex-shrink: 0;
  background: var(--bg);
  padding-bottom: 8px;
}

/* ===== 搜索栏与次筛按钮 ===== */
.talent-search-row {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.talent-search-box {
  display: flex;
  align-items: center;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 10px 14px;
  box-shadow: inset 0 1px 4px rgba(0, 0, 0, 0.06);
  transition: border-color 0.2s ease;
  flex: 1;
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
  font-size: 13px;
  color: var(--text-main);
  font-family: inherit;
}

.sub-filter-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 0 12px;
  height: 42px;
  cursor: pointer;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.sub-filter-btn:hover {
  border-color: #409eff;
}

.sub-filter-btn.active {
  background: #eff6ff;
  border-color: #3b82f6;
  color: #3b82f6;
}

.filter-toggle-text {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-main);
}

.sub-filter-btn.active .filter-toggle-text {
  color: #3b82f6;
}

.collapse-icon {
  width: 12px;
  height: 12px;
  filter: var(--icon-filter);
  transition: transform 0.25s ease;
}

.collapse-icon.collapsed {
  transform: rotate(180deg);
}

/* ===== 二次筛选 ===== */
.sub-search-box {
  display: flex;
  align-items: center;
  background: var(--card-bg);
  border: 1px dashed #3b82f6;
  border-radius: 10px;
  padding: 8px 12px;
  margin-top: 8px;
  box-shadow: 0 1px 3px rgba(59, 130, 246, 0.08);
}

.sub-search-icon {
  width: 15px;
  height: 15px;
  filter: var(--icon-filter);
  margin-right: 8px;
  opacity: 0.6;
}

.sub-search-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 12px;
  color: var(--text-main);
  font-family: inherit;
}

.talent-sub-header {
  padding: 4px 2px 2px 2px;
  text-align: left;
}

.talent-hint-text {
  font-size: 11px;
  color: var(--text-sub);
}

/* ===== 提示与筛选区域 ===== */
.talent-suggest-area {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

/* ===== 筛选行面板（对齐文件2样式） ===== */
.filter-header-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 6px 2px;
}

.filter-row {
  display: flex;
  align-items: flex-start;
  font-size: 13px;
}

.filter-label {
  color: #666;
  white-space: nowrap;
  padding-top: 4px;
  width: 52px;
  flex-shrink: 0;
  font-size: 13px;
  text-align: left;
  font-weight: 700;
}

.filter-options {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  flex: 1;
}

/* 参考文件2按钮无边框扁平设计 */
.filter-btn {
  background: transparent;
  border: none;
  padding: 4px 10px;
  border-radius: 12px;
  color: #555;
  cursor: pointer;
  white-space: nowrap;
  font-size: 13px;
  transition: all 0.15s ease;
}

.filter-btn.active {
  background: #eef4fc;
  color: #3b82f6;
  font-weight: bold;
}

.selected-char-bar {
  display: flex;
  padding: 4px 2px 0 2px;
}

.clear-char-btn {
  background: #fee2e2;
  color: #ef4444;
  border: none;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  font-weight: 600;
  transition: background 0.2s;
  white-space: nowrap;
}

.clear-char-btn:hover {
  background: #fca5a5;
}

.char-suggest-bar {
  font-size: 12px;
  padding: 4px 2px 0 2px;
}

.suggest-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  user-select: none;
}

.suggest-title {
  color: var(--text-sub);
}

.suggest-tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 6px;
}

.suggest-char-tag {
  background: #e0f2fe;
  padding: 3px 8px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
  border: 1px solid rgba(0, 122, 255, 0.1);
}

.suggest-char-tag:hover {
  background: #bae6fd;
  transform: translateY(-1px);
}

/* 检索统计栏 */
.search-count-bar {
  padding: 6px 2px 2px 2px;
  font-size: 12px;
  color: var(--text-main);
  text-align: left;
  font-weight: 600;
  display: flex;
  align-items: center;
}

.count-highlight {
  color: #3b82f6;
  font-weight: 800;
  margin: 0 4px;
}

/* ===== 心得列表 ===== */
.talent-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 0;
  flex: 1;
  overflow-y: auto;
  padding-bottom: 15px;
}

/* ===== 心得卡片 ===== */
.relic-card-item {
  display: flex;
  align-items: center;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 10px 14px;
  text-align: left;
  box-shadow: 0 1.5px 3px rgba(0, 0, 0, 0.02);
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.relic-card-item:hover {
  border-color: rgba(59, 130, 246, 0.35);
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.04);
}

.relic-card-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.relic-card-icon {
  width: 36px;
  height: 36px;
  object-fit: contain;
  border-radius: 4px;
  flex-shrink: 0;
}

.relic-card-text {
  flex: 1;
  min-width: 0;
  text-align: left;
}

.relic-card-line1 {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.relic-card-name {
  font-size: 14px;
  font-weight: 700;
  white-space: normal;
  word-break: break-all;
}

.relic-card-source-name {
  font-size: 12px;
  color: var(--text-sub);
  white-space: nowrap;
  margin-left: 8px;
}

.relic-card-source-name.clickable-role {
  cursor: pointer;
  transition: color 0.15s ease;
}

.relic-card-source-name.clickable-role:hover {
  color: #3b82f6;
  text-decoration: underline;
}

.relic-card-line2 {
  font-size: 12px;
  color: var(--text-main);
  margin-top: 3px;
  line-height: 1.4;
  white-space: normal;
  word-break: break-all;
}

.empty-relic-state {
  font-size: 13px;
  color: var(--text-sub);
  text-align: center;
  padding: 30px 0;
  background: var(--card-bg);
  border: 1px dashed var(--border-color);
  border-radius: 8px;
  margin-top: 10px;
}

/* ===== 滚动加载指示器 ===== */
.load-more-sentinel {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 0;
  color: var(--text-sub);
  font-size: 12px;
}

.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid var(--border-color);
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.global-loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 60px 0;
  color: var(--text-sub);
  font-size: 14px;
}

.global-loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--border-color);
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.2s ease-out;
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  transform: translateY(-4px);
  opacity: 0;
}
</style>