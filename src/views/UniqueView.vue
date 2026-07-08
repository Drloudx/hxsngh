<template>
  <div class="talent-container">
    <div class="talent-sticky-top">
      <div class="talent-search-row">
        <div class="talent-search-box">
          <img src="/ui/search.svg" class="search-icon" />
          <input
            type="text"
            v-model="searchQuery"
            @input="handleInput"
            placeholder="技能名、效果、角色名、类型..."
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
      <div class="filter-area">
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

        <!-- 效果标签筛选 -->
        <div v-if="allDisplayTags.length > 0" class="effect-filter-bar">
          <div class="effect-filter-header" @click="toggleEffectExpand">
            <span class="effect-filter-title">查找效果：</span>
            <div class="effect-toggle-wrapper">
              <span class="effect-toggle-text">{{ effectExpanded ? '点击收起' : '点击展开' }}</span>
              <img src="/ui/up.svg" class="collapse-icon" :class="{ collapsed: !effectExpanded }" />
            </div>
          </div>
          <div v-if="effectExpanded" class="effect-tags-list">
            <span
              v-for="tag in allDisplayTags"
              :key="tag"
              :class="['effect-tag', isActiveTag(tag) ? 'active' : '']"
              @click="toggleFilterTag(tag)"
            >
              {{ tag }}
              <span v-if="isActiveTag(tag)" class="tag-close-x">✕</span>
            </span>
          </div>
        </div>
      </div>

      <!-- 检索数量统计 -->
      <div class="search-count-bar">
        当前检索技能数量：<span class="count-highlight">{{ sortedSkills.length }}</span>
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

            <!-- 第一行：头像、名称、图标与来源绑定 -->
            <div class="talent-top-bar">
              <div class="talent-char-avatar-container">
                <img
                  :src="`/Header/${item.charId}.png`"
                  class="talent-char-avatar-img game-sprite"
                  @error="handleIconError"
                />
              </div>

              <span class="talent-name" :style="{ color: getTalentStepConfig(item.step).color }">{{ item.name }}</span>

              <div class="skill-mini-box" :title="`技能图标ID: ${item.iconId}`">
                <img :src="`/Skill/${item.iconId}.png`" class="skill-mini-img" @error="handleIconError" />
              </div>

              <div class="top-bar-spacer" style="flex: 1;"></div>
              <div class="talent-source-wrapper" @click="openSourceModal(item)">
                <span class="talent-source">{{ item.sourceLabel }}</span>
                <img src="/ui/expand.svg" class="source-expand-icon" />
              </div>
            </div>

            <!-- 第二行：详细效果 -->
            <div class="talent-effect">
              {{ item.formattedEffect }}
            </div>

            <!-- 第三行：技能详情规格参数 -->
            <div class="skill-specs">
              目标：{{ item.target }} | 目标数：{{ item.maxTarget }} | 释放次数：{{ item.times }}
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
        <span>正在加载更多技能...</span>
      </div>

      <div
        v-if="sortedSkills.length > 0 && pagedSkills.length >= sortedSkills.length"
        class="no-more-data"
      >
        — 已加载全部技能 —
      </div>

      <div v-if="sortedSkills.length === 0" class="no-data">未找到匹配的技能</div>
    </div>

    <!-- 角色绑定弹窗 -->
    <div v-if="sourceModalVisible" class="modal-overlay" @click.self="closeSourceModal">
      <div class="modal-window">
        <div class="modal-header">
          <h3>技能归属: {{ currentSource }}</h3>
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
import rawUniqueSkills from '@/assets/UniqueDataTable.json'

// 配置：手动屏蔽的角色 ID 列表
const BLOCKED_CHARACTER_IDS = [
  'M23301_001', // [熔岩]史莱姆王
  'M11303_002', // [熔岩]雪人骑士
]

// 筛选响应式变量
const searchQuery = ref('')
const showSubSearch = ref(false)
const subSearchQuery = ref('')
const selectedCharacter = ref(null)
const selectedFilterTags = ref([])
const globalBracketTags = ref(new Set())
const effectExpanded = ref(false)
const toggleEffectExpand = () => {
  effectExpanded.value = !effectExpanded.value
}

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
 * 图片加载失败的降级处理器
 */
