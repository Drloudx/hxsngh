<template>
  <div class="talent-container">
    <div class="talent-search-wrapper">
      <div class="talent-search-box">
        <img src="/ui/search.svg" class="search-icon" />
        <input
          type="text"
          v-model="searchQuery"
          @input="handleInput"
          placeholder="搜索关键字(天赋详细、天赋名、角色名)..."
          class="talent-search-input"
        />
      </div>

      <div v-if="selectedCharacter" class="selected-char-bar">
        <button class="clear-char-btn" @click="clearSelectedCharacter">
          清除绑定: {{ selectedCharacter.角色名 }} ✕
        </button>
      </div>

      <div v-if="suggestedCharacters.length > 0 && !selectedCharacter" class="char-suggest-bar">
        <span class="suggest-title">是否查找角色：</span>
        <div class="suggest-tags-list">
          <span
            v-for="char in suggestedCharacters"
            :key="char.角色名"
            :class="['suggest-char-tag', `wish-rarity-color-${char.稀有度}`]"
            @click="selectCharacter(char)"
          >
            {{ char.角色名 }}
          </span>
        </div>
      </div>
    </div>

    <div class="talent-list">
      <div
        v-for="item in pagedTalents"
        :key="item.天赋名称"
        class="talent-card"
      >
        <div class="talent-top-bar">
          <span class="talent-name">{{ item.天赋名称 }}</span>
          <span class="talent-tag">{{ item.标签 }}</span>

          <div class="talent-source-wrapper">
            <span class="talent-source-label">来源：</span>
            <span class="talent-source">{{ item.二级类目 }}</span>
          </div>
        </div>
        <div class="talent-effect">
          {{ item.天赋效果 }}
        </div>

        <div v-if="item.备注 && item.备注.trim() !== ''" class="talent-bottom-bar">
          <span class="talent-remark-label">注：</span>
          <span class="talent-remark-content">{{ item.备注 }}</span>
        </div>

        <div v-if="getTypeTag(item) !== '专属' && getTypeTag(item) !== '通用'" class="talent-combination-bar">
          <div class="combination-flex-layout">
            <div class="combination-wrapper">
              <span class="combination-text">组合</span>

              <span
                v-for="(combName, idx) in (selectedCombinations[item.天赋名称] || [])"
                :key="idx"
                class="added-comb-tag"
              >
                {{ combName }}
              </span>

              <button class="combination-plus-btn" @click="handleCombinationClick(item)">
                <img src="/ui/plus.svg" class="plus-icon" />
              </button>

              <button
                v-if="selectedCombinations[item.天赋名称] && selectedCombinations[item.天赋名称].length > 0"
                class="combination-minus-btn"
                @click="removeLastCombination(item.天赋名称)"
              >
                <img src="/ui/minus.svg" class="minus-icon" />
              </button>
            </div>

            <div
              v-if="selectedCombinations[item.天赋名称] && selectedCombinations[item.天赋名称].length > 0"
              class="matched-characters-row"
            >
              <div class="match-title">可产出角色：</div>
              <div class="match-chars-list">
                <span
                  v-for="hero in getMatchedHeros(item)"
                  :key="hero.角色名"
                  class="matched-hero-tag"
                >
                  <span :class="`wish-rarity-color-${hero.稀有度}`" class="hero-name-span">{{ hero.角色名 }}</span>
                  <span class="hero-split-labels">
                    <span v-if="hero.职业" class="h-lbl label-job">{{ hero.职业 }}</span>
                    <span v-if="hero.种族" class="h-lbl label-race">{{ hero.种族 }}</span>
                    <span v-if="hero.属性" class="h-lbl label-attr">{{ hero.属性 }}</span>
                  </span>
                </span>
                <span
                  v-if="getMatchedHeros(item).length === 0"
                  class="matched-hero-none"
                >
                  无角色同时满足此天赋组合
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        ref="loadMoreSentinel"
        class="load-more-sentinel"
        v-if="pagedTalents.length < sortedTalents.length"
      >
        <div class="loading-spinner"></div>
        <span>正在加载更多天赋...</span>
      </div>

      <div
        v-if="sortedTalents.length > 0 && pagedTalents.length >= sortedTalents.length"
        class="no-more-data"
      >
        — 已加载全部天赋 —
      </div>

      <div v-if="sortedTalents.length === 0" class="no-data">未找到匹配的天赋</div>
    </div>

    <div v-if="modalVisible" class="modal-overlay" @click.self="closeModal">
      <div class="modal-window">
        <div class="modal-header">
          <h3>选择组合天赋 (初始来源: {{ currentActiveItem?.二级类目 }})</h3>
          <button class="modal-close-x" @click="closeModal">✕</button>
        </div>

        <div class="modal-body">
          <div class="modal-search-box">
            <img src="/ui/search.svg" class="modal-search-icon" />
            <input
              type="text"
              v-model="modalSearchQuery"
              placeholder="搜索关键字/天赋名称/天赋详细..."
              class="modal-search-input"
            />
          </div>

          <div v-if="modalDerivedTagsGrouped.hasTags" class="modal-tags-filter-bar">
            <span class="filter-hint">关系标签筛选：</span>
            <div class="filter-tags-flex-container">
              <div v-if="modalDerivedTagsGrouped.jobs.length > 0" class="filter-group-zone zone-job">
                <span
                  v-for="tag in modalDerivedTagsGrouped.jobs"
                  :key="tag"
                  :class="['filter-badge', 'badge-job', { 'active': activeModalFilterTags.includes(tag) }]"
                  @click="toggleModalFilterTag(tag)"
                >
                  {{ tag }}
                </span>
              </div>
              <div v-if="modalDerivedTagsGrouped.jobs.length > 0 && (modalDerivedTagsGrouped.races.length > 0 || modalDerivedTagsGrouped.attrs.length > 0)" class="tag-group-divider"></div>

              <div v-if="modalDerivedTagsGrouped.races.length > 0" class="filter-group-zone zone-race">
                <span
                  v-for="tag in modalDerivedTagsGrouped.races"
                  :key="tag"
                  :class="['filter-badge', 'badge-race', { 'active': activeModalFilterTags.includes(tag) }]"
                  @click="toggleModalFilterTag(tag)"
                >
                  {{ tag }}
                </span>
              </div>
              <div v-if="modalDerivedTagsGrouped.races.length > 0 && modalDerivedTagsGrouped.attrs.length > 0" class="tag-group-divider"></div>

              <div v-if="modalDerivedTagsGrouped.attrs.length > 0" class="filter-group-zone zone-attr">
                <span
                  v-for="tag in modalDerivedTagsGrouped.attrs"
                  :key="tag"
                  :class="['filter-badge', 'badge-attr', { 'active': activeModalFilterTags.includes(tag) }]"
                  @click="toggleModalFilterTag(tag)"
                >
                  {{ tag }}
                </span>
              </div>
            </div>
          </div>

          <div class="modal-talents-list">
            <div
              v-for="t in filteredModalTalents"
              :key="t.天赋名称"
              class="modal-talent-row"
              @click="confirmSelectTalent(t.天赋名称)"
            >
              <div class="mtr-top">
                <span class="mtr-name">{{ t.天赋名称 }}</span>
                <span class="mtr-tag">{{ t.标签 }}</span>
                <span class="mtr-source">来源: {{ t.二级类目 }}</span>
              </div>
              <div class="mtr-effect">{{ t.天赋效果 }}</div>
            </div>
            <div v-if="filteredModalTalents.length === 0" class="modal-no-data">
              该筛选条件下未找到可用的天赋数据
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, reactive } from 'vue'
import talents from '@/assets/talent.json'
import characters from '@/assets/character.json'

