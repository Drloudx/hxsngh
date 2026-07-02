<template>
  <div class="talent-container">
    <div class="talent-sticky-top">
      <div class="talent-search-box">
        <img src="/ui/search.svg" class="search-icon" />
        <input
          type="text"
          v-model="searchQuery"
          @input="handleInput"
          placeholder="搜索关键词(天赋详细、天赋名、角色名)..."
          class="talent-search-input"
        />
      </div>
      <div class="talent-sub-header">
        <span class="talent-hint-text">可通过空格，中英文逗号，进行多词搜索，例：热血，恐怖</span>
      </div>
      <div class="talent-suggest-area">
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
        v-for="item in pagedTalents"
        :key="item.uid"
        class="talent-card"
      >
        <div class="talent-top-bar">
          <img
            v-if="item.标签 === '专属' && item.SpecifyRoleIDs"
            :src="`/Header/${item.SpecifyRoleIDs}.png`"
            class="talent-char-avatar-standalone"
          />

          <span class="talent-name" :style="{ color: getTalentStepConfig(item.step).color }">{{ item.name }}</span>

<!--          <img :src="`/Skill/${item.iconId}.png`" class="talent-skill-icon-standalone" />-->

          <div class="talent-tag-dropdown-wrapper">
            <span
              class="talent-tag dropdown-trigger-btn"
              :style="{
                color: getTalentStepConfig(item.step).color,
                borderColor: getTalentStepConfig(item.step).color,
                backgroundColor: getTalentStepConfig(item.step).color + '15'
              }"
              @click.stop="toggleTagDropdown(item)"
            >
              {{ item.标签 }}
              <img
                src="/ui/up.svg"
                class="tag-arrow-icon"
                :class="{ 'expanded-flip': !item.dropdownOpen }"
              />
            </span>

            <div v-if="item.dropdownOpen" class="tag-dropdown-menu">
              <div
                v-for="(q, qIdx) in item.qualities"
                :key="q.uid"
                class="tag-dropdown-item"
                :style="{ color: getTalentStepConfig(q.step).color }"
                @click.stop="switchQuality(item, qIdx)"
              >
                {{ q.标签 }}
              </div>
            </div>
          </div>

          <div class="talent-source-wrapper" @click="openSourceModal(item)">
            <span class="talent-source-label"></span>
            <span class="talent-source">{{ item.sourceLabel }}</span>
            <img src="/ui/expand.svg" class="source-expand-icon" />
          </div>
        </div>

        <div class="talent-effect">
          {{ item.formattedEffect }}
        </div>

        <div v-if="getTypeTag(item) !== '专属' && getTypeTag(item) !== '通用'" class="talent-combination-bar">
          <div class="combination-flex-layout">
            <div class="combination-wrapper">
              <span class="combination-text">组合</span>

              <span
                v-for="(comb, idx) in (selectedCombinations[item.name] || [])"
                :key="idx"
                class="added-comb-tag"
                :style="{ color: getTalentStepConfig(comb.step).color, borderColor: getTalentStepConfig(comb.step).color }"
              >
                {{ comb.name }}
              </span>

              <button class="combination-plus-btn" @click="handleCombinationClick(item)">
                <img src="/ui/plus.svg" class="plus-icon" />
              </button>

              <button
                v-if="selectedCombinations[item.name] && selectedCombinations[item.name].length > 0"
                class="combination-minus-btn"
                @click="removeLastCombination(item.name)"
              >
                <img src="/ui/minus.svg" class="minus-icon" />
              </button>
            </div>

            <div
              v-if="selectedCombinations[item.name] && selectedCombinations[item.name].length > 0"
              class="matched-characters-row"
            >
              <div class="match-title">可产出角色：</div>
              <div class="match-chars-grid">
                <div
                  v-for="hero in getMatchedHeros(item)"
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

                <div
                  v-if="getMatchedHeros(item).length === 0"
                  class="matched-hero-none"
                >
                  无角色同时满足此天赋组合
                </div>
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
          <h3>选择组合天赋 (初始来源: {{ currentActiveItem?.sourceLabel }})</h3>
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
              <div v-if="modalDerivedTagsGrouped.jobs.length > 0" class="filter-group-wrapper">
                <div class="filter-group-zone zone-job">
                  <span
                    v-for="tag in modalDerivedTagsGrouped.jobs"
                    :key="tag"
                    :class="['filter-badge', 'badge-job', { 'active': activeModalFilterTags.includes(tag) }]"
                    @click="toggleModalFilterTag(tag)"
                  >
                    {{ tag }}
                  </span>
                </div>
                <div v-if="modalDerivedTagsGrouped.races.length > 0 || modalDerivedTagsGrouped.attrs.length > 0" class="tag-group-divider"></div>
              </div>

              <div v-if="modalDerivedTagsGrouped.races.length > 0" class="filter-group-wrapper">
                <div class="filter-group-zone zone-race">
                  <span
                    v-for="tag in modalDerivedTagsGrouped.races"
                    :key="tag"
                    :class="['filter-badge', 'badge-race', { 'active': activeModalFilterTags.includes(tag) }]"
                    @click="toggleModalFilterTag(tag)"
                  >
                    {{ tag }}
                  </span>
                </div>
                <div v-if="modalDerivedTagsGrouped.attrs.length > 0" class="tag-group-divider"></div>
              </div>

              <div v-if="modalDerivedTagsGrouped.attrs.length > 0" class="filter-group-wrapper">
                <div class="filter-group-zone zone-attr">
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
          </div>

          <div class="modal-talents-list">
            <div
              v-for="t in filteredModalTalents"
              :key="t.uid"
              class="modal-talent-row"
              @click="confirmSelectTalent(t)"
            >
              <div class="mtr-top">
                <img
                  v-if="t.标签 === '专属' && t.SpecifyRoleIDs"
                  :src="`/Header/${t.SpecifyRoleIDs}.png`"
                  class="talent-char-avatar-standalone"
                />

                <span class="mtr-name" :style="{ color: getTalentStepConfig(t.step).color }">{{ t.name }}</span>

