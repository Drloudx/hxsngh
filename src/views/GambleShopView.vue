<template>
  <div class="gamble-container">
    <div class="gamble-sticky-top">
      <!-- 顶部主标签页切换：旅行商人 / 黄金宝库 -->
      <div class="main-tab-nav">
        <button
          class="main-tab-btn"
          :class="{ active: currentShopType === 'gamble' }"
          @click="switchShopType('gamble')"
        >
          <img src="/General/S10001_008.png" class="main-tab-icon game-sprite" @error="handleTabIconError" />
          <div class="main-tab-text-group">
            <span class="main-tab-title">旅行商人</span>
          </div>
        </button>
        <button
          class="main-tab-btn"
          :class="{ active: currentShopType === 'vault' }"
          @click="switchShopType('vault')"
        >
          <img src="/General/S10001_016.png" class="main-tab-icon game-sprite" @error="handleTabIconError" />
          <div class="main-tab-text-group">
            <span class="main-tab-title">黄金宝库</span>
          </div>
        </button>
      </div>

      <!-- 搜索栏与筛选展开按钮 -->
      <div class="gamble-search-row">
        <div class="gamble-search-box">
          <img src="/ui/search.svg" class="search-icon" />
          <input
            type="text"
            v-model="searchQuery"
            placeholder="搜索关键词"
            class="gamble-search-input"
          />
        </div>
        <!-- 筛选折叠切换按钮（参考角色页面，默认收起） -->
        <button class="filter-toggle-btn" @click="tagsExpanded = !tagsExpanded">
          <span class="filter-toggle-text">筛选</span>
          <img src="/ui/up.svg" class="collapse-icon" :class="{ collapsed: !tagsExpanded }" />
        </button>
      </div>

      <!-- 筛选与层级选择面板（默认收起） -->
      <div v-show="tagsExpanded" class="filter-panel page-filter-scroll">
        <!-- 1. 轮次 / 层级选择 -->
        <div class="filter-row">
          <span class="filter-label">{{ currentShopType === 'gamble' ? '轮次：' : '层级：' }}</span>
          <div class="filter-options">
            <button
              v-for="lvl in activeLevelOptions"
              :key="lvl.value"
              class="filter-btn"
              :class="{ active: selectedLevel === lvl.value }"
              @click="selectLevel(lvl.value)"
            >
              {{ lvl.label }}
              <span v-if="lvl.extra" class="cost-badge">({{ lvl.extra }})</span>
            </button>
          </div>
        </div>

        <!-- 2. 品阶筛选（神话红、传说橙、史诗紫、稀有蓝、普通绿） -->
        <div class="filter-row">
          <span class="filter-label">品阶：</span>
          <div class="filter-options">
            <button
              class="filter-btn"
              :class="{ active: selectedStep === 'all' }"
              @click="selectedStep = 'all'"
            >
              全部
            </button>
            <button
              v-for="step in stepOptions"
              :key="step.value"
              class="filter-btn step-btn"
              :class="[`step-btn-${step.value}`, { active: selectedStep === step.value }]"
              @click="toggleStep(step.value)"
            >
              {{ step.label }}
            </button>
          </div>
        </div>

        <!-- 3. 类型筛选 -->
        <div class="filter-row">
          <span class="filter-label">类型：</span>
          <div class="filter-options">
            <button
              class="filter-btn"
              :class="{ active: selectedType === 'all' }"
              @click="selectedType = 'all'"
            >
              全部
            </button>
            <button
              v-for="t in availableTypes"
              :key="t"
              class="filter-btn"
              :class="{ active: selectedType === t }"
              @click="toggleType(t)"
            >
              {{ t }}
            </button>
          </div>
        </div>
      </div>

      <!-- 概览与统计信息栏 -->
      <div class="summary-stat-bar">
        <div class="summary-left">
          <span>当前奖池：<strong class="stat-highlight">{{ currentLevelTitle }}</strong></span>
          <span v-if="currentLevelCost">（{{ currentLevelCost }}）</span>
        </div>
        <div class="summary-right">
          <span>检索数量：<strong class="stat-highlight">{{ filteredList.length }}</strong></span>
        </div>
      </div>
    </div>

    <!-- 列表展示区域（默认展示全部） -->
    <div class="gamble-list">
      <div v-if="filteredList.length === 0" class="empty-gamble-state">
        未找到符合筛选条件的物品或概率数据
      </div>

      <div
        v-for="item in filteredList"
        :key="item.Id"
        class="gamble-card-item"
      >
        <div class="card-left-section">
          <!-- 物品图标或类型占位符 -->
          <div class="item-icon-container" :style="{ backgroundColor: getStepBg(item.step), borderColor: getStepColor(item.step) }">
            <img
              v-if="item.iconPath"
              :src="item.iconPath"
              class="item-icon-img game-sprite"
              @error="handleIconError(item)"
            />
            <span v-else class="item-icon-fallback-text" :style="{ color: getStepColor(item.step) }">
              {{ item.Type ? item.Type.slice(0, 2) : '物' }}
            </span>
          </div>

          <!-- 物品主体信息 -->
          <div class="item-info-main">
            <div class="item-title-row">
              <span class="item-name" :style="{ color: getStepColor(item.step) }">
                {{ item.displayName }}
              </span>
            </div>

            <div class="item-meta-row">
              <span class="meta-tag meta-type">{{ item.Type }}</span>
              <span class="meta-tag meta-num">数量: ×{{ item.Num }}</span>
              <span v-if="selectedLevel === 'all'" class="meta-tag meta-level">
                出现在: {{ formatLevelText(item.Level) }}
              </span>
            </div>
          </div>
        </div>

        <!-- 概率与进度展示 -->
        <div class="card-right-section">
          <!-- 单轮次选中模式 -->
          <template v-if="selectedLevel !== 'all'">
            <div class="prob-number-wrapper">
              <span class="prob-label">抽中概率</span>
              <span class="prob-value" :style="{ color: getStepColor(item.step) }">
                {{ item.currentProbText }}
              </span>
            </div>
            <div class="prob-progress-bg">
              <div
                class="prob-progress-fill"
                :style="{
                  width: Math.min(100, Math.max(2, item.currentProbNum)) + '%',
                  backgroundColor: getStepColor(item.step)
                }"
              ></div>
            </div>
          </template>

          <!-- 全部轮次模式：展示该物品在各个所处轮次中的精准概率 -->
          <template v-else>
            <div class="all-levels-prob-list">
              <div
                v-for="p in item.allLevelProbs"
                :key="p.level"
                class="level-prob-item"
              >
                <span class="level-prob-tag">{{ currentShopType === 'gamble' ? `第${p.level}轮` : `第${p.level}层` }}:</span>
                <strong class="level-prob-val" :style="{ color: getStepColor(item.step) }">{{ p.probText }}</strong>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import rawGambleShop from '@/assets/GambleShop.json'