// 定义固定的标准归类，用来做精确排序与区块隔断
const JOB_KEYWORDS = ['战士', '射手', '法师', '牧师', '刺客', '骑士']
const RACE_KEYWORDS = ['亡灵', '不死族', '羽族', '神族', '巨魔', '人类', '精灵', '兽人', '龙族', '恶魔']
const ATTR_KEYWORDS = ['地系', '暗系', '水系', '火系', '风系', '光系', '雷系']

// 核心主状态区
const searchQuery = ref('')
const selectedCharacter = ref(null)
const displayLimit = ref(20)
const PAGE_SIZE = 20

const loadMoreSentinel = ref(null)
let observer = null

// 保存每个天赋卡片独立追加的组合天赋名称数组
const selectedCombinations = reactive({})

// 弹窗相关控制变量
const modalVisible = ref(false)
const currentActiveItem = ref(null)
const modalSearchQuery = ref('')
// 变更为数组，支持多选标签筛选
const activeModalFilterTags = ref([])

// 点击加号的处理函数
const handleCombinationClick = (item) => {
  currentActiveItem.value = item
  modalSearchQuery.value = ''
  activeModalFilterTags.value = []
  modalVisible.value = true
}

// 关闭弹窗
const closeModal = () => {
  modalVisible.value = false
  currentActiveItem.value = null
}

