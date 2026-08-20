<template>
  <div class="role-container">
    <!-- Search and Filter Header -->
    <div class="role-sticky-top">
      <div class="role-search-row">
        <!-- Search bar -->
        <div class="role-search-box">
          <img src="/ui/search.svg" class="search-icon" />
          <input
            type="text"
            v-model="searchQuery"
            placeholder="搜索角色名字、描述..."
            class="role-search-input"
          />
        </div>
        <!-- Collapse Toggle Button (Smaller font and padding) -->
        <button class="filter-toggle-btn" :class="{ active: tagsExpanded }" @click="tagsExpanded = !tagsExpanded">
          <span class="filter-toggle-text">筛选</span>
          <img src="/ui/up.svg" class="collapse-icon" :class="{ collapsed: !tagsExpanded }" />
        </button>
      </div>

      <!-- Filters Panel (Collapsible) -->
      <Transition name="slide-fade">
        <div v-show="tagsExpanded" class="filter-panel">
          <!-- 1. 品阶 -->
          <div class="filter-row">
            <span class="filter-label">品阶：</span>
            <div class="filter-options">
              <button
                class="filter-btn"
                :class="{ active: selectedStep === 'all' }"
                @click="toggleFilter('step', 'all')"
              >
                全部
              </button>
              <button
                v-for="opt in stepOptions"
                :key="opt.value"
                class="filter-btn step-btn"
                :class="[`step-btn-${opt.value}`, { active: selectedStep === opt.value }]"
                @click="toggleFilter('step', opt.value)"
              >
                {{ opt.label }}
              </button>
            </div>
          </div>

          <!-- 2. 职业 -->
          <div class="filter-row">
            <span class="filter-label">职业：</span>
            <div class="filter-options">
              <button
                class="filter-btn"
                :class="{ active: selectedClass === 'all' }"
                @click="toggleFilter('class', 'all')"
              >
                全部
              </button>
              <button
                v-for="opt in classOptions"
                :key="opt.value"
                class="filter-btn"
                :class="{ active: selectedClass === opt.value }"
                @click="toggleFilter('class', opt.value)"
              >
                {{ opt.label }}
              </button>
            </div>
          </div>

          <!-- 3. 种族（大种族） -->
          <div class="filter-row">
            <span class="filter-label">种族：</span>
            <div class="filter-options">
              <button
                class="filter-btn"
                :class="{ active: selectedType === 'all' }"
                @click="toggleFilter('type', 'all')"
              >
                全部
              </button>
              <button
                v-for="opt in typeOptions"
                :key="opt.value"
                class="filter-btn"
                :class="{ active: selectedType === opt.value }"
                @click="toggleFilter('type', opt.value)"
              >
                {{ opt.label }}
              </button>
            </div>
          </div>

          <!-- 4. 属性 -->
          <div class="filter-row">
            <span class="filter-label">属性：</span>
            <div class="filter-options">
              <button
                class="filter-btn"
                :class="{ active: selectedElement === 'all' }"
                @click="toggleFilter('element', 'all')"
              >
                全部
              </button>
              <button
                v-for="opt in elementOptions"
                :key="opt.value"
                class="filter-btn"
                :class="{ active: selectedElement === opt.value }"
                @click="toggleFilter('element', opt.value)"
              >
                {{ opt.label }}
              </button>
            </div>
          </div>

          <!-- 5. 细分种族（如人马族、血族等） -->
          <div class="filter-row">
            <span class="filter-label">细分：</span>
            <div class="filter-options">
              <button
                class="filter-btn"
                :class="{ active: selectedSubRace === 'all' }"
                @click="toggleFilter('subRace', 'all')"
              >
                全部
              </button>
              <button
                v-for="subRace in subRaceOptions"
                :key="subRace"
                class="filter-btn"
                :class="{ active: selectedSubRace === subRace }"
                @click="toggleFilter('subRace', subRace)"
              >
                {{ subRace }}
              </button>
            </div>
          </div>
        </div>
      </Transition>

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

      <!-- 检索数量统计 -->
      <div class="search-count-bar">
        当前检索角色数量：<span class="count-highlight">{{ sortedCharacters.length }}</span>
      </div>
    </div>

    <!-- Character 4-column Grid List (Lazy loading enabled) -->
    <div class="role-grid-container" @scroll="handleGridScroll">
      <div
        v-for="char in pagedCharacters"
        :key="char.id"
        class="role-grid-card"
        @click="openDetail(char)"
      >
        <div
          class="role-avatar-slot"
          :style="{ borderColor: getStepConfig(char.step).color }"
        >
          <img
            :src="`/RoleCard/${char.id.replace(/^M/, 'MD')}.png`"
            :alt="char.displayName"
            class="role-avatar-img game-sprite"
            @error="handleCardError"
          />
        </div>
        <!-- Card Name Label: Wrapping allowed for long names -->
        <div class="role-card-name-label" :style="{ color: getStepConfig(char.step).color }">
          {{ char.displayName }}
        </div>
      </div>

      <div v-if="pagedCharacters.length === 0" class="no-data">
        未找到匹配的角色数据
      </div>
    </div>

    <!-- Whole-page scrollable detail overlay -->
    <div
      v-if="selectedChar"
      class="role-detail-overlay"
    >
      <div class="role-detail-wrapper">
        <!-- Close Button (sticky float at top right) -->
        <div class="close-btn-sticky-wrapper">
          <button class="role-detail-close" @click="closeDetail">✕</button>
        </div>

        <!-- Title centered -->
        <h2 class="detail-title" :style="{ color: getStepConfig(selectedChar.step).color }">
          {{ selectedChar.displayName }}
        </h2>

        <!-- Character full portrait draw card (Vertical layout, scaled down further) -->
        <div
          class="detail-portrait-card"
          :style="{ backgroundColor: getStepConfig(selectedChar.step).bg }"
        >
          <img
            :src="`/RoleDraw/${selectedChar.id}_1__single_part1_1@1.png`"
            :alt="selectedChar.displayName"
            class="detail-portrait-img game-sprite"
            @error="handleDrawError"
          />
        </div>

        <!-- 4 basic tags (Uniform color & less rounded) -->
        <div class="detail-tags-container">
          <span class="detail-tag">{{ selectedChar.type }}</span>
          <span class="detail-tag">{{ selectedChar.class }}</span>
          <span class="detail-tag">{{ selectedChar.element }}</span>
          <span class="detail-tag">{{ selectedChar.map || '未知地区' }}</span>
        </div>

        <div class="detail-metadata">
          <p><strong>角色名称：</strong>{{ selectedChar.displayName }}</p>
          <p><strong>定位：</strong>{{ selectedChar.characterRole || '未知' }}</p>
          <p><strong>所属：</strong>{{ selectedChar.background || '暂无所属信息' }}</p>
          <div v-if="charBaseAttrs && charBaseAttrs.length > 0" class="role-base-attrs-box" style="margin-top: 10px; border-top: 1px dashed var(--border-color); padding-top: 10px;">
            <!-- 基础属性标题 与 等级调节器在一行 -->
            <div class="base-attrs-header-row">
              <span class="base-attrs-title">基础属性：</span>
              
              <div class="level-selector-inline">
                <span class="level-selector-label">等级</span>
                <div class="level-input-wrapper-horizontal">
                  <span class="level-adjust-btn-horizontal down" @click="adjustLevel(-1)">▼</span>
                  <input
                    type="number"
                    v-model.number="charLevel"
                    min="1"
                    max="100"
                    class="level-number-input-horizontal"
                  />
                  <span class="level-adjust-btn-horizontal up" @click="adjustLevel(1)">▲</span>
                </div>
              </div>
            </div>

            <div class="detail-card-attributes">
              <div v-for="attr in charBaseAttrs" :key="attr.key" class="base-attr-tag">
                <img :src="`/General/${attr.icon}`" class="attr-mini-icon game-sprite" />
                <span>{{ attr.name }} {{ attr.value }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Details Section -->
        <div class="detail-sections-container">
          
          <!-- 1. Active Skills (专属主动技能) -->
          <div class="detail-section">
            <h3 class="section-title">专属技能</h3>
            <div v-if="selectedChar.activeSkills.length === 0" class="empty-sub-section">无专属技能</div>
            <div
              v-for="sk in selectedChar.activeSkills"
              :key="sk.name"
              class="detail-card-item"
            >
              <div class="card-item-header">
                <div class="card-item-icon-box">
                  <img :src="`/Skill/${sk.icon}.png`" class="card-item-icon game-sprite" @error="handleSkillIconError" />
                </div>
                <div class="card-item-meta">
                  <span class="card-item-name">{{ sk.name }}</span>
                  <span class="card-item-badge bg-blue">{{ sk.skillType }}</span>
                </div>
              </div>
              <div class="card-item-desc">{{ sk.formattedDesc }}</div>
              <div class="card-item-sub">
                目标：{{ sk.targetType }} | 目标数：{{ sk.maxTarget }} | 释放次数：{{ sk.times }}
              </div>
            </div>
          </div>

          <!-- 2. Normal Attack (普通攻击/治疗) -->
          <div class="detail-section">
            <h3 class="section-title">普通攻击</h3>
            <div v-if="!normalAttackDetail" class="empty-sub-section">无普通攻击数据</div>
            <div v-else class="detail-card-item">
              <div class="card-item-header">
                <div class="card-item-icon-box">
                  <img :src="`/Skill/${normalAttackDetail.icon}.png`" class="card-item-icon game-sprite" @error="handleSkillIconError" />
                </div>
                <div class="card-item-meta">
                  <span class="card-item-name">{{ normalAttackDetail.name }}</span>
                  <span class="card-item-badge bg-green">{{ normalAttackDetail.type }}</span>
                </div>
              </div>
              <div class="card-item-desc">{{ normalAttackDetail.formattedDesc }}</div>
            </div>
          </div>

          <!-- 3. Race (细分种族) -->
          <div class="detail-section">
            <h3 class="section-title">种族特性</h3>
            <div v-if="!raceDetail" class="empty-sub-section">无种族数据</div>
            <div v-else class="detail-card-item">
              <div class="card-item-header">
                <div class="card-item-icon-box">
                  <img :src="`/Skill/${raceDetail.icon}.png`" class="card-item-icon game-sprite" @error="handleSkillIconError" />
                </div>
                <div class="card-item-meta">
                  <span class="card-item-name">{{ raceDetail.name }}</span>
                  <span class="card-item-badge bg-purple">{{ raceDetail.type }}</span>
                </div>
              </div>
              <div class="card-item-desc">{{ raceDetail.formattedDesc }}</div>
            </div>
          </div>

          <!-- 4. Support Skills (支援技能) -->
          <div class="detail-section">
            <h3 class="section-title">支援技能</h3>
            <div class="support-skills-grid">
              <div
                v-for="sk in supportSkillsList"
                :key="sk.type"
                class="detail-card-item"
              >
                <div class="card-item-header">
                  <div class="card-item-icon-box">
                    <img :src="`/Skill/${sk.icon}.png`" class="card-item-icon game-sprite" @error="handleSkillIconError" />
                  </div>
                  <div class="card-item-meta">
                    <span class="card-item-name">{{ sk.name }}</span>
                    <span class="card-item-badge bg-amber">{{ sk.type }} · {{ sk.star }}星</span>
                  </div>
                </div>
                <div class="card-item-desc">{{ sk.formattedDesc }}</div>
              </div>
            </div>
          </div>

          <!-- 5. Relics / Insights (角色心得 & 全部心得) -->
          <div class="detail-section">
            <h3 class="section-title">角色心得</h3>
            
            <!-- Exclusive Relics -->
            <div v-if="selectedChar.relics.length === 0" class="empty-sub-section">暂无角色专属心得</div>
            <div
              v-for="relic in selectedChar.relics"
              :key="relic.IDs"
              class="relic-item"
            >
              <div class="relic-header">
                <div class="relic-title-left">
                  <img :src="`/Relics/${relic.IDs}.png`" class="relic-icon game-sprite" @error="handleRelicIconError" />
                  <span class="relic-name" :style="{ color: getStepConfig(relic.Step).color }">{{ relic.Name }}</span>
                </div>
                <span class="relic-badge" :style="{ color: getStepConfig(relic.Step).color, borderColor: getStepConfig(relic.Step).color }">
                  {{ relic.Step }}阶
                </span>
              </div>
              <div class="relic-effect">
                <span v-if="getRelicRequirementPrefix(relic)">{{ getRelicRequirementPrefix(relic) }} 角色 </span>{{ formatRelicEffect(relic.Effect, relic.MaxLevel) }}
              </div>
            </div>

            <!-- Expandable Edible Relics (全部心得 - Wrapped feeling with scroll) -->
            <div class="accordion-item edible-relics-accordion" style="margin-top: 10px;">
              <div class="accordion-header" @click="edibleRelicsExpanded = !edibleRelicsExpanded">
                <span>全部心得 ({{ allEdibleRelics.length }})</span>
                <img src="/ui/up.svg" class="accordion-arrow" :class="{ collapsed: !edibleRelicsExpanded }" />
              </div>
              <div v-show="edibleRelicsExpanded" class="edible-relics-content">
                <!-- Tabs: 职业 placed in front of 种族 (职业, 种族, 属性) -->
                <div class="relics-filter-tabs">
                  <button
                    :class="['relics-tab-btn', { active: activeRelicsTab === '职业' }]"
                    @click="activeRelicsTab = '职业'"
                  >
                    {{ selectedChar.class }}
                  </button>
                  <button
                    :class="['relics-tab-btn', { active: activeRelicsTab === '种族' }]"
                    @click="activeRelicsTab = '种族'"
                  >
                    {{ selectedChar.type }}
                  </button>
                  <button
                    :class="['relics-tab-btn', { active: activeRelicsTab === '属性' }]"
                    @click="activeRelicsTab = '属性'"
                  >
                    {{ selectedChar.element }}
                  </button>
                </div>

                <!-- Relics List (Clover style rows) -->
                <div class="edible-relics-list">
                  <div v-if="filteredEdibleRelics.length === 0" class="empty-sub-section">
                    当前无匹配的心得
                  </div>
                  <div
                    v-for="relic in filteredEdibleRelics"
                    :key="relic.IDs"
                    class="clover-added-item"
                  >
                    <div class="clover-item-left">
                      <img :src="`/Relics/${relic.IDs}.png`" class="clover-item-icon game-sprite" @error="handleRelicIconError" />
                      <div class="clover-item-text">
                        <div class="clover-item-line1">
                          <span class="clover-item-name" :style="{ color: getStepConfig(relic.Step).color }">{{ relic.Name }}</span>
                          <span class="clover-item-source-name">{{ getRelicSourceRoleName(relic) }}</span>
                        </div>
                        <!-- Bracket layout removed, display matching Class/Race/SubRace value directly -->
                        <div class="clover-item-line2">
                          {{ activeRelicsTab === '职业' ? relic.Class : (activeRelicsTab === '种族' ? relic.Race : relic.SubRace) }} 角色 {{ formatRelicEffect(relic.Effect, relic.MaxLevel) }}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 6. Talents (天赋列表 - Quality-sorted within same name) -->
          <div class="detail-section">
            <h3 class="section-title">天赋列表</h3>
            <div class="talents-accordion">
              <!-- Exclusive Talents -->
              <div class="accordion-item">
                <div class="accordion-header" @click="toggleTalentExpand('exclusive')">
                  <span>专属天赋 ({{ sortedExclusiveTalents.length }})</span>
                  <img src="/ui/up.svg" class="accordion-arrow" :class="{ collapsed: !talentExpanded.exclusive }" />
                </div>
                <div v-if="talentExpanded.exclusive" class="accordion-content">
                  <div v-if="sortedExclusiveTalents.length === 0" class="empty-sub-section">无专属天赋</div>
                  <div v-for="t in sortedExclusiveTalents" :key="t.Name + t.Step" class="talent-item">
                    <div class="talent-item-name" :style="{ color: getStepConfig(t.Step).color }">
                      {{ t.Name }}
                    </div>
                    <div class="talent-item-effect">{{ t.formattedEffect }}</div>
                  </div>
                </div>
              </div>

              <!-- Race Talents -->
              <div class="accordion-item">
                <div class="accordion-header" @click="toggleTalentExpand('race')">
                  <span>种族天赋 ({{ sortedRaceTalents.length }})</span>
                  <img src="/ui/up.svg" class="accordion-arrow" :class="{ collapsed: !talentExpanded.race }" />
                </div>
                <div v-if="talentExpanded.race" class="accordion-content">
                  <div v-if="sortedRaceTalents.length === 0" class="empty-sub-section">无种族天赋</div>
                  <div v-for="t in sortedRaceTalents" :key="t.Name + t.Step" class="talent-item">
                    <div class="talent-item-name" :style="{ color: getStepConfig(t.Step).color }">
                      {{ t.Name }}
                    </div>
                    <div class="talent-item-effect">{{ t.formattedEffect }}</div>
                  </div>
                </div>
              </div>

              <!-- Class Talents -->
              <div class="accordion-item">
                <div class="accordion-header" @click="toggleTalentExpand('class')">
                  <span>职业天赋 ({{ sortedClassTalents.length }})</span>
                  <img src="/ui/up.svg" class="accordion-arrow" :class="{ collapsed: !talentExpanded.class }" />
                </div>
                <div v-if="talentExpanded.class" class="accordion-content">
                  <div v-if="sortedClassTalents.length === 0" class="empty-sub-section">无职业天赋</div>
                  <div v-for="t in sortedClassTalents" :key="t.Name + t.Step" class="talent-item">
                    <div class="talent-item-name" :style="{ color: getStepConfig(t.Step).color }">
                      {{ t.Name }}
                    </div>
                    <div class="talent-item-effect">{{ t.formattedEffect }}</div>
                  </div>
                </div>
              </div>

              <!-- Element Talents -->
              <div class="accordion-item">
                <div class="accordion-header" @click="toggleTalentExpand('element')">
                  <span>属性天赋 ({{ sortedElementTalents.length }})</span>
                  <img src="/ui/up.svg" class="accordion-arrow" :class="{ collapsed: !talentExpanded.element }" />
                </div>
                <div v-if="talentExpanded.element" class="accordion-content">
                  <div v-if="sortedElementTalents.length === 0" class="empty-sub-section">无属性天赋</div>
                  <div v-for="t in sortedElementTalents" :key="t.Name + t.Step" class="talent-item">
                    <div class="talent-item-name" :style="{ color: getStepConfig(t.Step).color }">
                      {{ t.Name }}
                    </div>
                    <div class="talent-item-effect">{{ t.formattedEffect }}</div>
                  </div>
                </div>
              </div>

              <!-- Common Talents -->
              <div class="accordion-item">
                <div class="accordion-header" @click="toggleTalentExpand('common')">
                  <span>通用天赋 ({{ sortedCommonTalents.length }})</span>
                  <img src="/ui/up.svg" class="accordion-arrow" :class="{ collapsed: !talentExpanded.common }" />
                </div>
                <div v-if="talentExpanded.common" class="accordion-content">
                  <div v-if="sortedCommonTalents.length === 0" class="empty-sub-section">无通用天赋</div>
                  <div v-for="t in sortedCommonTalents" :key="t.Name + t.Step" class="talent-item">
                    <div class="talent-item-name" :style="{ color: getStepConfig(t.Step).color }">
                      {{ t.Name }}
                    </div>
                    <div class="talent-item-effect">{{ t.formattedEffect }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>


    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import rawRoles from '@/assets/Role.json'
import rawSubSkills from '@/assets/Sub_Skill.json'
import rawUniqueSkills from '@/assets/Unique.json'
import rawTalents from '@/assets/Talent.json'
import rawRelics from '@/assets/Relics.json'
import rawBasicAttrs from '@/assets/Basic_Attr.json'
import * as configUtil from '@/utils/configTableUtil.js'
import { getCategoryByTag } from '@/utils/tagCategories'
import { getVisibleCharacters, HIDE_UNRELEASED_CHARACTERS } from '@/utils/characterFilter'

// Options for search criteria
const stepOptions = [
  { label: '传说', value: 'S' },
  { label: '史诗', value: 'A' },
  { label: '稀有', value: 'B' },
  { label: '普通', value: 'C' }
]

const classOptions = [
  { label: '战士', value: '战士' },
  { label: '射手', value: '射手' },
  { label: '法师', value: '法师' },
  { label: '牧师', value: '牧师' }
]

const typeOptions = [
  { label: '生灵', value: '生灵' },
  { label: '器灵', value: '器灵' },
  { label: '魔灵', value: '魔灵' },
  { label: '亡灵', value: '亡灵' },
  { label: '神灵', value: '神灵' }
]

const elementOptions = [
  { label: '地系', value: '地系' },
  { label: '风系', value: '风系' },
  { label: '水系', value: '水系' },
  { label: '火系', value: '火系' },
  { label: '光系', value: '光系' },
  { label: '暗系', value: '暗系' }
]

// 细分种族列表提取与自然排序
const subRaceOptions = computed(() => {
  const races = new Set()
  allCharacters.value.forEach(c => {
    if (c.race && c.race.name) {
      races.add(c.race.name)
    }
  })
  const priority = [
    '人族', '精灵', '兽族', '人马族', '矮人', '龙族', '巨人', '哥布林', '熊猫族',
    '史莱姆', '能量元素', '熔岩元素', '神器之灵', '魔偶',
    '不死族', '血族', '神族', '水神族'
  ]
  return Array.from(races).sort((a, b) => {
    const idxA = priority.indexOf(a)
    const idxB = priority.indexOf(b)
    if (idxA !== -1 && idxB !== -1) return idxA - idxB
    if (idxA !== -1) return -1
    if (idxB !== -1) return 1
    return a.localeCompare(b, 'zh')
  })
})

// Search and expand states
const searchQuery = ref('')
const selectedStep = ref('all')
const selectedClass = ref('all')
const selectedType = ref('all')
const selectedSubRace = ref('all')
const selectedElement = ref('all')
const tagsExpanded = ref(false) // 默认收起
const selectedFilterTags = ref([])
const effectExpanded = ref(false)
const toggleEffectExpand = () => {
  effectExpanded.value = !effectExpanded.value
}

const STEP_PRIORITY = { 'S': 4, 'A': 3, 'B': 2, 'C': 1 }

// Setup full dataset
const rawRoleArr = configUtil.extractDataArray(rawRoles)
const rawSupportArr = configUtil.extractDataArray(rawSubSkills)
const rawSkillArr = configUtil.extractDataArray(rawUniqueSkills)
const rawTalentArr = configUtil.extractDataArray(rawTalents)
const rawRelicArr = configUtil.extractDataArray(rawRelics)

const datasets = {
  supportList: rawSupportArr,
  skillList: rawSkillArr,
  talentList: rawTalentArr,
  relicList: rawRelicArr,
  noteList: []
}

// Assembled characters
const allCharacters = ref(getVisibleCharacters(configUtil.getFullCharacterList(rawRoleArr, datasets)))

// Switch filter: We DO NOT hide any characters inside RoleDataTable.json, keeping M11301_000 etc.
const visibleCharacters = computed(() => {
  return allCharacters.value
})

// Switch filter: Hide unreleased relics
const isUnreleasedRelic = (relic) => {
  if (!relic.SpecifyRoleIDs) return false
  // If character is not present in our characters list, it is considered unreleased.
  // This correctly preserves real skin characters (like M12205_000, M51303_000) that are present in allCharacters.
  const exists = allCharacters.value.some(c => c.id === relic.SpecifyRoleIDs)
  return !exists
}

const visibleRelics = computed(() => {
  let list = rawRelicArr
  if (HIDE_UNRELEASED_CHARACTERS.value) {
    list = list.filter(relic => !isUnreleasedRelic(relic))
  }
  return list
})

// Filter logic
const filteredCharacters = computed(() => {
  return visibleCharacters.value.filter(char => {
    const q = searchQuery.value.trim().toLowerCase()
    const matchesSearch = !q ||
      char.displayName.toLowerCase().includes(q) ||
      char.name.toLowerCase().includes(q) ||
      (char.background && char.background.toLowerCase().includes(q)) ||
      (char.normalAttack && char.normalAttack.name.toLowerCase().includes(q)) ||
      (char.race && char.race.name.toLowerCase().includes(q)) ||
      char.activeSkills.some(sk => sk.name.toLowerCase().includes(q))

    const matchesStep = selectedStep.value === 'all' || char.step === selectedStep.value
    const matchesClass = selectedClass.value === 'all' || char.class === selectedClass.value
    const matchesType = selectedType.value === 'all' || char.type === selectedType.value
    const matchesSubRace = selectedSubRace.value === 'all' || (char.race && char.race.name === selectedSubRace.value)
    const matchesElement = selectedElement.value === 'all' || char.element === selectedElement.value

    return matchesSearch && matchesStep && matchesClass && matchesType && matchesSubRace && matchesElement
  })
})

const tagFilteredCharacters = computed(() => {
  const list = filteredCharacters.value
  if (selectedFilterTags.value.length === 0) return list
  return list.filter(char =>
    selectedFilterTags.value.every(tag => char.filterTags && char.filterTags.includes(tag))
  )
})

// 提取当前所有的搜索关键词 (包括主搜)
const queryKeywords = computed(() => {
  const qStr = (searchQuery.value || '').trim().toLowerCase()
  return qStr.split(/[\s,，]+/).filter(Boolean)
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
  allCharacters.value.forEach(c => {
    if (c.filterTags) {
      c.filterTags.forEach(t => dbTags.add(t))
    }
  })

  dbTags.forEach(t => {
    if (keywords.includes(t.toLowerCase())) {
      tags.add(t)
    }
  })

  // 绑定至最终结果集 (sortedCharacters)
  sortedCharacters.value.forEach(c => {
    if (c.filterTags) {
      c.filterTags.forEach(t => tags.add(t))
    }
  })

  const combinedList = Array.from(tags)

  const getTagGroupRank = (t) => {
    if (selectedFilterTags.value.includes(t)) {
      return 1 // 已选高亮置顶
    }
    if (t.endsWith('符文')) {
      return 3 // 符文类标签
    }
    if (t.endsWith('相关')) {
      return 4 // 效果相关标签
    }
    return 5 // 普通标签
  }

  // 排序规则：已选中 > xx符文 > xx相关 > 普通标签，每组内部按拼音中文排序
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

// 效果标签分组及长度降序排序
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
      // 按展示的字符长度降序排序（长标签排在前面）
      const sortedTags = [...tags].sort((a, b) => {
        const lenA = formatTagText(a).length
        const lenB = formatTagText(b).length
        return lenB - lenA
      })
      return { name, tags: sortedTags }
    })
})

