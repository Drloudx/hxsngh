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
            placeholder="支援技能详细、角色名..."
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

        <!-- 效果标签筛选 -->
        <div v-if="allDisplayTags.length > 0" class="effect-filter-bar">
          <div class="effect-filter-header" @click="toggleEffectExpand">
            <span class="effect-filter-title">查找效果：</span>
            <div class="effect-toggle-wrapper">
              <span class="effect-toggle-text">{{ effectExpanded ? '点击收起' : '点击展开' }}</span>
              <img src="/ui/up.svg" class="collapse-icon" :class="{ collapsed: !effectExpanded }" />
            </div>
          </div>
          <div v-if="effectExpanded" class="categorized-effect-tags">
            <div v-for="(group, idx) in categorizedTags" :key="group.name" class="tag-group-container">
              <div class="tag-group-header">
                <span class="group-title">{{ group.name }}</span>
              </div>
              <div class="effect-tags-list">
                <span
                  v-for="tag in group.tags"
                  :key="tag"
                  :class="['effect-tag', isActiveTag(tag) ? 'active' : '']"
                  @click="toggleFilterTag(tag)"
                >
                  {{ formatTagText(tag) }}
                  <span v-if="isActiveTag(tag)" class="tag-close-x">✕</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 检索数量统计 -->
      <div class="search-count-bar">
        当前检索支援技能数量：<span class="count-highlight">{{ sortedSkills.length }}</span>
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
              <div class="talent-char-avatar-container">
                <img
                  :src="`/Header/${item.charId}.png`"
                  class="talent-char-avatar-img game-sprite"
                  @error="handleIconError"
                />
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

              <div class="top-bar-spacer" style="flex: 1;"></div>
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
import rawRoles from '@/assets/Role.json'
import rawSupportSkills from '@/assets/Sub_Skill.json'
import { getCategoryByTag } from '@/utils/tagCategories'
import { getVisibleCharacters } from '@/utils/characterFilter'

// 筛选响应式变量
const selectedStar = ref(null)
const searchQuery = ref('')
const showSubSearch = ref(false)
const subSearchQuery = ref('')
const selectedCharacter = ref(null)
const selectedFilterTags = ref([])
const globalBracketTags = ref(new Set())

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
  subSearchQuery.value = '' // 主检索变了，清空次筛词
  selectedFilterTags.value = [] // 重置已选标签
})

watch(subSearchQuery, () => {
  displayLimit.value = PAGE_SIZE
})

watch(showSubSearch, (val) => {
  if (!val) {
    subSearchQuery.value = '' // 折叠时清空
  }
})

watch(selectedStar, () => {
  displayLimit.value = PAGE_SIZE
  selectedFilterTags.value = [] // 重置已选标签
})

watch(selectedFilterTags, () => {
  displayLimit.value = PAGE_SIZE
}, { deep: true })

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

