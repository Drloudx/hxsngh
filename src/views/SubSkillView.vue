<template>
  <div class="talent-container">
    <div class="talent-sticky-top">
      <div class="talent-search-box">
        <img src="/ui/search.svg" class="search-icon" />
        <input
          type="text"
          v-model="searchQuery"
          @input="handleInput"
          placeholder="搜索关键词(支援技能详细、角色名)..."
          class="talent-search-input"
        />
      </div>
      <div class="talent-sub-header">
        <span class="talent-hint-text">可通过空格，中英文逗号，进行多词搜索，例：冰冷，鼓舞</span>
      </div>

      <div class="talent-suggest-area">
        <div class="sorting-section">
          <span class="sorting-label">星级筛选：</span>
          <div class="sorting-group">
            <button
              v-for="star in [3, 4, 5]"
              :key="star"
              :class="['sort-btn', { active: selectedStar === star }]"
              @click="toggleStarFilter(star)"
            >
              {{ star }}星
            </button>
          </div>
        </div>

        <div v-if="selectedCharacter" class="selected-char-bar">
          <button class="clear-char-btn" @click="clearSelectedCharacter">
            清除绑定: {{ selectedCharacter.displayName }} ✕
          </button>
        </div>

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
      </div>
    </div>

    <div class="talent-list">
      <div
        v-for="item in pagedSkills"
        :key="item.uid"
        class="talent-card"
      >
        <div class="talent-main-content">
          <div class="talent-details-body">

            <!-- 第一行：头像、名称、图标与标签融合通栏 -->
            <div class="talent-top-bar">
              <!-- 头像移至行内，尺寸精致化 -->
              <div class="char-avatar-box">
                <img :src="`/Header/${item.charId}.png`" class="char-avatar-img" @error="handleIconError" />
              </div>

              <span class="talent-name" :style="{ color: getTalentStepConfig(item.step).color }">{{ item.name }}</span>

              <div class="skill-mini-box" :title="`支援图标ID: ${item.iconId}`">
                <img :src="`/Skill/${item.iconId}.png`" class="skill-mini-img" @error="handleIconError" />
              </div>

              <span
                class="talent-tag"
                :style="{
                  color: getTalentStepConfig(item.step).color,
                  backgroundColor: getTalentStepConfig(item.step).color + '15'
                }"
              >
                {{ item.标签 }}
              </span>

              <div class="talent-source-wrapper" @click="openSourceModal(item)">
                <span class="talent-source">{{ item.sourceLabel }}</span>
                <img src="/ui/expand.svg" class="source-expand-icon" />
              </div>
            </div>

            <!-- 第二行：详细效果（独占整行，体验极佳） -->
            <div class="talent-effect">
              {{ item.formattedEffect }}
            </div>
          </div>
        </div>
      </div>

      <div
        ref="loadMoreSentinel"
        class="load-more-sentinel"
        v-if="pagedSkills.length < sortedSkills.length"
      >
        <div class="loading-spinner"></div>
        <span>正在加载更多支援技能...</span>
      </div>

      <div
        v-if="sortedSkills.length > 0 && pagedSkills.length >= sortedSkills.length"
        class="no-more-data"
      >
        — 已加载全部支援技能 —
      </div>

      <div v-if="sortedSkills.length === 0" class="no-data">未找到匹配的支援技能</div>
    </div>

    <div v-if="sourceModalVisible" class="modal-overlay" @click.self="closeSourceModal">
      <div class="modal-window">
        <div class="modal-header">
          <h3>支援来源: {{ currentSource }}</h3>
          <button class="modal-close-x" @click="closeSourceModal">✕</button>
        </div>
        <div class="modal-body">
          <div class="match-chars-grid">
            <div
              v-for="hero in sourceMatchedCharacters"
              :key="hero.id"
              class="matched-hero-card"
            >
              <span :class="`wish-rarity-color-${getRarityNum(hero.step)}`" class="hero-name-span">
                {{ hero.displayName }}
              </span>

              <div class="hero-labels-container">
                <span v-if="hero.class" class="h-lbl label-job">{{ hero.class }}</span>
                <span v-if="hero.type" class="h-lbl label-race">{{ hero.type }}</span>
                <span v-if="hero.element" class="h-lbl label-attr">{{ hero.element }}</span>
              </div>
            </div>
            <div v-if="sourceMatchedCharacters.length === 0" class="matched-hero-none">
              未找到对应的匹配角色
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import * as configUtil from '@/utils/configTableUtil.js'
import rawRoles from '@/assets/RoleDataTable.json'
import rawSupportSkills from '@/assets/SubSkillDataTable.json'