// 辅助函数：格式化显示的标签文本，去后缀
const formatTagText = (tag) => {
  if (tag.endsWith('相关')) {
    return tag.slice(0, -2)
  }
  if (tag.endsWith('符文')) {
    return tag.slice(0, -2)
  }
  return tag
}

// 从搜索框中清除特定关键词
const removeKeywordFromSearch = (tag) => {
  const lowerTag = tag.toLowerCase()
  const val = searchQuery.value || ''
  const words = val.split(/[\s,，]+/).filter(Boolean)
  const filtered = words.filter(w => w.toLowerCase() !== lowerTag)
  searchQuery.value = filtered.join(' ')
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
  displayLimit.value = 40
}

// Build a map of base ID to the highest step priority among all versions of that base ID.
// This allows us to keep normal and alien characters grouped next to each other within the same rarity tier block.
const basePriorityMap = computed(() => {
  const map = {}
  allCharacters.value.forEach(char => {
    const baseId = char.id.split('_')[0]
    const priority = STEP_PRIORITY[char.step] || 0
    if (!map[baseId] || priority > map[baseId]) {
      map[baseId] = priority
    }
  })
  return map
})

// Sort logic:
// 1. Put "假人" at the end (dummy checked via Name/DisplayName containing "假人").
// 2. Sort by basePriority of character group descending (keeping S, A, B, C blocks).
// 3. Keep normal/alien characters next to each other by grouping baseId alphabetically.
// 4. Within the same base ID group, sort by full ID (normal character first, then alien skins).
const sortedCharacters = computed(() => {
  return [...tagFilteredCharacters.value].sort((a, b) => {
    const isDummyA = a.name && (a.name.includes('假人') || a.displayName.includes('假人'))
    const isDummyB = b.name && (b.name.includes('假人') || b.displayName.includes('假人'))
    if (isDummyA !== isDummyB) {
      return isDummyA ? 1 : -1
    }

    const baseIdA = a.id.split('_')[0]
    const baseIdB = b.id.split('_')[0]
    
    const prioA = basePriorityMap.value[baseIdA] || 0
    const prioB = basePriorityMap.value[baseIdB] || 0
    
    if (prioA !== prioB) {
      return prioB - prioA // Group by rarity block
    }

    if (baseIdA !== baseIdB) {
      return baseIdA.localeCompare(baseIdB) // Keep versions adjacent
    }

    return a.id.localeCompare(b.id) // Normal first, then alien versions
  })
})