const handleIconError = (e) => {
    e.target.src = '/Header/M00000.png'
}

// 监听
watch(searchQuery, () => {
  displayLimit.value = PAGE_SIZE
  subSearchQuery.value = '' // 主检索变了，清空次筛词
})

watch(subSearchQuery, () => {
  displayLimit.value = PAGE_SIZE
})

watch(showSubSearch, (val) => {
  if (!val) {
    subSearchQuery.value = '' // 折叠时清空
  }
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

const primarySortedSkills = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  let baseList = allSkills.value

  if (selectedCharacter.value) {
    const char = selectedCharacter.value
    return baseList.filter(s => s.character.id === char.id)
  }

  if (!q) {
    return [...baseList]
  }

  const filtered = baseList.filter(s => {
    const fields = [
      (s.name || '').toLowerCase(),
      (s.formattedEffect || '').toLowerCase(),
      (s.sourceLabel || '').toLowerCase(),
      (s.skillType || '').toLowerCase(),
      (s.target || '').toLowerCase(),
      (s.targetType || '').toLowerCase(),
      (s.actionType || '').toLowerCase()
    ]
    return fields.some(f => f.includes(q))
  })

  return filtered
})

// 效果标签过滤
const tagFilteredSkills = computed(() => {
  const list = primarySortedSkills.value
  if (selectedFilterTags.value.length === 0) return list
  return list.filter(s =>
    selectedFilterTags.value.every(tag => s.filterTags && s.filterTags.includes(tag))
  )
})

// 提取当前所有的搜索关键词 (包括主搜和次筛)
const queryKeywords = computed(() => {
  const qStr = (searchQuery.value || '').trim().toLowerCase()
  const subQStr = (subSearchQuery.value || '').trim().toLowerCase()
  return [
    ...qStr.split(/[\s,，]+/).filter(Boolean),
    ...subQStr.split(/[\s,，]+/).filter(Boolean)
  ]
})

// 判断一个标签是否处于激活选中状态（被手动选中，或正好出现在搜索框词组中）
const isActiveTag = (tag) => {
  const lowerTag = tag.toLowerCase()
  return selectedFilterTags.value.includes(tag) || queryKeywords.value.includes(lowerTag)
}

// 效果标签池
const allDisplayTags = computed(() => {
  const tags = new Set()
  selectedFilterTags.value.forEach(t => tags.add(t))

  const keywords = queryKeywords.value

  // 获取数据库中的所有唯一有效标签
  const dbTags = new Set()
  allSkills.value.forEach(s => {
    if (s.filterTags) {
      s.filterTags.forEach(t => dbTags.add(t))
    }
  })

  dbTags.forEach(t => {
    if (keywords.includes(t.toLowerCase())) {
      tags.add(t)
    }
  })

  sortedSkills.value.forEach(s => {
    if (s.filterTags) {
      s.filterTags.forEach(t => tags.add(t))
    }
  })

  const combinedList = Array.from(tags)

  const getTagGroupRank = (t) => {
    if (selectedFilterTags.value.includes(t)) {
      return 1 // 已选高亮置顶
    }
    if (globalBracketTags.value.has(t)) {
      return 2 // 【】括号提取出来的标识词
    }
    if (t.endsWith('符文')) {
      return 3 // 符文类标签
    }
    if (t.endsWith('相关')) {
      return 4 // 效果相关标签
    }
    return 5 // 数据库普通标签
  }

  // 排序规则：已选中 > 括号提取 > xx符文 > xx相关 > 数据库普通标签，每组内部按拼音中文排序
  combinedList.sort((a, b) => {
    const rankA = getTagGroupRank(a)
    const rankB = getTagGroupRank(b)

    if (rankA !== rankB) {
      return rankA - rankB
    }

    return a.localeCompare(b, 'zh')
  })

  return combinedList
})

// 从搜索框和二次筛选中清除特定关键词
const removeKeywordFromSearch = (tag) => {
  const lowerTag = tag.toLowerCase()
  const filterInput = (refVar) => {
    const val = refVar.value || ''
    const words = val.split(/[\s,，]+/).filter(Boolean)
    const filtered = words.filter(w => w.toLowerCase() !== lowerTag)
    refVar.value = filtered.join(' ')
  }
  filterInput(searchQuery)
  filterInput(subSearchQuery)
}