import rawGoldenVault from '@/assets/GoldenVault.json'

// 当前主分类：'gamble' (旅行商人) | 'vault' (黄金宝库)
const currentShopType = ref('gamble')

// 筛选面板展开状态（默认收起）
const tagsExpanded = ref(false)

const searchQuery = ref('')
const selectedLevel = ref('all') // 默认展示全部
const selectedStep = ref('all')
const selectedType = ref('all')

// 品阶词语映射（SS阶->神话, S阶->传说, A阶->史诗, B阶->稀有, C阶->普通）
const stepConfig = {
  'SS': { label: '神话', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)', weight: 5 },
  'S':  { label: '传说', color: '#f97316', bg: 'rgba(249, 115, 22, 0.12)', weight: 4 },
  'A':  { label: '史诗', color: '#a855f7', bg: 'rgba(168, 85, 247, 0.12)', weight: 3 },
  'B':  { label: '稀有', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.12)', weight: 2 },
  'C':  { label: '普通', color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)', weight: 1 },
  '':   { label: '基础', color: '#64748b', bg: 'rgba(100, 116, 139, 0.1)', weight: 0 }
}

const stepOptions = [
  { label: '神话', value: 'SS' },
  { label: '传说', value: 'S' },
  { label: '史诗', value: 'A' },
  { label: '稀有', value: 'B' },
  { label: '普通', value: 'C' }
]