// Lazy loading grid pagination
const displayLimit = ref(40) // Initial 24 characters loaded (6 rows of 4)
const pagedCharacters = computed(() => {
  return sortedCharacters.value.slice(0, displayLimit.value)
})

watch(searchQuery, () => {
  displayLimit.value = 40
})

watch(selectedStep, () => {
  displayLimit.value = 40
})

watch(selectedClass, () => {
  displayLimit.value = 40
})

watch(selectedType, () => {
  displayLimit.value = 40
})

watch(selectedElement, () => {
  displayLimit.value = 40
})

watch(selectedSubRace, () => {
  displayLimit.value = 40
})

watch(selectedFilterTags, () => {
  displayLimit.value = 40
})

const handleGridScroll = (e) => {
  const el = e.target
  if (el.scrollHeight - el.scrollTop - el.clientHeight < 100) {
    if (displayLimit.value < sortedCharacters.value.length) {
      displayLimit.value += 40
    }
  }
}

// Toggling filter state
const toggleFilter = (type, value) => {
  displayLimit.value = 40 // Reset lazy loading limit
  if (type === 'step') {
    selectedStep.value = selectedStep.value === value ? 'all' : value
  } else if (type === 'class') {
    selectedClass.value = selectedClass.value === value ? 'all' : value
  } else if (type === 'type') {
    selectedType.value = selectedType.value === value ? 'all' : value
  } else if (type === 'subRace') {
    selectedSubRace.value = selectedSubRace.value === value ? 'all' : value
  } else if (type === 'element') {
    selectedElement.value = selectedElement.value === value ? 'all' : value
  }
}