// 切换标签筛选状态
const toggleFilterTag = (tag) => {
  const lowerTag = tag.toLowerCase()
  const inSelected = selectedFilterTags.value.includes(tag)
  const inQuery = queryKeywords.value.includes(lowerTag)

  if (inSelected || inQuery) {
    if (inSelected) {
      const idx = selectedFilterTags.value.indexOf(tag)
      selectedFilterTags.value.splice(idx, 1)
    }
    if (inQuery) {
      removeKeywordFromSearch(tag)
    }
  } else {
    selectedFilterTags.value.push(tag)
  }
  displayLimit.value = PAGE_SIZE
}

// 二次过滤后的最终技能列表
const sortedSkills = computed(() => {
  const list = tagFilteredSkills.value
  const subQ = subSearchQuery.value.trim()
  if (!subQ) return list

  return list.filter(s => {
    const fields = [
      (s.name || '').toLowerCase(),
      (s.formattedEffect || '').toLowerCase(),
      (s.sourceLabel || '').toLowerCase(),
      (s.skillType || '').toLowerCase(),
      (s.target || '').toLowerCase(),
      (s.targetType || '').toLowerCase(),
      (s.actionType || '').toLowerCase()
    ]
    return fields.some(f => f.includes(subQ.toLowerCase()))
  })
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
  const rawUniqueArr = configUtil.extractDataArray(rawUniqueSkills)

  const fullDatasets = {
    supportList: [],
    skillList: rawUniqueArr,
    talentList: [],
    relicList: [],
    noteList: []
  }

  const fullCharacters = configUtil.getFullCharacterList(rawRoleArr, fullDatasets).filter(c => !BLOCKED_CHARACTER_IDS.includes(c.id))
  allCharacters.value = fullCharacters

  const bTags = new Set()
  const list = []
  fullCharacters.forEach(c => {
    c.activeSkills.forEach(s => {
      // 从描述文本中提取所有 【xxx】 里的标识词
      const prefixTags = []
      const regex = /【([^】]+)】/g
      let m
      const descText = s.formattedDesc || s.description || ''
      while ((m = regex.exec(descText)) !== null) {
        if (m[1]) {
          const cleanTag = m[1].trim()
          if (cleanTag && !prefixTags.includes(cleanTag)) {
            prefixTags.push(cleanTag)
            bTags.add(cleanTag)
          }
        }
      }

      // 从 positiveTags 和 negativeTags 中提取，并过滤掉含有 Owner 名的标签
      const ownerName = (s.owner || c.displayName || '').trim()
      const rawTags = [...(s.positiveTags || []), ...(s.negativeTags || [])]
      const dbTagsFiltered = rawTags
        .map(t => t.trim())
        .filter(t => {
          if (!t) return false
          if (ownerName && t.includes(ownerName)) return false
          return true
        })

      list.push({
        uid: s.id,
        name: s.name || '未命名技能',
        step: c.step,
        target: s.target,
        maxTarget: s.maxTarget,
        times: s.times,
        skillType: s.skillType,
        actionType: s.actionType,
        targetType: s.targetType,
        formattedEffect: s.formattedDesc || '无描述',
        sourceLabel: c.displayName,
        character: c,
        charId: c.id,
        iconId: s.icon || 'default',
        filterTags: [...prefixTags, ...dbTagsFiltered]
      })
    })
  })

  globalBracketTags.value = bTags

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
    return a.character.id.localeCompare(b.character.id)
  })

  allSkills.value = list
})

onUnmounted(() => {
  if (observer) observer.disconnect()
})
</script>

<style scoped>
.talent-search-row {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  flex-shrink: 0;
}

.sub-filter-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 6px 10px;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0,0,0,0.02);
  transition: all 0.2s ease;
  flex-shrink: 0;
  color: var(--text-main) !important;
  height: 38px;
}
.sub-filter-btn:hover, .sub-filter-btn.active {
  border-color: var(--primary);
  color: var(--primary) !important;
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

.sub-search-box {
  display: flex;
  align-items: center;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 8px 14px;
  margin-top: 10px;
  box-shadow: inset 0 1px 4px rgba(0, 0, 0, 0.06);
  transition: border-color 0.2s ease;
  width: 100%;
}
.sub-search-box:focus-within {
  border-color: var(--primary);
}
.sub-search-icon {
  width: 16px;
  height: 16px;
  filter: var(--icon-filter);
  margin-right: 8px;
  opacity: 0.7;
  flex-shrink: 0;
}
.sub-search-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 14px;
  color: var(--text-main);
  font-family: inherit;
}

