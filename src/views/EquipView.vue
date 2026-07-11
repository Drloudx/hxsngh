<template>
  <div class="equip-container">
    <div class="equip-sticky-top">
      <!-- 搜索框 -->
      <div class="equip-search-row">
        <div class="equip-search-box">
          <img src="/ui/search.svg" class="search-icon" />
          <input
            type="text"
            v-model="searchQuery"
            placeholder="搜索装备名字、描述、词条..."
            class="equip-search-input"
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

      <!-- 视图模式切换 -->
      <div class="sorting-section">
        <span class="sorting-label">展示效果：</span>
        <div class="sorting-right-group">
          <div class="sorting-group">
            <button
              :class="['sort-btn', { active: viewMode === 'rough' }]"
              @click="switchViewMode('rough')"
            >
              粗略展示
            </button>
            <button
              :class="['sort-btn', { active: viewMode === 'detail' }]"
              @click="switchViewMode('detail')"
            >
              详细展示
            </button>
          </div>
          <button class="filter-toggle-btn" @click="tagsExpanded = !tagsExpanded">
            <span class="filter-toggle-text">筛选</span>
            <img src="/ui/up.svg" class="collapse-icon" :class="{ collapsed: !tagsExpanded }" />
          </button>
        </div>
      </div>

      <!-- 筛选面板 -->
      <div v-show="tagsExpanded" class="filter-panel" style="margin-bottom: 8px;">
        <!-- 稀有度筛选 -->
        <div class="filter-row">
          <span class="filter-label">稀有度</span>
          <div class="filter-options">
            <span
              v-for="opt in stepOptions"
              :key="opt.value"
              :class="['tag', selectedStep === opt.value ? 'active' : '']"
              @click="toggleFilter('step', opt.value)"
            >
              {{ opt.label }}
            </span>
          </div>
        </div>

        <!-- 属性筛选 -->
        <div class="filter-row">
          <span class="filter-label">属性</span>
          <div class="filter-options">
            <span
              v-for="opt in attributeOptions"
              :key="opt.value"
              :class="['tag', selectedAttribute === opt.value ? 'active' : '']"
              @click="toggleFilter('attribute', opt.value)"
            >
              {{ opt.label }}
            </span>
          </div>
        </div>

        <!-- 职业筛选 -->
        <div class="filter-row">
          <span class="filter-label">职业</span>
          <div class="filter-options">
            <span
              v-for="opt in classOptions"
              :key="opt.value"
              :class="['tag', selectedClass === opt.value ? 'active' : '']"
              @click="toggleFilter('class', opt.value)"
            >
              {{ opt.label }}
            </span>
          </div>
        </div>

        <!-- 部位筛选 -->
        <div class="filter-row">
          <span class="filter-label">部位</span>
          <div class="filter-options">
            <span
              v-for="opt in typeOptions"
              :key="opt.value"
              :class="['tag', selectedType === opt.value ? 'active' : '']"
              @click="toggleFilter('type', opt.value)"
            >
              {{ opt.label }}
            </span>
          </div>
        </div>

        <!-- 地图筛选 -->
        <div class="filter-row" style="align-items: flex-start;">
          <div class="filter-collapsible-header" @click="mapExpanded = !mapExpanded" style="width: 55px; flex-shrink: 0; display: flex; align-items: center; gap: 4px; padding-top: 3px;">
            <span class="filter-label" style="width: auto; margin-right: 0;">地图</span>
            <img src="/ui/up.svg" class="collapse-icon" :class="{ collapsed: !mapExpanded }" />
          </div>
          <div v-if="mapExpanded" class="filter-options grid-5-cols">
            <span
              v-for="opt in mapOptions"
              :key="opt.value"
              :class="['tag', selectedMap === opt.value ? 'active' : '']"
              @click="toggleFilter('map', opt.value)"
            >
              {{ opt.label }}
            </span>
          </div>
        </div>

        <!-- 稀有标记筛选 -->
        <div class="filter-row" style="align-items: flex-start; margin-top: 4px;">
          <span class="filter-label" style="width: 55px; flex-shrink: 0; margin-right: 12px;">稀有标记</span>
          <div class="filter-options" style="flex-direction: column; align-items: flex-start; gap: 4px;">
            <label class="rare-toggle-label" style="display: flex; align-items: center; gap: 8px; cursor: pointer; user-select: none;">
              <input type="checkbox" v-model="showRareMark" class="rare-checkbox-input" />
              <span class="rare-toggle-text" style="font-size: 12px; font-weight: 600; color: var(--text-main);">稀有装备显示</span>
            </label>
            <span class="rare-toggle-hint" style="font-size: 11px; color: #ef4444; font-weight: 600;">* 开启后，地图中难出的装备会进行标记</span>
          </div>
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

      <!-- 检索数量统计 -->
      <div class="search-count-bar">
        当前检索装备数量：<span class="count-highlight">{{ filteredEquips.length }}</span>
      </div>
    </div>

    <!-- 列表容器 (无限滚动) -->
    <div class="equip-list-container" ref="listContainer" @scroll="handleScroll">
      <!-- 粗略展示 (5列网格) -->
      <div v-if="viewMode === 'rough'" class="equip-rough-grid">
        <div
          v-for="equip in pagedEquips"
          :key="equip.IDs"
          :class="['equip-rough-card', { 'rare-highlight-card': showRareMark && isRareEquip(equip) }]"
          @click="openDetail(equip)"
        >
          <div
            class="equip-rough-icon-slot"
            :style="{ backgroundColor: getStepConfig(equip.Step).lightBg }"
          >
            <img :src="`/Equip/${equip.IDs}.png`" :alt="equip.Name" class="equip-rough-icon game-sprite" />
          </div>
          <div class="equip-rough-name" :style="{ color: getStepConfig(equip.Step).color }">
            {{ equip.Name }}
          </div>
        </div>
      </div>

      <!-- 详细展示 (4行通栏卡片) -->
      <div v-else class="equip-detail-list">
        <div
          v-for="equip in pagedEquips"
          :key="equip.IDs"
          class="equip-detail-card"
          @click="openDetail(equip)"
        >
          <!-- 第1行: 头像, 名字, 基础属性 (0星) -->
          <div class="detail-row-first">
            <div class="detail-card-left">
              <div
                class="equip-detail-icon-slot"
                :style="{ backgroundColor: getStepConfig(equip.Step).lightBg }"
              >
                <img :src="`/Equip/${equip.IDs}.png`" :alt="equip.Name" class="equip-detail-icon game-sprite" />
              </div>
              <div class="equip-detail-name" :style="{ color: getStepConfig(equip.Step).color }">
                {{ equip.Name }}
                <span v-if="showRareMark && isRareEquip(equip)" class="rare-equip-tag">稀有</span>
              </div>
            </div>
            <!-- 右侧基础属性 -->
            <div class="detail-card-attributes">
              <template v-for="attr in ATTRIBUTE_MAP" :key="attr.key">
                <div v-if="equip[attr.key] > 0" class="base-attr-tag">
                  <img :src="`/General/${attr.icon}`" class="attr-mini-icon game-sprite" />
                  <span>{{ equip[attr.key] }}</span>
                </div>
              </template>
            </div>
          </div>

          <!-- 第2/3/4行: 对应 Pure, Title, Enhance 词条 -->
          <div class="detail-row-bond" v-for="bondKey in ['Pure', 'Title', 'Enhance']" :key="bondKey">
            <template v-if="equip[bondKey]">
              <div class="bond-meta-line">
                <span class="bond-title-text" :style="{ color: getBondColor(equip[bondKey]) }">{{ getBondDisplay(equip[bondKey]) }}</span>
                <span class="bond-type-tag">{{ getBondType(equip[bondKey]) }}</span>
              </div>
              <div class="bond-desc-line">
                {{ getBondDesc(equip[bondKey]) }}
              </div>
            </template>
          </div>
        </div>
      </div>

      <div v-if="pagedEquips.length === 0" class="no-data">
        未找到符合条件的装备
      </div>
    </div>

    <!-- 装备详情弹窗 -->
    <div v-if="detailModal.visible" class="modal-overlay" @click.self="closeDetail">
      <div class="equip-detail-window">
        <!-- 第1部分: 名称居中 -->
        <div class="equip-modal-header">
          <h2 class="centered-modal-title" :style="{ color: getStepConfig(detailModal.data.Step).color }">
            {{ detailModal.data.Name }}
          </h2>
          <button class="relic-modal-close" @click="closeDetail">✕</button>
        </div>

        <div class="equip-modal-body">
          <!-- 头部三栏布局：星级切换（左）、图标（中）、部位职业（右） -->
          <div class="modal-top-row">
            <!-- 左侧星级切换：使用类似tag的小尺寸按钮 -->
            <div class="modal-stars-left">
              <div class="star-row">
                <span
                  v-for="star in [0, 1, 2]"
                  :key="star"
                  :class="['modal-star-tag', { active: selectedStar === star }]"
                  @click="selectedStar = star"
                >
                  {{ star }}星
                </span>
              </div>
              <div class="star-row">
                <span
                  :class="['modal-star-tag', { active: selectedStar === 3 }]"
                  @click="selectedStar = 3"
                >
                  3星
                </span>
                <span
                  :class="['modal-star-tag inherit-tag', { active: selectedInherit }]"
                  :style="{ cursor: detailModal.data.Step === 'SS' ? 'not-allowed' : 'pointer', opacity: detailModal.data.Step === 'SS' ? 0.75 : 1 }"
                  @click="toggleInherit"
                >
                  传承
                </span>
              </div>
            </div>

            <!-- 中间图标 -->
            <div class="modal-icon-center" :style="{ backgroundColor: getStepConfig(detailModal.data.Step).lightBg }">
              <img :src="`/Equip/${detailModal.data.IDs}.png`" class="relic-detail-img game-sprite" />
            </div>

            <!-- 右侧 2x2 网格标签 -->
            <div class="modal-tags-right">
              <!-- 左上 (Slot 1) -->
              <span v-if="modalTags.slot1" class="modal-info-tag class-tag">{{ modalTags.slot1 }}</span>
              <div v-else></div>

              <!-- 右上 (Slot 2) -->
              <span v-if="modalTags.slot2" class="modal-info-tag class-tag">{{ modalTags.slot2 }}</span>
              <div v-else></div>

              <!-- 左下 (Slot 3) -->
              <span v-if="modalTags.slot3" class="modal-info-tag type-tag">{{ modalTags.slot3 }}</span>
              <div v-else></div>

              <!-- 右下 (Slot 4) -->
              <span v-if="modalTags.slot4" class="modal-info-tag class-tag">{{ modalTags.slot4 }}</span>
              <div v-else></div>
            </div>
          </div>

          <!-- 装备描述 Description -->
          <div class="modal-description-row" v-if="detailModal.data.Description">
            {{ detailModal.data.Description }}
          </div>

          <!-- 第3部分: 装备属性 5个格子均分 -->
          <div class="modal-attributes-grid">
            <div
              v-for="i in 5"
              :key="i"
              class="attribute-cell-box"
            >
              <template v-if="getActiveAttributes(detailModal.data)[i - 1]">
                <img
                  :src="`/General/${getActiveAttributes(detailModal.data)[i - 1].icon}`"
                  class="attr-grid-icon game-sprite"
                />
                <span class="attr-grid-val">
                  +{{ getAttrVal(detailModal.data, getActiveAttributes(detailModal.data)[i - 1].key, selectedStar) }}
                </span>
              </template>
            </div>
          </div>

          <!-- 第4部分: 装备词条详细 -->
          <div class="modal-bonds-section">
            <div
              v-for="(bondKey, idx) in ['Pure', 'Title', 'Enhance']"
              :key="bondKey"
              class="bond-detail-item-box"
            >
              <template v-if="detailModal.data[bondKey]">
                <div class="bond-item-header" @click="toggleBondExpand(idx)">
                  <span class="bond-item-name" :style="{ color: getBondColor(detailModal.data[bondKey]) }">
                    {{ getBondNameWithLevel(detailModal.data[bondKey], bondKey) }}
                  </span>
                  <div class="bond-item-header-right">
                    <span class="bond-item-type">[{{ getBondType(detailModal.data[bondKey]) }}]</span>
                    <img
                      src="/ui/up.svg"
                      class="bond-collapse-icon"
                      :class="{ collapsed: !expandedBonds[idx] }"
                    />
                  </div>
                </div>
                <div class="bond-item-basic-desc">
                  {{ getBondDesc(detailModal.data[bondKey]) }}
                </div>

                <!-- 可折叠展开的效果列表 -->
                <div v-show="expandedBonds[idx]" class="bond-expanded-list">
                  <div
                    v-for="(row, rIdx) in getBondRows(detailModal.data[bondKey])"
                    :key="rIdx"
                    :class="['expanded-row', { active: isBondRowActive(detailModal.data[bondKey], bondKey, rIdx) }]"
                  >
                    <span class="row-num">[{{ row.num }}]</span>
                    <span class="row-effect">{{ row.effect }}</span>
                  </div>
                </div>
              </template>
            </div>
          </div>

          <!-- 第5部分: 获取地图 -->
          <div class="modal-source-section">
            <div class="source-header-label">获取地图：</div>
            <div class="source-content-text">{{ detailModal.data.AreaName || '不限' }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import equipData from '@/assets/EquipDataTable.json'
import bondData from '@/assets/BondDataTable.json'
import { getCategoryByTag } from '@/utils/tagCategories'

// 构建词条快速检索 map
const bondMap = new Map()
if (bondData && bondData.DataTable) {
  bondData.DataTable.forEach(b => {
    bondMap.set(b.Name, b)
  })
}

// 属性与图标映射定义
const ATTRIBUTE_MAP = [
  { key: 'STR', name: '力量', icon: 'mid_ico_attribute_0004.png' },
  { key: 'INT', name: '精神', icon: 'mid_ico_attribute_0002.png' },
  { key: 'DEX', name: '敏捷', icon: 'mid_ico_attribute_0005.png' },
  { key: 'CONS', name: '生命', icon: 'mid_ico_attribute_0003.png' },
  { key: 'SPD', name: '速度', icon: 'mid_ico_attribute_0001.png' },
  { key: 'Luck', name: '幸运', icon: 'mid_ico_attribute_0010.png' },
  { key: 'Tough', name: '韧性', icon: 'mid_ico_attribute_0009.png' },
  { key: 'InitialMagic', name: '初始魔力', icon: 'mid_ico_attribute_0006.png' }
]

const attrNameToChinese = {
  STR: '力量',
  INT: '精神',
  DEX: '敏捷',
  CONS: '生命',
  SPD: '速度',
  Luck: '幸运',
  Tough: '韧性',
  InitialMagic: '初始魔力'
}

// 筛选器状态
const searchQuery = ref('')
const showSubSearch = ref(false)
const subSearchQuery = ref('')
const tagsExpanded = ref(false)
const selectedStep = ref('all')
const selectedAttribute = ref('all')
const selectedClass = ref('all')
const selectedType = ref('all')
const selectedMap = ref('all')
const mapExpanded = ref(false)
const selectedFilterTags = ref([])
const effectExpanded = ref(false)
const toggleEffectExpand = () => {
  effectExpanded.value = !effectExpanded.value
}
const showRareMark = ref(localStorage.getItem('showRareMark') !== 'false')
const viewMode = ref('rough')

// 分页懒加载
const displayLimit = ref(viewMode.value === 'rough' ? 40 : 15)

// 详情弹窗状态
const detailModal = ref({ visible: false, data: {} })
const selectedStar = ref(0)
const selectedInherit = ref(false)
const expandedBonds = ref([false, false, false])

const getEquipClasses = (classStr) => {
  if (!classStr) return []
  if (classStr === '全职') return ['通用']
  return classStr.split(/[\s,，]+/).filter(Boolean)
}

const modalTags = computed(() => {
  const equip = detailModal.value.data
  if (!equip) return { slot1: '', slot2: '', slot3: '', slot4: '' }

  const classes = getEquipClasses(equip.Class)
  let s1 = ''
  let s2 = ''
  let s3 = equip.Type || ''
  let s4 = ''

  if (classes.length === 1) {
    s4 = classes[0]
  } else if (classes.length === 2) {
    s4 = classes[0]
    s2 = classes[1]
  } else if (classes.length >= 3) {
    s4 = classes[0]
    s2 = classes[1]
    s1 = classes[2]
  }

  return { slot1: s1, slot2: s2, slot3: s3, slot4: s4 }
})

// 选项配置
const stepOptions = [
  { label: '全部', value: 'all' },
  { label: '普通', value: 'C' },
  { label: '稀有', value: 'B' },
  { label: '史诗', value: 'A' },
  { label: '传说', value: 'S' },
  { label: '神话', value: 'SS' }
]

const attributeOptions = [
  { label: '全部', value: 'all' },
  { label: '力量', value: 'STR' },
  { label: '精神', value: 'INT' },
  { label: '敏捷', value: 'DEX' },
  { label: '生命', value: 'CONS' },
  { label: '速度', value: 'SPD' },
  { label: '幸运', value: 'Luck' },
  { label: '韧性', value: 'Tough' },
  { label: '初始魔力', value: 'InitialMagic' }
]

const classOptions = [
  { label: '全部', value: 'all' },
  { label: '通用', value: '全职' },
  { label: '战士', value: '战士' },
  { label: '射手', value: '射手' },
  { label: '法师', value: '法师' },
  { label: '牧师', value: '牧师' }
]

const typeOptions = [
  { label: '全部', value: 'all' },
  { label: '主手', value: '主手' },
  { label: '副手', value: '副手' },
  { label: '头部', value: '头部' },
  { label: '身体', value: '身体' },
  { label: '护手', value: '护手' },
  { label: '腰带', value: '腰带' },
  { label: '鞋子', value: '鞋子' },
  { label: '徽章', value: '徽章' },
  { label: '项链', value: '项链' },
  { label: '戒指', value: '戒指' }
]

const mapOptions = [
  { label: '全部', value: 'all' },
  { label: '世界', value: '世界' },
  { label: '新生平原', value: '新生平原' },
  { label: '广袤草原', value: '广袤草原' },
  { label: '铁血高地', value: '铁血高地' },
  { label: '迷失森林', value: '迷失森林' },
  { label: '幽暗密林', value: '幽暗密林' },
  { label: '清凉沙滩', value: '清凉沙滩' },
  { label: '遗忘之海', value: '遗忘之海' },
  { label: '废弃矿洞', value: '废弃矿洞' },
  { label: '洞穴深处', value: '洞穴深处' },
  { label: '极寒冰原', value: '极寒冰原' },
  { label: '荒凉戈壁', value: '荒凉戈壁' },
  { label: '无尽荒漠', value: '无尽荒漠' },
  { label: '熔岩通道', value: '熔岩通道' }
]

const getStepConfig = (step) => {
  const map = {
    'SS': { label: 'SS', color: '#f43f5e', lightBg: 'rgba(244, 63, 94, 0.1)' },
    'S': { label: 'S', color: '#f97316', lightBg: 'rgba(249, 115, 22, 0.1)' },
    'A': { label: 'A', color: '#a855f7', lightBg: 'rgba(168, 85, 247, 0.1)' },
    'B': { label: 'B', color: '#60a5fa', lightBg: 'rgba(96, 165, 250, 0.1)' },
    'C': { label: 'C', color: '#16a34a', lightBg: 'rgba(22, 163, 74, 0.1)' }
  }
  return map[step] || { label: step, color: '#64748b', lightBg: 'rgba(100, 116, 139, 0.1)' }
}

const rawEquips = computed(() => {
  return equipData.DataTable || equipData || []
})

const processedEquips = computed(() => {
  return rawEquips.value.map(item => {
    const tags = new Set()
    for (const key of ['Pure', 'Title', 'Enhance']) {
      const val = item[key]
      if (val) {
        const info = parseBondInfo(val)
        if (info) {
          const bObj = bondMap.get(info.name)
          if (bObj && bObj.Tag) {
            bObj.Tag.split(/[\s,，]+/).forEach(t => {
              const clean = t.trim()
              if (clean) tags.add(clean)
            })
          }
        }
      }
    }
    return {
      ...item,
      filterTags: Array.from(tags)
    }
  })
})

// 过滤后的第一层装备列表 (主过滤)
const primaryFilteredEquips = computed(() => {
  return processedEquips.value.filter(item => {
    // 搜索过滤
    const q = searchQuery.value.trim().toLowerCase()
    if (q) {
      const matchName = item.Name && item.Name.toLowerCase().includes(q)
      const matchDesc = item.Description && item.Description.toLowerCase().includes(q)
      const matchTag = item.filterTags && item.filterTags.some(t => t.toLowerCase().includes(q))
      
      let matchBonds = false
      for (const key of ['Pure', 'Title', 'Enhance']) {
        const val = item[key]
        if (val) {
          if (val.toLowerCase().includes(q)) {
            matchBonds = true
            break
          }
          const info = parseBondInfo(val)
          if (info) {
            const bObj = bondMap.get(info.name)
            if (bObj) {
              const matchBondName = bObj.Name && bObj.Name.toLowerCase().includes(q)
              const matchBondBasic = bObj.BasicDescription && bObj.BasicDescription.toLowerCase().includes(q)
              const matchBondEffect = bObj.EffectDescription && bObj.EffectDescription.toLowerCase().includes(q)
              if (matchBondName || matchBondBasic || matchBondEffect) {
                matchBonds = true
                break
              }
            }
          }
        }
      }

      if (!matchName && !matchDesc && !matchBonds && !matchTag) return false
    }

    // 稀有度过滤
    if (selectedStep.value !== 'all' && item.Step !== selectedStep.value) {
      return false
    }

    // 属性过滤
    if (selectedAttribute.value !== 'all') {
      const cnName = attrNameToChinese[selectedAttribute.value]
      const hasBase = item[selectedAttribute.value] > 0
      const hasUpgrade = item.UpgradeAttr && item.UpgradeAttr.includes(cnName)
      if (!hasBase && !hasUpgrade) return false
    }

    // 职业过滤
    if (selectedClass.value !== 'all') {
      if (selectedClass.value === '全职') {
        if (item.Class !== '全职') return false
      } else {
        if (item.Class !== '全职' && !item.Class.includes(selectedClass.value)) return false
      }
    }

    // 部位过滤
    if (selectedType.value !== 'all' && item.Type !== selectedType.value) {
      return false
    }

    // 地图/地区过滤
    if (selectedMap.value !== 'all') {
      if (item.AreaType !== selectedMap.value && item.AreaName !== selectedMap.value) {
        return false
      }
    }

    return true
  })
})

// 效果标签过滤
const tagFilteredEquips = computed(() => {
  const list = primaryFilteredEquips.value
  if (selectedFilterTags.value.length === 0) return list
  return list.filter(item => {
    return selectedFilterTags.value.every(tag => item.filterTags && item.filterTags.includes(tag))
  })
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
  processedEquips.value.forEach(item => {
    if (item.filterTags) {
      item.filterTags.forEach(t => dbTags.add(t))
    }
  })

  dbTags.forEach(t => {
    if (keywords.includes(t.toLowerCase())) {
      tags.add(t)
    }
  })

  filteredEquips.value.forEach(item => {
    if (item.filterTags) {
      item.filterTags.forEach(t => tags.add(t))
    }
  })

  const combinedList = Array.from(tags)

  const getTagGroupRank = (t) => {
    if (selectedFilterTags.value.includes(t)) {
      return 1 // 已选高亮置顶
    }
    return 5 // 数据库普通标签
  }

  // 排序规则：已选中高亮置顶，普通标签按拼音中文排序
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
      // 按展示的字符长度降序排序（长标签排在前面）
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
  displayLimit.value = viewMode.value === 'rough' ? 40 : 15
}

// 二次过滤后的最终装备列表
const getStepWeight = (step) => {
  const weights = { 'SS': 1, 'S': 2, 'A': 3, 'B': 4, 'C': 5 }
  return weights[step] || 99
}

const getMapWeight = (map) => {
  const weights = {
    '世界': 1,
    '新生平原': 2,
    '广袤草原': 3,
    '铁血高地': 4,
    '迷失森林': 5,
    '幽暗密林': 6,
    '清凉沙滩': 7,
    '遗忘之海': 8,
    '废弃矿洞': 9,
    '洞穴深处': 10,
    '极寒冰原': 11,
    '荒凉戈壁': 12,
    '无尽荒漠': 13,
    '熔岩通道': 14
  }
  return weights[map] || 99
}

const filteredEquips = computed(() => {
  const list = tagFilteredEquips.value
  const subQ = subSearchQuery.value.trim().toLowerCase()
  
  let result = list
  if (subQ) {
    result = list.filter(item => {
      const matchName = item.Name && item.Name.toLowerCase().includes(subQ)
      const matchDesc = item.Description && item.Description.toLowerCase().includes(subQ)
      const matchTag = item.filterTags && item.filterTags.some(t => t.toLowerCase().includes(subQ))
      
      let matchBonds = false
      for (const key of ['Pure', 'Title', 'Enhance']) {
        const val = item[key]
        if (val) {
          if (val.toLowerCase().includes(subQ)) {
            matchBonds = true
            break
          }
          const info = parseBondInfo(val)
          if (info) {
            const bObj = bondMap.get(info.name)
            if (bObj) {
              const matchBondName = bObj.Name && bObj.Name.toLowerCase().includes(subQ)
              const matchBondBasic = bObj.BasicDescription && bObj.BasicDescription.toLowerCase().includes(subQ)
              const matchBondEffect = bObj.EffectDescription && bObj.EffectDescription.toLowerCase().includes(subQ)
              if (matchBondName || matchBondBasic || matchBondEffect) {
                matchBonds = true
                break
              }
            }
          }
        }
      }

      return matchName || matchDesc || matchBonds || matchTag
    })
  }

  // 按品质（Step）排序，相同品质的按地图（AreaName）来排
  return [...result].sort((a, b) => {
    const stepA = getStepWeight(a.Step)
    const stepB = getStepWeight(b.Step)
    if (stepA !== stepB) {
      return stepA - stepB // SS(1) < S(2) < A(3) ...
    }
    const mapA = getMapWeight(a.AreaName)
    const mapB = getMapWeight(b.AreaName)
    return mapA - mapB
  })
})

const pagedEquips = computed(() => {
  return filteredEquips.value.slice(0, displayLimit.value)
})

// 无限滚动事件
const handleScroll = (e) => {
  const el = e.target
  if (el.scrollHeight - el.scrollTop - el.clientHeight < 100) {
    if (displayLimit.value < filteredEquips.value.length) {
      displayLimit.value += viewMode.value === 'rough' ? 40 : 15
    }
  }
}

const listContainer = ref(null)

const resetScroll = () => {
  if (listContainer.value) {
    listContainer.value.scrollTop = 0
  }
}

const toggleFilter = (type, value) => {
  displayLimit.value = viewMode.value === 'rough' ? 40 : 15
  if (type === 'step') {
    selectedStep.value = selectedStep.value === value ? 'all' : value
  } else if (type === 'attribute') {
    selectedAttribute.value = selectedAttribute.value === value ? 'all' : value
  } else if (type === 'class') {
    selectedClass.value = selectedClass.value === value ? 'all' : value
  } else if (type === 'type') {
    selectedType.value = selectedType.value === value ? 'all' : value
  } else if (type === 'map') {
    selectedMap.value = selectedMap.value === value ? 'all' : value
  }
  resetScroll()
}

const switchViewMode = (mode) => {
  viewMode.value = mode
  displayLimit.value = mode === 'rough' ? 40 : 15
  resetScroll()
}

watch(searchQuery, () => {
  displayLimit.value = viewMode.value === 'rough' ? 40 : 15
  resetScroll()
  subSearchQuery.value = '' // 主检索变了，清空次筛词
})

watch(subSearchQuery, () => {
  displayLimit.value = viewMode.value === 'rough' ? 40 : 15
  resetScroll()
})

watch(selectedFilterTags, () => {
  displayLimit.value = viewMode.value === 'rough' ? 40 : 15
  resetScroll()
})

watch(showSubSearch, (val) => {
  if (!val) {
    subSearchQuery.value = '' // 折叠时清空
  }
})

watch(showRareMark, (newVal) => {
  localStorage.setItem('showRareMark', newVal.toString())
})

// 词条辅助展示函数
const parseBondInfo = (bondStr) => {
  if (!bondStr) return null
  const m = bondStr.match(/^(.+)\[(\d+)\]$/)
  if (m) {
    return { name: m[1], baseLvl: parseInt(m[2]) }
  }
  return { name: bondStr, baseLvl: 1 }
}

const getBondDisplay = (bondStr) => {
  const info = parseBondInfo(bondStr)
  if (!info) return ''
  return `${info.name}[${info.baseLvl}]`
}

const getBondType = (bondStr) => {
  const info = parseBondInfo(bondStr)
  if (!info) return '基础'
  const bObj = bondMap.get(info.name)
  return bObj ? bObj.Type : '基础'
}

const getBondDesc = (bondStr) => {
  const info = parseBondInfo(bondStr)
  if (!info) return ''
  const bObj = bondMap.get(info.name)
  return bObj ? bObj.BasicDescription : ''
}

const getBondColor = (bondStr) => {
  const info = parseBondInfo(bondStr)
  if (!info) return '#64748b'
  const bObj = bondMap.get(info.name)
  if (!bObj || !bObj.Step) return '#64748b'
  return getStepConfig(bObj.Step).color
}

// 稀有地图装备配置
const rareDropsMap = {
  "世界": ["","","","","","","","",""],
  "新生平原": ["狙击机弩","狙击箭矢","地灵长杖","狙击项链", "地灵法球", "聆风魔弓", "聆风魔矢", "聆风魔靴"],
  "广袤草原": ["火羽披风","火羽腰带","火羽长靴","飞羽护臂","飞羽徽章","飞羽项链"],
  "铁血高地": ["魔王战靴","魔王腰带","魔王头冠","死神徽章","死神腰带","死神兜帽","统帅战靴","统帅战甲","统帅战盔"],
  "迷失森林": ["神树护臂","神树束腰","神树战靴","慈爱头冠","慈爱长袍","慈爱项链","森林圣物","森林王冠","森林之心"],
  "幽暗密林": ["梦魇魔盔","梦魇魔铠","梦魇魔爪","龙魂战盔","龙魂战甲","龙魂之心","恶意纹章","恶意项链","恶意戒指"],
  "清凉沙滩": ["天使羽弓","天使光环","天使羽翼","泰坦战盔","泰坦战甲","泰坦护手","无瑕权杖","无瑕盾牌","无瑕长袍"],
  "遗忘之海": ["流水项链","流水指环","流水徽章","邪神权杖","邪神之冠","邪神束带","","",""],
  "废弃矿洞": ["炼狱宝珠","炼狱手套","炼狱腰带","","","","","",""],
  "洞穴深处": ["维生头罩","维生装甲","维生芯片","","","","","",""],
  "极寒冰原": ["冰蛛披肩","冰蛛手套","冰蛛纹章","冰羽利刃","冰羽斗篷","冰羽神靴","","",""],
  "荒凉戈壁": ["光辉权杖","光辉头环","光辉羽织", "光辉圣徽", "光辉之心", "光辉宝戒", "舞姬面纱","舞姬手环","舞姬束带"],
  "无尽荒漠": ["许愿神灯","许愿项链","许愿戒指","许愿束带","许愿护臂","许愿头环","","",""],
  "熔岩通道": ["熔岩重弩","熔岩重矢","熔岩戒指","烈火魔杖","烈火宝珠","烈火长袍","","",""]
}

const isRareEquip = (equip) => {
  if (!equip || !equip.Name || !equip.AreaName) return false
  const list = rareDropsMap[equip.AreaName]
  return list ? list.includes(equip.Name) : false
}

// 详情词条名动态获取
const getBondNameWithLevel = (bondStr, bondKey) => {
  const info = parseBondInfo(bondStr)
  if (!info) return ''
  let currentLvl = info.baseLvl
  // 1星: Pure+1
  if (bondKey === 'Pure' && selectedStar.value >= 1) currentLvl += 1
  // 2星: Title+1
  if (bondKey === 'Title' && selectedStar.value >= 2) currentLvl += 1
  // 3星: Enhance+1
  if (bondKey === 'Enhance' && selectedStar.value >= 3) currentLvl += 1

  // 传承加成
  if (selectedInherit.value) {
    currentLvl += 1
  }

  return `${info.name}[${currentLvl}]`
}

// 获取某一词条的全部层级展开行
const getBondRows = (bondStr) => {
  const info = parseBondInfo(bondStr)
  if (!info) return []
  const bObj = bondMap.get(info.name)
  if (!bObj || !bObj.BondNum) return []

  const nums = bObj.BondNum.split(',')
  const val1 = bObj.Value1 ? bObj.Value1.split(',') : []
  const val2 = bObj.Value2 ? bObj.Value2.split(',') : []
  const val3 = bObj.Value3 ? bObj.Value3.split(',') : []
  const desc = bObj.EffectDescription || bObj.BasicDescription || ''

  return nums.map((num, idx) => {
    let formatted = desc
    formatted = formatted.replace('{0}', val1[idx] !== undefined ? val1[idx] : '')
    formatted = formatted.replace('{1}', val2[idx] !== undefined ? val2[idx] : '')
    formatted = formatted.replace('{2}', val3[idx] !== undefined ? val3[idx] : '')
    return { num, effect: formatted }
  })
}

// 判定词条某行是否为当前激活的等级行
const isBondRowActive = (bondStr, bondKey, rIdx) => {
  const info = parseBondInfo(bondStr)
  if (!info) return false
  let currentLvl = info.baseLvl
  if (bondKey === 'Pure' && selectedStar.value >= 1) currentLvl += 1
  if (bondKey === 'Title' && selectedStar.value >= 2) currentLvl += 1
  if (bondKey === 'Enhance' && selectedStar.value >= 3) currentLvl += 1
  if (selectedInherit.value) currentLvl += 1

  const bObj = bondMap.get(info.name)
  if (!bObj || !bObj.BondNum) return false
  const nums = bObj.BondNum.split(',').map(Number)

  let activeIdx = -1
  for (let i = 0; i < nums.length; i++) {
    if (nums[i] <= currentLvl) {
      activeIdx = i
    }
  }
  return rIdx === activeIdx
}

// 弹窗中提取装备所有属性 (STR, INT, DEX, CONS, SPD, Luck, Tough, InitialMagic)
const getActiveAttributes = (item) => {
  if (!item) return []
  // 找出所有基础值 > 0 或在升级列表里的属性
  const active = []
  const upAttrs = item.UpgradeAttr ? item.UpgradeAttr.split(/[\s,，]+/).filter(Boolean) : []

  ATTRIBUTE_MAP.forEach(attr => {
    const base = item[attr.key] > 0
    const inUp = upAttrs.includes(attrNameToChinese[attr.key])
    if (base || inUp) {
      active.push(attr)
    }
  })
  return active
}

// 计算升星属性数值逻辑
const getAttrVal = (item, attrName, star) => {
  const baseVal = item[attrName] !== undefined ? item[attrName] : 0
  if (!item.UpgradeAttr) return baseVal

  const attrs = item.UpgradeAttr.split(/[\s,，]+/).filter(Boolean)
  const idx = attrs.indexOf(attrNameToChinese[attrName])
  // 仅 UpgradeAttr 中的前3条属性随星级增长
  if (idx < 0 || idx > 2) return baseVal

  const step = item.Step || 'B'
  let increment = 0

  if (step === 'B' || step === 'C') {
    // 0->1星: A+1, B+0, C+0
    // 1->2星: A+0, B+1, C+0
    // 2->3星: A+0, B+0, C+1
    if (star === 1) {
      if (idx === 0) increment = 1
    } else if (star === 2) {
      if (idx === 0 || idx === 1) increment = 1
    } else if (star >= 3) {
      increment = 1
    }
  } else if (step === 'A') {
    // 0->1星: A+1, B+1, C+0
    // 1->2星: A+0, B+1, C+1
    // 2->3星: A+1, B+0, C+1
    if (star === 1) {
      if (idx === 0 || idx === 1) increment = 1
    } else if (star === 2) {
      if (idx === 0) increment = 1
      if (idx === 1) increment = 2
      if (idx === 2) increment = 1
    } else if (star >= 3) {
      increment = 2
    }
  } else if (step === 'S') {
    // 0->1星: A+2, B+1, C+1
    // 1->2星: A+1, B+2, C+1
    // 2->3星: A+1, B+1, C+2
    if (star === 1) {
      if (idx === 0) increment = 2
      if (idx === 1 || idx === 2) increment = 1
    } else if (star === 2) {
      if (idx === 0 || idx === 1) increment = 3
      if (idx === 2) increment = 2
    } else if (star >= 3) {
      increment = 4
    }
  } else if (step === 'SS') {
    // 0->1星: A+3, B+3, C+2
    // 1->2星: A+3, B+2, C+3
    // 2->3星: A+2, B+3, C+3
    if (star === 1) {
      if (idx === 0 || idx === 1) increment = 3
      if (idx === 2) increment = 2
    } else if (star === 2) {
      if (idx === 0) increment = 6
      if (idx === 1 || idx === 2) increment = 5
    } else if (star >= 3) {
      increment = 8
    }
  }

  return baseVal + increment
}

// 弹窗交互
const openDetail = (equip) => {
  selectedStar.value = 0
  selectedInherit.value = equip.Step === 'SS'
  expandedBonds.value = [false, false, false]
  detailModal.value = { visible: true, data: equip }
}

const toggleInherit = () => {
  if (detailModal.value.data.Step === 'SS') return
  selectedInherit.value = !selectedInherit.value
}

const closeDetail = () => {
  detailModal.value = { visible: false, data: {} }
}

const toggleBondExpand = (idx) => {
  expandedBonds.value[idx] = !expandedBonds.value[idx]
}
</script>

<style scoped>
/* ===== 容器基准 ===== */
.equip-container {
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

.equip-sticky-top {
  flex-shrink: 0;
  background: var(--bg);
  padding-bottom: 10px;
}

/* ===== 搜索栏与折叠面板 ===== */
.equip-search-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.equip-search-box {
  display: flex;
  align-items: center;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 10px 10px;
  flex: 1;
  box-shadow: inset 0 1px 4px rgba(0, 0, 0, 0.06);
  transition: border-color 0.2s ease;
  min-width: 0;
}

.equip-search-box:focus-within {
  border-color: #409eff;
}

.search-icon {
  width: 18px;
  height: 18px;
  filter: var(--icon-filter);
  margin-right: 10px;
  opacity: 0.7;
  flex-shrink: 0;
}

.equip-search-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 13px;
  color: var(--text-main);
  font-family: inherit;
  min-width: 0;
}

.filter-toggle-btn, .sub-filter-btn {
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
.filter-toggle-btn:hover, .sub-filter-btn:hover {
  border-color: var(--primary);
  color: var(--primary) !important;
}
.sub-filter-btn.active {
  border-color: var(--primary);
  color: var(--primary) !important;
}

.sorting-right-group .filter-toggle-btn {
  height: 32px;
  padding: 4px 10px;
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

.sorting-right-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 过渡动画 */
.slide-fade-enter-active, .slide-fade-leave-active {
  transition: all 0.2s ease;
}
.slide-fade-enter-from, .slide-fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.filter-toggle-text {
  font-size: 12px;
  font-weight: 600 !important;
  color: var(--text-main) !important;
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

/* 筛选面板 */
.filter-panel {
  margin-top: 10px;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 12px 14px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  gap: 10px;
  animation: slideDown 0.2s ease-out;
}

@keyframes slideDown {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

.filter-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.filter-collapsible-header {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  user-select: none;
}

.grid-5-cols {
  display: grid !important;
  grid-template-columns: repeat(5, 1fr) !important;
  gap: 6px !important;
  flex: 1;
  min-width: 0;
}

.grid-5-cols .tag {
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 3px 0 !important;
}

@media (max-width: 600px) {
  .grid-5-cols {
    grid-template-columns: repeat(3, 1fr) !important;
  }
}

.filter-label {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-sub);
  width: 55px;
  flex-shrink: 0;
}

.filter-options {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  flex: 1;
}

.tag {
  padding: 3px 8px;
  background: var(--bg);
  border-radius: 4px;
  cursor: pointer;
  font-size: 11px;
  border: 1px solid var(--border-color);
  color: var(--text-main);
  transition: all 0.15s ease;
  user-select: none;
}
@media (hover: hover) {
  .tag:hover {
    border-color: var(--primary);
    color: var(--primary);
  }
}
.tag.active {
  background: #dbeafe;
  color: var(--primary);
  border-color: var(--primary);
}
.dark-mode .tag.active {
  background: rgba(59, 130, 246, 0.2);
}

/* 排序控制栏 */
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

/* ===== 滚动容器 ===== */
.equip-list-container {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow-y: auto;
  padding-bottom: 20px;
}

/* ===== 粗略展示 (5列网格) ===== */
.equip-rough-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  grid-auto-rows: min-content;
  align-content: start;
  gap: 14px 10px;
  width: 100%;
}

.equip-rough-card {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
  cursor: pointer;
  min-width: 0;
  box-sizing: border-box;
}
.equip-rough-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
  border-color: var(--primary);
}

.equip-rough-icon-slot {
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10%;
  box-sizing: border-box;
}

.equip-rough-icon {
  width: 90%;
  height: 90%;
  object-fit: contain;
}

.equip-rough-name {
  font-size: 11.5px;
  font-weight: 700;
  margin-top: 6px;
  text-align: center;
  width: 100%;
  white-space: normal;
  word-break: break-all;
  line-height: 1.2;
}

/* ===== 详细展示 (4行卡片) ===== */
.equip-detail-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
}

.equip-detail-card {
  background: var(--card-bg);
  border: 1px solid #cbd5e1;
  border-radius: 14px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  cursor: pointer;
  box-sizing: border-box;
}
.dark-mode .equip-detail-card {
  border: 1px solid var(--border-color);
}
.equip-detail-card:hover {
  border-color: var(--primary);
  box-shadow: 0 4px 12px rgba(0,0,0,0.06);
}

/* 第1行*/
.detail-row-first {
  display: flex;
  align-items: center;
  justify-content: space-between;
  /*border-bottom: 1px dashed #94a3b8; */
  padding-bottom: 6px;
  margin-bottom: 2px;
}
.dark-mode .detail-row-first {
  border-bottom: 1px dashed var(--border-color);
}

.detail-card-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.equip-detail-icon-slot {
  width: 35px;
  height: 35px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border: 1px solid var(--border-color);
  background: rgba(100, 116, 139, 0.05);
}

.equip-detail-icon {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.equip-detail-name {
  font-size: 14px;
  font-weight: 800;
}

.detail-card-attributes {
  display: flex;
  gap: 6px;
}

.base-attr-tag {
  display: flex;
  align-items: center;
  gap: 3px;
  background: var(--bg);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 2px 5px;
  font-size: 11px;
  font-weight: 700;
  color: var(--text-main);
}

.attr-mini-icon {
  width: 12px;
  height: 12px;
}

/* 词条行 */
.detail-row-bond {
  background: var(--bg);
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 6px 10px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.dark-mode .detail-row-bond {
  border: 1px solid var(--border-color);
}

.bond-meta-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.bond-title-text {
  font-size: 13px;
  font-weight: 600;
  color: var(--primary);
}

.bond-type-tag {
  font-size: 10px;
  font-weight: 700;
  color: var(--text-sub);
  background: var(--border-color);
  padding: 1px 4px;
  border-radius: 4px;
}

.bond-desc-line {
  font-size: 13px;
  color: var(--text-main);
  line-height: 1.4;
}

/* ===== 模态弹窗 (DungeonRelic风格) ===== */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(15, 23, 42, 0.4);
  backdrop-filter: blur(16px) saturate(120%);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.equip-detail-window {
  background: var(--card-bg);
  width: 90%;
  max-width: 360px;
  border-radius: 20px;
  box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.12);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--border-color);
}

.equip-modal-header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
  min-height: 24px;
}

.centered-modal-title {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  margin: 0;
  font-size: 18px;
  font-weight: 800;
  text-align: center;
  pointer-events: none;
  z-index: 1;
}

.relic-modal-close {
  position: absolute;
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  font-size: 18px;
  color: #94a3b8;
  cursor: pointer;
  transition: color 0.15s;
  z-index: 2;
}
.relic-modal-close:hover {
  color: #ef4444;
}

.equip-modal-body {
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  max-height: 75vh;
  overflow-y: auto;
}

/* 头部三栏布局 */
.modal-top-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: 10px;
  background: var(--bg);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 10px;
  box-sizing: border-box;
}