// Detail states
const selectedChar = ref(null)
const charLevel = ref(1)

// Reset level when selected character changes
watch(selectedChar, () => {
  charLevel.value = 1
})

// Bound level input within [1, 100]
watch(charLevel, (newVal) => {
  if (typeof newVal !== 'number' || isNaN(newVal)) return
  if (newVal < 1) charLevel.value = 1
  if (newVal > 100) charLevel.value = 100
})

// Adjust character level via buttons
const adjustLevel = (amount) => {
  const newVal = (Number(charLevel.value) || 1) + amount
  charLevel.value = Math.max(1, Math.min(100, newVal))
}

// 属性与图标/中文名映射 (用于角色图鉴属性卡渲染)
const charBaseAttrs = computed(() => {
  if (!selectedChar.value) return []

  const searchNames = [
    selectedChar.value.class,
    selectedChar.value.type,
    selectedChar.value.element,
    selectedChar.value.map,
    selectedChar.value.step
  ].filter(Boolean)

  const sums = {
    CONS: 0,
    STR: 0,
    INT: 0,
    DEX: 0,
    SPD: 0,
    Tough: 0,
    Weak: 0
  }

  // 1. 基础值计算
  const dataTable = Array.isArray(rawBasicAttrs) ? rawBasicAttrs : (rawBasicAttrs.DataTable || [])
  const matchedEntries = []
  searchNames.forEach(name => {
    const entry = dataTable.find(item => item.Name === name)
    if (entry) {
      matchedEntries.push(entry)
      sums.CONS += (entry.InitialCONS || 0)
      sums.STR += (entry.InitialSTR || 0)
      sums.INT += (entry.InitialINT || 0)
      sums.DEX += (entry.InitialDEX || 0)
      sums.SPD += (entry.initialSPD || 0)
      sums.Tough += (entry.initialTough || 0)
      sums.Weak += (entry.initialWeak || 0)
    }
  })

  // 2. 升级成长加点计算
  const level = Math.max(1, Math.min(100, Number(charLevel.value) || 1))
  
  const nameToKey = {
    '生命': 'CONS',
    '力量': 'STR',
    '精神': 'INT',
    '敏捷': 'DEX',
    '速度': 'SPD',
    '韧性': 'Tough',
    '弱点': 'Weak'
  }

  for (let L = 2; L <= level; L++) {
  // 终极对齐：用目标等级 L 直接模 10
  const remainder = L % 10;
  // 如果整除（尾数是0，如10级、20级），代表它是第10档；其余情况余数是几就是第几档
  const growthSlot = remainder === 0 ? 10 : remainder;
  const growthKey = `GrowthType${growthSlot}`;

  matchedEntries.forEach(entry => {
    const attrName = entry[growthKey]
    if (attrName && nameToKey[attrName]) {
      sums[nameToKey[attrName]] += 1
    }
  })
}

  // Determine starting mana based on class
  const isMage = selectedChar.value.class === '法师'
  const startingMana = isMage ? '10/30' : '0/30'

  return [
    { key: 'CONS', name: '生命', icon: 'mid_ico_attribute_0003.png', value: sums.CONS },
    { key: 'STR', name: '力量', icon: 'mid_ico_attribute_0004.png', value: sums.STR },
    { key: 'INT', name: '精神', icon: 'mid_ico_attribute_0002.png', value: sums.INT },
    { key: 'DEX', name: '敏捷', icon: 'mid_ico_attribute_0005.png', value: sums.DEX },
    { key: 'SPD', name: '速度', icon: 'mid_ico_attribute_0001.png', value: sums.SPD },
    { key: 'Tough', name: '韧性', icon: 'mid_ico_attribute_0009.png', value: sums.Tough },
    { key: 'Weak', name: '弱点', icon: 'mid_ico_attribute_0008.png', value: sums.Weak },
    { key: 'Luck', name: '幸运', icon: 'mid_ico_attribute_0010.png', value: 0 },
    { key: 'InitialMagic', name: '初始魔力', icon: 'mid_ico_attribute_0006.png', value: startingMana }
  ]
})