// 弹窗内选中某个天赋
const confirmSelectTalent = (talentName) => {
  if (!currentActiveItem.value) return
  const baseName = currentActiveItem.value.天赋名称
  if (!selectedCombinations[baseName]) {
    selectedCombinations[baseName] = []
  }
  selectedCombinations[baseName].push(talentName)
  closeModal()
}

// 点击减号的处理函数
const removeLastCombination = (baseTalentName) => {
  if (selectedCombinations[baseTalentName] && selectedCombinations[baseTalentName].length > 0) {
    selectedCombinations[baseTalentName].pop()
  }
}

// 获取全能自适应初始角色池
const getBaseInitialHeros = (baseSource) => {
  if (!baseSource) return []
  return characters.filter(c =>
    c.属性 === baseSource ||
    c.细分种族 === baseSource ||
    c.种族 === baseSource ||
    c.职业 === baseSource ||
    c.角色名 === baseSource
  )
}

// =================【优化：关系标签分类分块归一算法】=================
const modalDerivedTagsGrouped = computed(() => {
  if (!currentActiveItem.value) return { jobs: [], races: [], attrs: [], hasTags: false }
  const baseSource = currentActiveItem.value.二级类目
  const baseHeros = getBaseInitialHeros(baseSource)

  const jobSet = new Set()
  const raceSet = new Set()
  const attrSet = new Set()

  baseHeros.forEach(c => {
    // 归一化提取职业
    if (c.职业 && c.职业 !== baseSource) {
      jobSet.add(c.职业)
    }
    // 归一化提取种族
    if (c.种族 && c.种族 !== baseSource) {
      raceSet.add(c.种族)
    } else if (c.细分种族 && c.细分种族 !== baseSource) {
      raceSet.add(c.细分种族)
    }
    // 归一化提取属性
    if (c.属性 && c.属性 !== baseSource) {
      attrSet.add(c.属性)
    }
  })

  const jobs = Array.from(jobSet).filter(Boolean).sort((a, b) => JOB_KEYWORDS.indexOf(a) - JOB_KEYWORDS.indexOf(b))
  const races = Array.from(raceSet).filter(Boolean).sort((a, b) => RACE_KEYWORDS.indexOf(a) - RACE_KEYWORDS.indexOf(b))
  const attrs = Array.from(attrSet).filter(Boolean).sort((a, b) => ATTR_KEYWORDS.indexOf(a) - ATTR_KEYWORDS.indexOf(b))

  return {
    jobs,
    races,
    attrs,
    hasTags: jobs.length > 0 || races.length > 0 || attrs.length > 0
  }
})