<!--                <img :src="`/Skill/${t.iconId}.png`" class="talent-skill-icon-standalone" />-->

                <span class="mtr-tag">{{ t.标签 }}</span>
                <span class="mtr-source">来源: {{ t.sourceLabel }}</span>
              </div>
              <div class="mtr-effect">{{ t.formattedEffect }}</div>
            </div>
            <div v-if="filteredModalTalents.length === 0" class="modal-no-data">
              该筛选条件下未找到可用的天赋数据
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="sourceModalVisible" class="modal-overlay" @click.self="closeSourceModal">
      <div class="modal-window">
        <div class="modal-header">
          <h3>天赋来源: {{ currentSource }}</h3>
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
import { ref, computed, watch, onMounted, onUnmounted, reactive } from 'vue'
import * as configUtil from '@/utils/configTableUtil.js'
import rawRoles from '@/assets/RoleDataTable.json'
import rawTalents from '@/assets/TalentDataTable.json'

const JOB_KEYWORDS = ['战士', '射手', '法师', '牧师']
const RACE_KEYWORDS = []
const ATTR_KEYWORDS = ['光系', '暗系', '风系', '地系', '火系', '水系']

const searchQuery = ref('')
const selectedCharacter = ref(null)
const displayLimit = ref(20)
const PAGE_SIZE = 20
const showExclusiveTalent = ref(false)

const loadMoreSentinel = ref(null)
let observer = null

const selectedCombinations = reactive({})

const modalVisible = ref(false)
const sourceModalVisible = ref(false)
const currentActiveItem = ref(null)
const currentSource = ref('')
const sourceMatchedCharacters = ref([])
const modalSearchQuery = ref('')
const activeModalFilterTags = ref([])