// ==============================================
// 配置：手动屏蔽的角色 ID 列表 (便于随时注释恢复)
// ==============================================
const BLOCKED_CHARACTER_IDS = [
  'M23301_001', // [熔岩]史莱姆王
  'M11303_002', // [熔岩]雪人骑士
]

// 筛选响应式变量
const selectedStar = ref(null)
const searchQuery = ref('')
const selectedCharacter = ref(null)

// 分页逻辑
const displayLimit = ref(20)
const PAGE_SIZE = 20
const loadMoreSentinel = ref(null)
let observer = null

// 弹窗状态
const sourceModalVisible = ref(false)
const currentSource = ref('')
const sourceMatchedCharacters = ref([])

// 数据源缓存
const allCharacters = ref([])
const allSkills = ref([])

/**
 * 切换星级筛选状态
 */
const toggleStarFilter = (star) => {
  if (selectedStar.value === star) {
    selectedStar.value = null
  } else {
    selectedStar.value = star
  }
}

/**
 * 图片加载失败的降级处理器
 */
const handleIconError = (e) => {
    e.target.src = '/Header/M00000.png'
}

// 监听
watch(searchQuery, () => {
  displayLimit.value = PAGE_SIZE
})
watch(selectedStar, () => {
  displayLimit.value = PAGE_SIZE
})

const getRarityNum = (step = 'C') => {
  const map = { 'S': 3, 'A': 2, 'B': 1, 'C': 0 }
  return map[String(step).toUpperCase()] ?? 0
}

const getTalentStepConfig = (step = '') => {
  const TalentStepConfig = {
    S: { weight: 4, color: '#f97316', label: 'S' },
    A: { weight: 3, color: '#a855f7', label: 'A' },
    B: { weight: 2, color: '#60a5fa', label: 'B' },
    C: { weight: 1, color: '#10b981', label: 'C' },
    '': { weight: 0, color: '#94a3b8', label: '未知' }
  }
  return TalentStepConfig[String(step).toUpperCase()] ?? TalentStepConfig['']
}

const openSourceModal = (item) => {
  currentSource.value = item.sourceLabel
  sourceMatchedCharacters.value = [item.character]
  sourceModalVisible.value = true
}

const closeSourceModal = () => {
  sourceModalVisible.value = false
  currentSource.value = ''
  sourceMatchedCharacters.value = []
}

const suggestExpanded = ref(true)
const toggleSuggestExpand = () => {
  suggestExpanded.value = !suggestExpanded.value
}

const suggestedCharacters = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return []

  return allCharacters.value.filter(c => {
    const charName = (c.displayName || '').toLowerCase()
    return charName.includes(q) || q.split('').every(ch => charName.includes(ch))
  })
})

const sortedSkills = computed(() => {
  const q = searchQuery.value.trim()
  let baseList = allSkills.value

  if (selectedStar.value) {
    baseList = baseList.filter(s => s.star === selectedStar.value)
  }

  if (selectedCharacter.value) {
    const char = selectedCharacter.value
    return baseList.filter(s => s.character.id === char.id)
  }

  if (!q) {
    return [...baseList]
  }

  const keywords = q.toLowerCase().split(/[\s,，]+/).filter(Boolean)
  const filtered = baseList.filter(s => {
    const fields = [
      (s.name || '').toLowerCase(),
      (s.formattedEffect || '').toLowerCase(),
      (s.sourceLabel || '').toLowerCase()
    ]
    return keywords.some(kw => fields.some(f => f.includes(kw)))
  })

  return filtered
})

