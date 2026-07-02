<template>
  <div class="talent-container">
    <div class="talent-sticky-top">
      <!-- 顶部栏: 搜索框 -->
      <div class="talent-search-box">
        <img src="/ui/search.svg" class="search-icon" />
        <input
          type="text"
          v-model="searchQuery"
          placeholder="搜索预言名、效果描述..."
          class="talent-search-input"
        />
      </div>

      <!-- 搜索区域: 预言名字分类筛选 -->
      <div class="name-tags-section">
        <div class="name-tags-header" @click="toggleNameTagsExpand">
          <span class="name-tags-title">预言分类筛选</span>
          <img src="/ui/up.svg" class="collapse-icon" :class="{ collapsed: !nameTagsExpanded }" />
        </div>
        <div v-if="nameTagsExpanded" class="name-tags-grid">
          <span
            v-for="name in uniqueNames"
            :key="name"
            :class="['name-tag', { active: activeNameTag === name }]"
            @click="toggleNameTag(name)"
          >
            {{ name }}
          </span>
        </div>
      </div>
    </div>

    <!-- 预言卡片列表 -->
    <div class="talent-list" @scroll="handleScroll">
      <div
        v-for="item in pagedForetells"
        :key="item.IDs"
        class="talent-card"
      >
        <div class="prophecy-card-header">
          <div class="prophecy-header-left">
            <img :src="'/Foretell/' + item.Icon + '.png'" class="prophecy-icon" />
            <span class="prophecy-name" :style="{ color: getStepConfig(item.Step).color }">{{ item.Name }}</span>
          </div>
          <div class="prophecy-header-right">
            <span class="difficulty-label">最低出现难度: {{ item.MinDiffi }}</span>
          </div>
        </div>

        <div class="prophecy-effect">
          {{ getEffectDescription(item) }}
        </div>

        <div class="prophecy-bottom-tags">
          <span class="bottom-tag">持续回合: {{ item.Duration }}</span>
          <span class="bottom-tag">使用区域: {{ item.AreaName }}</span>
        </div>

        <!-- 四叶草数据计算器 (仅在幸运卡片 YY00011_005 下显示) -->
        <div v-if="item.IDs === 'YY00011_005'" class="clover-calculator-box">
          <div class="calculator-header" @click="toggleCalculator">
            <div class="calculator-header-left">
              <img src="/Foretell/D00002_000.png" class="calc-header-clover-icon" />
              <span class="calculator-title">四叶草数量计算器</span>
            </div>
            <img src="/ui/up.svg" class="calc-arrow-icon" :class="{ 'expanded-flip': !calculatorExpanded }" />
          </div>

          <div v-show="calculatorExpanded" class="calculator-content">
            <!-- 已添加的预言行 -->
            <div class="calc-added-list">
              <div v-for="(cItem, idx) in addedCalcItems" :key="idx" class="calc-added-item">
                <div class="calc-item-left">
                  <img :src="'/Foretell/' + cItem.Icon + '.png'" class="calc-item-icon" />
                  <div class="calc-item-text">
                    <div class="calc-item-line1">
                      <span class="calc-item-name" :style="{ color: getStepConfig(cItem.Step).color }">{{ cItem.Name }}</span>
                      <span class="calc-item-meta">（持续{{ cItem.Duration }}张不低于{{ cItem.MinDiffi }}的地图）</span>
                    </div>
                    <div class="calc-item-line2">{{ getEffectDescription(cItem) }}</div>
                  </div>
                </div>
                <div class="calc-item-right" v-if="cItem.IDs !== 'YY00010_003'">
                  <button class="calc-remove-btn" @click="removeCalcItem(idx)">
                    <img src="/ui/minus.svg" class="minus-icon" />
                  </button>
                </div>
              </div>

              <!-- 空白添加行 -->
              <div class="calc-added-item empty-row">
                <div class="calc-item-left" @click="openAddModal">
                  <div class="empty-icon-placeholder">?</div>
                  <span class="empty-row-hint">添加预言（仅支持 丰收、藏宝、秘藏）</span>
                </div>
                <div class="calc-item-right">
                  <button class="calc-add-btn" @click="openAddModal">
                    <img src="/ui/plus.svg" class="plus-icon" />
                  </button>
                </div>
              </div>
            </div>

            <!-- 底部预估收益 -->
            <div class="calculator-footer">
              <div class="calc-result-box">
                <img src="/Foretell/D00002_000.png" class="calc-footer-clover-icon" />
                <span class="calc-result-text">预估四叶草数量：<strong class="calc-result-number">{{ calculatedClovers }}</strong></span>
              </div>
              <button class="calc-reset-btn" @click="resetCalcItems">重置</button>
            </div>
          </div>
        </div>
      </div>

      <div v-if="sortedForetells.length === 0" class="no-data">
        未找到匹配的预言数据
      </div>
    </div>

    <!-- 添加预言选择弹窗 -->
    <div v-if="addModalVisible" class="modal-overlay" @click.self="closeAddModal">
      <div class="modal-window">
        <div class="modal-header">
          <h3>选择要添加的预言</h3>
          <button class="modal-close-x" @click="closeAddModal">✕</button>
        </div>
        <div class="modal-body">
          <div class="modal-selectable-list">
            <div
              v-for="p in selectableProphecies"
              :key="p.IDs"
              class="selectable-prophecy-item"
              @click="selectProphecy(p)"
            >
              <div class="item-left">
                <img :src="'/Foretell/' + p.Icon + '.png'" class="sel-icon" />
                <div class="sel-text">
                  <div class="sel-line1">
                    <span class="sel-name" :style="{ color: getStepConfig(p.Step).color }">{{ p.Name }}</span>
                    <span class="sel-step">（{{ getStepConfig(p.Step).label }}级）</span>
                  </div>
                  <div class="sel-desc">{{ getEffectDescription(p) }}</div>
                </div>
              </div>
              <div class="item-right">
                <span class="sel-diff">难度 {{ p.MinDiffi }}</span>
              </div>
            </div>
            <div v-if="selectableProphecies.length === 0" class="no-selectable-data">
              无可添加的预言（已全部添加）
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import foretellData from '@/assets/ForetellDataTable.json'