const allCharacters = ref([])
const allTalents = ref([])
const allIndividualTalents = ref([])

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

const sortTalentAllQuality = (talentArr = []) => {
  const nameMap = new Map()
  talentArr.forEach(item => {
    const name = item.name || '无名天赋'
    if (!nameMap.has(name)) nameMap.set(name, [])
    nameMap.get(name).push(item)
  })
  const final = []
  nameMap.forEach(list => {
    list.sort((a, b) => {
      const wa = getTalentStepConfig(a.step).weight
      const wb = getTalentStepConfig(b.step).weight
      return wb - wa
    })
    final.push(...list)
  })
  return final
}

const getRaceCategory = (raceName) => {
  const matchChar = allCharacters.value.find(c => c.race?.name === raceName)
  return matchChar ? matchChar.type : '生灵'
}

const getTypeTag = (t) => {
  if (t.SpecifyRoleIDs) return '专属'
  if (!t.Race && !t.Class && !t.Element) return '通用'
  if (t.Race) return t.Race
  if (t.Class) return t.Class
  if (t.Element) return t.Element
  return '通用'
}

const handleCombinationClick = (item) => {
  currentActiveItem.value = item
  modalSearchQuery.value = ''
  activeModalFilterTags.value = []
  modalVisible.value = true
}

const openSourceModal = (item) => {
  currentSource.value = item.sourceLabel
  const matched = getBaseInitialHeros(item)
  matched.sort((a, b) => getRarityNum(b.step) - getRarityNum(a.step))
  sourceMatchedCharacters.value = matched
  sourceModalVisible.value = true
}

const closeModal = () => {
  modalVisible.value = false
  currentActiveItem.value = null
}

const closeSourceModal = () => {
  sourceModalVisible.value = false
  currentSource.value = ''
  sourceMatchedCharacters.value = []
}

const confirmSelectTalent = (talent) => {
  if (!currentActiveItem.value) return
  const baseName = currentActiveItem.value.name
  if (!selectedCombinations[baseName]) {
    selectedCombinations[baseName] = []
  }
  selectedCombinations[baseName].push({ name: talent.name, step: talent.step })
  closeModal()
}

const removeLastCombination = (baseTalentName) => {
  if (selectedCombinations[baseTalentName] && selectedCombinations[baseTalentName].length > 0) {
    selectedCombinations[baseTalentName].pop()
  }
}

const getBaseInitialHeros = (talent) => {
  if (!talent) return []
  if (talent.SpecifyRoleIDs) {
    return allCharacters.value.filter(c => c.id === talent.SpecifyRoleIDs)
  }
  if (talent.Race) {
    return allCharacters.value.filter(c => c.race?.name === talent.Race)
  }
  if (talent.Class) {
    return allCharacters.value.filter(c => c.class === talent.Class)
  }
  if (talent.Element) {
    return allCharacters.value.filter(c => c.element === talent.Element)
  }
  return []
}