const getStepColor = (step = '') => {
  return stepConfig[step]?.color || stepConfig[''].color
}

const getStepBg = (step = '') => {
  return stepConfig[step]?.bg || stepConfig[''].bg
}

// 辅助：将文本中的 SS阶、S阶、A阶、B阶、C阶 映射为 神话、传说、史诗、稀有、普通
const mapStepTerms = (text) => {
  if (!text) return ''
  return text
    .replace(/SS阶/g, '神话')
    .replace(/S阶/g, '传说')
    .replace(/A阶/g, '史诗')
    .replace(/B阶/g, '稀有')
    .replace(/C阶/g, '普通')
}

// 旅行商人轮次配置 (源码 GoldGambleBlockPanel: 1000, 4000, 16000, 64000)
const gambleLevelOptions = [
  { label: '全部轮次', value: 'all', extra: '' },
  { label: '第1次购买', value: '1', extra: '1,000金币' },
  { label: '第2次购买', value: '2', extra: '4,000金币' },
  { label: '第3次购买', value: '3', extra: '16,000金币' },
  { label: '第4次购买', value: '4', extra: '64,000金币' }
]

// 黄金宝库层级配置 (源码 GoldenVaultBlockPanel: 10000(外圈16格), 20000(中圈8格), 40000(中心1格))
const vaultLevelOptions = [
  { label: '全部层级', value: 'all', extra: '' },
  { label: '第1层(外圈16格)', value: '1', extra: '10,000金币' },
  { label: '第2层(中圈8格)', value: '2', extra: '20,000金币' },
  { label: '第3层(中心1格)', value: '3', extra: '40,000金币' }
]

const activeLevelOptions = computed(() => {
  return currentShopType.value === 'gamble' ? gambleLevelOptions : vaultLevelOptions
})

const switchShopType = (type) => {
  currentShopType.value = type
  selectedLevel.value = 'all' // 默认全部
  selectedStep.value = 'all'
  selectedType.value = 'all'
}

const selectLevel = (lvl) => {
  selectedLevel.value = lvl
}

const toggleStep = (step) => {
  selectedStep.value = selectedStep.value === step ? 'all' : step
}

const toggleType = (t) => {
  selectedType.value = selectedType.value === t ? 'all' : t
}

// 辅助：从 Content 中提取品阶标识
const extractStep = (item) => {
  const content = item.Content || ''
  if (content.includes('SS阶') || content.includes('SS')) return 'SS'
  if (content.includes('S阶')) return 'S'
  if (content.includes('A阶')) return 'A'
  if (content.includes('B阶')) return 'B'
  if (content.includes('C阶')) return 'C'

  if (content.includes('翠绿结晶')) return 'C'
  if (content.includes('海蓝结晶')) return 'B'
  if (content.includes('暗紫结晶')) return 'A'
  if (content.includes('圣灵结晶')) return 'S'

  return ''
}