const stepOrder = { 'SS': 4, 'S': 3, 'A': 2, 'B': 1 }
const STORAGE_KEY_CALC = 'foretell_clover_calc_items'

// 预置品质颜色与标签配置
const getStepConfig = (step) => {
  const map = {
    'SS': { label: 'SS', color: '#f43f5e', lightBg: 'rgba(244, 63, 94, 0.1)' },
    'S': { label: 'S', color: '#f97316', lightBg: 'rgba(249, 115, 22, 0.1)' },
    'A': { label: 'A', color: '#a855f7', lightBg: 'rgba(168, 85, 247, 0.1)' },
    'B': { label: 'B', color: '#60a5fa', lightBg: 'rgba(96, 165, 250, 0.1)' }
  }
  return map[step] || { label: step, color: '#64748b', lightBg: 'rgba(100, 116, 139, 0.1)' }
}

const rawForetells = computed(() => {
  return foretellData.DataTable || foretellData || []
})

// 提取所有唯一预言名称作为过滤标签
const uniqueNames = computed(() => {
  const names = rawForetells.value.map(item => item.Name).filter(Boolean)
  return Array.from(new Set(names))
})

const searchQuery = ref('')
const activeNameTag = ref(null)
const nameTagsExpanded = ref(false) // 默认收起
const displayLimit = ref(20)

const toggleNameTag = (name) => {
  activeNameTag.value = activeNameTag.value === name ? null : name
  displayLimit.value = 20 // 筛选条件改变时重置分页数
}

const toggleNameTagsExpand = () => {
  nameTagsExpanded.value = !nameTagsExpanded.value
}