const modalDerivedTagsGrouped = computed(() => {
  if (!currentActiveItem.value) return { jobs: [], races: [], attrs: [], hasTags: false }
  const baseItem = currentActiveItem.value
  const baseHeros = getBaseInitialHeros(baseItem)

  const jobSet = new Set()
  const raceSet = new Set()
  const attrSet = new Set()

  baseHeros.forEach(c => {
    if (c.class && (!baseItem.Class || c.class !== baseItem.Class)) {
      jobSet.add(c.class)
    }
    if (c.race?.name && (!baseItem.Race || c.race.name !== baseItem.Race)) {
      raceSet.add(c.race.name)
    }
    if (c.element && (!baseItem.Element || c.element !== baseItem.Element)) {
      attrSet.add(c.element)
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

const toggleModalFilterTag = (tag) => {
  const index = activeModalFilterTags.value.indexOf(tag)
  if (index > -1) {
    activeModalFilterTags.value.splice(index, 1)
  } else {
    activeModalFilterTags.value.push(tag)
  }
}

const toggleTagDropdown = (item) => {
  allTalents.value.forEach(t => {
    if (t !== item) {
      t.dropdownOpen = false
    }
  })
  item.dropdownOpen = !item.dropdownOpen
}

const switchQuality = (item, qIdx) => {
  item.activeIdx = qIdx
  const selectedQuality = item.qualities[qIdx]

  item.uid = selectedQuality.uid
  item.step = selectedQuality.step
  item.标签 = selectedQuality.标签
  item.sourceLabel = selectedQuality.sourceLabel
  item.formattedEffect = selectedQuality.formattedEffect
  item.二级类目 = selectedQuality.二级类目

  item.SpecifyRoleIDs = selectedQuality.SpecifyRoleIDs
  item.Race = selectedQuality.Race
  item.Class = selectedQuality.Class
  item.Element = selectedQuality.Element

  item.dropdownOpen = false
}

const closeAllDropdowns = () => {
  allTalents.value.forEach(t => {
    t.dropdownOpen = false
  })
}

const filteredModalTalents = computed(() => {
  if (!currentActiveItem.value) return []
  const baseItem = currentActiveItem.value
  let targetHeros = getBaseInitialHeros(baseItem)

  if (activeModalFilterTags.value.length > 0) {
    targetHeros = targetHeros.filter(hero => {
      return activeModalFilterTags.value.every(selectedTag =>
        hero.class === selectedTag ||
        hero.race?.name === selectedTag ||
        hero.element === selectedTag
      )
    })
  }

  let baseList = allIndividualTalents.value
  if (!showExclusiveTalent.value) {
    baseList = baseList.filter(t => !t.sourceLabel.startsWith('专属('))
  }

  const rawModalTalents = baseList.filter(t => {
    if (!t.Race && !t.Class && !t.Element && !t.SpecifyRoleIDs) return true

    if (baseItem.Class && t.Class === baseItem.Class) return false
    if (baseItem.Element && t.Element === baseItem.Element) return false
    if (baseItem.Race && t.Race === baseItem.Race) return false
    if (baseItem.SpecifyRoleIDs && t.SpecifyRoleIDs === baseItem.SpecifyRoleIDs) return false

    return targetHeros.some(hero => {
      return (t.SpecifyRoleIDs && t.SpecifyRoleIDs === hero.id) ||
             (t.Race && t.Race === hero.race?.name) ||
             (t.Class && t.Class === hero.class) ||
             (t.Element && t.Element === hero.element)
    })
  })

  const mq = modalSearchQuery.value.trim().toLowerCase()
  let searchedTalents = rawModalTalents
  if (mq) {
    searchedTalents = rawModalTalents.filter(t =>
      (t.name || '').toLowerCase().includes(mq) ||
      (t.formattedEffect || '').toLowerCase().includes(mq) ||
      (t.sourceLabel || '').toLowerCase().includes(mq)
    )
  }

  const classify = (t) => {
    if (t.SpecifyRoleIDs) return 'exclusive'
    if (!t.Race && !t.Class && !t.Element) return 'general'
    if (t.Race) return 'race'
    if (t.Class) return 'job'
    if (t.Element) return 'attr'
    return 'other'
  }

  const sortByQuality = (a, b) => {
    const wa = getTalentStepConfig(a.step).weight
    const wb = getTalentStepConfig(b.step).weight
    return wb - wa
  }

  if (activeModalFilterTags.value.length > 0) {
    const matched = []
    const unmatched = []
    searchedTalents.forEach(t => {
      const match = activeModalFilterTags.value.some(tag =>
        t.Class === tag || t.Race === tag || t.Element === tag
      )
      if (match) {
        matched.push(t)
      } else {
        unmatched.push(t)
      }
    })
    matched.sort(sortByQuality)

    const exclusive = [], race = [], job = [], attr = [], other = [], general = []
    unmatched.forEach(t => {
      const type = classify(t)
      if (type === 'exclusive') exclusive.push(t)
      else if (type === 'race') race.push(t)
      else if (type === 'job') job.push(t)
      else if (type === 'attr') attr.push(t)
      else if (type === 'other') other.push(t)
      else general.push(t)
    })
    ;[exclusive, race, job, attr, other, general].forEach(arr => arr.sort(sortByQuality))
    return [...matched, ...exclusive, ...race, ...job, ...attr, ...other, ...general]
  } else {
    const exclusive = [], race = [], job = [], attr = [], other = [], general = []
    searchedTalents.forEach(t => {
      const type = classify(t)
      if (type === 'exclusive') exclusive.push(t)
      else if (type === 'race') race.push(t)
      else if (type === 'job') job.push(t)
      else if (type === 'attr') attr.push(t)
      else if (type === 'other') other.push(t)
      else general.push(t)
    })
    ;[exclusive, race, job, attr, other, general].forEach(arr => arr.sort(sortByQuality))
    return [...exclusive, ...race, ...job, ...attr, ...other, ...general]
  }
})

const getMatchedHeros = (item) => {
  const combs = selectedCombinations[item.name] || []
  const potentialHeros = getBaseInitialHeros(item)
  let resultHeros = potentialHeros

  if (combs.length > 0) {
    resultHeros = potentialHeros.filter(hero => {
      return combs.every(comb => {
        const tData = allIndividualTalents.value.find(t => t.name === comb.name && t.step === comb.step)
        if (!tData) return false

        if (!tData.Race && !tData.Class && !tData.Element && !tData.SpecifyRoleIDs) return true

        return (tData.SpecifyRoleIDs && tData.SpecifyRoleIDs === hero.id) ||
               (tData.Race && tData.Race === hero.race?.name) ||
               (tData.Class && tData.Class === hero.class) ||
               (tData.Element && tData.Element === hero.element)
      })
    })
  }

  return resultHeros
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

const getCategoryOrder = (t) => {
  if (t.SpecifyRoleIDs) return 1  // 专属
  if (t.Race) return 2            // 种族
  if (t.Class) return 3           // 职业
  if (t.Element) return 4         // 属性
  return 5                        // 通用
}

const sortedTalents = computed(() => {
  const q = searchQuery.value.trim()

  let baseList = allTalents.value
  if (!showExclusiveTalent.value) {
    baseList = baseList.filter(t => !t.sourceLabel.startsWith('专属('))
  }

  const sortRule = (a, b) => {
    const catA = getCategoryOrder(a)
    const catB = getCategoryOrder(b)
    if (catA !== catB) {
      return catA - catB
    }
    const wa = getTalentStepConfig(a.step).weight
    const wb = getTalentStepConfig(b.step).weight
    return wb - wa
  }

  if (selectedCharacter.value) {
    const char = selectedCharacter.value
    const charId = char.id
    const job = char.class
    const subRace = char.race?.name
    const attr = char.element

    const bucketExclusive = []
    const bucketRace = []
    const bucketJob = []
    const bucketAttr = []
    const bucketGeneral = []

    baseList.forEach(t => {
      if (t.SpecifyRoleIDs && t.SpecifyRoleIDs === charId) {
        bucketExclusive.push(t)
      }
      else if (t.Race && t.Race === subRace) {
        bucketRace.push(t)
      }
      else if (t.Class && t.Class === job) {
        bucketJob.push(t)
      }
      else if (t.Element && t.Element === attr) {
        bucketAttr.push(t)
      }
      else if (!t.Race && !t.Class && !t.Element && !t.SpecifyRoleIDs) {
        bucketGeneral.push(t)
      }
    })

    const sortByQuality = (arr) => arr.sort((a, b) => {
      const wa = getTalentStepConfig(a.step).weight
      const wb = getTalentStepConfig(b.step).weight
      return wb - wa
    })

    return [
      ...sortByQuality(bucketExclusive),
      ...sortByQuality(bucketRace),
      ...sortByQuality(bucketJob),
      ...sortByQuality(bucketAttr),
      ...sortByQuality(bucketGeneral)
    ]
  }

  if (!q) {
    return [...baseList].sort(sortRule)
  }

  const keywords = q.toLowerCase().split(/[\s,，]+/).filter(Boolean)
  const filtered = baseList.filter(t => {
    const fields = [
      (t.name || '').toLowerCase(),
      (t.formattedEffect || '').toLowerCase(),
      (t.sourceLabel || '').toLowerCase()
    ]
    return keywords.some(kw => fields.some(f => f.includes(kw)))
  })

  return filtered.sort(sortRule)
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
    if (!selectedCharacter.value.displayName.toLowerCase().includes(currentQuery)) {
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

  const rawRoleArr = configUtil.extractDataArray(rawRoles)
  const rawTalentArr = configUtil.extractDataArray(rawTalents)
  const fullDatasets = {
    supportList: [],
    skillList: [],
    talentList: rawTalentArr,
    relicList: [],
    noteList: []
  }
  const fullCharacters = configUtil.getFullCharacterList(rawRoleArr, fullDatasets)
  allCharacters.value = fullCharacters

  const cleanTalentList = rawTalentArr.map((t, idx) => {

    const base = {
      uid: t.IDs || t.Id || t.TalentID || `t_${idx}`,
      name: t.Name || t.TalentName || t.天赋名称 || '未命名天赋',
      step: t.Step || t.TalentStep || t.品质 || t.品阶 || '',
      Race: t.Race || '',
      Class: t.Class || '',
      Element: t.Element || '',
      SpecifyRoleIDs: t.SpecifyRoleIDs || '',
      Value0: t.Value0 ?? 0,
      Value1: t.Value1 ?? 0,
      Value2: t.Value2 ?? 0,
      formattedEffect: configUtil.replacePlaceholders(t.Effect || '', [t.Value0, t.Value1, t.Value2]),
      iconId: t.Icon || t.icon || 'default'

    }
    const rawLabel = configUtil.getTalentSourceLabel(base, fullCharacters)
    base.sourceLabel = (rawLabel || '').replace('职业', '').replace('属性', '')
    return base
  })

  const sortedCleanList = sortTalentAllQuality(cleanTalentList)

  sortedCleanList.forEach(t => {
    t.标签 = t.SpecifyRoleIDs ? '专属' : (t.Class ? '职业' : (t.Element ? '属性' : (t.Race ? getRaceCategory(t.Race) : '通用')))
    t.二级类目 = t.SpecifyRoleIDs ? t.SpecifyRoleIDs : (t.Race || t.Class || t.Element || '通用')
  })

  allIndividualTalents.value = sortedCleanList

  const groupedCleanList = []
  const nameMap = new Map()

  sortedCleanList.forEach(t => {
    const name = t.name
    if (!nameMap.has(name)) {
      nameMap.set(name, [])
    }
    nameMap.get(name).push(t)
  })

  nameMap.forEach((qualities, name) => {
    const highestQuality = qualities[0]
    const groupItem = {
      name: name,
      qualities: qualities,
      activeIdx: 0,
      dropdownOpen: false,
      uid: highestQuality.uid,
      step: highestQuality.step,
      标签: highestQuality.标签,
      sourceLabel: highestQuality.sourceLabel,
      formattedEffect: highestQuality.formattedEffect,
      二级类目: highestQuality.二级类目,
      SpecifyRoleIDs: highestQuality.SpecifyRoleIDs,
      Race: highestQuality.Race,
      Class: highestQuality.Class,
      Element: highestQuality.Element,
      iconId: highestQuality.iconId
    }
    groupedCleanList.push(groupItem)
  })

  allTalents.value = groupedCleanList
  window.addEventListener('click', closeAllDropdowns)
})

onUnmounted(() => {
  if (observer) observer.disconnect()
  window.removeEventListener('click', closeAllDropdowns)
})
</script>

<style scoped>
/* ================= 核心独立平铺样式：对齐 image_427ae4.png ================= */
.talent-char-avatar-standalone {
  width: 45px;
  height: 45px;
  object-fit: cover;
  border-radius: 8px;
  border: 1px solid var(--border-color, #e2e8f0);
  background: rgba(0, 0, 0, 0.02);
  flex-shrink: 0;
}

.talent-skill-icon-standalone {
  width: 24px;
  height: 24px;
  object-fit: contain;
  border-radius: 4px;
  border: 1px solid var(--border-color, #cbd5e1);
  background: rgba(0, 0, 0, 0.04);
  flex-shrink: 0;
}

.talent-top-bar, .mtr-top {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 5px; /* 头像、名字、技能小图之间的平铺间距 */
}

/* ================= 基础及下拉菜单布局 ================= */
.talent-tag-dropdown-wrapper {
  position: relative;
  display: inline-block;
}

.dropdown-trigger-btn {
  display: inline-flex;
  align-items: center;
  cursor: pointer;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  user-select: none;
  background: transparent;
  gap: 4px;
  transition: all 0.2s ease;
}

.tag-arrow-icon {
  width: 14px;
  height: 14px;
  filter: var(--icon-filter);
  opacity: 0.8;
  transition: transform 0.2s ease;
}

.tag-arrow-icon.expanded-flip {
  transform: rotate(180deg);
}

.tag-dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 4px;
  background: var(--card-bg, #ffffff);
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  z-index: 1000;
  min-width: 40px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.tag-dropdown-item {
  padding: 8px 12px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  text-align: left;
  transition: background-color 0.2s;
  white-space: nowrap;
}

.tag-dropdown-item:hover {
  background-color: var(--bg, #f8fafc);
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
  padding: 16px;
  box-shadow: 0 3px 12px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: background-color 0.2s, box-shadow 0.2s, transform 0.2s;
  flex-shrink: 0;
}
.talent-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1);
}

.talent-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-main);
  margin-right: 4px;
}

.talent-tag {
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
  cursor: pointer;
}

.talent-source-wrapper {
  display: inline-flex;
  align-items: center;
  background: #fff7ed;
  color: #c2410c;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 500;
  flex-shrink: 0;
  margin-left: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}
.talent-source-wrapper:hover {
  background: #ffedd5;
  transform: translateY(-1px);
}

.source-expand-icon {
  width: 20px;
  height: 20px;
  margin-left: 5px;
  filter: var(--icon-filter);
  opacity: 0.8;
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

/* ================= 匹配角色展示区 ================= */
.matched-characters-row {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  border-top: 1px solid #e2e8f0;
  padding-top: 10px;
  margin-top: 6px;
  text-align: left;
}

.match-title {
  font-size: 13px;
  font-weight: 600;
  color: #64748b;
  margin-bottom: 8px;
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
  border-color: #edd9ff;
}

.label-attr {
  background-color: #fff7ed;
  color: #ea580c;
  border-color: #ffedd5;
}

.matched-hero-none {
  font-size: 12px;
  color: #ef4444;
  font-style: italic;
  padding: 4px 0;
}

/* ================= 弹窗部分 ================= */
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
  gap: 6px 0;
}

.filter-group-wrapper {
  display: inline-flex;
  align-items: center;
  flex-wrap: nowrap;
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
  margin: 0 10px;
  flex-shrink: 0;
}

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

/* 深色模式适配 */
.dark-mode .talent-effect {
  background: rgba(64, 158, 255, 0.08);
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
.dark-mode .talent-source-wrapper:hover {
  background: rgba(251, 146, 60, 0.25);
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
.dark-mode .talent-char-avatar-standalone {
  border-color: var(--border-color, #334155);
  background: #1e293b;
}

.talent-sub-header { text-align: center;  flex-shrink: 0; }
.talent-hint-text {   text-align: center; font-size: 12px; color: var(--text-sub); opacity: 0.8; }
</style>