/* 左侧星级切换 */
.modal-stars-left {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 96px;
  flex-shrink: 0;
}

.star-row {
  display: flex;
  gap: 4px;
}

.modal-star-tag {
  flex: 1;
  padding: 3px 0;
  font-size: 11px;
  font-weight: 700;
  text-align: center;
  color: var(--text-sub);
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  cursor: pointer;
  user-select: none;
  transition: all 0.15s ease;
  white-space: nowrap;
}
@media (hover: hover) {
  .modal-star-tag:hover {
    color: var(--text-main);
    border-color: #94a3b8;
  }
}
.modal-star-tag.active {
  background: #dbeafe;
  color: var(--primary);
  border-color: var(--primary);
}
.modal-star-tag.inherit-tag.active {
  background: #dcfce7;
  color: #16a34a;
  border-color: #16a34a;
}

/* 中间图标 */
.modal-icon-center {
  width: 72px;
  height: 72px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px;
  box-sizing: border-box;
  flex-shrink: 0;
  border: 1px solid var(--border-color);
}

.relic-detail-img {
  width: 90%;
  height: 90%;
  object-fit: contain;
}

/* 右侧标签 - 2x2 网格 */
.modal-tags-right {
  display: grid;
  grid-template-columns: repeat(2, 46px);
  grid-template-rows: repeat(2, 22px);
  gap: 6px 6px;
  width: 98px;
  flex-shrink: 0;
}