// 格式化文本插值：用 Value 替换 {0}
const getEffectDescription = (item) => {
  if (!item) return ''
  let desc = item.EffectDescription || ''
  if (desc.includes('{0}')) {
    const val = item.Value !== undefined ? item.Value : ''
    desc = desc.replace('{0}', val)
  }
  return desc
}

// 模糊匹配逻辑
const fuzzyMatch = (text, query) => {
  if (!text) return false
  if (!query) return true
  const t = text.toLowerCase()
  const q = query.toLowerCase()
  let idx = 0
  for (let i = 0; i < q.length; i++) {
    idx = t.indexOf(q[i], idx)
    if (idx === -1) return false
    idx++
  }
  return true
}

// 多词与模糊复合过滤
const filteredForetells = computed(() => {
  let list = rawForetells.value

  // 1. 词条名字标签过滤
  if (activeNameTag.value) {
    list = list.filter(item => item.Name === activeNameTag.value)
  }

  // 2. 搜索框多词搜索与模糊匹配
  const q = searchQuery.value.trim()
  if (q) {
    // 按空格或逗号分割关键词
    const keywords = q.split(/[\s,，]+/).filter(Boolean)
    if (keywords.length > 0) {
      list = list.filter(item => {
        return keywords.every(kw => {
          const nameMatch = fuzzyMatch(item.Name, kw)
          const effectMatch = fuzzyMatch(getEffectDescription(item), kw)
          return nameMatch || effectMatch
        })
      })
    }
  }

  return list
})

// 核心排序：YY00011_005 强行置顶，不同名字按 ID 升序，同名按 Step 降序
const sortedForetells = computed(() => {
  const list = [...filteredForetells.value]

  list.sort((a, b) => {
    // 1. 置顶 YY00011_005
    if (a.IDs === 'YY00011_005') return -1
    if (b.IDs === 'YY00011_005') return 1

    const baseA = a.IDs.split('_')[0]
    const baseB = b.IDs.split('_')[0]

    // 2. 不同预言，按 ID 升序排列
    if (baseA !== baseB) {
      return baseA.localeCompare(baseB)
    }

    // 3. 相同预言，按品质排序 (SS > S > A > B)
    const valA = stepOrder[a.Step] || 0
    const valB = stepOrder[b.Step] || 0
    return valB - valA
  })

  return list
})

// 懒加载分页数据
const pagedForetells = computed(() => {
  return sortedForetells.value.slice(0, displayLimit.value)
})

const handleScroll = (e) => {
  const el = e.target
  // 距离底部少于 100px 且有更多数据时自动加载下一页
  if (el.scrollHeight - el.scrollTop - el.clientHeight < 100) {
    if (displayLimit.value < sortedForetells.value.length) {
      displayLimit.value += 20
    }
  }
}

// ===== 四叶草计算器逻辑 =====
const calculatorExpanded = ref(false)
const addedCalcItems = ref([])
const addModalVisible = ref(false)

const toggleCalculator = () => {
  calculatorExpanded.value = !calculatorExpanded.value
}

// 可添加预言过滤：只能加丰收、藏宝、秘藏，且同名只能加一个
const selectableProphecies = computed(() => {
  const addedNames = addedCalcItems.value.map(item => item.Name)
  return rawForetells.value.filter(item => 
    (item.Name === '丰收' || item.Name === '藏宝' || item.Name === '秘藏') &&
    !addedNames.includes(item.Name)
  ).sort((a, b) => {
    // 按名称分组，同名按品质降序
    if (a.Name !== b.Name) {
      return a.Name.localeCompare(b.Name)
    }
    const valA = stepOrder[a.Step] || 0
    const valB = stepOrder[b.Step] || 0
    return valB - valA
  })
})