const edibleRelicsExpanded = ref(false) // 全部心得默认收起
const activeRelicsTab = ref('职业') // Default to 职业 (First tab)

const normalAttackDetail = computed(() => {
  if (!selectedChar.value || !selectedChar.value.normalAttack) return null
  return getSubSkillDetail(selectedChar.value.normalAttack.id) || {
    name: selectedChar.value.normalAttack.name,
    formattedDesc: '无描述',
    type: '普攻',
    icon: 'TB00011'
  }
})

const raceDetail = computed(() => {
  if (!selectedChar.value || !selectedChar.value.race) return null
  return getSubSkillDetail(selectedChar.value.race.id) || {
    name: selectedChar.value.race.name,
    formattedDesc: '无描述',
    type: '种族',
    icon: 'TB20011'
  }
})

const supportSkillsList = computed(() => {
  if (!selectedChar.value) return []
  const skills = selectedChar.value.supportSkills
  return [
    skills.characteristic,
    skills.subClass,
    skills.feature
  ].filter(Boolean)
})

// Accordion open states
const talentExpanded = ref({
  exclusive: false,
  race: false,
  class: false,
  element: false,
  common: false
})

const toggleTalentExpand = (key) => {
  talentExpanded.value[key] = !talentExpanded.value[key]
}