// 控制弹窗标签的多选状态切换
const toggleModalFilterTag = (tag) => {
  const index = activeModalFilterTags.value.indexOf(tag)
  if (index > -1) {
    activeModalFilterTags.value.splice(index, 1)
  } else {
    activeModalFilterTags.value.push(tag)
  }
}

// =================【算法二：分桶逻辑重排与多选联动筛选】=================
const filteredModalTalents = computed(() => {
  if (!currentActiveItem.value) return []
  const baseSource = currentActiveItem.value.二级类目

  // 1. 获取初筛基础角色池
  let targetHeros = getBaseInitialHeros(baseSource)

  // 2. 联动多选标签
  if (activeModalFilterTags.value.length > 0) {
    targetHeros = targetHeros.filter(hero => {
      return activeModalFilterTags.value.every(selectedTag =>
        hero.职业 === selectedTag ||
        hero.种族 === selectedTag ||
        hero.细分种族 === selectedTag ||
        hero.属性 === selectedTag
      )
    })
  }

  // 3. 收集关联角色池的潜在可获得天赋
  const rawModalTalents = talents.filter(t => {
    const firstCat = t.一级类目 || ''
    const secondCat = t.二级类目 || ''

    if (firstCat === '通用天赋') return true

    return targetHeros.some(hero => {
      return secondCat === hero.角色名 ||
             secondCat === hero.种族 ||
             secondCat === hero.细分种族 ||
             secondCat === hero.职业 ||
             secondCat === hero.属性
    })
  })

  // 4. 响应内部模糊搜索
  const mq = modalSearchQuery.value.trim().toLowerCase()
  let searchedTalents = rawModalTalents
  if (mq) {
    searchedTalents = rawModalTalents.filter(t =>
      (t.天赋名称 || '').toLowerCase().includes(mq) ||
      (t.天赋效果 || '').toLowerCase().includes(mq) ||
      (t.二级类目 || '').toLowerCase().includes(mq)
    )
  }

  // 5. 严格排序分桶：种族天赋 -> 职业天赋 -> 属性天赋 -> 通用天赋 顺序
  const bucketRace = []
  const bucketJob = []
  const bucketAttr = []
  const bucketGeneral = []
  const bucketOthers = []

  searchedTalents.forEach(t => {
    const firstCat = t.一级类目 || ''
    const secondCat = t.二级类目 || ''

    if (firstCat === '通用天赋') {
      bucketGeneral.push(t)
    } else {
      const isRace = characters.some(c => c.种族 === secondCat || c.细分种族 === secondCat)
      const isJob = characters.some(c => c.职业 === secondCat)
      const isAttr = characters.some(c => c.属性 === secondCat)

      if (isRace) {
        bucketRace.push(t)
      } else if (isJob) {
        bucketJob.push(t)
      } else if (isAttr) {
        bucketAttr.push(t)
      } else {
        bucketOthers.push(t)
      }
    }
  })

  const sortFunc = (arr) => arr.sort((a, b) => (a.优先级 || 99) - (b.优先级 || 99))

  return [
    ...sortFunc(bucketRace),
    ...sortFunc(bucketJob),
    ...sortFunc(bucketAttr),
    ...sortFunc(bucketOthers),
    ...sortFunc(bucketGeneral)
  ]
})