// 预估四叶草计算公式
const calculatedClovers = computed(() => {
  // 幸运 (YY00011_005) 预言 Value 乘数 (默认为1)
  const luckyItem = rawForetells.value.find(item => item.IDs === 'YY00011_005')
  const luckyVal = luckyItem ? (luckyItem.Value !== undefined ? luckyItem.Value : 1) : 1
  const base = 34 * luckyVal

  let harvestCoef = 0
  let treasureCoef = 0
  let vaultMult = 1

  // 分别乘上已添加预言的对应倍率
  addedCalcItems.value.forEach(item => {
    if (item.Name === '丰收') {
      if (item.Step === 'B') harvestCoef = 1
      else if (item.Step === 'A') harvestCoef = 2
      else if (item.Step === 'S') harvestCoef = 3
      else if (item.Step === 'SS') harvestCoef = 5
    } else if (item.Name === '藏宝') {
      if (item.Step === 'B') treasureCoef = 1
      else if (item.Step === 'A') treasureCoef = 2
      else if (item.Step === 'S') treasureCoef = 3
      else if (item.Step === 'SS') treasureCoef = 5
    } else if (item.Name === '秘藏') {
      if (item.Step === 'B') vaultMult = 2 // 蓝色位阶
      else if (item.Step === 'A') vaultMult = 3 // 紫色位阶
      else if (item.Step === 'S') vaultMult = 4 // 橙色位阶
    }
  })

  return base * (1 + harvestCoef + treasureCoef) * vaultMult
})

const saveCalcItems = () => {
  localStorage.setItem(STORAGE_KEY_CALC, JSON.stringify(addedCalcItems.value))
}

const initCalcItems = () => {
  const saved = localStorage.getItem(STORAGE_KEY_CALC)
  if (saved) {
    try {
      addedCalcItems.value = JSON.parse(saved)
      // 检查并确保固定添加的“财富” (YY00010_003) 存在且位于第一位
      const wealthIndex = addedCalcItems.value.findIndex(item => item.IDs === 'YY00010_003')
      if (wealthIndex === -1) {
        const wealthItem = rawForetells.value.find(item => item.IDs === 'YY00010_003')
        if (wealthItem) {
          addedCalcItems.value.unshift(wealthItem)
        }
      } else if (wealthIndex > 0) {
        const [wealth] = addedCalcItems.value.splice(wealthIndex, 1)
        addedCalcItems.value.unshift(wealth)
      }
    } catch (e) {
      resetCalcItems()
    }
  } else {
    resetCalcItems()
  }
}

const resetCalcItems = () => {
  const wealthItem = rawForetells.value.find(item => item.IDs === 'YY00010_003')
  addedCalcItems.value = wealthItem ? [wealthItem] : []
  saveCalcItems()
}

const openAddModal = () => {
  addModalVisible.value = true
}

const closeAddModal = () => {
  addModalVisible.value = false
}

const selectProphecy = (p) => {
  addedCalcItems.value.push(p)
  saveCalcItems()
  closeAddModal()
}

const removeCalcItem = (idx) => {
  addedCalcItems.value.splice(idx, 1)
  saveCalcItems()
}

onMounted(() => {
  initCalcItems()
})
</script>

<style scoped>
/* ===== 容器基准 (Fixed Header Layout) ===== */
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

/* ===== 搜索框 ===== */
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

/* ===== 词条筛选面板 ===== */
.name-tags-section {
  margin-top: 10px;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 12px 14px;
  box-shadow: inset 0 1px 4px rgba(0, 0, 0, 0.06);
  flex-shrink: 0;
}

.name-tags-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  user-select: none;
}

.name-tags-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-main);
}

.collapse-icon {
  width: 14px;
  height: 14px;
  filter: var(--icon-filter);
  transition: transform 0.25s ease;
}
.collapse-icon.collapsed {
  transform: rotate(180deg);
}

.name-tags-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-top: 10px;
}

