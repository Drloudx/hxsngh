<template>
  <div class="equip-prob-container">
    <div class="equip-prob-sticky-top">
      <!-- 1. 搜索栏与筛选展开按钮（完全对齐符文图鉴样式，无次筛） -->
      <div class="talent-search-row">
        <div class="talent-search-box">
          <img src="/ui/search.svg" class="search-icon" />
          <input
            type="text"
            v-model="searchQuery"
            placeholder="搜索装备名、词条、地图..."
            class="talent-search-input"
          />
          <button v-if="searchQuery" class="clear-search-btn" @click="searchQuery = ''">✕</button>
        </div>

        <button class="filter-toggle-btn" :class="{ active: tagsExpanded }" @click="tagsExpanded = !tagsExpanded">
          <span class="filter-toggle-text">筛选</span>
          <img src="/ui/up.svg" class="collapse-icon" :class="{ collapsed: !tagsExpanded }" />
        </button>
      </div>

      <!-- 2. 筛选面板（完全对齐符文图鉴样式，地图常驻展开，无职业/部位筛选） -->
      <Transition name="slide-fade">
        <div v-show="tagsExpanded" class="filter-panel">
          <!-- 1. 评估基准（按装备自身爆率 / 按地图自身爆率） -->
          <div class="filter-row">
            <span class="filter-label">基准：</span>
            <div class="filter-options">
              <button
                class="filter-btn mode-btn"
                :class="{ active: evalMode === 'absolute' }"
                @click="evalMode = 'absolute'"
              >
                按装备自身爆率
              </button>
              <button
                class="filter-btn mode-btn"
                :class="{ active: evalMode === 'relative' }"
                @click="evalMode = 'relative'"
              >
                按地图自身爆率
              </button>
            </div>
          </div>

          <!-- 2. 地图筛选（常驻展开） -->
          <div class="filter-row">
            <span class="filter-label">地图：</span>
            <div class="filter-options">
              <button
                class="filter-btn"
                :class="{ active: selectedMap === 'all' }"
                @click="selectedMap = 'all'"
              >
                全部
              </button>
              <button
                v-for="map in mapList"
                :key="map.name"
                class="filter-btn"
                :class="{ active: selectedMap === map.name }"
                @click="selectedMap = map.name"
              >
                {{ map.name }}
              </button>
            </div>
          </div>

          <!-- 3. 难度 5 档筛选 -->
          <div class="filter-row">
            <span class="filter-label">难度：</span>
            <div class="filter-options">
              <button
                class="filter-btn"
                :class="{ active: selectedDifficulty === 'all' }"
                @click="selectedDifficulty = 'all'"
              >
                全部
              </button>
              <button
                v-for="opt in currentDifficultyOptions"
                :key="opt.value"
                class="filter-btn diff-btn"
                :class="[`diff-btn-${opt.value}`, { active: selectedDifficulty === opt.value }]"
                @click="selectedDifficulty = opt.value"
              >
                {{ opt.label }}
              </button>
            </div>
          </div>
        </div>
      </Transition>

      <!-- 机制说明提示条 -->
      <div class="rule-hint-bar" @click="ruleExpanded = !ruleExpanded">
        <div class="rule-hint-left">
          <span class="rule-badge">掉落机制说明</span>
        </div>
        <span class="rule-toggle-text">{{ ruleExpanded ? '收起' : '查看说明' }}</span>
      </div>

      <Transition name="slide-fade">
        <div v-show="ruleExpanded" class="rule-expand-content">
          <p><strong>1. 攻略参考：</strong>该页面参考 <span class="author-name">山酒</span> 的原帖 <a href="https://www.taptap.cn/moment/835292743587595327?share_id=b422d9a5d15a&utm_medium=share&utm_source=mobile_qq" target="_blank" class="guide-link">【攻略】（更新枯木丛林）全图金装刷取难易度说明及其一图流</a>。</p>
          <p><strong>2. 掉落两层判定：</strong>战斗事件首先决定出场的怪物阵容，随后由出场怪物的<strong>对应职业</strong>抽取装备池（全职业通用装备除外）。</p>
          <p><strong>3. 职业断层现象：</strong>若某地图的本地战斗怪物中<strong>完全缺失某职业</strong>，该职业的专属金装将极难掉落，只能依赖极小概率的世界事件跨图产出（极难）。</p>
          <p><strong>4. 5 档分级标准：</strong>
            <span v-if="evalMode === 'absolute'">
              🟩 较易（≥0.10%）｜ 🟦 一般（0.05%~0.10%）｜ 🟪 较难（0.025%~0.05%）｜ 🟧 困难（0.01%~0.025%）｜ 🟥 极难（&lt;0.01%）
            </span>
            <span v-else>
              🟩 较易（前15%）｜ 🟦 一般（15%~35%）｜ 🟪 较难（35%~65%）｜ 🟧 困难（65%~85%）｜ 🟥 极难（后15% / 红装）
            </span>
          </p>
        </div>
      </Transition>

      <!-- 检索统计与图例栏 -->
      <div class="search-count-bar">
        <div>当前装备数量：<span class="count-highlight">{{ totalEquipCount }}</span></div>
        <div class="legend-quick-group">
          <span class="legend-pill pill-very_easy"><span class="legend-indicator"></span> {{ evalMode === 'absolute' ? '较易(≥0.10%)' : '较易(前15%)' }}</span>
          <span class="legend-pill pill-normal"><span class="legend-indicator"></span> {{ evalMode === 'absolute' ? '一般(0.05~0.10%)' : '一般(15%~35%)' }}</span>
          <span class="legend-pill pill-rather_hard"><span class="legend-indicator"></span> {{ evalMode === 'absolute' ? '较难(0.025~0.05%)' : '较难(35%~65%)' }}</span>
          <span class="legend-pill pill-hard"><span class="legend-indicator"></span> {{ evalMode === 'absolute' ? '困难(0.01~0.025%)' : '困难(65%~85%)' }}</span>
          <span class="legend-pill pill-very_hard"><span class="legend-indicator"></span> {{ evalMode === 'absolute' ? '极难(<0.01%)' : '极难(后15%)' }}</span>
        </div>
      </div>
    </div>

    <!-- 3. 装备列表（按地图清晰分块展示，一行 7 个） -->
    <div class="equip-list-container" ref="listContainer">
      <div
        v-for="group in displayedMapGroups"
        :key="group.name"
        class="map-group-section"
      >
        <!-- 地图分块标题栏 -->
        <div class="map-group-header">
          <div class="map-group-left">
            <span class="map-group-title">{{ group.name }}</span>
            <span class="map-level-badge">Lv.{{ group.maxLevel }}</span>
          </div>
          <span class="map-group-count">{{ group.equips.length }} 件装备</span>
        </div>

        <!-- 7 列装备矩阵网格 -->
        <div class="equip-rough-grid-7">
          <div
            v-for="equip in group.equips"
            :key="equip.id || equip.IDs"
            class="equip-rough-card"
            @click="openDetail(equip)"
          >
            <!-- 图标槽位：背景色与外边框按难度着色，保留右下角难度标签 -->
            <div
              class="equip-rough-icon-slot"
              :class="`diff-slot-${equip.difficulty}`"
              :style="{ backgroundColor: getDifficultyConfig(equip.difficulty).lightBg }"
            >
              <img :src="`/Equip/${equip.id || equip.IDs}.png`" :alt="equip.name || equip.Name" class="equip-rough-icon game-sprite" />
              <!-- 难度小角标 (一般/极难/难/易) -->
              <span class="rough-diff-badge" :class="`badge-${equip.difficulty}`">
                {{ equip.difficultyName }}
              </span>
            </div>
            <!-- 装备名称：按难度主题色显示 -->
            <div class="equip-rough-name" :style="{ color: getDifficultyConfig(equip.difficulty).color }">
              {{ equip.name || equip.Name }}
            </div>
          </div>
        </div>
      </div>

      <div v-if="displayedMapGroups.length === 0" class="no-data">
        未找到符合条件的装备
      </div>
    </div>

    <!-- 4. 装备详情弹窗 -->
    <div v-if="detailModal.visible" class="modal-overlay" @click.self="closeDetail">
      <div class="equip-detail-window">
        <!-- 弹窗头部 -->
        <div class="equip-modal-header">
          <h2 class="centered-modal-title" :style="{ color: getDifficultyConfig(detailModal.data.difficulty).color }">
            {{ detailModal.data.name || detailModal.data.Name }}
          </h2>
          <button class="relic-modal-close" @click="closeDetail">✕</button>
        </div>

        <div class="equip-modal-body">
          <!-- 头部展示：居中图标 + 标签 -->
          <div class="modal-top-simple">
            <div
              class="modal-icon-box"
              :class="`diff-slot-${detailModal.data.difficulty}`"
              :style="{ backgroundColor: getDifficultyConfig(detailModal.data.difficulty).lightBg }"
            >
              <img
                :src="`/Equip/${detailModal.data.id || detailModal.data.IDs}.png`"
                :alt="detailModal.data.name || detailModal.data.Name"
                class="modal-equip-img game-sprite"
              />
            </div>

            <div class="modal-simple-tags">
              <span class="modal-info-pill tag-area">{{ detailModal.data.areaName || detailModal.data.AreaName }}</span>
              <span class="modal-info-pill tag-class">{{ detailModal.data.class || detailModal.data.Class || '全职' }}</span>
              <span class="modal-info-pill tag-type">{{ detailModal.data.type || detailModal.data.Type }}</span>
            </div>
          </div>

          <!-- 掉落难易度与单场概率 -->
          <div class="modal-prob-card">
            <div class="prob-card-header">
              <span class="prob-card-title">刷取难易度评估</span>
              <span
                class="prob-diff-badge"
                :class="`pill-${detailModal.data.difficulty}`"
                @click="showExactProb = !showExactProb"
                style="cursor: pointer;"
                :title="showExactProb ? '点击隐藏具体概率与场次' : '点击查看精确概率与场次'"
              >
                {{ getModalProbBadgeText(detailModal.data) }}
              </span>
            </div>
            <div class="prob-card-reason">
              <strong>掉落解析：</strong>{{ getModalReasonText(detailModal.data) }}
            </div>
            <div v-if="detailModal.data.dropRoles && detailModal.data.dropRoles.length" class="prob-meta-row">
              <span class="prob-meta-label">出场怪物：</span>
              <div class="prob-chips-wrap">
                <span v-for="r in detailModal.data.dropRoles" :key="r" class="prob-chip">
                  {{ r }}
                </span>
              </div>
            </div>
            <div v-if="detailModal.data.dropEvents && detailModal.data.dropEvents.length" class="prob-meta-row">
              <span class="prob-meta-label">关联事件：</span>
              <div class="prob-chips-wrap">
                <span v-for="ev in detailModal.data.dropEvents" :key="ev" class="prob-chip chip-event">
                  {{ ev }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 置顶组件 -->
    <BackToTop />
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import BackToTop from '@/components/BackToTop.vue'

import rawEquips from '@/assets/Equip.json'
import rawBattleEvents from '@/assets/Battle_Event.json'
import rawRoles from '@/assets/Role.json'
import simulationResults from '@/assets/simulation_exact_results.json'

// 角色映射
const roleMap = new Map()
rawRoles.forEach(r => {
  if (r && r.IDs) roleMap.set(r.IDs, r)
})

// 装备在游戏原表中的顺序与基础信息映射
const equipOrderMap = new Map()
const equipDataMap = new Map()
rawEquips.forEach((eq, index) => {
  if (eq && eq.IDs) {
    equipOrderMap.set(eq.IDs, index)
    equipDataMap.set(eq.IDs, eq)
  }
})

// 地图最高等级映射
const maxLevels = {
  '新生平原': 100,
  '广袤草原': 110,
  '迷失森林': 120,
  '铁血高地': 130,
  '清凉沙滩': 140,
  '废弃矿洞': 140,
  '幽暗密林': 160,
  '荒凉戈壁': 170,
  '洞穴深处': 180,
  '遗忘之海': 200,
  '无尽荒漠': 210,
  '枯木丛林': 220,
  '极寒冰原': 110,
  '熔岩通道': 140
}

const mapList = Object.keys(maxLevels).map(name => ({
  name,
  maxLevel: maxLevels[name]
}))

const evalMode = ref('absolute') // 'absolute' (按装备自身爆率) | 'relative' (按本地地图相对)

const currentDifficultyOptions = computed(() => {
  if (evalMode.value === 'absolute') {
    return [
      { label: '较易 (≥0.10%)', value: 'very_easy' },
      { label: '一般 (0.05~0.10%)', value: 'normal' },
      { label: '较难 (0.025~0.05%)', value: 'rather_hard' },
      { label: '困难 (0.01~0.025%)', value: 'hard' },
      { label: '极难 (<0.01%)', value: 'very_hard' }
    ]
  } else {
    return [
      { label: '较易 (前15%)', value: 'very_easy' },
      { label: '一般 (15%~35%)', value: 'normal' },
      { label: '较难 (35%~65%)', value: 'rather_hard' },
      { label: '困难 (65%~85%)', value: 'hard' },
      { label: '极难 (后15%)', value: 'very_hard' }
    ]
  }
})

// 掉落难度主题色与背景配置 (绿-较易, 蓝-一般, 紫-较难, 橙-困难, 红-极难)
const getDifficultyConfig = (diff) => {
  const map = {
    'very_easy': { label: '较易', color: '#10b981', lightBg: 'rgba(16, 185, 129, 0.12)', border: '#10b981' },
    'normal': { label: '一般', color: '#3b82f6', lightBg: 'rgba(59, 130, 246, 0.12)', border: '#3b82f6' },
    'rather_hard': { label: '较难', color: '#a855f7', lightBg: 'rgba(168, 85, 247, 0.12)', border: '#a855f7' },
    'hard': { label: '困难', color: '#f97316', lightBg: 'rgba(249, 115, 22, 0.12)', border: '#f97316' },
    'very_hard': { label: '极难', color: '#ef4444', lightBg: 'rgba(239, 68, 68, 0.12)', border: '#ef4444' }
  }
  return map[diff] || { label: '一般', color: '#3b82f6', lightBg: 'rgba(59, 130, 246, 0.12)', border: '#3b82f6' }
}

// 状态管理
const searchQuery = ref('')
const tagsExpanded = ref(true)
const ruleExpanded = ref(false)
const selectedMap = ref('all')
const selectedDifficulty = ref('all')
const showExactProb = ref(false) // 默认模糊区间，false 为区间模式，true 为精确概率模式

// 详情弹窗状态
const detailModal = ref({ visible: false, data: {} })

const getModalProbBadgeText = (equip) => {
  if (!equip) return ''
  const isSS = equip.step === 'SS' || equip.Step === 'SS'
  if (showExactProb.value) {
    return `${equip.difficultyName} (${equip.probStr}，约 ${equip.approxBattles} 场/件)`
  }
  // 红装默认保留概率百分比，隐藏场次
  if (isSS) {
    return `${equip.difficultyName} (${equip.probStr})`
  }
  // 普通金装模糊区间模式
  if (evalMode.value === 'absolute') {
    const rangeMap = {
      'very_easy': '≥0.10%',
      'normal': '0.05%~0.10%',
      'rather_hard': '0.025%~0.05%',
      'hard': '0.01%~0.025%',
      'very_hard': '<0.01%'
    }
    const range = rangeMap[equip.difficulty] || ''
    return range ? `${equip.difficultyName} (${range})` : equip.difficultyName
  } else {
    const rangeMap = {
      'very_easy': '前15%',
      'normal': '15%~35%',
      'rather_hard': '35%~65%',
      'hard': '65%~85%',
      'very_hard': '后15%'
    }
    const range = rangeMap[equip.difficulty] || ''
    return range ? `${equip.difficultyName} (${range})` : equip.difficultyName
  }
}

const getModalReasonText = (equip) => {
  if (!equip) return ''
  const isSS = equip.step === 'SS' || equip.Step === 'SS'
  if (isSS) {
    if (showExactProb.value) {
      return `单场出货率约 ${equip.probStr}（约 ${equip.approxBattles} 场/件）。红装（SS阶传承装备）在遭遇 A阶(1/10000) 或 S阶(1/1000) 战斗事件时小概率赋予匹配职业的怪物携带掉落，亦可通过图鉴3个天赐结晶兑换、旅行商人及黄金宝库获取`
    }
    return `单场出货率约 ${equip.probStr}。红装（SS阶传承装备）在遭遇 A阶(1/10000) 或 S阶(1/1000) 战斗事件时小概率赋予匹配职业的怪物携带掉落，亦可通过图鉴3个天赐结晶兑换、旅行商人及黄金宝库获取`
  }
  if (showExactProb.value) {
    return equip.exactReason || equip.reason
  }
  return equip.fuzzyReason || equip.reason
}

// ================= 全地图装备数据库构建 =================
const computedMapData = computed(() => {
  const mapData = {}

  for (const mapName in maxLevels) {
    const localEvents = rawBattleEvents.filter(b => b.AreaName === mapName || b.AreaType === mapName)

    const classRoles = { '战士': new Set(), '法师': new Set(), '射手': new Set(), '牧师': new Set() }
    const classEvents = { '战士': [], '法师': [], '射手': [], '牧师': [] }

    localEvents.forEach(eventInfo => {
      const roleIds = [
        ...(eventInfo.MustRole ? eventInfo.MustRole.split(',') : []),
        ...(eventInfo.ProbRole ? eventInfo.ProbRole.split(',') : [])
      ].filter(Boolean)

      roleIds.forEach(id => {
        const r = roleMap.get(id)
        if (r && r.Class && classRoles[r.Class]) {
          classRoles[r.Class].add(r.Name || r.IDs)
          if (classEvents[r.Class]) classEvents[r.Class].push(eventInfo.Name)
        }
      })
    })

    const simList = simulationResults[mapName] || []

    // 预先计算当前地图内装备的相对百分比排名 (排除 SS 阶红装)
    const nonSSList = simList.filter(e => e.step !== 'SS')
    const sortedByProb = [...nonSSList].sort((a, b) => b.probPercent - a.probPercent)
    const relRankMap = new Map()
    sortedByProb.forEach((e, idx) => {
      relRankMap.set(e.id || e.IDs, idx / Math.max(1, sortedByProb.length))
    })

    const processed = simList.map(eq => {
      const raw = equipDataMap.get(eq.id || eq.IDs) || {}
      const eqClasses = (eq.class || raw.Class) ? (eq.class || raw.Class).split(/[\s,，]+/) : ['全职']
      const dropRoles = []
      const dropEvents = []

      eqClasses.forEach(c => {
        if (classRoles[c]) {
          dropRoles.push(...Array.from(classRoles[c]))
          dropEvents.push(...(classEvents[c] || []))
        }
      })

      // 1. 全局绝对爆率 5 档 (按概率百分比)
      // 较易(绿): >=0.10%, 一般(蓝): 0.05%~0.10%, 较难(紫): 0.025%~0.05%, 困难(橙): 0.01%~0.025%, 极难(红): <0.01%
      let absDiffKey = 'normal'
      let absDiffName = '一般'
      if (eq.step === 'SS' || raw.Step === 'SS') {
        absDiffKey = 'very_hard'
        absDiffName = '极难'
      } else if (eq.probPercent >= 0.10) {
        absDiffKey = 'very_easy'
        absDiffName = '较易'
      } else if (eq.probPercent >= 0.05) {
        absDiffKey = 'normal'
        absDiffName = '一般'
      } else if (eq.probPercent >= 0.025) {
        absDiffKey = 'rather_hard'
        absDiffName = '较难'
      } else if (eq.probPercent >= 0.01) {
        absDiffKey = 'hard'
        absDiffName = '困难'
      } else {
        absDiffKey = 'very_hard'
        absDiffName = '极难'
      }

      // 2. 地图相对排名 5 档
      // 较易(绿): 本地排名前 15%, 一般(蓝): 15%~35%, 较难(紫): 35%~65%, 困难(橙): 65%~85%, 极难(红): 垫底 15% + SS红装
      let relDiffKey = 'normal'
      let relDiffName = '一般'
      if (eq.step === 'SS' || raw.Step === 'SS') {
        relDiffKey = 'very_hard'
        relDiffName = '极难'
      } else {
        const ratio = relRankMap.get(eq.id || eq.IDs) ?? 0.5
        if (ratio < 0.15) {
          relDiffKey = 'very_easy'
          relDiffName = '较易'
        } else if (ratio < 0.35) {
          relDiffKey = 'normal'
          relDiffName = '一般'
        } else if (ratio < 0.65) {
          relDiffKey = 'rather_hard'
          relDiffName = '较难'
        } else if (ratio < 0.85) {
          relDiffKey = 'hard'
          relDiffName = '困难'
        } else {
          relDiffKey = 'very_hard'
          relDiffName = '极难'
        }
      }

      // 根据当前基准模式实时生效
      const isAbs = evalMode.value === 'absolute'
      const diffKey = isAbs ? absDiffKey : relDiffKey
      const diffName = isAbs ? absDiffName : relDiffName

      let exactReason = ''
      let fuzzyReason = ''
      if (eq.step === 'SS' || raw.Step === 'SS') {
        exactReason = `单场出货率约 ${eq.probStr}（约 ${eq.approxBattles} 场/件）。红装（SS阶传承装备）在遭遇 A阶(1/10000) 或 S阶(1/1000) 战斗事件时小概率赋予匹配职业的怪物携带掉落，亦可通过图鉴3个天赐结晶兑换、旅行商人及黄金宝库获取`
        fuzzyReason = exactReason
      } else if (eq.probPercent < 0.001) {
        exactReason = `单场出货率 <0.001%（约 ${eq.approxBattles} 场/件）。本地战斗完全缺少对应职业怪物，只能依赖极低概率的跨图世界事件`
        fuzzyReason = `本地战斗完全缺少对应职业怪物，只能依赖极低概率的跨图世界事件`
      } else if (diffKey === 'very_hard') {
        exactReason = `单场出货率约 ${eq.probStr}（约 ${eq.approxBattles} 场/件，极难）。本地战斗怪物池缺乏对应职业或同部位竞争极大`
        fuzzyReason = `该装备评级为【极难】。本地战斗怪物池缺乏对应职业或同部位竞争极大`
      } else if (diffKey === 'hard') {
        exactReason = `单场出货率约 ${eq.probStr}（约 ${eq.approxBattles} 场/件，困难）。本地对应职业怪物出场率偏低，刷取难度较大`
        fuzzyReason = `该装备评级为【困难】。本地对应职业怪物出场率偏低，刷取难度较大`
      } else if (diffKey === 'rather_hard') {
        exactReason = `单场出货率约 ${eq.probStr}（约 ${eq.approxBattles} 场/件，较难）。本地存在一定同系竞争，需多花时间刷取`
        fuzzyReason = `该装备评级为【较难】。本地存在一定同系竞争，需多花时间刷取`
      } else if (diffKey === 'normal') {
        exactReason = `单场出货率约 ${eq.probStr}（约 ${eq.approxBattles} 场/件，一般）。本地怪物职业分布均衡，正常探索可稳定获取`
        fuzzyReason = `该装备评级为【一般】。本地怪物职业分布均衡，正常探索可稳定获取`
      } else {
        exactReason = `单场出货率约 ${eq.probStr}（约 ${eq.approxBattles} 场/件，较易）。本地核心怪物频繁携带出场，掉落几率最高`
        fuzzyReason = `该装备评级为【较易】。本地核心怪物频繁携带出场，掉落几率最高`
      }

      return {
        ...raw,
        ...eq,
        id: eq.id || raw.IDs,
        name: eq.name || raw.Name,
        difficulty: diffKey,
        difficultyName: diffName,
        diffName: diffName,
        absDiffKey,
        absDiffName,
        relDiffKey,
        relDiffName,
        areaName: mapName,
        AreaName: mapName,
        reason: exactReason,
        exactReason,
        fuzzyReason,
        dropRoles: [...new Set(dropRoles)],
        dropEvents: [...new Set(dropEvents)]
      }
    })

    // ⭐ 严格按照游戏图鉴的原生顺序（Equip.json 顺序）排序
    processed.sort((a, b) => {
      const orderA = equipOrderMap.get(a.id || a.IDs) ?? 999999
      const orderB = equipOrderMap.get(b.id || b.IDs) ?? 999999
      return orderA - orderB
    })

    mapData[mapName] = {
      maxLevel: maxLevels[mapName],
      equips: processed
    }
  }

  return mapData
})

// 按地图分块清晰展示
const displayedMapGroups = computed(() => {
  const groups = []
  const targetMaps = selectedMap.value === 'all'
    ? Object.keys(maxLevels)
    : [selectedMap.value]

  const q = searchQuery.value.trim().toLowerCase()

  targetMaps.forEach(mapName => {
    let list = computedMapData.value[mapName]?.equips || []

    // 1. 搜索
    if (q) {
      list = list.filter(item => {
        const matchName = (item.name || item.Name || '').toLowerCase().includes(q)
        const matchClass = (item.class || item.Class || '').toLowerCase().includes(q)
        const matchType = (item.type || item.Type || '').toLowerCase().includes(q)
        const matchArea = (item.areaName || item.AreaName || '').toLowerCase().includes(q)
        return matchName || matchClass || matchType || matchArea
      })
    }

    // 2. 难度筛选
    if (selectedDifficulty.value !== 'all') {
      list = list.filter(item => item.difficulty === selectedDifficulty.value)
    }

    if (list.length > 0) {
      groups.push({
        name: mapName,
        maxLevel: maxLevels[mapName],
        equips: list
      })
    }
  })

  return groups
})

const totalEquipCount = computed(() => {
  return displayedMapGroups.value.reduce((sum, g) => sum + g.equips.length, 0)
})

const listContainer = ref(null)

const resetScroll = () => {
  if (listContainer.value) {
    listContainer.value.scrollTop = 0
  }
}

// 详情弹窗逻辑
const openDetail = (equip) => {
  detailModal.value = { visible: true, data: equip }
}

const closeDetail = () => {
  detailModal.value = { visible: false, data: {} }
}

watch(searchQuery, () => {
  resetScroll()
})
watch(selectedMap, () => {
  resetScroll()
})
watch(selectedDifficulty, () => {
  resetScroll()
})
watch(evalMode, () => {
  resetScroll()
})
</script>

<style scoped>
/* ===== 容器基准 ===== */
.equip-prob-container {
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

.equip-prob-sticky-top {
  flex-shrink: 0;
  background: var(--bg);
  padding-bottom: 6px;
}

/* ===== 搜索栏与筛选按钮（100% 对齐 RuneView 样式） ===== */
.talent-search-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
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
  min-width: 0;
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
  min-width: 0;
}

.clear-search-btn {
  background: none;
  border: none;
  color: var(--text-sub, #999);
  cursor: pointer;
  padding: 0 4px;
}

.filter-toggle-btn {
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

/* ===== 筛选面板（100% 对齐 RuneView 样式） ===== */
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

/* 难度特定高亮 */
.diff-btn-very_easy.active { background: rgba(16, 185, 129, 0.15) !important; color: #10b981 !important; font-weight: bold; }
.diff-btn-normal.active { background: rgba(59, 130, 246, 0.15) !important; color: #3b82f6 !important; font-weight: bold; }
.diff-btn-rather_hard.active { background: rgba(168, 85, 247, 0.15) !important; color: #a855f7 !important; font-weight: bold; }
.diff-btn-hard.active { background: rgba(249, 115, 22, 0.15) !important; color: #f97316 !important; font-weight: bold; }
.diff-btn-very_hard.active { background: rgba(239, 68, 68, 0.15) !important; color: #ef4444 !important; font-weight: bold; }

.mode-btn {
  font-weight: 600;
}
.mode-btn.active {
  background: rgba(59, 130, 246, 0.15) !important;
  color: #3b82f6 !important;
  font-weight: bold;
}

/* 提示条（纯净标题） */
.rule-hint-bar {
  margin-top: 4px;
  background: rgba(59, 130, 246, 0.06);
  border: 1px dashed rgba(59, 130, 246, 0.3);
  border-radius: 8px;
  padding: 6px 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  font-size: 11px;
}

.rule-hint-left {
  display: flex;
  align-items: center;
  gap: 6px;
}

.rule-badge {
  font-weight: 700;
  color: #2563eb;
}

.rule-toggle-text {
  color: #3b82f6;
  font-weight: 700;
  flex-shrink: 0;
}

.rule-expand-content {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 12px 16px;
  margin-top: 6px;
  font-size: 13px;
  line-height: 1.65;
  color: var(--text-sub);
}

.rule-expand-content p {
  margin: 6px 0;
}

.author-name {
  color: #3b82f6;
  font-weight: 700;
}

.guide-link {
  color: #3b82f6;
  font-weight: 700;
  text-decoration: underline;
  text-underline-offset: 3px;
  cursor: pointer;
  transition: color 0.2s ease;
}

.guide-link:hover {
  color: #1d4ed8;
}

/* 检索统计栏与图例 */
.search-count-bar {
  padding: 8px 6px 4px 6px;
  font-size: 12px;
  color: var(--text-main);
  font-weight: 600;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
}

.count-highlight {
  color: #3b82f6;
  font-weight: 800;
}

.legend-quick-group {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 10px;
  width: 100%;
}

.legend-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 700;
}

.legend-indicator {
  width: 8px;
  height: 8px;
  border-radius: 2px;
}

.pill-very_easy .legend-indicator { background: #10b981; }
.pill-normal .legend-indicator { background: #3b82f6; }
.pill-rather_hard .legend-indicator { background: #a855f7; }
.pill-hard .legend-indicator { background: #f97316; }
.pill-very_hard .legend-indicator { background: #ef4444; }

/* ===== 列表容器 ===== */
.equip-list-container {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
  padding-bottom: 20px;
  scrollbar-width: thin;
}

/* 地图分块区块 */
.map-group-section {
  margin-bottom: 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.map-group-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  background: rgba(0, 0, 0, 0.02);
  border-radius: 8px;
}

.dark-mode .map-group-header {
  background: rgba(255, 255, 255, 0.03);
}

.map-group-left {
  display: flex;
  align-items: center;
  gap: 6px;
}

.map-group-title {
  font-size: 13px;
  font-weight: 800;
  color: var(--text-main);
}

.map-level-badge {
  font-size: 10px;
  font-weight: 700;
  color: #3b82f6;
  background: rgba(59, 130, 246, 0.1);
  padding: 1px 6px;
  border-radius: 4px;
}

.map-group-count {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-sub);
}

/* 7 列装备矩阵网格 */
.equip-rough-grid-7 {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  grid-auto-rows: min-content;
  align-content: start;
  gap: 10px 8px;
  width: 100%;
  padding: 4px;
  box-sizing: border-box;
}

@media (max-width: 768px) {
  .equip-rough-grid-7 {
    grid-template-columns: repeat(5, 1fr);
  }
}

@media (max-width: 480px) {
  .equip-rough-grid-7 {
    grid-template-columns: repeat(4, 1fr);
  }
}

/* 卡片外框：100% 对齐 EquipView 粗略卡片样式 */
.equip-rough-card {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 6px;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
  cursor: pointer;
  min-width: 0;
  box-sizing: border-box;
  position: relative;
}

.equip-rough-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
}

/* 图标槽位：按难度定制浅色背景与彩色边线，保留右下角难度标签 */
.equip-rough-icon-slot {
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10%;
  box-sizing: border-box;
  position: relative;
  border: 2px solid transparent;
}

.diff-slot-very_easy { border-color: #10b981 !important; }
.diff-slot-normal { border-color: #3b82f6 !important; }
.diff-slot-rather_hard { border-color: #a855f7 !important; }
.diff-slot-hard { border-color: #f97316 !important; }
.diff-slot-very_hard { border-color: #ef4444 !important; }

.equip-rough-icon {
  width: 90%;
  height: 90%;
  object-fit: contain;
  image-rendering: pixelated;
}

.rough-diff-badge {
  position: absolute;
  bottom: 0px;
  right: 0px;
  font-size: 14px;
  font-weight: 800;
  padding: 2px 6px;
  border-radius: 6px 0 6px 0;
  color: #fff;
  line-height: 1.1;
}

.badge-very_easy { background: #10b981; }
.badge-normal { background: #3b82f6; }
.badge-rather_hard { background: #a855f7; }
.badge-hard { background: #f97316; }
.badge-very_hard { background: #ef4444; }

/* 装备名称：100% 对齐 EquipView 粗略名称排版与文字折行 */
.equip-rough-name {
  font-size: 11.5px;
  font-weight: 700;
  margin-top: 6px;
  text-align: center;
  width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.2;
}

.no-data {
  text-align: center;
  padding: 40px;
  color: var(--text-sub);
  font-size: 13px;
}

/* ===== 详情弹窗 ===== */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 16px;
}

.equip-detail-window {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  max-width: 420px;
  width: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.25);
}

.equip-modal-header {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;
}

.centered-modal-title {
  margin: 0;
  font-size: 16px;
  font-weight: 800;
  text-align: center;
  flex: 1;
}

.relic-modal-close {
  background: none;
  border: none;
  font-size: 16px;
  color: var(--text-sub);
  cursor: pointer;
}

.equip-modal-body {
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.modal-top-simple {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.modal-icon-box {
  width: 60px;
  height: 60px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2.5px solid transparent;
  box-sizing: border-box;
}

.modal-equip-img {
  width: 46px;
  height: 46px;
  object-fit: contain;
  image-rendering: pixelated;
}

.modal-simple-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: center;
}

.modal-info-pill {
  font-size: 11px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 6px;
}

.tag-area { background: rgba(107, 114, 128, 0.12); color: #64748b; }
.tag-class { background: rgba(59, 130, 246, 0.12); color: #3b82f6; }
.tag-type { background: rgba(16, 185, 129, 0.12); color: #10b981; }

.modal-prob-card {
  background: rgba(0, 0, 0, 0.02);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.prob-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.prob-card-title {
  font-size: 13px;
  font-weight: 800;
  color: var(--text-main);
}

.prob-diff-badge {
  font-size: 13px;
  font-weight: 800;
  padding: 3px 10px;
  border-radius: 6px;
  user-select: none;
  transition: all 0.15s ease;
}

.prob-diff-badge:hover {
  filter: brightness(0.92);
  transform: translateY(-1px);
}

.prob-diff-badge:active {
  transform: translateY(0);
}

.pill-very_easy { background: rgba(16, 185, 129, 0.15); color: #10b981; }
.pill-normal { background: rgba(59, 130, 246, 0.15); color: #3b82f6; }
.pill-rather_hard { background: rgba(168, 85, 247, 0.15); color: #a855f7; }
.pill-hard { background: rgba(249, 115, 22, 0.15); color: #f97316; }
.pill-very_hard { background: rgba(239, 68, 68, 0.15); color: #ef4444; }

.prob-card-reason {
  font-size: 12px;
  color: var(--text-sub);
  line-height: 1.5;
}

.prob-meta-row {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  font-size: 11px;
  margin-top: 4px;
}

.prob-meta-label {
  font-weight: 700;
  color: var(--text-sub);
  flex-shrink: 0;
}

.prob-chips-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.prob-chip {
  background: rgba(0, 0, 0, 0.05);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
}

.chip-event {
  background: rgba(59, 130, 246, 0.1);
  color: #2563eb;
}

.game-sprite {
  image-rendering: pixelated;
}
</style>