// =================【算法三：反向反查综合打工人英雄（支持标签排序）】=================
const getMatchedHeros = (item) => {
  const baseSource = item.二级类目
  const combs = selectedCombinations[item.天赋名称] || []

  const potentialHeros = getBaseInitialHeros(baseSource)
  let resultHeros = potentialHeros

  if (combs.length > 0) {
    resultHeros = potentialHeros.filter(hero => {
      return combs.every(combName => {
        const tData = talents.find(t => t.天赋名称 === combName)
        if (!tData) return false

        const fCat = tData.一级类目 || ''
        const sCat = tData.二级类目 || ''

        if (fCat === '通用天赋') return true

        return sCat === hero.角色名 ||
               sCat === hero.种族 ||
               sCat === hero.细分种族 ||
               sCat === hero.职业 ||
               sCat === hero.属性
      })
    })
  }

  // 对筛选出的英雄属性字段做清洗，保证渲染时永远是 [职业] [种族] [属性] 的严格连贯顺序
  return resultHeros.map(hero => {
    return {
      ...hero,
      // 方便前端直接遍历或输出
      职业: JOB_KEYWORDS.includes(hero.职业) ? hero.职业 : '',
      种族: RACE_KEYWORDS.includes(hero.种族) ? hero.种族 : (RACE_KEYWORDS.includes(hero.细分种族) ? hero.细分种族 : ''),
      属性: ATTR_KEYWORDS.includes(hero.属性) ? hero.属性 : ''
    }
  })
}

// 1. 角色联想
const suggestedCharacters = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return []

  return characters.filter(c => {
    const charName = (c.角色名 || '').toLowerCase()
    const job = (c.职业 || '').toLowerCase()
    const race = (c.种族 || '').toLowerCase()
    const subRace = (c.细分种族 || '').toLowerCase()

    return charName.includes(q) ||
           job.includes(q) ||
           race.includes(q) ||
           subRace.includes(q) ||
           q.split('').every(char => charName.includes(char) || job.includes(char))
  })
})

// 2. 首页卡片排序逻辑
const sortedTalents = computed(() => {
  const q = searchQuery.value.trim()

  if (selectedCharacter.value) {
    const char = selectedCharacter.value
    const charName = char.角色名
    const job = char.职业
    const race = char.种族
    const subRace = char.细分种族
    const attr = char.属性

    const bucketExclusive = []
    const bucketRace = []
    const bucketJob = []
    const bucketAttr = []
    const bucketGeneral = []

    talents.forEach(t => {
      const firstCategory = t.一级类目 || ''
      const secondCategory = t.二级类目 || ''

      if (secondCategory === charName) {
        bucketExclusive.push(t)
      }
      else if ((race && secondCategory === race) || (subRace && secondCategory === subRace)) {
        bucketRace.push(t)
      }
      else if (job && secondCategory === job) {
        bucketJob.push(t)
      }
      else if (attr && secondCategory === attr) {
        bucketAttr.push(t)
      }
      else if (firstCategory === '通用天赋') {
        bucketGeneral.push(t)
      }
    })

    const sortInBucket = (arr) => arr.sort((a, b) => (a.优先级 || 99) - (b.优先级 || 99))

    return [
      ...sortInBucket(bucketExclusive),
      ...sortInBucket(bucketRace),
      ...sortInBucket(bucketJob),
      ...sortInBucket(bucketAttr),
      ...sortInBucket(bucketGeneral)
    ]
  }

  if (!q) {
    return [...talents].sort((a, b) => (a.优先级 || 99) - (b.优先级 || 99))
  }

  const queryStr = q.toLowerCase()
  const filtered = talents.filter(t => {
    return (t.一级类目 || '').toLowerCase().includes(queryStr) ||
           (t.二级类目 || '').toLowerCase().includes(queryStr) ||
           (t.天赋名称 || '').toLowerCase().includes(queryStr) ||
           (t.天赋效果 || '').toLowerCase().includes(queryStr) ||
           (t.备注 || '').toLowerCase().includes(queryStr)
  })

  return filtered.sort((a, b) => (a.优先级 || 99) - (b.优先级 || 99))
})

const pagedTalents = computed(() => {
  return sortedTalents.value.slice(0, displayLimit.value)
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
    if (!selectedCharacter.value.角色名.toLowerCase().includes(currentQuery)) {
      selectedCharacter.value = null
    }
  }
}

watch(searchQuery, () => {
  displayLimit.value = PAGE_SIZE
})