.name-tag {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-main);
  background: var(--bg);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  user-select: none;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.name-tag:hover {
  border-color: var(--primary);
  color: var(--primary);
  transform: translateY(-1px);
}
.name-tag.active {
  background: #dbeafe;
  color: var(--primary);
  border-color: var(--primary);
  font-weight: 600;
}

/* ===== 滚动卡片列表 ===== */
.talent-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 0;
  flex: 1;
  overflow-y: auto;
  padding-bottom: 15px;
}

/* ===== 卡片样式 ===== */
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

/* ===== 卡片头部 ===== */
.prophecy-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.prophecy-header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.prophecy-icon {
  width: 32px;
  height: 32px;
  object-fit: contain;
  border-radius: 6px;
  image-rendering: pixelated;
  image-rendering: -moz-crisp-edges;
  image-rendering: crisp-edges;
}

.prophecy-name {
  font-size: 16px;
  font-weight: 700;
}

.prophecy-header-right {
  display: flex;
  align-items: center;
}

.difficulty-label {
  font-size: 12px;
  font-weight: 700;
  color: #000000;
  background: #f1f5f9;
  padding: 2px 8px;
  border-radius: 6px;
}

/* ===== 卡片描述文字 ===== */
.prophecy-effect {
  font-size: 14px;
  line-height: 1.6;
  color: var(--text-main);
  background: #f8faff;
  padding: 10px 12px;
  border-radius: 8px;
  text-align: left;
}

/* ===== 底部标签 ===== */
.prophecy-bottom-tags {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 4px;
}

.bottom-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 5px 12px;
  font-size: 12px;
  font-weight: 600;
  background: var(--green-light);
  color: var(--green-text);
  border: none;
  border-radius: 8px;
  user-select: none;
}

/* ===== 计算器区域样式 ===== */
.clover-calculator-box {
  margin-top: 10px;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  background: rgba(248, 250, 252, 0.5);
  overflow: hidden;
}

.calculator-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  cursor: pointer;
  background: rgba(0, 0, 0, 0.015);
  user-select: none;
}
.calculator-header:hover {
  background: rgba(0, 0, 0, 0.03);
}

.calculator-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.calc-header-clover-icon {
  width: 22px;
  height: 22px;
  object-fit: contain;
  image-rendering: pixelated;
  image-rendering: -moz-crisp-edges;
  image-rendering: crisp-edges;
}

.calculator-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-main);
}

.calc-arrow-icon {
  width: 14px;
  height: 14px;
  filter: var(--icon-filter);
  transition: transform 0.25s ease;
}
.calc-arrow-icon.expanded-flip {
  transform: rotate(180deg);
}

.calculator-content {
  border-top: 1px solid var(--border-color);
  padding: 14px;
}

.calc-added-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.calc-added-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 10px 12px;
  gap: 10px;
}

.calc-item-left {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
}

.calc-item-icon {
  width: 32px;
  height: 32px;
  object-fit: contain;
  border-radius: 6px;
  flex-shrink: 0;
  image-rendering: pixelated;
  image-rendering: -moz-crisp-edges;
  image-rendering: crisp-edges;
}

.calc-item-text {
  flex: 1;
  min-width: 0;
  text-align: left;
}

.calc-item-line1 {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
}

.calc-item-name {
  font-size: 13px;
  font-weight: 700;
}

.calc-item-meta {
  font-size: 11px;
  color: var(--text-sub);
}

.calc-item-line2 {
  font-size: 11px;
  color: var(--text-sub);
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.calc-item-right {
  flex-shrink: 0;
}

.calc-remove-btn, .calc-add-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: transparent;
  border: 1px solid var(--border-color);
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s;
}
.calc-remove-btn:hover {
  border-color: #ef4444;
  background: rgba(239, 68, 68, 0.05);
}
.calc-add-btn:hover {
  border-color: var(--primary);
  background: rgba(59, 130, 246, 0.05);
}

.minus-icon, .plus-icon {
  width: 12px;
  height: 12px;
  filter: var(--icon-filter);
}