// Helper: sort talents with same Name placing higher quality (Step) on top
const sortTalents = (talents) => {
  const stepOrder = { 'S': 4, 'A': 3, 'B': 2, 'C': 1 }
  return [...talents].sort((a, b) => {
    const nameCompare = a.Name.localeCompare(b.Name)
    if (nameCompare !== 0) {
      return nameCompare
    }
    const stepA = stepOrder[a.Step] || 0
    const stepB = stepOrder[b.Step] || 0
    return stepB - stepA
  })
}

// Sorted talent computed properties
const sortedExclusiveTalents = computed(() => {
  if (!selectedChar.value || !selectedChar.value.talents) return []
  return sortTalents(selectedChar.value.talents.exclusive)
})
const sortedRaceTalents = computed(() => {
  if (!selectedChar.value || !selectedChar.value.talents) return []
  return sortTalents(selectedChar.value.talents.race)
})
const sortedClassTalents = computed(() => {
  if (!selectedChar.value || !selectedChar.value.talents) return []
  return sortTalents(selectedChar.value.talents.class)
})
const sortedElementTalents = computed(() => {
  if (!selectedChar.value || !selectedChar.value.talents) return []
  return sortTalents(selectedChar.value.talents.element)
})
const sortedCommonTalents = computed(() => {
  if (!selectedChar.value || !selectedChar.value.talents) return []
  return sortTalents(selectedChar.value.talents.common)
})

// Relics helper: Sort relics by Step descending and Name ascending
const sortRelics = (list) => {
  const stepOrder = { 'S': 3, 'A': 2, 'B': 1, 'C': 0 }
  return [...list].sort((a, b) => {
    const wa = stepOrder[a.Step] || 0
    const wb = stepOrder[b.Step] || 0
    if (wa !== wb) return wb - wa
    return a.Name.localeCompare(b.Name)
  })
}

// Relics helper: Resolve display source role name for a relic
const getRelicSourceRoleName = (relic) => {
  if (!relic.SpecifyRoleIDs) return '通用'
  const char = allCharacters.value.find(c => c.id === relic.SpecifyRoleIDs)
  return char ? char.displayName : relic.SpecifyRoleIDs
}

// 获取心得的前缀类型（Class/Race/SubRace）
const getRelicRequirementPrefix = (relic) => {
  if (!relic) return ''
  return relic.Class || relic.Race || relic.SubRace || ''
}

// Relics helper: check if a relic matches character tags using direct database matching
// - 种族 (Race) matches relic.Race field
// - 职业 (Class) matches relic.Class field
// - 属性 (Element) matches relic.SubRace field
const isRelicMatch = (relic, char, tab) => {
  if (tab === '种族') {
    return relic.Race === char.type
  }
  if (tab === '职业') {
    return relic.Class === char.class
  }
  if (tab === '属性') {
    return relic.SubRace === char.element
  }
  return false
}

// Relics helper: find all edible relics matching character tags (Excluding exclusive)
const allEdibleRelics = computed(() => {
  if (!selectedChar.value) return []
  const char = selectedChar.value
  return visibleRelics.value.filter(relic => 
    isRelicMatch(relic, char, '种族') ||
    isRelicMatch(relic, char, '职业') ||
    isRelicMatch(relic, char, '属性')
  )
})

// Relics helper: Filter edible relics by current tab (种族 / 职业 / 属性)
const filteredEdibleRelics = computed(() => {
  if (!selectedChar.value) return []
  const char = selectedChar.value
  const list = visibleRelics.value.filter(relic => isRelicMatch(relic, char, activeRelicsTab.value))
  return sortRelics(list)
})

// Helper: parse a subskill detailed info
const getSubSkillDetail = (id) => {
  if (!id) return null
  const rawSkill = rawSupportArr.find(item => item.IDs === id)
  if (!rawSkill) return null
  const valueList = [rawSkill.Value0, rawSkill.Value1, rawSkill.Value2]
  return {
    id: rawSkill.IDs,
    name: rawSkill.Name,
    type: rawSkill.Type,
    icon: rawSkill.Icon || 'TB00001',
    description: rawSkill.Description,
    formattedDesc: configUtil.replacePlaceholders(rawSkill.Description, valueList),
    value0: rawSkill.Value0 ?? 0,
    value1: rawSkill.Value1 ?? 0,
    value2: rawSkill.Value2 ?? 0
  }
}

// Helper: format relic/insight description (attr+2 -> attr+2/4/6/8)
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

// Color and background helper
const getStepConfig = (step) => {
  const map = {
    'S': { label: '传说', color: '#f97316', bg: 'rgba(249, 115, 22, 0.1)' },
    'A': { label: '史诗', color: '#a855f7', bg: 'rgba(168, 85, 247, 0.1)' },
    'B': { label: '稀有', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)' },
    'C': { label: '普通', color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' }
  }
  return map[step] || { label: step, color: '#64748b', bg: 'rgba(100, 116, 139, 0.1)' }
}



const openDetail = (char) => {
  // Reset states
  talentExpanded.value = {
    exclusive: false,
    race: false,
    class: false,
    element: false,
    common: false
  }
  edibleRelicsExpanded.value = false
  activeRelicsTab.value = '职业' // Default to 职业 (First tab)
  selectedChar.value = char
}

const closeDetail = () => {
  selectedChar.value = null
}

// Image fallback handlers
const handleCardError = (e) => {
  e.target.src = '/Header/M00000.png'
}

const handleDrawError = (e) => {
  e.target.src = '/Header/M00000.png'
}

const handleSkillIconError = (e) => {
  e.target.src = '/Skill/TB00001.png'
}

const handleRelicIconError = (e) => {
  e.target.src = '/Relics/Mark.png'
}
</script>

<style scoped>
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

/* ===== CSS pixel rendering helper ===== */
.game-sprite {
  image-rendering: pixelated;
  image-rendering: -moz-crisp-edges;
  image-rendering: crisp-edges;
}

/* ===== Page Container ===== */
.role-container {
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
  position: relative;
}

.role-sticky-top {
  flex-shrink: 0;
  background: var(--bg);
  padding-bottom: 10px;
  z-index: 10;
}

/* ===== Search row with Collapse Button ===== */
.role-search-row {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.role-search-box {
  display: flex;
  align-items: center;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 10px 14px;
  box-shadow: inset 0 1px 4px rgba(0,0,0,0.06);
  transition: border-color 0.2s ease;
  flex: 1;
  min-width: 0;
}
.role-search-box:focus-within {
  border-color: var(--primary);
}

.search-icon {
  width: 18px;
  height: 18px;
  filter: var(--icon-filter);
  margin-right: 10px;
  flex-shrink: 0;
  opacity: 0.7;
}

.role-search-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 15px;
  color: var(--text-main);
  font-family: inherit;
  min-width: 0;
}

/* Toggle button styled smaller */
.filter-toggle-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 0 12px;
  cursor: pointer;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
  transition: all 0.2s ease;
  flex-shrink: 0;
  color: var(--text-main);
  height: 42px;
}
.filter-toggle-btn:hover {
  border-color: #409eff;
  color: #409eff;
}