// 辅助：解析展示名称与图标路径，并应用品阶词映射
const parseItemDisplay = (item) => {
  const content = item.Content || ''
  let rawName = content
  let iconId = ''

  if (content.includes(',')) {
    const parts = content.split(',')
    iconId = parts[0].trim()
    rawName = parts[1] ? parts[1].trim() : parts[0].trim()
  }

  const step = extractStep(item)
  const displayName = mapStepTerms(rawName)

  let iconPath = ''
  if (iconId) {
    iconPath = `/Shop/${iconId}.png`
  } else if (item.Type === '宝箱') {
    iconPath = '/Shop/mid_ico_chest_0001.png'
  } else if (item.Type === '符文') {
    iconPath = '/Shop/cur_ico_rune_0001.png'
  } else if (item.Type === '四叶草' || displayName.includes('四叶草')) {
    iconPath = '/Shop/D00002_000.png'
  } else if (displayName.includes('天赋果实')) {
    iconPath = '/Shop/D00002_001.png'
  }

  return {
    rawName,
    displayName,
    iconId,
    iconPath,
    step
  }
}

// 格式化基础数据集
const rawDataset = computed(() => {
  const source = currentShopType.value === 'gamble' ? rawGambleShop : rawGoldenVault
  return source.map(raw => {
    const parsed = parseItemDisplay(raw)
    const levels = (raw.Level || '').split(',').map(s => s.trim())
    return {
      ...raw,
      ...parsed,
      levels
    }
  })
})

// 计算各 Level 的总权重（源码严格对齐）
const levelTotalWeightsMap = computed(() => {
  const dataset = rawDataset.value
  const maxLvl = currentShopType.value === 'gamble' ? 4 : 3
  const map = {}
  for (let i = 1; i <= maxLvl; i++) {
    const pool = dataset.filter(item => item.levels.includes(String(i)))
    map[String(i)] = pool.reduce((sum, item) => sum + (Number(item.Weight) || 0), 0)
  }
  return map
})

const availableTypes = computed(() => {
  const types = new Set()
  rawDataset.value.forEach(item => {
    if (item.Type) types.add(item.Type)
  })
  return Array.from(types)
})

const currentLevelTitle = computed(() => {
  const opt = activeLevelOptions.value.find(o => o.value === selectedLevel.value)
  return opt ? opt.label : '全部'
})

const currentLevelCost = computed(() => {
  const opt = activeLevelOptions.value.find(o => o.value === selectedLevel.value)
  return opt && opt.extra ? `消耗 ${opt.extra}` : ''
})

const parseKeywords = (str) => {
  if (!str) return []
  return str.toLowerCase().split(/[\s,，、]+/).filter(Boolean)
}

const formatProbString = (probNum) => {
  if (probNum >= 0.01) {
    return probNum.toFixed(2) + '%'
  }
  return probNum.toFixed(3) + '%'
}

// 概率与筛选计算核心
const filteredList = computed(() => {
  let list = rawDataset.value
  const levelWeights = levelTotalWeightsMap.value

  // 1. 层级/轮次筛选
  if (selectedLevel.value !== 'all') {
    list = list.filter(item => item.levels.includes(selectedLevel.value))
  }

  // 2. 品阶筛选
  if (selectedStep.value !== 'all') {
    list = list.filter(item => item.step === selectedStep.value)
  }

  // 3. 类型筛选
  if (selectedType.value !== 'all') {
    list = list.filter(item => item.Type === selectedType.value)
  }

  // 4. 搜索多词（支持同时匹配原名称、映射后品阶、类型等）
  const q = searchQuery.value.trim()
  if (q) {
    const keywords = parseKeywords(q)
    list = list.filter(item => {
      const stepLabel = (stepConfig[item.step]?.label || '').toLowerCase()
      const fields = [
        (item.displayName || '').toLowerCase(),
        (item.rawName || '').toLowerCase(),
        (item.Content || '').toLowerCase(),
        stepLabel,
        (item.Type || '').toLowerCase(),
        (item.step ? item.step.toLowerCase() : ''),
        (item.step ? item.step.toLowerCase() + '阶' : ''),
        (item.IDs || '').toLowerCase()
      ]
      return keywords.some(kw => fields.some(f => f.includes(kw)))
    })
  }

  // 严格根据源码公式：概率 = 物品权重 / 当前层总权重
  const result = list.map(item => {
    const w = Number(item.Weight) || 0

    // 计算在各个轮次中的独立精准概率
    const allLevelProbs = item.levels.map(lvl => {
      const tot = levelWeights[lvl] || 1
      const pNum = (w / tot) * 100
      return {
        level: lvl,
        probNum: pNum,
        probText: formatProbString(pNum)
      }
    })

    // 当前选定层级的概率
    let currentProbNum = 0
    let currentProbText = ''
    if (selectedLevel.value !== 'all') {
      const tot = levelWeights[selectedLevel.value] || 1
      currentProbNum = (w / tot) * 100
      currentProbText = formatProbString(currentProbNum)
    } else {
      currentProbNum = allLevelProbs.length > 0 ? Math.max(...allLevelProbs.map(p => p.probNum)) : 0
      currentProbText = formatProbString(currentProbNum)
    }

    return {
      ...item,
      currentProbNum,
      currentProbText,
      allLevelProbs
    }
  })

  return result.sort((a, b) => {
    // 优先按概率降序
    if (b.currentProbNum !== a.currentProbNum) {
      return b.currentProbNum - a.currentProbNum
    }
    // 概率相同时按品阶降序
    const wa = stepConfig[a.step]?.weight || 0
    const wb = stepConfig[b.step]?.weight || 0
    if (wb !== wa) return wb - wa
    return (a.displayName || '').localeCompare(b.displayName || '')
  })
})