const effectExpanded = ref(false)
const toggleEffectExpand = () => {
  effectExpanded.value = !effectExpanded.value
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

  const filtered = baseList.filter(s => {
    const fields = [
      (s.name || '').toLowerCase(),
      (s.formattedEffect || '').toLowerCase(),
      (s.sourceLabel || '').toLowerCase()
    ]
    return fields.some(f => f.includes(q.toLowerCase()))
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

// 效果标签池（从当前 tagFilteredSkills.value 中提取，并加上已选中的，去重）
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

// 效果标签池（从当前 tagFilteredSkills.value 中提取，并加上已选中的，以及在搜索框内已被激活的，去重，且前置括号内的标志词）
const allDisplayTags = computed(() => {
  const tags = new Set()
  // 始终保留已点击选中的标签
  selectedFilterTags.value.forEach(t => tags.add(t))

  const keywords = queryKeywords.value

  // 获取数据库中的所有唯一有效标签
  const dbTags = new Set()
  allSkills.value.forEach(s => {
    if (s.filterTags) {
      s.filterTags.forEach(t => dbTags.add(t))
    }
  })

  // 如果输入的搜索词本身就是一个真实存在的标签，把它以激活状态加入标签池以显式说明“当前已过滤了该效果”
  dbTags.forEach(t => {
    if (keywords.includes(t.toLowerCase())) {
      tags.add(t)
    }
  })

  // 将当前过滤出的其他可用相关标签放进标签池
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

// 效果标签按大类分组
const categorizedTags = computed(() => {
  const groups = {
    "数值": [],
    "机制": [],
    "时机": [],
    "状态": [],
    "其他": []
  }
  
  allDisplayTags.value.forEach(tag => {
    const category = getCategoryByTag(tag)
    if (groups[category]) {
      groups[category].push(tag)
    } else {
      groups["其他"].push(tag)
    }
  })
  
  return Object.entries(groups)
    .filter(([_, tags]) => tags.length > 0)
    .map(([name, tags]) => {
      const sortedTags = [...tags].sort((a, b) => {
        const lenA = formatTagText(a).length
        const lenB = formatTagText(b).length
        return lenB - lenA
      })
      return { name, tags: sortedTags }
    })
})

// 辅助函数：格式化显示的标签文本
const formatTagText = (tag) => {
  if (tag.endsWith('相关')) {
    return tag.slice(0, -2)
  }
  return tag
}

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
    // 处于激活状态，需进行取消选中操作
    if (inSelected) {
      const idx = selectedFilterTags.value.indexOf(tag)
      selectedFilterTags.value.splice(idx, 1)
    }
    if (inQuery) {
      removeKeywordFromSearch(tag)
    }
  } else {
    // 处于未激活状态，将其加入选中列表
    selectedFilterTags.value.push(tag)
  }
}

// 二次过滤后的最终支援技能列表
const sortedSkills = computed(() => {
  const list = tagFilteredSkills.value
  const subQ = subSearchQuery.value.trim()
  if (!subQ) return list

  return list.filter(s => {
    const fields = [
      (s.name || '').toLowerCase(),
      (s.formattedEffect || '').toLowerCase(),
      (s.sourceLabel || '').toLowerCase()
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
  selectedFilterTags.value = [] // 重置已选标签
}

const clearSelectedCharacter = () => {
  selectedCharacter.value = null
  displayLimit.value = PAGE_SIZE
  selectedFilterTags.value = [] // 重置已选标签
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

  const fullCharacters = getVisibleCharacters(configUtil.getFullCharacterList(rawRoleArr, fullDatasets))
  allCharacters.value = fullCharacters

  const bTags = new Set()
  const list = []
  fullCharacters.forEach(c => {
    const skills = [
      c.supportSkills.characteristic,
      c.supportSkills.subClass,
      c.supportSkills.feature
    ]
    skills.forEach(s => {
      if (s && s.id) {
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
              bTags.add(cleanTag) // 加入全局首部标识标签库
            }
          }
        }

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
          iconId: s.Icon || s.icon || 'default',
          filterTags: [...prefixTags, ...(s.filterTags || [])]
        })
      }
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
.talent-search-row {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  flex-shrink: 0;
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
  color: var(--text-main);
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
  padding: 10px 14px;
  gap: 0;
  box-shadow: inset 0 1px 4px rgba(0, 0, 0, 0.06);
  transition: border-color 0.2s ease;
  flex: 1;
  min-width: 0;
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

.talent-search-row {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
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
  font-size: 12px;
  color: var(--text-main);
}

.sub-filter-btn:hover {
  border-color: #409eff;
  color: #409eff;
}

.sub-filter-btn.active {
  background: #eff6ff;
  border-color: #3b82f6;
  color: #3b82f6;
}

.dark-mode .sub-filter-btn.active {
  background: rgba(59, 130, 246, 0.2);
  border-color: #3b82f6;
  color: #60a5fa;
}

.filter-toggle-text {
  font-size: 12px;
  font-weight: 600;
}

.collapse-icon {
  width: 14px;
  height: 14px;
  filter: var(--icon-filter);
  transition: transform 0.2s ease;
}

.collapse-icon.collapsed {
  transform: rotate(180deg);
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
}

/* 第一行标题栏：各项元素居中对齐 */
.talent-top-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  width: 100%;
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

  /* 1. 恢复居中对齐 */
  object-position: center center;

  /* 2. 先等比放大（比如 1.4 倍，切掉部分空白），然后再垂直向下平移（translateY） */
  /* 如果向下移得太多，就把 5px 改小（如 3px）；如果还不够，就改大（如 8px） */
  transform: scale(1.4) translateY(2px);
}

img.game-sprite {
  image-rendering: pixelated;
  image-rendering: -moz-crisp-edges;
  image-rendering: crisp-edges;
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
  padding: 5px 10px;
  background: var(--bg);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
  color: var(--text-main);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  user-select: none;
  white-space: nowrap;
  word-break: keep-all;
  flex-shrink: 0;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
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

.talent-sub-header { text-align: center !important; flex-shrink: 0; width: 100% !important; display: block !important; }
.talent-hint-text { text-align: center !important; font-size: 12px; color: var(--text-sub); opacity: 0.8; display: inline-block !important; }

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
  background: rgba(251, 146, 60, 0.15);
  color: #ffedd5;
  border: 1px solid rgba(251, 146, 60, 0.3);
}
.dark-mode .talent-source-wrapper:hover {
  background: rgba(251, 146, 60, 0.25);
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

/* 分类标签样式 */
.categorized-effect-tags {
  max-height: 480px;
  overflow-y: auto;
  padding-right: 4px;
}

.tag-group-header {
  margin: 8px 0 6px;
  font-size: 12px;
  font-weight: 800;
  color: var(--text-sub, #64748b);
  display: flex;
  align-items: center;
  gap: 6px;
}
.tag-group-header::before {
  content: '';
  display: inline-block;
  width: 4px;
  height: 12px;
  background: var(--text-sub, #64748b);
  border-radius: 2px;
}
</style>