.modal-info-tag {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  font-size: 10.5px;
  font-weight: 700;
  border-radius: 6px;
  white-space: nowrap;
  box-sizing: border-box;
}
.modal-info-tag.type-tag {
  background: rgba(100, 116, 139, 0.08);
  color: #64748b;
  border: 1px solid rgba(100, 116, 139, 0.15);
}
.modal-info-tag.class-tag {
  background: rgba(59, 130, 246, 0.08);
  color: #3b82f6;
  border: 1px solid rgba(59, 130, 246, 0.15);
}

/* 属性5个格子均分 */
.modal-attributes-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 6px;
  width: 100%;
}

.modal-description-row {
  font-size: 11.5px;
  color: #000000;
  background: var(--bg);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 8px 12px;
  line-height: 1.4;
  text-align: center;
  margin-bottom: 2px;
}
.dark-mode .modal-description-row {
  color: #ffffff;
}

.attribute-cell-box {
  background: var(--bg);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  height: 32px;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 4px;
  box-sizing: border-box;
  padding: 0 4px;
}

.attr-grid-icon {
  width: 13px;
  height: 13px;
  flex-shrink: 0;
}

.attr-grid-val {
  font-size: 11px;
  font-weight: 800;
  color: var(--text-main);
}

/* 词条详细部分 */
.modal-bonds-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
}