const pagedSkills = computed(() => {
  return sortedSkills.value.slice(0, displayLimit.value)
})

const selectCharacter = (char) => {
  selectedCharacter.value = char
  displayLimit.value = PAGE_SIZE
}

const clearSelectedCharacter = () => {
  selectedCharacter.value = null
  displayLimit.value = PAGE_SIZE
}

const handleInput = () => {
  if (selectedCharacter.value) {
    const currentQuery = searchQuery.value.trim().toLowerCase()
    if (!selectedCharacter.value.displayName.toLowerCase().includes(currentQuery)) {
      selectedCharacter.value = null
    }
  }
}

const initObserver = () => {
  observer = new IntersectionObserver((entries) => {
    const entry = entries[0]
    if (entry.isIntersecting && displayLimit.value < sortedSkills.value.length) {
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

  const rawRoleArr = configUtil.extractDataArray(rawRoles)
  const rawSupportArr = configUtil.extractDataArray(rawSupportSkills)

  const fullDatasets = {
    supportList: rawSupportArr,
    skillList: [],
    talentList: [],
    relicList: [],
    noteList: []
  }

  const fullCharacters = configUtil.getFullCharacterList(rawRoleArr, fullDatasets).filter(c => !BLOCKED_CHARACTER_IDS.includes(c.id))
  allCharacters.value = fullCharacters

  const list = []
  fullCharacters.forEach(c => {
    const skills = [
      c.supportSkills.characteristic,
      c.supportSkills.subClass,
      c.supportSkills.feature
    ]
    skills.forEach(s => {
      if (s && s.id) {
        list.push({
          uid: `${c.id}_${s.star}`,
          name: s.name || '未命名支援',
          step: c.step,
          标签: `${s.star}星`,
          star: s.star,
          formattedEffect: s.formattedDesc || '无描述',
          sourceLabel: c.displayName,
          character: c,
          charId: c.id,
          iconId: s.Icon || s.icon || 'default'
        })
      }
    })
  })

  list.sort((a, b) => {
    const isDummyA = a.sourceLabel === '假人'
    const isDummyB = b.sourceLabel === '假人'
    if (isDummyA !== isDummyB) {
      return isDummyA ? 1 : -1
    }

    const wa = getTalentStepConfig(a.step).weight
    const wb = getTalentStepConfig(b.step).weight
    if (wa !== wb) {
      return wb - wa
    }
    if (a.character.id !== b.character.id) {
      return a.character.id.localeCompare(b.character.id)
    }
    return a.star - b.star
  })

  allSkills.value = list
})

onUnmounted(() => {
  if (observer) observer.disconnect()
})
</script>

<style scoped>
.wish-rarity-color-3 { color: #f97316 !important; font-weight: 600; }
.wish-rarity-color-2 { color: #a855f7 !important; font-weight: 600; }
.wish-rarity-color-1 { color: #10b981 !important; font-weight: 600; }
.wish-rarity-color-0 { color: #64748b !important; font-weight: 600; }

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

.talent-suggest-area {
  flex-shrink: 0;
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

.selected-char-bar {
  display: flex;
  padding: 8px 4px 0 4px;
}

.clear-char-btn {
  background: #fee2e2;
  color: #ef4444;
  border: none;
  padding: 5px 12px;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  font-weight: 500;
  transition: background 0.2s;
  white-space: nowrap;
}
.clear-char-btn:hover {
  background: #fca5a5;
}

.char-suggest-bar {
  font-size: 13px;
  padding: 8px 4px 0 4px;
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
.suggest-header .collapse-icon {
  width: 14px;
  height: 14px;
  filter: var(--icon-filter);
  transition: transform 0.25s ease;
  flex-shrink: 0;
}
.suggest-header .collapse-icon.collapsed {
  transform: rotate(180deg);
}
.suggest-tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}
.suggest-char-tag {
  background: #e0f2fe;
  padding: 3px 10px;
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

.talent-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 0;
  flex: 1;
  overflow-y: auto;
  padding-bottom: 15px;
}

.talent-card {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 14px;
  padding: 14px;
  box-shadow: 0 3px 12px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  transition: background-color 0.2s, box-shadow 0.2s, transform 0.2s;
  flex-shrink: 0;
}
.talent-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1);
}

/* ================= 核心流式布局容器 ================= */
.talent-main-content {
  width: 100%;
}

.talent-details-body {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px; /* 第一行标题和第二行内容之间的垂直间距 */
}

/* 第一行标题栏：各项元素居中对齐 */
.talent-top-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  width: 100%;
}

/* 【通栏小头像样式】 */
.char-avatar-box {
  width: 45px;
  height: 45px;
  background: rgba(0, 0, 0, 0.03);
  border-radius: 6px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border-color);
  flex-shrink: 0;
}
.char-avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* 支援技能微型图标 */
.skill-mini-box {
  width: 25px;
  height: 25px;
  background: rgba(0, 0, 0, 0.02);
  border-radius: 4px;
  overflow: hidden;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border-color);
  flex-shrink: 0;
}
.skill-mini-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.talent-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-main);
}