const formatLevelText = (lvlStr) => {
  if (!lvlStr) return ''
  const isGamble = currentShopType.value === 'gamble'
  return lvlStr.split(',').map(l => (isGamble ? `第${l}轮` : `第${l}层`)).join(' / ')
}

const handleIconError = (item) => {
  item.iconPath = ''
}

const handleTabIconError = (e) => {
  e.target.style.display = 'none'
}
</script>

<style scoped>
.game-sprite {
  image-rendering: pixelated;
  image-rendering: -moz-crisp-edges;
  image-rendering: crisp-edges;
}

.gamble-container {
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

.gamble-sticky-top {
  flex-shrink: 0;
  background: var(--bg);
  padding-bottom: 8px;
}

/* ===== 主标签页切换 ===== */
.main-tab-nav {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
}

.main-tab-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 8px 14px;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  cursor: pointer;
  box-shadow: 0 1.5px 4px rgba(0, 0, 0, 0.03);
  transition: all 0.2s ease;
  text-align: center;
}

.main-tab-btn:hover {
  border-color: #3b82f6;
}

.main-tab-btn.active {
  background: rgba(59, 130, 246, 0.12);
  border-color: #3b82f6;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.15);
}

.main-tab-icon {
  width: 28px;
  height: 28px;
  object-fit: contain;
  flex-shrink: 0;
}

.main-tab-text-group {
  display: flex;
  flex-direction: column;
}

.main-tab-title {
  font-size: 15px;
  font-weight:700;
  color: var(--text-main);
  line-height: 1.2;
}

.main-tab-desc {
  font-size: 11px;
  color: var(--text-sub);
  margin-top: 2px;
}

.main-tab-btn.active .main-tab-title {
  color: #3b82f6;
}

.main-tab-btn.active .main-tab-desc {
  color: rgba(59, 130, 246, 0.8);
}

/* ===== 搜索栏与筛选折叠按钮 ===== */
.gamble-search-row {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.gamble-search-box {
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

.gamble-search-box:focus-within {
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

.gamble-search-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 13px;
  color: var(--text-main);
  font-family: inherit;
}

/* 筛选折叠切换按钮 */
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

.gamble-sub-header {
  padding: 4px 2px 2px 2px;
  text-align: left;
}

.gamble-hint-text {
  font-size: 11px;
  color: var(--text-sub);
}

/* ===== 筛选折叠面板 ===== */
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
  animation: slideDown 0.2s ease-out;
  --filter-panel-reserved-space: 220px;
}

@keyframes slideDown {
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: translateY(0); }
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
  background: rgba(59, 130, 246, 0.15);
  color: #3b82f6;
  font-weight: bold;
}