/* 检索统计栏 */
.search-count-bar {
  padding: 6px 12px 2px 12px;
  font-size: 12px;
  color: var(--text-main); /* 黑色高对比字体 */
  text-align: left;
  font-weight: 600;
  display: flex;
  align-items: center;
}
.count-highlight {
  color: var(--primary);
  font-weight: 800;
  margin: 0 4px;
}

/* 过渡动画 */
.slide-fade-enter-active, .slide-fade-leave-active {
  transition: all 0.2s ease;
}
.slide-fade-enter-from, .slide-fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

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
  font-family: 'HarmonyOS Sans SC', sans-serif;
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
  padding: 10px 10px;
  gap: 0;
  box-shadow: inset 0 1px 4px rgba(0, 0, 0, 0.06);
  transition: border-color 0.2s ease;
  flex: 1;
  min-width: 0;
}

.talent-search-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 13px;
  color: var(--text-main);
  font-family: inherit;
  min-width: 0;
}

/* 效果标签筛选 */
.effect-filter-bar {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 10px 12px;
  box-shadow: 0 2px 6px rgba(0,0,0,0.02);
  margin-top: 8px;
}

.effect-filter-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
}

.effect-toggle-wrapper {
  display: flex;
  align-items: center;
  gap: 4px;
}

.effect-toggle-text {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-main);
  user-select: none;
}

.effect-filter-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-sub);
}

.effect-tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
  max-height: 60vh;
  overflow-y: auto;
  padding-right: 4px;
}

.effect-tag {
  font-size: 11.5px;
  padding: 4px 8px;
  background: var(--bg);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
  color: var(--text-main);
  display: flex;
  align-items: center;
  gap: 4px;
  user-select: none;
}
.effect-tag:hover {
  border-color: var(--primary);
  background: var(--card-bg);
}
.effect-tag.active {
  background: var(--primary-light, rgba(249,115,22,0.1)) !important;
  border-color: var(--primary) !important;
  color: var(--primary) !important;
  font-weight: 600;
}

.tag-close-x {
  font-size: 10px;
  opacity: 0.8;
}

.talent-sub-header {
  margin-top: 8px;
  padding: 0 4px;
  text-align: center !important;
  width: 100% !important;
  display: block !important;
}

.talent-hint-text {
  font-size: 12px;
  color: var(--text-sub);
  text-align: center !important;
  display: inline-block !important;
}

.filter-area {
  margin-top: 8px;
}

.selected-char-bar {
  display: flex;
  justify-content: flex-start;
  padding: 2px 4px;
}

.clear-char-btn {
  background: #fee2e2;
  color: #ef4444;
  border: 1px solid #fecaca;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}
.clear-char-btn:hover {
  background: #fecaca;
}

.char-suggest-bar {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 10px 12px;
  box-shadow: 0 2px 6px rgba(0,0,0,0.02);
}

.suggest-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
}

.suggest-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-sub);
}

.suggest-tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

.suggest-char-tag {
  font-size: 11.5px;
  padding: 4px 8px;
  background: var(--bg);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
}
.suggest-char-tag:hover {
  border-color: var(--primary);
  background: var(--card-bg);
}