.talent-tag {
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  border: none;
  letter-spacing: 0.5px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.talent-source-wrapper {
  display: inline-flex;
  align-items: center;
  background: #fff7ed;
  color: #c2410c;
  padding: 3px 9px;
  border-radius: 999px;
  font-size: 12.5px;
  font-weight: 500;
  flex-shrink: 0;
  cursor: pointer;
  transition: all 0.2s ease;
}
.talent-source-wrapper:hover {
  background: #ffedd5;
  transform: translateY(-1px);
}

.source-expand-icon {
  width: 18px;
  height: 18px;
  margin-left: 3px;
  filter: var(--icon-filter);
  opacity: 0.8;
}

/* 第二行：效果详情独占整行 */
.talent-effect {
  font-size: 13.5px;
  line-height: 1.6;
  color: var(--text-main);
  white-space: pre-wrap;
  background: #f8faff;
  padding: 10px 12px;
  border-radius: 8px;
  text-align: left;
  width: 100%;
  box-sizing: border-box;
}

/* ================= 筛选条样式 ================= */
.sorting-section {
  margin-top: 8px;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 6px 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.sorting-label {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-sub);
}

.sorting-group {
  display: flex;
  gap: 4px;
  background: var(--bg);
  padding: 2px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
}

.sort-btn {
  min-width: 80px;
  padding: 3px 12px;
  font-size: 13px;
  font-weight: 700;
  border: none;
  background: transparent;
  color: var(--text-sub);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: center;
}
.sort-btn:hover {
  color: var(--text-main);
}
.sort-btn.active {
  background: var(--card-bg);
  color: var(--primary);
  box-shadow: 0 2px 6px rgba(0,0,0,0.08);
}

.talent-sub-header { text-align: center;  flex-shrink: 0; }
.talent-hint-text {   text-align: center; font-size: 12px; color: var(--text-sub); opacity: 0.8; }

.load-more-sentinel {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 20px 0;
  color: var(--text-sub);
  font-size: 14px;
}
.loading-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid var(--border-color);
  border-top-color: #409eff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}

.no-more-data, .no-data {
  text-align: center;
  padding: 30px 0;
  color: var(--text-sub);
  font-size: 14px;
}

/* ================= 弹窗设计 ================= */
.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  backdrop-filter: blur(2px);
}

.modal-window {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  width: 90%;
  max-width: 500px;
  max-height: 80%;
  display: flex;
  flex-direction: column;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
  animation: modalFadeIn 0.25s ease-out;
  overflow: hidden;
}
@keyframes modalFadeIn {
  from { opacity: 0; transform: scale(0.96); }
  to { opacity: 1; transform: scale(1); }
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}
.modal-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-main);
}
.modal-close-x {
  background: transparent;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: var(--text-sub);
  transition: color 0.2s;
  outline: none;
}
.modal-close-x:hover {
  color: #ef4444;
}

.modal-body {
  padding: 16px;
  overflow-y: auto;
  flex: 1;
}