const initObserver = () => {
  observer = new IntersectionObserver((entries) => {
    const entry = entries[0]
    if (entry.isIntersecting && displayLimit.value < sortedTalents.value.length) {
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
})

onUnmounted(() => {
  if (observer) observer.disconnect()
})

const getTypeTag = (t) => {
  if (t.一级类目 === '通用天赋') return '通用'
  if (t.一级类目 === '专属天赋') return '专属'
  const m = t.二级类目.match(/^\[(.+?)\]/)
  return m ? m[1] : t.二级类目
}

const getModalTypeTag = (t) => {
  if (t.一级类目 === '通用天赋') return '通用'
  if (t.一级类目 === '专属天赋') return '专属'
  const m = t.二级类目.match(/^\[(.+?)\]/)
  return m ? m[1] : t.二级类目
}
</script>

<style scoped>
/* 稀有度纯文本着色类映射 */
.wish-rarity-color-3 { color: #f97316 !important; font-weight: 600; }
.wish-rarity-color-2 { color: #a855f7 !important; font-weight: 600; }
.wish-rarity-color-1 { color: #79C37A !important; font-weight: 600; }
.wish-rarity-color-0 { color: #7FAECB !important; font-weight: 600; }

.talent-container {
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
  padding: 0;
  box-sizing: border-box;
}

.talent-search-wrapper {
  background: #f5f7fa;
  border-radius: 16px;
  padding: 0px 0;
  margin-bottom: 18px;
  box-sizing: border-box;
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
  display: flex;
  align-items: center;
  font-size: 13px;
  padding: 8px 4px 0 4px;
}
.suggest-title {
  color: var(--text-sub);
  flex-shrink: 0;
}
.suggest-tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
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
}

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

.talent-top-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.talent-name {
  font-size: 17px;
  font-weight: 600;
  color: var(--text-main);
  margin-right: 4px;
}

.talent-tag {
  font-size: 12px;
  font-weight: 600;
  color: #065f46;
  background: #d1fae5;
  padding: 4px 9px;
  border-radius: 6px;
  flex-shrink: 0;
}

.talent-source-wrapper {
  display: inline-flex;
  align-items: center;
  background: #fff7ed;
  color: #c2410c;
  padding: 4px 9px;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 500;
  flex-shrink: 0;
  margin-left: 10px;
}

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

.talent-bottom-bar {
  display: flex;
  align-items: flex-start;
  font-size: 13px;
  line-height: 1.5;
  margin-top: 2px;
}
.talent-remark-label {
  font-weight: 600;
  color: #e67e40;
  flex-shrink: 0;
}
.talent-remark-content {
  color: #dd7738;
  text-align: left;
}

.talent-combination-bar {
  display: flex;
  flex-direction: column;
  background: #f1f5f9;
  border-radius: 8px;
  padding: 8px 12px;
  margin-top: 2px;
}

.combination-flex-layout {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.combination-wrapper {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.combination-text {
  font-size: 13px;
  color: var(--text-main);
  font-weight: 500;
  cursor: default;
  user-select: none;
}

.added-comb-tag {
  background: #e2e8f0;
  color: #334155;
  font-size: 12px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 4px;
  border: 1px solid #cbd5e1;
}

.combination-plus-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  padding: 0;
  background: transparent;
  border: 1px solid #cbd5e1;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s ease;
  outline: none;
}
.combination-plus-btn:hover {
  border-color: #409eff;
  background: rgba(64, 158, 255, 0.08);
}
.combination-plus-btn:active {
  transform: scale(0.92);
}

.combination-minus-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  padding: 0;
  background: transparent;
  border: 1px solid #fca5a5;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s ease;
  outline: none;
}
.combination-minus-btn:hover {
  border-color: #ef4444;
  background: rgba(239, 68, 68, 0.08);
}
.combination-minus-btn:active {
  transform: scale(0.92);
}

.plus-icon, .minus-icon {
  width: 12px;
  height: 12px;
  opacity: 0.7;
  filter: var(--icon-filter);
  transition: opacity 0.2s;
}
.combination-plus-btn:hover .plus-icon { opacity: 1; }
.combination-minus-btn:hover .minus-icon { opacity: 1; }

/* ================= 优化后的产出角色标签排版 ================= */
.matched-characters-row {
  display: flex;
  align-items: flex-start;
  border-top: 1px dashed #cbd5e1;
  padding-top: 8px;
  margin-top: 4px;
  text-align: left;
}
.match-title {
  font-size: 13px;
  font-weight: 600;
  color: #475569;
  flex-shrink: 0;
  margin-top: 3px;
}
.match-chars-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.matched-hero-tag {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  padding: 3px 10px;
  border-radius: 8px;
  font-size: 13px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.02);
}
.hero-name-span {
  font-weight: bold;
}
.hero-split-labels {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  background: #f8fafc;
  padding: 1px 4px;
  border-radius: 4px;
  border: 1px solid #f1f5f9;
}
.hero-split-labels .h-lbl {
  font-size: 11px;
  font-weight: 500;
  padding: 0 2px;
}
/* 为不同连贯类型的属性文字加微弱色区别，防止连在一块蒙圈 */
.label-job { color: #2563eb; }
.label-race { color: #7c3aed; }
.label-attr { color: #ea580c; }

/* 如果前一个标签存在，自动在前加分隔点 */
.hero-split-labels .h-lbl + .h-lbl::before {
  content: "•";
  margin-right: 3px;
  color: #cbd5e1;
  display: inline-block;
}

.matched-hero-none {
  font-size: 12px;
  color: #ef4444;
  font-style: italic;
  margin-top: 3px;
}

/* ================= 拟态毛玻璃（Glassmorphism）弹窗核心 ================= */
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
  max-width: 620px;
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

.modal-search-box {
  display: flex;
  align-items: center;
  background: var(--bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 10px 14px;
}
.modal-search-icon {
  width: 18px;
  height: 18px;
  filter: var(--icon-filter);
  margin-right: 10px;
  opacity: 0.7;
}
.modal-search-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 14px;
  color: #0f172a;
}

/* ================= 标签独立分组与分割线排版 ================= */
.modal-tags-filter-bar {
  display: flex;
  flex-direction: column;
  gap: 8px;
  text-align: left;
  background: rgba(0, 0, 0, 0.02);
  padding: 12px;
  border-radius: 14px;
  border: 1px solid rgba(0,0,0,0.03);
}
.filter-hint {
  font-size: 12px;
  color: var(--text-main);
  font-weight: 600;
}
.filter-tags-flex-container {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}
.filter-group-zone {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 6px;
}
.tag-group-divider {
  width: 1px;
  height: 14px;
  background: rgba(0, 0, 0, 0.12);
  margin: 0 4px;
  flex-shrink: 0;
}

/* 差异化毛玻璃按钮样式 */
.filter-badge {
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(0, 0, 0, 0.05);
  color: #475569;
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 8px;
  cursor: pointer;
  user-select: none;
  transition: all 0.2s cubic-bezier(0.25, 1, 0.5, 1);
  font-weight: 500;
}
.filter-badge:hover {
  background: #ffffff;
  transform: translateY(-1px);
  box-shadow: 0 4px 10px rgba(0,0,0,0.04);
}

/* 多选激活状态（保留你原汁原味的优雅蓝） */
.filter-badge.active {
  background: #3b82f6 !important;
  color: #ffffff !important;
  border-color: #3b82f6 !important;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.modal-talents-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 38vh;
  overflow-y: auto;
  padding-right: 4px;
}
.modal-talent-row {
  background: rgba(255, 255, 255, 0.5);
  border: 1px solid rgba(0, 0, 0, 0.05);
  border-radius: 12px;
  padding: 12px 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
}
.modal-talent-row:hover {
  border-color: #3b82f6;
  background: rgba(255, 255, 255, 0.9);
  transform: translateX(3px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.03);
}
.mtr-top {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}
.mtr-name {
  font-size: 15px;
  font-weight: 600;
  color: #0f172a;
}
.mtr-tag {
  font-size: 11px;
  background: #d1fae5;
  color: #065f46;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 500;
}
.mtr-source {
  font-size: 12px;
  font-weight: 500;
  color: var( --text-main );
  margin-left: auto;
}
.mtr-effect {
  font-size: 13px;
  color: #334155;
  line-height: 1.5;
  text-align: left;
}
.modal-no-data {
  text-align: center;
  color: #94a3b8;
  font-size: 13px;
  padding: 30px 0;
}

/* ======================================================== */
.no-data {
  text-align: center;
  padding: 40px 0;
  color: var(--text-sub);
  font-size: 14px;
}

.load-more-sentinel {
  display: flex;
  justify-content: center;
  align-items: center;
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

/* 深色模式硬核适配（云母微晶质感） */
.dark-mode .talent-effect {
  background: rgba(64, 158, 255, 0.08);
}
.dark-mode .talent-search-wrapper {
  background: rgba(255, 255, 255, 0.06);
}
.dark-mode .talent-search-box {
  border-color: rgba(255, 255, 255, 0.1);
}
.dark-mode .talent-tag {
  background: rgba(52, 211, 153, 0.2);
  color: #34d399;
}
.dark-mode .talent-source-wrapper {
  background: rgba(251, 146, 60, 0.15);
  color: #ffedd5;
  border: 1px solid rgba(251, 146, 60, 0.3);
}
.dark-mode .suggest-char-tag {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255,255,255,0.1);
}
.dark-mode .suggest-char-tag:hover {
  background: rgba(255, 255, 255, 0.15);
}
.dark-mode .clear-char-btn {
  background: rgba(239, 68, 68, 0.15);
  color: #fca5a5;
  border: 1px solid rgba(239, 68, 68, 0.25);
}
.dark-mode .talent-combination-bar {
  background: rgba(255, 255, 255, 0.04);
}
.dark-mode .combination-plus-btn {
  border-color: rgba(255, 255, 255, 0.2);
}
.dark-mode .combination-plus-btn:hover {
  border-color: #60a5fa;
  background: rgba(96, 165, 250, 0.15);
}

/* 深色模式弹窗云母质感 */
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
.dark-mode .modal-search-box {
  background: var(--bg);
  border-color: var(--border-color);
}
.dark-mode .modal-search-input {
  color: #f8fafc;
}
.dark-mode .modal-tags-filter-bar {
  background: rgba(255, 255, 255, 0.03);
  border-color: rgba(255,255,255,0.05);
}
.dark-mode .tag-group-divider {
  background: rgba(255, 255, 255, 0.15);
}
.dark-mode .filter-badge {
  background: rgba(255, 255, 255, 0.06);
  border-color: transparent;
  color: #cbd5e1;
}
.dark-mode .filter-badge:hover {
  background: rgba(255, 255, 255, 0.12);
}
.dark-mode .modal-talent-row {
  background: rgba(255, 255, 255, 0.03);
  border-color: rgba(255, 255, 255, 0.05);
}
.dark-mode .modal-talent-row:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: #3b82f6;
}
.dark-mode .mtr-name {
  color: #f8fafc;
}
.dark-mode .mtr-effect {
  color: #cbd5e1;
}
.dark-mode .matched-characters-row {
  border-top-color: rgba(255,255,255,0.1);
}
.dark-mode .match-title {
  color: #94a3b8;
}
.dark-mode .matched-hero-tag {
  background: rgba(255,255,255,0.02);
  border-color: rgba(255,255,255,0.08);
}
.dark-mode .hero-split-labels {
  background: rgba(0,0,0,0.15);
  border-color: transparent;
}
.dark-mode .added-comb-tag {
  background: #334155;
  color: #f1f5f9;
  border-color: #475569;
}
</style>