.talent-list {
  flex: 1;
  overflow-y: auto;
  padding: 0px 4px 10px 4p;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.talent-card {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 4px 10px rgba(0,0,0,0.02);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.talent-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 15px rgba(0,0,0,0.04);
}

.talent-main-content {
  display: flex;
  gap: 12px;
}

.talent-details-body {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.talent-top-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 10px;
}

.talent-char-avatar-container {
  width: 35px;
  height: 35px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  overflow: hidden;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.talent-char-avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center center;
  /* 先等比放大（比如 1.4 倍，切掉部分空白），然后再垂直向下平移（translateY） */
  /* 如果向下移得太多，就把 5px 改小（如 3px）；如果还不够，就改大（如 8px） */
  transform: scale(1.4) translateY(2px);
}

img.game-sprite {
  image-rendering: pixelated;
  image-rendering: -moz-crisp-edges;
  image-rendering: crisp-edges;
}

.talent-name {
  font-size: 16px;
  font-weight: 700;
}

.skill-mini-box {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  border: 1px solid var(--border-color);
  overflow: hidden;
  background: rgba(0,0,0,0.02);
}
.skill-mini-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.filter-toggle-text {
  font-size: 12px;
  font-weight: 600 !important;
  color: var(--text-main) !important;
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

.talent-source {
  font-size: 12.5px;
  font-weight: 500;
  color: inherit;
}

.source-expand-icon {
  width: 18px;
  height: 18px;
  margin-left: 3px;
  filter: var(--icon-filter);
  opacity: 0.8;
}

.talent-effect {
  font-size: 13.5px;
  color: var(--text-main);
  line-height: 1.5;
  background: rgba(0,0,0,0.01);
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid rgba(0,0,0,0.02);
  text-align: left;
}

.skill-specs {
  font-size: 11px;
  color: var(--text-sub);
  margin-top: 8px;
  font-weight: 500;
  padding-top: 8px;
  text-align: left;
}

.load-more-sentinel {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 20px 0;
  color: var(--text-sub);
  font-size: 13px;
}

.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid var(--border-color);
  border-top-color: #409eff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.no-more-data {
  text-align: center;
  padding: 24px 0;
  color: var(--text-sub);
  font-size: 13px;
  opacity: 0.6;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 弹窗遮罩 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.4);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-window {
  width: 90%;
  max-width: 420px;
  background: var(--card-bg);
  border-radius: 20px;
  box-shadow: 0 10px 25px rgba(0,0,0,0.15);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg);
}
.modal-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: var(--text-main);
}

.modal-close-x {
  border: none;
  background: transparent;
  font-size: 18px;
  cursor: pointer;
  color: var(--text-sub);
}

.modal-body {
  padding: 20px;
  max-height: 60vh;
  overflow-y: auto;
}

.match-chars-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.matched-hero-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(0,0,0,0.01);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 10px 14px;
}

.hero-name-span {
  font-size: 14.5px;
}

.hero-labels-container {
  display: flex;
  gap: 4px;
}

.h-lbl {
  font-size: 10.5px;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 500;
}
.label-job {
  background: rgba(59,130,246,0.08);
  color: #3b82f6;
}
.label-race {
  background: rgba(168,85,247,0.08);
  color: #a855f7;
}
.label-attr {
  background: rgba(16,185,129,0.08);
  color: #10b981;
}

.matched-hero-none {
  text-align: center;
  padding: 20px 0;
  color: var(--text-sub);
  font-size: 14px;
}

/* 通用无数据 */
.no-data {
  text-align: center;
  padding: 40px;
  color: var(--text-sub);
  font-size: 14px;
}

/* 深色模式适配 */
.dark-mode .talent-effect {
  background: rgba(64, 158, 255, 0.08);
}
.dark-mode .talent-search-box {
  border-color: rgba(255, 255, 255, 0.1);
}
.dark-mode .suggest-char-tag {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255,255,255,0.1);
}
.dark-mode .suggest-char-tag:hover {
  background: rgba(255, 255, 255, 0.15);
}
.dark-mode .clear-char-btn {
  background: rgba(239, 68, 68, 0.2);
  color: #f87171;
  border-color: rgba(239, 68, 68, 0.3);
}
.dark-mode .clear-char-btn:hover {
  background: rgba(239, 68, 68, 0.3);
}
.dark-mode .char-suggest-bar {
  border-color: rgba(255,255,255,0.1);
}
.dark-mode .talent-card {
  border-color: rgba(255,255,255,0.1);
}
.dark-mode .matched-hero-card {
  border-color: rgba(255,255,255,0.1);
}
.dark-mode .modal-header {
  border-bottom-color: rgba(255,255,255,0.1);
}
.dark-mode .talent-source-wrapper {
      background: rgba(251, 146, 60, 0.15);
    color: #ffedd5;
    border: 1px solid rgba(251, 146, 60, 0.3);
}
</style>