.match-chars-grid {
  display: flex;
  flex-direction: column;
  width: 100%;
  gap: 6px;
}

.matched-hero-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 8px 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
  transition: background-color 0.2s ease;
}
.matched-hero-card:hover {
  background-color: #f8fafc;
}

.hero-name-span {
  font-size: 14px;
  font-weight: 600;
}

.hero-labels-container {
  display: flex;
  align-items: center;
  gap: 6px;
}

.hero-labels-container .h-lbl {
  font-size: 11px;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: 4px;
  border: 1px solid transparent;
}

.label-job {
  background-color: #eff6ff;
  color: #2563eb;
  border-color: #dbeafe;
}
.label-race {
  background-color: #f5f3ff;
  color: #7c3aed;
  border-color: #ede9fe;
}
.label-attr {
  background-color: #fff7ed;
  color: #ea580c;
  border-color: #ffedd5;
}

.hero-source-text {
  font-size: 11px;
  color: #94a3b8;
  margin-left: 10px;
}

.matched-hero-none {
  text-align: center;
  padding: 20px;
  color: var(--text-sub);
  font-size: 13px;
}

/* ================= 暗黑模式样式适配 ================= */
.dark-mode .star-filter-btn {
  background: rgba(255, 255, 255, 0.03);
  border-color: rgba(255, 255, 255, 0.08);
  color: #94a3b8;
}
.dark-mode .star-filter-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #f8fafc;
}
.dark-mode .star-filter-btn.active {
  background: rgba(234, 88, 12, 0.2);
  color: #fdba74;
  border-color: #ea580c;
  box-shadow: 0 2px 8px rgba(234, 88, 12, 0.3);
}
.dark-mode .star-filter-btn.active .star-icon-mini {
  color: #fdba74;
}
.dark-mode .char-avatar-box {
  background: rgba(255, 255, 255, 0.05);
}
.dark-mode .skill-mini-box {
  background: rgba(255, 255, 255, 0.04);
}
.dark-mode .talent-card {
  box-shadow: 0 3px 12px rgba(0, 0, 0, 0.25);
}
.dark-mode .talent-tag {
  backdrop-filter: blur(1px);
}
.dark-mode .talent-card:hover {
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.35);
}
.dark-mode .talent-effect {
  background: rgba(255, 255, 255, 0.03);
}
.dark-mode .talent-source-wrapper {
  background: rgba(194, 65, 12, 0.15);
  color: #fdba74;
}
.dark-mode .talent-source-wrapper:hover {
  background: rgba(194, 65, 12, 0.25);
}
.dark-mode .suggest-char-tag {
  background: rgba(0, 122, 255, 0.1);
  color: #7dd3fc;
  border-color: rgba(0, 122, 255, 0.2);
}
.dark-mode .suggest-char-tag:hover {
  background: rgba(0, 122, 255, 0.2);
}
.dark-mode .clear-char-btn {
  background: rgba(239, 68, 68, 0.15);
  color: #fca5a5;
}
.dark-mode .clear-char-btn:hover {
  background: rgba(239, 68, 68, 0.25);
}
.dark-mode .load-more-sentinel {
  color: #64748b;
}
.dark-mode .loading-spinner {
  border-color: rgba(255,255,255,0.1);
}
.dark-mode .matched-hero-card {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.1);
}
.dark-mode .matched-hero-card:hover {
  background: rgba(255, 255, 255, 0.08);
}
.dark-mode .hero-name-span {
  color: #f8fafc;
}
.dark-mode .label-job {
  background-color: rgba(37, 99, 235, 0.2);
  color: #93c5fd;
  border-color: rgba(37, 99, 235, 0.3);
}
.dark-mode .label-race {
  background-color: rgba(124, 58, 237, 0.2);
  color: #c4b5fd;
  border-color: rgba(124, 58, 237, 0.3);
}
.dark-mode .label-attr {
  background-color: rgba(234, 88, 12, 0.2);
  color: #fdba74;
  border-color: rgba(234, 88, 12, 0.3);
}
</style>