.cost-badge {
  font-size: 11px;
  color: #f97316;
  font-weight: 600;
  margin-left: 2px;
}

/* 品阶特定按钮高亮（神话红、传说橙、史诗紫、稀有蓝、普通绿） */
.step-btn-SS.active { background: rgba(239, 68, 68, 0.15) !important; color: #ef4444 !important; }
.step-btn-S.active  { background: rgba(249, 115, 22, 0.15) !important; color: #f97316 !important; }
.step-btn-A.active  { background: rgba(168, 85, 247, 0.15) !important; color: #a855f7 !important; }
.step-btn-B.active  { background: rgba(59, 130, 246, 0.15) !important; color: #3b82f6 !important; }
.step-btn-C.active  { background: rgba(16, 185, 129, 0.15) !important; color: #10b981 !important; }

/* ===== 概览统计栏 ===== */
.summary-stat-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  font-size: 12px;
  color: var(--text-main);
  margin-top: 4px;
}

.summary-left, .summary-right {
  display: flex;
  align-items: center;
  gap: 4px;
}

.stat-highlight {
  color: #3b82f6;
  font-weight: 800;
}

.stat-cost {
  color: #f97316;
  font-weight: 700;
}

/* ===== 卡片列表 ===== */
.gamble-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 0;
  flex: 1;
  overflow-y: auto;
  padding-bottom: 15px;
}

.gamble-card-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 10px 14px;
  text-align: left;
  box-shadow: 0 1.5px 3px rgba(0, 0, 0, 0.02);
  transition: all 0.2s ease;
  flex-shrink: 0;
  gap: 12px;
}

.gamble-card-item:hover {
  transform: translateY(-1px);
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.06);
}

.card-left-section {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.item-icon-container {
  width: 38px;
  height: 38px;
  border-radius: 8px;
  border: 1px solid;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
}

.item-icon-img {
  width: 32px;
  height: 32px;
  object-fit: contain;
}

.item-icon-fallback-text {
  font-size: 13px;
  font-weight: 800;
}

.item-info-main {
  flex: 1;
  min-width: 0;
}

.item-title-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}

.item-name {
  font-size: 14px;
  font-weight: 700;
  white-space: normal;
  word-break: break-all;
}

.item-meta-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  font-size: 11px;
}

.meta-tag {
  padding: 1px 6px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.04);
  color: var(--text-sub);
}

.meta-type {
  background: rgba(59, 130, 246, 0.08);
  color: #3b82f6;
  font-weight: 600;
}

.meta-num {
  color: var(--text-main);
  font-weight: 700;
}

/* ===== 右侧概率与进度 ===== */
.card-right-section {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  min-width: 100px;
  flex-shrink: 0;
}

.prob-number-wrapper {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.prob-label {
  font-size: 10px;
  color: var(--text-sub);
}

.prob-value {
  font-size: 15px;
  font-weight: 800;
  letter-spacing: -0.2px;
}

.prob-progress-bg {
  width: 90px;
  height: 6px;
  background: rgba(0, 0, 0, 0.06);
  border-radius: 3px;
  overflow: hidden;
}

.prob-progress-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s ease;
}

/* 全部轮次时的多轮概率列表 */
.all-levels-prob-list {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}

.level-prob-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
}

.level-prob-tag {
  color: var(--text-sub);
  font-size: 10px;
}

.level-prob-val {
  font-weight: 700;
  font-size: 12px;
}

.empty-gamble-state {
  font-size: 13px;
  color: var(--text-sub);
  text-align: center;
  padding: 40px 0;
  background: var(--card-bg);
  border: 1px dashed var(--border-color);
  border-radius: 8px;
  margin-top: 10px;
}
</style>