.bond-detail-item-box {
  background: var(--bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.bond-item-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  padding-bottom: 2px;
}

.bond-item-name {
  font-size: 13.5px;
  font-weight: 800;
  color: #000000;
}
.dark-mode .bond-item-name {
  color: #ffffff;
}

.bond-item-type {
  font-size: 11px;
  color: var(--text-sub);
  font-weight: 600;
}

.bond-item-basic-desc {
  font-size: 13px;
  color: #000000;
  line-height: 1.4;
}
.dark-mode .bond-item-basic-desc {
  color: #ffffff;
}

.bond-item-header-right {
  display: flex;
  align-items: center;
  gap: 6px;
}

.bond-collapse-icon {
  width: 10px;
  height: 10px;
  filter: var(--icon-filter);
  transition: transform 0.25s ease;
}
.bond-collapse-icon.collapsed {
  transform: rotate(180deg);
}

/* 可折叠展开列表 */
.bond-expanded-list {
  margin-top: 6px;
  border-top: 1px dashed #cbd5e1;
  padding-top: 4px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.dark-mode .bond-expanded-list {
  border-top: 1px dashed var(--border-color);
}

.expanded-row {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  padding: 6px;
  border-bottom: 1px dashed #cbd5e1;
  font-size: 13px;
  line-height: 1.4;
  color: #000000;
  transition: all 0.15s;
}
.expanded-row:last-child {
  border-bottom: none;
}
.dark-mode .expanded-row {
  color: #ffffff;
  border-bottom: 1px dashed var(--border-color);
}
.expanded-row.active {
  background: rgba(59, 130, 246, 0.08);
  color: var(--primary);
  font-weight: 700;
  border: 1px solid rgba(59, 130, 246, 0.12);
}

.row-num {
  font-weight: 700;
  flex-shrink: 0;
}

.row-effect {
  flex: 1;
}

/* 获取地图 */
.modal-source-section {
  display: flex;
  align-items: center;
  background: var(--bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 8px 12px;
  font-size: 12.5px;
  width: 100%;
  box-sizing: border-box;
}

.source-header-label {
  font-weight: 800;
  color: var(--text-sub);
  flex-shrink: 0;
}

.source-content-text {
  color: var(--text-main);
  font-weight: 700;
}

/* 通用无数据 */
.no-data {
  text-align: center;
  padding: 40px;
  color: var(--text-sub);
  font-size: 14px;
}

/* ===== 像素风格强化 ===== */
.game-sprite {
  image-rendering: pixelated;
  image-rendering: -moz-crisp-edges;
  image-rendering: crisp-edges;
}

/* 稀有装备标记样式 */
.equip-rough-card.rare-highlight-card {
  border: 1px solid #f43f5e !important;
}

.rare-equip-tag {
  padding: 2px 6px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
  color: #f43f5e;
  background: rgba(244, 63, 94, 0.08);
  border: 1px solid rgba(244, 63, 94, 0.15);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-left: 6px;
  line-height: 1;
}
.dark-mode .rare-equip-tag {
  color: #fb7185;
  background: rgba(251, 113, 133, 0.15);
  border: 1px solid rgba(251, 113, 133, 0.25);
}

.rare-checkbox-input {
  width: 14px;
  height: 14px;
  cursor: pointer;
  accent-color: #f43f5e;
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

@media (min-width: 601px) {
  /* 弹窗整体拉大 */
  .equip-detail-window {
    max-width: 480px !important;
  }

  /* 标题与关闭按钮字号加大 */
  .centered-modal-title {
    font-size: 22px !important;
  }
  .relic-modal-close {
    font-size: 22px !important;
  }

  /* 顶部三栏排布与内容放大 */
  .modal-top-row {
    justify-content: space-between !important;
    gap: 12px !important;
    padding: 14px !important;
  }
  .modal-stars-left {
    width: 110px !important;
    gap: 8px !important;
  }
  .modal-star-tag {
    padding: 5px 0 !important;
    font-size: 13px !important;
  }
  
  /* 中间的图变得更大 */
  .modal-icon-center {
    width: 104px !important;
    height: 104px !important;
    border-radius: 16px !important;
    padding: 8px !important;
  }
  
  .modal-tags-right {
    width: 122px !important;
    grid-template-columns: repeat(2, 58px) !important;
    grid-template-rows: repeat(2, 28px) !important;
    gap: 8px !important;
  }
  .modal-info-tag {
    font-size: 13px !important;
    border-radius: 8px !important;
  }

  /* 描述行与属性行字号及内边距放大 */
  .modal-description-row {
    font-size: 14px !important;
    padding: 12px 16px !important;
    border-radius: 12px !important;
  }
  .attribute-cell-box {
    height: 38px !important;
    border-radius: 10px !important;
    gap: 6px !important;
  }
  .attr-grid-icon {
    width: 16px !important;
    height: 16px !important;
  }
  .attr-grid-val {
    font-size: 13px !important;
  }

  /* 词条详细与来源部分字号及内边距放大 */
  .bond-detail-item-box {
    padding: 12px 16px !important;
    border-radius: 14px !important;
    gap: 4px !important;
  }
  .bond-item-name {
    font-size: 16px !important;
  }
  .bond-item-type {
    font-size: 13px !important;
  }
  .bond-item-basic-desc {
    font-size: 15px !important;
    line-height: 1.5 !important;
  }
  .expanded-row {
    font-size: 15px !important;
    padding: 8px 10px !important;
    line-height: 1.5 !important;
  }
  .bond-collapse-icon {
    width: 12px !important;
    height: 12px !important;
  }
  .modal-source-section {
    padding: 12px 16px !important;
    font-size: 15px !important;
    border-radius: 14px !important;
  }
}

/* 分类标签样式 */
.categorized-effect-tags {
  max-height: 480px;
  overflow-y: auto;
  padding-right: 4px;
}
/* 自定义滚动条样式 */
.categorized-effect-tags::-webkit-scrollbar {
  width: 4px;
}
.categorized-effect-tags::-webkit-scrollbar-thumb {
  background: var(--border-color, #e2e8f0);
  border-radius: 2px;
}
.categorized-effect-tags::-webkit-scrollbar-track {
  background: transparent;
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