.filter-toggle-btn.active {
  background: #eff6ff;
  border-color: #3b82f6;
  color: #3b82f6;
}

.dark-mode .filter-toggle-btn.active {
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

/* ===== 筛选折叠面板（100% 一致复刻 RuneView 样式与交互） ===== */
.filter-panel {
  margin-top: 6px;
  margin-bottom: 6px;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 10px 14px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.04);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.filter-row {
  display: flex;
  align-items: flex-start;
  font-size: 13px;
}

.filter-label {
  color: var(--text-sub);
  white-space: nowrap;
  padding-top: 4px;
  width: 52px;
  flex-shrink: 0;
  font-size: 13px;
  font-weight: 700;
  text-align: left;
}

.filter-options {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  flex: 1;
}

.filter-btn {
  background: transparent;
  border: none;
  padding: 4px 10px;
  border-radius: 12px;
  color: var(--text-main);
  cursor: pointer;
  white-space: nowrap;
  font-size: 13px;
  transition: all 0.15s ease;
}

.filter-btn:hover {
  background: rgba(59, 130, 246, 0.08);
}

.filter-btn.active {
  background: rgba(59, 130, 246, 0.15) !important;
  color: #3b82f6 !important;
  font-weight: bold;
}

/* 品阶特定按钮高亮（复刻商人和符文的 active 风格） */
.step-btn-SS.active { background: rgba(239, 68, 68, 0.15) !important; color: #ef4444 !important; font-weight: bold; }
.step-btn-S.active  { background: rgba(249, 115, 22, 0.15) !important; color: #f97316 !important; font-weight: bold; }
.step-btn-A.active  { background: rgba(168, 85, 247, 0.15) !important; color: #a855f7 !important; font-weight: bold; }
.step-btn-B.active  { background: rgba(59, 130, 246, 0.15) !important; color: #3b82f6 !important; font-weight: bold; }
.step-btn-C.active  { background: rgba(16, 185, 129, 0.15) !important; color: #10b981 !important; font-weight: bold; }

/* ===== Grid Container (4 columns) ===== */
.role-grid-container {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-auto-rows: min-content;
  align-content: start;
  gap: 12px 8px;
  width: 100%;
  flex: 1;
  overflow-y: auto;
  padding: 10px 2px 20px 2px;
}

@media (min-width: 768px) {
  .role-grid-container {
    grid-template-columns: repeat(6, 1fr);
  }
}

.role-grid-card {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 6px;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
  cursor: pointer;
  min-width: 0;
  overflow: hidden;
}
.role-grid-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.08);
  border-color: var(--primary);
}

.role-avatar-slot {
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: 8px;
  border: 1.5px solid transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background-color: var(--bg);
}

.role-avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.2s ease;
}
.role-grid-card:hover .role-avatar-img {
  transform: scale(1.04);
}

/* Wrapping allowed for characters display name on card */
.role-card-name-label {
  font-size: 11px;
  font-weight: 700;
  margin-top: 6px;
  margin-bottom: 2px;
  text-align: center;
  white-space: normal; /* Wrapping enabled! */
  word-break: break-all;
  width: 100%;
  line-height: 1.3;
}

/* ===== Scrollable Detail Overlay ===== */
.role-detail-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: var(--bg);
  z-index: 100;
  overflow-y: auto;
  box-sizing: border-box;
  padding: 16px;
  animation: slideIn 0.25s ease-out;
}

@keyframes slideIn {
  from { transform: translateY(30px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.role-detail-wrapper {
  position: relative;
  width: 100%;
  max-width: 600px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  padding-bottom: 40px;
}

/* Fixed/sticky close button at top-right */
.close-btn-sticky-wrapper {
  position: sticky;
  top: 0;
  width: 100%;
  display: flex;
  justify-content: flex-end;
  height: 0;
  z-index: 1010;
  pointer-events: none;
}

.role-detail-close {
  pointer-events: auto;
  margin-top: 2px;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  width: 34px;
  height: 34px;
  border-radius: 50%;
  font-size: 17px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--text-sub);
  box-shadow: 0 4px 8px rgba(0,0,0,0.12);
  z-index: 10;
  transition: all 0.15s ease;
}
.role-detail-close:hover {
  color: var(--red);
  border-color: var(--red);
  transform: scale(1.05);
}

.detail-title {
  font-size: 20px;
  font-weight: 800;
  text-align: center;
  margin: 4px 45px 16px 45px;
}

/* Portrait Card: Shrunk down further */
.detail-portrait-card {
  width: 100%;
  max-width: 260px; /* Reduced from 360px */
  margin: 0 auto 16px auto;
  border-radius: 8px; /* Less rounded! */
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  box-sizing: border-box;
  border: 1px solid var(--border-color);
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
  overflow: hidden;
}

.detail-portrait-img {
  width: 100%;
  height: auto;
  max-height: 280px; /* Reduced from 380px */
  object-fit: contain;
}

/* ===== Detail Tags (Uniform styled blue/gray & less rounded) ===== */
.detail-tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
  margin-bottom: 16px;
}

.detail-tag {
  padding: 3px 10px;
  border-radius: 4px; /* Less rounded! */
  font-size: 11px;
  font-weight: 700;
  color: var(--primary);
  background: rgba(59, 130, 246, 0.08);
  border: 1px solid rgba(59, 130, 246, 0.18);
  box-shadow: 0 1px 2px rgba(0,0,0,0.02);
}

/* ===== Metadata Info ===== */
.detail-metadata {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 10px; /* Less rounded */
  padding: 12px 14px;
  font-size: 13px;
  color: var(--text-main);
  line-height: 1.6;
  margin-bottom: 20px;
  box-shadow: 0 2px 6px rgba(0,0,0,0.02);
}
.detail-metadata p {
  margin: 6px 0;
  text-align: left;
}
.detail-metadata p strong {
  color: var(--text-sub);
}

/* ===== Detail Sections layout ===== */
.detail-sections-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.detail-section {
  display: flex;
  flex-direction: column;
}

.section-title {
  font-size: 15px;
  font-weight: 800;
  color: var(--text-main);
  border-left: 4px solid var(--primary);
  padding-left: 8px;
  margin: 0 0 10px 0;
  text-align: left;
}

.empty-sub-section {
  font-size: 13px;
  color: var(--text-sub);
  text-align: center;
  padding: 15px 0;
  background: var(--card-bg);
  border: 1px dashed var(--border-color);
  border-radius: 8px;
}

/* ===== Detail Card Items (Text wraps enabled) ===== */
.detail-card-item {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 8px; /* Less rounded */
  padding: 12px;
  margin-bottom: 8px;
  box-shadow: 0 2px 6px rgba(0,0,0,0.02);
  display: flex;
  flex-direction: column;
  gap: 6px;
  box-sizing: border-box;
}

.card-item-header {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap; /* Wrap allowed */
}

.card-item-icon-box {
  width: 32px;
  height: 32px;
  background: var(--bg);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.card-item-icon {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.card-item-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
  flex-wrap: wrap; /* Wrap allowed */
}

.card-item-name {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-main);
  white-space: normal; /* Wrap allowed! */
  word-break: break-all;
}

.card-item-badge {
  font-size: 10.5px;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 4px;
  color: #ffffff;
  flex-shrink: 0;
}

.bg-blue { background: #3b82f6; }
.bg-green { background: #10b981; }
.bg-purple { background: #8b5cf6; }
.bg-amber { background: #f59e0b; }

.card-item-desc {
  font-size: 13px;
  color: var(--text-main);
  line-height: 1.5;
  text-align: left;
  white-space: normal; /* Wrap allowed */
  word-break: break-all;
}

.card-item-sub {
  font-size: 11px;
  color: var(--text-sub);
  text-align: left;
  white-space: normal;
  word-break: break-all;
}

/* ===== Support Skills Grid ===== */
.support-skills-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* ===== Relics Items (With icons and Step colors) ===== */
.relic-item {
  background: var(--card-bg);
  border-left: 3px solid var(--primary);
  border-top: 1px solid var(--border-color);
  border-right: 1px solid var(--border-color);
  border-bottom: 1px solid var(--border-color);
  border-radius: 0 8px 8px 0; /* Less rounded */
  padding: 12px;
  margin-bottom: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.01);
  text-align: left;
}

.relic-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
  flex-wrap: wrap;
  gap: 4px;
}

.relic-title-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.relic-icon {
  width: 24px;
  height: 24px;
  object-fit: contain;
  border-radius: 4px;
}

.relic-name {
  font-size: 14px;
  font-weight: 700;
  white-space: normal;
  word-break: break-all;
}

.relic-badge {
  font-size: 10px;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 4px;
  border: 1px solid;
}

.relic-effect {
  font-size: 13px;
  color: var(--text-main);
  line-height: 1.4;
  white-space: normal;
  word-break: break-all;
}

/* ===== Edible Relics Accordion (Sense of wrapping/encapsulation) ===== */
.edible-relics-accordion {
  border: 1px solid var(--border-color);
  border-radius: 8px;
  overflow: hidden;
  background: var(--card-bg);
}

/* Enclosed background for list contents */
.edible-relics-content {
  background: var(--bg); /* Darker contrast background */
  padding: 12px;
  border-top: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* Clover style filter tabs */
.relics-filter-tabs {
  display: flex;
  gap: 4px;
  background: var(--card-bg);
  padding: 2px;
  border-radius: 6px;
  border: 1px solid var(--border-color);
  margin-bottom: 6px;
  width: fit-content;
  align-self: flex-start;
}

.relics-tab-btn {
  padding: 4px 14px;
  font-size: 11px;
  font-weight: 700;
  border: none;
  background: transparent;
  color: var(--text-sub);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s ease;
}
.relics-tab-btn:hover {
  color: var(--text-main);
}
.relics-tab-btn.active {
  background: var(--bg);
  color: var(--primary);
  box-shadow: 0 1.5px 4px rgba(0,0,0,0.06);
}

/* Scrollable container for relics list packaging */
.edible-relics-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 280px; /* Enclosed height limits scroll */
  overflow-y: auto;
  padding: 12px 10px;
  background: rgba(0, 0, 0, 0.02);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  box-shadow: inset 0 1.5px 4px rgba(0, 0, 0, 0.04);
}

.clover-added-item {
  display: flex;
  align-items: center;
  background: var(--card-bg); /* Cards sit cleanly */
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 8px 10px;
  text-align: left;
  box-shadow: 0 1.5px 3px rgba(0,0,0,0.02);
}

.clover-item-left {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
}

.clover-item-icon {
  width: 28px;
  height: 28px;
  object-fit: contain;
  border-radius: 4px;
  flex-shrink: 0;
}

.clover-item-text {
  flex: 1;
  min-width: 0;
  text-align: left;
}

.clover-item-line1 {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.clover-item-name {
  font-size: 13px;
  font-weight: 700;
  white-space: normal;
  word-break: break-all;
}

.clover-item-source-name {
  font-size: 11px;
  color: var(--text-sub);
  white-space: nowrap;
  margin-left: 8px;
}

.clover-item-line2 {
  font-size: 11px;
  color: var(--text-sub);
  margin-top: 2px;
  white-space: normal;
  word-break: break-all;
  line-height: 1.4;
}

/* ===== Talents Accordion ===== */
.talents-accordion {
  border: 1px solid var(--border-color);
  border-radius: 8px; /* Less rounded */
  overflow: hidden;
  box-shadow: 0 2px 6px rgba(0,0,0,0.02);
}

.accordion-item {
  border-bottom: 1px solid var(--border-color);
}
.accordion-item:last-child {
  border-bottom: none;
}

.accordion-header {
  background: var(--card-bg);
  padding: 12px 14px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  font-size: 13.5px;
  font-weight: 700;
  color: var(--text-main);
  user-select: none;
  transition: background-color 0.2s ease;
}
.accordion-header:hover {
  background: var(--bg);
}

.accordion-arrow {
  width: 14px;
  height: 14px;
  filter: var(--icon-filter);
  transition: transform 0.2s ease;
}
.accordion-arrow.collapsed {
  transform: rotate(180deg);
}

.accordion-content {
  background: var(--bg);
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.talent-item {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 10px;
  text-align: left;
}

.talent-item-name {
  font-size: 13px;
  font-weight: 700;
  margin-bottom: 4px;
  white-space: normal;
  word-break: break-all;
}

.talent-step-label {
  font-size: 11px;
  font-weight: 600;
  margin-left: 2px;
}

.talent-item-effect {
  font-size: 12px;
  color: var(--text-main);
  line-height: 1.4;
  white-space: normal;
  word-break: break-all;
}



/* ===== General Helper Styles ===== */
.no-data {
  grid-column: span 4;
  text-align: center;
  padding: 60px 0;
  color: var(--text-sub);
  font-size: 14px;
}

/* 效果标签筛选 */
.effect-filter-bar {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 10px 12px;
  box-shadow: 0 2px 6px rgba(0,0,0,0.02);
  margin-top: 8px;
  width: 100%;
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

/* ===== Base Attributes tags (copied from EquipView.vue) ===== */
.detail-card-attributes {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 4px;
}

.base-attr-tag {
  display: flex;
  align-items: center;
  gap: 4px;
  background: var(--bg);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 2px 6px;
  font-size: 11px;
  font-weight: 700;
  color: var(--text-main);
}

.attr-mini-icon {
  width: 12px;
  height: 12px;
}

/* ===== Categorized Effect Tags (copied from EquipView.vue) ===== */
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

/* ===== 等级调节器样式 ===== */
.base-attrs-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.base-attrs-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-main);
}

.level-selector-inline {
  display: flex;
  align-items: center;
  gap: 6px;
}

.level-selector-label {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-sub, #64748b);
}

.level-input-wrapper-horizontal {
  display: flex;
  align-items: center;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg);
  padding: 0 4px;
  height: 24px;
}

.level-number-input-horizontal {
  width: 32px;
  border: none;
  background: transparent;
  color: var(--text-main);
  font-size: 12px;
  font-weight: 700;
  text-align: center;
  outline: none;
}
.level-number-input-horizontal::-webkit-outer-spin-button,
.level-number-input-horizontal::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.level-adjust-btn-horizontal {
  font-size: 9px;
  color: var(--text-sub, #64748b);
  cursor: pointer;
  padding: 0 6px;
  user-select: none;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  transition: color 0.15s ease;
}
.level-adjust-btn-horizontal:hover {
  color: var(--primary);
}
</style>