/* 空白添加行 */
.empty-row {
  border-style: dashed;
  background: transparent;
}
.empty-row .calc-item-left {
  cursor: pointer;
}

.empty-icon-placeholder {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  border: 1px dashed var(--border-color);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 700;
  color: #94a3b8;
  background: var(--card-bg);
  flex-shrink: 0;
}

.empty-row-hint {
  font-size: 12px;
  color: #94a3b8;
}

/* 计算器底部预估 */
.calculator-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px dashed var(--border-color);
}

.calc-result-box {
  display: flex;
  align-items: center;
  gap: 6px;
}

.calc-footer-clover-icon {
  width: 20px;
  height: 20px;
  object-fit: contain;
}

.calc-result-text {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-main);
}

.calc-result-number {
  font-size: 16px;
  color: #16a34a;
  margin-left: 2px;
}

.calc-reset-btn {
  font-size: 12px;
  font-weight: 600;
  background: transparent;
  border: 1px solid var(--border-color);
  color: var(--text-sub);
  padding: 4px 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;
}
.calc-reset-btn:hover {
  background: var(--bg);
  color: var(--text-main);
  border-color: var(--text-sub);
}

/* ===== 选择弹窗 ===== */
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
  max-width: 460px;
  max-height: 80vh;
  border-radius: 20px;
  box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.12);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--border-color);
}

.modal-header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.modal-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: var(--text-main);
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
  padding: 16px;
  overflow-y: auto;
  flex: 1;
}

.modal-selectable-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.selectable-prophecy-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  background: var(--card-bg);
}
.selectable-prophecy-item:hover {
  border-color: var(--primary);
  background: rgba(59, 130, 246, 0.04);
  transform: translateY(-1px);
}

.item-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.sel-icon {
  width: 32px;
  height: 32px;
  object-fit: contain;
  border-radius: 6px;
  flex-shrink: 0;
  image-rendering: pixelated;
  image-rendering: -moz-crisp-edges;
  image-rendering: crisp-edges;
}

.sel-text {
  flex: 1;
  min-width: 0;
  text-align: left;
}

.sel-line1 {
  display: flex;
  align-items: center;
  gap: 4px;
}

.sel-name {
  font-size: 14px;
  font-weight: 700;
}

.sel-step {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-sub);
}

.sel-desc {
  font-size: 12px;
  color: var(--text-sub);
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-right {
  margin-left: 10px;
  flex-shrink: 0;
}

.sel-diff {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-sub);
  background: #f1f5f9;
  padding: 2px 6px;
  border-radius: 4px;
}

.no-selectable-data {
  text-align: center;
  padding: 30px;
  color: var(--text-sub);
  font-size: 13px;
}

.no-data {
  text-align: center;
  padding: 40px;
  color: var(--text-sub);
  font-size: 14px;
}

/* 深色模式适配 */
.dark-mode .difficulty-label {
  background: rgba(255, 255, 255, 0.08);
  color: #cbd5e1;
}

.dark-mode .bottom-tag {
  background: rgba(34, 197, 94, 0.15);
  color: #4ade80;
  border: 1px solid rgba(34, 197, 94, 0.2);
}

.dark-mode .prophecy-effect {
  background: rgba(255, 255, 255, 0.03);
}

.dark-mode .clover-calculator-box {
  background: rgba(255, 255, 255, 0.02);
  border-color: var(--border-color);
}

.dark-mode .calculator-header:hover {
  background: rgba(255, 255, 255, 0.04);
}

.dark-mode .calc-added-item {
  background: rgba(255, 255, 255, 0.01);
}

.dark-mode .empty-icon-placeholder {
  border-color: rgba(255, 255, 255, 0.15);
  background: transparent;
  color: #64748b;
}

.dark-mode .empty-row-hint {
  color: #64748b;
}

.dark-mode .sel-diff {
  background: rgba(255, 255, 255, 0.08);
  color: #94a3b8;
}
</style>
